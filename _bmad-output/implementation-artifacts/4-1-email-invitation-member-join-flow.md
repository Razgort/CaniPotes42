# Story 4.1: Email Invitation & Member Join Flow

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a club admin,
I want to invite new members by email so they can join the club,
So that growing the club is frictionless and invitees get a guided path to joining.

## Acceptance Criteria

1. **Given** I am an admin or owner of the club, **When** I navigate to the invite members section, **Then** I see a form to enter one or more email addresses.

2. **Given** I submit valid email addresses, **When** the API processes the invitations, **Then**:
   - An `Invitation` record is created for each email with a unique token (UUID) and expiry (7 days)
   - The MailService sends an email to each address with a deep link to join the club
   - A success toast confirms: "Invitations envoyées"
   - Duplicate invitations to the same email for the same club are prevented — a clear message is shown

3. **Given** an invited user clicks the invitation link **and does not have an account**, **When** they land on the app, **Then**:
   - They are directed to the registration page with the invitation token pre-loaded (query param `?invite=<token>`)
   - After registration, a `ClubMember` record is created (role = MEMBER) and they auto-join the club
   - Their JWT is issued with the new club as `activeClubId`

4. **Given** an invited user clicks the invitation link **and already has an account**, **When** they land on the app, **Then**:
   - They are directed to the login page (or auto-join if already logged in)
   - After login, a `ClubMember` record is created (role = MEMBER) and they auto-join the club

5. **Given** the invitation link has expired, **When** the user clicks it, **Then** they see a friendly message: "Cette invitation a expiré. Demandez à un administrateur de vous renvoyer une invitation."

