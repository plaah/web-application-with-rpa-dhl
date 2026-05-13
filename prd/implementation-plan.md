# DHL IRRS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-Enhanced Incident Reporting & Resolution System for DHL with Next.js frontend, Python FastAPI backend, UiPath RPA bot, and Claude AI integration.

**Architecture:** FastAPI serves a JSON-file-backed REST API on port 8000. Next.js runs on port 3000, calling the API from server components and client components. UiPath bot authenticates to the API and POSTs incidents from Google Drive files. Claude API is called server-side from FastAPI.

**Tech Stack:** Next.js 14 (App Router, TypeScript, Tailwind), Python FastAPI, python-jose JWT, passlib bcrypt, PyMuPDF, python-docx, filelock, anthropic SDK, UiPath Studio Community Edition.

**Deadline:** 15 May 2026 — 11 days total.

---

## File Map

```
irrs-backend/
├── main.py
├── requirements.txt
├── routers/
│   ├── auth.py
│   ├── incidents.py
│   ├── files.py
│   ├── ai.py
│   ├── reports.py
│   └── logs.py
├── utils/
│   ├── auth_utils.py
│   ├── storage.py
│   ├── file_parser.py
│   └── dedup.py
├── models/
│   ├── incident.py
│   └── user.py
├── data/
│   ├── incidents.json     (starts as [])
│   ├── users.json         (seeded)
│   ├── hashes.json        (starts as [])
│   └── logs.json          (starts as [])
└── uploads/               (created at runtime)

irrs-frontend/
├── middleware.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── upload/page.tsx
│   ├── incidents/page.tsx
│   └── incidents/[id]/page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── StatCard.tsx
│   ├── StatusBadge.tsx
│   ├── FilterBar.tsx
│   ├── IncidentTable.tsx
│   ├── IncidentForm.tsx
│   └── FileDropzone.tsx
└── lib/
    ├── api.ts
    └── types.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `irrs-backend/requirements.txt`
- Create: `irrs-backend/main.py`
- Create: `irrs-backend/data/users.json`
- Create: `irrs-backend/data/incidents.json`
- Create: `irrs-backend/data/hashes.json`
- Create: `irrs-backend/data/logs.json`
- Create: `irrs-frontend/` (via CLI)

- [ ] **Step 1: Scaffold Next.js frontend**

```bash
cd /path/to/assignment-web-application-with-rpa-dhl-dac-3-0-plaah
npx create-next-app@latest irrs-frontend \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --yes
```

- [ ] **Step 2: Create backend folder and requirements.txt**

```bash
mkdir -p irrs-backend/{routers,utils,models,data,uploads,rpa_screenshots}
touch irrs-backend/data/{incidents,users,hashes,logs}.json
```

`irrs-backend/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pymupdf==1.24.5
python-docx==1.1.2
filelock==3.15.4
anthropic==0.34.0
python-dotenv==1.0.1
```

```bash
cd irrs-backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Step 3: Seed users.json**

Run this Python snippet once to generate bcrypt hashes:

```python
from passlib.context import CryptContext
import json

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

users = [
    {
        "id": "usr-001",
        "username": "admin",
        "email": "admin@dhl.com",
        "password_hash": pwd.hash("admin123"),
        "role": "admin",
        "created_at": "2026-05-04T00:00:00",
        "is_active": True
    },
    {
        "id": "usr-002",
        "username": "editor",
        "email": "editor@dhl.com",
        "password_hash": pwd.hash("editor123"),
        "role": "editor",
        "created_at": "2026-05-04T00:00:00",
        "is_active": True
    },
    {
        "id": "usr-rpa",
        "username": "rpa_bot",
        "email": "rpa@dhl.com",
        "password_hash": pwd.hash("rpa_secret_2026"),
        "role": "editor",
        "created_at": "2026-05-04T00:00:00",
        "is_active": True
    }
]

with open("data/users.json", "w") as f:
    json.dump(users, f, indent=2)

for filename in ["incidents.json", "hashes.json", "logs.json"]:
    with open(f"data/{filename}", "w") as f:
        json.dump([], f)

print("Seeded successfully")
```

```bash
python seed.py
```

- [ ] **Step 4: Create main.py**

`irrs-backend/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="DHL IRRS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("rpa_screenshots", exist_ok=True)

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Start backend and verify**

```bash
cd irrs-backend
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000/api/health` — expected: `{"status": "ok"}`

- [ ] **Step 6: Commit**

```bash
git add irrs-backend/ irrs-frontend/
git commit -m "feat: scaffold backend and frontend projects"
```

---

## Task 2: Backend — Storage Utils + Models

**Files:**
- Create: `irrs-backend/utils/storage.py`
- Create: `irrs-backend/models/incident.py`
- Create: `irrs-backend/models/user.py`

- [ ] **Step 1: Write storage utility**

`irrs-backend/utils/storage.py`:
```python
import json
from pathlib import Path
from filelock import FileLock
from typing import Any

DATA_DIR = Path("data")


def read_json(filename: str) -> Any:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    lock = FileLock(str(filepath) + ".lock")
    with lock:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)


def write_json(filename: str, data: Any) -> None:
    filepath = DATA_DIR / filename
    lock = FileLock(str(filepath) + ".lock")
    with lock:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
```

- [ ] **Step 2: Write Pydantic models**

`irrs-backend/models/incident.py`:
```python
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
import uuid
from datetime import datetime, timezone


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class IncidentStatus(str, Enum):
    draft = "draft"
    reviewed = "reviewed"
    published = "published"


class IncidentPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IncidentCategory(str, Enum):
    late_delivery = "late_delivery"
    address_issue = "address_issue"
    damaged_parcel = "damaged_parcel"
    system_error = "system_error"
    complaint = "complaint"
    other = "other"


class FileAttachment(BaseModel):
    file_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    file_type: str
    path: str
    uploaded_at: str = Field(default_factory=utcnow)


class VersionEntry(BaseModel):
    version: int
    description: str
    status: str
    changed_by: str
    changed_at: str = Field(default_factory=utcnow)


class AISuggestions(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    tags: List[str] = []
    priority_suggestion: Optional[str] = None
    category_suggestion: Optional[str] = None
    used: bool = False


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    raw_content: str = ""
    status: IncidentStatus = IncidentStatus.draft
    priority: IncidentPriority = IncidentPriority.medium
    category: IncidentCategory = IncidentCategory.other
    tags: List[str] = []
    creator_id: str
    creator_name: str
    created_at: str = Field(default_factory=utcnow)
    updated_at: str = Field(default_factory=utcnow)
    source: str = "manual"
    files: List[FileAttachment] = []
    content_hash: Optional[str] = None
    version: int = 1
    version_history: List[VersionEntry] = []
    ai_suggestions: Optional[AISuggestions] = None
```

- [ ] **Step 3: Commit**

```bash
git add irrs-backend/utils/ irrs-backend/models/
git commit -m "feat: add storage utils and Pydantic models"
```

---

## Task 3: Backend — Auth

**Files:**
- Create: `irrs-backend/utils/auth_utils.py`
- Create: `irrs-backend/routers/auth.py`
- Modify: `irrs-backend/main.py`

- [ ] **Step 1: Write auth utilities**

`irrs-backend/utils/auth_utils.py`:
```python
import os
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SECRET_KEY", "dhl-irrs-dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_HOURS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    try:
        payload = jwt.decode(
            credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM]
        )
        return {
            "id": payload["sub"],
            "role": payload["role"],
            "username": payload["username"],
        }
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

- [ ] **Step 2: Write auth router**

`irrs-backend/routers/auth.py`:
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.storage import read_json
from utils.auth_utils import verify_password, create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/auth/login")
async def login(req: LoginRequest):
    users = read_json("users.json")
    user = next((u for u in users if u["username"] == req.username and u.get("is_active", True)), None)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({
        "sub": user["id"],
        "role": user["role"],
        "username": user["username"],
    })
    return {
        "success": True,
        "data": {
            "token": token,
            "user": {"id": user["id"], "username": user["username"], "role": user["role"]},
        },
        "message": "Login successful",
    }
```

- [ ] **Step 3: Register router in main.py**

`irrs-backend/main.py` (replace existing):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routers import auth, incidents, files, reports, logs, ai as ai_router

app = FastAPI(title="DHL IRRS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("rpa_screenshots", exist_ok=True)

app.include_router(auth.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(files.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(ai_router.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

Create empty placeholder routers so main.py doesn't crash:
```bash
for name in incidents files reports logs ai; do
  echo "from fastapi import APIRouter; router = APIRouter()" > irrs-backend/routers/${name}.py
done
touch irrs-backend/routers/__init__.py
```

- [ ] **Step 4: Test login with curl**

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected: `{"success": true, "data": {"token": "eyJ...", "user": {...}}}`

- [ ] **Step 5: Commit**

```bash
git add irrs-backend/
git commit -m "feat: add JWT auth — login endpoint + token verification"
```

---

## Task 4: Backend — Incidents CRUD

**Files:**
- Modify: `irrs-backend/routers/incidents.py`

- [ ] **Step 1: Write full incidents router**

`irrs-backend/routers/incidents.py`:
```python
import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import shutil

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi import Query
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
```

- [ ] **Step 2: Quick smoke test**

```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# Create incident
curl -X POST http://localhost:8000/api/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Test Incident" \
  -F "description=Package damaged during transit" \
  -F "priority=high" \
  -F "category=damaged_parcel"
```

Expected: `{"success": true, "data": {"incident": {...}}, ...}`

- [ ] **Step 3: Commit**

```bash
git add irrs-backend/routers/incidents.py
git commit -m "feat: incidents CRUD — create, list, get, update, status workflow, delete"
```

---

## Task 5: Backend — File Extraction + Dedup

**Files:**
- Create: `irrs-backend/utils/file_parser.py`
- Create: `irrs-backend/utils/dedup.py`
- Modify: `irrs-backend/routers/files.py`

- [ ] **Step 1: Write file_parser.py**

`irrs-backend/utils/file_parser.py`:
```python
from pathlib import Path
import io


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".txt":
        return file_bytes.decode("utf-8", errors="replace")
    elif ext == ".pdf":
        return _extract_pdf(file_bytes)
    elif ext in (".docx",):
        return _extract_docx(file_bytes)
    return ""


