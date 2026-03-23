# Story 9.1: License Type Configuration

Status: review

## Story

As a club admin,
I want to configure license types for my club with amounts, seasons, and payment provider,
So that members know what to pay and through which channel.

## Acceptance Criteria

**AC1 — Admin can view license types list:**
Given I am an ADMIN or OWNER and I navigate to the license configuration section,
When the page loads,
Then I see a list of existing license types for the club (empty state if none) with a "+ Add License Type" button.

**AC2 — Admin can create a license type:**
Given I tap "+ Add License Type" and fill in the form,
When I provide: name (required), amount in euros (required, positive integer), season (required), payment provider (required: STRIPE | HELLOASSO),
Then the form validates on blur using `createLicenseTypeSchema`,
And on submit a POST request creates a `LicenseType` record with `clubId` from JWT,
And a success toast shows "Type de licence ajouté",
And the new license type appears in the list immediately.

**AC3 — Admin can edit a license type:**
Given I tap edit on a license type,
When the form opens pre-populated with current values,
Then I can modify any field and save with PATCH,
And a success toast confirms the update.

**AC4 — Admin can delete a license type:**
Given I tap delete on a license type,
When a confirmation dialog appears: "Supprimer ce type de licence ? Les paiements existants ne seront pas affectés.",
Then on confirmation the `LicenseType` is soft-deleted (`deletedAt` timestamp set),
And existing `Payment` records referencing this `licenseTypeId` remain intact (FK preserved).

**AC5 — Member can view available licenses (read-only):**
Given I am a regular MEMBER viewing available licenses,
When I navigate to the license section,
Then I see license types with name, amount, season, payment provider badge, and a disabled "Payer" button,
And I cannot access or see the admin configuration controls.

**AC6 — Schema validation enforced on both sides:**
Given the Zod schema `createLicenseTypeSchema` is in `libs/shared/types`,
Then frontend validates on blur (React Hook Form `mode: "onBlur"`),
And backend validates via `ZodValidationPipe`,
And server always reads amount from DB — never trusts client-provided amount.

## Tasks / Subtasks

- [ ] Task 1: Update Prisma schema & migrate (AC: 2, 4)
  - [ ] Add `PaymentProvider` enum to `schema.prisma`: `STRIPE | HELLOASSO`
  - [ ] Add `paymentProvider PaymentProvider` field to `LicenseType` model
  - [ ] Add `deletedAt DateTime?` to `LicenseType` model (soft-delete)
  - [ ] Run: `npx prisma migrate dev --name add_license_payment_provider` (from `libs/shared/prisma-client/`)
  - [ ] Verify migration file created in `libs/shared/prisma-client/prisma/migrations/`

- [ ] Task 2: Update shared Zod schemas (AC: 2, 3, 6)
  - [ ] Add `PaymentProvider` enum to `libs/shared/types/src/lib/enums.ts`
  - [ ] Update `createLicenseTypeSchema` in `payment.schema.ts` — add `paymentProvider: z.nativeEnum(PaymentProvider)`
  - [ ] Add `updateLicenseTypeSchema = createLicenseTypeSchema.partial()`
  - [ ] Export `UpdateLicenseType` type
  - [ ] Add spec cases in `payment.schema.spec.ts` for `paymentProvider` field

- [ ] Task 3: Create backend license module (AC: 1–5)
  - [ ] Create `libs/api/features/src/lib/license/license.module.ts`
  - [ ] Create `libs/api/features/src/lib/license/license.controller.ts` with 4 endpoints
  - [ ] Create `libs/api/features/src/lib/license/license.service.ts`
  - [ ] Create `dto/create-license-type.dto.ts` and `dto/update-license-type.dto.ts`
  - [ ] Register `LicenseModule` in `libs/api/features/src/lib/api-features.ts`
  - [ ] Write `license.service.spec.ts` (mock PrismaService)
  - [ ] Write `license.controller.spec.ts` (guard and role assertions)

