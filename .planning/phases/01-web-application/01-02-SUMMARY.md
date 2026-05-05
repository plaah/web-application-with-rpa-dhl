---
phase: 01-web-application
plan: 02
subsystem: ui
tags: [nextjs, tailwind, typescript, react, jwt, lucide-react]

requires:
  - phase: 01-01
    provides: FastAPI backend on :8000 with JWT auth, incidents CRUD, file extraction, reports summary

provides:
  - Next.js 14 App Router frontend on :3000 wired to FastAPI backend
  - Login page with irrs_token + irrs_user cookie management
  - Dashboard with StatCards (draft/reviewed/published counts) + recent incidents table
  - Upload console: FileDropzone (extract) + IncidentForm (save)
  - Incidents list with FilterBar (status/tag/date/creator/search), IncidentTable, pagination 20/page
  - Incident detail: Details/Files/History tabs, status workflow, published lock banner, admin delete

affects:
  - 02-rpa-automation (frontend entry points for RPA triggers)
  - 03-ai-enhancement (AI Assist button placeholder is missing — Phase 3 responsibility)

tech-stack:
  added: [next@14, react@18, tailwindcss@3, typescript, lucide-react]
  patterns:
    - apiFetch wrapper attaches Bearer token, clears cookie + redirects on 401
    - irrs_token cookie (JWT) + irrs_user cookie (JSON user object) set on login
    - getUserFromCookie() for client-side role-gating (admin delete button)
    - Refetch-after-mutation pattern for status changes (no optimistic update)
    - onChange-driven filters (no Apply button)

key-files:
  created:
    - irrs-frontend/lib/types.ts
    - irrs-frontend/lib/api.ts
    - irrs-frontend/middleware.ts
    - irrs-frontend/app/layout.tsx
    - irrs-frontend/app/page.tsx
    - irrs-frontend/app/login/page.tsx
    - irrs-frontend/app/dashboard/page.tsx
    - irrs-frontend/app/upload/page.tsx
    - irrs-frontend/app/incidents/page.tsx
    - irrs-frontend/app/incidents/[id]/page.tsx
    - irrs-frontend/components/Navbar.tsx
    - irrs-frontend/components/StatCard.tsx
    - irrs-frontend/components/StatusBadge.tsx
    - irrs-frontend/components/PaginationBar.tsx
    - irrs-frontend/components/FilterBar.tsx
    - irrs-frontend/components/IncidentTable.tsx
    - irrs-frontend/components/FileDropzone.tsx
    - irrs-frontend/components/IncidentForm.tsx
    - irrs-frontend/components/TabStrip.tsx
    - irrs-frontend/components/VersionHistoryList.tsx
    - irrs-frontend/components/ConfirmDialog.tsx
  modified: []

key-decisions:
  - "irrs_user cookie (JSON-encoded) used for client-side role display — avoids /auth/me round-trip since backend has no such endpoint in Phase 1"
  - "Refetch-after-mutation (PATCH status) keeps server as single source of truth rather than optimistic updates"
  - "FilterBar onChange-driven with URLSearchParams — resets page to 1 on any filter change"
  - "Admin delete gated by getUserFromCookie().role === admin AND incident.status === draft — dual condition enforced both UI and server-side"

patterns-established:
  - "apiFetch<T>: typed fetch wrapper, auto Bearer header, 401 → clear cookies + redirect /login"
  - "StatusBadge colors locked: draft=gray-100/gray-700, reviewed=blue-100/blue-700, published=green-100/green-700"
  - "DHL red accent: bg-red-600 on CTAs only, never on status badges"
  - "All status action buttons: min-h-[44px] touch target"

requirements-completed:
  - AUTH-01
  - AUTH-02
  - AUTH-03
  - INC-01
  - INC-02
  - INC-04
  - INC-05
  - INC-06
  - INC-08
  - VIEW-01
  - VIEW-02
  - VIEW-03
  - VIEW-04
  - DASH-01
  - DASH-02

duration: ~45min
completed: 2026-05-05
---

# Phase 01 Plan 02: Frontend Summary

**Next.js 14 App Router frontend with JWT cookie auth, filterable incident list, upload+extract flow, and tabbed detail view with status workflow and admin delete**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-05T05:48:00Z
- **Completed:** 2026-05-05T05:58:00Z
- **Tasks:** 5 auto + 1 auto-approved checkpoint (Task 6)
- **Files modified:** 21

## Accomplishments

