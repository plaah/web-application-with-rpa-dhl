# Phase 1: Web Application - Research

**Researched:** 2026-05-04
**Domain:** Next.js 14 App Router + Python FastAPI + JSON file storage + JWT auth + PDF/DOCX extraction
**Confidence:** HIGH

---

## Summary

Phase 1 builds the complete incident management web application: FastAPI backend on port 8000 with JSON file storage, Next.js 14 frontend on port 3000. The stack is fully pre-decided in the PRD and implementation plan — no alternatives to evaluate. The backend handles auth (JWT), incident CRUD, file upload + text extraction (PDF/DOCX/TXT), status workflow, version history, and reporting. The frontend provides login, dashboard, upload console, incident viewer, and incident detail pages.

The implementation plan at `prd/implementation-plan.md` contains detailed code for all 14 tasks covering both backend and frontend. The planner should structure work as two parallel workstreams: backend tasks (Tasks 1–8) and frontend tasks (Tasks 9–14), with backend-first sequencing since frontend calls the API.

Primary risk: passlib[bcrypt] has a known deprecation issue with bcrypt >= 4.0 — use bcrypt==3.2.2 pinned or switch to `bcrypt` directly. PyMuPDF package name on pip is `pymupdf` but imports as `fitz`. JSON file concurrency requires `filelock` on every read/write.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can log in with username and password | FastAPI `/api/auth/login`, passlib bcrypt verify, python-jose JWT generation |
| AUTH-02 | Session persists via JWT cookie across browser refresh | Next.js middleware reads JWT from HTTP-only cookie; FastAPI sets cookie on login |
| AUTH-03 | Protected routes redirect to /login when not authenticated | Next.js `middleware.ts` checks cookie, redirects unauthenticated requests |
| AUTH-04 | System supports two roles: admin and editor | `role` field in users.json; FastAPI dependency checks role on delete/admin routes |
| INC-01 | Create incident with title, description, priority, category, tags | POST /api/incidents multipart/form-data; Pydantic model validates required fields |
| INC-02 | Upload text, PDF, or DOCX file and extract text into description | POST /api/files/extract; PyMuPDF for PDF, python-docx for DOCX, plain read for TXT |
| INC-03 | Incident saved as Draft status by default | `status: "draft"` set server-side on creation, not client-controlled |
| INC-04 | Update incident fields when status is Draft | PUT /api/incidents/{id} — 403 if status != draft |
| INC-05 | Transition status Draft → Reviewed → Published | PATCH /api/incidents/{id}/status with transition validation |
| INC-06 | Published incidents locked (no further edits) | PUT returns 403 when status == published |
| INC-07 | Status change logged in version_history with timestamp and user | Append to `version_history` array on every PATCH /status call |
| INC-08 | Admin can delete Draft incidents | DELETE /api/incidents/{id} — checks role==admin and status==draft |
| VIEW-01 | Paginated list of all incidents (20 per page) | GET /api/incidents?page=1&limit=20; frontend pagination controls |
| VIEW-02 | Filter by status, tag, date range, creator | Query params on GET /api/incidents; server-side JSON filter |
| VIEW-03 | Search by keyword in title + description | `search` query param; Python `in` check on title+description fields |
| VIEW-04 | Detail page with all fields, files, version history in tabs | GET /api/incidents/{id}; frontend tabs: Details / Files / History |
| DASH-01 | Dashboard shows total incident counts by status | GET /api/reports/summary; frontend StatCard components |
| DASH-02 | Dashboard shows 10 most recent incidents | GET /api/incidents?limit=10&sort=created_at desc |
| API-01 | All endpoints require valid JWT (except /api/auth/login) | FastAPI `Depends(get_current_user)` on all routers except auth |
| API-02 | POST /api/files/extract accepts file upload and returns extracted text | Standalone extraction endpoint; returns `{extracted_text, file_type}` |
| API-03 | POST /api/incidents/check-duplicate returns is_duplicate + existing_incident_id | SHA-256 hash lookup in hashes.json within 14-day window |
| API-04 | GET /api/reports/summary returns totals by status, priority, category | Aggregate over incidents.json; O(n) scan acceptable at demo scale |
| API-05 | All responses follow {success, data, message} envelope | Custom response wrapper applied to all endpoints |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.4 (latest) | Frontend framework, App Router, SSR | Pre-decided in PRD; React-based, TypeScript native |
| FastAPI | 0.128.8 (latest) | Python async REST API | Pre-decided; auto-generates /docs, Pydantic validation |
| uvicorn | 0.39.0 (latest) | ASGI server for FastAPI | Standard FastAPI server |
| python-jose[cryptography] | 3.5.0 (latest) | JWT encode/decode | Pre-decided; pairs with FastAPI auth patterns |
| passlib[bcrypt] | 1.7.4 (latest passlib) | Password hashing | Pre-decided; WARNING: pin bcrypt<=3.2.2 (see Pitfalls) |
| PyMuPDF | 1.26.5 (latest) | PDF text extraction (imports as `fitz`) | Pre-decided; best-in-class PDF extraction |
| python-docx | 1.2.0 (latest) | DOCX text extraction | Pre-decided; standard python-docx library |
| python-multipart | 0.0.20 (latest) | FastAPI file upload support | Required by FastAPI for Form + File handling |
| filelock | 3.19.1 (latest) | JSON file concurrency protection | Prevents corruption under concurrent RPA + manual writes |
| python-dotenv | 1.2.1 (latest) | Environment variable loading | JWT secret, config management |
| tailwindcss | 4.2.4 (latest) | Utility CSS | Pre-decided; scaffolded via create-next-app |
| TypeScript | 6.0.3 (latest) | Type safety | Pre-decided; scaffolded via create-next-app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| anthropic | 0.97.0 | Claude API SDK | Phase 3 only — do NOT install in Phase 1 |

