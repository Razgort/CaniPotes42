# Story 7.3: Admin Document Expiry Dashboard

Status: ready-for-dev

## Story

As a club admin,
I want to see a dashboard of documents nearing or past expiry,
So that I can proactively follow up with members before documents lapse.

## Acceptance Criteria

1. **Given** I am an admin or owner, **When** I navigate to the document management section, **Then** I see a dashboard summary at the top showing counts: expired documents (red), expiring within 30 days (orange), up to date (green). The summary cards follow the same pattern as the vaccine dashboard (VaccineSummaryCards style).

2. **Given** I view the expiry dashboard, **When** I look at the document list below the summary, **Then** documents are sorted by urgency: expired first, then expiring soon, then up to date. Each row shows: member name, document type, associated entity, expiry date, status badge. The default filter shows "Expired" + "Expiring" (problems first).

3. **Given** I tap a summary card, **When** the filter activates, **Then** the list filters to show only documents matching that status. I can tap "All" to clear the filter.

4. **Given** I tap a document row, **When** the detail opens, **Then** I see the document with member and association details. The member's name is tappable — I can open a chat or view their profile to follow up.

5. **Given** no documents with expiry dates exist, **When** I view the dashboard, **Then** summary cards show all zeros. A helpful message displays: "Les documents avec date d'expiration apparaîtront ici".

## Tasks / Subtasks