- Complete authentication flow: login → irrs_token + irrs_user cookies → middleware redirect protection
- Dashboard showing live StatCards from `/api/reports/summary` + 10 recent incidents
- Upload console: file drop → `/api/files/extract` → prefill form → POST `/api/incidents` → redirect to detail
- Filterable paginated incident list (20/page, onChange filters, URLSearchParams)
- Incident detail with 3 tabs (Details/Files/History), status workflow buttons (Draft→Reviewed→Published), published lock banner, admin-only delete with ConfirmDialog

## Task Commits

1. **Task 1: Frontend scaffold + types + API client + middleware + login** - `25b41f7` (feat)
2. **Task 2: Shared components + Dashboard page** - `e95a32f` (feat)
3. **Task 3: Upload page + FileDropzone + IncidentForm** - `e680e79` (feat)
4. **Task 4: Incidents list page + FilterBar + IncidentTable** - `d0a6702` (feat)
5. **Task 5: Incident detail page + TabStrip + VersionHistoryList + ConfirmDialog** - `11bd4be` (feat)
6. **Task 6: Human verify checkpoint** — Auto-approved (auto_advance=true)

## Pages Built

| Route | File |
|-------|------|
| `/` | `app/page.tsx` (redirect → /dashboard) |
| `/login` | `app/login/page.tsx` |
| `/dashboard` | `app/dashboard/page.tsx` |
| `/upload` | `app/upload/page.tsx` |
| `/incidents` | `app/incidents/page.tsx` |
| `/incidents/[id]` | `app/incidents/[id]/page.tsx` |

## Components Built

| Component | File | Purpose |
|-----------|------|---------|
| Navbar | components/Navbar.tsx | Top nav with logout, role-aware links |
| StatCard | components/StatCard.tsx | Dashboard count cards |
| StatusBadge | components/StatusBadge.tsx | Locked color pills per UI-SPEC NFR-14 |
| PaginationBar | components/PaginationBar.tsx | Previous/Next + Page N of M |
| FilterBar | components/FilterBar.tsx | onChange-driven incident filters |
| IncidentTable | components/IncidentTable.tsx | Paginated table with empty states |
| FileDropzone | components/FileDropzone.tsx | Drag-drop file upload + extract |
| IncidentForm | components/IncidentForm.tsx | Create incident form |
| TabStrip | components/TabStrip.tsx | Details/Files/History tabs |
| VersionHistoryList | components/VersionHistoryList.tsx | Status timeline |
| ConfirmDialog | components/ConfirmDialog.tsx | Delete confirmation modal |

## API Endpoints Consumed

| Method | Path | Used in |
|--------|------|---------|
| POST | `/auth/login` | login/page.tsx |
| GET | `/reports/summary` | dashboard/page.tsx |
| GET | `/incidents?limit=10&page=1` | dashboard/page.tsx |
| GET | `/incidents?{filters}&page=N&limit=20` | incidents/page.tsx |
| POST | `/incidents` | IncidentForm.tsx |
| GET | `/incidents/{id}` | incidents/[id]/page.tsx |
| PATCH | `/incidents/{id}/status` | incidents/[id]/page.tsx |
| DELETE | `/incidents/{id}` | incidents/[id]/page.tsx |
| POST | `/files/extract` | FileDropzone.tsx |

## Cookies Set

| Cookie | Value | Set in |
|--------|-------|--------|
| `irrs_token` | JWT string, Max-Age 8h | lib/api.ts setAuthCookie |
| `irrs_user` | JSON-encoded {id, username, role}, Max-Age 8h | lib/api.ts setUserCookie |

## Known Limitations → Phase 2/3

- No AI Assist button yet — Phase 3 responsibility (ai.py is empty stub)
- No logs page — wire-up planned for Phase 2 (RPA automation)
- Editor role has no edit form (PUT /incidents/{id}) — scoped out of Phase 1 UI
- No real-time updates (WebSocket/SSE) — refetch-after-mutation covers the workflow

## Run Commands

```bash
# Backend (Phase 01-01)
cd irrs-backend && uvicorn main:app --reload --port 8000

# Frontend
cd irrs-frontend && npm run dev
# Opens on http://localhost:3000
# Login: admin / admin123
```

## Deviations from Plan

None — plan executed exactly as written. Task 6 auto-approved per auto_advance=true config.

## Issues Encountered

None.

## Self-Check: PASSED

All files present on disk. All task commits verified in git history.
