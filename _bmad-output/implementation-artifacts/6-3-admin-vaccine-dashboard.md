# Story 6.3: Admin Vaccine Dashboard

Status: ready-for-dev

## Story

As a club admin,
I want to see a dashboard of all dogs' vaccine statuses at a glance,
so that I can verify competition readiness in 30 seconds instead of flipping through a paper binder.

## Acceptance Criteria (BDD)

1. **Dashboard Summary Cards**
   - Given I am an admin or owner
   - When I navigate to the vaccine dashboard route
   - Then I see three VaccineSummaryCards showing counts: green ("À jour"), orange ("À renouveler"), red ("Manquant / expiré")
   - And each card is a tappable button with `aria-label="N chiens [status], appuyez pour filtrer"`
   - And below the cards, a list of all club dogs is displayed

2. **Dog List with Status Indicators**
   - Given the dashboard is loaded
   - When I view the dog list
   - Then each row shows: dog name, owner name, VaccineStatusBadge (overall status), next expiry date (or days remaining)
   - And default sort shows problems first: expired → expiring → up to date
   - And the badge uses text + icon, never color alone (`aria-label` on status)

3. **Status Filter by Summary Cards**
   - Given I tap a summary card (e.g., the red card)
   - When the filter activates
   - Then the dog list filters to show only dogs matching that status
   - And the active card has a selected visual state
   - And tapping the same card again or "Tous" clears the filter

4. **Search by Dog or Owner Name**
   - Given I type in the search field (placeholder: "Chien ou propriétaire…")
   - When the debounced search executes
   - Then the dog list filters to match dog name or owner name

5. **Dog Detail Navigation**
   - Given I tap a dog row
   - When the row tap fires
   - Then a drawer/detail view shows the dog's vaccine records with individual status badges
   - And the owner's name is shown as a tappable link

6. **Contact Owner Workflow**
   - Given I tap the owner's name from the detail view
   - When contact options appear
   - Then I can navigate to the owner's member profile
   - (Chat integration deferred to Epic 8)

7. **Responsive Layout**
   - Given mobile viewport (<640px): summary cards stacked vertically, scrollable card list
   - Given desktop viewport (>1024px): summary cards in a row, sortable data table with columns

8. **Empty State**
   - Given no dogs are registered in the club
   - When I view the dashboard
   - Then: "Aucun chien enregistré dans le club."

9. **Loading State**
   - Given the dashboard is loading
   - Then skeleton KPI cards + 5 skeleton rows are displayed

10. **All-Green Success State**
    - Given all dogs have green status
    - When I view the dashboard
    - Then visual feedback conveys readiness (all-green summary)

## Vaccine Status Logic

Status is computed server-side from `VaccineRecord.expiryDate`:

