# Phase 2: RPA Automation - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

UiPath bot monitors a local Google Drive sync folder, deduplicates files by SHA-256 hash, creates incidents via the backend REST API, advances each to "reviewed" status, logs every action to `/api/logs`, captures screenshots on failure, and sends a plain-text summary email after each run.

Frontend addition: a `/logs` page in the Next.js app that displays bot run logs grouped by `run_id`.

Backend is already fully implemented for RPA — no backend changes required in this phase.

</domain>

<decisions>
## Implementation Decisions

### Google Drive Connection
- Use Google Drive for Desktop to mount the Drive folder as a local path on the bot machine
- Bot polls the watch folder on a schedule (every ~30s–1min for demo purposes)
- After processing a file, bot moves it to a `processed/` subfolder — no state file needed
- If file is still in the watch folder on next poll, it has not been handled yet

### File → Incident Field Mapping
- **Title**: filename without extension (e.g., `parcel_damaged_2026.txt` → title = `parcel_damaged_2026`)
- **Description**: full text content of the file
- **Priority**: `"medium"` (default, not parsed from content)
- **Category**: `"other"` (default, not parsed from content)
- **Source**: `"rpa"` (distinguishes bot-created incidents from manual ones)
- **Attachment**: bot attaches the original .txt file via the `files[]` upload field AND sends content as `description` — satisfies RPA-03 "with file attached"
- **Content hash**: SHA-256 of file content, sent as `content_hash` field — used for dedup check

### Deduplication
- Bot calls `POST /api/incidents/check-duplicate` with `{content_hash}` before creating
- If `is_duplicate: true` → skip creation, log a `skip` entry to `/api/logs`, move file to `processed/`
- If not duplicate → create incident, then advance status

### Status Update
- After successful incident creation, bot calls `PATCH /api/incidents/{id}/status` with body `{"status": "reviewed"}`
- Transition: draft → reviewed (valid per backend state machine)

### Logging (RPA-05)
- Every action logged to `POST /api/logs` with these fields:
  - `run_id`: UUID generated once per bot run, shared across all log entries in that run
  - `action`: one of `"create"`, `"skip_duplicate"`, `"status_update"`, `"error"`
  - `file_name`: the .txt filename
  - `incident_id`: populated after creation (null for skip/error before creation)
  - `status`: `"success"` | `"skipped"` | `"failed"`
  - `message`: human-readable description
  - `screenshot_path`: populated only on error (RPA-06)

### Error Handling (RPA-06)
- Bot wraps each file's processing in Try/Catch
- On failure: take screenshot → save to `rpa_screenshots/` folder → log error entry with `screenshot_path`
- Bot continues to next file after an error (does not abort the entire run)

### Summary Email (RPA-07)
- **SMTP**: Gmail (smtp.gmail.com, port 587, TLS)
- **Credentials**: Gmail address + App Password stored in a config `.json` file (not hardcoded in workflow)
- **Recipient**: same Gmail address (send to self for demo)
- **Format**: plain text
  ```
  DHL IRRS RPA Run Summary
  Run ID: {uuid}
  Timestamp: {datetime}

  Created: {n}
  Duplicates: {n}
  Failed: {n}
  ```

### Frontend Logs Page
- New route `/logs` added to Next.js App Router
- **Layout**: table grouped by `run_id` — each run is a collapsible group showing:
  - Header row: Run ID, timestamp, Created/Skipped/Failed counts
  - Expandable log rows below: action, file_name, status, message, screenshot_path
- **Nav**: "Logs" link added to the global nav, visible to all authenticated roles (admin, editor, rpa_bot)
- Calls `GET /api/logs` (supports `?run_id=` filter, pagination)
- Status badges: success = green, skipped = yellow, failed = red

### Claude's Discretion
- Exact UiPath polling interval configuration
- Config file schema for email credentials
- Collapsible row UX (expand/collapse all toggle vs. individual)
- Screenshot path display format in logs table

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend API contracts (already implemented)
- `irrs-backend/routers/incidents.py` — POST /api/incidents (multipart form fields: title, description, priority, category, tags, source, raw_content, content_hash, files[])
- `irrs-backend/routers/incidents.py` — PATCH /api/incidents/{id}/status (body: `{"status": "reviewed"}`)
- `irrs-backend/routers/logs.py` — POST /api/logs (LogEntry schema: run_id, action, file_name, incident_id, status, message, screenshot_path)
- `irrs-backend/utils/dedup.py` — SHA-256 dedup logic and hashes.json format

### Requirements
- `.planning/REQUIREMENTS.md` §RPA — RPA-01 through RPA-07 checklist
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (5 items)

### Frontend patterns
- `irrs-frontend/lib/api.ts` — apiFetch wrapper (auth headers, FormData handling)
- `irrs-frontend/app/incidents/page.tsx` — existing page pattern to follow for Logs page layout

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `irrs-frontend/lib/api.ts`: `apiFetch<T>()` — use for all `GET /api/logs` calls from the Logs page
- `irrs-frontend/app/incidents/page.tsx`: page structure pattern (client component, useState for data, useEffect fetch)
- `irrs-frontend/app/layout.tsx`: global nav — add "Logs" link here alongside existing "Incidents" and "Dashboard" links
- `irrs-backend/utils/dedup.py`: SHA-256 hash computation reference — bot must replicate this exact logic in UiPath

### Established Patterns
- All frontend pages are Next.js App Router client components (`"use client"`)
- Tailwind 4 + `lucide-react` for icons — no component library
- API envelope: `{ success: true, data: {...}, message: "..." }` — all responses follow this
- Status badges use inline Tailwind classes (check incidents page for color convention)

### Integration Points
- UiPath bot authenticates via `POST /api/auth/login` → gets JWT → includes as `Authorization: Bearer {token}` header on all subsequent calls
- Frontend Logs page: new file `irrs-frontend/app/logs/page.tsx`
- Nav link: `irrs-frontend/app/layout.tsx` — add after existing nav items

</code_context>

<specifics>
## Specific Ideas

- Bot should use `source: "rpa"` so bot-created incidents are distinguishable from manual ones in the incidents list
- The `rpa_bot` user is already seeded: username `rpa_bot`, password `rpabot123`, role `rpa_bot`
- For the demo video: pre-prepare 3–4 .txt test files in the watch folder. One should be a duplicate of a prior run to trigger the skip path.
- The `processed/` subfolder approach means the demo can be reset by moving files back out of `processed/`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-rpa-automation*
*Context gathered: 2026-05-05*