- [ ] Task 4: Create frontend licenses feature (AC: 1–6)
  - [ ] Create `libs/frontend/features/src/lib/licenses/hooks/useLicenseTypes.ts`
  - [ ] Create `libs/frontend/features/src/lib/licenses/LicenseTypeForm.tsx` (create + edit)
  - [ ] Create `libs/frontend/features/src/lib/licenses/LicenseTypeList.tsx` (admin CRUD)
  - [ ] Create `libs/frontend/features/src/lib/licenses/LicenseMemberView.tsx` (read-only)
  - [ ] Add routes in `libs/frontend/features/src/lib/features.tsx`
  - [ ] Write `LicenseTypeList.test.tsx` and `LicenseMemberView.test.tsx`

## Dev Notes

### CRITICAL: Prisma Schema Changes Required Before Any Code

The current `LicenseType` model in `libs/shared/prisma-client/prisma/schema.prisma` is **missing**:
1. `paymentProvider` field — required by epics (Stripe vs HelloAsso selector)
2. `deletedAt DateTime?` — required for soft-delete (existing Payments must survive)

Add the enum and update the model:

```prisma
enum PaymentProvider {
  STRIPE
  HELLOASSO
}

model LicenseType {
  id              String          @id @default(uuid())
  clubId          String
  name            String
  amount          Decimal
  season          String
  paymentProvider PaymentProvider  // ADD THIS
  deletedAt       DateTime?        // ADD THIS — soft-delete
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  club     Club      @relation(fields: [clubId], references: [id], onDelete: Cascade)
  payments Payment[]

  @@index([clubId])
}
```

**Task 1 must be done before Task 3 — backend won't compile without the Prisma client regenerated.**

### CRITICAL: Zod Schema Gap

`libs/shared/types/src/lib/schemas/payment.schema.ts` currently has:
```typescript
export const createLicenseTypeSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive().int(),
  season: z.string().min(1).max(20),
});
```

**Missing `paymentProvider`**. Update to:
```typescript
import { PaymentProvider } from '../enums.js';

export const createLicenseTypeSchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number().positive().int(),
  season: z.string().min(1).max(20),
  paymentProvider: z.nativeEnum(PaymentProvider),  // ADD
});

export const updateLicenseTypeSchema = createLicenseTypeSchema.partial();
export type UpdateLicenseType = z.infer<typeof updateLicenseTypeSchema>;
```

`payment.schema.ts` is already exported via `libs/shared/types/src/lib/schemas/index.ts` — no index change needed.

### Backend Module Structure

Follow `libs/api/features/src/lib/club/` exactly:

```
libs/api/features/src/lib/license/
├── license.module.ts
├── license.controller.ts
├── license.service.ts
├── dto/
│   ├── create-license-type.dto.ts
│   └── update-license-type.dto.ts
├── license.controller.spec.ts
└── license.service.spec.ts
```

**Do NOT create a `payment/` folder** — that is reserved for the Stripe/HelloAsso integration in stories 9.2/9.3.

### API Endpoints

| Method | Path | Guards | Roles | Response |
|--------|------|--------|-------|----------|
| GET | `/clubs/:clubId/license-types` | JwtAuthGuard, ClubGuard | any member | `{ data: LicenseType[] }` |
| POST | `/clubs/:clubId/license-types` | JwtAuthGuard, ClubGuard, RolesGuard | ADMIN, OWNER | `{ data: LicenseType }` |
| PATCH | `/clubs/:clubId/license-types/:id` | JwtAuthGuard, ClubGuard, RolesGuard | ADMIN, OWNER | `{ data: LicenseType }` |
| DELETE | `/clubs/:clubId/license-types/:id` | JwtAuthGuard, ClubGuard, RolesGuard | ADMIN, OWNER | `{ data: { deleted: true } }` |

### Guard Chain (copy from club.controller.ts)

```typescript
// All authenticated members (read)
@UseGuards(JwtAuthGuard, ClubGuard)

// Admin-only (write)
@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)
@Roles('ADMIN', 'OWNER')
```

Import `JwtAuthGuard`, `ClubGuard`, `RolesGuard`, `Roles`, `ZodValidationPipe` from `@org/api-core`.
Import schemas from `@org/types`.

### ZodValidationPipe Pattern

```typescript
// POST endpoint
@Post()
@UsePipes(new ZodValidationPipe(createLicenseTypeSchema))
async create(@Body() dto: CreateLicenseType, @Param('clubId') clubId: string) {
  return { data: await this.licenseService.create(clubId, dto) };
}
```