| Status | Condition | Label (FR) | Color Token |
|--------|-----------|------------|-------------|
| `UP_TO_DATE` | All vaccine expiryDates > today + 30d | "À jour" | `--success` (#16A34A / green-600) |
| `EXPIRING_SOON` | Any expiryDate ≤ today + 30d AND ≥ today | "À renouveler" | `--warning` (#D97706 / amber-600) |
| `EXPIRED` | Any expiryDate < today | "Manquant / expiré" | `--danger` (#DC2626 / red-600) |

Dog overall status = **worst** vaccine status (if any is red → dog is red). Dogs with zero vaccine records = `EXPIRED` (missing).

## Tasks / Subtasks

- [ ] Task 1: Backend — Vaccine dashboard API endpoint (AC: #1, #2, #3, #4)
  - [ ] 1.1 Create `VaccineModule` at `libs/api/features/src/lib/vaccine/vaccine.module.ts`
  - [ ] 1.2 Create `VaccineService` with `getClubVaccineSummary(clubId, filters?)` method
  - [ ] 1.3 Create `VaccineController` with `GET /vaccine-dashboard` endpoint (ADMIN+ guard)
  - [ ] 1.4 Implement aggregation query: join Dog → VaccineRecord → User, compute per-dog status, aggregate counts
  - [ ] 1.5 Support query params: `?status=UP_TO_DATE|EXPIRING_SOON|EXPIRED`, `?search=string`, `?page=N&pageSize=N`
  - [ ] 1.6 Register `VaccineModule` in `FeaturesModule`
  - [ ] 1.7 Write unit tests for `VaccineService` (co-located `vaccine.service.spec.ts`)

- [ ] Task 2: Shared — Vaccine dashboard schema + types (AC: #1, #2)
  - [ ] 2.1 Add `vaccineDashboardQuerySchema` to `libs/shared/types/src/lib/schemas/vaccine.schema.ts`
  - [ ] 2.2 Define response types: `VaccineDashboardSummary`, `VaccineDogRow`
  - [ ] 2.3 Export from `schemas/index.ts`

- [ ] Task 3: Frontend — VaccineStatusBadge component (AC: #2)
  - [ ] 3.1 Create `libs/frontend/ui/src/lib/VaccineStatusBadge.tsx`
  - [ ] 3.2 Variants: `badge` (compact row), `card` (summary with count)
  - [ ] 3.3 Always render text + icon, never color alone; include `aria-label="Statut vaccin : [label]"`
  - [ ] 3.4 Export from `libs/frontend/ui/src/index.ts`
  - [ ] 3.5 Write test `VaccineStatusBadge.test.tsx`

- [ ] Task 4: Frontend — VaccineSummaryCards component (AC: #1, #3)
  - [ ] 4.1 Create `libs/frontend/ui/src/lib/VaccineSummaryCards.tsx`
  - [ ] 4.2 Three cards (ok/warn/bad) with count + label, tappable filter buttons
  - [ ] 4.3 Wrap in `role="region" aria-label="Synthèse vaccinale"`
  - [ ] 4.4 Layout: `grid grid-cols-3 gap-2 p-4` (mobile stacks via responsive)
  - [ ] 4.5 Selected state visual indicator on active filter card
  - [ ] 4.6 Write test `VaccineSummaryCards.test.tsx`

- [ ] Task 5: Frontend — VaccineDashboard feature page (AC: #1–#10)
  - [ ] 5.1 Create `libs/frontend/features/src/lib/vaccine-dashboard/VaccineDashboard.tsx`
  - [ ] 5.2 Create `libs/frontend/features/src/lib/vaccine-dashboard/hooks/useVaccineDashboard.ts`
  - [ ] 5.3 Compose: summary cards + search input + dog list (mobile cards / desktop table)
  - [ ] 5.4 Filter state management: status filter (from card taps), search (debounced with `useDeferredValue`)
  - [ ] 5.5 Dog row: avatar (optional), dog name (semibold), owner name (muted), status badge, days until expiry
  - [ ] 5.6 Empty state, loading skeleton, all-green state
  - [ ] 5.7 Dog row tap → detail drawer or navigate to dog detail (show vaccine list + owner link)
  - [ ] 5.8 Write test `VaccineDashboard.test.tsx`

- [ ] Task 6: Frontend — Routing integration (AC: #1, #7)
  - [ ] 6.1 Add route `/vaccine-dashboard` in `features.tsx` (lazy-loaded, ProtectedRoute)
  - [ ] 6.2 Gate visibility: only render link/tab for ADMIN or OWNER role
  - [ ] 6.3 Update DogsPage or add dashboard as a tab/view within the Dogs section

## Dev Notes

### Architecture Compliance

**API Module Pattern** — Follow the exact pattern from `MemberModule`:
- File: `libs/api/features/src/lib/vaccine/vaccine.module.ts` — NestJS `@Module` with controller + service
- File: `libs/api/features/src/lib/vaccine/vaccine.controller.ts` — REST controller
- File: `libs/api/features/src/lib/vaccine/vaccine.service.ts` — Business logic with `PrismaService`
- Register in `libs/api/features/src/lib/api-features.ts` → `FeaturesModule.imports`

**Guard Stack** — Every dashboard endpoint MUST use:
```typescript
@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
@Roles('ADMIN', 'OWNER')
```
- Use `@CurrentClub() clubId: string` decorator to get clubId
- NEVER query without `WHERE clubId` — this is the tenant isolation boundary

**Response Envelope** — All API responses MUST follow:
```typescript
// List response
{ data: VaccineDogRow[], meta: { total: number, page: number, pageSize: number } }
// Summary response (can be combined)
{ data: { summary: { ok: number, warning: number, critical: number }, dogs: VaccineDogRow[] }, meta: {...} }
```

### Database Query Strategy

The dashboard aggregation query must:
1. Select all `Dog` records WHERE `clubId = :clubId`
2. Include `vaccineRecords` for each dog (with `expiryDate`)
3. Include `user` (the dog owner) → join to get `firstName`, `lastName`
4. Compute per-dog status in service layer (not raw SQL): iterate vaccine records, apply status logic
5. Aggregate summary counts (ok/warn/critical) from computed statuses
6. Apply server-side filters (`status`, `search`) before pagination
7. Sort: expired first → expiring → up to date (problems-first default)

**Existing Prisma Models to use** (already defined in schema.prisma):
- `Dog` (lines 168-186): has `userId`, `clubId`, `vaccineRecords` relation, `@@index([clubId])`
- `VaccineRecord` (lines 188-199): has `dogId`, `vaccineName`, `dateAdministered`, `expiryDate`, cascade delete from Dog
- `User` (lines 55-73): has `firstName`, `lastName`, `avatarUrl`
- `VaccineStatus` enum (lines 28-32): `UP_TO_DATE`, `EXPIRING_SOON`, `EXPIRED`

**Note:** `VaccineRecord.expiryDate` is `DateTime?` (optional). Treat null expiryDate as unknown — do not count as expired. Only records with a non-null expiryDate participate in status calculation.

### Frontend Component Architecture

**Follow MemberDirectory pattern** (`libs/frontend/features/src/lib/members/MemberDirectory.tsx`):
- `useState` for search, filter, page
- `useDeferredValue` for debounced search
- `useAuth()` to get `activeClub`, `role`
- Conditional rendering: `isAdminOrOwner` check for visibility
- Mobile: card list (`lg:hidden`) / Desktop: data table (`hidden lg:block`)
- Pagination with meta

**React Query hook pattern** (follow `useMembers.ts`):
```typescript
// libs/frontend/features/src/lib/vaccine-dashboard/hooks/useVaccineDashboard.ts
export function useVaccineDashboard(clubId: string | null, options: DashboardOptions) {
  return useQuery({
    queryKey: ['vaccine-dashboard', clubId, options],
    queryFn: () => apiClient.get<VaccineDashboardResponse>(`/vaccine-dashboard?...`),
    enabled: !!clubId,
  });
}
```

**UI Components** — Create in `libs/frontend/ui/src/lib/`:
- `VaccineStatusBadge.tsx` — Reuse across stories 6.1, 6.2, 6.3
- `VaccineSummaryCards.tsx` — Dashboard-specific

**Existing UI components to reuse:**
- `SkeletonList` from `@org/ui` — for loading states
- `cn()` utility from `@org/ui` — for conditional classNames
- `MemberCard` pattern — reference for dog row card design
- `Avatar` from `@org/ui` — for dog photo display (fallback: paw icon or initials)

### Styling Requirements

**Typography (from UX spec):**
- Title: `.text-h1` (map to `text-xl font-semibold` or define)
- KPI number: `.text-h2 font-bold` (map to `text-lg font-bold`)
- Dog name: `.text-body font-semibold`
- Owner: `.text-small text-muted` (map to `text-sm text-muted-foreground`)

**Spacing:**
- KPI strip: `grid grid-cols-3 gap-2 p-4`
- Dog rows: `py-3 px-4 border-b`

**Color tokens (Tailwind):**
- Green/OK: `bg-green-50 text-green-700 border-green-200` (card), `text-green-600` (badge)
- Orange/Warning: `bg-amber-50 text-amber-700 border-amber-200`, `text-amber-600`
- Red/Critical: `bg-red-50 text-red-700 border-red-200`, `text-red-600`

### Object IDs (from UX Spec)

| ID | Element |
|----|---------|
| `vax-dash-summary-ok` | Green KPI card |
| `vax-dash-summary-warn` | Orange KPI card |
| `vax-dash-summary-bad` | Red KPI card |
| `vax-dash-filter-status` | Status filter (Tous/OK/Warning/Critical) |
| `vax-dash-search` | Search input (placeholder: "Chien ou propriétaire…") |
| `vax-dash-row` | Dog row (avatar, name, owner, badge, days) |
| `vax-dash-status-icon` | Status icon (text + icon, never color alone) |
| `vax-dash-export` | CSV export button (V2 — do NOT implement now) |

### Accessibility Requirements

- KPI region: `role="region" aria-label="Synthèse vaccinale"`
- Desktop table: semantic `<table>` with `<th>` headers
- Status badges: text + icon, never color alone; `aria-label="Statut vaccin : [status]"`
- All interactive elements: 44px minimum touch target
- Focus ring: `focus:ring-2 focus:ring-primary/20`
- Screen reader: semantic HTML (header/main/section)

### File Structure (New Files)

```
libs/api/features/src/lib/vaccine/
├── vaccine.module.ts
├── vaccine.controller.ts
├── vaccine.service.ts
└── vaccine.service.spec.ts

libs/frontend/features/src/lib/vaccine-dashboard/
├── VaccineDashboard.tsx
├── VaccineDashboard.test.tsx
└── hooks/
    └── useVaccineDashboard.ts

libs/frontend/ui/src/lib/
├── VaccineStatusBadge.tsx
├── VaccineStatusBadge.test.tsx
├── VaccineSummaryCards.tsx
└── VaccineSummaryCards.test.tsx
```

### Files to Modify

- `libs/api/features/src/lib/api-features.ts` — Add `VaccineModule` to `FeaturesModule.imports`
- `libs/frontend/features/src/lib/features.tsx` — Add `/vaccine-dashboard` route (lazy-loaded)
- `libs/frontend/ui/src/index.ts` — Export `VaccineStatusBadge`, `VaccineSummaryCards`
- `libs/shared/types/src/lib/schemas/vaccine.schema.ts` — Add dashboard query/response schemas
- `libs/shared/types/src/lib/schemas/index.ts` — Export new schemas

### Testing Standards

- Co-located tests: `*.spec.ts` (NestJS), `*.test.tsx` (React)
- NEVER use separate `__tests__/` directories
- Backend: mock `PrismaService`, test status computation logic, test guard enforcement
- Frontend: test component rendering, filter state changes, empty/loading/error states
- Accessibility: verify `aria-label` attributes, `role` attributes, semantic HTML

### Anti-Patterns to Avoid

- DO NOT store computed `VaccineStatus` in the database — compute at query time from `expiryDate`
- DO NOT query dogs without `WHERE clubId` — data breach risk
- DO NOT use `console.log` — use NestJS `Logger` with class context
- DO NOT create inline Zod schemas — use shared schemas from `@org/types`
- DO NOT skip the response envelope format `{ data, meta }`
- DO NOT implement CSV export (vax-dash-export) — marked V2
- DO NOT implement chat integration for contact owner — deferred to Epic 8
- DO NOT add new Prisma models or migrations — Dog and VaccineRecord already exist

### Cross-Story Dependencies

- **Depends on:** Stories 6.1 (Dog CRUD) and 6.2 (Vaccine Records) — dogs and vaccine records must exist in DB
- **Depends on:** Epic 1-2 (Auth + Guards) — JwtAuthGuard, ClubGuard, RolesGuard already implemented
- **Note:** This story can be developed in parallel with 6.1/6.2 if test data is seeded manually
- **Future:** Story 6.3 UI components (VaccineStatusBadge) will be reused in 6.1 and 6.2 dog list views

### Project Structure Notes

- Monorepo: Nx 22.6 with TypeScript composite projects
- Package manager: npm (use `npm exec nx` prefix for all Nx commands)
- Frontend build: Vite 7 with React 19
- Backend: NestJS 11 with Webpack
- Database: PostgreSQL via Neon with Prisma 7.5
- All paths follow existing `libs/{scope}/{library}` convention

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-6 — Story 6.3 acceptance criteria and BDD scenarios]
- [Source: _bmad-output/planning-artifacts/architecture.md — Technical stack, API patterns, security guards, testing standards]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — VaccineStatusBadge (UX-DR7), VaccineSummaryCards (UX-DR8), responsive layout, accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md — FR20, FR21 requirements]
- [Source: _bmad-output/C-UX-Scenarios/02-perrine-admin-day/02.3-vaccine-dashboard-admin/ — Page layout, object IDs, spacing, typography]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Dog (lines 168-186), VaccineRecord (lines 188-199), VaccineStatus enum (lines 28-32)]
- [Source: libs/frontend/features/src/lib/members/MemberDirectory.tsx — Reference implementation for dashboard pattern]
- [Source: libs/frontend/features/src/lib/members/hooks/useMembers.ts — Reference for React Query hook pattern]
- [Source: libs/api/features/src/lib/api-features.ts — Module registration pattern]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