**Note:** Implementation plan shows older versions (fastapi==0.115.0, pymupdf==1.24.5, etc.). Use current versions above instead — all are backward compatible for this use case.

**Installation (backend):**
```bash
pip install fastapi==0.128.8 uvicorn[standard]==0.39.0 \
  "python-jose[cryptography]==3.5.0" \
  "passlib[bcrypt]==1.7.4" bcrypt==3.2.2 \
  python-multipart==0.0.20 pymupdf==1.26.5 \
  python-docx==1.2.0 filelock==3.19.1 \
  python-dotenv==1.2.1
```

**Installation (frontend):**
```bash
npx create-next-app@latest irrs-frontend \
  --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --yes
```

---

## Architecture Patterns

### Project Structure
```
assignment-root/
├── irrs-backend/
│   ├── main.py               # FastAPI app, CORS, router includes
│   ├── requirements.txt
│   ├── routers/
│   │   ├── auth.py           # POST /api/auth/login
│   │   ├── incidents.py      # CRUD + status + delete
│   │   ├── files.py          # POST /api/files/extract
│   │   ├── reports.py        # GET /api/reports/summary
│   │   └── logs.py           # GET /api/logs
│   ├── utils/
│   │   ├── auth_utils.py     # JWT create/decode, get_current_user dependency
│   │   ├── storage.py        # read_json/write_json with filelock
│   │   ├── file_parser.py    # extract_text(file_bytes, content_type)
│   │   └── dedup.py          # sha256 hash + 14-day window check
│   ├── models/
│   │   ├── incident.py       # Pydantic schemas
│   │   └── user.py
│   └── data/
│       ├── incidents.json    # starts as []
│       ├── users.json        # seeded with admin + editor + rpa_bot
│       ├── hashes.json       # starts as []
│       └── logs.json         # starts as []
└── irrs-frontend/
    ├── middleware.ts          # JWT cookie check → redirect to /login
    ├── app/
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
        ├── api.ts            # fetch wrappers calling localhost:8000
        └── types.ts          # TypeScript interfaces matching JSON schema
```

### Pattern 1: FastAPI JWT Auth Dependency

```python
# utils/auth_utils.py
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def create_access_token(data: dict) -> str:
    from datetime import datetime, timedelta
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({**data, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Pattern 2: Standard Response Envelope

```python
# All endpoints return this shape
def ok(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}

def err(message, status_code=400):
    from fastapi import HTTPException
    raise HTTPException(status_code=status_code,
                        detail={"success": False, "data": None, "message": message})
```

### Pattern 3: Filelock JSON Storage

```python
# utils/storage.py
import json
from pathlib import Path
from filelock import FileLock

DATA_DIR = Path("data")

def read_json(filename: str):
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return []
    lock = FileLock(str(filepath) + ".lock")
    with lock:
        return json.loads(filepath.read_text(encoding="utf-8"))

def write_json(filename: str, data) -> None:
    filepath = DATA_DIR / filename
    lock = FileLock(str(filepath) + ".lock")
    with lock:
        filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False),
                           encoding="utf-8")
