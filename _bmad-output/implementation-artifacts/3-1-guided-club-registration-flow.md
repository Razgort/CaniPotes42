# Story 3.1: Guided Club Registration Flow

Status: review

## Story

As a logged-in user,
I want to register a new club through a guided step-by-step onboarding flow,
So that I can create my club's digital home in under 10 minutes without technical knowledge.

## Acceptance Criteria

1. **Given** I am a logged-in user, **When** I navigate to "Register your club", **Then** I enter a guided onboarding flow with progress dots showing my advancement.

2. **Given** I am on Step 1 (Club Name), **When** I enter the club name, **Then** the input auto-focuses, validates on blur (required, min 2 characters), and I tap Continue to proceed.

3. **Given** I am on Step 2 (Federation), **When** I select a federation affiliation, **Then** I can choose from FFSLC, CNEAC, Other, or None via radio selection, and I tap Continue.

4. **Given** I am on Step 3 (Club Logo), **When** I see the logo upload option, **Then** a camera-first upload is prominent with file picker as secondary, a "Skip" ghost button is clearly visible (logo is optional), and uploaded images are validated for type (JPEG, PNG, WebP) and size (max 2MB).

5. **Given** I am on Step 4 (Contact & Description), **When** I enter the contact email and optional description, **Then** email validates on blur (valid format required), description is labeled "(optional)".

6. **Given** I complete all steps and confirm, **When** the API processes club creation, **Then**:
   - A `Club` record is created with the provided information
   - A `ClubMember` record is created with my userId, the new clubId, and role = OWNER
   - My JWT is refreshed with the new `activeClubId` and role = OWNER
   - I see a success confirmation screen with the club name and congratulatory message
   - I am redirected to the club dashboard showing an onboarding checklist (invite members, assign admins)
   - Empty states are shown for events ("No events yet"), members (just me), and other sections

7. **Given** I navigate back during the onboarding flow, **When** I tap the back arrow, **Then** my previously entered input is preserved.

## Tasks / Subtasks

### Backend

