# Phase 2: RPA Automation - Research

**Researched:** 2026-05-05
**Domain:** UiPath workflow automation + Next.js 16 logs page
**Confidence:** HIGH (backend fully implemented and verified from source; frontend patterns verified from existing code)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Google Drive Connection**
- Google Drive for Desktop mounts folder as local path on bot machine
- Bot polls watch folder every ~30s–1min
- After processing, bot moves file to `processed/` subfolder — no state file needed

**File → Incident Field Mapping**
- Title: filename without extension
- Description: full text content of the file
- Priority: `"medium"` (default)
- Category: `"other"` (default)
- Source: `"rpa"`
- Attachment: original .txt file via `files[]` upload field + content as `description`
- Content hash: SHA-256 of file content, sent as `content_hash` field

**Deduplication**
- Bot calls `POST /api/incidents/check-duplicate` with `{content_hash}` before creating
- If `is_duplicate: true` → skip creation, log `skip` entry, move file to `processed/`

**Status Update**
- After creation: `PATCH /api/incidents/{id}/status` with `{"status": "reviewed"}`

**Logging (RPA-05)**
- `POST /api/logs` with: `run_id`, `action`, `file_name`, `incident_id`, `status`, `message`, `screenshot_path`
- `run_id`: UUID per bot run
- `action`: `"create"` | `"skip_duplicate"` | `"status_update"` | `"error"`
- `status`: `"success"` | `"skipped"` | `"failed"`

**Error Handling (RPA-06)**
- Try/Catch per file
- On failure: screenshot → `rpa_screenshots/` → log error with `screenshot_path`
- Continue to next file after error

**Summary Email (RPA-07)**
- Gmail SMTP: smtp.gmail.com port 587 TLS
- Credentials in config `.json` file (not hardcoded)
- Recipient: same Gmail (send to self for demo)
- Plain text format with Run ID, timestamp, Created/Duplicates/Failed counts

**Frontend Logs Page**
- New route `/logs` in Next.js App Router
- Table grouped by `run_id` — collapsible groups
- Header row: Run ID, timestamp, Created/Skipped/Failed counts
- Expandable log rows: action, file_name, status, message, screenshot_path
- "Logs" link in global nav, visible to all authenticated roles
- Calls `GET /api/logs` with `?run_id=` filter and pagination
- Status badges: success=green, skipped=yellow, failed=red

### Claude's Discretion
- Exact UiPath polling interval configuration
- Config file schema for email credentials
- Collapsible row UX (expand/collapse all toggle vs. individual)
- Screenshot path display format in logs table

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RPA-01 | UiPath bot reads new files from Google Drive folder | Google Drive for Desktop local path; directory polling with Move File after processing |
| RPA-02 | Bot skips files with same SHA-256 hash seen within 14 days | `POST /api/incidents/check-duplicate` verified in source; SHA-256 via System.Security.Cryptography in UiPath |
| RPA-03 | Bot creates incident via POST /api/incidents with file attached | Multipart form endpoint verified from incidents.py source; all fields documented |
| RPA-04 | Bot updates incident status to Reviewed via PATCH | Status machine verified: draft→reviewed valid; endpoint signature confirmed |
| RPA-05 | Bot logs each action to /api/logs | LogEntry schema verified from logs.py source; all fields documented |
| RPA-06 | Bot takes screenshot and logs error path on failure | UiPath TakeScreenshot activity; Try/Catch pattern; screenshot_path field in LogEntry |
| RPA-07 | Bot sends summary email after each run | Gmail SMTP via UiPath Send SMTP Mail Message; credentials from JSON config |
</phase_requirements>

---

## Summary

Phase 2 has two independent workstreams: (1) a UiPath automation workflow and (2) a Next.js frontend page. The backend is fully implemented — no Python changes needed. All API contracts are confirmed from source code.

