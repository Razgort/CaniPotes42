# Story 6.1: Dog Registration & Profile Management

Status: review

## Story

As a club member,
I want to register my dogs with their details and photo,
so that my dogs are part of my club profile and ready for vaccine tracking.

## Acceptance Criteria

1. **Dog Registration Form** — Given I am a member of the club, when I navigate to the Dogs tab and tap "+ Add Dog", then I see a form with fields: name (required), breed (optional), birthdate (optional), chip number (optional), photo (optional). The photo upload uses camera-first pattern: camera button prominent, file picker secondary. Optional fields are labeled "(optional)".

2. **Dog Creation & Storage** — Given I fill in the dog's name and submit, when the API processes the creation, then a Dog record is created linked to my `userId` and the active `clubId`. If a photo is uploaded, it is validated for type (JPEG, PNG, WebP) and size (max 5MB), stored in Cloudflare R2 with a signed URL. A success toast confirms: "Chien ajouté". I am navigated to the dog's profile page.

3. **Dog Profile Editing** — Given I view my dog's profile, when I tap "Edit", then the form opens pre-populated with current data. I can update any field including replacing the photo. Saving shows a success toast: "Profil mis à jour".

4. **Dog Deletion with Cascade** — Given I want to remove a dog, when I tap "Remove" on the dog's profile, then a confirmation dialog appears: "Retirer [dog name] ? Les carnets de vaccination et documents associés seront supprimés." On confirmation, the Dog record and all related VaccineRecords and Documents are cascade-deleted (Prisma `onDelete: Cascade` already configured). A success toast confirms: "Chien retiré".

5. **Member Dogs List View** — Given I am a member, when I view the Dogs tab, then I see only my own dogs listed with name, photo (or paw icon fallback avatar), breed. Each dog card shows a vaccine status summary badge (if vaccines exist).

6. **Empty State** — Given I have no dogs registered, when I view the Dogs tab, then an empty state is shown: "Ajoutez votre premier chien pour commencer" with an "Ajouter un chien" CTA.

7. **Read-Only Access to Other Members' Dogs** — Given I try to view another member's dogs, when I access their dog profiles, then I can see their dogs' public info (name, breed, photo) but cannot edit or remove them.

## Tasks / Subtasks

### Backend (API)

- [x] Task 1: Create Dog module structure (AC: 1-7)
  - [x] 1.1 Create `libs/api/features/src/lib/dog/dog.module.ts`
  - [x] 1.2 Create `libs/api/features/src/lib/dog/dog.service.ts`
  - [x] 1.3 Create `libs/api/features/src/lib/dog/dog.controller.ts`
  - [x] 1.4 Create `libs/api/features/src/lib/dog/dto/create-dog.dto.ts` (imports from `@org/types`)
  - [x] 1.5 Register `DogModule` in `libs/api/features/src/lib/api-features.ts` imports

- [x] Task 2: Implement DogService CRUD (AC: 1-7)
  - [x] 2.1 `create(dto, user)` — creates Dog with `userId: user.sub`, `clubId: user.activeClubId`
  - [x] 2.2 `findAllForUser(userId, clubId)` — member's own dogs with vaccine status
  - [x] 2.3 `findAllForClub(clubId)` — all dogs in club (for admin/read-only views)
  - [x] 2.4 `findOne(dogId, clubId)` — single dog detail with owner info
  - [x] 2.5 `update(dogId, userId, clubId, dto)` — verifies ownership before update
  - [x] 2.6 `remove(dogId, userId, clubId)` — verifies ownership, Prisma cascade handles related records

- [x] Task 3: Implement DogController endpoints (AC: 1-7)
  - [x] 3.1 `POST /dogs` — `@UseGuards(JwtAuthGuard, ClubGuard)` + `ZodValidationPipe(createDogSchema)`
  - [x] 3.2 `GET /dogs` — list own dogs (member) or all dogs (admin query param)
  - [x] 3.3 `GET /dogs/:dogId` — single dog detail
  - [x] 3.4 `PATCH /dogs/:dogId` — update own dog, `ZodValidationPipe(updateDogSchema)`
  - [x] 3.5 `DELETE /dogs/:dogId` — delete own dog
  - [x] 3.6 `POST /dogs/:dogId/photo` — file upload with `FileInterceptor('file')`, validate MIME + size (5MB max)