```

### Pattern 4: Status Transition Guard

```python
VALID_TRANSITIONS = {
    "draft": "reviewed",
    "reviewed": "published",
}

def validate_transition(current: str, target: str):
    allowed = VALID_TRANSITIONS.get(current)
    if allowed != target:
        raise HTTPException(400, f"Cannot transition {current} → {target}")
```

### Pattern 5: Next.js Middleware JWT Check

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Pattern 6: Frontend API Client

```typescript
// lib/api.ts — all calls include JWT from cookie/localStorage
const API = "http://localhost:8000";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = document.cookie.match(/token=([^;]+)/)?.[1] ?? "";
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
  return res.json();
}
```

### Anti-Patterns to Avoid

- **Don't store JWT in localStorage** — use HTTP-only cookie set by FastAPI on login, read by Next.js middleware
- **Don't skip filelock** — concurrent RPA + user writes will corrupt JSON
- **Don't return raw exceptions** — always wrap in `{success, data, message}` envelope
- **Don't use `import fitz` without pymupdf installed** — PyMuPDF's pip name is `pymupdf` but its import is `import fitz`
- **Don't allow status backwards** — Published → anything must return 400, not silently succeed
- **Don't trust client-side status** — always compute `status == "draft"` guard server-side on PUT

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | PyMuPDF (`fitz`) | Handles multi-page, encoded, rotated text |
| DOCX extraction | XML parsing | python-docx | Handles complex DOCX structure |
| Password hashing | Custom hash | passlib bcrypt | Timing-safe comparison, cost factor |
| JWT encode/decode | Custom tokens | python-jose | RFC-compliant, expiry handling built-in |
| JSON concurrency | Manual locking | filelock | Cross-platform, exception-safe file locks |
| Form validation | Manual checks | Pydantic + FastAPI | Auto-validates request body, generates OpenAPI |
| Route protection | Manual cookie parsing | Next.js middleware.ts | Runs at Edge before page render |
| Pagination | Custom slice logic | Server-side skip/limit | Keep it simple: `items[skip:skip+limit]` |

---

## Common Pitfalls

### Pitfall 1: passlib + bcrypt >= 4.0 Compatibility
**What goes wrong:** `passlib[bcrypt]` 1.7.4 uses an internal bcrypt API that was removed in bcrypt >= 4.0. Verification silently fails or throws `AttributeError: module 'bcrypt' has no attribute '__about__'`.
**Why it happens:** passlib hasn't been updated since 2020; bcrypt 4.0 broke its private API.
**How to avoid:** Pin `bcrypt==3.2.2` in requirements.txt alongside `passlib[bcrypt]==1.7.4`. Alternatively use `bcrypt` directly without passlib.
**Warning sign:** Login always returns 401 despite correct password.

### Pitfall 2: CORS Blocking Frontend → Backend
**What goes wrong:** Browser blocks API calls from localhost:3000 to localhost:8000.
**Why it happens:** FastAPI CORS middleware must be added before routes, with `allow_credentials=True` and exact origin.
**How to avoid:**
```python
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**Warning sign:** Browser console shows `Access-Control-Allow-Origin` errors.

### Pitfall 3: PyMuPDF Import Name Mismatch
**What goes wrong:** `import pymupdf` fails with ModuleNotFoundError.
**Why it happens:** pip package is `pymupdf` but the Python module name is `fitz`.
**How to avoid:** Always `import fitz` not `import pymupdf`.

### Pitfall 4: Multipart File Upload Missing Dependency
**What goes wrong:** FastAPI raises `RuntimeError: Form data requires python-multipart` even when File() is used correctly.
**How to avoid:** Ensure `python-multipart` is in requirements.txt. It's a separate package FastAPI doesn't bundle.

### Pitfall 5: Next.js App Router Client vs Server Component
**What goes wrong:** Using `useState`/`useEffect` in a Server Component crashes at build time.
**Why it happens:** App Router components are Server by default.
**How to avoid:** Add `"use client"` directive at top of any component using hooks, event handlers, or browser APIs. Keep data-fetching in Server Components, interactivity in Client Components.

### Pitfall 6: JSON File Grows Large with Version History
**What goes wrong:** incidents.json becomes unwieldy as version_history arrays grow.
**Why it happens:** Appending full description snapshots on every edit.
**How to avoid:** Only snapshot description on status change, not on every field edit. The assignment demo will have <100 incidents so this won't bite, but keep writes minimal.