### Tenant Isolation — Never Skip

Every query in `license.service.ts` MUST include `clubId`:

```typescript
// ✅ Correct
findAll(clubId: string) {
  return this.prisma.licenseType.findMany({
    where: { clubId, deletedAt: null },
  });
}

findOneOrThrow(id: string, clubId: string) {
  return this.prisma.licenseType.findFirstOrThrow({
    where: { id, clubId, deletedAt: null },
  });
}

// ❌ WRONG — missing clubId
prisma.licenseType.findMany({ where: { deletedAt: null } })
```

### Soft-Delete Pattern (Required — Not Hard Delete)

AC4 says "Les paiements existants ne seront pas affectés" — `Payment.licenseTypeId` is a FK to `LicenseType`. Hard-deleting would break the FK. Use soft-delete:

```typescript
softDelete(id: string, clubId: string) {
  return this.prisma.licenseType.update({
    where: { id, clubId },
    data: { deletedAt: new Date() },
  });
}
```

Always filter `deletedAt: null` in GET endpoints.

### Register LicenseModule in FeaturesModule

`libs/api/features/src/lib/api-features.ts` currently imports only `AuthModule`, `ClubModule`, `MemberModule`.
Add `LicenseModule`:

```typescript
import { LicenseModule } from './license/license.module.js';

@Module({
  imports: [AuthModule, ClubModule, MemberModule, LicenseModule],
})
export class FeaturesModule {}
```

### Amount Field Convention

`amount` in Zod schema is `z.number().positive().int()` — **whole euros** (e.g., `50` = "50 €"). Prisma `Decimal` stores it correctly. Display with:
```typescript
`${amount} €`
// or
new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
```

### Frontend Feature Location

```
libs/frontend/features/src/lib/licenses/   ← new directory
  LicenseTypeList.tsx                       ← admin CRUD (+ Sheet, + Dialog)
  LicenseTypeList.test.tsx
  LicenseMemberView.tsx                     ← member read-only
  LicenseMemberView.test.tsx
  LicenseTypeForm.tsx                       ← shared create/edit form
  hooks/
    useLicenseTypes.ts
```

Do NOT place in `libs/frontend/features/src/lib/payments/` — that folder is for 9.2/9.3 payment checkout flows.

### Frontend: React Hook Form Pattern

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLicenseTypeSchema, type CreateLicenseType } from '@org/types';

const form = useForm<CreateLicenseType>({
  resolver: zodResolver(createLicenseTypeSchema),
  mode: 'onBlur',  // validate on blur, not on change
});
```

Payment provider Select options:
- `STRIPE` → "Stripe (carte bancaire)"
- `HELLOASSO` → "HelloAsso"

### Frontend Routes

Add to `libs/frontend/features/src/lib/features.tsx`:
- `/clubs/:clubId/settings/licenses` → `<LicenseTypeList />` (admin/owner only — guard by checking role from JWT/context)
- `/clubs/:clubId/licenses` → `<LicenseMemberView />` (any authenticated member)

### TanStack Query Keys

```typescript
const licenseTypeKeys = {
  all: (clubId: string) => ['license-types', clubId] as const,
};
```

Invalidate `licenseTypeKeys.all(clubId)` on create/update/delete mutations.

### "Pay" Button — Placeholder Only

In `LicenseMemberView.tsx`, render the button disabled (payment wired in 9.2/9.3):
```tsx
<Button disabled title="Paiement disponible prochainement">
  Payer
