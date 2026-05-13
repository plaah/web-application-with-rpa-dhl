# PRD v1.0 — AI-Enhanced Incident Reporting & Resolution System
### DHL DAC 3.0 Challenge — Scenario 2
**Author:** plaah | **Course:** SECJ3483 Web Technology | **Date:** 2026-05-04
**Version:** 1.0 | **Status:** Draft

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [User Stories & Use Cases](#5-user-stories--use-cases)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Architecture](#8-technical-architecture)
9. [Data Model & Schema Design](#9-data-model--schema-design)
10. [API Specifications](#10-api-specifications)
11. [UI/UX Flow & Wireframe Descriptions](#11-uiux-flow--wireframe-descriptions)
12. [Acceptance Criteria per Feature](#12-acceptance-criteria-per-feature)
13. [Out of Scope](#13-out-of-scope)
14. [Dependencies & Risks](#14-dependencies--risks)
15. [Timeline & Milestones](#15-timeline--milestones)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

**Project Name:** DHL Incident Reporting & Resolution System (IRRS)

**One-line description:** A web-based incident management platform with RPA automation and optional AI summarization that enables DHL customer support teams to collect, process, assign, and track incident reports from multiple unstructured input channels.

**Problem:** DHL receives hundreds of daily incident reports through email, Telegram, phone notes, images, and handwritten inputs. These arrive as unstructured, inconsistent data, making it impossible to reliably identify, assign, prioritize, or track incidents — causing slow response times and poor service quality.

**Target Users:**
- Customer Support Agents (report creators/editors)
- Team Supervisors/Reviewers
- System Administrators
- UiPath RPA Bot (automated agent)

**Key Value Proposition:** Replace manual, inconsistent incident handling with a structured, automated pipeline — from raw input ingestion via RPA to searchable, versioned incident records with AI-assisted cleanup.

**Success Metrics:**
- All mandatory requirements fulfilled (Web App + RPA)
- Full CRUD demonstrated via API
- RPA workflow runs end-to-end without manual intervention
- Clean UI with login, upload, search, filter, status workflow

**Deadline:** 15 May 2026 (submission) | 18–21 May 2026 (evaluation)

---

## 2. Problem Statement

### Current State

DHL Customer Support teams handle a high volume of incident reports daily covering: late deliveries, address issues, damaged parcels, system errors, and general customer complaints. These reports arrive through:

- Email inboxes
- Telegram/Teams chat messages
- Phone call notes (manually typed)
- Images and screenshots of damaged packages
- Handwritten instructions from warehouse teams

### Pain Points

| Pain Point | Impact |
|---|---|
| Unstructured input across 5+ channels | Cannot be processed automatically |
| Incomplete incident data | Wrong department assignment |
| No deduplication | Same incident logged multiple times |
| No priority scoring | Critical incidents treated same as minor ones |
| No audit trail | Cannot track resolution progress |
| No consolidated reporting | Management blind to patterns and trends |

### Why Existing Solutions Fall Short

Currently, DHL support teams rely on manual reading, copy-pasting, and offline spreadsheets. There is no centralized system that:
- Accepts multi-format inputs (text, PDF, DOCX, images)
- Automatically deduplicates reports
- Provides structured draft → review → publish workflow
- Lets RPA bots create and update records programmatically

### Opportunity

This system solves a real operational bottleneck. By automating ingestion and structuring, DHL's support teams can focus on resolution rather than data entry. The optional Claude AI integration further reduces manual effort by summarizing messy inputs into clean, structured incident cards.

---

## 3. Goals & Success Metrics

### Academic Goals (Primary)

| Goal | Target |
|---|---|
| Web Application implementation | 50% of grade — full marks |
| RPA Design & Automation | 40% of grade — full marks |
| Project Management | 10% of grade — GitHub commits + progress |

### System Goals

| Goal | Metric | Target |
|---|---|---|
| Multi-format input acceptance | File types supported | text, PDF, DOCX minimum |
| Incident lifecycle management | Status transitions | Draft → Reviewed → Published |
| RPA automation coverage | Automated steps | Ingest → Dedup → Create → Update → Email |
| Search/filter functionality | Filter dimensions | tag, date, creator, status |
| Deduplication accuracy | Hash-based check | Skip duplicates within 14 days |

### North Star Metric
> **Every incident submitted (manually or via RPA) reaches a "Published" status with a clean, structured record — without manual re-entry.**

### KPIs
- Incident creation time: RPA creates record < 30 seconds after file detection
- Deduplication: 0 duplicate records created within 14-day window
- API response time: All endpoints respond < 500ms
- UI usability: All workflows reachable in ≤ 3 clicks from dashboard

---

## 4. User Personas

### Persona 1: Sarah — Customer Support Agent (Editor)
- **Role:** Creates and edits incident reports
- **Technical level:** Low-to-medium
- **Goals:** Submit incident reports quickly, check status of open incidents
- **Frustrations:** Currently re-enters the same data in multiple places; unsure if her report was received
- **Jobs-to-be-done:**
  - Upload raw incident files (PDF/DOCX/text) from her inbox
  - Fill in basic details and save as Draft
  - See the current status of incidents she created

### Persona 2: Ahmad — Team Supervisor (Reviewer)
- **Role:** Reviews drafts, updates status, generates reports for management
- **Technical level:** Medium
- **Goals:** Quickly see all pending drafts, approve/reject, filter by date/tag
- **Frustrations:** Currently reads spreadsheets manually; no version history
- **Jobs-to-be-done:**
  - View all Draft incidents in a filterable list
  - Transition status to Reviewed or Published
  - View version history of an incident

### Persona 3: Admin — System Administrator
- **Role:** Manages user accounts, views system logs, receives RPA summary emails
- **Technical level:** High
- **Goals:** Monitor system health, manage RPA bot access, view error logs
- **Jobs-to-be-done:**
  - Manage user accounts (create/disable)
  - View RPA execution logs and error screenshots
  - Receive automated summary emails after each RPA run

### Persona 4: RPA Bot — UiPath Automated Agent
- **Role:** Automated ingestion and status update agent
- **Technical level:** N/A (programmatic)
- **Goals:** Read new files from Google Drive, deduplicate, POST to API, PATCH status, send email
- **Jobs-to-be-done:**
  - Poll Google Drive for new files
  - Check deduplication against last 14 days
  - Create incident via REST API
  - Attach screenshots on failure
  - Send summary email to admin

---

## 5. User Stories & Use Cases

### Epic 1: Authentication

| ID | User Story |
|---|---|
| US-01 | As a support agent, I want to log in with username and password so that only authorized users access the system |
| US-02 | As a user, I want to be redirected to login if my session expires so that unauthorized access is prevented |
| US-03 | As an admin, I want to have a distinct role with access to user management and logs |

### Epic 2: Incident Upload & Creation

| ID | User Story |
|---|---|
| US-04 | As a support agent, I want to upload text, PDF, or DOCX files so that I can submit raw incident information |
| US-05 | As a support agent, I want to save an incident as Draft so that I can review it before submitting |
| US-06 | As an editor, I want the system to extract key text from uploaded files so that I don't have to re-type content |
| US-07 | As a user, I want to attach multiple files to one incident so that all evidence is in one place |

### Epic 3: Incident Viewer & Search

| ID | User Story |
|---|---|
| US-08 | As a supervisor, I want to see a list of all incidents filterable by status, tag, date, and creator so that I can manage workload |
| US-09 | As any user, I want to search incidents by keyword so that I can find specific reports quickly |
| US-10 | As a supervisor, I want to see the version history of an incident (Draft → Reviewed → Published) so that I have an audit trail |

### Epic 4: Status Workflow

| ID | User Story |
|---|---|
| US-11 | As a reviewer, I want to transition an incident from Draft to Reviewed so that it moves through the pipeline |
| US-12 | As a reviewer, I want to publish a Reviewed incident so that it becomes the official record |
| US-13 | As any user, I want to see status badges clearly on the incident list so that I know what needs action |

### Epic 5: RPA Automation

| ID | User Story |
|---|---|
| US-14 | As the RPA bot, I want to read new files from Google Drive so that I can ingest incidents automatically |
| US-15 | As the RPA bot, I want to skip files already processed within 14 days so that duplicates are not created |
| US-16 | As the RPA bot, I want to create a new incident via the web API so that manual entry is eliminated |
| US-17 | As the RPA bot, I want to update the status of an incident via API so that the workflow progresses automatically |
| US-18 | As the RPA bot, I want to take a screenshot and log errors on failure so that admins can diagnose issues |
| US-19 | As an admin, I want to receive a summary email after each RPA run so that I know what was processed |

### Epic 6: AI Enhancement (Phase 2 — Claude)

| ID | User Story |
|---|---|
| US-20 | As an editor, I want the system to auto-generate a title, summary, and tags from raw content so that I save time |
| US-21 | As an editor, I want to see AI-proposed steps and be able to edit them before saving so that I stay in control |
| US-22 | As a reviewer, I want to be alerted if a new draft conflicts with existing published incidents so that contradictions are avoided |
| US-23 | As an editor, I want to upload an image and have AI extract the incident details from it so that I don't type from screenshots |

---

## 6. Functional Requirements

### 6.1 Authentication Module

| Req ID | Requirement | Priority |
|---|---|---|
| FR-01 | System must provide a login page with username and password fields | Must |
| FR-02 | Passwords must be stored as bcrypt hashes | Must |
| FR-03 | Session must be managed via JWT token stored in HTTP-only cookie | Must |
| FR-04 | Login must fail with generic error message on wrong credentials | Must |
| FR-05 | System must support two roles: `admin` and `editor` | Must |
| FR-06 | Protected routes must redirect to `/login` if no valid session | Must |

### 6.2 Upload Console

| Req ID | Requirement | Priority |
|---|---|---|
| FR-07 | Upload page must accept `.txt`, `.pdf`, `.docx` file types minimum | Must |
| FR-08 | User can upload one or more files per incident submission | Must |
| FR-09 | Uploaded file text must be extracted server-side and pre-filled into the description field | Must |
| FR-10 | User can manually edit the pre-filled description before saving | Must |
| FR-11 | Incident is saved as `Draft` status by default on first save | Must |
| FR-12 | Form must include: Title, Description, Tags (comma-separated), Priority (Low/Medium/High/Critical), Category (dropdown) | Must |
| FR-13 | Form must validate all required fields before submission | Must |
| FR-14 | Images (PNG/JPG) can be attached as evidence files | Should |

### 6.3 Incident Viewer Page

| Req ID | Requirement | Priority |
|---|---|---|
| FR-15 | Viewer must display all incidents in a paginated list (20 per page) | Must |
| FR-16 | List must show: ID, Title, Status badge, Priority, Category, Creator, Created date | Must |
| FR-17 | User can filter by: Status, Tag, Date range, Creator | Must |
| FR-18 | User can search by keyword (searches title + description) | Must |
| FR-19 | Each row must link to the incident detail page | Must |

### 6.4 Incident Detail & Status Workflow

| Req ID | Requirement | Priority |
|---|---|---|
| FR-20 | Detail page shows all incident fields + attached files + version history | Must |
| FR-21 | Status transitions allowed: `Draft → Reviewed`, `Reviewed → Published` | Must |
| FR-22 | Backwards transitions (`Published → Reviewed`) must be blocked | Must |
| FR-23 | Each status change must be logged with timestamp and user who made the change | Must |
| FR-24 | Version history must show all previous versions of the description field | Must |
| FR-25 | Editors can edit incident fields only when status is `Draft` | Must |

### 6.5 RPA Integration API

| Req ID | Requirement | Priority |
|---|---|---|
| FR-26 | API must accept RPA bot login via `/api/auth/login` | Must |
| FR-27 | API must allow incident creation via `POST /api/incidents` with file attachment | Must |
| FR-28 | API must allow status update via `PATCH /api/incidents/{id}/status` | Must |
| FR-29 | API must provide a duplicate check endpoint `POST /api/incidents/check-duplicate` | Must |
| FR-30 | API responses must follow consistent JSON structure with `success`, `data`, `message` | Must |

### 6.6 Reporting

| Req ID | Requirement | Priority |
|---|---|---|
| FR-31 | Dashboard must show total counts: All, Draft, Reviewed, Published incidents | Must |
| FR-32 | Admin can view RPA execution logs from the UI | Should |
| FR-33 | System must generate a summary report (JSON) accessible via `GET /api/reports/summary` | Must |

### 6.7 AI Enhancement (Claude — Phase 2)

| Req ID | Requirement | Priority |
|---|---|---|
| FR-34 | When creating/editing an incident, user can click "AI Assist" to generate Title, Summary, Tags | Should |
| FR-35 | AI-proposed content must be shown separately and editable before saving | Should |
| FR-36 | System can analyze uploaded images (PNG/JPG) via Claude Vision API to extract text | Should |
| FR-37 | System must flag if new draft content conflicts with an existing Published incident on similar topic | Could |

---

## 7. Non-Functional Requirements

### Performance

| NFR | Requirement |
|---|---|
| NFR-01 | All API endpoints must respond within 500ms under normal load |
| NFR-02 | File uploads up to 10MB must be accepted |
| NFR-03 | UI must be usable on desktop Chrome (primary) and Firefox |

### Security

| NFR | Requirement |
|---|---|
| NFR-04 | All API routes except `/api/auth/login` must require a valid JWT |
| NFR-05 | Passwords stored as bcrypt hash (minimum cost factor 10) |
| NFR-06 | File uploads must be stored server-side, not accessible by direct URL without auth |
| NFR-07 | JWT expiry set to 8 hours (one working day) |
| NFR-08 | API must reject requests with invalid or expired JWT with HTTP 401 |

### Scalability

| NFR | Requirement |
|---|---|
| NFR-09 | JSON file storage must support up to 10,000 incidents without performance degradation |
| NFR-10 | System architecture must allow future migration to SQL/MongoDB without UI changes |

### Reliability

| NFR | Requirement |
|---|---|
| NFR-11 | RPA bot must handle API errors with Try/Catch and screenshot capture |
| NFR-12 | System must log all RPA actions to a persistent log file |

### Usability

| NFR | Requirement |
|---|---|
| NFR-13 | Core workflows (upload, view, update status) must be reachable in ≤ 3 clicks from dashboard |
| NFR-14 | Status badges must use distinct colors: Draft (grey), Reviewed (blue), Published (green) |
| NFR-15 | System must work on 1280×720 minimum screen resolution |

---

## 8. Technical Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                       │
│              Next.js (React) — Port 3000                  │
│   Pages: Login │ Dashboard │ Upload │ Viewer │ Detail     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP REST API calls
┌────────────────────────▼─────────────────────────────────┐
│                       API LAYER                           │
│              Python FastAPI — Port 8000                   │
│   Auth │ Incidents │ Files │ AI │ Reports │ Logs          │
└────────────────────────┬─────────────────────────────────┘
                         │ File I/O
┌────────────────────────▼─────────────────────────────────┐
│                      DATA LAYER                           │
│               JSON File Storage                           │
│   incidents.json │ users.json │ logs.json │ hashes.json   │
│   /uploads/ (raw files)                                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                      RPA LAYER                            │
│              UiPath Studio (local execution)              │
│   Google Drive Monitor → Hash Check → API POST/PATCH      │
│   Error Handler → Screenshot → Summary Email              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                      AI LAYER (Phase 2)                   │
│              Claude API (Anthropic)                       │
│   Text summarization │ Tag extraction │ Image analysis    │
└──────────────────────────────────────────────────────────┘
```

### Tech Stack Decisions

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) | React-based, SSR support, easy API routes |
| Backend | Python FastAPI | Fast, async, excellent for file handling and AI integration |
| Auth | JWT (python-jose) | Stateless, RPA-compatible |
| File parsing | PyMuPDF (PDF), python-docx (DOCX) | Best-in-class text extraction |
| Storage | JSON files + uuid-keyed records | Satisfies assignment Option 1 |
| RPA | UiPath Studio (Community Edition) | Assignment requirement |
| AI | Anthropic Claude API (claude-sonnet-4-6) | User preference over GPT |
| Email | SMTP (smtplib) or SendGrid | RPA summary emails |
| Deployment | Local (dev) / Vercel + Railway (optional) | Evaluation on local machine |

### Component Breakdown

**Next.js Frontend:**
- `/app/login` — Authentication page
- `/app/dashboard` — Summary counts + quick links
- `/app/upload` — File upload + manual incident creation
- `/app/incidents` — Searchable/filterable incident list
- `/app/incidents/[id]` — Incident detail + status workflow + version history

**FastAPI Backend:**
- `routers/auth.py` — Login, JWT generation
- `routers/incidents.py` — CRUD + status + version history
- `routers/files.py` — Upload handling, text extraction
- `routers/ai.py` — Claude API integration
- `routers/reports.py` — Summary stats
- `routers/logs.py` — RPA log viewer
- `utils/dedup.py` — SHA-256 hash computation + 14-day check
- `utils/file_parser.py` — PDF/DOCX/TXT text extraction

---

## 9. Data Model & Schema Design

### Entity: Incident

```json
{
  "id": "uuid-v4",
  "title": "string",
  "description": "string",
  "raw_content": "string (original extracted text before editing)",
  "status": "draft | reviewed | published",
  "priority": "low | medium | high | critical",
  "category": "late_delivery | address_issue | damaged_parcel | system_error | complaint | other",
  "tags": ["string"],
  "creator_id": "user_id",
  "creator_name": "string",
  "created_at": "ISO8601 datetime",
  "updated_at": "ISO8601 datetime",
  "source": "manual | rpa | ai_assisted",
  "files": [
    {
      "file_id": "uuid",
      "filename": "string",
      "file_type": "pdf | docx | txt | png | jpg",
      "path": "string (server path)",
      "uploaded_at": "ISO8601 datetime"
    }
  ],
  "content_hash": "sha256 string (for dedup)",
  "version": 1,
  "version_history": [
    {
      "version": 1,
      "description": "string",
      "status": "draft",
      "changed_by": "user_id",
      "changed_at": "ISO8601 datetime"
    }
  ],
  "ai_suggestions": {
    "title": "string | null",
    "summary": "string | null",
    "tags": ["string"],
    "steps": ["string"],
    "used": false
  }
}
```

### Entity: User

```json
{
  "id": "uuid-v4",
  "username": "string",
  "email": "string",
  "password_hash": "bcrypt string",
  "role": "admin | editor | reviewer",
  "created_at": "ISO8601 datetime",
  "is_active": true
}
```

### Entity: DuplicateRegistry (hashes.json)

```json
{
  "hash_records": [
    {
      "hash": "sha256 string",
      "incident_id": "uuid",
      "created_at": "ISO8601 datetime"
    }
  ]
}
```

### Entity: RPA Log Entry (logs.json)

```json
{
  "log_id": "uuid",
  "run_id": "uuid (per RPA execution)",
  "timestamp": "ISO8601 datetime",
  "action": "ingest | create | update | duplicate_skip | error",
  "file_name": "string",
  "incident_id": "string | null",
  "status": "success | failed | skipped",
  "message": "string",
  "screenshot_path": "string | null"
}
```

### Relationships

```
User ──── creates ────> Incident (1:N)
Incident ──── has ────> Files (1:N)
Incident ──── has ────> VersionHistory (1:N)
Incident ──── has ────> AISuggestions (1:1)
DuplicateRegistry ──── tracks ────> Incident (1:1)
RPALog ──── references ────> Incident (N:1)
```

### Data Files Structure

```
data/
├── incidents.json        # Array of incident objects
├── users.json            # Array of user objects
├── hashes.json           # Deduplication hash registry
├── logs.json             # RPA execution logs
uploads/
├── {incident_id}/        # Files grouped by incident
│   ├── {file_id}.pdf
│   └── {file_id}.png
rpa_screenshots/
└── {run_id}/             # Error screenshots per RPA run
```

---

## 10. API Specifications

**Base URL:** `http://localhost:8000/api`
**Auth:** Bearer JWT in `Authorization` header
**Content-Type:** `application/json` (unless file upload: `multipart/form-data`)

### Standard Response Envelope

```json
{
  "success": true,
  "data": {},
  "message": "string",
  "error": null
}
```

### Authentication

#### POST /api/auth/login
```
Request:
{
  "username": "string",
  "password": "string"
}

Response 200:
{
  "success": true,
  "data": {
    "token": "jwt_string",
    "user": { "id": "...", "username": "...", "role": "..." }
  }
}

Response 401:
{ "success": false, "error": "Invalid credentials" }
```

### Incidents

#### GET /api/incidents
```
Query params:
  status=draft|reviewed|published
  tag=string
  creator=user_id
  date_from=YYYY-MM-DD
  date_to=YYYY-MM-DD
  search=string
  page=int (default: 1)
  limit=int (default: 20)

Response 200:
{
  "success": true,
  "data": {
    "incidents": [...],
    "total": 145,
    "page": 1,
    "limit": 20
  }
}
```

#### POST /api/incidents
```
Request (multipart/form-data):
  title: string
  description: string
  priority: low|medium|high|critical
  category: late_delivery|address_issue|...
  tags: string (comma-separated)
  source: manual|rpa
  files[]: file (optional)

Response 201:
{
  "success": true,
  "data": { "incident": { ...full incident object... } }
}
```

#### GET /api/incidents/{id}
```
Response 200: { "success": true, "data": { "incident": {...} } }
Response 404: { "success": false, "error": "Incident not found" }
```

#### PUT /api/incidents/{id}
```
Request:
{
  "title": "string",
  "description": "string",
  "priority": "...",
  "category": "...",
  "tags": [...]
}
Note: Only allowed when status is "draft"

Response 200: { "success": true, "data": { "incident": {...} } }
Response 403: { "success": false, "error": "Cannot edit non-draft incident" }
```

#### DELETE /api/incidents/{id}
```
Note: Only admin role can delete. Only draft incidents can be deleted.
Response 200: { "success": true, "message": "Incident deleted" }
Response 403: { "success": false, "error": "Insufficient permissions" }
```

#### PATCH /api/incidents/{id}/status
```
Request:
{
  "status": "reviewed | published"
}

Response 200: { "success": true, "data": { "incident": {...} } }
Response 400: { "success": false, "error": "Invalid status transition" }
```

#### POST /api/incidents/check-duplicate
```
Request:
{
  "content_hash": "sha256_string"
}

Response 200:
{
  "success": true,
  "data": {
    "is_duplicate": false,
    "existing_incident_id": null
  }
}
```

### File Extraction

#### POST /api/files/extract
```
Request (multipart/form-data):
  file: File

Response 200:
{
  "success": true,
  "data": {
    "extracted_text": "string",
    "file_type": "pdf|docx|txt"
  }
}
```

### AI (Phase 2)

#### POST /api/ai/summarize
```
Request:
{
  "content": "raw text content",
  "existing_incidents": [] (optional, for conflict detection)
}

Response 200:
{
  "success": true,
  "data": {
    "title": "Suggested Title",
    "summary": "2-3 sentence summary",
    "tags": ["tag1", "tag2"],
    "priority_suggestion": "high",
    "category_suggestion": "late_delivery",
    "conflict_warning": null | "Conflicts with incident #IRR-045"
  }
}
```

#### POST /api/ai/extract-image
```
Request (multipart/form-data):
  image: File (PNG/JPG)

Response 200:
{
  "success": true,
  "data": {
    "extracted_text": "Text extracted from image via Claude Vision"
  }
}
```

### Reports

#### GET /api/reports/summary
```
Response 200:
{
  "success": true,
  "data": {
    "total_incidents": 145,
    "by_status": { "draft": 23, "reviewed": 45, "published": 77 },
    "by_priority": { "critical": 5, "high": 32, ... },
    "by_category": { "late_delivery": 60, ... },
    "rpa_runs": 12,
    "last_rpa_run": "ISO8601"
  }
}
```

#### GET /api/logs
```
Query params: run_id, status, page, limit
Response 200: { "success": true, "data": { "logs": [...], "total": 50 } }
```

---

## 11. UI/UX Flow & Wireframe Descriptions

### Page 1: Login (`/login`)
- Centered card layout on DHL red background
- DHL logo at top
- Fields: Username, Password
- "Login" button (primary, DHL red)
- Error message area below button (red text)
- No registration link (admin creates accounts)

### Page 2: Dashboard (`/dashboard`)
- Top navigation: Logo | Incidents | Upload | Logs (admin) | Logout
- 4 stat cards: Total | Draft | Reviewed | Published (with count + trend icon)
- Recent Incidents table (last 10): ID, Title, Status badge, Priority, Date
- Quick Actions: "New Incident" button, "View All" link

### Page 3: Upload Console (`/upload`)
- Two-panel layout:
  - Left: File dropzone (drag & drop or click to browse)
    - Accepted types badge: TXT, PDF, DOCX, PNG, JPG
    - Preview of uploaded file names
    - "Extract Text" button → pre-fills description
  - Right: Incident form
    - Title (text input, required)
    - Description (textarea, 8 rows, pre-filled from extraction)
    - Priority (dropdown: Low/Medium/High/Critical)
    - Category (dropdown: Late Delivery/Address Issue/Damaged Parcel/System Error/Complaint/Other)
    - Tags (tag-input component, comma-separated)
    - "AI Assist" button (Phase 2 — calls `/api/ai/summarize`)
    - AI Suggestions panel (appears after AI Assist): Title suggestion, Tags suggestion, Summary (all editable)
    - Save as Draft button | Cancel button

### Page 4: Incident Viewer (`/incidents`)
- Filter bar (horizontal): Status dropdown | Tags multi-select | Date range picker | Creator | Search input
- "Clear filters" link
- Incident table with columns: # | Title | Status (badge) | Priority (colored) | Category | Creator | Created | Actions
- Status badges: Draft=grey pill | Reviewed=blue pill | Published=green pill
- Priority colors: Critical=red | High=orange | Medium=yellow | Low=grey
- Pagination controls (bottom)
- "New Incident" button (top right)

### Page 5: Incident Detail (`/incidents/[id]`)
- Breadcrumb: Dashboard > Incidents > #ID
- Header: Title (large) + Status badge + Priority badge
- Action bar (right side):
  - If Draft + editor: "Edit" button + "Mark as Reviewed" button
  - If Reviewed + reviewer: "Publish" button
  - If Published: Status locked indicator
- Main content tabs:
  - **Details** tab: All fields (description, category, tags, source, creator, dates)
  - **Files** tab: List of attached files with download links + preview for images
  - **History** tab: Timeline of status changes and description edits
- If AI suggestions exist (unused): "AI Suggestions" panel (collapsible)

### Navigation Flow

```
Login
  └── Dashboard
        ├── Upload Console → Incident Detail
        ├── Incident Viewer → Incident Detail
        │                         └── Status Update (inline)
        └── Logs Page (admin only)
```

---

## 12. Acceptance Criteria per Feature

### Feature: Login

| Scenario | Given | When | Then |
|---|---|---|---|
| Happy path | Valid credentials | User submits login form | Redirect to `/dashboard`, JWT set |
| Wrong password | Invalid password | User submits | Error message shown, no redirect |
| Expired session | JWT expired | User accesses protected route | Redirect to `/login` |

### Feature: Upload Console

| Scenario | Given | When | Then |
|---|---|---|---|
| PDF upload + extract | PDF file selected | User clicks "Extract Text" | Description pre-filled with extracted text |
| DOCX upload | DOCX file selected | Extract clicked | Description pre-filled |
| Required fields missing | Empty title | User clicks "Save as Draft" | Validation error shown on title field |
| Successful save | All fields filled | Save clicked | Incident created as Draft, redirect to detail page |

### Feature: Incident Viewer

| Scenario | Given | When | Then |
|---|---|---|---|
| Filter by status | Incidents exist | User selects "Draft" filter | Only Draft incidents shown |
| Search | Incidents exist | User types "damaged" | Only incidents with "damaged" in title or description |
| No results | No matching incidents | Filter applied | "No incidents found" message |

### Feature: Status Workflow

| Scenario | Given | When | Then |
|---|---|---|---|
| Draft → Reviewed | Draft incident | Reviewer clicks "Mark Reviewed" | Status changes, history entry logged |
| Reviewed → Published | Reviewed incident | Admin/reviewer clicks "Publish" | Status changes, locked for editing |
| Invalid transition | Published incident | Any user tries to revert | 400 error, UI blocks action |

### Feature: RPA Deduplication

| Scenario | Given | When | Then |
|---|---|---|---|
| New file | No hash match in last 14 days | RPA processes file | Incident created, hash stored |
| Duplicate file | Same hash exists within 14 days | RPA checks | Skip file, log "duplicate_skip" |
| Old duplicate | Same hash older than 14 days | RPA checks | Treat as new, process normally |

### Definition of Done (DoD)

- [ ] Feature works in Chrome (latest)
- [ ] All API endpoints return correct HTTP status codes
- [ ] JWT auth is required on all protected endpoints
- [ ] Input validation present on all forms
- [ ] Error states are handled and shown to user

---

## 13. Out of Scope

| Feature | Reason Deferred |
|---|---|
| Real-time notifications (WebSocket) | Complexity vs. time constraint |
| Mobile responsive design | Desktop-first for evaluation |
| Multi-language support | Not required by assignment |
| Direct WhatsApp/Telegram ingestion | RPA reads from Drive only (per assignment) |
| Full-text search with indexing (Elasticsearch) | JSON file search sufficient for MVP |
| User self-registration | Admin-only user creation |
| Incident deletion (non-admin) | Security concern |
| SLA tracking and escalation | Beyond MVP scope |
| Public-facing customer submission form | Internal tool only |

---

## 14. Dependencies & Risks

### Technical Dependencies

| Dependency | Type | Risk Level |
|---|---|---|
| Google Drive API access for RPA | External | Medium — need Drive folder set up |
| UiPath Community Edition | Tool | Low — free, well documented |
| Anthropic Claude API key | External | Low — key available |
| Python FastAPI | Library | Low — stable, well documented |
| Next.js 14 | Framework | Low — stable |
| SMTP server for email | External | Medium — may need Gmail SMTP config |

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| RPA cannot authenticate to web API | Medium | High | Test API auth separately before building full RPA flow |
| PDF text extraction fails on scanned PDFs | Medium | Medium | Fall back to image-based extraction via Claude Vision |
| Claude API rate limits during demo | Low | High | Implement response caching; have offline mode |
| JSON file concurrency issues under RPA load | Low | Medium | Implement file locking with `filelock` library |
| SMTP email blocked by Gmail security | Medium | Low | Use App Password or SendGrid free tier |
| Deadline miss due to UiPath complexity | High | High | Build RPA last; web app first; RPA can be partially manual if needed |

### Assumptions

1. UiPath bot will run on the same machine as the backend server
2. Google Drive folder for incident files will be pre-populated with test files
3. The evaluator will run the system locally (not on a hosted URL)
4. Test users will be seeded in `users.json` before demo

---

## 15. Timeline & Milestones

**Total time available:** 11 days (May 4 – May 15, 2026)

### Phase 1: Core Web App (Days 1–5, May 4–8)

| Day | Task |
|---|---|
| Day 1 (May 4) | Project setup: Next.js + FastAPI scaffolding, folder structure, JWT auth backend |
| Day 2 (May 5) | Auth frontend (login page), dashboard skeleton, users.json seed data |
| Day 3 (May 6) | Upload console: file upload endpoint, text extraction (PDF/DOCX/TXT), incident POST API |
| Day 4 (May 7) | Incident viewer: GET API with filters, frontend filter/search UI, pagination |
| Day 5 (May 8) | Incident detail page: status workflow, version history, file attachment display |

**Milestone 1 (May 8):** Web app fully functional — all CRUD, auth, upload, viewer, status workflow working.

### Phase 2: RPA Integration (Days 6–8, May 9–11)

| Day | Task |
|---|---|
| Day 6 (May 9) | UiPath: Google Drive monitor activity, file download, text read |
| Day 7 (May 10) | UiPath: hash dedup check (call API), POST incident to web API, attach file |
| Day 8 (May 11) | UiPath: PATCH status update, Try/Catch error handler, screenshot on failure, summary email |

**Milestone 2 (May 11):** RPA workflow runs end-to-end — ingest → dedup → create → update → email.

### Phase 3: AI Enhancement (Days 9–10, May 12–13)

| Day | Task |
|---|---|
| Day 9 (May 12) | Claude API integration: `/api/ai/summarize` endpoint, frontend "AI Assist" button |
| Day 10 (May 13) | Claude Vision: image text extraction, conflict detection (optional) |

**Milestone 3 (May 13):** AI features working — auto-suggest title/tags/summary from raw content.

### Phase 4: Polish & Deliverables (Days 10–11, May 13–15)

| Day | Task |
|---|---|
| Day 13 (May 13) | UI polish, error handling, seed test data, test all flows end-to-end |
| Day 14 (May 14) | Record demo video (10–12 min), write report (8–12 pages) |
| Day 15 (May 15) | Final submission before 5pm — zip source code + report + video |

**Milestone 4 (May 15, 5pm):** All deliverables submitted.

### Go/No-Go Criteria per Phase

| Milestone | Go Criteria |
|---|---|
| M1 (Web App) | Login works, CRUD works, filter/search works, status workflow works |
| M2 (RPA) | Bot runs without manual intervention, creates incident via API, sends email |
| M3 (AI) | "AI Assist" button produces non-empty suggestions from real Claude API |
| M4 (Submit) | Source code compiles, report covers all sections, video ≥ 10 minutes |

---

## 16. Appendices

### A. Glossary

| Term | Definition |
|---|---|
| IRRS | Incident Reporting & Resolution System (this project) |
| RPA | Robotic Process Automation — using UiPath to automate repetitive tasks |
| Draft | Initial status of a newly created incident |
| Reviewed | Incident checked by a supervisor |
| Published | Final official status — incident is resolved/acknowledged |
| Dedup | Deduplication — preventing the same incident from being created twice |
| SHA-256 | Cryptographic hash used to fingerprint file content for dedup |
| JWT | JSON Web Token — stateless authentication mechanism |
| LLM | Large Language Model — Claude API for AI-powered text analysis |
| CRUD | Create, Read, Update, Delete — standard API operations |

### B. Tech Stack Reference Links

- Next.js 14 App Router: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- python-jose (JWT): https://python-jose.readthedocs.io
- PyMuPDF (PDF extraction): https://pymupdf.readthedocs.io
- python-docx: https://python-docx.readthedocs.io
- Anthropic Claude API: https://docs.anthropic.com
- UiPath Studio: https://docs.uipath.com/studio

### C. Change Log

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-05-04 | plaah | Initial draft |

---

*End of PRD v1.0*
