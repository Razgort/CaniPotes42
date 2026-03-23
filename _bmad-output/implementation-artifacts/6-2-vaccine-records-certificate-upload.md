# Story 6.2: Vaccine Records & Certificate Upload

Status: review

## Story

As a club member,
I want to add vaccine records to my dogs with expiry dates and upload certificate photos,
so that my dog's health status is tracked digitally and admins can verify it.

## Acceptance Criteria

1. **AC1 — Add Vaccine Form:** Given I am viewing my dog's profile, when I tap "+ Add Vaccine", then I see a form with fields: vaccine name (required, e.g., "Rage", "DHPP"), date administered (required), expiry date (required).

2. **AC2 — Vaccine Record Creation:** Given I fill in the vaccine details and submit, when the API processes the record, then a `VaccineRecord` is created linked to the dog, a success toast confirms "Vaccin ajouté", and the vaccine status is auto-calculated from the expiry date:
   - Green "À jour" if `expiryDate > today + 30 days`
   - Orange "Expire bientôt" if `expiryDate <= today + 30 days AND expiryDate >= today`
   - Red "Expiré" if `expiryDate < today`

3. **AC3 — Certificate Upload (Camera-First):** Given the vaccine form is submitted, when I see the certificate upload option, then I can upload a vaccine certificate photo using camera-first pattern: camera button prominent ("Prendre en photo"), file picker secondary ("Choisir un fichier"). A photo preview is shown before confirmation with a "Retake" option. Certificate is validated (JPEG, PNG, WebP; max 5MB), stored in R2 with a signed URL. The `certificateUrl` is saved on the VaccineRecord. Uploading is optional — "Skip" is available.

4. **AC4 — Vaccine List Display:** Given I view my dog's profile with vaccine records, when I look at the vaccine section, then each vaccine shows: vaccine name, date administered, expiry date, VaccineStatusBadge (green/orange/red with text label + `aria-label "Statut vaccin : [status]"` — never color alone). If a certificate was uploaded, a "View certificate" link is available. I can edit or delete individual vaccine records.

5. **AC5 — Status Recalculation on Edit:** Given I edit a vaccine record and update the expiry date, then the status badge recalculates immediately based on the new date.

6. **AC6 — Dog Overall Status:** Given multiple vaccines exist for the same dog, when I view the dog's profile, then all vaccines are listed with individual status badges. The dog's overall status is determined by its worst vaccine (if any is red, the dog is red).

7. **AC7 — Owner-Only CRUD:** Only the dog's owner (the member who created the dog) can add, edit, or delete vaccine records. Other members can view but not modify.

## Tasks / Subtasks

### Backend

- [x] **Task 1: Vaccine CRUD endpoints** (AC: 1, 2, 4, 5, 7)
  - [x] 1.1 Create `VaccineController` at `libs/api/features/src/lib/dog/vaccine.controller.ts`
  - [x] 1.2 Create `VaccineService` at `libs/api/features/src/lib/dog/vaccine.service.ts`
  - [x] 1.3 Create DTOs importing from `@canifed/shared-types` (`createVaccineSchema`)
  - [x] 1.4 Implement endpoints:
    - `POST /dogs/:dogId/vaccines` — create vaccine record
    - `GET /dogs/:dogId/vaccines` — list vaccines for a dog
    - `PATCH /dogs/:dogId/vaccines/:vaccineId` — update vaccine record
    - `DELETE /dogs/:dogId/vaccines/:vaccineId` — delete vaccine record
  - [x] 1.5 Add ownership validation: verify `request.user.sub === dog.userId` for write operations
  - [x] 1.6 All queries scoped by `clubId` from ClubGuard