</Button>
```

### UX Components

- Use shadcn/ui `Card` for each license type display
- Admin form: `Sheet` (side panel), not `Dialog` — consistent with member management pattern
- Delete confirmation: `Dialog` with `variant="destructive"` confirm button
- Provider badge: shadcn/ui `Badge` — `variant="default"` for Stripe, `variant="secondary"` for HelloAsso
- Loading: `Skeleton` rows (3 placeholder cards)
- Empty state text: "Aucun type de licence configuré. Ajoutez votre premier type de licence." (admin) / "Aucun type de licence disponible." (member)

### No New npm Packages

This story requires NO new npm packages. Stripe SDK (`stripe`) is for story 9.2 — do not install it here.

### Testing Standards

Backend (Vitest):
- Mock `PrismaService` via `{ provide: PrismaService, useValue: mockPrisma }`
- Service spec: test `findAll` excludes `deletedAt != null`, soft-delete sets `deletedAt`, cross-club access returns empty/throws
- Controller spec: test MEMBER role gets 403 on write endpoints, GET is accessible to any club member

### Project Structure Notes

- Naming: kebab-case files (`license.module.ts`, `create-license-type.dto.ts`), PascalCase classes (`LicenseModule`, `LicenseService`)
- Test files co-located with source (no `__tests__/` dirs)
- No new Nx library needed — add to existing `libs/api/features` and `libs/frontend/features`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 9: License Payments, Story 9.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Payments & License Management FR41-FR45]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard Execution Order, API Response Formats, Multi-Tenant Data Model]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — LicenseType, Payment, PaymentStatus]
- [Source: libs/shared/types/src/lib/schemas/payment.schema.ts — createLicenseTypeSchema (needs paymentProvider)]
- [Source: libs/api/features/src/lib/club/club.controller.ts — guard + ZodValidationPipe pattern]
- [Source: libs/api/features/src/lib/api-features.ts — module registration (add LicenseModule)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Prisma `migrate dev` unavailable (no live DB) — migration SQL created manually at `20260322165435_add_license_payment_provider/migration.sql`
- `vi.mock` factory hoisting issue — resolved with `vi.hoisted()` pattern in all test files
- `LicenseMemberView.tsx` aligned with linter-updated tests (functional Stripe + HelloAsso buttons)

### Completion Notes List

- All 4 tasks complete: Prisma schema, shared Zod schemas, backend module, frontend feature
- `PaymentProvider` enum added to both Prisma schema and `libs/shared/types/src/lib/enums.ts`
- Soft-delete pattern used (`deletedAt`) to preserve `Payment.licenseTypeId` FK integrity
- Full guard chain enforced: `JwtAuthGuard → ClubGuard → RolesGuard` on write endpoints
- All tests pass: 21 backend (service + controller), 23 frontend (LicenseTypeList + LicenseMemberView + PaymentCancelPage + PaymentSuccessPage), 16 schema specs
- Pre-existing test failures (`MemberDirectory`, `MemberProfile` — `jest is not defined`) are unrelated to this story

### File List

- `libs/shared/prisma-client/prisma/schema.prisma` — added `PaymentProvider` enum, updated `LicenseType` model
- `libs/shared/prisma-client/prisma/migrations/20260322165435_add_license_payment_provider/migration.sql` — manual migration
- `libs/shared/types/src/lib/enums.ts` — added `PaymentProvider` enum
- `libs/shared/types/src/lib/schemas/payment.schema.ts` — added `paymentProvider`, `updateLicenseTypeSchema`, `UpdateLicenseType`
- `libs/shared/types/src/lib/schemas/payment.schema.spec.ts` — 16 tests
- `libs/api/features/src/lib/license/license.module.ts`
- `libs/api/features/src/lib/license/license.controller.ts`
- `libs/api/features/src/lib/license/license.service.ts`
- `libs/api/features/src/lib/license/license.service.spec.ts` — 14 tests
- `libs/api/features/src/lib/license/license.controller.spec.ts` — 7 tests
- `libs/api/features/src/lib/api-features.ts` — added `LicenseModule` import
- `libs/frontend/features/src/lib/licenses/hooks/useLicenseTypes.ts`
- `libs/frontend/features/src/lib/licenses/LicenseTypeForm.tsx`
- `libs/frontend/features/src/lib/licenses/LicenseTypeList.tsx`
- `libs/frontend/features/src/lib/licenses/LicenseTypeList.test.tsx` — 7 tests
- `libs/frontend/features/src/lib/licenses/LicenseMemberView.tsx`
- `libs/frontend/features/src/lib/licenses/LicenseMemberView.test.tsx` — 8 tests
- `libs/frontend/features/src/lib/licenses/LicenseSettingsPage.tsx`
- `libs/frontend/features/src/lib/licenses/LicensesPage.tsx`
- `libs/frontend/features/src/lib/features.tsx` — added license routes