### Pitfall 7: Stale Data After Optimistic UI Update
**What goes wrong:** User clicks "Mark as Reviewed" — button disappears but status badge doesn't update.
**Why it happens:** React state not refreshed after mutation.
**How to avoid:** After every PATCH/PUT mutation, re-fetch the incident from the API and update local state (or use `router.refresh()` in App Router).

### Pitfall 8: SHA-256 Dedup Hash Collisions on Empty Files
**What goes wrong:** All empty files get the same hash, triggering false duplicate.
**How to avoid:** Hash `filename + content` concatenated, not just content.

---

## Code Examples

### File Text Extraction (Python)

```python
# utils/file_parser.py
import fitz  # PyMuPDF — pip name is pymupdf
from docx import Document
import io

def extract_text(file_bytes: bytes, content_type: str, filename: str) -> str:
    if "pdf" in content_type or filename.endswith(".pdf"):
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)
    elif "docx" in content_type or filename.endswith(".docx"):
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs)
    else:
        return file_bytes.decode("utf-8", errors="replace")
```

### Incident Status Endpoint

```python
# routers/incidents.py
@router.patch("/{incident_id}/status")
def update_status(incident_id: str, body: StatusUpdate,
                  current_user=Depends(get_current_user)):
    incidents = read_json("incidents.json")
    inc = next((i for i in incidents if i["id"] == incident_id), None)
    if not inc:
        raise HTTPException(404, "Not found")
    validate_transition(inc["status"], body.status)
    inc["status"] = body.status
    inc["updated_at"] = datetime.utcnow().isoformat()
    inc["version_history"].append({
        "version": inc["version"],
        "status": body.status,
        "changed_by": current_user["sub"],
        "changed_at": datetime.utcnow().isoformat()
    })
    inc["version"] += 1
    write_json("incidents.json", incidents)
    return ok({"incident": inc})
```

### StatusBadge Component (Next.js)

```typescript
// components/StatusBadge.tsx
const colors = {
  draft: "bg-gray-100 text-gray-700",
  reviewed: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? ""}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

### SHA-256 Dedup Check

```python
# utils/dedup.py
import hashlib
from datetime import datetime, timedelta
from utils.storage import read_json, write_json

def compute_hash(filename: str, content: bytes) -> str:
    return hashlib.sha256(filename.encode() + content).hexdigest()

def is_duplicate(content_hash: str) -> tuple[bool, str | None]:
    records = read_json("hashes.json")
    cutoff = datetime.utcnow() - timedelta(days=14)
    for r in records:
        if (r["hash"] == content_hash and
                datetime.fromisoformat(r["created_at"]) > cutoff):
            return True, r["incident_id"]
    return False, None

def register_hash(content_hash: str, incident_id: str):
    records = read_json("hashes.json")
    records.append({
        "hash": content_hash,
        "incident_id": incident_id,
        "created_at": datetime.utcnow().isoformat()
    })
    write_json("hashes.json", records)
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Next.js Pages Router | App Router (Next.js 13+) | Server Components by default; layouts; middleware |
| Flask | FastAPI | Async, auto-OpenAPI /docs, Pydantic validation |
| JWT in localStorage | HTTP-only cookie | XSS-resistant session |
| Manual PDF parsing | PyMuPDF `fitz` | One-line multi-page extraction |

**Deprecated/outdated in plan:**
- `fastapi==0.115.0` in implementation-plan.md — current is 0.128.8; use current
- `pymupdf==1.24.5` — current is 1.26.5; use current
- `anthropic==0.34.0` — current is 0.97.0; do NOT install until Phase 3

---

## Open Questions

1. **Cookie vs Authorization header for JWT on frontend**
   - What we know: FastAPI sets cookie on login; Next.js middleware reads cookie
   - What's unclear: Frontend API calls — does `credentials: "include"` suffice or must we manually extract token from cookie and set `Authorization: Bearer`?
   - Recommendation: Set both — FastAPI sets cookie + returns token in response body; frontend stores token in memory/cookie and sends as `Authorization: Bearer` header. This ensures RPA bots (which use headers, not cookies) work with the same endpoints.

2. **Next.js version 15 vs 14**
   - What we know: `npm view next version` returns 16.2.4 (latest). PRD says "Next.js 14".
   - What's unclear: create-next-app will install latest (16.x). App Router API is stable across 14/15/16.
   - Recommendation: Use whatever create-next-app installs (16.x). The App Router patterns are identical.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in project — manual testing via FastAPI /docs + browser |