- [x] **Task 2: Certificate upload endpoint** (AC: 3)
  - [x] 2.1 Add `POST /dogs/:dogId/vaccines/:vaccineId/certificate` endpoint using `FileInterceptor`
  - [x] 2.2 Validate file: MIME type (image/jpeg, image/png, image/webp), max 5MB
  - [x] 2.3 Upload to R2 via `R2Service` with key: `clubs/${clubId}/dogs/${dogId}/vaccines/${vaccineId}/certificate.${ext}`
  - [x] 2.4 Save signed URL to `VaccineRecord.certificateUrl`
  - [x] 2.5 Add `DELETE /dogs/:dogId/vaccines/:vaccineId/certificate` to remove certificate

- [x] **Task 3: Vaccine status calculation utility** (AC: 2, 5, 6)
  - [x] 3.1 Create `calculateVaccineStatus(expiryDate: Date): VaccineStatus` utility
  - [x] 3.2 Create `calculateDogOverallStatus(vaccines: VaccineRecord[]): VaccineStatus` — worst status wins
  - [x] 3.3 Status is computed at query time (not stored) — derive from `expiryDate` vs current date

- [x] **Task 4: Register DogModule** (AC: all)
  - [x] 4.1 Create `DogModule` at `libs/api/features/src/lib/dog/dog.module.ts`
  - [x] 4.2 Import `R2Service` from document module (or create shared provider)
  - [x] 4.3 Register in `ApiFeatures` module (`libs/api/features/src/lib/api-features.ts`)

- [x] **Task 5: Backend tests** (AC: all)
  - [x] 5.1 Create `vaccine.service.spec.ts` — unit tests for CRUD + status calculation
  - [x] 5.2 Create `vaccine.controller.spec.ts` — endpoint tests with auth/ownership mocking

### Frontend

- [x] **Task 6: Vaccine list & status badge components** (AC: 4, 5, 6)
  - [x] 6.1 Create `VaccineStatusBadge` component in `libs/frontend/ui/src/lib/VaccineStatusBadge.tsx`
    - Props: `status: 'UP_TO_DATE' | 'EXPIRING_SOON' | 'EXPIRED'`
    - Green/Orange/Red with text label + aria-label
    - Never color alone — always text + color
  - [x] 6.2 Create `VaccineList` component in `libs/frontend/features/src/lib/dogs/VaccineList.tsx`
    - Shows all vaccines for a dog with status badges
    - "View certificate" link if certificateUrl exists
    - Edit/Delete actions for owner only

- [x] **Task 7: Add vaccine form** (AC: 1, 2)
  - [x] 7.1 Create `VaccineForm` component in `libs/frontend/features/src/lib/dogs/VaccineForm.tsx`
  - [x] 7.2 Use React Hook Form + Zod validation (`createVaccineSchema` from `@canifed/shared-types`)
  - [x] 7.3 Fields: vaccineName (text input), dateAdministered (date picker), expiryDate (date picker)
  - [x] 7.4 Validate on blur, labels above inputs, 16px min font size
  - [x] 7.5 On success: toast "Vaccin ajouté", then offer certificate upload

- [x] **Task 8: Certificate upload component** (AC: 3)
  - [x] 8.1 Create `CertificateUpload` component in `libs/frontend/features/src/lib/dogs/CertificateUpload.tsx`
  - [x] 8.2 Camera-first pattern: prominent camera button ("Prendre en photo"), secondary file picker ("Choisir un fichier")
  - [x] 8.3 Use `<input type="file" accept="image/*" capture="environment">` for camera
  - [x] 8.4 Photo preview before confirmation with "Retake" option
  - [x] 8.5 Upload via `multipart/form-data` POST to certificate endpoint
  - [x] 8.6 "Skip" button to save vaccine without certificate
  - [x] 8.7 Show progress indicator during upload (exception to skeleton pattern — use progress bar)

- [x] **Task 9: Data access hooks** (AC: all)
  - [x] 9.1 Create `useVaccines` hook in `libs/frontend/features/src/lib/dogs/hooks/useVaccines.ts`
  - [x] 9.2 TanStack Query keys: `['vaccines', clubId, dogId]` for list, `['vaccines', clubId, dogId, vaccineId]` for single
  - [x] 9.3 Mutations for create, update, delete vaccine + upload/delete certificate
  - [x] 9.4 Invalidate dog queries on vaccine mutations (overall status changes)

