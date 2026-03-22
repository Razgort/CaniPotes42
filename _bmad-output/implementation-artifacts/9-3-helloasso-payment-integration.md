# Story 9.3: HelloAsso Payment Integration

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a club member,
I want to pay for a license via HelloAsso,
so that I can pay my club fees through the standard French association payment platform.

## Acceptance Criteria

1. **Given** I am a member and a license type is configured with HelloAsso as payment provider, **When** I tap "Pay" on a license type, **Then**:
   - The frontend calls `POST /clubs/:clubId/payments/helloasso/initiate` with `{ licenseTypeId }`
   - The API creates a HelloAsso checkout intent via `POST /v5/organizations/{orgSlug}/checkout-intents` with: `totalAmount` (in cents), `itemName`, `backUrl`, `returnUrl`, `containsDonation: false`, `metadata: { userId, clubId, licenseTypeId }`
   - A `Payment` record is created with `status = PENDING` and `helloAssoCheckoutIntentId` stored
   - I am redirected to the HelloAsso-hosted checkout page (`redirectUrl` from the response)

2. **Given** I complete payment on HelloAsso's page, **When** HelloAsso redirects me to the `returnUrl`, **Then**:
   - I see a confirmation page: "Paiement en cours de confirmation"
   - The existing `Payment` record has `status = PENDING` and `helloAssoCheckoutIntentId` set

3. **Given** HelloAsso sends a payment webhook notification, **When** the API receives `POST /payments/webhooks/helloasso`, **Then**:
   - The handler verifies the `Content-Signature` header using HMAC-SHA256 with `HELLOASSO_WEBHOOK_SECRET`
   - For `eventType = "Payment"` with `data.state = "Authorized"`: the `Payment` record is updated to `status = COMPLETED` with `paymentDate = now()`
   - The member's license status for that season is updated (license becomes "Paid")
   - The handler is idempotent — duplicate webhooks for the same `helloAssoCheckoutIntentId` do not create duplicate records or double-update

4. **Given** the payment fails or is cancelled on HelloAsso, **When** HelloAsso sends a webhook with `data.state` indicating failure/cancellation, **Then**:
   - The `Payment` record is updated to `status = FAILED`
   - The member sees their license as "Unpaid" with an option to retry

5. **Given** the HelloAsso API is unavailable (network error, 5xx), **When** the initiation request fails, **Then**:
   - An error toast is shown: "Le service HelloAsso est temporairement indisponible — réessayez plus tard"
   - No `Payment` record is created
   - The Stripe option remains available if the club has a Stripe-configured license type

6. **Given** a club has both Stripe and HelloAsso license types, **When** a member views available licenses, **Then**:
   - Each license type shows a provider-specific button: "Payer par carte" (Stripe) vs "Payer via HelloAsso" (HelloAsso)
   - Payment provider is indicated on each license type card

## Tasks / Subtasks

### Schema & Shared Types

