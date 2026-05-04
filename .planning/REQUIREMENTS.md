# Requirements: DHL IRRS

**Defined:** 2026-05-04
**Core Value:** Every incident reaches Published status with a clean structured record — without manual re-entry.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can log in with username and password
- [ ] **AUTH-02**: Session persists via JWT cookie across browser refresh
- [ ] **AUTH-03**: Protected routes redirect to /login when not authenticated
- [ ] **AUTH-04**: System supports two roles: admin and editor

### Incidents

- [ ] **INC-01**: User can create incident with title, description, priority, category, tags
- [ ] **INC-02**: User can upload text, PDF, or DOCX file and extract its text into description
- [ ] **INC-03**: Incident is saved as Draft status by default
- [ ] **INC-04**: User can update incident fields when status is Draft
- [ ] **INC-05**: User can transition status Draft → Reviewed → Published
- [ ] **INC-06**: Published incidents are locked (no further edits)
- [ ] **INC-07**: Each status change is logged in version history with timestamp and user
- [ ] **INC-08**: Admin can delete Draft incidents

### Viewer

- [ ] **VIEW-01**: User can view paginated list of all incidents (20 per page)
- [ ] **VIEW-02**: User can filter incidents by status, tag, date range, creator
- [ ] **VIEW-03**: User can search incidents by keyword (title + description)
- [ ] **VIEW-04**: Incident detail page shows all fields, files, version history in tabs

### Dashboard

- [ ] **DASH-01**: Dashboard shows total incident counts by status (Draft/Reviewed/Published)
- [ ] **DASH-02**: Dashboard shows 10 most recent incidents

### RPA

- [ ] **RPA-01**: UiPath bot reads new files from Google Drive folder
- [ ] **RPA-02**: Bot skips files with same SHA-256 hash seen within last 14 days
- [ ] **RPA-03**: Bot creates incident via POST /api/incidents with file attached
- [ ] **RPA-04**: Bot updates incident status to Reviewed via PATCH /api/incidents/{id}/status
- [ ] **RPA-05**: Bot logs each action (success/skip/fail) to /api/logs
- [ ] **RPA-06**: Bot takes screenshot and logs error path on failure (Try/Catch)
- [ ] **RPA-07**: Bot sends summary email after each run (created/updated/duplicates/failed counts)

### API

- [ ] **API-01**: All API endpoints require valid JWT (except /api/auth/login)
- [ ] **API-02**: POST /api/files/extract accepts file upload and returns extracted text
- [ ] **API-03**: POST /api/incidents/check-duplicate returns is_duplicate + existing_incident_id
- [ ] **API-04**: GET /api/reports/summary returns totals by status, priority, category
- [ ] **API-05**: All responses follow {success, data, message} envelope

### AI (Claude — Phase 2)

- [ ] **AI-01**: User can click "AI Assist" to get title, summary, tags, priority suggestion from description
- [ ] **AI-02**: AI suggestions shown in editable panel before saving
- [ ] **AI-03**: User can upload PNG/JPG and extract text via Claude Vision

## v2 Requirements

### Enhanced Features

- **V2-01**: Real-time notifications when incident status changes
- **V2-02**: Conflict detection — flag new draft that contradicts existing Published incident
- **V2-03**: Direct Telegram/email ingestion (bypass Google Drive)
- **V2-04**: Analytics dashboard with charts (incidents over time, category breakdown)
- **V2-05**: Mobile responsive design

## Out of Scope

| Feature | Reason |
|---------|--------|
| User self-registration | Admin creates accounts only — security |
| Real-time WebSocket | Complexity vs 11-day timeline |
| Direct WhatsApp ingestion | RPA reads Drive only per assignment spec |
| Elasticsearch full-text | JSON in-memory filter sufficient for demo |
| Cloud deployment | Evaluator runs locally |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 to AUTH-04 | Phase 1 | Pending |
| INC-01 to INC-08 | Phase 1 | Pending |
| VIEW-01 to VIEW-04 | Phase 1 | Pending |
| DASH-01 to DASH-02 | Phase 1 | Pending |
| API-01 to API-05 | Phase 1 | Pending |
| RPA-01 to RPA-07 | Phase 2 | Pending |
| AI-01 to AI-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-04 after initialization*
