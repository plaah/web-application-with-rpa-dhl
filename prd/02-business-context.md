# Business Context — DHL IRRS
**Scenario 2: AI-Enhanced Incident Reporting & Resolution System**

---

## Problem in One Line

DHL's customer support teams receive hundreds of unstructured, multi-format incident reports daily with no centralized system to collect, deduplicate, assign, or track them — causing slow response times and manual rework.

## Core Value Proposition

> Replace 5+ disconnected input channels and manual processing with a single automated pipeline: RPA ingests raw files → web app structures and tracks incidents → Claude AI cleans up messy content → supervisors review and publish.

## Stakeholders

| Stakeholder | Interest |
|---|---|
| DHL Customer Support Agents | Faster incident creation, less re-typing |
| DHL Team Supervisors | Searchable, filterable incident list with status |
| DHL Management | Consolidated reports and trends |
| UTM Lecturer | Academic assessment (SECJ3483, 15% of grade) |
| DHL DAC 3.0 Judges | Industry-quality implementation (top 10 competition) |

## Business Rules

1. An incident can only be created by authenticated users or the RPA bot.
2. Status can only move forward: Draft → Reviewed → Published.
3. Published incidents cannot be edited.
4. The same file (same SHA-256 hash) cannot be ingested within a 14-day window.
5. Only admins can delete incidents.
6. RPA bot has `editor` role access to the API.

## MVP Scope vs. Full Vision

| Feature | MVP (This Assignment) | Full Vision (Future) |
|---|---|---|
| Input channels | Manual upload + Google Drive (RPA) | Email, WhatsApp, Telegram direct |
| Storage | JSON files | PostgreSQL / MongoDB |
| AI | Claude API (Phase 2, optional) | Fine-tuned domain model |
| Notifications | Email (RPA summary) | Real-time in-app alerts |
| Reporting | Summary stats page | Analytics dashboard with charts |
| Auth | Username/password + JWT | SSO / OAuth2 |
| Deployment | Local machine | Cloud (AWS/GCP) |

## Success Definition (for Assignment)

The assignment is a success if:
1. A lecturer/evaluator can log in, upload a PDF, see it as a Draft incident, review it, and publish it — all without errors.
2. The UiPath bot can be triggered, picks up files from Google Drive, and creates incidents via API without manual intervention.
3. The demo video clearly shows all CRUD operations and the RPA workflow.
4. The report covers all required sections (8–12 pages).

The project enters competition territory if:
- Claude AI assist produces useful suggestions that editors actually use
- The UI is clean, modern, and DHL-branded (red/yellow)
- RPA handles errors gracefully with screenshots and email alerts
