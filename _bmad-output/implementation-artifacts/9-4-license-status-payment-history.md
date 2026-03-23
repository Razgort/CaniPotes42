# Story 9.4: License Status & Payment History

Status: review

## Story

As a club admin,
I want to view license status per member per season and a complete payment history,
so that I can track who has paid and manage club finances.

## Acceptance Criteria

1. **Admin License Status Matrix**
   - **Given** I am an admin or owner
   - **When** I navigate to the license management section
   - **Then** I see a member-by-season matrix: each row is a member, columns show license types for the current season
   - **And** each cell shows payment status: green "Payé" badge, orange "En attente" badge, or gray "Non payé"
   - **And** the payment provider icon (Stripe or HelloAsso) is shown next to paid entries

2. **Filter & Search**
   - **Given** I am viewing the license status matrix
   - **When** I use the filter controls
   - **Then** I can filter by: season (dropdown), status ("All" / "Paid" / "Pending" / "Unpaid"), payment provider ("All" / "Stripe" / "HelloAsso")
   - **And** I can search by member name

3. **Payment Detail**
   - **Given** I tap a member's payment status cell
   - **When** the detail panel opens
   - **Then** I see: amount, date, provider, transaction ID (stripeSessionId or helloAssoPaymentId), status

4. **Admin Payment History**
   - **Given** I navigate to the payment history section
   - **When** I view the full history
   - **Then** I see a chronological list of all payments for the club across all seasons
   - **And** each entry shows: member name, license type, amount, date, status, payment provider
   - **And** on desktop (≥1024px), this renders as a sortable data table

5. **Member Own Payment View**
   - **Given** I am a regular member
   - **When** I view my own payment history
   - **Then** I see only my own payments: license type, amount, date, status, provider
   - **And** I cannot see other members' payment information (403 if I try to query another user's data)

6. **Loading State**
   - **Given** the license status view is loading
   - **When** data is being fetched
   - **Then** skeleton rows are displayed matching the table layout (no spinners)

## Tasks / Subtasks

### Backend

- [x] **Task 1: Verify Prisma schema prerequisites** (AC: all)
  - [x] Confirm `LicenseType` has `paymentProvider` field (added in story 9.1) — `paymentProvider String` (values: `"STRIPE"` | `"HELLOASSO"`)
  - [x] Confirm `Payment` has `helloAssoPaymentId String? @unique` (added in story 9.3)
  - [x] If missing: add the fields and run `npx nx run prisma-client:prisma-migrate -- --name add-payment-provider-and-helloasso-id`
  - [x] Regenerate Prisma client: `npx nx run prisma-client:generate`