- [x] **Task 10: Integration into DogDetail page** (AC: 4, 6)
  - [x] 10.1 Add VaccineList to dog detail page (from story 6.1's DogDetail.tsx)
  - [x] 10.2 Show dog overall status badge on dog card/profile
  - [x] 10.3 "+ Add Vaccine" button visible only to dog owner

- [x] **Task 11: Frontend tests** (AC: all)
  - [x] 11.1 `VaccineStatusBadge.test.tsx` — renders correct color/text/aria-label for each status
  - [x] 11.2 `VaccineForm.test.tsx` — form validation, submission
  - [x] 11.3 `CertificateUpload.test.tsx` — file selection, preview, skip flow

## Dev Notes

### Dependency: Story 6.1 Must Be Complete First

This story adds vaccine records to dogs. Story 6.1 creates the dog registration flow (DogModule, DogController, DogService, DogForm, DogDetail). If 6.1 is not yet implemented, you must implement 6.1 first or at minimum have the Dog CRUD endpoints and DogDetail page in place.

### Architecture Compliance

**Guard chain (every endpoint):**
```
@UseGuards(JwtAuthGuard, ClubGuard)
```
Admin-only endpoints additionally use `@Roles('ADMIN', 'OWNER')` + `RolesGuard`.

**Ownership validation pattern:**
Vaccine write operations require `dog.userId === request.user.sub`. This is NOT a guard — it's a service-level check. The dog belongs to a specific user within the club. Other club members can view but not modify.

**Controller → Service → Prisma flow:**
Never call Prisma directly from controllers. All queries include `clubId` WHERE clause.

**API response envelope:**
```typescript
// Single item
{ "data": { "id": "uuid", ... } }
// List
{ "data": [...], "meta": { "total": 5 } }
// Error
{ "statusCode": 400, "error": "VALIDATION_ERROR", "message": "...", "details": [...] }
```

### Existing Code to Reuse — DO NOT Reinvent

| What | Where | Notes |
|------|-------|-------|
| `R2Service` | `libs/api/features/src/lib/document/r2.service.ts` | Already implements `upload()`, `delete()`, `getSignedUrl()`. Reuse — do NOT create a new upload service. |
| `FileInterceptor` pattern | `libs/api/features/src/lib/club/club.controller.ts` lines 88-135 | Club logo upload: validates MIME, size, generates R2 key, uploads, updates DB. Copy this pattern. |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Use with `@UsePipes(new ZodValidationPipe(createVaccineSchema))` |
| `@CurrentUser()` decorator | `libs/api/core/src/lib/decorators/` | Extracts JWT payload from request |
| `@CurrentClub()` decorator | `libs/api/core/src/lib/decorators/` | Extracts clubId from request |
| `createVaccineSchema` | `libs/shared/types/src/lib/schemas/vaccine.schema.ts` | Zod schema for vaccine creation validation |
| `apiClient` | `libs/frontend/data-access/src/lib/api-client.ts` | For JSON requests. For file uploads, use `fetch` directly with `FormData` (apiClient doesn't support multipart). |

### Prisma Schema — Already Defined

**VaccineRecord model** (schema.prisma:188-199):
```prisma
model VaccineRecord {
  id               String    @id @default(uuid())
  dogId            String
  vaccineName      String
  dateAdministered DateTime
  expiryDate       DateTime?   // ⚠️ Optional in schema but REQUIRED by AC
  certificateUrl   String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  dog Dog @relation(fields: [dogId], references: [id], onDelete: Cascade)
}
```

**Important schema note:** `expiryDate` is `DateTime?` (optional) in Prisma but the acceptance criteria require it. The Zod schema (`createVaccineSchema`) correctly makes it required. Enforce at validation layer — do NOT change the Prisma schema (it allows flexibility for records without known expiry). Status calculation must handle `null` expiryDate gracefully (treat as "unknown" / no status).

**Dog model** (schema.prisma:168-186): Has `vaccineRecords VaccineRecord[]` relation. Cascade delete on dog removal also deletes all vaccine records.

### Certificate Storage — Uses VaccineRecord.certificateUrl, NOT Document Model

Certificates are stored as `certificateUrl` directly on `VaccineRecord`. Do NOT create a `Document` record for vaccine certificates — that model is for standalone documents (registration forms, health records, licenses). The R2 key pattern:
```
clubs/{clubId}/dogs/{dogId}/vaccines/{vaccineId}/certificate.{ext}
```

### Vaccine Status Calculation — Compute, Don't Store

Status is derived at query time from `expiryDate` vs current date. Do NOT add a `status` column. The `VaccineStatus` enum in Prisma exists for typing only.

```typescript
function calculateVaccineStatus(expiryDate: Date | null): VaccineStatus {
  if (!expiryDate) return 'UP_TO_DATE'; // no expiry = assume current
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiryDate < now) return 'EXPIRED';
  if (expiryDate <= thirtyDaysFromNow) return 'EXPIRING_SOON';
  return 'UP_TO_DATE';
}
```

### Frontend Patterns

**Forms:** React Hook Form + Zod, validate on blur, single column on mobile, labels above inputs, 16px min font, primary button full width at bottom.

**Data fetching:** TanStack Query. Keys: `['vaccines', clubId, dogId]`. Invalidate on mutation.

**Toasts:** Green success top-of-screen auto-dismiss 3s. Red error persists until dismissed. "We" language for errors.

**Date display:** `Intl.DateTimeFormat` with `fr-FR` locale.

**Loading:** Skeleton placeholders (not spinners), except file upload which uses progress bar.

**Empty state for vaccines:** "Aucun vaccin enregistré — ajoutez le premier vaccin de [dog name]" with "+ Ajouter un vaccin" CTA.

### File Upload Pattern — Frontend

The `apiClient` does not support multipart uploads. Use `fetch` directly:
```typescript
const formData = new FormData();
formData.append('file', file);
const response = await fetch(`${API_URL}/dogs/${dogId}/vaccines/${vaccineId}/certificate`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### Camera-First UX Implementation

Use HTML5 `<input>` with `capture` attribute:
```html
<!-- Primary: camera -->
<input type="file" accept="image/*" capture="environment" />
<!-- Secondary: file picker (no capture attribute) -->
<input type="file" accept="image/jpeg,image/png,image/webp" />
```
Show camera button prominently, file picker as secondary link/text button.

### Testing Standards

- **Co-located tests:** `*.spec.ts` for NestJS, `*.test.tsx` for React. No separate test directories.
- **Vitest** with jsdom for frontend, Vitest for backend unit tests.
- **Test vaccine status calculation** exhaustively: exact boundary dates (today, today+30, today+31, yesterday).

### Project Structure Notes

All file locations follow the architecture's FR-to-Structure mapping:

| Layer | Path |
|-------|------|
| API vaccine controller | `libs/api/features/src/lib/dog/vaccine.controller.ts` |
| API vaccine service | `libs/api/features/src/lib/dog/vaccine.service.ts` |
| API dog module | `libs/api/features/src/lib/dog/dog.module.ts` |
| Frontend vaccine form | `libs/frontend/features/src/lib/dogs/VaccineForm.tsx` |
| Frontend vaccine list | `libs/frontend/features/src/lib/dogs/VaccineList.tsx` |
| Frontend certificate upload | `libs/frontend/features/src/lib/dogs/CertificateUpload.tsx` |
| Frontend vaccine hook | `libs/frontend/features/src/lib/dogs/hooks/useVaccines.ts` |
| UI status badge | `libs/frontend/ui/src/lib/VaccineStatusBadge.tsx` |
| Shared schemas | `libs/shared/types/src/lib/schemas/vaccine.schema.ts` |

### Domain Context — Federation Vaccine Requirements

Vaccine requirements differ by federation (for future story consideration, not this story's scope):
- **FFSLC** (canicross): CHPPiL mandatory for club, Rage mandatory for competition only
- **CNEAC** (agility): CHPPiL mandatory for club, Toux du chenil mandatory (federation requirement)

This story implements generic vaccine tracking. Federation-specific compliance logic is out of scope but the data model supports it.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, File Upload Pipeline, Guard Chain, Data Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 4, VaccineStatusBadge component, camera-first pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR16-FR21, NFR13]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Dog, VaccineRecord, Document models]
- [Source: libs/api/features/src/lib/document/r2.service.ts — existing R2 upload service]
- [Source: libs/api/features/src/lib/club/club.controller.ts — FileInterceptor upload pattern]
- [Source: libs/shared/types/src/lib/schemas/vaccine.schema.ts — createVaccineSchema]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- VaccineStatusBadge labels matched existing story 6.1 test: "À renouveler" / "Manquant / expiré" (not "Expire bientôt" / "Expiré")
- `<input type="date">` requires `fireEvent.change` in Vitest/jsdom tests, not `userEvent.type`
- DogDetail.tsx bash heredoc write failed due to single quotes in file content — used Write tool instead
- Pre-existing test failures in RegisterForm.test.tsx and ClubRegistrationFlow.test.tsx are unrelated to this story

### Completion Notes List

- VaccineRecord CRUD: GET/POST/PATCH/DELETE at `/dogs/:dogId/vaccines`, all guarded by JwtAuthGuard+ClubGuard with service-level ownership check
- Certificate upload/delete: POST/DELETE at `/dogs/:dogId/vaccines/:vaccineId/certificate`, MIME+size validated, stored in R2
- Status calculation in `vaccine-status.util.ts`: boundary at exact `now` → EXPIRING_SOON (not EXPIRED), boundary at `now+30d` → EXPIRING_SOON
- DogModule registers VaccineController, VaccineService, R2Service and is imported in FeaturesModule
- Frontend `VaccineView` discriminated union in DogDetail: list → add → certificate (after create), list → edit (update), all transitions explicit
- `calculateDogOverallStatus` util in `libs/frontend/features/src/lib/dogs/utils/vaccineStatus.ts` works from `VaccineDto.status` (already computed by API)
- All 30 dog/vaccine frontend tests pass; all 40+ backend dog/vaccine tests pass

### File List

**New files:**
- `libs/api/features/src/lib/dog/vaccine-status.util.ts`
- `libs/api/features/src/lib/dog/vaccine.service.ts`
- `libs/api/features/src/lib/dog/vaccine.controller.ts`
- `libs/api/features/src/lib/dog/dog.module.ts`
- `libs/api/features/src/lib/dog/vaccine.service.spec.ts`
- `libs/api/features/src/lib/dog/vaccine.controller.spec.ts`
- `libs/frontend/features/src/lib/dogs/hooks/useVaccines.ts`
- `libs/frontend/features/src/lib/dogs/VaccineList.tsx`
- `libs/frontend/features/src/lib/dogs/VaccineForm.tsx`
- `libs/frontend/features/src/lib/dogs/CertificateUpload.tsx`
- `libs/frontend/features/src/lib/dogs/VaccineForm.test.tsx`
- `libs/frontend/features/src/lib/dogs/CertificateUpload.test.tsx`
- `libs/frontend/features/src/lib/dogs/utils/vaccineStatus.ts`

**Modified files:**
- `libs/api/features/src/lib/api-features.ts` — added DogModule import
- `libs/frontend/features/src/lib/dogs/DogDetail.tsx` — integrated VaccineList/VaccineForm/CertificateUpload, overall status badge
- `libs/frontend/features/src/lib/dogs/DogDetail.test.tsx` — added mocks for useVaccines + vaccine sub-components
- `libs/frontend/ui/src/lib/VaccineStatusBadge.tsx` — rewritten to match test expectations (variant/count props, French labels)