The UiPath workflow follows a standard polling pattern: scan local folder, compute SHA-256, check duplicate via API, create incident via multipart POST, advance status via PATCH, log every action, catch errors with screenshots, then send summary email. The rpa_bot credential is already seeded.

The frontend logs page is a new Next.js 16 App Router client component following the exact same pattern as the existing incidents page. A critical discrepancy exists: the Navbar already has a `/logs` link but gates it to `admin` role only (line 49 of Navbar.tsx). CONTEXT.md says the link should be visible to ALL authenticated roles — the planner must include a task to remove the `user?.role === "admin" &&` guard.

**Primary recommendation:** Implement the two workstreams as separate plans (UiPath workflow first, then frontend logs page). The UiPath work is the majority of effort; the frontend page is a single-file addition following established patterns.

---

## Standard Stack

### UiPath Bot

| Component | Version/Package | Purpose |
|-----------|----------------|---------|
| UiPath Studio | Community Edition (latest) | Workflow authoring |
| UiPath.System.Activities | Bundled | File ops, loops, variables, Try/Catch |
| UiPath.WebAPI.Activities | Bundled | HTTP Request activity for all API calls |
| Send SMTP Mail Message | Bundled (UiPath.Mail.Activities) | Gmail summary email |
| TakeScreenshot | Bundled (UiPath.UIAutomation.Activities) | Error screenshots |
| System.Security.Cryptography.SHA256 | .NET BCL via Invoke Code | SHA-256 hash of file content |

### Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| Next.js | 16.2.4 | App Router, page routing |
| React | 19.2.4 | Client components |
| lucide-react | ^1.14.0 | Icons (ChevronDown/Up for collapse toggle) |
| Tailwind CSS | (project default) | Inline utility classes |

**No new npm installs required** — all frontend dependencies already present.

---

## Architecture Patterns

### UiPath Workflow Structure

```
Main.xaml
├── Initialize
│   ├── Generate run_id (Assign: New System.Guid().ToString())
│   ├── Read config.json (Read Text File → Deserialize JSON)
│   ├── POST /api/auth/login → extract token
│   └── Init counters: created=0, skipped=0, failed=0
│
├── For Each File in watch_folder (*.txt)
│   └── Try
│       ├── Read file content (Read Text File)
│       ├── Compute SHA-256 (Invoke Code)
│       ├── POST /api/incidents/check-duplicate
│       ├── If is_duplicate=True
│       │   ├── POST /api/logs (action=skip_duplicate, status=skipped)
│       │   ├── skipped += 1
│       │   └── Move File to processed/
│       └── Else
│           ├── POST /api/incidents (multipart form)
│           ├── Extract incident_id from response
│           ├── POST /api/logs (action=create, status=success)
│           ├── PATCH /api/incidents/{id}/status {"status":"reviewed"}
│           ├── POST /api/logs (action=status_update, status=success)
│           ├── created += 1
│           └── Move File to processed/
│       Catch (Exception)
│           ├── TakeScreenshot → save to rpa_screenshots/{run_id}_{filename}.png
│           ├── POST /api/logs (action=error, status=failed, screenshot_path=...)
│           └── failed += 1
│
└── Finalize
    └── Send SMTP Mail Message (summary email)
```

### Pattern 1: HTTP Request Activity (UiPath)

```
Activity: HTTP Request
Endpoint: http://localhost:8000/api/auth/login
Method: POST
Body Format: application/json
Body: {"username": config_username, "password": config_password}
→ Output: response_content (String)
→ Deserialize JSON → extract token
```

```
Activity: HTTP Request
Endpoint: http://localhost:8000/api/incidents
Method: POST
Body Format: multipart/form-data
Headers: Authorization: Bearer {token}
Fields:
  title         = filename_no_ext
  description   = file_content
  priority      = "medium"
  category      = "other"
  source        = "rpa"
  content_hash  = sha256_hash
  files[]       = file_bytes (attach .txt file)
→ Output: response JSON → extract data.incident.id
```

