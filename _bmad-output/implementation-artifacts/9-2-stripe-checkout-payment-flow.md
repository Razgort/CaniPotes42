# Story 9.2: Stripe Checkout Payment Flow

Status: ready-for-dev

## Story

As a club member,
I want to pay for a license via Stripe Checkout,
So that I can pay my club fees securely with a credit card.

## Acceptance Criteria

**AC1 — Member initiates Stripe payment:**
Given I am a MEMBER and a license type with `paymentProvider = STRIPE` exists,
When I tap "Payer" on a license type,
Then the frontend POSTs to the API to create a Stripe Checkout session,
And the API creates a Stripe Checkout Session with: amount (from DB), currency EUR, success_url, cancel_url, metadata (`userId`, `clubId`, `licenseTypeId`),
And I am redirected to the Stripe-hosted checkout page (no card data touches our servers).

**AC2 — Payment record created on initiation:**
Given the API creates a Stripe Checkout Session successfully,
When the session is created,
Then a `Payment` record is created with `status = PENDING` and `stripeSessionId` set,
And the member is redirected to `session.url`.

**AC3 — Success redirect handling:**
Given I complete payment on Stripe's page,
When Stripe redirects me to the `success_url`,
Then I see a success page: "Paiement en cours de confirmation",
And the UI polls or listens for the Payment record to move to COMPLETED.

**AC4 — Webhook: payment completed:**
Given Stripe sends a `checkout.session.completed` webhook,
When the API receives the event at `POST /webhooks/stripe`,
Then the webhook handler verifies the Stripe signature (`stripe.webhooks.constructEvent`),
And the `Payment` record matching `stripeSessionId` is updated to `status = COMPLETED` with `paidAt` timestamp,
And the handler is idempotent — if called again with same event, it does nothing (deduplication by `stripeSessionId`).

**AC5 — Webhook: payment failed or expired:**
Given Stripe sends a `checkout.session.expired` or `payment_intent.payment_failed` event,
When the API receives the event,
Then the `Payment` record is updated to `status = FAILED`,
And the member sees their license as unpaid with an option to retry.

**AC6 — Webhook: refund:**
Given an admin issues a refund in the Stripe dashboard,
When Stripe sends a `charge.refunded` webhook,
Then the `Payment` record is updated to `status = REFUNDED`.

**AC7 — Cancel redirect:**
Given I cancel on the Stripe checkout page,
When Stripe redirects me to the `cancel_url`,
Then I return to the license list with no new Payment record created (or a PENDING that will naturally expire),
And a neutral info message is shown: "Paiement annulé. Vous pouvez réessayer à tout moment."

**AC8 — Amount server-side enforced:**
Given any POST to create a Stripe Checkout Session,
When the API creates the session,
Then the amount is always fetched from the `LicenseType` record in DB — never trusted from the client request body.

## Tasks / Subtasks

- [ ] Task 1: Install Stripe SDK & update env schema (AC: 1)
  - [ ] Install `stripe` npm package: `npm install stripe`
  - [ ] Add Stripe env vars to `libs/shared/utils/src/lib/env.schema.ts`:
    - `STRIPE_SECRET_KEY: z.string().min(1)`
    - `STRIPE_WEBHOOK_SECRET: z.string().min(1)`
    - `STRIPE_SUCCESS_URL: z.string().url()`
    - `STRIPE_CANCEL_URL: z.string().url()`
  - [ ] Add same vars to `.env.example` (with placeholder values)

- [ ] Task 2: Update Prisma schema — add `paidAt` to Payment (AC: 4)
  - [ ] Add `paidAt DateTime?` to `Payment` model in `schema.prisma`
  - [ ] Run: `npx prisma migrate dev --name add_payment_paid_at` (from `libs/shared/prisma-client/`)
  - [ ] Regenerate Prisma client

- [ ] Task 3: Update shared Zod schemas (AC: 1)
  - [ ] Verify `initiatePaymentSchema` in `payment.schema.ts` is: `z.object({ licenseTypeId: z.string().uuid() })` — already exists, no change needed
  - [ ] Add `PaymentSessionResponse` type: `{ sessionUrl: string; paymentId: string }`

