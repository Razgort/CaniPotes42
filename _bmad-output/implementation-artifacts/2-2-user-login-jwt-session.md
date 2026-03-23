# Story 2.2: User Login & JWT Session

Status: review

## Story

As a registered user,
I want to log in with my email and password and receive a session scoped to my active club,
So that I can securely access my club's data.

## Acceptance Criteria

1. **Given** I am on the login page **When** I enter my email and password and submit **Then** the form validates using the shared `loginSchema` from `@canifed/shared-types` **And** the API verifies credentials against the bcrypt-hashed password

2. **Given** my credentials are valid **When** the API authenticates me **Then** I receive an access token (JWT, 15min expiry) containing `{ sub: userId, email, activeClubId, role }` **And** a refresh token (7d expiry) is set as an httpOnly cookie **And** if I belong to one club, `activeClubId` is set to that club with my role **And** if I belong to multiple clubs, `activeClubId` is set to my last active club (or first club if no preference) **And** if I belong to no clubs, `activeClubId` is null and I am redirected to club creation/join flow **And** the AuthContext on the frontend is populated with user, activeClub, token, and role **And** the API client in `libs/frontend/data-access` automatically injects the Authorization header on all requests

3. **Given** I enter invalid credentials **When** the API rejects the login **Then** a structured error is returned: `{ statusCode: 401, error: "INVALID_CREDENTIALS", message: "..." }` **And** the frontend displays a French error message (e.g., "Email ou mot de passe incorrect") **And** no information is leaked about whether the email exists or the password is wrong **And** rate limiting via `@nestjs/throttler` prevents brute force (e.g., 5 attempts per minute per IP)

4. **Given** I am not authenticated **When** I try to access any protected route **Then** I am redirected to the login page

## Tasks / Subtasks

### Backend

- [x] Create auth module structure (AC: 1, 2, 3)
  - [x] Create `libs/api/features/src/lib/auth/auth.module.ts`
  - [x] Create `libs/api/features/src/lib/auth/auth.service.ts`
  - [x] Create `libs/api/features/src/lib/auth/auth.controller.ts`
  - [x] Create `libs/api/features/src/lib/auth/dto/login.dto.ts`
  - [x] Register `AuthModule` in `FeaturesModule` imports
- [x] Implement login endpoint `POST /auth/login` (AC: 1, 2, 3)
  - [x] Validate request body with `loginSchema` via `ZodValidationPipe`
  - [x] Look up user by email (case-insensitive)
  - [x] Compare password with `bcrypt.compare()` against `user.passwordHash`
  - [x] Return generic "INVALID_CREDENTIALS" error for both email-not-found AND wrong-password
  - [x] Query `ClubMember` to determine `activeClubId` and `role` for JWT payload
  - [x] Sign access token with `{ sub: userId, email, activeClubId, role }` using `JwtService`
  - [x] Sign refresh token with `{ sub: userId }` using `JWT_REFRESH_SECRET`
  - [x] Set refresh token as httpOnly cookie using `jwtConstants.refreshTokenCookieOptions`
  - [x] Return `{ data: { accessToken, user: { id, email, firstName, lastName, avatarUrl }, activeClub: { id, name, role } | null } }`
- [x] Apply rate limiting on login endpoint (AC: 3)
  - [x] Use `@Throttle({ default: { limit: 5, ttl: 60000 } })` decorator on login route
- [x] Write unit tests (AC: 1, 2, 3)
  - [x] `auth.service.spec.ts` — valid login, invalid email, wrong password, no club membership, multi-club
  - [x] `auth.controller.spec.ts` — endpoint validation, response format, rate limiting

### Frontend

- [x] Create AuthContext provider (AC: 2, 4)
  - [x] Create/update `apps/frontend/src/app/providers/auth-provider.tsx`
  - [x] Provide `{ user, accessToken, activeClub, role, login(), logout(), isAuthenticated }`
  - [x] Store `accessToken` in memory (NOT localStorage — XSS risk)
  - [x] On login success, populate context from API response
  - [x] On logout or token failure, clear context and redirect to `/login`