### Pattern 2: SHA-256 in UiPath (Invoke Code)

```vb
' Invoke Code activity — language: VB.NET
Dim bytes As Byte() = System.Text.Encoding.UTF8.GetBytes(file_content)
Dim hash As Byte() = System.Security.Cryptography.SHA256.Create().ComputeHash(bytes)
sha256_result = System.BitConverter.ToString(hash).Replace("-","").ToLower()
```
This replicates exactly `hashlib.sha256(content.encode("utf-8")).hexdigest()` from `dedup.py`.

### Pattern 3: Config JSON Schema

```json
{
  "api_base_url": "http://localhost:8000/api",
  "rpa_username": "rpa_bot",
  "rpa_password": "rpabot123",
  "watch_folder": "C:/Users/.../Google Drive/irrs-watch",
  "processed_folder": "C:/Users/.../Google Drive/irrs-watch/processed",
  "screenshots_folder": "C:/path/to/rpa_screenshots",
  "email_smtp_host": "smtp.gmail.com",
  "email_smtp_port": 587,
  "email_from": "your@gmail.com",
  "email_to": "your@gmail.com",
  "email_app_password": "xxxx xxxx xxxx xxxx"
}
```

### Frontend Logs Page Structure

```
irrs-frontend/
├── app/
│   └── logs/
│       └── page.tsx          ← NEW: client component, grouped by run_id
└── components/
    └── Navbar.tsx            ← MODIFY: remove admin gate on /logs link
```

### Pattern 4: Logs Page Component Structure

```typescript
// Source: mirrors irrs-frontend/app/incidents/page.tsx pattern
"use client";

// State: logs array, grouped by run_id, expanded set, loading, page
// useEffect: apiFetch<LogsResponse>("/logs?page=1&limit=200")
// Group logs by run_id client-side
// Render: table with collapsible run groups
// Badge colors: success=green, skipped=yellow, failed=red (inline Tailwind)
```

Log grouping approach (client-side, consistent with existing patterns):
```typescript
// Group after fetch
const groups = logs.reduce((acc, log) => {
  if (!acc[log.run_id]) acc[log.run_id] = [];
  acc[log.run_id].push(log);
  return acc;
}, {} as Record<string, LogEntry[]>);
```

### Anti-Patterns to Avoid

- **Hardcoding credentials in Main.xaml** — store in config.json, read at runtime
- **Single Try/Catch wrapping all files** — must be per-file so one failure doesn't abort the run
- **Not moving processed files** — causes infinite reprocessing on next poll
- **Sending Content-Type: application/json for multipart** — UiPath HTTP Request handles multipart automatically when body format is set correctly; don't override
- **Using `import pymupdf`** — not relevant here but noted: bot only handles .txt files, no PDF parsing needed in UiPath
- **Admin-only gate on /logs nav link** — Navbar.tsx line 49 currently gates `/logs` to admin; CONTEXT says all roles should see it; must remove guard

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| SHA-256 hashing | Custom hash loop | `System.Security.Cryptography.SHA256` via Invoke Code |
| HTTP auth | Manual header string building | UiPath HTTP Request Headers collection |
| Email sending | SMTP socket code | UiPath Send SMTP Mail Message activity |
| Screenshot capture | Screen capture API calls | UiPath TakeScreenshot activity |
| JSON parsing | String manipulation | UiPath Deserialize JSON activity |
| File move after processing | Delete + write copy | UiPath Move File activity |

---

## Common Pitfalls

### Pitfall 1: Multipart File Upload in UiPath HTTP Request

**What goes wrong:** UiPath HTTP Request activity requires specific configuration for multipart/form-data with file attachments. Setting body format incorrectly results in 422 Unprocessable Entity from FastAPI.

**Why it happens:** UiPath HTTP Request has separate "Body" and "Files" sections for multipart. The form text fields go in the body parameters collection; the file bytes go in the Files attachment section.

