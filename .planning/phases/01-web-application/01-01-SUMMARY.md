---
phase: 01-web-application
plan: 01
subsystem: backend
tags: [fastapi, jwt, incidents, crud, file-extraction, dedup, reports, json-storage]
dependency_graph:
  requires: []
  provides: [fastapi-api, jwt-auth, incidents-crud, file-extraction, dedup, reports-summary, rpa-logs]
  affects: [01-02-frontend, phase-2-rpa]
tech_stack:
  added:
    - fastapi==0.115.0
    - uvicorn[standard]==0.30.0
    - python-jose[cryptography]==3.3.0
    - passlib[bcrypt]==1.7.4
    - bcrypt==3.2.2
    - python-multipart==0.0.9
    - pymupdf==1.24.5
    - python-docx==1.1.2
    - filelock==3.15.4
    - python-dotenv==1.0.1
  patterns:
    - HTTPBearer(auto_error=False) + manual 401 raise for missing token
    - filelock-protected read_json/write_json for concurrent-safe JSON storage
    - VALID_TRANSITIONS dict enforces draft→reviewed→published state machine
    - version_history appended on every create/update/status-change
key_files:
  created:
    - irrs-backend/main.py (30 lines)
    - irrs-backend/requirements.txt
    - irrs-backend/seed.py (43 lines)
    - irrs-backend/.env.example
    - irrs-backend/data/users.json
    - irrs-backend/data/incidents.json
    - irrs-backend/data/hashes.json
    - irrs-backend/data/logs.json
    - irrs-backend/utils/storage.py (24 lines)
    - irrs-backend/utils/auth_utils.py (45 lines)
    - irrs-backend/utils/file_parser.py (25 lines)
    - irrs-backend/utils/dedup.py (38 lines)
    - irrs-backend/models/incident.py (77 lines)
    - irrs-backend/models/user.py (11 lines)
    - irrs-backend/routers/__init__.py
    - irrs-backend/routers/auth.py (32 lines)
    - irrs-backend/routers/incidents.py (219 lines)
    - irrs-backend/routers/files.py (22 lines)
    - irrs-backend/routers/reports.py (31 lines)
    - irrs-backend/routers/logs.py (51 lines)
    - irrs-backend/routers/ai.py (stub, 2 lines)
  modified: []
decisions:
  - "HTTPBearer(auto_error=False) used so missing token returns 401 (not 403)"
  - "check-duplicate route registered before /{incident_id} to avoid path conflict"
  - "bcrypt pinned to 3.2.2 — passlib 1.7.4 incompatible with bcrypt>=4.0"
  - "anthropic SDK NOT installed in Phase 1; ai.py is empty stub"
metrics:
  duration_seconds: 283
  completed_date: "2026-05-05"
  tasks_completed: 3
  files_created: 21
---

# Phase 1 Plan 1: FastAPI Backend Summary

**One-liner:** FastAPI backend on port 8000 with JWT auth, incidents state-machine CRUD, SHA-256 dedup, PDF/DOCX/TXT extraction, reports summary, and RPA logs — all backed by filelock-protected JSON files.

## Endpoint Inventory

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | /api/auth/login | public | Returns JWT + user record |
| GET | /api/health | public | Returns {"status":"ok"} |
| GET | /api/incidents | required | Filterable, paginated |
| POST | /api/incidents | required | multipart/form-data, status forced draft |
| GET | /api/incidents/{id} | required | 404 if missing |
| PUT | /api/incidents/{id} | required | 403 if not draft |
| DELETE | /api/incidents/{id} | required (admin) | 403 if not admin or not draft |
| PATCH | /api/incidents/{id}/status | required | Enforces draft→reviewed→published |
| POST | /api/incidents/check-duplicate | required | 14-day SHA-256 window |
| POST | /api/files/extract | required | TXT/PDF/DOCX; images return empty text |
| GET | /api/reports/summary | required | Counters by_status/priority/category |
| GET | /api/logs | required | Paginated, filterable by run_id/status |
| POST | /api/logs | required | RPA bot log submission |

## Seeded Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| editor | editor123 | editor |
| rpa_bot | rpa_secret_2026 | editor |

## Server Start Command

```bash
cd irrs-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Docs: http://localhost:8000/docs

## Known Limitations for Plan 01-02

- `routers/ai.py` is an empty stub — Claude AI integration is Phase 3 only
- No file upload endpoint for storing files separately (uploads happen inline during POST /incidents)
- JSON storage is single-process safe via filelock; not suitable for multi-worker uvicorn (`--workers 1` required)
- `data/*.json` files are relative to CWD — server must be started from `irrs-backend/` directory

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HTTPBearer returns 403 instead of 401 for missing token**
- **Found during:** Task 2 smoke test
- **Issue:** FastAPI's `HTTPBearer()` raises 403 by default when no Authorization header is present; plan required 401
- **Fix:** Changed to `HTTPBearer(auto_error=False)` and added explicit `HTTPException(401)` check in `get_current_user`
- **Files modified:** `irrs-backend/utils/auth_utils.py`
- **Commit:** b35f163

## Self-Check: PASSED

All key files verified present. Both task commits (4d835fa, b35f163) confirmed in git log.
