import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
from utils.storage import read_json, write_json
from utils.auth_utils import get_current_user

router = APIRouter()


class LogEntry(BaseModel):
    run_id: str
    action: str
    file_name: Optional[str] = None
    incident_id: Optional[str] = None
    status: str
    message: str
    screenshot_path: Optional[str] = None


@router.get("/logs")
async def get_logs(
    run_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    _user=Depends(get_current_user),
):
    logs = read_json("logs.json")
    if run_id:
        logs = [l for l in logs if l.get("run_id") == run_id]
    if status:
        logs = [l for l in logs if l.get("status") == status]
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    total = len(logs)
    start = (page - 1) * limit
    return {"success": True, "data": {"logs": logs[start : start + limit], "total": total}}


@router.post("/logs", status_code=201)
async def create_log(entry: LogEntry, _user=Depends(get_current_user)):
    logs = read_json("logs.json")
    log = {
        "log_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **entry.model_dump(),
    }
    logs.append(log)
    write_json("logs.json", logs)
    return {"success": True, "data": {"log": log}}