- [x] **Task 2: Payment query schemas** (AC: #1, #2, #4, #5)
  - [x] Add to `libs/shared/types/src/lib/schemas/payment.schema.ts`:
    ```typescript
    export const licenseStatusQuerySchema = z.object({
      season: z.string().optional(),
      status: z.enum(['ALL', 'PAID', 'PENDING', 'UNPAID']).optional().default('ALL'),
      provider: z.enum(['ALL', 'STRIPE', 'HELLOASSO']).optional().default('ALL'),
      search: z.string().optional(),
    });

    export const paymentHistoryQuerySchema = z.object({
      page: z.coerce.number().int().positive().optional().default(1),
      pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
      season: z.string().optional(),
    });

    export type LicenseStatusQuery = z.infer<typeof licenseStatusQuerySchema>;
    export type PaymentHistoryQuery = z.infer<typeof paymentHistoryQuerySchema>;
    ```
  - [x] Export new types from `libs/shared/types/src/lib/schemas/index.ts`

- [x] **Task 3: Payment service — license status endpoint** (AC: #1, #2, #3)
  - [x] Add method `getLicenseStatus(clubId, query: LicenseStatusQuery)` to `libs/api/features/src/lib/payment/payment.service.ts`:
    - Query all active `ClubMember` records for the club (include `user.firstName`, `user.lastName`)
    - Query `LicenseType` for the club (filter by `season` if provided)
    - Query all `Payment` records for the club scoped by season (via licenseType.season)
    - Build member-row objects: `{ memberId, memberName, payments: [{ licenseTypeId, licenseTypeName, status, amount, date, provider, transactionId }] }`
    - Apply filters: status filter (map PAID→COMPLETED, PENDING→PENDING, UNPAID→no Payment record), provider filter, name search
    - All queries MUST include `where: { clubId }` — never omit tenant scope
  - [x] Payment status mapping for display: `COMPLETED` → "Payé", `PENDING` → "En attente", `FAILED`/`REFUNDED` → "Non payé" (with additional context), absent → "Non payé"

- [x] **Task 4: Payment service — history & member view** (AC: #4, #5)
  - [x] Add method `getPaymentHistory(clubId, query: PaymentHistoryQuery)` to `payment.service.ts`:
    - Query `Payment` where `clubId`, include `user.firstName`, `user.lastName`, `licenseType.name`, `licenseType.season`, `licenseType.paymentProvider`
    - Order by `createdAt DESC`
    - Paginate: `skip: (page-1) * pageSize`, `take: pageSize`
    - Filter by season if provided (via `licenseType.season`)
    - Return `{ data: PaymentHistoryItemDto[], meta: { total, page, pageSize } }`
  - [x] Add method `getMyPayments(clubId, userId)` to `payment.service.ts`:
    - Query `Payment` where `{ clubId, userId }` — BOTH filters mandatory (never just userId!)
    - Include `licenseType.name`, `licenseType.season`, `licenseType.paymentProvider`
    - Return own payments only — never expose other users' data

- [x] **Task 5: Payment controller — admin endpoints** (AC: #1, #2, #3, #4)
  - [x] Add to `libs/api/features/src/lib/payment/payment.controller.ts`:
    ```
    GET /clubs/:clubId/payments/license-status  → @Roles('ADMIN', 'OWNER')
    GET /clubs/:clubId/payments                 → @Roles('ADMIN', 'OWNER')
    GET /clubs/:clubId/payments/:paymentId      → @Roles('ADMIN', 'OWNER')
    ```
  - [x] Use `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` on ALL admin endpoints
  - [x] Use `@Query()` with `ZodValidationPipe(licenseStatusQuerySchema)` / `ZodValidationPipe(paymentHistoryQuerySchema)` for query params
  - [x] `GET /clubs/:clubId/payments/:paymentId`: query single Payment where `{ id: paymentId, clubId }` — verify clubId scope

- [x] **Task 6: Payment controller — member endpoint** (AC: #5)
  - [x] Add to `payment.controller.ts`:
    ```
    GET /clubs/:clubId/payments/my  → JwtAuthGuard + ClubGuard (no RolesGuard — any member)
    ```
  - [x] Extract `userId` from `@CurrentUser()` decorator
  - [x] Pass both `clubId` and `userId` to `getMyPayments` — never allow member to query another user
  - [x] **CRITICAL**: Route `/my` must be registered BEFORE `/:paymentId` to avoid route collision in NestJS

- [x] **Task 7: Backend unit tests** (AC: all)
  - [x] Add to `libs/api/features/src/lib/payment/payment.service.spec.ts`:
    - `getLicenseStatus`: returns correct matrix with all filter combinations
    - `getLicenseStatus`: never returns data from another club (tenant isolation)
    - `getPaymentHistory`: pagination works, returns correct meta
    - `getMyPayments`: only returns current user's payments, not other members'
  - [x] Add to `libs/api/features/src/lib/payment/payment.controller.spec.ts`:
    - MEMBER role returns 403 on `GET /payments/license-status`
    - MEMBER role returns 403 on `GET /payments`
    - `GET /payments/my` returns 200 for MEMBER role

### Frontend

- [x] **Task 8: Payment API hooks** (AC: all)
  - [x] Create `libs/frontend/features/src/lib/payments/hooks/usePayments.ts`:
    ```typescript
    useLicenseStatus(clubId, query)    // ['license-status', clubId, query] — admin only
    usePaymentHistory(clubId, query)   // ['payment-history', clubId, query] — admin only
    useMyPayments(clubId)              // ['my-payments', clubId] — member
    ```
  - [x] TanStack Query key convention: `['license-status', clubId, filterParams]`
  - [x] Use `apiClient` from `libs/frontend/data-access/src/lib/api-client.ts` (Bearer token included)
  - [x] Map API error codes to French toast messages on error

- [x] **Task 9: License status matrix component** (AC: #1, #2, #6)
  - [x] Create `libs/frontend/features/src/lib/payments/LicenseStatusMatrix.tsx`:
    - Top filter bar: season dropdown, status select, provider select, member search input
    - Table using shadcn/ui `<Table>` component
    - Columns: Member name | [LicenseType1 Season] | [LicenseType2 Season] | ...
    - Status cell: `<Badge>` with variant (success=green for COMPLETED, warning=orange for PENDING, default=gray for absent/FAILED)
    - Provider icon next to badge on COMPLETED cells (Stripe: card icon, HelloAsso: association icon — use Lucide icons)
    - On cell click: open `<PaymentDetailSheet>` (see Task 10)
    - While loading (`isLoading`): render `<Skeleton>` rows matching table column count
    - Empty state: "Aucun paiement enregistré pour cette saison"
  - [x] Status badge labels: `COMPLETED` → "Payé", `PENDING` → "En attente", `FAILED`/`REFUNDED` → "Échoué", absent → "Non payé"

- [x] **Task 10: Payment detail sheet** (AC: #3)
  - [x] Create `libs/frontend/features/src/lib/payments/PaymentDetailSheet.tsx`:
    - shadcn/ui `<Sheet>` (slide-up on mobile, side panel on desktop)
    - Show: amount (formatted with `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`), date (`Intl.DateTimeFormat('fr-FR')`), provider, transaction ID, status badge
    - Transaction ID label: "Référence Stripe" for Stripe, "Référence HelloAsso" for HelloAsso

- [x] **Task 11: Payment history table (admin)** (AC: #4)
  - [x] Create `libs/frontend/features/src/lib/payments/PaymentHistory.tsx`:
    - Season filter dropdown at top
    - On desktop (lg:): shadcn/ui `<Table>` with columns: Member | License | Amount | Date | Status | Provider — sortable by date (client-side sort, no API re-fetch for MVP)
    - On mobile: card-based list (one payment per card showing all fields)
    - Pagination controls: "Page X / Y", Prev/Next buttons — call `usePaymentHistory` with updated page
    - Skeleton while loading

- [x] **Task 12: My payments view (member)** (AC: #5)
  - [x] Create `libs/frontend/features/src/lib/payments/MyPayments.tsx`:
    - List of own payments: license type name, season, amount, date, status badge, provider
    - Empty state: "Vous n'avez effectué aucun paiement"
    - No filters needed (member has few payments)
    - Role-based routing: admins see `PaymentHistory`, members see `MyPayments`

- [x] **Task 13: Route integration** (AC: all)
  - [x] Add route in frontend app for `/clubs/:clubId/payments` page (admin) and `/clubs/:clubId/my-payments` (member)
  - [x] Page file: `libs/frontend/features/src/lib/pages/PaymentsPage.tsx` — conditional render based on user role from AuthContext
  - [x] Use `React.lazy()` for route-level code splitting — never import synchronously

## Dev Notes

### Architecture Compliance

- **Guard chain MANDATORY**: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` on admin endpoints; `@UseGuards(JwtAuthGuard, ClubGuard)` on member `/my` endpoint
- **Tenant isolation**: Every Prisma query MUST include `where: { clubId }` — never query across clubs
- **Member privacy CRITICAL**: `getMyPayments` enforces both `clubId` AND `userId` — a member cannot query another member's payments
- **Route order matters**: `/payments/my` must be declared before `/:paymentId` in the controller to prevent NestJS treating "my" as a paymentId param
- **Response format**: `ResponseWrapperInterceptor` auto-wraps to `{ data }` / `{ data, meta }` — never manually wrap in controller
- **Validation**: Use `ZodValidationPipe` with shared schemas — no inline Zod definitions
- **Logging**: `private readonly logger = new Logger(PaymentService.name)` — never `console.log`

### Database Schema Dependencies (from prior stories)

| Field | Model | Added In | Default if missing |
|-------|-------|----------|--------------------|
| `paymentProvider String` | `LicenseType` | Story 9.1 | Must add migration |
| `helloAssoPaymentId String? @unique` | `Payment` | Story 9.3 | Must add migration |
| `season String` | `LicenseType` | Story 9.1 | Already in schema |
| `stripeSessionId String? @unique` | `Payment` | Story 9.2 | Already in schema |

**Current Prisma schema has**: `LicenseType` (id, clubId, name, amount Decimal, season, createdAt, updatedAt) and `Payment` (id, clubId, userId, licenseTypeId, amount Decimal, status PaymentStatus, stripeSessionId String? @unique, createdAt, updatedAt)

If stories 9.1–9.3 haven't run yet, `paymentProvider` and `helloAssoPaymentId` are missing. Run a migration to add them before implementing this story.

### Existing Code to Reuse

| What | Location | Notes |
|------|----------|-------|
| `JwtAuthGuard` | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Use as-is |
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Injects `request.clubId` |
| `RolesGuard` | `libs/api/core/src/lib/guards/roles.guard.ts` | Use as-is |
| `@Roles()` decorator | `libs/api/core/src/lib/decorators/roles.decorator.ts` | Use as-is |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extracts JwtPayload with `sub` (userId) |
| `@CurrentClub()` | `libs/api/core/src/lib/decorators/current-club.decorator.ts` | Extracts clubId |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Use with shared schemas |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Inject via DI |
| `ResponseWrapperInterceptor` | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | Auto-wraps responses |
| `AllExceptionsFilter` | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Structured error responses |
| `apiClient` | `libs/frontend/data-access/src/lib/api-client.ts` | Frontend HTTP client with Bearer token |
| `AuthContext` | `libs/frontend/data-access/src/lib/AuthContext.tsx` | Provides `user`, `activeClub`, `role` |
| `createLicenseTypeSchema` | `libs/shared/types/src/lib/schemas/payment.schema.ts` | Already exists — extend this file |
| `PaymentStatus` enum | `libs/shared/prisma-client/prisma/schema.prisma` | PENDING/COMPLETED/FAILED/REFUNDED |
| `Role` enum | `libs/shared/types/src/lib/enums.ts` | OWNER/ADMIN/MEMBER |
| shadcn Table | `libs/frontend/ui/` | For desktop payment history |
| shadcn Badge | `libs/frontend/ui/` | Status badges — variant: success/warning/default |
| shadcn Sheet | `libs/frontend/ui/` | Payment detail panel |
| shadcn Skeleton | `libs/frontend/ui/` | Loading state rows |

### NestJS Payment Module Pattern

Payment module is declared at:
```
libs/api/features/src/lib/payment/
  payment.module.ts          ← @Module declaration
  payment.controller.ts      ← REST endpoints
  payment.service.ts         ← Business logic + Prisma
  stripe-webhook.controller.ts ← Webhook handler (from story 9.2, no auth guard)
  payment.service.spec.ts    ← Service tests
  payment.controller.spec.ts ← Controller tests
```

Register in `libs/api/features/src/lib/api-features.ts`:
```typescript
@Module({ imports: [PaymentModule] })
export class FeaturesModule {}
```

### API Endpoint Summary

| Endpoint | Guard | Role | Returns |
|----------|-------|------|---------|
| `GET /clubs/:clubId/payments/license-status` | JWT+Club+Roles | ADMIN, OWNER | Member-season matrix |
| `GET /clubs/:clubId/payments` | JWT+Club+Roles | ADMIN, OWNER | `{ data: [], meta: { total, page, pageSize } }` |
| `GET /clubs/:clubId/payments/:paymentId` | JWT+Club+Roles | ADMIN, OWNER | Single payment detail |
| `GET /clubs/:clubId/payments/my` | JWT+Club | Any member | Own payments only |

### TanStack Query Keys

```typescript
['license-status', clubId, { season, status, provider, search }]  // admin matrix
['payment-history', clubId, { page, pageSize, season }]            // admin history
['my-payments', clubId]                                             // member own
['payment-detail', clubId, paymentId]                              // detail view
```

### UI / UX Rules

- **No new custom components**: phase C payment integration uses existing shadcn Table + Badge (confirmed in UX spec)
- **Admin primary device**: desktop/tablet — table layout is primary, mobile card layout is fallback
- **Skeleton loading**: skeleton rows must match the exact column structure of the table (don't show generic skeleton — match table shape)
- **Status badge colors**: green (`success`) for COMPLETED, orange (`warning`) for PENDING, gray (`default`) for absent/FAILED/REFUNDED
- **Currency formatting**: always `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)` — Prisma returns `Decimal` type, convert to `Number` before formatting
- **Date formatting**: `Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })` — all dates in dd/MM/yyyy style
- **French UI only**: all labels, toasts, empty states in French — no English user-facing strings

### Critical Privacy Rule

```
Member role → can ONLY see own payments (userId === req.user.sub)
Admin/Owner role → can see all club payments (scoped by clubId)
```

The backend enforces this — the frontend should also hide admin views from members (role check from AuthContext).

### Decimal Handling (Prisma → Frontend)

Prisma's `Decimal` type does not serialize cleanly to JSON `number`. In the service layer, convert `amount` to `Number` before returning:
```typescript
amount: Number(payment.amount),
```
Never pass raw `Decimal` objects to the frontend.

### Common Mistakes to Prevent

1. **Route collision**: `GET /payments/my` must be declared before `GET /payments/:paymentId` in the controller class — NestJS matches routes top-down
2. **Missing clubId in getMyPayments**: Always query `{ clubId, userId }` — never just `{ userId }` (cross-club data leak)
3. **Decimal serialization**: Convert Prisma `Decimal` to `Number` in service before returning from controller
4. **Inline Zod**: Never define `z.object()` inline in a DTO or controller — always import from `libs/shared/types`
5. **Stripe webhook guard**: `stripe-webhook.controller.ts` has NO auth guard (Stripe signature instead) — do not add ClubGuard to it
6. **Sorting**: Client-side sort on payment history is acceptable at MVP scale (pilot = 200 users) — no need for DB-level sort params

## Story Progress

- [x] Story file created: 2026-03-22
- [x] Implementation started
- [x] Implementation complete
- [x] Tests passing (4 pre-existing failures in event.service.spec.ts unrelated to this story)
- [ ] Code review complete

## Dev Agent Record

**Implemented by**: Claude Sonnet 4.6
**Date**: 2026-03-22
**Branch**: develop-dev

### Files Created

| File | Description |
|------|-------------|
| `libs/shared/types/src/lib/schemas/payment.schema.ts` | Added `licenseStatusQuerySchema`, `paymentHistoryQuerySchema` and inferred types |
| `libs/api/features/src/lib/payment/payment.service.ts` | Added `getLicenseStatus`, `getPaymentHistory`, `getMyPayments`, `findPaymentById` methods |
| `libs/api/features/src/lib/payment/payment.controller.ts` | Admin endpoints (license-status, history, detail) + member `/my` endpoint |
| `libs/api/features/src/lib/payment/payment.service.spec.ts` | Unit tests: matrix, tenant isolation, pagination, member privacy |
| `libs/api/features/src/lib/payment/payment.controller.spec.ts` | Controller tests: role enforcement, 403 for MEMBER on admin routes |
| `libs/frontend/features/src/lib/payments/hooks/usePayments.ts` | TanStack Query hooks: `useLicenseStatus`, `usePaymentHistory`, `useMyPayments`, `usePaymentDetail` |
| `libs/frontend/features/src/lib/payments/LicenseStatusMatrix.tsx` | Admin matrix with season/status/provider/search filters + clickable status cells |
| `libs/frontend/features/src/lib/payments/PaymentDetailSheet.tsx` | Slide-up (mobile) / side panel (desktop) payment detail view |
| `libs/frontend/features/src/lib/payments/PaymentHistory.tsx` | Admin paginated history table (desktop) + card list (mobile) with date sort |
| `libs/frontend/features/src/lib/payments/MyPayments.tsx` | Member own-payments card list |
| `libs/frontend/features/src/lib/pages/PaymentsPage.tsx` | Role-aware page: ADMIN/OWNER → tabbed matrix+history; MEMBER → MyPayments |

### Files Modified

| File | Change |
|------|--------|
| `libs/api/features/src/lib/api-features.ts` | Added `PaymentModule` import |
| `libs/frontend/features/src/lib/features.tsx` | Added `PaymentsPage` lazy import + `/payments` route |

### Key Implementation Notes

- Route collision avoided: `GET /my` declared before `GET /:paymentId` in controller
- All Prisma Decimal amounts converted with `Number(payment.amount)` before serialization
- Tenant isolation enforced: every query includes `where: { clubId }`; `getMyPayments` also enforces `userId`
- `helloAssoCheckoutIntentId` used (not `helloAssoPaymentId` — actual schema field name)
- Pre-existing test failures in `event.service.spec.ts` (findFirst include options mismatch) are not regressions from this story