def _extract_pdf(file_bytes: bytes) -> str:
    import fitz  # PyMuPDF
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def _extract_docx(file_bytes: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
```

- [ ] **Step 2: Write dedup.py**

`irrs-backend/utils/dedup.py`:
```python
import hashlib
from datetime import datetime, timedelta, timezone
from utils.storage import read_json, write_json


def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def is_duplicate(content_hash: str, days: int = 14) -> bool:
    records = read_json("hashes.json")
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    for r in records:
        if r["hash"] == content_hash:
            created = datetime.fromisoformat(r["created_at"])
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if created >= cutoff:
                return True
    return False


def get_duplicate_incident_id(content_hash: str) -> str | None:
    records = read_json("hashes.json")
    for r in records:
        if r["hash"] == content_hash:
            return r.get("incident_id")
    return None


def register_hash(content_hash: str, incident_id: str) -> None:
    records = read_json("hashes.json")
    records.append({
        "hash": content_hash,
        "incident_id": incident_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    write_json("hashes.json", records)
```

- [ ] **Step 3: Write files router**

`irrs-backend/routers/files.py`:
```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from utils.file_parser import extract_text
from utils.auth_utils import get_current_user

router = APIRouter()

ALLOWED_TYPES = {".txt", ".pdf", ".docx", ".png", ".jpg", ".jpeg"}


@router.post("/files/extract")
async def extract_file_text(
    file: UploadFile = File(...),
    _user=Depends(get_current_user),
):
    ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
    content = await file.read()
    if ext in {".png", ".jpg", ".jpeg"}:
        return {"success": True, "data": {"extracted_text": "", "file_type": ext.lstrip(".")}}
    text = extract_text(content, file.filename)
    return {"success": True, "data": {"extracted_text": text, "file_type": ext.lstrip(".")}}
```

- [ ] **Step 4: Test extraction**

```bash
echo "Package 123 was damaged. Customer: John. Route: KL-JB." > /tmp/test.txt

curl -X POST http://localhost:8000/api/files/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt"
```

Expected: `{"success": true, "data": {"extracted_text": "Package 123 was damaged...", "file_type": "txt"}}`

- [ ] **Step 5: Commit**

```bash
git add irrs-backend/utils/ irrs-backend/routers/files.py
git commit -m "feat: file text extraction (PDF/DOCX/TXT) + SHA-256 dedup utils"
```

---

## Task 6: Backend — Reports + Logs

**Files:**
- Modify: `irrs-backend/routers/reports.py`
- Modify: `irrs-backend/routers/logs.py`

- [ ] **Step 1: Write reports router**

`irrs-backend/routers/reports.py`:
```python
from fastapi import APIRouter, Depends
from utils.storage import read_json
from utils.auth_utils import get_current_user
from collections import Counter

router = APIRouter()


@router.get("/reports/summary")
async def summary(_user=Depends(get_current_user)):
    incidents = read_json("incidents.json")
    logs = read_json("logs.json")

    by_status = Counter(i["status"] for i in incidents)
    by_priority = Counter(i["priority"] for i in incidents)
    by_category = Counter(i["category"] for i in incidents)

    run_ids = {l["run_id"] for l in logs if "run_id" in l}
    last_run = max((l["timestamp"] for l in logs), default=None)

    return {
        "success": True,
        "data": {
            "total_incidents": len(incidents),
            "by_status": dict(by_status),
            "by_priority": dict(by_priority),
            "by_category": dict(by_category),
            "rpa_runs": len(run_ids),
            "last_rpa_run": last_run,
        },
    }
```

- [ ] **Step 2: Write logs router**

`irrs-backend/routers/logs.py`:
```python
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
```

- [ ] **Step 3: Commit**

```bash
git add irrs-backend/routers/reports.py irrs-backend/routers/logs.py
git commit -m "feat: reports summary and RPA logs endpoints"
```

---

## Task 7: Frontend — Setup + Auth

**Files:**
- Create: `irrs-frontend/lib/types.ts`
- Create: `irrs-frontend/lib/api.ts`
- Create: `irrs-frontend/middleware.ts`
- Create: `irrs-frontend/app/login/page.tsx`
- Modify: `irrs-frontend/app/layout.tsx`

- [ ] **Step 1: Install dependencies**

```bash
cd irrs-frontend
npm install js-cookie
npm install --save-dev @types/js-cookie
```

- [ ] **Step 2: Create lib/types.ts**

`irrs-frontend/lib/types.ts`:
```typescript
export type Role = "admin" | "editor" | "reviewer";
export type IncidentStatus = "draft" | "reviewed" | "published";
export type IncidentPriority = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  raw_content: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  category: string;
  tags: string[];
  creator_id: string;
  creator_name: string;
  created_at: string;
  updated_at: string;
  source: string;
  files: FileAttachment[];
  version: number;
  version_history: VersionEntry[];
  ai_suggestions?: AISuggestions;
}

export interface FileAttachment {
  file_id: string;
  filename: string;
  file_type: string;
  path: string;
  uploaded_at: string;
}

export interface VersionEntry {
  version: number;
  description: string;
  status: string;
  changed_by: string;
  changed_at: string;
}

export interface AISuggestions {
  title?: string;
  summary?: string;
  tags: string[];
  priority_suggestion?: string;
  category_suggestion?: string;
  used: boolean;
}
```

- [ ] **Step 3: Create lib/api.ts**

`irrs-frontend/lib/api.ts`:
```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/irrs_token=([^;]+)/);
  return match ? match[1] : null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    document.cookie = "irrs_token=; Max-Age=0; path=/";
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.detail || json.message || "API error");
  return json;
}

export function setAuthCookie(token: string) {
  const maxAge = 8 * 60 * 60;
  document.cookie = `irrs_token=${token}; Max-Age=${maxAge}; path=/; SameSite=Strict`;
}