- [ ] **Task 1: Extend Prisma schema for HelloAsso and multi-provider support** (AC: #1, #2)
  - [ ] Add `PaymentProvider` enum to `schema.prisma`: `enum PaymentProvider { STRIPE HELLOASSO }`
  - [ ] Add `paymentProvider PaymentProvider` field to `LicenseType` model (required — no default, admin must choose)
  - [ ] Add `helloAssoCheckoutIntentId String? @unique` field to `Payment` model
  - [ ] Add `paymentDate DateTime?` field to `Payment` model (set on COMPLETED webhook)
  - [ ] Sync `PaymentStatus.REFUNDED` into Prisma schema (already in TypeScript enum in `enums.ts` but missing from `schema.prisma` — add it)
  - [ ] Run migration: `npx nx run prisma-client:prisma-migrate --name add_helloasso_payment_fields`
  - [ ] Verify: after migration, both `stripeSessionId` and `helloAssoCheckoutIntentId` are unique-indexed, allowing a `Payment` to belong to either provider

- [ ] **Task 2: Update shared Zod schemas** (AC: #1)
  - [ ] Add `PaymentProvider` enum export to `libs/shared/types/src/lib/enums.ts`: `export enum PaymentProvider { STRIPE = 'STRIPE', HELLOASSO = 'HELLOASSO' }`
  - [ ] Update `createLicenseTypeSchema` in `libs/shared/types/src/lib/schemas/payment.schema.ts` to include `paymentProvider: z.nativeEnum(PaymentProvider)`
  - [ ] Add `initiateHelloAssoPaymentSchema`: `z.object({ licenseTypeId: z.string().uuid() })` (same shape as Stripe initiation — reuse `initiatePaymentSchema` by renaming or keep both)
  - [ ] Add `helloAssoWebhookSchema` for webhook payload validation
  - [ ] Export all new types from `libs/shared/types/src/lib/schemas/index.ts`

- [ ] **Task 3: Add HelloAsso env vars** (AC: #1)
  - [ ] Add to `libs/shared/utils/src/lib/env.schema.ts`:
    ```typescript
    HELLOASSO_CLIENT_ID: z.string().optional(),
    HELLOASSO_CLIENT_SECRET: z.string().optional(),
    HELLOASSO_ORG_SLUG: z.string().optional(),
    HELLOASSO_BASE_URL: z.string().url().default('https://api.helloasso-sandbox.com'),
    HELLOASSO_WEBHOOK_SECRET: z.string().optional(),
    ```
  - [ ] Add commented entries to `.env.example`:
    ```
    # HelloAsso Payment Integration
    # HELLOASSO_CLIENT_ID=          ← From HelloAsso developer portal
    # HELLOASSO_CLIENT_SECRET=      ← From HelloAsso developer portal
    # HELLOASSO_ORG_SLUG=           ← Your HelloAsso organization slug
    # HELLOASSO_BASE_URL=https://api.helloasso-sandbox.com  ← Use sandbox for dev
    # HELLOASSO_WEBHOOK_SECRET=     ← HMAC secret for webhook signature verification
    ```

### Backend Tasks

- [ ] **Task 4: Create `HelloAssoService`** (AC: #1, #3, #4, #5)
  - [ ] Create `libs/api/features/src/lib/payment/helloasso.service.ts`
  - [ ] Inject `ConfigService` to read `HELLOASSO_*` env vars
  - [ ] Implement `getAccessToken()`: `POST {HELLOASSO_BASE_URL}/oauth2/token` with `grant_type=client_credentials`, `client_id`, `client_secret`. Cache token in memory with expiry. Return `access_token`.
  - [ ] Implement `createCheckoutIntent(params)`: authenticated `POST /v5/organizations/{orgSlug}/checkout-intents` — request body:
    ```json
    {
      "totalAmount": <amountInCents>,
      "initialAmount": <amountInCents>,
      "itemName": "<licenseTypeName>",
      "backUrl": "<FRONTEND_URL>/payments/cancel",
      "returnUrl": "<FRONTEND_URL>/payments/return?provider=helloasso",
      "containsDonation": false,
      "metadata": { "userId": "...", "clubId": "...", "licenseTypeId": "..." }
    }
    ```
  - [ ] `createCheckoutIntent` returns `{ id: string, redirectUrl: string }` — `redirectUrl` is where to send the user
  - [ ] Implement `verifyWebhookSignature(payload: string, signature: string): boolean` — HMAC-SHA256 with `HELLOASSO_WEBHOOK_SECRET`
  - [ ] All HTTP calls use native `fetch` (Node 18+ built-in) — no additional HTTP client lib
  - [ ] On network error or non-2xx: throw `ServiceUnavailableException('Le service HelloAsso est temporairement indisponible — réessayez plus tard')`
  - [ ] Create `libs/api/features/src/lib/payment/helloasso.service.spec.ts` — mock fetch, test token caching, checkout intent creation, webhook verification

- [ ] **Task 5: Create `PaymentService`** (AC: #1, #2, #3, #4, #5)
  - [ ] Create `libs/api/features/src/lib/payment/payment.service.ts`
  - [ ] Inject `PrismaService` and `HelloAssoService`
  - [ ] Implement `initiateHelloAssoPayment(userId: string, clubId: string, licenseTypeId: string)`:
    - Load `LicenseType` (scoped by `clubId`), verify `paymentProvider === 'HELLOASSO'`
    - Call `HelloAssoService.createCheckoutIntent(...)` — `totalAmount` = `licenseType.amount * 100` (convert euros to cents)
    - Create `Payment` record: `{ userId, clubId, licenseTypeId, amount: licenseType.amount, status: PENDING, helloAssoCheckoutIntentId: checkoutIntent.id }`
    - Return `{ redirectUrl: checkoutIntent.redirectUrl }`
    - **Idempotency**: check if a PENDING `Payment` for this user+licenseType already exists — if so, re-initiate a new checkout intent and update the existing record's `helloAssoCheckoutIntentId` (don't create duplicates)
  - [ ] Implement `handleHelloAssoWebhook(payload: HelloAssoWebhookPayload)`:
    - Extract `checkoutIntentId` from `payload.data.checkoutIntentId`
    - Find `Payment` by `helloAssoCheckoutIntentId` — throw `NotFoundException` if not found (log and ignore in controller)
    - If `payload.eventType === 'Payment'` and `payload.data.state === 'Authorized'`:
      - Update `Payment`: `status = COMPLETED`, `paymentDate = now()`
      - **Do NOT update if already COMPLETED** (idempotency)
    - If `payload.data.state === 'Refused'` or `'Refunded'`:
      - Update `Payment`: `status = FAILED` (or `REFUNDED`)
    - Wrap both updates in `prisma.$transaction` with the Payment update
  - [ ] Create `libs/api/features/src/lib/payment/payment.service.spec.ts`

- [ ] **Task 6: Create `PaymentController`** (AC: #1, #3, #5, #6)
  - [ ] Create `libs/api/features/src/lib/payment/payment.controller.ts`
  - [ ] `POST /clubs/:clubId/payments/helloasso/initiate` — `@UseGuards(JwtAuthGuard, ClubGuard)`, role: any authenticated member. Body: `initiateHelloAssoPaymentSchema`. Returns `{ data: { redirectUrl } }`
  - [ ] `POST /payments/webhooks/helloasso` — **public endpoint** (no JWT guard — HelloAsso cannot send auth tokens). Raw body parsing needed for signature verification:
    - Use `@Body()` with raw buffer: add `{ bodyParser: false }` to this route or use NestJS RawBodyParser
    - Verify `Content-Signature` header before parsing JSON
    - Return `200 OK` immediately — HelloAsso expects fast ack
    - On signature failure: return `401` and log warning (do NOT throw — return explicit response)
  - [ ] `GET /clubs/:clubId/payments/licenses` — `@UseGuards(JwtAuthGuard, ClubGuard)`. Returns list of `LicenseType` records for the club with their `paymentProvider`, member's current payment status for each. Query key: `['licenses', clubId]`
  - [ ] Create `libs/api/features/src/lib/payment/payment.controller.spec.ts`

- [ ] **Task 7: Create `PaymentModule` and register** (AC: all)
  - [ ] Create `libs/api/features/src/lib/payment/payment.module.ts`
    - Imports: `PrismaModule` (or `CoreModule`), `ConfigModule`
    - Providers: `PaymentService`, `HelloAssoService`
    - Controllers: `PaymentController`
  - [ ] Create DTOs in `libs/api/features/src/lib/payment/dto/`:
    - `initiate-helloasso-payment.dto.ts` — imports `initiateHelloAssoPaymentSchema`
    - `helloasso-webhook.dto.ts` — typed webhook payload DTO
  - [ ] Register `PaymentModule` in `libs/api/features/src/lib/api-features.ts` (or `FeaturesModule`)

### Frontend Tasks

- [ ] **Task 8: Create `LicenseList` component** (AC: #1, #6)
  - [ ] Create `libs/frontend/features/src/lib/payments/LicenseList.tsx`
  - [ ] Fetches `GET /clubs/:clubId/payments/licenses` via TanStack Query hook `useLicenses`
  - [ ] Renders each license type as a card with: name, amount (formatted as `XX,XX €`), season, payment provider button
  - [ ] Provider-specific buttons:
    - Stripe: `<Button>Payer par carte</Button>` (calls Stripe initiation — defer to story 9.2 wiring)
    - HelloAsso: `<Button variant="outline">Payer via HelloAsso</Button>` with HelloAsso logo/icon if available
  - [ ] Uses existing `Badge` (shadcn/ui) for payment status: green "Payé", orange "En attente", gray "Non payé"
  - [ ] On HelloAsso button click: call `useInitiateHelloAssoPayment` mutation → on success, `window.location.href = redirectUrl` (full page redirect to HelloAsso)
  - [ ] On initiation error: toast "Le service HelloAsso est temporairement indisponible — réessayez plus tard"
  - [ ] Skeleton loading state using `<Skeleton>` (shadcn/ui) — matches card layout (per UX spec)
  - [ ] **No new custom UI components** — per UX spec Phase C: "No new custom components — license status uses existing Badge"

- [ ] **Task 9: Create `PaymentReturn` page** (AC: #2)
  - [ ] Create `libs/frontend/features/src/lib/payments/PaymentReturn.tsx`
  - [ ] Route: `/payments/return` (add to `apps/frontend/src/app/app.tsx` as lazy-loaded route)
  - [ ] Reads `?provider=helloasso` query param to confirm HelloAsso origin
  - [ ] Displays: "Paiement en cours de confirmation" with a spinner/info icon
  - [ ] Explains webhook delay: "Votre paiement sera confirmé dans quelques instants. Vous recevrez une confirmation."
  - [ ] Button: "Retour à mes licences" → navigate to `/payments`
  - [ ] Also create `PaymentCancel.tsx` for `/payments/cancel` — simple "Paiement annulé" page with retry button

- [ ] **Task 10: Create TanStack Query hooks** (AC: #1, #6)
  - [ ] Create `libs/frontend/features/src/lib/payments/hooks/useLicenses.ts`
    - `useLicenses(clubId)`: `GET /clubs/:clubId/payments/licenses`, query key: `['licenses', clubId]`
  - [ ] Create `libs/frontend/features/src/lib/payments/hooks/useHelloAssoPayment.ts`
    - `useInitiateHelloAssoPayment()`: mutation for `POST /clubs/:clubId/payments/helloasso/initiate`
    - On success: redirect via `window.location.href`
    - On error: extract French error message and show toast
  - [ ] Wire hooks into `LicenseList.tsx`

- [ ] **Task 11: Add payments route** (AC: #1, #6)
  - [ ] Verify `apps/frontend/src/app/routes/payments.tsx` exists (defined in architecture project structure) — create if not
  - [ ] Import `LicenseList` lazily; wrap with `<Suspense>` and skeleton fallback
  - [ ] Add route `/payments` to `apps/frontend/src/app/app.tsx` behind auth guard
  - [ ] Add lazy routes for `/payments/return` and `/payments/cancel`

## Dev Notes

### Critical Dependency: Stories 9.1 and 9.2 Must Be Done First

**Story 9.1** creates the `LicenseType` model (with `paymentProvider` field after Task 1 below) and the admin UI for configuring license types. Without it, there are no `LicenseType` records to pay for.

**Story 9.2** establishes the `payment` module structure (PaymentModule, PaymentController, PaymentService). If 9.2 is not done, this story must create the entire module from scratch. If 9.2 is done, extend the existing module — **do NOT create a duplicate module**.

> **Before implementing 9.3**: Check if `libs/api/features/src/lib/payment/` exists. If yes, extend it. If no, create it as the base for both Stripe (9.2) and HelloAsso (9.3) — but keep them separate services (`stripe.service.ts` and `helloasso.service.ts`).

### Critical Schema Gaps

The current Prisma schema (`libs/shared/prisma-client/prisma/schema.prisma`) is missing several fields required for this story:

**`LicenseType` model** — missing `paymentProvider`:
```prisma
model LicenseType {
  id              String          @id @default(uuid())
  clubId          String
  name            String
  amount          Decimal
  season          String
  paymentProvider PaymentProvider // ADD THIS
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  club     Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  payments Payment[]

  @@index([clubId])
}
```

**`Payment` model** — missing `helloAssoCheckoutIntentId` and `paymentDate`:
```prisma
model Payment {
  id                       String        @id @default(uuid())
  clubId                   String
  userId                   String
  licenseTypeId            String
  amount                   Decimal
  status                   PaymentStatus @default(PENDING)
  stripeSessionId          String?       @unique  // existing
  helloAssoCheckoutIntentId String?      @unique  // ADD THIS
  paymentDate              DateTime?               // ADD THIS
  createdAt                DateTime      @default(now())
  updatedAt                DateTime      @updatedAt
  ...
}
```

**New `PaymentProvider` enum** and **`PaymentStatus.REFUNDED`** in Prisma schema:
```prisma
enum PaymentProvider {
  STRIPE
  HELLOASSO
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED  // Already in TypeScript enum (enums.ts) — must be added to Prisma schema too
}
```

**Migration command:**
```bash
npx nx run prisma-client:prisma-migrate --name add_payment_provider_and_helloasso
```

### HelloAsso API Technical Specification

**Authentication** — OAuth2 client_credentials:
```
POST {HELLOASSO_BASE_URL}/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}
```
Response: `{ access_token, token_type, expires_in, refresh_token }`. Cache token; refresh before expiry using `refresh_token`.

**Create Checkout Intent:**
```
POST {HELLOASSO_BASE_URL}/v5/organizations/{orgSlug}/checkout-intents
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "totalAmount": 2500,          // cents — €25.00 → 2500
  "initialAmount": 2500,
  "itemName": "Licence annuelle 2025-2026",
  "backUrl": "{FRONTEND_URL}/payments/cancel",
  "returnUrl": "{FRONTEND_URL}/payments/return?provider=helloasso&intentId={checkoutIntentId}",
  "containsDonation": false,
  "metadata": "userId={userId}&clubId={clubId}&licenseTypeId={licenseTypeId}"
}
```
Response:
```json
{
  "id": "uuid",
  "redirectUrl": "https://www.helloasso.com/associations/{orgSlug}/checkout-intents/{id}"
}
```
Redirect user to `redirectUrl`.

**Sandbox vs Production:**
- Sandbox: `https://api.helloasso-sandbox.com` — use in development (`NODE_ENV !== 'production'`)
- Production: `https://api.helloasso.com`
- Both use the same API structure

**Webhook Payload (simplified):**
```json
{
  "eventType": "Payment",
  "data": {
    "id": 12345,
    "checkoutIntentId": "uuid",
    "amount": 2500,
    "state": "Authorized",   // "Authorized" | "Refused" | "Refunded"
    "date": "2026-03-22T10:00:00Z",
    "payer": { "email": "user@example.com" }
  }
}
```

**Webhook Signature Verification (`Content-Signature` header):**
```typescript
import * as crypto from 'crypto';

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}
```
The `Content-Signature` header value is the hex-encoded HMAC-SHA256 of the raw request body.

**Raw Body Access for Webhook:**

NestJS parses JSON by default, destroying the raw body needed for HMAC verification. Use one of:
- Option A (preferred): Enable `rawBody: true` in `NestFactory.create(AppModule, { rawBody: true })` in `apps/api/src/main.ts`, then inject `@RawBody()` in the webhook endpoint.
- Option B: Use a custom middleware that stores the raw body before JSON parsing.

Ensure the `POST /payments/webhooks/helloasso` route uses `RawBodyRequest` type.

### Existing Code to Reuse

| What | Where | How to Use |
|---|---|---|
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Injects `request.clubId` — use on all club-scoped endpoints |
| `RolesGuard` + `@Roles()` | `libs/api/core/src/lib/guards/roles.guard.ts` + `decorators/roles.decorator.ts` | Add `@Roles('ADMIN', 'OWNER')` only on admin license endpoints |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extract `userId` from JWT payload |
| `@CurrentClub()` | `libs/api/core/src/lib/decorators/current-club.decorator.ts` | Extract `clubId` from request context |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Apply to `initiateHelloAssoPaymentSchema` DTO |
| `ResponseWrapperInterceptor` | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | Auto-wraps `{ data }` envelope |
| `AllExceptionsFilter` | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Handles structured error responses |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Inject in `PaymentService` |
| `PaymentStatus` enum | `libs/shared/types/src/lib/enums.ts` | `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` |
| `initiatePaymentSchema` | `libs/shared/types/src/lib/schemas/payment.schema.ts` | Base shape for initiation — can reuse for HelloAsso |
| `ConfigService` | `@nestjs/config` (already in stack) | Read `HELLOASSO_*` env vars |

### Project Structure Notes

Follow the established NestJS module pattern exactly:

```
libs/api/features/src/lib/
  payment/
    payment.module.ts
    payment.controller.ts          ← Both Stripe and HelloAsso endpoints
    payment.service.ts             ← Business logic (Payment records, license status)
    stripe.service.ts              ← Stripe-specific API calls (story 9.2)
    helloasso.service.ts           ← HelloAsso-specific API calls (this story)
    dto/
      initiate-helloasso-payment.dto.ts
      helloasso-webhook.dto.ts
    payment.controller.spec.ts
    payment.service.spec.ts
    helloasso.service.spec.ts
```

Frontend structure:
```
libs/frontend/features/src/lib/
  payments/
    LicenseList.tsx
    PaymentReturn.tsx
    PaymentCancel.tsx
    hooks/
      useLicenses.ts
      useHelloAssoPayment.ts
```

Routes (lazy-loaded, add to `apps/frontend/src/app/app.tsx`):
```typescript
const PaymentsPage = React.lazy(() => import('../routes/payments'));
const PaymentReturn = React.lazy(() => import('../features/payments/PaymentReturn'));
const PaymentCancel = React.lazy(() => import('../features/payments/PaymentCancel'));
```

### Guard Order for Payment Endpoints

```
// Member initiation endpoint (any member can pay):
@UseGuards(JwtAuthGuard, ClubGuard)
POST /clubs/:clubId/payments/helloasso/initiate

// Webhook endpoint (NO guards — public):
POST /payments/webhooks/helloasso
// Manual HMAC verification inside handler

// License list endpoint (any authenticated club member):
@UseGuards(JwtAuthGuard, ClubGuard)
GET /clubs/:clubId/payments/licenses
```

### API Response Shapes

```typescript
// Initiation success:
{ data: { redirectUrl: 'https://www.helloasso.com/...' } }

// License list:
{ data: [{ id, name, amount, season, paymentProvider, memberStatus: 'Paid'|'Pending'|'Unpaid' }] }

// Webhook: always return 200 immediately (no data envelope needed)
```

### Error Messages (French, "we" phrasing)

| Scenario | Message |
|---|---|
| HelloAsso API unavailable | "Le service HelloAsso est temporairement indisponible — réessayez plus tard" |
| License type not found | "Ce type de licence n'est plus disponible." |
| License type not HelloAsso | "Ce type de licence utilise un autre moyen de paiement." |
| Generic payment error | "Nous n'avons pas pu initier votre paiement — réessayez plus tard." |

### Amount Conversion: Euros ↔ Cents

HelloAsso requires amounts in **euro cents** (integer). Prisma stores `amount` as `Decimal` (euros).

```typescript
// Prisma Decimal to cents for HelloAsso:
const amountInCents = Math.round(parseFloat(licenseType.amount.toString()) * 100);
```

### Testing Requirements

- **`helloasso.service.spec.ts`**: Mock `fetch` globally. Test: token retrieval + caching, checkout intent creation with correct payload, webhook signature verification (valid and invalid signatures), error handling on API failure.
- **`payment.service.spec.ts`**: Mock `PrismaService` and `HelloAssoService`. Test: `initiateHelloAssoPayment` creates Payment record, idempotency check (PENDING already exists), webhook handling (COMPLETED update, FAILED update, duplicate idempotency).
- **`payment.controller.spec.ts`**: Test: guards enforcement (401 without JWT, 200 with valid JWT), raw body webhook verification returns 401 on bad signature, 200 on valid.
- **React hooks**: Test `useInitiateHelloAssoPayment` mutation calls correct endpoint and handles redirect.

### References

- HelloAsso API v5 docs: `https://api.helloasso.com/v5` (requires HelloAsso partner account)
- HelloAsso sandbox: `https://api.helloasso-sandbox.com`
- Epic 9 definition: `_bmad-output/planning-artifacts/epics.md` lines 1500–1538
- Prisma schema: `libs/shared/prisma-client/prisma/schema.prisma` lines 247–278
- Payment Zod schemas: `libs/shared/types/src/lib/schemas/payment.schema.ts`
- Enums: `libs/shared/types/src/lib/enums.ts` (PaymentStatus has REFUNDED — must sync to Prisma)
- Architecture patterns: `_bmad-output/planning-artifacts/architecture.md` — Guard chain, NestJS module pattern, API response format
- UX spec Phase C: `_bmad-output/planning-artifacts/ux-design-specification.md` line 989 — "No new custom components — Stripe Checkout is external, license status uses existing Badge"
- Story 4.1 pattern reference: `_bmad-output/implementation-artifacts/4-1-email-invitation-member-join-flow.md` — example of new module with external service integration

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
