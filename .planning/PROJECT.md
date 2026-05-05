# DHL IRRS — Incident Reporting & Resolution System

## What This Is

An AI-enhanced web-based incident management platform for DHL customer support teams. The system collects unstructured incident reports from multiple channels (email, Telegram, phone notes, images), structures them via RPA automation and Claude AI, and provides a searchable, versioned workflow for tracking incidents from Draft → Reviewed → Published.

Built for UTM SECJ3483 Web Technology assignment in collaboration with DHL DAC 3.0 Challenge.

## Core Value

Every incident submitted (manually or via RPA) reaches a "Published" status with a clean, structured record — without manual re-entry.

## Requirements

### Validated

*Validated in Phase 1: Web Application (2026-05-05)*

- [x] Secured login (JWT, roles: admin/editor/rpa_bot)
- [x] Upload Console accepting text, PDF, DOCX files with text extraction
- [x] Incident CRUD via REST API (JSON storage)
- [x] Draft → Reviewed → Published status workflow with version history
- [x] Searchable/filterable incident viewer (status, tag, date, creator, keyword)
- [x] Dashboard with incident counts and recent activity

### Active

- [ ] UiPath RPA bot: Google Drive ingestion → dedup → API create/update → summary email
- [ ] RPA error handling: Try/Catch + screenshot + log
- [ ] Claude AI: text summarization, tag extraction, image text extraction (Phase 3)

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
| JSON + FastAPI over SQL/MongoDB | Assignment allows it; simpler setup; no DB install for evaluator | ✓ Validated — filelock prevents corruption |
| FastAPI over Flask | Auto Swagger docs at /docs great for CRUD demo; better async file handling | ✓ Validated — /docs works out of the box |
| Claude API over GPT | User preference | — Phase 3 |
| Next.js App Router | React-based, easy API calls, SSR support | ✓ Validated — middleware auth guards work well |
| JWT in cookie (not httpOnly) | RPA-compatible via Bearer header; middleware reads cookie server-side | ✓ Validated — irrs_token + irrs_user cookies, 8h TTL |
| HTTPBearer(auto_error=False) | FastAPI default returns 403 on missing token; assignment requires 401 | ✓ Validated — explicit 401 in get_current_user |

---
**Current state:** Phase 1 complete — full web application live (FastAPI + Next.js). Phase 2 (RPA) next.

*Last updated: 2026-05-05 after Phase 1 completion*
