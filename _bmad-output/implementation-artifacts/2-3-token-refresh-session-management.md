# Story 2.3: Token Refresh & Session Management

Status: review

## Story

As a logged-in user,
I want my session to stay alive seamlessly via token refresh and to be able to log out,
So that I don't get unexpectedly kicked out during normal use but can end my session when I want.

## Acceptance Criteria (BDD)

1. **Given** my access token has expired (after 15 minutes), **When** the frontend makes an API request, **Then** the API client automatically calls `POST /auth/refresh` with the httpOnly refresh cookie, a new access token is issued, and the original request is retried transparently — the user experiences no interruption or error.

2. **Given** my refresh token has expired (after 7 days), **When** the frontend attempts to refresh, **Then** the refresh fails, the AuthContext is cleared, I am redirected to the login page, and a toast informs me: "Votre session a expiré, veuillez vous reconnecter".

3. **Given** I am logged in, **When** I tap the logout action, **Then** the refresh token cookie is cleared (server-side invalidation), the access token is removed from memory, the AuthContext is reset to unauthenticated state, and I am redirected to the login page.

4. **Given** I am not authenticated, **When** I try to access any protected route, **Then** I am redirected to the login page, and after login I am redirected back to the originally requested page.

## Dependencies

- **Story 2.1** (User Registration) and **Story 2.2** (User Login & JWT Session) MUST be implemented first. They create the auth module, auth service, auth controller, bcrypt hashing, login endpoint, JWT token generation, and AuthContext on frontend.
- This story builds ON TOP of 2.1/2.2. Do NOT recreate auth module/service/controller from scratch — extend what 2.1/2.2 created.

## Tasks / Subtasks