**How to avoid:** Use Body Format = `multipart/form-data`, add text fields as body parameters (key/value), add file as attachment with field name `files` (matching FastAPI's `files: list[UploadFile] = File(default=[])`).

**Warning signs:** 422 response with "field required" errors in detail.

### Pitfall 2: JWT Expiry During Long Runs

**What goes wrong:** JWT expires after 8 hours (per CLAUDE.md). A bot run that starts just before expiry could fail mid-run with 401.

**Why it happens:** Token fetched once at start of workflow; each HTTP Request reuses same token.

**How to avoid:** For demo purposes (short runs) this is fine. Document as known limitation. Bot logs 401 errors via existing error handler.

### Pitfall 3: `processed/` Folder Must Exist

**What goes wrong:** UiPath Move File activity throws if destination folder doesn't exist.

**Why it happens:** First bot run — `processed/` not yet created.

**How to avoid:** Add a `Create Directory` activity in the Initialize sequence before the file loop. Check if folder exists first (`Directory.Exists`).

### Pitfall 4: Log Entries Require Authentication

**What goes wrong:** `POST /api/logs` requires valid JWT (`Depends(get_current_user)` in logs.py). Sending log entries without Bearer token returns 401.

**Why it happens:** All endpoints except `/api/auth/login` require auth. Easy to forget when coding the error-catch path.

**How to avoid:** The token variable must be in scope in the Catch block. Initialize token at workflow level (not inside Try), so it's accessible in Catch.

### Pitfall 5: Next.js 16 + React 19 Breaking Changes

**What goes wrong:** Next.js 16.2.4 with React 19 has API differences from training data. The AGENTS.md explicitly warns about this.

**Why it happens:** Breaking changes in App Router, server/client component boundaries, and hooks.

**How to avoid:** Follow exact patterns from existing working pages (incidents/page.tsx, dashboard/page.tsx). Don't introduce patterns not already used in the codebase. The logs page is a pure client component (`"use client"`) with useState/useEffect — same as all existing pages.

### Pitfall 6: Navbar /logs Visibility Bug Already Exists

**What goes wrong:** Navbar.tsx line 49 already has `{user?.role === "admin" && navLink("/logs", "Logs")}` — this was pre-implemented but gates it to admin only. CONTEXT.md requires all authenticated roles to see the Logs link.

**Why it happens:** Anticipatory implementation with wrong role gate.

**How to avoid:** Plan must include an explicit task to change this to just `{navLink("/logs", "Logs")}` (no role gate).

---

## Code Examples

### POST /api/auth/login — expected response

```json
{
  "success": true,
  "data": { "access_token": "eyJ...", "token_type": "bearer", "user": {...} },
  "message": "Login successful"
}
```

Extract: `response.data.access_token`

### POST /api/incidents/check-duplicate

Request body (JSON):
```json
{ "content_hash": "abc123..." }
```

Response:
```json
{
  "success": true,
  "data": { "is_duplicate": false, "existing_incident_id": null }
}
```

### POST /api/incidents — multipart form fields

```
title          = "parcel_damaged_2026"        (string)
description    = "<full file text content>"   (string)
priority       = "medium"                     (string)
category       = "other"                      (string)
source         = "rpa"                        (string)
content_hash   = "abc123..."                  (string, optional)
raw_content    = ""                           (string, optional)
tags           = ""                           (string, optional)
files          = <binary .txt file>           (file attachment, field name: files)
```

Response extracts: `response.data.incident.id`

### PATCH /api/incidents/{id}/status

Request body (JSON):
```json
{ "status": "reviewed" }
```

### POST /api/logs — log entry

```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "action": "create",
  "file_name": "parcel_damaged_2026.txt",
  "incident_id": "abc-123",
  "status": "success",
  "message": "Incident created and advanced to reviewed",
  "screenshot_path": null
}
```

Error entry:
```json
{
  "run_id": "550e8400-...",
  "action": "error",
  "file_name": "bad_file.txt",
  "incident_id": null,
  "status": "failed",
  "message": "HTTP 422: Unprocessable Entity",
  "screenshot_path": "rpa_screenshots/550e8400_bad_file.png"
}
```

### GET /api/logs — response shape

```typescript
interface LogEntry {
  log_id: string;
  timestamp: string;       // ISO UTC
  run_id: string;
  action: string;          // create | skip_duplicate | status_update | error
  file_name: string | null;
  incident_id: string | null;
  status: string;          // success | skipped | failed
  message: string;
  screenshot_path: string | null;
}

interface LogsResponse {
  success: boolean;
  data: {
    logs: LogEntry[];
    total: number;
  };
}
```

### Badge colors for logs page

```typescript
// Source: follows StatusBadge.tsx pattern in existing codebase
const LOG_STATUS_COLORS: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  skipped: "bg-yellow-100 text-yellow-700",
  failed:  "bg-red-100 text-red-700",
};
```

### Summary Email Body

```
DHL IRRS RPA Run Summary
Run ID: {run_id}
Timestamp: {datetime}

Created: {n}
Duplicates: {n}
Failed: {n}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| UiPath HTTP Request with JSON body | multipart/form-data for file upload | Bot must set body format correctly per endpoint type |
| Manual token management | Single token per run | Sufficient for demo; 8h expiry is non-issue for short runs |

---

## Open Questions

1. **Gmail App Password availability**
   - What we know: SMTP config requires a Gmail App Password (2FA must be enabled on Gmail account)
   - What's unclear: Whether the demo Gmail account has 2FA enabled and App Password generated
   - Recommendation: Document in plan that user must generate App Password before bot run; provide instructions in task

2. **UiPath file attachment field name**
   - What we know: FastAPI expects field name `files` (plural, as `files: list[UploadFile] = File(default=[])`)
   - What's unclear: Some UiPath versions name the attachment field differently in the HTTP Request activity UI
   - Recommendation: Plan task should explicitly state to set attachment field name to `files`

3. **rpa_screenshots/ folder location**
   - What we know: Bot saves to `rpa_screenshots/` and stores path in log entry
   - What's unclear: Absolute vs. relative path — frontend displays the path string but cannot serve the image
   - Recommendation: Store as relative path string for display purposes; note in plan that screenshot_path is informational text, not a served URL

---

## Sources

### Primary (HIGH confidence)
- `irrs-backend/routers/logs.py` — LogEntry schema, GET/POST endpoints, response shapes
- `irrs-backend/routers/incidents.py` — POST /incidents form fields, PATCH /status, check-duplicate
- `irrs-backend/utils/dedup.py` — SHA-256 algorithm: `hashlib.sha256(content.encode("utf-8")).hexdigest()`
- `irrs-frontend/components/Navbar.tsx` — existing /logs link with admin gate (line 49)
- `irrs-frontend/app/incidents/page.tsx` — page pattern to follow
- `irrs-frontend/lib/api.ts` — apiFetch wrapper, cookie auth
- `irrs-frontend/components/StatusBadge.tsx` — badge color convention
- `.planning/config.json` — `nyquist_validation: false` confirmed
- `.planning/phases/02-rpa-automation/02-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- UiPath HTTP Request activity multipart/form-data behavior — from UiPath documentation patterns and common usage
- Gmail SMTP port 587 TLS — industry standard, high confidence

---

## Metadata

**Confidence breakdown:**
- API contracts: HIGH — verified directly from source files
- UiPath activity patterns: MEDIUM — from knowledge (activity names/config may vary by UiPath version)
- Frontend patterns: HIGH — verified from existing working code in same codebase
- SHA-256 replication: HIGH — exact Python implementation read from dedup.py

**Research date:** 2026-05-05
**Valid until:** 2026-05-20 (stable domain; backend frozen)
