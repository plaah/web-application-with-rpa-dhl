# Implementation Roadmap — DHL IRRS
**Deadline:** 15 May 2026 | **Start:** 4 May 2026 | **Days available:** 11

---

## Phase 1: Web Application (Days 1–5)

### Day 1 — Project Scaffolding + Auth Backend
- [ ] `npx create-next-app@latest irrs-frontend` (TypeScript, App Router, Tailwind)
- [ ] `mkdir irrs-backend && cd irrs-backend && pip install fastapi uvicorn python-jose passlib[bcrypt] python-multipart`
- [ ] Create folder structure: `data/`, `uploads/`, `routers/`, `utils/`
- [ ] Seed `data/users.json` with admin + editor test users
- [ ] Implement `POST /api/auth/login` → returns JWT
- [ ] Implement JWT middleware (dependency injection in FastAPI)
- [ ] Test auth with Postman/curl

### Day 2 — Auth Frontend + Dashboard
- [ ] Build `/login` page (form + validation + API call)
- [ ] Implement JWT storage (httpOnly cookie via Next.js middleware)
- [ ] Build `/dashboard` page (stat cards + recent incidents table skeleton)
- [ ] Connect dashboard to `GET /api/reports/summary`
- [ ] Add top navigation component

### Day 3 — Upload Console
- [ ] Build `POST /api/incidents` endpoint (with file upload, multipart)
- [ ] Build `POST /api/files/extract` (PDF/DOCX/TXT text extraction)
- [ ] Install: `pip install pymupdf python-docx`
- [ ] Build `/upload` page frontend (dropzone + form + extract button)
- [ ] Wire "Extract Text" → pre-fill description
- [ ] Wire "Save as Draft" → POST to API → redirect to detail

### Day 4 — Incident Viewer
- [ ] Build `GET /api/incidents` (with query params: status, tag, date, search, page)
- [ ] Implement JSON file search (in-memory load + filter)
- [ ] Build `/incidents` page (table + filter bar + search input)
- [ ] Implement pagination component
- [ ] Add status badge + priority color coding

### Day 5 — Incident Detail + Status Workflow
- [ ] Build `GET /api/incidents/{id}`, `PUT /api/incidents/{id}`, `PATCH /api/incidents/{id}/status`
- [ ] Build `/incidents/[id]` page (tabbed: Details | Files | History)
- [ ] Implement status transition buttons with validation
- [ ] Implement version history recording on save/status-change
- [ ] Add file download links

**Milestone 1 checkpoint:** Login → Dashboard → Upload → View → Detail → Status change — all working.

---

## Phase 2: RPA (Days 6–8)

### Day 6 — UiPath: Drive Monitor + File Ingest
- [ ] Create new UiPath project: `DHL_IRRS_Bot`
- [ ] Install UiPath packages: `GSuite` or `Google.Drive.Activities`
- [ ] Activity: List files in designated Google Drive folder
- [ ] Activity: Download new files to local temp folder
- [ ] Activity: Read file content (text/PDF)
- [ ] Activity: Compute SHA-256 hash of content (using Invoke Code or custom activity)

### Day 7 — UiPath: Dedup + API Create
- [ ] Activity: `POST /api/auth/login` → store token in variable
- [ ] Activity: `POST /api/incidents/check-duplicate` → if duplicate, log + skip
- [ ] Activity: `POST /api/incidents` (multipart, attach file) → store incident_id
- [ ] Activity: Store hash in dedup registry (call API or write to local JSON)
- [ ] Loop through all new files in Drive folder

### Day 8 — UiPath: Status Update + Error Handling + Email
- [ ] Activity: `PATCH /api/incidents/{id}/status` (set to "reviewed")
- [ ] Wrap all activities in Try/Catch
- [ ] On Catch: Take Screenshot → save to `rpa_screenshots/` folder
- [ ] Activity: Write log entry to local file + `POST /api/logs`
- [ ] At end of run: Compose summary email (created X, updated X, duplicates X, failed X)
- [ ] Activity: Send email via SMTP with logs attached
- [ ] Test full run with 3–5 sample files

**Milestone 2 checkpoint:** Bot runs, processes Drive files, creates incidents in web app, sends email.

---

## Phase 3: AI Enhancement (Days 9–10)

### Day 9 — Claude API: Text Summarization
- [ ] `pip install anthropic`
- [ ] Build `POST /api/ai/summarize` endpoint
- [ ] Claude prompt: extract title, summary, tags, priority suggestion from raw text
- [ ] Build "AI Assist" button in Upload Console frontend
- [ ] Display AI suggestions panel (editable before saving)
- [ ] Handle API errors gracefully (fallback: show empty suggestions)

### Day 10 — Claude Vision: Image Extraction (Optional)
- [ ] Build `POST /api/ai/extract-image` endpoint
- [ ] Claude Vision prompt: extract text from damaged parcel screenshot
- [ ] Wire to Upload Console: if PNG/JPG uploaded, offer "Extract with AI" option
- [ ] (Optional) Conflict detection: compare new draft against existing published incidents

**Milestone 3 checkpoint:** "AI Assist" generates real suggestions from Claude API.

---

## Phase 4: Polish + Deliverables (Days 11–15)

### Day 11 (May 14) — Polish + Testing
- [ ] End-to-end test: manual upload → view → status workflow
- [ ] End-to-end test: RPA run → check web app for new incidents
- [ ] End-to-end test: AI assist on sample damaged parcel text
- [ ] Fix any UI bugs (spacing, badge colors, form validation messages)
- [ ] Seed 10–15 test incidents for demo
- [ ] Write README.md with setup instructions

### Day 12 (May 14) — Demo Video
- [ ] Record 10–12 min video covering:
  1. Login (1 min)
  2. Dashboard overview (30 sec)
  3. Manual upload with file extraction (2 min)
  4. AI Assist demonstration (1 min)
  5. Incident viewer + filter/search (1 min)
  6. Status workflow (Draft → Reviewed → Published) (1 min)
  7. RPA bot run demonstration (2 min)
  8. Summary email shown (30 sec)
  9. API CRUD demo via Postman (1 min)
  10. Wrap up (30 sec)

### Day 13 (May 15) — Report + Submission
- [ ] Write 8–12 page report covering required sections
- [ ] Zip: source code + database/JSON files + UiPath project + GitHub link
- [ ] Submit before 5pm

---

## Risk Buffer

If behind schedule:
1. Skip Phase 3 (AI) — it's optional
2. Simplify RPA to manual trigger (no Drive monitoring) — focus on API calls
3. Use JSON hardcoded seed data instead of file extraction if extraction bugs persist

---

## File Structure (Final Project)

```
assignment-web-application-with-rpa-dhl-dac-3-0-plaah/
├── irrs-frontend/          # Next.js app
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── upload/
│   │   ├── incidents/
│   │   │   └── [id]/
│   │   └── api/            # Next.js API routes (optional proxy)
│   └── components/
├── irrs-backend/           # Python FastAPI
│   ├── main.py
│   ├── routers/
│   ├── utils/
│   ├── data/               # JSON storage
│   └── uploads/            # Raw files
├── irrs-rpa/               # UiPath project
│   ├── Main.xaml
│   ├── project.json
│   └── ...
├── prd/                    # This folder
└── README.md
```
