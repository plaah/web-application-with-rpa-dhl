# Deferred Items

## Pre-existing Lint Errors (out of scope)

These errors exist in files not touched by any plan in this phase. Discovered during 02-02 verification.

| File | Rule | Description |
|------|------|-------------|
| `app/incidents/[id]/page.tsx:60` | `react-hooks/set-state-in-effect` | `fetchIncident()` called directly in useEffect |
| `app/incidents/page.tsx:53` | `react-hooks/set-state-in-effect` | `fetchIncidents()` called directly in useEffect |
| `components/IncidentForm.tsx:54` | `react-hooks/set-state-in-effect` | `setDescription()` called directly in useEffect |

These are pre-existing from Phase 01. Fix in Phase 4 (Polish & Submit).