- [ ] Task 4: Create backend payment module (AC: 1–8)
  - [ ] Create `libs/api/features/src/lib/payment/payment.module.ts`
  - [ ] Create `libs/api/features/src/lib/payment/stripe.service.ts` — wraps Stripe SDK, injectable
  - [ ] Create `libs/api/features/src/lib/payment/payment.controller.ts`
    - [ ] `POST /clubs/:clubId/license-types/:licenseTypeId/checkout` — authenticated member (JwtAuthGuard + ClubGuard)
  - [ ] Create `libs/api/features/src/lib/payment/stripe-webhook.controller.ts`
    - [ ] `POST /webhooks/stripe` — **no auth guard**, raw body required, Stripe signature verification
  - [ ] Create `libs/api/features/src/lib/payment/payment.service.ts`
    - [ ] `initiateCheckout(clubId, userId, licenseTypeId)` — fetch LicenseType from DB, create Stripe session, create PENDING Payment record
    - [ ] `handleWebhook(rawBody, signature)` — switch on event type, idempotent handlers
  - [ ] Register `PaymentModule` in `libs/api/features/src/lib/api-features.ts`
  - [ ] Write `payment.service.spec.ts` (mock Stripe + PrismaService)
  - [ ] Write `stripe-webhook.controller.spec.ts`

- [ ] Task 5: Configure raw body parsing for webhook (AC: 4)
  - [ ] Stripe signature verification requires the raw request body (not JSON-parsed)
  - [ ] In the NestJS app bootstrap (`apps/api/src/main.ts`), ensure raw body is accessible for `/webhooks/stripe`
  - [ ] Use `rawBody: true` in NestJS bootstrap or `express.raw()` middleware scoped to webhook path

