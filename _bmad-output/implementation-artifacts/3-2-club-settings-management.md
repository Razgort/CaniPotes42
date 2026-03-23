# Story 3.2: Club Settings Management

Status: complete

## Story

As a club owner,
I want to update my club's settings,
so that I can keep the club information accurate and up to date.

## Acceptance Criteria

1. **Given** I am the club owner (role = OWNER), **When** I navigate to club settings, **Then** I see a form pre-populated with current club data: name, logo, federation, description, contact email.

2. **Given** I modify any field and submit, **When** the API processes the update, **Then** the Club record is updated with the new values, **And** a success toast appears: "Paramètres du club mis à jour", **And** the updated club name/logo is reflected immediately in the header and club switcher.

3. **Given** I upload a new logo, **When** the image is processed, **Then** it is validated for type (JPEG, PNG, WebP) and size (max 2MB), **And** the old logo is replaced — the new one is stored in Cloudflare R2 with a signed URL, **And** if upload fails, the old logo is preserved and an error toast is shown.

4. **Given** I am an admin or member (not owner), **When** I try to access club settings, **Then** the settings page is not accessible — the menu item is hidden, **And** direct URL access returns 403 Forbidden.

5. **Given** I submit the form with invalid data, **When** validation fails, **Then** errors are shown below the relevant fields (French "we" phrasing), **And** my changes are preserved — the form is not reset.

## Tasks / Subtasks

### Backend