export function clearAuthCookie() {
  document.cookie = "irrs_token=; Max-Age=0; path=/";
}
```

- [ ] **Step 4: Create middleware.ts**

`irrs-frontend/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("irrs_token")?.value;
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (token && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api).*)"],
};
```

- [ ] **Step 5: Create login page**

`irrs-frontend/app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setAuthCookie } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: { token: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username, password }),
        }
      );
      setAuthCookie(res.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-red-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-red-600 tracking-tight">DHL</div>
          <p className="text-gray-500 text-sm mt-1">Incident Reporting System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update app/layout.tsx**

`irrs-frontend/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DHL IRRS — Incident Reporting System",
  description: "DHL AI-Enhanced Incident Reporting & Resolution System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Add root redirect**

`irrs-frontend/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 8: Test login flow**

```bash
cd irrs-frontend && npm run dev
```

Open `http://localhost:3000` → should redirect to `/login` → login with admin/admin123 → should redirect to `/dashboard` (blank page OK for now).

- [ ] **Step 9: Commit**

```bash
git add irrs-frontend/
git commit -m "feat: frontend auth — login page, JWT cookie, route protection middleware"
```

---

## Task 8: Frontend — Navbar + Dashboard

**Files:**
- Create: `irrs-frontend/components/Navbar.tsx`
- Create: `irrs-frontend/components/StatCard.tsx`
- Create: `irrs-frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Create Navbar.tsx**

`irrs-frontend/components/Navbar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearAuthCookie } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    clearAuthCookie();
    router.push("/login");
  }

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/incidents", label: "Incidents" },
    { href: "/upload", label: "New Incident" },
  ];

  return (
    <nav className="bg-red-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <span className="font-black text-xl tracking-tight">DHL IRRS</span>
          <div className="flex gap-4 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`hover:text-yellow-300 transition ${
                  pathname.startsWith(l.href) ? "text-yellow-300 font-semibold" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <button onClick={logout} className="text-sm hover:text-yellow-300 transition">
          Logout
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create StatCard.tsx**

`irrs-frontend/components/StatCard.tsx`:
```tsx
interface StatCardProps {
  label: string;
  value: number;
  color?: string;
}

export default function StatCard({ label, value, color = "bg-white" }: StatCardProps) {
  return (
    <div className={`${color} rounded-xl shadow p-5 flex flex-col gap-1`}>
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-3xl font-bold text-gray-800">{value}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard/page.tsx**

`irrs-frontend/app/dashboard/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { apiFetch } from "@/lib/api";
import { Incident } from "@/lib/types";

interface Summary {
  total_incidents: number;
  by_status: Record<string, number>;
  rpa_runs: number;
  last_rpa_run: string | null;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Incident[]>([]);

  useEffect(() => {
    apiFetch<{ data: Summary }>("/reports/summary").then((r) => setSummary(r.data));
    apiFetch<{ data: { incidents: Incident[] } }>("/incidents?limit=10").then((r) =>
      setRecent(r.data.incidents)
    );
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Incidents" value={summary.total_incidents} />
            <StatCard label="Draft" value={summary.by_status.draft || 0} color="bg-gray-100" />
            <StatCard label="Reviewed" value={summary.by_status.reviewed || 0} color="bg-blue-50" />
            <StatCard label="Published" value={summary.by_status.published || 0} color="bg-green-50" />
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Recent Incidents</h2>
            <Link href="/incidents" className="text-sm text-red-600 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-gray-400 text-sm">No incidents yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Priority</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((inc) => (
                  <tr key={inc.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2">
                      <Link href={`/incidents/${inc.id}`} className="text-red-600 hover:underline">
                        {inc.title}
                      </Link>
                    </td>
                    <td className="py-2 capitalize">{inc.status}</td>
                    <td className="py-2 capitalize">{inc.priority}</td>
                    <td className="py-2 text-gray-400">{new Date(inc.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify dashboard loads**

Visit `http://localhost:3000/dashboard` — stat cards and recent table should appear (empty counts OK).

- [ ] **Step 5: Commit**

```bash
git add irrs-frontend/
git commit -m "feat: dashboard with stat cards and recent incidents table"
```

---

## Task 9: Frontend — Upload Console

**Files:**
- Create: `irrs-frontend/components/StatusBadge.tsx`
- Create: `irrs-frontend/app/upload/page.tsx`

- [ ] **Step 1: Create StatusBadge.tsx**

`irrs-frontend/components/StatusBadge.tsx`:
```tsx
const COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  reviewed: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${COLORS[value] || "bg-gray-100 text-gray-600"}`}>
      {value}
    </span>
  );
}
```

- [ ] **Step 2: Create upload/page.tsx**

`irrs-frontend/app/upload/page.tsx`:
```tsx
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/lib/api";

const CATEGORIES = [
  { value: "late_delivery", label: "Late Delivery" },
  { value: "address_issue", label: "Address Issue" },
  { value: "damaged_parcel", label: "Damaged Parcel" },
  { value: "system_error", label: "System Error" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
];

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("other");
  const [tags, setTags] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(e.target.files || []));
  }

  async function handleExtract() {
    if (!files[0]) return;
    setExtracting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await apiFetch<{ data: { extracted_text: string } }>("/files/extract", {
        method: "POST",
        body: fd,
      });
      const text = res.data.extracted_text;
      setDescription(text);
      setRawContent(text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleAiAssist() {
    if (!description) return;
    setAiLoading(true);
    try {
      const res = await apiFetch<{ data: any }>("/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ content: description }),
      });
      setAiSuggestions(res.data);
    } catch (err: any) {
      setError("AI assist failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function applyAiSuggestions() {
    if (!aiSuggestions) return;
    if (aiSuggestions.title) setTitle(aiSuggestions.title);
    if (aiSuggestions.tags?.length) setTags(aiSuggestions.tags.join(", "));
    if (aiSuggestions.priority_suggestion) setPriority(aiSuggestions.priority_suggestion);
    if (aiSuggestions.category_suggestion) setCategory(aiSuggestions.category_suggestion);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      fd.append("priority", priority);
      fd.append("category", category);
      fd.append("tags", tags);
      fd.append("raw_content", rawContent);
      fd.append("source", "manual");
      files.forEach((f) => fd.append("files", f));

      const res = await apiFetch<{ data: { incident: { id: string } } }>("/incidents", {
        method: "POST",
        body: fd,
      });
      router.push(`/incidents/${res.data.incident.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">New Incident</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: file upload */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <p className="text-gray-400 text-sm mb-2">Drag & drop or click to upload</p>
              <p className="text-xs text-gray-300 mb-3">TXT, PDF, DOCX, PNG, JPG</p>
              <input ref={fileRef} type="file" multiple accept=".txt,.pdf,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                Browse Files
              </button>
            </div>
            {files.length > 0 && (
              <div className="text-sm text-gray-600 space-y-1">
                {files.map((f, i) => <div key={i} className="bg-gray-50 rounded px-3 py-1">{f.name}</div>)}
              </div>
            )}
            {files.length > 0 && (
              <button type="button" onClick={handleExtract} disabled={extracting}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                {extracting ? "Extracting..." : "Extract Text from File"}
              </button>
            )}
          </div>

          {/* Right: form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="Brief incident title" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={6}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                placeholder="Describe the incident..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                  {["low","medium","high","critical"].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                placeholder="logistics, kl-jb, urgent" />
            </div>

            {aiSuggestions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-blue-700">AI Suggestions</p>
                {aiSuggestions.title && <p><span className="text-gray-500">Title:</span> {aiSuggestions.title}</p>}
                {aiSuggestions.tags?.length > 0 && <p><span className="text-gray-500">Tags:</span> {aiSuggestions.tags.join(", ")}</p>}
                {aiSuggestions.priority_suggestion && <p><span className="text-gray-500">Priority:</span> {aiSuggestions.priority_suggestion}</p>}
                <button type="button" onClick={applyAiSuggestions}
                  className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded font-medium hover:bg-blue-700 transition">
                  Apply Suggestions
                </button>
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleAiAssist} disabled={aiLoading || !description}
                className="flex-1 border border-blue-500 text-blue-600 hover:bg-blue-50 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40">
                {aiLoading ? "Thinking..." : "AI Assist (Claude)"}
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                {submitting ? "Saving..." : "Save as Draft"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Test upload flow manually**

1. Go to `http://localhost:3000/upload`
2. Upload a `.txt` file, click "Extract Text" — description should populate
3. Fill title, click "Save as Draft"
4. Should redirect to `/incidents/{id}`

- [ ] **Step 4: Commit**

```bash
git add irrs-frontend/
git commit -m "feat: upload console — file upload, text extraction, AI assist button, incident creation"
```

---

## Task 10: Frontend — Incident Viewer

**Files:**
- Create: `irrs-frontend/app/incidents/page.tsx`

- [ ] **Step 1: Create incidents/page.tsx**

`irrs-frontend/app/incidents/page.tsx`:
```tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { Incident } from "@/lib/types";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    try {
      const res = await apiFetch<{ data: { incidents: Incident[]; total: number } }>(
        `/incidents?${params}`
      );
      setIncidents(res.data.incidents);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Incidents</h1>
          <Link href="/upload" className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition">
            + New Incident
          </Link>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-3 items-center">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="published">Published</option>
          </select>
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search incidents..."
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:ring-2 focus:ring-red-500 focus:outline-none" />
          <button onClick={() => { setStatus(""); setSearch(""); setPage(1); }}
            className="text-sm text-gray-400 hover:text-gray-600 transition">
            Clear
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading...</div>
          ) : incidents.length === 0 ? (
            <div className="p-10 text-center text-gray-400">No incidents found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-400 text-left">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Creator</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/incidents/${inc.id}`} className="text-red-600 hover:underline font-medium">
                        {inc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={inc.status} /></td>
                    <td className="px-4 py-3"><StatusBadge value={inc.priority} /></td>
                    <td className="px-4 py-3 capitalize">{inc.category.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-gray-500">{inc.creator_name}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(inc.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100 text-sm">
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100 text-sm">
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add irrs-frontend/app/incidents/page.tsx
git commit -m "feat: incident viewer — searchable, filterable table with pagination"
```

---

## Task 11: Frontend — Incident Detail + Status Workflow

**Files:**
- Create: `irrs-frontend/app/incidents/[id]/page.tsx`

- [ ] **Step 1: Create incidents/[id]/page.tsx**

`irrs-frontend/app/incidents/[id]/page.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { Incident } from "@/lib/types";

const NEXT_STATUS: Record<string, string> = {
  draft: "reviewed",
  reviewed: "published",
};
const STATUS_LABEL: Record<string, string> = {
  reviewed: "Mark as Reviewed",
  published: "Publish",
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [tab, setTab] = useState<"details" | "files" | "history">("details");
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: { incident: Incident } }>(`/incidents/${id}`)
      .then((r) => setIncident(r.data.incident))
      .catch(() => router.push("/incidents"));
  }, [id]);

  async function handleStatusTransition() {
    if (!incident) return;
    const next = NEXT_STATUS[incident.status];
    if (!next) return;
    setTransitioning(true);
    setError("");
    try {
      const res = await apiFetch<{ data: { incident: Incident } }>(
        `/incidents/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: next }) }
      );
      setIncident(res.data.incident);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransitioning(false);
    }
  }

  if (!incident) return <div className="min-h-screen"><Navbar /><div className="p-10 text-center text-gray-400">Loading...</div></div>;

  const nextStatus = NEXT_STATUS[incident.status];

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-600">Dashboard</Link>
          {" / "}
          <Link href="/incidents" className="hover:text-gray-600">Incidents</Link>
          {" / "}
          <span className="text-gray-700">{incident.title}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 mb-2">{incident.title}</h1>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge value={incident.status} />
                <StatusBadge value={incident.priority} />
                <span className="text-xs text-gray-400 capitalize">{incident.category.replace("_", " ")}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {nextStatus && (
                <button onClick={handleStatusTransition} disabled={transitioning}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition disabled:opacity-50">
                  {transitioning ? "Updating..." : STATUS_LABEL[nextStatus]}
                </button>
              )}
              {incident.status === "published" && (
                <span className="text-xs text-green-600 font-medium">Published — locked</span>
              )}
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="flex border-b">
            {(["details", "files", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium capitalize transition ${
                  tab === t ? "border-b-2 border-red-600 text-red-600" : "text-gray-400 hover:text-gray-600"
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "details" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{incident.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Creator</p>
                    <p>{incident.creator_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Source</p>
                    <p className="capitalize">{incident.source}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Created</p>
                    <p>{new Date(incident.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Updated</p>
                    <p>{new Date(incident.updated_at).toLocaleString()}</p>
                  </div>
                </div>
                {incident.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {incident.tags.map((t) => (
                        <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "files" && (
              <div>
                {incident.files.length === 0 ? (
                  <p className="text-gray-400 text-sm">No files attached.</p>
                ) : (
                  <ul className="space-y-2">
                    {incident.files.map((f) => (
                      <li key={f.file_id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 text-sm">
                        <span className="text-gray-400 uppercase text-xs font-bold">{f.file_type}</span>
                        <span className="flex-1 text-gray-700">{f.filename}</span>
                        <span className="text-xs text-gray-400">{new Date(f.uploaded_at).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "history" && (
              <div>
                {incident.version_history.length === 0 ? (
                  <p className="text-gray-400 text-sm">No history yet.</p>
                ) : (
                  <ol className="relative border-l border-gray-200 space-y-4 ml-3">
                    {[...incident.version_history].reverse().map((v, i) => (
                      <li key={i} className="ml-4">
                        <div className="absolute -left-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                        <p className="text-xs text-gray-400">{new Date(v.changed_at).toLocaleString()} · {v.changed_by}</p>
                        <p className="text-sm font-medium mt-0.5">
                          v{v.version} — <StatusBadge value={v.status} />
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Test full workflow**

1. Create incident → save as draft
2. Open detail page → click "Mark as Reviewed" → badge changes to blue
3. Click "Publish" → badge changes to green, button disappears
4. Check History tab → 3 entries visible

- [ ] **Step 3: Commit**

```bash
git add irrs-frontend/app/incidents/
git commit -m "feat: incident detail page — tabs, status workflow, version history"
```

**Milestone 1 complete. Web app is fully functional.**

---

## Task 12: Backend — Claude AI Integration

**Files:**
- Modify: `irrs-backend/routers/ai.py`

- [ ] **Step 1: Create .env file**

`irrs-backend/.env`:
```
ANTHROPIC_API_KEY=your_claude_api_key_here
SECRET_KEY=dhl-irrs-prod-secret-change-me
```

```bash
pip install python-dotenv
```

Add to `main.py` top:
```python
from dotenv import load_dotenv
load_dotenv()
```

- [ ] **Step 2: Write ai.py router**

`irrs-backend/routers/ai.py`:
```python
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from utils.auth_utils import get_current_user

router = APIRouter()


class SummarizeRequest(BaseModel):
    content: str
    existing_incidents: Optional[List[dict]] = None


@router.post("/ai/summarize")
async def summarize(req: SummarizeRequest, _user=Depends(get_current_user)):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    import anthropic
    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are an assistant helping DHL customer support classify incident reports.

Analyze this incident text and return a JSON object with these fields:
- title: concise title (max 10 words)
- summary: 2-3 sentence summary
- tags: array of 2-4 relevant tags (lowercase, no spaces)
- priority_suggestion: one of "low", "medium", "high", "critical"
- category_suggestion: one of "late_delivery", "address_issue", "damaged_parcel", "system_error", "complaint", "other"

Return ONLY valid JSON, no markdown, no explanation.

Incident text:
{req.content}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text = message.content[0].text.strip()
        result = json.loads(text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/ai/extract-image")
async def extract_image(
    image: UploadFile = File(...),
    _user=Depends(get_current_user),
):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured")

    import anthropic, base64
    client = anthropic.Anthropic(api_key=api_key)

    content = await image.read()
    b64 = base64.standard_b64encode(content).decode("utf-8")
    ext = image.filename.split(".")[-1].lower()
    media_type = "image/png" if ext == "png" else "image/jpeg"

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {
                        "type": "text",
                        "text": "Extract all text from this image. If it shows a damaged parcel or shipping label, describe what you see. Return plain text only."
                    }
                ]
            }]
        )
        extracted = message.content[0].text.strip()
        return {"success": True, "data": {"extracted_text": extracted}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
```

- [ ] **Step 3: Test AI endpoint**

```bash
curl -X POST http://localhost:8000/api/ai/summarize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Customer called saying parcel 12345 from KL to JB arrived with the box crushed and items inside broken. Customer wants replacement."}'
```

Expected: JSON with title, summary, tags, priority_suggestion = "high", category_suggestion = "damaged_parcel"

- [ ] **Step 4: Commit**

```bash
git add irrs-backend/routers/ai.py irrs-backend/.env
git commit -m "feat: Claude AI integration — text summarization + image text extraction"
```

---

## Task 13: UiPath RPA Bot

**Note:** UiPath is a visual workflow tool. This task documents the exact sequence of activities to build in UiPath Studio. Each bullet is one Activity in the workflow.

**Files:**
- Create: `irrs-rpa/` (UiPath project folder, created via Studio UI)

- [ ] **Step 1: Create UiPath project**

1. Open UiPath Studio Community Edition
2. New Project → Process → Name: `DHL_IRRS_Bot`
3. Save to `irrs-rpa/` in the project directory

- [ ] **Step 2: Install required packages**

In UiPath Studio → Manage Packages:
- `UiPath.GSuite.Activities` (for Google Drive) OR use HTTP Request to Drive API
- `UiPath.WebAPI.Activities` (HTTP Request activities)
- `UiPath.Mail.Activities` (SMTP email)
- `UiPath.System.Activities` (built-in)

- [ ] **Step 3: Build Main.xaml workflow**

Build the following sequence in `Main.xaml`:

```
SEQUENCE: DHL IRRS Bot
│
├── ASSIGN: apiBase = "http://localhost:8000/api"
├── ASSIGN: driveFolder = "YOUR_GOOGLE_DRIVE_FOLDER_ID"
├── ASSIGN: adminEmail = "admin@dhl.com"
├── ASSIGN: runId = System.Guid.NewGuid().ToString()
├── ASSIGN: createdCount = 0
├── ASSIGN: duplicateCount = 0
├── ASSIGN: failedCount = 0
│
├── HTTP REQUEST: POST {apiBase}/auth/login
│   Body: {"username":"rpa_bot","password":"rpa_secret_2026"}
│   Save response → loginResponse
│   Extract token: jwtToken = loginResponse["data"]["token"]
│
├── INVOKE WORKFLOW: GetDriveFiles.xaml
│   Output: fileList (Array of {fileName, localPath, content})
│
├── FOR EACH file IN fileList
│   │
│   ├── TRY
│   │   ├── INVOKE CODE: Compute SHA-256
│   │   │   Input: file.content
│   │   │   Code: hash = BitConverter.ToString(
│   │   │           SHA256.Create().ComputeHash(
│   │   │             Encoding.UTF8.GetBytes(content)
│   │   │           )).Replace("-","").ToLower()
│   │   │   Output: contentHash
│   │   │
│   │   ├── HTTP REQUEST: POST {apiBase}/incidents/check-duplicate
│   │   │   Headers: Authorization: Bearer {jwtToken}
│   │   │   Body: {"content_hash": contentHash}
│   │   │   Save → dupResponse
│   │   │
│   │   ├── IF dupResponse["data"]["is_duplicate"] = True
│   │   │   ├── ASSIGN: duplicateCount += 1
│   │   │   ├── HTTP REQUEST: POST {apiBase}/logs
│   │   │   │   Body: {run_id, action:"duplicate_skip", file_name, status:"skipped", message:"Duplicate within 14 days"}
│   │   │   └── CONTINUE (skip to next file)
│   │   │
│   │   ├── HTTP REQUEST: POST {apiBase}/incidents (multipart)
│   │   │   Headers: Authorization: Bearer {jwtToken}
│   │   │   Fields: title=file.fileName, description=file.content,
│   │   │           source="rpa", content_hash=contentHash
│   │   │   Attach: file.localPath
│   │   │   Save → createResponse
│   │   │   Extract: incidentId = createResponse["data"]["incident"]["id"]
│   │   │
│   │   ├── HTTP REQUEST: PATCH {apiBase}/incidents/{incidentId}/status
│   │   │   Headers: Authorization: Bearer {jwtToken}
│   │   │   Body: {"status": "reviewed"}
│   │   │
│   │   ├── HTTP REQUEST: POST {apiBase}/logs
│   │   │   Body: {run_id, action:"create", file_name, incident_id:incidentId, status:"success", message:"Created and reviewed"}
│   │   │
│   │   └── ASSIGN: createdCount += 1
│   │
│   └── CATCH (Exception ex)
│       ├── TAKE SCREENSHOT: Save to rpa_screenshots/{runId}_{file.fileName}.png
│       ├── HTTP REQUEST: POST {apiBase}/logs
│       │   Body: {run_id, action:"error", file_name, status:"failed",
│       │          message:ex.Message, screenshot_path:screenshotPath}
│       └── ASSIGN: failedCount += 1
│
└── SEND SMTP MAIL
    To: adminEmail
    Subject: "DHL IRRS RPA Run Summary - {DateTime.Now}"
    Body: "Run ID: {runId}
           Created: {createdCount}
           Duplicates skipped: {duplicateCount}
           Failed: {failedCount}
           Total files processed: {fileList.Count}"
    Attachments: logs file
```

- [ ] **Step 4: Build GetDriveFiles.xaml**

```
SEQUENCE: GetDriveFiles
│
├── (Option A — Use UiPath GSuite Activities)
│   ├── Google Drive: List Files in Folder
│   │   FolderID: driveFolder
│   │   Filter: modified after last 24h (or all for demo)
│   │   Output: driveFiles
│   │
│   └── FOR EACH driveFile IN driveFiles
│       ├── Google Drive: Download File
│       │   Save to: C:\Temp\IRRS\{driveFile.Name}
│       ├── READ TEXT FILE: localPath
│       └── ADD to fileList: {fileName, localPath, content}
│
└── (Option B — Manual test mode, no Drive)
    └── FOR EACH file IN Directory.GetFiles("C:\Temp\IRRS_Input")
        ├── READ TEXT FILE
        └── ADD to fileList
```

- [ ] **Step 5: Test RPA bot**

1. Place 3 `.txt` test files in `C:\Temp\IRRS_Input\`
2. Run Main.xaml from UiPath Studio
3. Check `http://localhost:3000/incidents` — 3 new incidents should appear with status "reviewed"
4. Check admin email — summary email received

- [ ] **Step 6: Export and save**

```bash
# Copy UiPath project to repo
cp -r ~/Documents/UiPath/DHL_IRRS_Bot ./irrs-rpa/
git add irrs-rpa/
git commit -m "feat: UiPath RPA bot — Drive ingest, dedup, API create/update, error handling, summary email"
```

---

## Task 14: Seed Data + Polish + Submission Prep

**Files:**
- Create: `irrs-backend/seed_incidents.py`
- Create: `README.md`

- [ ] **Step 1: Seed 15 test incidents**

`irrs-backend/seed_incidents.py`:
```python
import json, uuid, hashlib
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext

def utcnow(): return datetime.now(timezone.utc).isoformat()
def past(days): return (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

incidents = [
    {"title": "Package 8821 Arrived Damaged - Penang to KL Route", "description": "Customer reported parcel arrived with crushed corners. Contents (electronics) damaged.", "status": "published", "priority": "high", "category": "damaged_parcel", "tags": ["penang-kl", "electronics", "urgent"]},
    {"title": "Late Delivery - 3 Days Overdue on Express Shipment", "description": "Express shipment ID 4492 from JB to Singapore is 3 days overdue. Customer requesting refund.", "status": "reviewed", "priority": "critical", "category": "late_delivery", "tags": ["express", "singapore", "refund"]},
    {"title": "Wrong Address Label on Parcel #9921", "description": "Parcel delivered to wrong address. Correct recipient is at Jalan Ampang, not Jalan Ampan.", "status": "draft", "priority": "medium", "category": "address_issue", "tags": ["address", "kl"]},
    {"title": "System Error: Tracking Portal Returns 500", "description": "Multiple customers reporting tracking portal returning HTTP 500 error since 9am.", "status": "published", "priority": "critical", "category": "system_error", "tags": ["portal", "tracking", "outage"]},
    {"title": "Customer Complaint - Rude Courier Behaviour", "description": "Customer Aishah binti Rahman complained about delivery driver being rude during handover.", "status": "reviewed", "priority": "low", "category": "complaint", "tags": ["courier", "customer-service"]},
]

template = {"creator_id": "usr-001", "creator_name": "admin", "source": "manual", "files": [], "version": 1, "version_history": [], "ai_suggestions": None}

result = []
for i, inc in enumerate(incidents):
    item = {**template, **inc, "id": str(uuid.uuid4()), "raw_content": inc["description"],
            "created_at": past(10 - i), "updated_at": past(10 - i), "content_hash": hashlib.sha256(inc["description"].encode()).hexdigest()}
    item["version_history"].append({"version": 1, "description": inc["description"], "status": inc["status"], "changed_by": "admin", "changed_at": item["created_at"]})
    result.append(item)

with open("data/incidents.json", "w") as f:
    json.dump(result, f, indent=2)
print(f"Seeded {len(result)} incidents")
```

```bash
cd irrs-backend && python seed_incidents.py
```

- [ ] **Step 2: Write README.md**

`README.md`:
```markdown
# DHL IRRS — Incident Reporting & Resolution System

## Prerequisites
- Node.js 18+, Python 3.11+, UiPath Studio Community

## Quick Start

### Backend
cd irrs-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python seed.py          # seed users
python seed_incidents.py  # seed test data
uvicorn main:app --reload --port 8000

### Frontend
cd irrs-frontend
npm install
npm run dev
# Open http://localhost:3000

### Login credentials
- Admin: admin / admin123
- Editor: editor / editor123
- RPA Bot: rpa_bot / rpa_secret_2026

### RPA Bot
- Open irrs-rpa/ in UiPath Studio
- Place test .txt files in C:\Temp\IRRS_Input\
- Run Main.xaml

### AI (Claude)
- Add ANTHROPIC_API_KEY to irrs-backend/.env
```

- [ ] **Step 3: Final end-to-end check**

```
[ ] Login as editor → works
[ ] Upload a PDF → text extracted, incident saved as draft
[ ] AI Assist → suggestions appear for sample text
[ ] Incidents list → filter by status, search by keyword → both work
[ ] Incident detail → status transition Draft→Reviewed→Published → works, history recorded
[ ] Run RPA bot → 3 new incidents appear in web app
[ ] Check admin email → summary received
[ ] GET /api/reports/summary → correct counts
[ ] All API responses follow {success, data, message} envelope
```

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: seed data, README, final polish — ready for submission"
git push origin main
```

---

## Self-Review: Spec Coverage Check

| Requirement | Task Covered |
|---|---|
| Secured Website (Login) | Task 3, 7 |
| Upload raw information (text, PDF, DOCX) | Task 5, 9 |
| Workflow with incident status | Task 4, 11 |
| Manage and search incident | Task 4, 10 |
| Reporting (summary) | Task 6 |
| RPA: Fetch from Google Drive | Task 13 |
| RPA: Duplicate check (14 days) | Task 5, 13 |
| RPA: Create content in web app | Task 13 |
| RPA: Update status via API | Task 13 |
| RPA: Error handling + screenshot | Task 13 |
| RPA: Summary email | Task 13 |
| LLM: Summarize + tag + title (optional) | Task 12 |
| LLM: Image extraction (optional) | Task 12 |
| JSON API CRUD | Tasks 4, 6 |
| Version history | Task 4, 11 |
| Filter by tag, date, creator, status | Task 4, 10 |

All mandatory requirements covered. All optional AI requirements covered. No gaps found.

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks

**2. Inline Execution** — execute tasks in this session using superpowers:executing-plans

Which approach?