| Config file | None — Wave 0 gap |
| Quick run command | `curl http://localhost:8000/api/health` |
| Full suite command | Manual: run all 6 success criteria from phase definition |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| AUTH-01 | Login with admin/admin123 returns JWT | smoke | `curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'` | ❌ Wave 0 |
| AUTH-02 | JWT cookie persists across refresh | manual | Browser refresh on /dashboard | ❌ Wave 0 |
| AUTH-03 | /dashboard redirects to /login without token | smoke | `curl -s http://localhost:3000/dashboard` → 302 to /login | ❌ Wave 0 |
| AUTH-04 | Admin role blocks non-admin from delete | smoke | `curl -X DELETE .../incidents/{id}` with editor token → 403 | ❌ Wave 0 |
| INC-01 | POST /api/incidents creates Draft incident | smoke | `curl -X POST .../incidents` with form data | ❌ Wave 0 |
| INC-02 | POST /api/files/extract returns text from PDF | smoke | `curl -F "file=@test.pdf" .../files/extract` | ❌ Wave 0 |
| INC-03 | New incident has status=draft | unit | Verified via INC-01 response body | ❌ Wave 0 |
| INC-05 | PATCH status draft→reviewed succeeds | smoke | `curl -X PATCH .../incidents/{id}/status -d '{"status":"reviewed"}'` | ❌ Wave 0 |
| INC-05 | PATCH status reviewed→published succeeds | smoke | Same pattern | ❌ Wave 0 |
| INC-06 | PUT on published incident returns 403 | smoke | `curl -X PUT .../incidents/{id}` after publish → 403 | ❌ Wave 0 |
| INC-07 | version_history has entry after status change | unit | Check response body contains version_history entry | ❌ Wave 0 |
| INC-08 | Admin DELETE draft succeeds; editor DELETE fails | smoke | Two curl calls with different tokens | ❌ Wave 0 |
| VIEW-01 | GET /incidents returns paginated data | smoke | `curl ".../incidents?page=1&limit=20"` | ❌ Wave 0 |
| VIEW-02 | Filter by status=draft returns only drafts | smoke | `curl ".../incidents?status=draft"` | ❌ Wave 0 |
| VIEW-03 | Search by keyword returns matching incidents | smoke | `curl ".../incidents?search=damaged"` | ❌ Wave 0 |
| DASH-01 | GET /reports/summary returns status counts | smoke | `curl .../reports/summary` | ❌ Wave 0 |
| API-05 | All responses have {success, data, message} | unit | Check every smoke test response shape | ❌ Wave 0 |

### Sampling Rate
- Per task commit: `curl http://localhost:8000/api/health`
- Per wave merge: Run all smoke curl commands above manually
- Phase gate: All 6 success criteria from phase definition pass before mark-complete

### Wave 0 Gaps
- [ ] `irrs-backend/tests/` directory — no test framework configured
- [ ] Test PDF file at `irrs-backend/tests/fixtures/test.pdf` — needed for INC-02 smoke test
- Framework install (optional): `pip install pytest httpx` for automated API tests

*(No automated test suite required for this academic project — manual curl + browser testing is sufficient for phase gate)*

---

## Sources

### Primary (HIGH confidence)
- PRD `prd/03-prd-v1.0.md` — full spec, data model, API endpoints, UI flows
- Implementation plan `prd/implementation-plan.md` — 14 tasks with code templates
- npm registry — Next.js 16.2.4, tailwindcss 4.2.4, typescript 6.0.3 (verified 2026-05-04)
- pip registry — fastapi 0.128.8, pymupdf 1.26.5, uvicorn 0.39.0, python-jose 3.5.0, passlib 1.7.4, filelock 3.19.1 (verified 2026-05-04)

### Secondary (MEDIUM confidence)
- FastAPI official docs pattern: `Depends(get_current_user)` for auth
- PyMuPDF import-as-fitz is documented in PyMuPDF official README
- passlib + bcrypt >= 4.0 incompatibility: widely reported GitHub issue on passlib repo

### Tertiary (LOW confidence)
- bcrypt==3.2.2 pin as mitigation: community workaround, not officially documented by passlib

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against live registries 2026-05-04
- Architecture: HIGH — directly from PRD and implementation plan authored for this project
- Pitfalls: MEDIUM — passlib/bcrypt issue is well-known; others from FastAPI/Next.js patterns

**Research date:** 2026-05-04
**Valid until:** 2026-05-14 (stable stack, 10-day validity)