- [x] Task 1: Create `ClubController` update endpoint (AC: #2, #3, #4)
  - [x] 1.1 Create `PATCH /clubs/:clubId` endpoint in `libs/api/features/src/lib/club/club.controller.ts`
  - [x] 1.2 Apply guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` with `@Roles('OWNER')`
  - [x] 1.3 Create `update-club.dto.ts` importing `updateClubSchema` from `@canifed/shared/types`
  - [x] 1.4 Use `ZodValidationPipe` for request body validation

- [x] Task 2: Create `ClubService.update()` method (AC: #2, #3)
  - [x] 2.1 Implement `update(clubId: string, data: UpdateClub)` in `club.service.ts`
  - [x] 2.2 Scope query with `WHERE id = clubId` (Club table is the tenant root — no FK to itself)
  - [x] 2.3 Wrap response in `{ data: updatedClub }` envelope
  - [x] 2.4 Return only public fields (no internal metadata)

- [x] Task 3: Create `ClubController` get-settings endpoint (AC: #1)
  - [x] 3.1 Create `GET /clubs/:clubId` endpoint returning current club data
  - [x] 3.2 Apply guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` with `@Roles('OWNER')`

- [x] Task 4: Logo upload via R2 (AC: #3)
  - [x] 4.1 Create `POST /clubs/:clubId/logo` endpoint accepting multipart file upload
  - [x] 4.2 Validate MIME type (image/jpeg, image/png, image/webp) and size (max 2MB)
  - [x] 4.3 Use `R2Service` to upload with tenant-scoped key: `clubs/{clubId}/logo/{filename}`
  - [x] 4.4 Generate signed URL and update Club.logo field
  - [x] 4.5 Delete old logo from R2 if exists (cleanup)
  - [x] 4.6 On upload failure, preserve old logo — return error response

- [x] Task 5: Write backend tests (AC: all)
  - [x] 5.1 `club.controller.spec.ts` — test OWNER-only access, 403 for ADMIN/MEMBER
  - [x] 5.2 `club.service.spec.ts` — test update logic, field validation
  - [x] 5.3 Test logo upload validation (type, size rejection)

### Frontend

- [x] Task 6: Create `ClubSettings` page component (AC: #1, #2, #5)
  - [x] 6.1 Create `libs/frontend/features/src/lib/onboarding/ClubSettings.tsx`
  - [x] 6.2 Use React Hook Form + `updateClubSchema` from `@canifed/shared/types`
  - [x] 6.3 Pre-populate form with current club data fetched via TanStack Query
  - [x] 6.4 Validation mode: `onBlur` (per architecture spec)
  - [x] 6.5 Error messages in French "we" phrasing below each field
  - [x] 6.6 Form preserves input on validation failure (no reset)

- [x] Task 7: Club settings form fields (AC: #1, #2)
  - [x] 7.1 Club name input (required, min 2 chars)
  - [x] 7.2 Federation radio selection (FFSLC, CNEAC, Other, None)
  - [x] 7.3 Logo upload with camera-first option + file picker
  - [x] 7.4 Contact email input (required, email format)
  - [x] 7.5 Description textarea (optional, max 500 chars)
  - [x] 7.6 Submit button: full width on mobile, disabled during submission, loading indicator

- [x] Task 8: Logo upload UI (AC: #3)
  - [x] 8.1 Display current logo preview (or placeholder if none)
  - [x] 8.2 Camera-first upload button (prominent) + file picker (secondary)
  - [x] 8.3 Client-side validation: type (JPEG, PNG, WebP) and size (max 2MB)
  - [x] 8.4 Show upload progress indicator
  - [x] 8.5 On success: update preview immediately
  - [x] 8.6 On failure: preserve old logo, show error toast (red, persistent until dismissed)

- [x] Task 9: Success/error feedback (AC: #2, #5)
  - [x] 9.1 On successful update: green toast "Paramètres du club mis à jour" (auto-dismiss 3s)
  - [x] 9.2 On error: red toast at top of screen, persistent until dismissed
  - [x] 9.3 On validation error: scroll to first error, focus the errored field
  - [x] 9.4 Invalidate TanStack Query cache for club data to refresh header/club switcher

- [x] Task 10: Route and access control (AC: #4)
  - [x] 10.1 Add lazy-loaded route for club settings page in `app.tsx`
  - [x] 10.2 Hide settings menu item for non-OWNER roles (check `role` from AuthContext)
  - [x] 10.3 Protect route: redirect non-OWNER to 403 or club dashboard
  - [x] 10.4 TanStack Query key: `['club', clubId, 'settings']`

- [x] Task 11: Write frontend tests (AC: all)
  - [x] 11.1 `ClubSettings.test.tsx` — form rendering, validation, submit flow
  - [x] 11.2 Test OWNER-only visibility of settings menu item

## Dev Notes

### Architecture Compliance

- **Guard chain:** Every club settings endpoint MUST use `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` with `@Roles('OWNER')`. Order matters: authenticate → identify tenant → check permission.
- **Service layer:** Controller delegates to `ClubService` — never call Prisma directly from controller.
- **Response envelope:** All API responses wrapped in `{ data: ... }` format.
- **Error format:** Structured JSON: `{ statusCode, error, message, details? }`. Frontend maps error codes to French messages.
- **Club is the tenant root:** The Club table itself doesn't have a `clubId` FK — use `WHERE id = clubId` from the JWT/guard context. All other tenant-scoped tables use `WHERE clubId = ?`.

### Technical Stack Requirements

- **Backend:** NestJS with `@nestjs/passport`, `@nestjs/jwt`, guards from `libs/api/core/src/lib/guards/`
- **ORM:** Prisma 7.5 with `@prisma/adapter-pg` — queries via `PrismaService` in `libs/api/core`
- **Validation:** Zod schemas from `libs/shared/types/src/lib/schemas/club.schema.ts` — `updateClubSchema` is already defined as `createClubSchema.partial()`
- **Frontend forms:** React Hook Form + Zod resolver, mode `onBlur`
- **Server state:** TanStack Query for fetching/caching club data
- **Client state:** AuthContext provides `{ user, activeClub, role }` — use `role` to gate OWNER-only access
- **File upload:** Multipart upload → NestJS validate → R2 PutObject → signed URL. Use `R2Service` (defined in `libs/api/features/src/lib/document/r2.service.ts`). Import and inject into ClubModule.
- **Testing:** Vitest 4. Co-located `*.spec.ts` / `*.test.tsx` files. No separate test directories.

### Existing Code to Reuse

- **Zod schema:** `libs/shared/types/src/lib/schemas/club.schema.ts` — `createClubSchema` and `updateClubSchema` already exist. The `updateClubSchema` makes all fields optional via `.partial()`. Note: `federation` field in schema uses `z.string().min(1)` but the Prisma model uses `federationType` column — the DTO mapping must handle this field name difference.
- **Prisma model:** `Club` model in `schema.prisma` has fields: `id`, `name`, `federationType`, `logo`, `contactEmail`, `description`, `createdAt`, `updatedAt`.
- **Guards:** `jwt-auth.guard.ts`, `club.guard.ts`, `roles.guard.ts` in `libs/api/core/src/lib/guards/`
- **Decorators:** `@Roles()`, `@CurrentUser()`, `@CurrentClub()` in `libs/api/core/src/lib/decorators/`
- **Pipes:** `ZodValidationPipe` in `libs/api/core/src/lib/pipes/`
- **Filters:** `AllExceptionsFilter` in `libs/api/core/src/lib/filters/`
- **R2Service:** `libs/api/features/src/lib/document/r2.service.ts` — reuse for logo upload. Do NOT create a new upload service.
- **shadcn/ui components:** Button, Card, Input, Select, Form, Toast already available in `libs/frontend/ui/src/lib/components/`
- **AppShell layout:** `libs/frontend/ui/src/lib/AppShell.tsx` — contains header and bottom tab bar where club name/logo appears

### Zod Schema Alignment Issue

The existing `club.schema.ts` has a `federation` field but the Prisma model uses `federationType`. Either:
1. Map `federation` → `federationType` in the DTO/service layer, OR
2. Update the Zod schema field name to match Prisma

Choose option 1 (map in service) to avoid breaking any existing consumers of the schema. Document this mapping clearly in the service.

### File Structure (where to create/modify files)

**Backend (create):**
- `libs/api/features/src/lib/club/club.module.ts`
- `libs/api/features/src/lib/club/club.controller.ts`
- `libs/api/features/src/lib/club/club.service.ts`
- `libs/api/features/src/lib/club/dto/update-club.dto.ts`
- `libs/api/features/src/lib/club/club.controller.spec.ts`
- `libs/api/features/src/lib/club/club.service.spec.ts`

**Frontend (create):**
- `libs/frontend/features/src/lib/onboarding/ClubSettings.tsx`
- `libs/frontend/features/src/lib/onboarding/ClubSettings.test.tsx`
- `libs/frontend/features/src/lib/onboarding/hooks/useClubSettings.ts` (TanStack Query hook)

**Frontend (modify):**
- `apps/frontend/src/app/app.tsx` — add lazy route for settings page
- Club switcher / header component — ensure it reads from TanStack Query cache that gets invalidated on update

### UX Requirements

- **Form pattern:** Primary button at bottom, full width on mobile. Disable during submission with loading indicator.
- **Toasts:** Success = green, top of screen, auto-dismiss 3s. Error = red, top of screen, persistent until dismissed.
- **Validation errors:** Inline below fields, French "we" phrasing (e.g., "Nous avons besoin d'une adresse email valide").
- **On error:** Scroll to first error, focus the errored field. Form input is NOT reset.
- **Logo upload:** Camera-first (prominent button) + file picker (secondary/ghost). Show progress indicator during upload. Preview current logo.
- **Access control UI:** Settings menu item hidden for non-OWNER. Direct URL access for non-OWNER redirects to dashboard (don't show 403 page — just redirect).
- **Touch targets:** Minimum 44x44px on mobile (per WCAG 2.1 AA / NFR22).
- **French UI text:** All user-facing strings in French. No i18n library — hardcoded strings for MVP.

### API Endpoints

| Method | Path | Guards | Description |
|--------|------|--------|-------------|
| `GET` | `/clubs/:clubId` | JwtAuth, ClubGuard, Roles(OWNER) | Get club settings data |
| `PATCH` | `/clubs/:clubId` | JwtAuth, ClubGuard, Roles(OWNER) | Update club settings |
| `POST` | `/clubs/:clubId/logo` | JwtAuth, ClubGuard, Roles(OWNER) | Upload new club logo |

### Anti-Patterns to Avoid

- Do NOT call Prisma directly from controller — always through `ClubService`
- Do NOT create a new upload service — reuse `R2Service` from document module
- Do NOT define Zod schemas inline — import from `@canifed/shared/types`
- Do NOT use `console.log` — use NestJS `Logger` with class context
- Do NOT return raw Prisma entities — wrap in `{ data: mappedDto }`
- Do NOT use spinners for page loading — use skeleton placeholders (except file upload progress)
- Do NOT auto-dismiss error toasts — they must persist until user dismisses
- Do NOT query Club without proper guard chain — even though Club is the tenant root, the guard chain validates the user's membership and role

### Dependencies

- **Story 3.1 (Guided Club Registration):** Creates the Club record and ClubMember with OWNER role. Story 3.2 assumes clubs already exist. Both stories are in the same epic and share the `club/` module — the controller/service created here should also host the create endpoint from 3.1.
- **Epic 1 (Foundation):** Prisma schema, guards, pipes, filters, PrismaService must be in place.
- **Epic 2 (Auth):** JWT auth, login, and ClubGuard must be functional for the guard chain to work.

### Project Structure Notes

- Club settings frontend lives in `libs/frontend/features/src/lib/onboarding/` per the FR-to-Structure mapping (`Club (FR1-FR5)` → `libs/frontend/features/onboarding/`).
- The `ClubSetupWizard.tsx` (from story 3.1) and `ClubSettings.tsx` (this story) are siblings in the onboarding feature folder.
- Backend club module at `libs/api/features/src/lib/club/` — this is the shared module for all Club FR1-FR5 features.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Club Settings Management] — acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — naming, structure, guard chain, API format
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries] — file locations, module boundaries
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] — JWT payload, guard ordering, roles
- [Source: _bmad-output/planning-artifacts/prd.md#Club Management] — FR1-FR5 functional requirements
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy] — toast, form, feedback patterns
- [Source: libs/shared/types/src/lib/schemas/club.schema.ts] — existing Zod schemas
- [Source: libs/shared/prisma-client/prisma/schema.prisma#Club model] — database model

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Backend tests: 13 controller + 16 service tests passing
- Frontend tests: 6 ClubSettings tests passing
- Pre-existing failures in MemberDirectory/MemberProfile (from other stories, unrelated)

### Completion Notes List
- Installed `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` for R2 integration
- Created R2Service at `libs/api/features/src/lib/document/r2.service.ts` for reuse by future document features
- Mapped `federation` (Zod schema) ↔ `federationType` (Prisma model) in ClubService per option 1 (service-layer mapping)
- Existing `createClub` tests fixed (switched from NestJS TestingModule to direct instantiation)
- AppShell admin nav now filters items by role — "Parametres" visible only to OWNER
- Logo upload uses raw fetch (not apiClient) since multipart requires no Content-Type header
- ResponseWrapperInterceptor auto-wraps responses in `{ data: ... }` envelope

### File List
**Created:**
- `libs/api/features/src/lib/document/r2.service.ts`
- `libs/api/features/src/lib/club/dto/update-club.dto.ts`
- `libs/frontend/features/src/lib/onboarding/ClubSettings.tsx`
- `libs/frontend/features/src/lib/onboarding/ClubSettings.test.tsx`
- `libs/frontend/features/src/lib/onboarding/hooks/useClubSettings.ts`

**Modified:**
- `libs/api/features/src/lib/club/club.controller.ts` — added GET/:clubId, PATCH/:clubId, POST/:clubId/logo
- `libs/api/features/src/lib/club/club.service.ts` — added findOne, update, updateLogo, getLogo
- `libs/api/features/src/lib/club/club.module.ts` — added R2Service provider
- `libs/api/features/src/lib/club/club.controller.spec.ts` — extended with settings/update/logo tests
- `libs/api/features/src/lib/club/club.service.spec.ts` — extended with findOne/update/logo tests
- `libs/frontend/features/src/lib/features.tsx` — added /clubs/settings route
- `libs/frontend/ui/src/lib/AppShell.tsx` — OWNER-only settings nav, path → /clubs/settings
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status → in-progress
- `package.json` / `package-lock.json` — added @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