- [x] Task 1: Create Club feature module (AC: #1, #6)
  - [x] Create `libs/api/features/src/lib/club/club.module.ts`
  - [x] Create `libs/api/features/src/lib/club/club.controller.ts`
  - [x] Create `libs/api/features/src/lib/club/club.service.ts`
  - [x] Register ClubModule in FeaturesModule

- [x] Task 2: Implement POST /api/clubs endpoint (AC: #6)
  - [x] Controller: `@Post()` with `@UseGuards(JwtAuthGuard)` only (no ClubGuard — user has no club yet)
  - [x] Validate body with `ZodValidationPipe(createClubSchema)`
  - [x] Service: create Club + ClubMember (role=OWNER) in a Prisma `$transaction`
  - [x] Service: generate new JWT with `activeClubId` and `role: OWNER`
  - [x] Return `{ data: { club, accessToken, refreshToken } }`

- [x] Task 3: Handle logo upload (AC: #4)
  - [x] Accept `multipart/form-data` or base64 in request body
  - [x] Validate file type (JPEG, PNG, WebP) and size (max 2MB)
  - [x] Store in Cloudflare R2 with club-scoped key: `clubs/{clubId}/logo.{ext}`
  - [x] Save signed URL in `Club.logo` field
  - [x] If no logo uploaded, `Club.logo` remains `null`

- [x] Task 4: Write backend tests (AC: all)
  - [x] `club.controller.spec.ts` — endpoint routing, guard application, validation
  - [x] `club.service.spec.ts` — transaction logic, ClubMember creation, JWT refresh

### Frontend

- [x] Task 5: Create OnboardingStep component (AC: #1, #7)
  - [x] Create `libs/frontend/ui/src/lib/OnboardingStep.tsx`
  - [x] Props: `currentStep`, `totalSteps`, `icon`, `title`, `subtitle`, `children`, `onBack`, `onContinue`, `showSkip`, `onSkip`
  - [x] Render progress dots (completed=filled, current=active, future=muted)
  - [x] Auto-focus first input on mount
  - [x] Back button preserves state (no form reset)

- [x] Task 6: Create ClubRegistrationFlow page (AC: #1-#7)
  - [x] Create `libs/frontend/features/src/lib/club-registration/ClubRegistrationFlow.tsx`
  - [x] Manage multi-step state with `useState` (step index + form data object)
  - [x] Step 1: Club name input (min 2 chars, validate on blur)
  - [x] Step 2: Federation radio group (FFSLC, CNEAC, Other, None)
  - [x] Step 3: Logo upload (camera-first, file picker secondary, skip button)
  - [x] Step 4: Contact email (required, validate on blur) + description (optional)
  - [x] Confirmation step: submit to API, show loading state

- [x] Task 7: Create success screen and routing (AC: #6)
  - [x] Success screen with club name, congratulatory message
  - [x] Update AuthContext with new JWT (activeClubId, role)
  - [x] Redirect to club dashboard after brief delay or CTA click
  - [x] Add route: `/clubs/new` → ClubRegistrationFlow

- [x] Task 8: Create TanStack Query mutation hook (AC: #6)
  - [x] Create `libs/frontend/features/src/lib/club-registration/hooks/useCreateClub.ts`
  - [x] `useMutation` calling `POST /api/clubs`
  - [x] `onSuccess`: update AuthContext, invalidate queries, show success toast
  - [x] `onError`: show error toast with French message

- [x] Task 9: Write frontend tests (AC: all)
  - [x] `OnboardingStep.test.tsx` — renders progress dots, focus behavior, back navigation
  - [x] `ClubRegistrationFlow.test.tsx` — step navigation, validation, form state preservation

### Schema Updates

- [x] Task 10: Update createClubSchema validation (AC: #2, #3)
  - [x] Change `name` min from 1 to 2: `z.string().min(2).max(100)`
  - [x] Change `federation` from free-form string to enum: `z.enum(['FFSLC', 'CNEAC', 'OTHER', 'NONE'])`
  - [x] Verify `updateClubSchema` inherits via `.partial()`

## Dev Notes

### Critical Architecture Constraints

**Guard usage for club creation endpoint:**
The `POST /api/clubs` endpoint is special — the user is authenticated (has JWT) but does NOT yet belong to any club. Therefore:
- Use `@UseGuards(JwtAuthGuard)` ONLY — no ClubGuard, no RolesGuard
- Extract userId via `@CurrentUser()` decorator
- After creation, issue a new JWT with `activeClubId` and `role: OWNER`

**All other club endpoints** (PATCH, DELETE, GET) use the full guard chain: `JwtAuthGuard → ClubGuard → RolesGuard`.

**Transaction requirement:**
Club creation MUST be atomic — use `prisma.$transaction()` to create both the `Club` record and the `ClubMember(role=OWNER)` record. If either fails, neither should persist.

**JWT refresh after creation:**
After creating the club, the service must generate a new access token containing `{ sub: userId, email, activeClubId: newClub.id, role: 'OWNER' }` and a new refresh token cookie. The frontend must update AuthContext with this new token immediately.

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | Notes |
|------|-------|-------|
| Prisma Club model | `libs/shared/prisma-client/prisma/schema.prisma` | Already defined with all fields |
| Prisma ClubMember model | Same file | Join table with `@@unique([userId, clubId])` |
| createClubSchema / updateClubSchema | `libs/shared/types/src/lib/schemas/club.schema.ts` | **Needs min(2) and federation enum update** |
| Role enum | `libs/shared/types/src/lib/enums.ts` | `OWNER`, `ADMIN`, `MEMBER` |
| JwtAuthGuard | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Validates Bearer token |
| ClubGuard | `libs/api/core/src/lib/guards/club.guard.ts` | NOT used on create endpoint |
| @CurrentUser decorator | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extracts JWT payload |
| ZodValidationPipe | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Validates request body |
| AllExceptionsFilter | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Structured error responses |
| ResponseWrapperInterceptor | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | Wraps in `{ data }` |
| PrismaService | `libs/api/core/src/lib/prisma.service.ts` | Inject via DI |
| AppShell | `libs/frontend/ui/src/lib/AppShell.tsx` | Responsive layout |
| JwtModule | `libs/api/core/src/lib/config/jwt.config.ts` | For signing new tokens |

### Schema Discrepancies to Fix

The existing `createClubSchema` in `club.schema.ts` has two discrepancies with the acceptance criteria:
1. `name` uses `.min(1)` but AC requires min 2 characters → change to `.min(2)`
2. `federation` is a free-form string but AC specifies radio selection from FFSLC/CNEAC/Other/None → change to `z.enum(['FFSLC', 'CNEAC', 'OTHER', 'NONE'])`

### File Structure for New Code

```
libs/api/features/src/lib/club/
  club.module.ts
  club.controller.ts
  club.service.ts
  club.controller.spec.ts
  club.service.spec.ts

libs/frontend/features/src/lib/club-registration/
  ClubRegistrationFlow.tsx
  ClubRegistrationFlow.test.tsx
  components/
    SuccessScreen.tsx
  hooks/
    useCreateClub.ts

libs/frontend/ui/src/lib/
  OnboardingStep.tsx
  OnboardingStep.test.tsx
```

### API Endpoint Specification

**POST /api/clubs** (Create club)
- Auth: `JwtAuthGuard` only (no ClubGuard)
- Body: `{ name: string, federation: 'FFSLC'|'CNEAC'|'OTHER'|'NONE', contactEmail: string, description?: string, logo?: File }`
- Response 201: `{ data: { id, name, federation, logo, contactEmail, description, createdAt }, accessToken: string }`
- Response 400: `{ statusCode: 400, error: 'VALIDATION_ERROR', message: '...', details: [...] }`
- Response 401: `{ statusCode: 401, error: 'UNAUTHORIZED', message: '...' }`
- Side effects: Creates ClubMember with role=OWNER, issues new JWT

### UX Requirements

**OnboardingStep component pattern (UX-DR9):**
- Progress dots: filled (completed), active ring (current), muted (future)
- One question per screen — eliminates cognitive overload
- Auto-focus input on step mount
- Back arrow preserves all previously entered data
- Mobile-first: full-width inputs, min 44x44px touch targets, 48px CTA buttons

**Logo upload (camera-first pattern per UX-DR19):**
- Primary CTA: camera icon button (opens camera on mobile)
- Secondary: "Choose file" text link
- Skip: ghost button with equal visual weight
- Validation feedback: inline error below upload area

**French UI strings:**
- Step 1 title: "Nom du club"
- Step 2 title: "Fédération"
- Step 3 title: "Logo du club"
- Step 4 title: "Contact et description"
- Success: "Club créé avec succès !"
- Error toast: "Nous n'avons pas pu créer le club. Veuillez réessayer."

**Design tokens:**
- Primary: `--primary: #2563EB`
- Accent/CTA: `--accent: #F97316`
- Success: `--success: #16A34A`
- Danger: `--danger: #DC2626`
- Font: Inter, body min 14px, labels min 16px

### Testing Requirements

- Co-locate tests: `*.spec.ts` (backend), `*.test.tsx` (frontend)
- Backend: Test transaction rollback on failure, ClubMember creation, JWT refresh
- Frontend: Test step navigation, form state preservation on back, validation messages, success redirect
- Run via: `npx nx run-many -t test --projects=api-features,frontend-features,frontend-ui`

### Anti-Patterns (DO NOT)

- Do NOT use ClubGuard on the create endpoint (user has no club yet)
- Do NOT use `console.log` — use NestJS `Logger`
- Do NOT call Prisma directly in the controller — always go through ClubService
- Do NOT create club and member in separate queries — use `$transaction`
- Do NOT use class-validator — this project uses Zod exclusively
- Do NOT store logo as base64 in the database — upload to R2 and store URL
- Do NOT forget `.js` extension on relative imports (nodenext module resolution)
- Do NOT create a separate `__tests__/` directory — co-locate tests with source
- Do NOT hardcode French strings in multiple places — keep in component, centralize later

### Dependencies

**Epic 1 prerequisites (must be complete):**
- Story 1.1 (Prisma schema) — `review` status, Club/ClubMember models exist
- Story 1.2 (API core infrastructure) — `review` status, guards/pipes/filters exist
- Story 1.3 (Shared Zod schemas) — `review` status, club schemas exist

**Epic 2 prerequisites (must be complete):**
- Story 2.1-2.3 (Auth) — `backlog` status. **WARNING:** Auth stories are not yet implemented. This story requires a working auth system (login, JWT issuance, JwtStrategy). If auth is not yet built, the club creation endpoint cannot verify the user's identity.

> **Blocker risk:** Epic 2 (Authentication) is still in backlog. The dev agent must verify auth module exists before implementing. If auth is missing, implement a minimal JwtStrategy + register/login flow first, or stub it for development.

### Project Structure Notes

- Nx monorepo with non-buildable libs — Vite resolves imports directly via tsconfig path aliases
- Workspace scope alias: `@org/*` mapped in root tsconfig
- Run tasks via Nx: `npx nx run api:serve`, `npx nx run frontend:serve`
- Prisma CLI: `npx nx run prisma-client:prisma-generate`, migrations via `prisma migrate dev`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 3, Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Multi-tenancy, Guard Chain, API Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1-FR5, Journey 5 (Aude)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 3, UX-DR9, UX-DR19]
- [Source: libs/shared/types/src/lib/schemas/club.schema.ts — Existing Zod schemas]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Club, ClubMember models]
- [Source: libs/api/core/src/lib/ — Guards, decorators, pipes, filters, interceptors]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Tasks 1-4, 10 (Backend + Schema): Already implemented in prior stories. Club module, controller, service, tests, and Zod schema all existed with correct implementation matching ACs.
- Task 5: Created OnboardingStep reusable component with progress dots (filled/active/muted), auto-focus, back navigation, skip button, loading state. 13 unit tests passing.
- Task 6: Created ClubRegistrationFlow with 4-step wizard (name, federation, logo, contact). Uses useState for step/form state, validates on blur, preserves input on back navigation.
- Task 7: Created SuccessScreen with congratulatory message, auto-redirect after 3s, CTA button. Added /clubs/new route with ProtectedRoute. Updated LoginForm redirect from /club-setup to /clubs/new.
- Task 8: Created useCreateClub mutation hook using TanStack Query. On success: updates AuthContext via updateClubSession, invalidates queries, shows French toast. On error: shows French error toast.
- Task 9: 13 ClubRegistrationFlow tests (step navigation, validation, form preservation, submit flow, success screen). 13 OnboardingStep tests (rendering, interactions, focus). All passing.
- Added updateClubSession method to AuthContext for post-club-creation token refresh.

### File List

**New files:**
- libs/frontend/ui/src/lib/OnboardingStep.tsx
- libs/frontend/ui/src/lib/OnboardingStep.test.tsx
- libs/frontend/features/src/lib/club-registration/ClubRegistrationFlow.tsx
- libs/frontend/features/src/lib/club-registration/ClubRegistrationFlow.test.tsx
- libs/frontend/features/src/lib/club-registration/components/SuccessScreen.tsx
- libs/frontend/features/src/lib/club-registration/hooks/useCreateClub.ts

**Modified files:**
- libs/frontend/data-access/src/lib/AuthContext.tsx (added updateClubSession method + ClubSessionUpdate type)
- libs/frontend/data-access/src/index.ts (exported ClubSessionUpdate type)
- libs/frontend/ui/src/index.ts (exported OnboardingStep)
- libs/frontend/features/src/lib/features.tsx (added /clubs/new route + lazy import)
- libs/frontend/features/src/lib/auth/LoginForm.tsx (changed redirect from /club-setup to /clubs/new)
- libs/frontend/features/src/lib/auth/LoginForm.test.tsx (updated test to expect /clubs/new)

### Change Log

- 2026-03-22: Implemented Story 3.1 frontend — guided club registration flow with 4-step onboarding wizard, success screen, routing, mutation hook, and comprehensive tests. Backend was already complete from prior stories.
