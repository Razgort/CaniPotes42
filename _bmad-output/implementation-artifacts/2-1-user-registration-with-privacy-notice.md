# Story 2.1: User Registration with Privacy Notice

Status: ready-for-dev

## Story

As a new user,
I want to create an account with my email and password while being informed about data usage,
So that I have a secure identity on the platform and understand how my data is handled.

## Acceptance Criteria

1. **Given** I am on the registration page
   **When** I fill in my email and password
   **Then** the form validates on blur using the shared `registerSchema` (valid email format, password minimum 8 characters)
   **And** required fields are marked with asterisk (*), labels are above inputs, single column layout on mobile
   **And** input font size is minimum 16px to prevent iOS zoom on focus

2. **Given** I submit a valid registration form
   **When** the API processes my request
   **Then** a new User record is created with email and bcrypt-hashed password (never stored in plaintext)
   **And** a privacy notice is displayed during signup explaining data usage (FR46)
   **And** my consent for optional data collection (photos, communications) is recorded with a timestamp (FR49)
   **And** I receive a success toast (green, auto-dismiss 3s) confirming account creation
   **And** I am redirected to the login page or directly logged in

3. **Given** I try to register with an email that already exists
   **When** the API processes my request
   **Then** a structured error is returned: `{ statusCode: 409, error: "EMAIL_EXISTS", message: "..." }`
   **And** the frontend displays a French error message (e.g., "Cette adresse email est deja utilisee")
   **And** my input is preserved — the form is not cleared

4. **Given** I submit the form with invalid data
   **When** validation fails on blur
   **Then** error messages appear below the errored fields in red
   **And** the submit button remains enabled but submission is blocked until errors are fixed

## Tasks / Subtasks