- [x] Task 4: Write backend unit tests (AC: 1-7)
  - [x] 4.1 `dog.service.spec.ts` — CRUD operations, ownership verification, club scoping
  - [x] 4.2 `dog.controller.spec.ts` — endpoint routing, guard chain, validation

### Frontend

- [x] Task 5: Create dog data-access hooks (AC: 1-6)
  - [x] 5.1 Create `libs/frontend/features/src/lib/dogs/hooks/useDogs.ts`
  - [x] 5.2 Implement `useDogs(clubId)` — query key `['dogs', clubId]`
  - [x] 5.3 Implement `useDogDetail(clubId, dogId)` — query key `['dogs', clubId, dogId]`
  - [x] 5.4 Implement `useCreateDog(clubId)`, `useUpdateDog(clubId)`, `useDeleteDog(clubId)` mutations
  - [x] 5.5 Implement `useUploadDogPhoto(clubId)` — FormData upload via raw `fetch` (not apiClient, which sets `Content-Type: application/json`)

- [x] Task 6: Create DogList component (AC: 5, 6)
  - [x] 6.1 Create `libs/frontend/features/src/lib/dogs/DogList.tsx`
  - [x] 6.2 Dog cards: avatar (photoUrl or paw icon fallback), name, breed
  - [x] 6.3 Empty state with CTA button
  - [x] 6.4 Loading skeleton state

- [x] Task 7: Create DogForm component (AC: 1, 2, 3)
  - [x] 7.1 Create `libs/frontend/features/src/lib/dogs/DogForm.tsx`
  - [x] 7.2 React Hook Form + zodResolver(createDogSchema/updateDogSchema)
  - [x] 7.3 Camera-first photo upload: camera button prominent, file picker secondary
  - [x] 7.4 Photo preview with "Retake" option
  - [x] 7.5 Pre-populated mode for editing (pass existing dog data as defaultValues)

- [x] Task 8: Create DogDetail component (AC: 3, 4, 7)
  - [x] 8.1 Create `libs/frontend/features/src/lib/dogs/DogDetail.tsx`
  - [x] 8.2 Display dog info: photo, name, breed, birthdate, chip number
  - [x] 8.3 Edit button (only for own dogs)
  - [x] 8.4 Delete button with confirmation dialog (only for own dogs)
  - [x] 8.5 Placeholder section for vaccine records (story 6.2)

- [x] Task 9: Wire up routing and DogsPage (AC: 1-6)
  - [x] 9.1 Replace `DogsPage.tsx` placeholder with real DogList + DogForm integration
  - [x] 9.2 Add nested routes: `/dogs` (list), `/dogs/new` (create), `/dogs/:dogId` (detail), `/dogs/:dogId/edit` (edit)
  - [x] 9.3 Wire navigation: list → detail, form submit → detail

- [x] Task 10: Write frontend tests (AC: 1-6)
  - [x] 10.1 `DogList.test.tsx` — renders dog cards, empty state, loading state
  - [x] 10.2 `DogForm.test.tsx` — validation, submission, pre-populated edit mode
  - [x] 10.3 `DogDetail.test.tsx` — displays dog info, edit/delete buttons for owner only

## Dev Notes

### Architecture Compliance

- **Guard chain**: All dog endpoints MUST use `@UseGuards(JwtAuthGuard, ClubGuard)`. No RolesGuard needed for basic CRUD (members manage own dogs). Admin-only endpoints (future story 6.3 dashboard) will add `@Roles('ADMIN', 'OWNER')`.
- **Club scoping**: Every Prisma query MUST include `clubId` in WHERE clause. The `clubId` comes from `user.activeClubId` (JWT payload), NOT from route params.
- **Ownership verification**: Service layer MUST verify `dog.userId === user.sub` before update/delete operations. Return `ForbiddenException` if not owner.
- **Response envelope**: Wrap responses in `{ data: ... }` for single items, `{ data: [...], meta: { total, page, pageSize } }` for lists.