- [ ] Task 1: API — Expiry dashboard aggregation endpoint (AC: #1, #2)
  - [ ] 1.1 Create `GET /clubs/:clubId/documents/expiry-summary` endpoint in DocumentController
  - [ ] 1.2 Implement aggregation query: count documents by expiry status (expired, expiring, valid) — only documents WITH expiryDate
  - [ ] 1.3 Return `{ expired: number, expiring: number, valid: number }` response
  - [ ] 1.4 Restrict to admin/owner roles via `@Roles(MemberRole.ADMIN, MemberRole.OWNER)`
- [ ] Task 2: API — Filtered document list with urgency sorting (AC: #2, #3)
  - [ ] 2.1 Extend existing `GET /clubs/:clubId/documents` with `?expiryFilter=expired|expiring|valid|all` query param
  - [ ] 2.2 Add `?sortBy=urgency` option: ORDER BY expiry status (expired first → expiring → valid), then by expiryDate ASC
  - [ ] 2.3 Default filter when `expiryFilter` not specified: show all (dashboard UI handles default filter state)
  - [ ] 2.4 Include member name (via User relation) and dog name (via Dog relation) in response
- [ ] Task 3: Frontend — Summary cards component (AC: #1, #3)
  - [ ] 3.1 Create `DocumentExpirySummary.tsx` in `libs/frontend/features/src/lib/documents/`
  - [ ] 3.2 Render three tappable cards: expired (red), expiring (orange), up to date (green) — follow VaccineSummaryCards pattern
  - [ ] 3.3 Always pair color with text label (WCAG: never color alone)
  - [ ] 3.4 Tapping a card sets active filter state, tapping again or "All" clears filter
  - [ ] 3.5 Announce counts for screen readers: "X documents expirés, Y expirent bientôt, Z à jour"
- [ ] Task 4: Frontend — Expiry dashboard page (AC: #2, #4, #5)
  - [ ] 4.1 Create `DocumentExpiryDashboard.tsx` in `libs/frontend/features/src/lib/documents/`
  - [ ] 4.2 Create `useDocumentExpiry` hook for fetching summary + filtered list
  - [ ] 4.3 Compose: summary cards at top + filtered document list below
  - [ ] 4.4 Default view: show "Expired" + "Expiring" documents (problems first)
  - [ ] 4.5 Document rows: member name, document type, associated entity, expiry date, status badge
  - [ ] 4.6 Member name is tappable → navigate to member profile or open chat
  - [ ] 4.7 Empty state: "Les documents avec date d'expiration apparaîtront ici" when no expiry-dated documents exist
- [ ] Task 5: Frontend — Routing and navigation (AC: #1)
  - [ ] 5.1 Add dashboard route accessible from club management / admin area
  - [ ] 5.2 Only visible to admin/owner roles — hide nav entry for regular members
- [ ] Task 6: Tests (AC: all)
  - [ ] 6.1 Unit tests for expiry aggregation logic in DocumentService
  - [ ] 6.2 Unit tests for urgency sorting
  - [ ] 6.3 Frontend tests for DocumentExpirySummary (card rendering, filter toggling, accessibility)
  - [ ] 6.4 Frontend tests for DocumentExpiryDashboard (empty state, filtered views, member link)

## Dev Notes

### Architecture Compliance

- **API module:** Extend existing DocumentModule at `libs/api/features/src/lib/document/` — add new endpoint to DocumentController, new methods to DocumentService
- **Frontend location:** `libs/frontend/features/src/lib/documents/` — add `DocumentExpiryDashboard.tsx`, `DocumentExpirySummary.tsx`, `hooks/useDocumentExpiry.ts`
- **Shared schemas:** Extend `libs/shared/types/src/lib/schemas/document.schema.ts` with expiry summary response schema

### Existing Code to Reuse — DO NOT Reinvent

- **DocumentService** from Story 7.2: Already has `findAll()` with filtering, expiry status computation. Extend with aggregation method and urgency sorting — do NOT create a separate service.
- **Expiry status logic** from Story 7.2: `computeExpiryStatus(expiryDate)` returns `'valid' | 'expiring' | 'expired' | null`. Reuse this exact function for dashboard aggregation.
- **VaccineSummaryCards pattern** (described in UX spec): Three tappable cards with counts + semantic colors. The document dashboard follows the IDENTICAL layout — adapt, don't reinvent.
- **DocumentList component** from Story 7.2: Reuse the same list component with admin columns. The dashboard list is the same component with additional filter state from summary cards.
- **R2Service** (`libs/api/features/src/lib/document/r2.service.ts`): For signed URL generation when viewing documents from dashboard.
- **ClubGuard, RolesGuard, @CurrentUser, @CurrentClub** decorators from `@org/api-core`.

### Database Queries

Aggregation query for summary (Prisma):
```typescript
// Count documents by expiry status — only those WITH expiryDate
const now = new Date();
const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const [expired, expiring, valid] = await Promise.all([
  prisma.document.count({ where: { clubId, expiryDate: { lt: now } } }),
  prisma.document.count({ where: { clubId, expiryDate: { gte: now, lte: thirtyDaysFromNow } } }),
  prisma.document.count({ where: { clubId, expiryDate: { gt: thirtyDaysFromNow } } }),
]);
```

Urgency sorting: `orderBy: [{ expiryDate: 'asc' }]` combined with application-level status grouping, or use raw query with CASE WHEN for DB-level urgency sort.

### UX Requirements

- **Dashboard-First layout** (Direction D from UX spec): Summary cards at top, filtered list below — identical to vaccine dashboard pattern
- **Summary card colors:** Red `#DC2626` (expired), Orange `#D97706` (expiring), Green `#16A34A` (valid) — always paired with text labels
- **Default filter:** Show problems first (expired + expiring). User can tap "All" to see everything.
- **Tappable member name:** Navigate to member profile or open chat for follow-up — this is the "hero interaction" for admin workflow
- **Empty state:** Friendly French message, not error-style
- **Skeleton loading:** Cards show skeleton counts, list shows skeleton rows during fetch
- **Touch targets:** 44x44px minimum
- **Screen reader:** Cards announce counts with status context

### Security

- **Admin/owner only:** All dashboard endpoints and UI gated behind role check
- **Tenant isolation:** All queries scoped by `clubId` via ClubGuard
- **Member name visibility:** Admins can see all member names — this is expected for club management

### API Endpoint Design

```
GET /clubs/:clubId/documents/expiry-summary  → { expired: number, expiring: number, valid: number }
GET /clubs/:clubId/documents?expiryFilter=expired&sortBy=urgency  → Filtered list with urgency sort
```

Both require `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` with `@Roles(MemberRole.ADMIN, MemberRole.OWNER)`.

### Dependency on Stories 7.1 and 7.2

- Story 7.1 creates DocumentModule, upload endpoints, R2 integration
- Story 7.2 creates document listing, viewing, download, and expiry status computation
- This story (7.3) extends with aggregation dashboard on top of existing infrastructure. If 7.1/7.2 are not implemented yet, create the full module but focus on dashboard-specific code.

### Project Structure Notes

- Monorepo managed by Nx — `@org/` import aliases
- API: NestJS + Prisma + Zod validation
- Frontend: React + TanStack Router + TailwindCSS
- Shared types: `@org/shared-types`
- Tests: Vitest

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Document Management FR22-FR26, Admin Dashboard patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR26 Admin document expiry dashboard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — VaccineSummaryCards pattern, Dashboard-First Direction D, semantic color tokens]
- [Source: _bmad-output/implementation-artifacts/7-2-document-viewing-download-expiry-tracking.md — Expiry status computation, DocumentService, DocumentList]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
