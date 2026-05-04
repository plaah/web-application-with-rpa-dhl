import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import shutil

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from models.incident import Incident, IncidentStatus, IncidentPriority, IncidentCategory, VersionEntry, FileAttachment
from utils.storage import read_json, write_json
from utils.auth_utils import get_current_user

router = APIRouter()

VALID_TRANSITIONS = {
    IncidentStatus.draft: IncidentStatus.reviewed,
    IncidentStatus.reviewed: IncidentStatus.published,
}


def utcnow():
    return datetime.now(timezone.utc).isoformat()


@router.get("/incidents")
async def list_incidents(
    status: Optional[str] = None,
    tag: Optional[str] = None,
    creator: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    _user=Depends(get_current_user),
):
    incidents = read_json("incidents.json")

    if status:
        incidents = [i for i in incidents if i["status"] == status]
    if tag:
        incidents = [i for i in incidents if tag in i.get("tags", [])]
    if creator:
        incidents = [i for i in incidents if i["creator_id"] == creator]
    if date_from:
        incidents = [i for i in incidents if i["created_at"] >= date_from]
    if date_to:
        incidents = [i for i in incidents if i["created_at"] <= date_to + "T23:59:59"]
    if search:
        q = search.lower()
        incidents = [
            i for i in incidents
            if q in i["title"].lower() or q in i["description"].lower()
        ]

    total = len(incidents)
    incidents.sort(key=lambda x: x["created_at"], reverse=True)
    start = (page - 1) * limit
    paginated = incidents[start : start + limit]

    return {"success": True, "data": {"incidents": paginated, "total": total, "page": page, "limit": limit}}


@router.post("/incidents/check-duplicate")
async def check_duplicate(body: dict, _user=Depends(get_current_user)):
    content_hash = body.get("content_hash")
    if not content_hash:
        raise HTTPException(status_code=400, detail="content_hash required")

    from utils.dedup import is_duplicate, get_duplicate_incident_id
    duplicate = is_duplicate(content_hash)
    return {
        "success": True,
        "data": {
            "is_duplicate": duplicate,
            "existing_incident_id": get_duplicate_incident_id(content_hash) if duplicate else None,
        },
    }


@router.post("/incidents", status_code=201)
async def create_incident(
    title: str = Form(...),
    description: str = Form(...),
    priority: str = Form("medium"),
    category: str = Form("other"),
    tags: str = Form(""),
    source: str = Form("manual"),
    raw_content: str = Form(""),
    content_hash: Optional[str] = Form(None),
    files: list[UploadFile] = File(default=[]),
    user=Depends(get_current_user),
):
    incidents = read_json("incidents.json")
    incident_id = str(uuid.uuid4())
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    saved_files = []
    upload_dir = Path("uploads") / incident_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        if f.filename:
            file_id = str(uuid.uuid4())
            ext = Path(f.filename).suffix.lower()
            dest = upload_dir / f"{file_id}{ext}"
            with open(dest, "wb") as out:
                shutil.copyfileobj(f.file, out)
            saved_files.append(FileAttachment(
                file_id=file_id,
                filename=f.filename,
                file_type=ext.lstrip("."),
                path=str(dest),
            ).model_dump())

    incident = Incident(
        id=incident_id,
        title=title,
        description=description,
        raw_content=raw_content,
        priority=priority,
        category=category,
        tags=tag_list,
        creator_id=user["id"],
        creator_name=user["username"],
        source=source,
        files=saved_files,
        content_hash=content_hash,
    )
    incident_dict = incident.model_dump()
    # record first version
    incident_dict["version_history"].append({
        "version": 1,
        "description": description,
        "status": "draft",
        "changed_by": user["username"],
        "changed_at": incident_dict["created_at"],
    })

    incidents.append(incident_dict)
    write_json("incidents.json", incidents)
    return {"success": True, "data": {"incident": incident_dict}, "message": "Incident created"}


@router.get("/incidents/{incident_id}")
async def get_incident(incident_id: str, _user=Depends(get_current_user)):
    incidents = read_json("incidents.json")
    incident = next((i for i in incidents if i["id"] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"success": True, "data": {"incident": incident}}


@router.put("/incidents/{incident_id}")
async def update_incident(incident_id: str, body: dict, user=Depends(get_current_user)):
    incidents = read_json("incidents.json")
    idx = next((i for i, x in enumerate(incidents) if x["id"] == incident_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incidents[idx]["status"] != "draft":
        raise HTTPException(status_code=403, detail="Cannot edit non-draft incident")

    allowed = ["title", "description", "priority", "category", "tags"]
    for key in allowed:
        if key in body:
            incidents[idx][key] = body[key]

    incidents[idx]["version"] += 1
    incidents[idx]["updated_at"] = utcnow()
    incidents[idx]["version_history"].append({
        "version": incidents[idx]["version"],
        "description": incidents[idx]["description"],
        "status": incidents[idx]["status"],
        "changed_by": user["username"],
        "changed_at": utcnow(),
    })

    write_json("incidents.json", incidents)
    return {"success": True, "data": {"incident": incidents[idx]}}


@router.patch("/incidents/{incident_id}/status")
async def update_status(incident_id: str, body: dict, user=Depends(get_current_user)):
    incidents = read_json("incidents.json")
    idx = next((i for i, x in enumerate(incidents) if x["id"] == incident_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    current = IncidentStatus(incidents[idx]["status"])
    next_status = IncidentStatus(body.get("status", ""))
    if VALID_TRANSITIONS.get(current) != next_status:
        raise HTTPException(status_code=400, detail=f"Invalid transition: {current} → {next_status}")

    incidents[idx]["status"] = next_status.value
    incidents[idx]["updated_at"] = utcnow()
    incidents[idx]["version_history"].append({
        "version": incidents[idx]["version"],
        "description": incidents[idx]["description"],
        "status": next_status.value,
        "changed_by": user["username"],
        "changed_at": utcnow(),
    })

    write_json("incidents.json", incidents)
    return {"success": True, "data": {"incident": incidents[idx]}}


@router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    incidents = read_json("incidents.json")
    incident = next((i for i in incidents if i["id"] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident["status"] != "draft":
        raise HTTPException(status_code=403, detail="Only draft incidents can be deleted")
    incidents = [i for i in incidents if i["id"] != incident_id]
    write_json("incidents.json", incidents)
    return {"success": True, "message": "Incident deleted"}