- [ ] Task 1: Create auth feature module backend (AC: #1, #2, #3, #4)
  - [ ] 1.1 Create `libs/api/features/src/lib/auth/auth.module.ts` — NestJS module importing JwtModule, PassportModule, PrismaService
  - [ ] 1.2 Create `libs/api/features/src/lib/auth/auth.service.ts` — registration logic: validate uniqueness, bcrypt hash, create User + Consent records in transaction
  - [ ] 1.3 Create `libs/api/features/src/lib/auth/auth.controller.ts` — `POST /auth/register` endpoint (public, no guards)
  - [ ] 1.4 Create `libs/api/features/src/lib/auth/dto/register.dto.ts` — imports `registerSchema` from `@canifed/types`
  - [ ] 1.5 Register AuthModule in FeaturesModule (`libs/api/features/src/lib/features.module.ts`)
  - [ ] 1.6 Write co-located tests: `auth.service.spec.ts`, `auth.controller.spec.ts`

- [ ] Task 2: Create registration page frontend (AC: #1, #2, #3, #4)
  - [ ] 2.1 Create `libs/frontend/features/src/lib/auth/RegisterForm.tsx` — React Hook Form + Zod resolver + `registerSchema`
  - [ ] 2.2 Include privacy notice section with consent checkbox (consentType: "privacy_notice" + "optional_data")
  - [ ] 2.3 Add `/register` route in `apps/frontend/src/app/app.tsx` (lazy-loaded)
  - [ ] 2.4 Create `libs/frontend/features/src/lib/auth/hooks/useAuth.ts` — TanStack Query mutation for registration
  - [ ] 2.5 Create API client function in `libs/frontend/data-access/` for auth endpoints

- [ ] Task 3: Error handling & UX polish (AC: #3, #4)
  - [ ] 3.1 Map backend error codes to French user messages in frontend
  - [ ] 3.2 Implement toast notifications (green success, red error) using existing UI library patterns
  - [ ] 3.3 Preserve form input on error (never clear fields)
  - [ ] 3.4 Auto-focus first field on form load

## Dev Notes

### Backend Implementation

**Auth module location:** `libs/api/features/src/lib/auth/`

**Registration endpoint:** `POST /auth/register` — public (NO guards)
- Validate body with `ZodValidationPipe` using `registerSchema` from `@canifed/types`
- Check email uniqueness via `prisma.user.findUnique({ where: { email } })`
- Hash password with `bcrypt` (install `bcrypt` + `@types/bcrypt` if not present)
- Create User record: `email`, `passwordHash`, `firstName: ''`, `lastName: ''` (empty — profile completed later)
- Create Consent records in same transaction:
  - `{ userId, consentType: 'privacy_notice', granted: true, grantedAt: now }`
  - `{ userId, consentType: 'optional_data', granted: <from request body>, grantedAt: now }`
- Return `{ data: { id, email, createdAt } }` — NEVER return passwordHash
- On duplicate email: throw `ConflictException` with error code `EMAIL_EXISTS`

**NestJS module pattern (follow exactly):**
```
auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  dto/
    register.dto.ts
  auth.controller.spec.ts
  auth.service.spec.ts
```

**Registration request body extension:** The shared `registerSchema` only has `email` + `password`. The register endpoint also needs consent data. Create a `registerWithConsentSchema` in the DTO that extends `registerSchema` with:
```typescript
const registerWithConsentSchema = registerSchema.extend({
  acceptPrivacyNotice: z.literal(true), // must accept
  acceptOptionalData: z.boolean().default(false), // optional
});
```
Keep this DTO-level schema in `dto/register.dto.ts` — do NOT modify the shared `registerSchema` in `@canifed/types`.

**Error response format (from Story 1.2):**
```json
{
  "statusCode": 409,
  "error": "EMAIL_EXISTS",
  "message": "Un compte existe deja avec cette adresse email"
}
```

**Use NestJS Logger** — `private readonly logger = new Logger(AuthService.name)`. Never `console.log`.

### Frontend Implementation

**Registration form location:** `libs/frontend/features/src/lib/auth/RegisterForm.tsx`

**Form setup:**
- `react-hook-form` with `@hookform/resolvers/zod` resolver
- Validate mode: `"onBlur"` (not onChange, not onSubmit)
- Use `registerSchema` from `@canifed/types` extended client-side for consent fields
- Labels above inputs (not floating/inline)
- Single column layout
- Input `font-size: 16px` minimum (CSS `text-base` in Tailwind = 1rem = 16px)
- Required fields marked with `*`
- Auto-focus email field on mount

**Privacy notice section:**
- Display a summary of data usage above consent checkboxes
- Mandatory checkbox: "J'accepte la politique de confidentialite" (required to submit)
- Optional checkbox: "J'accepte que mes photos et communications soient utilisees" (default unchecked)
- Link to full privacy policy (can be placeholder URL for MVP)

**Error display:**
- Error messages below each field in red (`text-destructive` from shadcn theme)
- 409 EMAIL_EXISTS → "Cette adresse email est deja utilisee"
- Network errors → "Une erreur est survenue, veuillez reessayer"
- On error: do NOT clear form, preserve all input

**Success flow:**
- Green toast: "Votre compte a ete cree avec succes"
- Auto-dismiss after 3 seconds
- Redirect to `/login` page

**Route setup:**
```tsx
// In app.tsx route definitions
const RegisterPage = React.lazy(() => import('../routes/register'));
// Route: path="/register" element={<RegisterPage />}
```

**API client pattern:**
```typescript
// libs/frontend/data-access/src/lib/api-client.ts
// POST /auth/register — no auth header needed (public endpoint)
```

### Architecture Compliance

- **Guard chain:** Registration is PUBLIC — no JwtAuthGuard, no ClubGuard, no RolesGuard
- **Response envelope:** Wrap in `{ data }` via ResponseWrapperInterceptor (already global)
- **Validation pipeline:** ZodValidationPipe validates request body server-side (defense in depth)
- **Module imports:** Import `registerSchema` from `@canifed/types` — NEVER define inline
- **Relative imports:** Use `.js` extensions (nodenext module resolution)
- **Tests co-located:** `*.spec.ts` next to source files, using Vitest 4
- **Logging:** NestJS `Logger` with class name context
- **No direct Prisma in controller:** All DB operations go through AuthService

### Database Context

**Relevant models (already exist in schema.prisma):**
- `User` — `id`, `email`, `passwordHash`, `firstName`, `lastName`, `avatarUrl`, timestamps
- `Consent` — `id`, `userId`, `consentType`, `granted`, `grantedAt`, `revokedAt`, timestamps

**Note:** `firstName` and `lastName` are required in the schema but registration only collects email + password. Set them to empty strings `''` at registration — they'll be populated during profile setup or club onboarding.

### Library & Framework Requirements

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `bcrypt` | Latest | Password hashing | Install + `@types/bcrypt` |
| `@nestjs/passport` | Already installed (Story 1.2) | Auth framework | |
| `@nestjs/jwt` | Already installed (Story 1.2) | JWT token handling | Not needed for register endpoint but imported in AuthModule for future stories |
| `zod` | ^4.3.6 (installed) | Schema validation | Shared schemas in `@canifed/types` |
| `react-hook-form` | Install if missing | Form management | With `@hookform/resolvers` for Zod integration |
| `@hookform/resolvers` | Install if missing | Zod resolver for RHF | |

### File Structure Requirements

**Files to CREATE:**
```
libs/api/features/src/lib/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  dto/
    register.dto.ts
  auth.controller.spec.ts
  auth.service.spec.ts

libs/frontend/features/src/lib/auth/
  RegisterForm.tsx
  hooks/
    useAuth.ts

apps/frontend/src/app/routes/
  register.tsx                    ← route-level component (lazy-loaded)
```

**Files to MODIFY:**
```
libs/api/features/src/lib/features.module.ts  ← import AuthModule
apps/frontend/src/app/app.tsx                 ← add /register route
libs/frontend/data-access/src/lib/api-client.ts ← add auth API functions (if exists, otherwise create)
```

**Files to NEVER modify:**
```
libs/shared/types/src/lib/schemas/auth.schema.ts  ← shared schema, extend in DTO only
libs/shared/prisma-client/prisma/schema.prisma     ← schema already has User + Consent models
libs/api/core/                                     ← core infrastructure already built
```

### Testing Requirements

**Backend tests (Vitest 4, co-located `*.spec.ts`):**
- `auth.service.spec.ts`:
  - Successful registration creates User + Consent records
  - Duplicate email throws ConflictException with EMAIL_EXISTS code
  - Password is hashed with bcrypt (verify hash !== plaintext)
  - Consent records created with correct types and timestamps
- `auth.controller.spec.ts`:
  - POST /auth/register returns 201 with `{ data: { id, email } }`
  - POST /auth/register with invalid body returns 400 VALIDATION_ERROR
  - POST /auth/register with existing email returns 409 EMAIL_EXISTS
  - Response NEVER includes passwordHash

**Frontend tests (Vitest 4, co-located `*.test.tsx`):**
- RegisterForm validates on blur
- RegisterForm shows error messages below fields
- RegisterForm preserves input on error
- Privacy notice checkbox is required for submission

### Previous Story Intelligence

**From Epic 1 stories (1.1, 1.2, 1.3):**
- PrismaService is available via DI from CoreModule — inject it in AuthService
- ZodValidationPipe is global — no need to add per-endpoint
- AllExceptionsFilter is global — throw standard NestJS HttpExceptions
- ResponseWrapperInterceptor is global — return plain objects, they'll be wrapped in `{ data }`
- JWT strategy and guards exist but are NOT needed for this story (registration is public)
- Module resolution requires `.js` extensions on all relative imports
- All relative imports: `import { foo } from './bar.js'`
- Cross-lib imports: `import { registerSchema } from '@canifed/types'`

### Anti-Patterns to Prevent

- Do NOT create a separate `__tests__/` directory — tests go next to source
- Do NOT use `class-validator` or `class-transformer` — Zod only
- Do NOT call Prisma directly from controller — go through service
- Do NOT return raw Prisma entities — map to response DTO
- Do NOT store password in plaintext — bcrypt hash only
- Do NOT return `passwordHash` in any API response
- Do NOT use `console.log` — NestJS Logger only
- Do NOT define validation schemas inline — import from `@canifed/types` or extend in DTO
- Do NOT add guards to registration endpoint — it's public
- Do NOT use numeric IDs — UUID v4 only
- Do NOT forget `.js` extension on relative imports

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Authorization Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Code Organization]
- [Source: _bmad-output/planning-artifacts/prd.md#FR6, FR46, FR49]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns, Registration Flow]
- [Source: _bmad-output/implementation-artifacts/1-2-api-core-infrastructure.md#Guard Chain, Error Format]
- [Source: _bmad-output/implementation-artifacts/1-3-shared-zod-schemas.md#Auth Schemas]
- [Source: libs/shared/prisma-client/prisma/schema.prisma#User, Consent models]
- [Source: libs/shared/types/src/lib/schemas/auth.schema.ts#registerSchema, loginSchema]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