6. **Given** I am a regular member (not admin/owner), **When** I try to access the invite feature, **Then**:
   - The invite option is not visible in the UI
   - Direct API calls return 403 Forbidden

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Add `Invitation` model to Prisma schema** (AC: #2)
  - [ ] Add `Invitation` model with fields: `id` (UUID), `clubId` (FK), `email`, `token` (UUID, unique), `expiresAt` (DateTime), `acceptedAt` (DateTime?), `createdAt`, `updatedAt`
  - [ ] Add `@@unique([clubId, email])` to prevent duplicate active invitations
  - [ ] Add `@@index([token])` for fast token lookup
  - [ ] Add `invitations` relation to `Club` model
  - [ ] Run `npx nx run prisma-client:prisma-migrate` to generate migration

- [ ] **Task 2: Add invitation Zod schemas** (AC: #1, #2)
  - [ ] Create `invitation.schema.ts` in `libs/shared/types/src/lib/schemas/`
  - [ ] Define `createInvitationSchema` — accepts `emails: z.array(z.string().email()).min(1).max(10)` (batch invite)
  - [ ] Define `acceptInvitationSchema` — accepts `token: z.string().uuid()`
  - [ ] Export from `libs/shared/types/src/lib/schemas/index.ts`

- [ ] **Task 3: Create `member` feature module** (AC: #1-6)
  - [ ] Create `libs/api/features/src/lib/member/member.module.ts`
  - [ ] Create `libs/api/features/src/lib/member/member.controller.ts`
  - [ ] Create `libs/api/features/src/lib/member/member.service.ts`
  - [ ] Create `libs/api/features/src/lib/member/invite.service.ts`
  - [ ] Create `libs/api/features/src/lib/member/dto/create-invitation.dto.ts` — imports from shared `createInvitationSchema`
  - [ ] Create `libs/api/features/src/lib/member/dto/accept-invitation.dto.ts`
  - [ ] Register `MemberModule` in `FeaturesModule`

- [ ] **Task 4: Implement invitation endpoints** (AC: #1, #2, #5, #6)
  - [ ] `POST /clubs/:clubId/invitations` — guarded by `JwtAuthGuard`, `ClubGuard`, `RolesGuard` with `@Roles('ADMIN', 'OWNER')`. Accepts `{ emails: string[] }`. Creates `Invitation` records, sends emails, returns `{ data: { sent: number, duplicates: string[] } }`
  - [ ] `GET /invitations/:token` — **public endpoint** (no auth guards). Validates token exists, not expired, not already accepted. Returns `{ data: { clubName, clubLogo, email, status: 'valid'|'expired'|'already_accepted' } }`
  - [ ] `POST /invitations/:token/accept` — **public or authenticated**. If user is authenticated (JWT present), creates `ClubMember` directly. If not, returns `{ data: { redirectTo: '/register', token } }` to frontend

- [ ] **Task 5: Implement MailService** (AC: #2)
  - [ ] Install `@nestjs-modules/mailer` + `nodemailer` (add to `package.json`)
  - [ ] Create `libs/api/core/src/lib/mail/mail.service.ts` — wraps mailer with club-branded invitation template
  - [ ] Create `libs/api/core/src/lib/mail/mail.module.ts` — configures SMTP from env vars
  - [ ] Add env vars to `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - [ ] Add env vars to `libs/shared/utils/src/lib/env.schema.ts` (with defaults for dev: use Ethereal or console transport)
  - [ ] Export `MailModule` and `MailService` from `libs/api/core/src/index.ts`
  - [ ] Invitation email template: subject "Vous êtes invité à rejoindre {clubName} sur CaniFed", body with deep link `{FRONTEND_URL}/invite/{token}`

- [ ] **Task 6: Wire invitation accept into auth flow** (AC: #3, #4)
  - [ ] Modify `auth.service.ts` `register()` method — check for `invitationToken` param; if present, validate + create `ClubMember` + mark invitation `acceptedAt` in same transaction
  - [ ] Modify `auth.service.ts` `login()` method — check for `invitationToken` query param; if present, auto-join club after successful login
  - [ ] Ensure JWT issued after invite-based registration includes `activeClubId` and `role: MEMBER`

- [ ] **Task 7: Write backend tests** (AC: #1-6)
  - [ ] `invite.service.spec.ts` — test batch creation, duplicate prevention, expiry calculation, token generation
  - [ ] `member.controller.spec.ts` — test guards enforcement (403 for MEMBER role), valid creation, expired token handling
  - [ ] `member.service.spec.ts` — test accept flow for new users and existing users

### Frontend Tasks

- [ ] **Task 8: Create `InviteForm` component** (AC: #1, #2)
  - [ ] Create `libs/frontend/features/src/lib/members/InviteForm.tsx`
  - [ ] Multi-email input: text area, one email per line, or comma-separated
  - [ ] Validate with `createInvitationSchema` via React Hook Form + Zod (mode: `onBlur`)
  - [ ] Submit calls `POST /clubs/:clubId/invitations`
  - [ ] Show success toast: "Invitations envoyées" with count
  - [ ] Show duplicate warnings inline
  - [ ] Only render for users with `role === 'ADMIN' || role === 'OWNER'` (check from AuthContext)

- [ ] **Task 9: Create invitation accept page** (AC: #3, #4, #5)
  - [ ] Create `apps/frontend/src/app/routes/invite.tsx` — lazy-loaded route at `/invite/:token`
  - [ ] On mount: call `GET /invitations/:token`
  - [ ] If `valid` + user logged in → call `POST /invitations/:token/accept` → redirect to club dashboard
  - [ ] If `valid` + user NOT logged in → redirect to `/register?invite=<token>` with message "Créez votre compte pour rejoindre {clubName}"
  - [ ] If `expired` → show friendly message: "Cette invitation a expiré. Demandez à un administrateur de vous renvoyer une invitation."
  - [ ] If `already_accepted` → redirect to login or club dashboard

- [ ] **Task 10: Modify registration to handle invitation token** (AC: #3)
  - [ ] Update `RegisterForm.tsx` — read `invite` query param from URL
  - [ ] If `invite` param present, pass it to `POST /auth/register` body
  - [ ] After successful registration with invite: redirect to club dashboard (not onboarding)
  - [ ] Show club name in registration form header: "Rejoindre {clubName}"

- [ ] **Task 11: Create TanStack Query hooks** (AC: #1-5)
  - [ ] Create `libs/frontend/features/src/lib/members/hooks/useInvitations.ts`
  - [ ] `useCreateInvitations` mutation — `POST /clubs/:clubId/invitations`
  - [ ] `useInvitationStatus` query — `GET /invitations/:token`, query key: `['invitation', token]`
  - [ ] `useAcceptInvitation` mutation — `POST /invitations/:token/accept`

## Dev Notes

### Critical Schema Gap — Invitation Model Missing

The Prisma schema (`libs/shared/prisma-client/prisma/schema.prisma`) does NOT have an `Invitation` model. This MUST be added before any backend work. Required fields:

```prisma
model Invitation {
  id         String    @id @default(uuid())
  clubId     String
  email      String
  token      String   @unique @default(uuid())
  expiresAt  DateTime
  acceptedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  club Club @relation(fields: [clubId], references: [id], onDelete: Cascade)

  @@unique([clubId, email])
  @@index([token])
  @@index([clubId])
}
```

Also add `invitations Invitation[]` to the `Club` model relations.

### No Email Library Installed

`package.json` has NO email dependency. Install `@nestjs-modules/mailer` and `nodemailer`:
```bash
npm install @nestjs-modules/mailer nodemailer
npm install -D @types/nodemailer
```

For development, use Ethereal (fake SMTP) or a console transport that logs emails to stdout. Do NOT require real SMTP credentials to run locally.

### Existing Code to Reuse

| What | Where | How to use |
|---|---|---|
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Injects `request.clubId` and `request.clubRole` — use for tenant scoping |
| `RolesGuard` + `@Roles()` | `libs/api/core/src/lib/guards/roles.guard.ts` + `decorators/roles.decorator.ts` | Apply `@Roles('ADMIN', 'OWNER')` on invite endpoint |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extract current user from request |
| `@CurrentClub()` | `libs/api/core/src/lib/decorators/current-club.decorator.ts` | Extract clubId from request |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Apply to DTOs for validation |
| `ResponseWrapperInterceptor` | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | Auto-wraps responses in `{ data }` envelope |
| `AllExceptionsFilter` | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Structured error JSON |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Singleton Prisma client — inject in services |
| `inviteMemberSchema` | `libs/shared/types/src/lib/schemas/member.schema.ts` | Existing single-email schema — extend for batch |
| `Role` enum | `libs/shared/types/src/lib/enums.ts` | `OWNER`, `ADMIN`, `MEMBER` |
| `registerSchema` | `libs/shared/types/src/lib/schemas/auth.schema.ts` | Will need modification to accept optional `invitationToken` field |

### Project Structure Notes

Follow the architecture's member module structure exactly:

```
libs/api/features/src/lib/
  member/
    member.module.ts
    member.controller.ts
    member.service.ts
    invite.service.ts          ← handles invitation CRUD + token validation
    dto/
      create-invitation.dto.ts ← imports createInvitationSchema from shared/types
      accept-invitation.dto.ts
    member.controller.spec.ts
    member.service.spec.ts
    invite.service.spec.ts
```

Frontend member features:

```
libs/frontend/features/src/lib/
  members/
    InviteForm.tsx
    hooks/
      useInvitations.ts
```

New route:
```
apps/frontend/src/app/routes/invite.tsx  ← lazy-loaded via React.lazy()
```

### API Endpoint Design

| Method | Path | Auth | Guards | Description |
|---|---|---|---|---|
| `POST` | `/clubs/:clubId/invitations` | JWT required | `JwtAuthGuard → ClubGuard → RolesGuard` | Create invitations (ADMIN/OWNER only) |
| `GET` | `/invitations/:token` | Public | None | Check invitation status |
| `POST` | `/invitations/:token/accept` | Optional JWT | `JwtAuthGuard` (optional) | Accept invitation |

### Guard Chain Compliance

- Invitation creation: Full guard chain `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')`
- Invitation status check: NO guards (public endpoint — invitee may not have an account)
- Invitation accept: Optional auth — if JWT present, use it; if not, redirect to registration
- NEVER skip `ClubGuard` on tenant-scoped endpoints

### Response Format Compliance

All responses MUST follow the envelope pattern:

```typescript
// Invitation created
{ "data": { "sent": 3, "duplicates": ["already@invited.com"] } }

// Invitation status
{ "data": { "clubName": "Cani'Potes 42", "email": "user@example.com", "status": "valid" } }

// Error
{ "statusCode": 403, "error": "FORBIDDEN", "message": "Permissions insuffisantes", "details": [] }
```

### Email Template Requirements

- Subject: "Vous êtes invité à rejoindre {clubName} sur CaniFed"
- Body: Club name, club logo (if exists), invitation link `{FRONTEND_URL}/invite/{token}`
- CTA button: "Rejoindre le club"
- Footer: "Cette invitation expire dans 7 jours."
- All text in French

### Testing Standards

- Co-locate all tests with source: `*.spec.ts` for backend, `*.test.tsx` for frontend
- Use NestJS testing module for controller/service tests
- Mock `PrismaService` in unit tests
- Mock `MailService` in unit tests — verify email sending without actual SMTP
- Test guard enforcement: verify 403 for MEMBER role on invite endpoint
- Test token expiry: create invitation with past `expiresAt`, verify rejection
- Test duplicate prevention: attempt to invite same email twice, verify error

### Environment Variables (add to `.env.example`)

```
# Email Configuration (for invitation emails)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@canifed.app

# Frontend URL (for invitation deep links)
FRONTEND_URL=http://localhost:4200
```

### Cross-Story Dependencies

- **Story 4.2** (Member Directory) depends on `ClubMember` records created by this story
- **Story 4.3** (Role Management) builds on the member module created here
- **Story 4.4** (Club Switcher) needs the `/auth/switch-club` endpoint — out of scope here but JWT structure must support it
- This story depends on **Epic 2** (Authentication) being complete — registration and login flows must exist

### Anti-Pattern Prevention

- DO NOT create Prisma queries directly in controllers — use `invite.service.ts`
- DO NOT define Zod schemas inline in DTOs — import from `libs/shared/types`
- DO NOT use `console.log` — use NestJS `Logger` with class context
- DO NOT return raw Prisma entities — always map to DTOs and wrap in `{ data }` envelope
- DO NOT create a `__tests__/` directory — co-locate tests
- DO NOT use numeric IDs — all IDs are UUID v4
- DO NOT skip `ClubGuard` on the invitation creation endpoint
- DO NOT hardcode SMTP credentials — use env vars
- DO NOT send real emails in test/dev — use Ethereal or console transport

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4 Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 3 Club Onboarding]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — ClubMember model]
- [Source: libs/shared/types/src/lib/schemas/member.schema.ts — existing schemas]
- [Source: libs/api/core/src/index.ts — available guards, decorators, pipes]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