### Existing Infrastructure to Reuse

- **Prisma Dog model**: Already defined in `schema.prisma` (lines 168-186). No migration needed.
- **Zod schemas**: `createDogSchema` and `updateDogSchema` already exist in `libs/shared/types/src/lib/schemas/dog.schema.ts`. Already exported via `schemas/index.ts`.
- **R2Service**: Already implemented at `libs/api/features/src/lib/document/r2.service.ts`. Import and inject it in DogModule for photo upload. Use key format `clubs/${clubId}/dogs/${dogId}/photo.${ext}`.
- **Guards/decorators**: Import from `@org/api-core`: `JwtAuthGuard`, `ClubGuard`, `CurrentUser`, `ZodValidationPipe`, `PrismaService`, `JwtPayload` type.
- **apiClient**: For frontend, use `apiClient.get/post/patch/delete` from `@org/data-access`. For file uploads, use raw `fetch` with `FormData` (apiClient forces JSON content-type).
- **useAuth hook**: `useAuth()` from `@org/data-access` provides `activeClub`, `user`, `role`, `isAuthenticated`.
- **DogsPage route**: Already exists at `/dogs` in `features.tsx` (line 42-48) but renders placeholder. Replace content.
- **UI components**: Use `SkeletonList` from `@org/ui`, `toast` from Sonner via `@org/ui`, `Avatar` from `libs/frontend/ui/src/lib/Avatar.tsx`.

### File Upload Pattern (Follow ClubController Logo Upload)

The exact pattern for file upload is in `club.controller.ts` lines 88-135:
```
@Post(':dogId/photo')
@UseGuards(JwtAuthGuard, ClubGuard)
@UseInterceptors(FileInterceptor('file'))
```
- Validate MIME type: `['image/jpeg', 'image/png', 'image/webp']`
- Validate size: 5MB max (`5 * 1024 * 1024`)
- R2 key format: `clubs/${clubId}/dogs/${dogId}/photo.${ext}`
- Delete old photo before uploading new one (same pattern as logo replacement)

### NestJS Module Registration

Add DogModule to `libs/api/features/src/lib/api-features.ts`:
```typescript
import { DogModule } from './dog/dog.module.js';

@Module({
  imports: [AuthModule, ClubModule, MemberModule, DogModule],
})
export class FeaturesModule {}
```

### Frontend File Structure

```
libs/frontend/features/src/lib/dogs/
├── DogList.tsx
├── DogList.test.tsx
├── DogDetail.tsx
├── DogDetail.test.tsx
├── DogForm.tsx
├── DogForm.test.tsx
└── hooks/
    └── useDogs.ts
```

### Camera-First Photo Upload (UX-DR19)

The photo upload must follow the WhatsApp-inspired camera-first pattern:
- Primary button: camera icon + "Prendre en photo" (uses `<input type="file" accept="image/*" capture="environment">`)
- Secondary option: "Choisir un fichier" (standard file picker without `capture` attribute)
- Photo preview before confirmation with "Reprendre" (retake) option
- Photo is optional — never block the form flow

### French UI Strings

| Context | String |
|---------|--------|
| Add dog CTA | "Ajouter un chien" |
| Empty state | "Ajoutez votre premier chien pour commencer" |
| Success create | "Chien ajouté" |
| Success update | "Profil mis à jour" |
| Success delete | "Chien retiré" |
| Delete confirm | "Retirer [nom] ? Les carnets de vaccination et documents associés seront supprimés." |
| Optional label | "(facultatif)" |
| Form fields | Nom, Race (facultatif), Date de naissance (facultatif), N° de puce (facultatif), Photo (facultatif) |

### Testing Standards