- [x] Task 1: Backend — Refresh token endpoint (AC: #1, #2)
  - [x] Add `POST /auth/refresh` to `libs/api/features/src/lib/auth/auth.controller.ts` (no auth guard — public endpoint, reads httpOnly cookie)
  - [x] In `auth.service.ts`, add `refreshTokens(refreshToken: string)` method:
    - Verify refresh token using `JWT_REFRESH_SECRET`
    - Look up user from `sub` claim via PrismaService
    - If user not found or token invalid/expired → throw `UnauthorizedException`
    - Issue new access token (15min) with current `{ sub, email, activeClubId, role }` by reading latest ClubMember
    - Issue new refresh token (7d) — rotation: old token is replaced
    - Return new access token in response body + set new refresh token as httpOnly cookie
  - [x] Add `@SkipThrottle()` or appropriate rate limit on refresh endpoint (avoid blocking legitimate refreshes but prevent abuse)

- [x] Task 2: Backend — Logout endpoint (AC: #3)
  - [x] Add `POST /auth/logout` to auth controller (guarded: `@UseGuards(JwtAuthGuard)`)
  - [x] In `auth.service.ts`, add `logout(userId: string)` method:
    - Clear the refresh token cookie by setting it to empty with `maxAge: 0`
    - Return success response
  - [x] Response clears the `refresh_token` httpOnly cookie

- [x] Task 3: Frontend — Axios/fetch interceptor for transparent token refresh (AC: #1, #2)
  - [x] In `libs/frontend/data-access/src/lib/api-client.ts`, add response interceptor:
    - On 401 response: attempt `POST /auth/refresh` (with credentials to send cookie)
    - If refresh succeeds: update in-memory access token, retry original request with new token
    - If refresh fails: clear AuthContext, redirect to `/login`
    - Implement request queue: while refresh is in-flight, queue subsequent requests and retry all after refresh completes (prevent multiple simultaneous refresh calls)
  - [x] Ensure `withCredentials: true` (or `credentials: 'include'`) is set on the API client for cookie transport

- [x] Task 4: Frontend — AuthContext session management (AC: #2, #3, #4)
  - [x] In `libs/frontend/data-access/src/lib/AuthContext.tsx`:
    - Add `logout()` method: calls `POST /auth/logout`, clears access token from memory, resets AuthContext state
    - Add redirect-after-login: store the attempted URL before redirect to `/login`, restore after successful login
    - On refresh token expiry (401 from refresh endpoint): clear AuthContext, redirect to login, show toast "Votre session a expiré, veuillez vous reconnecter"
  - [x] Expose `logout` and `isAuthenticated` from AuthContext

- [x] Task 5: Frontend — Protected route guard (AC: #4)
  - [x] Create `libs/frontend/features/src/lib/auth/ProtectedRoute.tsx`:
    - Wrap routes that require authentication
    - If not authenticated: save current path, redirect to `/login`
    - After login success: redirect to saved path (or default `/`)
  - [x] Integrate with React Router in `apps/frontend/src/app/app.tsx`

- [x] Task 6: Backend + Frontend — Unit & integration tests
  - [x] `auth.service.spec.ts`: test `refreshTokens()` — valid refresh, expired refresh, invalid token, user not found
  - [x] `auth.controller.spec.ts`: test `POST /auth/refresh` and `POST /auth/logout` endpoints
  - [x] Frontend: test api-client interceptor refresh flow (mock 401 → refresh → retry)
  - [x] Frontend: test ProtectedRoute redirect behavior
  - [x] Frontend: test AuthContext logout flow

## Dev Notes

### Critical Architecture Constraints

- **Guard chain**: `JwtAuthGuard → ClubGuard → RolesGuard`. The refresh endpoint is PUBLIC (no guards). The logout endpoint uses `@UseGuards(JwtAuthGuard)` only (no ClubGuard needed since we're just clearing the session).
- **Token strategy**: Access token (JWT, 15min) in Authorization header + refresh token (JWT, 7d) in httpOnly cookie. Access token is stored in memory only (not localStorage). Refresh token is httpOnly — frontend JS cannot read it.
- **JWT payload**: `{ sub: userId, email, activeClubId, role }`. The refresh endpoint must re-read the user's current `activeClubId` and `role` from the database (via ClubMember) when issuing a new access token — do NOT just copy from the old token.
- **JWT secrets**: Access token uses `JWT_SECRET`, refresh token uses `JWT_REFRESH_SECRET` (separate secrets). Both are validated in `env.schema.ts` (min 16 chars).
- **Error format**: All errors must follow `{ statusCode, error, message, details? }`. Use NestJS exception classes (`UnauthorizedException`, etc.), the global `AllExceptionsFilter` handles formatting.
- **Rate limiting**: `@nestjs/throttler` is globally applied via `APP_GUARD`. Use `@SkipThrottle()` decorator if refresh endpoint needs exemption, or set a reasonable per-endpoint limit.
- **Logging**: Use NestJS `Logger` with class context (never `console.log`). Never log tokens, passwords, or PII.

### Existing Infrastructure to Reuse (DO NOT RECREATE)

| Component | Location | What It Does |
|---|---|---|
| `JwtAuthGuard` | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Passport JWT auth guard |
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Tenant isolation guard |
| `JwtStrategy` | `libs/api/core/src/lib/strategies/jwt.strategy.ts` | Passport JWT strategy, validates Bearer token |
| `JwtPayload` interface | `libs/api/core/src/lib/strategies/jwt.strategy.ts` | `{ sub, email, activeClubId, role }` |
| `jwtConfig` | `libs/api/core/src/lib/config/jwt.config.ts` | JWT module config (15min expiry, `JWT_SECRET`) |
| `jwtConstants` | `libs/api/core/src/lib/config/jwt.config.ts` | Refresh token config (7d, httpOnly cookie options) |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extracts `request.user` |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Database access |
| `CoreModule` | `libs/api/core/src/lib/api-core.ts` | Global module, exports JwtModule, PassportModule |
| `AllExceptionsFilter` | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Structured error responses |
| `ResponseWrapperInterceptor` | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | `{ data }` envelope |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Request body validation |
| `registerSchema`, `loginSchema` | `libs/shared/types/src/lib/schemas/auth.schema.ts` | Zod schemas for auth |
| `env.schema.ts` | `libs/shared/utils/src/lib/env.schema.ts` | Validates `JWT_SECRET`, `JWT_REFRESH_SECRET` |

### File Structure — Where to Create/Modify

**Backend (extend auth module created by stories 2.1/2.2):**
```
libs/api/features/src/lib/auth/
  auth.module.ts          ← MODIFY: ensure JwtModule available for signing
  auth.controller.ts      ← MODIFY: add POST /auth/refresh, POST /auth/logout
  auth.service.ts         ← MODIFY: add refreshTokens(), logout() methods
  dto/
    refresh-token.dto.ts  ← CREATE (if needed for response typing)
  auth.controller.spec.ts ← MODIFY: add tests for refresh + logout
  auth.service.spec.ts    ← MODIFY: add tests for refreshTokens(), logout()
```

**Frontend (modify existing, create ProtectedRoute):**
```
libs/frontend/data-access/src/lib/
  api-client.ts           ← MODIFY: add 401 interceptor with refresh logic + request queue

apps/frontend/src/app/providers/
  auth-provider.tsx       ← MODIFY: add logout(), redirect-after-login, session expiry handling

libs/frontend/features/src/lib/auth/
  ProtectedRoute.tsx      ← CREATE: route guard component
  ProtectedRoute.test.tsx ← CREATE: test

apps/frontend/src/app/
  app.tsx                 ← MODIFY: wrap protected routes with ProtectedRoute
```

### Token Refresh Flow (Sequence)

```
1. Frontend makes API request with expired access token
2. Backend returns 401 Unauthorized
3. API client interceptor catches 401
4. Interceptor calls POST /auth/refresh (with httpOnly cookie — withCredentials: true)
5. Backend validates refresh token (JWT_REFRESH_SECRET)
6. Backend looks up user + current club membership
7. Backend issues new access token (15min) + new refresh token (7d, rotated)
8. Backend returns { data: { accessToken } } + sets new refresh_token cookie
9. Interceptor updates in-memory token
10. Interceptor retries original request with new access token
11. User experiences zero interruption
```

### Refresh Token Rotation

When a refresh token is used, issue a NEW refresh token and invalidate the old one (by setting a new cookie). This prevents token replay attacks. If we detect a reused refresh token in the future (post-MVP), it indicates a stolen token — invalidate all sessions for that user.

### Frontend Request Queue Pattern

When the first 401 triggers a refresh, any subsequent requests that also get 401 should NOT trigger their own refresh calls. Instead:
1. Set a `isRefreshing` flag
2. Queue all failed requests in a Promise array
3. When refresh completes, resolve all queued promises with the new token
4. If refresh fails, reject all queued promises

### UX Requirements

- **Session expiry toast**: Red toast, persists until dismissed. Message: "Votre session a expiré, veuillez vous reconnecter" (French "we" phrasing not applicable here — this is a factual session message)
- **Logout**: Instant, no confirmation dialog needed (reversible action — user can log back in)
- **Protected route redirect**: After login, return user to the page they originally tried to access. Store the path in React state (not localStorage).
- **No loading screen on refresh**: The token refresh is transparent. No spinner, no flash of login page.

### Testing Standards

- Co-locate tests: `*.spec.ts` for NestJS, `*.test.tsx` for React
- Vitest 4 with jsdom environment for frontend
- Use NestJS testing utilities (`Test.createTestingModule`) for backend
- Mock PrismaService and JwtService in unit tests
- Test edge cases: expired refresh token, concurrent refresh requests, network failures during refresh

### Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| Storing access token in localStorage | Store in memory only (variable/state) |
| Storing refresh token in localStorage | httpOnly cookie only (set by server) |
| `console.log` for debugging | NestJS `Logger` with class context |
| Direct Prisma calls in controller | Always go through service layer |
| Copying old JWT claims on refresh | Re-read user/club data from DB |
| Multiple simultaneous refresh calls | Request queue pattern (single refresh) |
| Hardcoded French strings in backend | Backend returns error codes, frontend maps to French messages |
| Creating new auth module from scratch | Extend the module created by stories 2.1/2.2 |

### Project Structure Notes

- All auth files live in `libs/api/features/src/lib/auth/` (backend) and `libs/frontend/features/src/lib/auth/` (frontend)
- Shared types/schemas in `libs/shared/types/src/lib/schemas/auth.schema.ts`
- Core infrastructure (guards, decorators, config) in `libs/api/core/` — already built in story 1.2, DO NOT modify
- API client in `libs/frontend/data-access/src/lib/api-client.ts`
- Auth provider in `apps/frontend/src/app/providers/auth-provider.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.3, lines 487-518]
- [Source: _bmad-output/planning-artifacts/architecture.md — Authentication & Security section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard Execution Order section]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Response Formats section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Error Handling Pipeline section]
- [Source: _bmad-output/planning-artifacts/prd.md — FR6-FR12, NFR7-NFR9]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Feedback Patterns, Form Patterns]
- [Source: libs/api/core/src/lib/config/jwt.config.ts — jwtConstants with cookie options]
- [Source: libs/api/core/src/lib/strategies/jwt.strategy.ts — JwtPayload interface]
- [Source: libs/shared/types/src/lib/schemas/auth.schema.ts — registerSchema, loginSchema]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Tasks 1-2 (backend refresh + logout endpoints) were already implemented in prior sessions as part of story 2.1/2.2 groundwork. Verified correct: `POST /auth/refresh` with `@SkipThrottle()`, `POST /auth/logout` with `@UseGuards(JwtAuthGuard)`, token rotation, cookie clearing.
- Task 3: Rewrote `api-client.ts` to add transparent 401 → refresh → retry interceptor with request queue pattern. Concurrent requests during refresh are queued and resolved with the new token. Auth endpoints (`/auth/login`, `/auth/refresh`) skip the refresh attempt.
- Task 4: Updated `AuthContext.tsx` — `logout()` now calls `POST /auth/logout` before clearing state. Added `handleSessionExpired()` with toast "Votre session a expiré, veuillez vous reconnecter" (persists until dismissed). Added `setTokenSetter` integration for the interceptor to update access token in React state after refresh.
- Task 5: `ProtectedRoute` and `AppRoutes` integration were already implemented. `LoginForm` reads `location.state.from` for redirect-after-login.
- Task 6: Added 6 refreshTokens tests + 1 getClearRefreshTokenCookieOptions test to `auth.service.spec.ts`. Added 3 refresh tests + 1 logout test to `auth.controller.spec.ts`. Added 4 interceptor tests to `api-client.test.ts` (refresh flow, queue, skip for login, onUnauthorized). Added 2 ProtectedRoute tests. Added 3 AuthContext logout tests.
- All story 2.3 tests pass. Pre-existing failures in `invite.service.spec.ts` and `MemberProfile.test.tsx` are unrelated.

### Change Log

- 2026-03-22: Implemented story 2.3 — token refresh interceptor, AuthContext logout with API call, session expiry toast, comprehensive tests

### File List

- libs/frontend/data-access/src/lib/api-client.ts (MODIFIED — added refresh interceptor, request queue, setTokenSetter)
- libs/frontend/data-access/src/lib/AuthContext.tsx (MODIFIED — logout calls API, session expiry toast, setTokenSetter integration)
- libs/frontend/data-access/src/index.ts (MODIFIED — exported setTokenSetter)
- libs/frontend/data-access/src/lib/api-client.test.ts (MODIFIED — added 4 interceptor tests)
- libs/frontend/data-access/src/lib/AuthContext.test.tsx (MODIFIED — rewrote with login/logout tests, mock fetch)
- libs/frontend/features/src/lib/auth/ProtectedRoute.test.tsx (CREATED — 2 tests for redirect behavior)
- libs/api/features/src/lib/auth/auth.service.spec.ts (MODIFIED — added 7 refreshTokens + logout tests)
- libs/api/features/src/lib/auth/auth.controller.spec.ts (MODIFIED — added 4 refresh + logout tests)