- [x] Create LoginForm component (AC: 1, 3)
  - [x] Create `libs/frontend/features/src/lib/auth/LoginForm.tsx`
  - [x] Use React Hook Form with `loginSchema` from `@canifed/shared-types`
  - [x] Validate on blur (`mode: "onBlur"`)
  - [x] Single column layout, labels above inputs, 16px min font size
  - [x] Required fields marked with asterisk (*)
  - [x] Error messages below fields in red
  - [x] Submit button full width, disabled during submission with loading indicator
  - [x] On error: display French message "Email ou mot de passe incorrect", preserve input
  - [x] On success: green toast (auto-dismiss 3s), redirect based on club membership
- [x] Create login route page (AC: 1, 4)
  - [x] Create `apps/frontend/src/app/routes/login.tsx` (lazy-loaded via `React.lazy()`)
  - [x] Render `LoginForm` centered on page
  - [x] Link to registration page
- [x] Update API client with auth header injection (AC: 2)
  - [x] Update `libs/frontend/data-access/src/lib/api-client.ts`
  - [x] Inject `Authorization: Bearer <accessToken>` on all requests when token available
  - [x] Handle 401 responses (clear auth, redirect to login)
- [x] Create ProtectedRoute wrapper (AC: 4)
  - [x] Redirect unauthenticated users to `/login`
  - [x] After login, redirect back to originally requested page
- [x] Create `libs/frontend/features/src/lib/auth/hooks/useAuth.ts` TanStack Query mutation for login

## Dev Notes

### Existing Infrastructure (DO NOT recreate)

The following already exists in `libs/api/core/` — import and use, do NOT reimplement:

| Component | Path | Usage |
|---|---|---|
| `JwtStrategy` | `libs/api/core/src/lib/strategies/jwt.strategy.ts` | Passport strategy — validates JWT from Bearer token |
| `JwtAuthGuard` | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Apply to protected routes |
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Extracts `clubId` from JWT, validates membership |
| `RolesGuard` | `libs/api/core/src/lib/guards/roles.guard.ts` | RBAC check against `request.clubRole` |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extracts JWT payload from request |
| `@CurrentClub()` | `libs/api/core/src/lib/decorators/current-club.decorator.ts` | Extracts `clubId` set by ClubGuard |
| `@Roles()` | `libs/api/core/src/lib/decorators/roles.decorator.ts` | Sets metadata for RolesGuard |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Validates body against Zod schema |
| `AllExceptionsFilter` | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Global error formatting |
| `ResponseWrapperInterceptor` | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | Wraps responses in `{ data }` |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Database access |
| `jwtConfig` | `libs/api/core/src/lib/config/jwt.config.ts` | JWT module config (15m access, 7d refresh cookie) |
| `getCorsConfig` | `libs/api/core/src/lib/config/cors.config.ts` | CORS setup |
| `loginSchema` | `libs/shared/types/src/lib/schemas/auth.schema.ts` | Zod validation for login `{ email, password }` |
| `registerSchema` | `libs/shared/types/src/lib/schemas/auth.schema.ts` | Zod validation for registration |

All core providers (PrismaService, JwtModule, PassportModule, ThrottlerGuard) are already registered in `ApiCoreModule` (`libs/api/core/src/lib/api-core.ts`).

### JwtPayload Interface

Already defined in `jwt.strategy.ts`:
```typescript
interface JwtPayload {
  sub: string;        // userId
  email: string;
  activeClubId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}
```

### Dependencies Already Installed

All required packages are in `package.json` — do NOT install new packages:
- `bcrypt` + `@types/bcrypt` (v6)
- `@nestjs/jwt` (v11)
- `@nestjs/passport` (v11)
- `passport` + `passport-jwt` + `@types/passport-jwt`
- `@nestjs/throttler` (v6.5)

### Prisma User Model (already migrated)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  firstName    String?
  lastName     String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  memberships  ClubMember[]
  // ... other relations
}

model ClubMember {
  id     String @id @default(uuid())
  userId String
  clubId String
  role   Role   @default(MEMBER)
  user   User   @relation(fields: [userId], references: [id])
  club   Club   @relation(fields: [clubId], references: [id])
  @@unique([userId, clubId])
}