- [ ] Task 6: Frontend — wire up "Payer" button for Stripe (AC: 1, 3, 7)
  - [ ] In `libs/frontend/features/src/lib/licenses/hooks/useLicenseTypes.ts`:
    - [ ] Add `useInitiateStripePayment(clubId)` — mutation calling `POST /clubs/:clubId/license-types/:id/checkout`
    - [ ] On success: redirect to `sessionUrl` using `window.location.href = sessionUrl`
  - [ ] In `LicenseMemberView.tsx`: enable "Payer" button for `paymentProvider === 'STRIPE'` license types (keep disabled for `HELLOASSO` — that's 9.3)
  - [ ] Create `libs/frontend/features/src/lib/licenses/PaymentSuccessPage.tsx`
    - [ ] Shown at the `success_url` path (e.g., `/payment/success?session_id={CHECKOUT_SESSION_ID}`)
    - [ ] Displays: "Paiement en cours de confirmation" with a spinner
    - [ ] Polls `GET /clubs/:clubId/payments/status?sessionId=xxx` every 2 seconds (max 30s) to detect COMPLETED
    - [ ] On COMPLETED: navigate to license list with success toast "Licence payée !"
    - [ ] On timeout: show "Confirmation en cours... Vérifiez votre historique dans quelques instants."
  - [ ] Create `libs/frontend/features/src/lib/licenses/PaymentCancelPage.tsx`
    - [ ] Shown at the `cancel_url` path (e.g., `/payment/cancelled`)
    - [ ] Displays: "Paiement annulé. Vous pouvez réessayer à tout moment."
    - [ ] Link back to license list
  - [ ] Add routes for `/payment/success` and `/payment/cancelled` in `features.tsx`

- [ ] Task 7: Add payment status query endpoint (AC: 3)
  - [ ] `GET /clubs/:clubId/payments/status?sessionId=xxx` — returns `{ status: PaymentStatus }` (authenticated)
  - [ ] Add to `payment.controller.ts`

- [ ] Task 8: Write frontend tests (AC: 1, 3, 7)
  - [ ] `PaymentSuccessPage.test.tsx` — renders spinner, shows success on COMPLETED, shows timeout message
  - [ ] `PaymentCancelPage.test.tsx` — renders cancel message with link

## Dev Notes

### Install Stripe SDK First

```bash
npm install stripe
```

Stripe SDK version: use latest stable (`^17.x` as of 2026). The SDK is server-side only — **never import `stripe` in frontend code**.

### New Env Vars Required

Add to `libs/shared/utils/src/lib/env.schema.ts`:

```typescript
STRIPE_SECRET_KEY: z.string().min(1),           // sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET: z.string().min(1),        // whsec_...
STRIPE_SUCCESS_URL: z.string().url(),            // e.g. https://app.canifed.fr/payment/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL: z.string().url(),             // e.g. https://app.canifed.fr/payment/cancelled
```

Add to `.env.example`:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_SUCCESS_URL=http://localhost:4200/payment/success?session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=http://localhost:4200/payment/cancelled
```

### Backend Module Structure

```
libs/api/features/src/lib/payment/
├── payment.module.ts
├── stripe.service.ts              ← wraps Stripe SDK, @Injectable()
├── payment.controller.ts          ← POST checkout, GET status
├── stripe-webhook.controller.ts   ← POST /webhooks/stripe (no auth)
├── payment.service.ts             ← business logic
├── payment.service.spec.ts
└── stripe-webhook.controller.spec.ts
```

This is **separate** from `libs/api/features/src/lib/license/` (story 9.1). Both `LicenseModule` and `PaymentModule` must be registered in `FeaturesModule`.

### Stripe Service Pattern

```typescript
// stripe.service.ts
import Stripe from 'stripe';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27.acacia',  // pin to latest stable API version
    });
  }

  createCheckoutSession(params: Stripe.Checkout.SessionCreateParams) {
    return this.stripe.checkout.sessions.create(params);
  }

  constructWebhookEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }
}
```

### Checkout Session Creation

```typescript
// payment.service.ts — initiateCheckout
async initiateCheckout(clubId: string, userId: string, licenseTypeId: string) {
  // 1. Fetch LicenseType from DB — always server-side, never trust client amount (AC8)
  const licenseType = await this.prisma.licenseType.findFirstOrThrow({
    where: { id: licenseTypeId, clubId, deletedAt: null, paymentProvider: 'STRIPE' },
  });

  // 2. Create Stripe Checkout Session
  const session = await this.stripeService.createCheckoutSession({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: licenseType.amount.toNumber(),  // already in euros cents? — verify convention
        product_data: { name: licenseType.name },
      },
      quantity: 1,
    }],
    success_url: `${process.env.STRIPE_SUCCESS_URL}`,  // includes {CHECKOUT_SESSION_ID} template
    cancel_url: process.env.STRIPE_CANCEL_URL,
    metadata: { userId, clubId, licenseTypeId },
    client_reference_id: `${userId}:${licenseTypeId}`,
  });

  // 3. Create PENDING Payment record
  const payment = await this.prisma.payment.create({
    data: {
      clubId, userId, licenseTypeId,
      amount: licenseType.amount,
      status: 'PENDING',
      stripeSessionId: session.id,
    },
  });

  return { sessionUrl: session.url, paymentId: payment.id };
}
```

**Important**: `licenseType.amount` is stored as whole euros (integer from story 9.1 Zod schema `z.number().positive().int()`). Stripe expects **cents**. Multiply by 100:
```typescript
unit_amount: licenseType.amount.toNumber() * 100,
```

### Webhook Controller — Raw Body Required

Stripe signature verification requires the **raw** (unparsed) request body. Standard NestJS JSON middleware parses the body before guards run, breaking signature verification. Fix:

```typescript
// apps/api/src/main.ts — add rawBody: true to NestFactory
const app = await NestFactory.create(AppModule, { rawBody: true });
```

Then in webhook controller:
```typescript
@Controller('webhooks')
export class StripeWebhookController {
  @Post('stripe')
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const event = this.stripeService.constructWebhookEvent(req.rawBody!, signature);
    await this.paymentService.handleWebhook(event);
    return { received: true };
  }
}
```

**No `JwtAuthGuard`** on this endpoint — Stripe authenticates via signature, not JWT.

### Webhook Idempotency Pattern

```typescript
// payment.service.ts — handleWebhook
async handleWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Idempotent: only update if still PENDING (avoid double-processing)
      await this.prisma.payment.updateMany({
        where: { stripeSessionId: session.id, status: 'PENDING' },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });
      break;
    }
    case 'checkout.session.expired':
    case 'payment_intent.payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.prisma.payment.updateMany({
        where: { stripeSessionId: session.id, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      break;
    }
    case 'charge.refunded': {
      // Match by stripeSessionId via payment intent — see note below
      // charge.refunded has payment_intent ID, need to look up session
      break;
    }
    default:
      // Ignore unknown events — Stripe sends many event types
  }
}
```

**Use `updateMany` with status filter** — this is the idempotency mechanism. If a `checkout.session.completed` event arrives twice, the second call finds no PENDING record and updates 0 rows — no side effect.

### Prisma Schema Addition

Add `paidAt` to `Payment` model:
```prisma
model Payment {
  // ... existing fields ...
  paidAt    DateTime?     // SET when status transitions to COMPLETED
  // ... rest unchanged ...
}
```

### FeaturesModule Registration

```typescript
// libs/api/features/src/lib/api-features.ts
import { LicenseModule } from './license/license.module.js';
import { PaymentModule } from './payment/payment.module.js';  // ADD