- **Framework**: Vitest 4.x with `@testing-library/react`
- **Co-located**: `*.spec.ts` for backend, `*.test.tsx` for frontend — same directory as source
- **Backend**: Mock `PrismaService` with `vi.fn()`. Test guard chain, ownership verification, club scoping.
- **Frontend**: Use `@testing-library/react` + `userEvent`. Mock TanStack Query hooks. Test accessibility (aria-labels on interactive elements).
- **Never** create `__tests__/` directories.

### Key Anti-Patterns to Avoid

- **DO NOT** create a separate Dog router or module in `apps/api/`. Use `libs/api/features/` only.
- **DO NOT** add `clubId` as a route parameter for dog endpoints. Extract it from JWT via `user.activeClubId`.
- **DO NOT** duplicate Zod schemas in DTOs. Import from `@org/types`.
- **DO NOT** use `console.log`. Use NestJS `Logger` class.
- **DO NOT** return raw Prisma entities. Map to response objects with `{ data: ... }` envelope.
- **DO NOT** use numeric IDs. Everything is UUID v4.
- **DO NOT** create separate `__tests__/` directories. Co-locate tests.

### Project Structure Notes

- Alignment: Dog feature follows identical structure to `club/` and `member/` modules
- No variance from established patterns detected
- Reuse `R2Service` from `document/` module (already shared by `ClubModule`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, Database Schema, File Storage, Testing]
- [Source: _bmad-output/planning-artifacts/prd.md — FR16-FR17, NFR3, NFR4, NFR8, NFR13, NFR18]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR7, UX-DR19, Journey 4]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Dog model lines 168-186]
- [Source: libs/shared/types/src/lib/schemas/dog.schema.ts — Zod validation schemas]
- [Source: libs/api/features/src/lib/club/club.controller.ts — Logo upload pattern lines 88-135]
- [Source: libs/api/features/src/lib/document/r2.service.ts — R2 upload/delete/signedUrl]
- [Source: libs/frontend/data-access/src/lib/api-client.ts — apiClient with token refresh]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Fixed vitest hoisting issue in DogDetail.test.tsx and DogForm.test.tsx: replaced bare `vi.fn()` variables with `vi.hoisted()` to prevent "Cannot access before initialization" errors in `vi.mock` factories
- Fixed `birthdate` field empty-string validation: added `setValueAs: (v) => v === '' ? undefined : v` to `register('birthdate')` so empty date inputs pass Zod's `.date().optional()` validation

### Completion Notes List
- DogModule includes VaccineController/VaccineService (pre-created for story 6.2) — both work in the same module
- `api-features.ts` already had DogModule registered from a prior session
- Photo upload uses raw `fetch` with FormData (not apiClient) to avoid Content-Type: application/json override

### File List
**Backend:**
- libs/api/features/src/lib/dog/dog.module.ts
- libs/api/features/src/lib/dog/dog.service.ts
- libs/api/features/src/lib/dog/dog.controller.ts
- libs/api/features/src/lib/dog/dto/create-dog.dto.ts
- libs/api/features/src/lib/dog/dog.service.spec.ts
- libs/api/features/src/lib/dog/dog.controller.spec.ts

**Frontend:**
- libs/frontend/features/src/lib/dogs/hooks/useDogs.ts
- libs/frontend/features/src/lib/dogs/DogList.tsx
- libs/frontend/features/src/lib/dogs/DogList.test.tsx
- libs/frontend/features/src/lib/dogs/DogForm.tsx
- libs/frontend/features/src/lib/dogs/DogForm.test.tsx
- libs/frontend/features/src/lib/dogs/DogDetail.tsx
- libs/frontend/features/src/lib/dogs/DogDetail.test.tsx
- libs/frontend/features/src/lib/dogs/DogNewPage.tsx
- libs/frontend/features/src/lib/dogs/DogEditPage.tsx

**Modified:**
- libs/frontend/features/src/lib/pages/DogsPage.tsx (replaced placeholder with DogList)
- libs/frontend/features/src/lib/features.tsx (added dog routes)
