# Roadmap: DHL IRRS

**Milestone:** v1.0 — Submission Ready
**Deadline:** 15 May 2026
**Phases:** 4 | **Requirements:** 32 | All v1 requirements covered ✓

---

## Phase Overview

| # | Phase | Goal | Requirements | Days | Status |
|---|-------|------|--------------|------|--------|
| 1 | Web Application | Full CRUD web app with auth, upload, viewer, status workflow | AUTH, INC, VIEW, DASH, API | Days 1–5 (May 4–8) | ○ Pending |
| 2 | RPA Automation | UiPath bot ingests Drive files, deduplicates, creates/updates incidents via API, sends email | RPA-01–07 | Days 6–8 (May 9–11) | ○ Pending |
| 3 | AI Enhancement | Claude API integration for text summarization, tag extraction, image OCR | AI-01–03 | Days 9–10 (May 12–13) | ○ Pending |
| 4 | Polish & Submit | Seed data, README, demo video, report, submission | All | Days 11–15 (May 13–15) | ○ Pending |

---

## Phase 1: Web Application

**Goal:** A fully functional incident management web app where a logged-in user can upload files, create incidents, view/filter/search them, and transition status from Draft → Reviewed → Published.

**Requirements:** AUTH-01–04, INC-01–08, VIEW-01–04, DASH-01–02, API-01–05

**Success Criteria:**
1. Login with admin/admin123 → redirects to dashboard showing incident counts
2. Upload a PDF → text extracted → incident saved as Draft → visible in incident list
3. Filter incidents by "Draft" status → only Draft incidents shown
4. Open incident → click "Mark as Reviewed" → status badge changes → history tab shows entry
5. Click "Publish" → status locked, no edit button shown
6. All 7 API endpoints respond correctly with {success, data} envelope (verifiable via /docs)

**Plans:** 2 plans
- [ ] `01-01-PLAN.md` — Backend: scaffolding, JWT auth, incidents CRUD, file extraction, reports/logs (Wave 1)
- [ ] `01-02-PLAN.md` — Frontend: login, dashboard, upload console, incident viewer, incident detail (Wave 2)

---

## Phase 2: RPA Automation

**Goal:** UiPath bot runs end-to-end without manual intervention — reads Google Drive, deduplicates, creates incidents via API, updates status, handles errors with screenshots, sends summary email.

**Requirements:** RPA-01–07

**Success Criteria:**
1. Place 3 .txt files in designated Google Drive folder → bot processes them → 3 new incidents appear in web app with status "reviewed"
2. Place same file again → bot skips it (duplicate log entry visible in /api/logs)
3. Trigger error (invalid file) → screenshot saved to rpa_screenshots/ → error logged
4. Admin receives summary email: "Created: 3, Duplicates: 1, Failed: 0"
5. All RPA actions visible in Logs page of web app

**Plans:**
- `02-01-PLAN.md` — UiPath: Drive monitor, hash dedup, API auth + create + status update, error handling, email

---

## Phase 3: AI Enhancement

**Goal:** Claude API integration — "AI Assist" button generates structured incident fields from raw text; image upload extracts text via Claude Vision.

**Requirements:** AI-01–03

**Success Criteria:**
1. Paste messy incident text → click "AI Assist" → title, tags, priority suggestion appear in editable panel
2. Click "Apply Suggestions" → form fields populate with AI values
3. Upload PNG screenshot of damaged parcel → "Extract with AI" → description pre-filled with extracted text

**Plans:**
- `03-01-PLAN.md` — Backend: Claude API /ai/summarize + /ai/extract-image; Frontend: AI Assist button + suggestions panel

---

## Phase 4: Polish & Submit

**Goal:** Project is demo-ready with seed data, documentation, demo video, and submitted before deadline.

**Success Criteria:**
1. README.md documents setup steps — evaluator can run system in < 10 minutes
2. 10–15 seed incidents loaded covering all statuses and categories
3. Demo video 10–12 minutes covering all mandatory features
4. Report 8–12 pages covering all required sections
5. Submitted to UTM portal before 15 May 2026, 5pm

**Plans:**
- `04-01-PLAN.md` — Seed data, README, end-to-end testing, video recording, report writing, submission

---

## Milestone Risk Buffer

If behind schedule:
- **Skip Phase 3** (AI is optional per assignment)
- **Simplify RPA** to manual trigger if Drive monitoring fails (bot still calls API)
- **Phase 4 minimum:** README + seed data + zip submission (video/report can be done in parallel)

---
*Roadmap created: 2026-05-04*
*Last updated: 2026-05-04 after initialization*