@Module({
  imports: [AuthModule, ClubModule, MemberModule, LicenseModule, PaymentModule],  // ADD PaymentModule
})
```

Note: `LicenseModule` was added in story 9.1. Add `PaymentModule` alongside it.

### Frontend: Redirect to Stripe

```typescript
// hooks/useLicenseTypes.ts — add mutation
const initiateStripePayment = useMutation({
  mutationFn: async (licenseTypeId: string) => {
    const res = await apiClient.post(
      `/clubs/${clubId}/license-types/${licenseTypeId}/checkout`
    );
    return res.data as { sessionUrl: string; paymentId: string };
  },
  onSuccess: ({ sessionUrl }) => {
    window.location.href = sessionUrl;  // redirect to Stripe hosted page
  },
  onError: () => {
    toast.error('Impossible d\'initier le paiement. Réessayez.');
  },
});
```

### Frontend: Enable "Payer" Button for STRIPE Only

In `LicenseMemberView.tsx`, story 9.1 rendered `<Button disabled>Payer</Button>` for all types. Story 9.2 enables it for STRIPE:

```tsx
<Button
  disabled={licenseType.paymentProvider !== 'STRIPE'}
  onClick={() => initiateStripePayment(licenseType.id)}
  title={licenseType.paymentProvider !== 'STRIPE' ? 'Paiement HelloAsso disponible prochainement' : undefined}
>
  Payer
</Button>
```

### Success URL Template Variable

Stripe replaces `{CHECKOUT_SESSION_ID}` in the success URL automatically:
```
http://localhost:4200/payment/success?session_id={CHECKOUT_SESSION_ID}
```
The frontend success page reads `?session_id=xxx` from the URL to poll for status.

### Payment Status Polling Endpoint

```typescript
// payment.controller.ts — add GET
@Get('status')
@UseGuards(JwtAuthGuard, ClubGuard)
async getPaymentStatus(
  @Param('clubId') clubId: string,
  @Query('sessionId') sessionId: string,
) {
  const payment = await this.paymentService.findBySession(clubId, sessionId);
  return { data: { status: payment?.status ?? 'PENDING' } };
}
```

Route: `GET /clubs/:clubId/payments/status?sessionId=cs_xxx`

### Local Development with Stripe

For local testing of webhooks, use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```
This provides a test `STRIPE_WEBHOOK_SECRET` for local dev. Document in `.env.example`.

### Security Checklist

- [ ] Webhook endpoint has **no** `JwtAuthGuard` — Stripe signature is the auth mechanism
- [ ] Amount is ALWAYS fetched from DB, never from client body (AC8)
- [ ] `constructWebhookEvent` throws if signature invalid — let it propagate as 400
- [ ] All payment queries include `clubId` scope (multi-tenant isolation)
- [ ] `stripeSessionId` is `@unique` in Prisma — prevents duplicate PENDING records

### Testing: Mock Stripe

```typescript
// payment.service.spec.ts
const mockStripeService = {
  createCheckoutSession: vi.fn().mockResolvedValue({
    id: 'cs_test_123',
    url: 'https://checkout.stripe.com/...',
  }),
  constructWebhookEvent: vi.fn(),
};
```

Test: idempotent webhook — calling `handleWebhook` with same `checkout.session.completed` event twice only updates once (second call hits `updateMany` with 0 matching rows).

### Project Structure Notes

- `stripe.service.ts` is a thin wrapper — makes the Stripe client testable/mockable
- Webhook controller has NO Zod validation pipe — body is raw Buffer, not parsed JSON
- Test files co-located with source
- No `__tests__/` dirs

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 9: License Payments, Story 9.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — External Integrations: Stripe, Payments & License Management FR41-FR45]
- [Source: _bmad-output/planning-artifacts/architecture.md — Security & Compliance (PCI compliance by delegation)]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Payment model (stripeSessionId, PaymentStatus enum)]
- [Source: libs/shared/types/src/lib/schemas/payment.schema.ts — initiatePaymentSchema]
- [Source: libs/shared/utils/src/lib/env.schema.ts — env validation (add Stripe vars)]
- [Source: libs/api/features/src/lib/api-features.ts — register PaymentModule]
- [Source: Story 9.1 — LicenseModule, paymentProvider field, LicenseMemberView "Pay" button]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