enum Role { OWNER ADMIN MEMBER }
```

### API Response Format

All responses are auto-wrapped by `ResponseWrapperInterceptor`. Return raw data from controllers — the interceptor wraps in `{ data }`.

Error responses use the global `AllExceptionsFilter` format:
```json
{ "statusCode": 401, "error": "INVALID_CREDENTIALS", "message": "..." }
```

Throw `UnauthorizedException` from the service layer. For custom error codes, extend with a custom HttpException:
```typescript
throw new UnauthorizedException({ error: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
```

### Rate Limiting

`ThrottlerGuard` is already registered globally as `APP_GUARD` in `ApiCoreModule` (10 req/60s default). Override per-route:
```typescript
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Post('login')
```

The login endpoint does NOT need `JwtAuthGuard` — it is a public endpoint.

### Frontend Patterns

- **Forms:** React Hook Form + Zod resolver, validate `onBlur`, single column, labels above inputs, 16px min input font, full-width submit button
- **Errors:** Red text below field, French "we" phrasing, never blame user. Error toasts persist until dismissed.
- **Success:** Green toast auto-dismiss 3s, then navigate
- **State:** TanStack Query for server state, React Context for auth state only
- **API client:** Centralized in `libs/frontend/data-access`. Inject Bearer token from AuthContext.
- **Routing:** `React.lazy()` + `Suspense` for route-level code splitting. Protected routes redirect to `/login`.
- **i18n:** Hardcoded French strings. No i18n library.

### Login Redirect Logic

After successful login, redirect based on club membership:
- **1 club:** Go to main app (events feed or dashboard)
- **Multiple clubs:** Go to main app with last-active club selected
- **No clubs:** Redirect to club creation/join flow (`/club-setup`)

Store the originally requested path before redirecting to login, so after login the user lands where they intended.

### Security Checklist

- [ ] Never return different errors for "email not found" vs "wrong password" — always "INVALID_CREDENTIALS"
- [ ] Never log passwords or tokens (NestJS Logger, never `console.log`)
- [ ] Access token in memory only (NOT localStorage)
- [ ] Refresh token as httpOnly, secure, sameSite=lax cookie
- [ ] Rate limit login endpoint (5 req/min/IP)
- [ ] bcrypt.compare for password verification
- [ ] No tenant-scoped guards on login (it's a public endpoint)

### File Structure for New Code

```
libs/api/features/src/lib/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      login.dto.ts
    auth.controller.spec.ts
    auth.service.spec.ts

libs/frontend/features/src/lib/
  auth/
    LoginForm.tsx
    hooks/
      useAuth.ts

apps/frontend/src/app/
  providers/
    auth-provider.tsx
  routes/
    login.tsx
```

### Project Structure Notes

- Auth backend module goes in `libs/api/features/src/lib/auth/` — same level as future club/, member/, etc.
- Frontend auth components in `libs/frontend/features/src/lib/auth/`
- Auth provider wraps the entire app in `apps/frontend/src/app/providers/auth-provider.tsx`
- Login route at `apps/frontend/src/app/routes/login.tsx`, lazy-loaded
- API client update in `libs/frontend/data-access/src/lib/api-client.ts` (currently minimal `fetchApi`)
- Shared schemas already exist at `libs/shared/types/src/lib/schemas/auth.schema.ts`

### Dependency Note: Story 2.1

This story depends on Story 2.1 (User Registration) for the User records to exist in the database. If 2.1 is not yet implemented, the login endpoint can still be built and tested with seed data or manually created users. The auth module, AuthContext, and API client infrastructure created here will be shared with 2.1.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Security section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/prd.md — FR6-FR12, NFR7-NFR10]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Form Validation, Error/Feedback Patterns]
- [Source: libs/api/core/src/lib/strategies/jwt.strategy.ts — JwtPayload interface]
- [Source: libs/api/core/src/lib/config/jwt.config.ts — Token expiry and cookie config]
- [Source: libs/shared/types/src/lib/schemas/auth.schema.ts — loginSchema, registerSchema]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed `ReferenceError: Cannot access 'logout' before initialization` in AuthContext by reordering useCallback definitions before useEffect hooks
- Fixed existing `features.test.tsx` — ProtectedRoute requires AuthProvider wrapping; updated test to use `getByRole('heading')` for disambiguating "Se connecter" text
- Fixed existing `api-client.test.ts` — added `credentials: 'include'` to expected fetch calls after adding cookie support

### Completion Notes List

- Backend: Extended existing auth module (from story 2.1) with login endpoint. Added `login()` method to AuthService with bcrypt verification, club membership lookup, JWT access/refresh token signing. Controller sets refresh token as httpOnly cookie and returns access token + user + active club in response body.
- Backend: Rate limiting applied via `@Throttle({ default: { limit: 5, ttl: 60000 } })` on login route (5 req/min/IP). Generic INVALID_CREDENTIALS error returned for both wrong email and wrong password (no info leakage).
- Backend: 25 unit tests passing (16 service + 9 controller) covering valid login, invalid email, wrong password, no club membership, multi-club, case-insensitive email, no passwordHash leakage, refresh token signing, and registration tests preserved.
- Frontend: Fully implemented AuthContext with login/logout state management, token injection via setTokenGetter, and 401 auto-logout via setOnUnauthorized.
- Frontend: LoginForm component with React Hook Form + Zod (loginSchema), onBlur validation, French UI, error toast "Email ou mot de passe incorrect", success toast + redirect logic (1 club → /, no clubs → /club-setup, preserve original path).
- Frontend: ProtectedRoute wrapper redirects unauthenticated users to /login with `state.from` for post-login redirect.
- Frontend: Login route page lazy-loaded, AppRoutes updated with /login route and ProtectedRoute on /.
- Frontend: API client updated with `credentials: 'include'` for cookie support and 401 handler.
- Frontend: 17 tests passing (7 LoginForm + 7 RegisterForm + 3 routing) covering form rendering, validation, successful login, club-based redirect, error handling, input preservation.
- All 7 projects pass tests (42 total tests). All 10 projects pass lint.

### File List

- libs/api/features/src/lib/auth/auth.service.ts (modified - added login method with JwtService dependency)
- libs/api/features/src/lib/auth/auth.controller.ts (modified - added POST /auth/login endpoint with rate limiting and cookie setting)
- libs/api/features/src/lib/auth/dto/login.dto.ts (new - login DTO re-exporting loginSchema from @org/types)
- libs/api/features/src/lib/auth/auth.service.spec.ts (modified - added 10 login tests)
- libs/api/features/src/lib/auth/auth.controller.spec.ts (modified - added 5 login tests)
- libs/frontend/data-access/src/lib/AuthContext.tsx (modified - full implementation with login/logout/token injection/401 handler)
- libs/frontend/data-access/src/lib/api-client.ts (modified - added credentials:include, setOnUnauthorized, 401 auto-logout)
- libs/frontend/data-access/src/lib/api-client.test.ts (modified - updated expected fetch calls with credentials:include)
- libs/frontend/data-access/src/index.ts (modified - exported LoginResponse and setOnUnauthorized)
- libs/frontend/features/src/lib/auth/LoginForm.tsx (new - login form component)
- libs/frontend/features/src/lib/auth/LoginForm.test.tsx (new - 7 tests for login form)
- libs/frontend/features/src/lib/auth/hooks/useLogin.ts (new - TanStack Query mutation for login)
- libs/frontend/features/src/lib/auth/ProtectedRoute.tsx (new - redirects unauthenticated users to /login)
- libs/frontend/features/src/lib/pages/LoginPage.tsx (new - login route page)
- libs/frontend/features/src/lib/features.tsx (modified - added /login route, ProtectedRoute on /)
- libs/frontend/features/src/lib/features.test.tsx (modified - updated for AuthProvider wrapping and new routing)
- _bmad-output/implementation-artifacts/2-2-user-login-jwt-session.md (modified - tasks checked, status review)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified - story status updated)

## Change Log

- 2026-03-22: Implemented story 2.2 - User Login & JWT Session. Backend login endpoint with bcrypt verification, JWT signing, rate limiting. Frontend AuthContext, LoginForm, ProtectedRoute, useLogin hook, login page. All 42 tests passing across 7 projects, all lint passing.
