# DHL IRRS — Incident Reporting & Resolution System

## What This Is

An AI-enhanced web-based incident management platform for DHL customer support teams. The system collects unstructured incident reports from multiple channels (email, Telegram, phone notes, images), structures them via RPA automation and Claude AI, and provides a searchable, versioned workflow for tracking incidents from Draft → Reviewed → Published.

Built for UTM SECJ3483 Web Technology assignment in collaboration with DHL DAC 3.0 Challenge.

## Core Value

Every incident submitted (manually or via RPA) reaches a "Published" status with a clean, structured record — without manual re-entry.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Secured login (JWT, roles: admin/editor)
- [ ] Upload Console accepting text, PDF, DOCX files with text extraction
- [ ] Incident CRUD via REST API (JSON storage)
- [ ] Draft → Reviewed → Published status workflow with version history
- [ ] Searchable/filterable incident viewer (status, tag, date, creator, keyword)
- [ ] UiPath RPA bot: Google Drive ingestion → dedup → API create/update → summary email
- [ ] Claude AI: text summarization, tag extraction, image text extraction (Phase 2)
- [ ] Dashboard with incident counts and recent activity
- [ ] RPA error handling: Try/Catch + screenshot + log

### Out of Scope

- Real-time notifications (WebSocket) — complexity vs time
- Mobile responsive design — desktop-first for evaluation
- Direct WhatsApp/Telegram ingestion — RPA reads from Drive only
- User self-registration — admin-only account creation
- Full-text search indexing (Elasticsearch) — JSON filter sufficient for MVP

## Context

- **Assignment:** SECJ3483 Web Technology, Individual (15% of grade)
- **Deadline:** 15 May 2026, 5pm — 11 days from start (4 May 2026)
- **Grading:** 50% Web App, 40% RPA, 10% Project Management
- **Competition:** DHL DAC 3.0 — top 10 from UTM JB advance to finals at Imazium PJ on 3 June
- **Evaluation:** 18–21 May 2026 at UTM; DHL judges review 22–26 May

## Constraints

- **Timeline:** 11 days total — must ship by 15 May 2026
- **Tech Stack:** Next.js 14 (frontend), Python FastAPI (backend), JSON files (storage), UiPath (RPA), Claude API (AI)
- **Storage:** JSON files per assignment Option 1 — no database setup required
- **Solo:** Individual assignment — no team coordination overhead
- **Demo:** System runs locally on evaluator's machine — no cloud deployment required

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| JSON + FastAPI over SQL/MongoDB | Assignment allows it; simpler setup; no DB install for evaluator | — Pending |
| FastAPI over Flask | Auto Swagger docs at /docs great for CRUD demo; better async file handling | — Pending |
| Claude API over GPT | User preference | — Pending |
| Next.js App Router | React-based, easy API calls, SSR support | — Pending |
| JWT in httpOnly cookie | Stateless, RPA-compatible via Bearer header | — Pending |

---
*Last updated: 2026-05-04 after initialization from PRD*
