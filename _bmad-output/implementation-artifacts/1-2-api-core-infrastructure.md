# Story 1.2: API Core Infrastructure (Guards, Filters, Pipes)

Status: review

## Story

As a developer,
I want the NestJS core infrastructure with guards, exception filters, validation pipes, interceptors, and decorators,
So that every feature module has security, tenant isolation, validation, and consistent error handling from the start.

## Acceptance Criteria

1. **Given** the `libs/api/core` library, **When** I review the core module, **Then** `JwtAuthGuard` exists and validates JWT tokens using `@nestjs/passport` + `passport-jwt` strategy
2. **And** `ClubGuard` exists and extracts `activeClubId` from the JWT payload, injects it into the request context, and rejects requests where the user is not a member of the claimed club
3. **And** `RolesGuard` exists and checks the user's role within the active club against `@Roles()` decorator requirements
4. **And** the guard execution order is enforced: `JwtAuthGuard` → `ClubGuard` → `RolesGuard`
5. **And** `AllExceptionsFilter` catches all exceptions and returns structured JSON: `{ statusCode, error, message, details? }`
6. **And** `ZodValidationPipe` accepts a Zod schema and validates request body/params/query, returning structured validation errors
7. **And** `ResponseWrapperInterceptor` wraps successful responses in `{ data }` envelope (single) or `{ data, meta }` (paginated)
8. **And** `@CurrentUser()` decorator extracts the authenticated user from the request
9. **And** `@CurrentClub()` decorator extracts the active clubId from the request
10. **And** `@Roles()` decorator sets metadata for `RolesGuard`
11. **And** JWT configuration uses access token (15min expiry) + refresh token (7d, httpOnly cookie)
12. **And** `@nestjs/throttler` is configured for rate limiting on public endpoints
13. **And** Helmet middleware is applied for security headers
14. **And** CORS is configured with a whitelist
15. **And** NestJS Logger is used with class context throughout (never `console.log`)

## Tasks / Subtasks

- [x] Task 1: Install required dependencies (AC: #1, #11, #12, #13)
  - [x] Install `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`
  - [x] Install `@nestjs/jwt`
  - [x] Install `@nestjs/throttler`
  - [x] Install `helmet`
  - [x] Install `zod` (if not already present)
  - [x] Verify all packages resolve correctly in the monorepo

- [x] Task 2: Create JWT configuration (AC: #11)
  - [x] Create `libs/api/core/src/lib/config/jwt.config.ts`
  - [x] Define access token config: secret from `JWT_SECRET` env var, 15min expiry
  - [x] Define refresh token config: secret from `JWT_REFRESH_SECRET` env var, 7d expiry, httpOnly cookie
  - [x] Export configuration for use in `JwtModule.registerAsync()`

- [x] Task 3: Create CORS configuration (AC: #14)
  - [x] Create `libs/api/core/src/lib/config/cors.config.ts`
  - [x] Configure origin whitelist from `CORS_ORIGINS` env var (comma-separated)
  - [x] Enable credentials for httpOnly cookie support

- [x] Task 4: Create custom decorators (AC: #8, #9, #10)
  - [x] Create `libs/api/core/src/lib/decorators/current-user.decorator.ts` — `createParamDecorator` extracting `request.user`
  - [x] Create `libs/api/core/src/lib/decorators/current-club.decorator.ts` — `createParamDecorator` extracting `request.clubId`
  - [x] Create `libs/api/core/src/lib/decorators/roles.decorator.ts` — `SetMetadata('roles', roles)` with `Role[]` parameter
  - [x] Create `libs/api/core/src/lib/decorators/index.ts` barrel export

- [x] Task 5: Create JwtAuthGuard + JWT Strategy (AC: #1, #4)
  - [x] Create `libs/api/core/src/lib/guards/jwt-auth.guard.ts` extending `AuthGuard('jwt')`
  - [x] Create `libs/api/core/src/lib/strategies/jwt.strategy.ts` extending `PassportStrategy(Strategy)`
  - [x] JWT strategy extracts Bearer token from Authorization header
  - [x] JWT strategy validates and returns payload: `{ sub, email, activeClubId, role }`
  - [x] Strategy attaches validated user to `request.user`

- [x] Task 6: Create ClubGuard (AC: #2, #4)
  - [x] Create `libs/api/core/src/lib/guards/club.guard.ts` implementing `CanActivate`
  - [x] Extract `activeClubId` from `request.user` (set by JwtAuthGuard)
  - [x] Inject PrismaService to verify user is a member of the claimed club via ClubMember lookup
  - [x] Inject `clubId` and `role` into request context (`request.clubId`, `request.clubRole`)
  - [x] Reject with `ForbiddenException` if user is not a member of the claimed club
  - [x] Use NestJS Logger (never console.log) (AC: #15)

- [x] Task 7: Create RolesGuard (AC: #3, #4)
  - [x] Create `libs/api/core/src/lib/guards/roles.guard.ts` implementing `CanActivate`
  - [x] Use `Reflector` to read `@Roles()` metadata from handler
  - [x] Compare `request.clubRole` (set by ClubGuard) against required roles
  - [x] If no `@Roles()` metadata, allow access (guard is permissive when no roles specified)
  - [x] Reject with `ForbiddenException` if role insufficient
  - [x] Create `libs/api/core/src/lib/guards/index.ts` barrel export

- [x] Task 8: Create AllExceptionsFilter (AC: #5)
  - [x] Create `libs/api/core/src/lib/filters/all-exceptions.filter.ts` implementing `ExceptionFilter`
  - [x] Catch `HttpException` subclasses and map to `{ statusCode, error, message, details? }`
  - [x] Catch unknown exceptions and map to 500 with generic message
  - [x] For `BadRequestException` with Zod details, include `details: [{ field, message }]`
  - [x] Log all 5xx errors via NestJS Logger (AC: #15)
  - [x] Never expose stack traces or internal details in response
  - [x] Create `libs/api/core/src/lib/filters/index.ts` barrel export

- [x] Task 9: Create ZodValidationPipe (AC: #6)
  - [x] Create `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` implementing `PipeTransform`
  - [x] Accept a Zod schema in constructor
  - [x] On `transform()`, parse value against schema
  - [x] On success, return parsed (coerced) value
  - [x] On failure, throw `BadRequestException` with field-level error details from `ZodError.issues`
  - [x] Create `libs/api/core/src/lib/pipes/index.ts` barrel export

- [x] Task 10: Create ResponseWrapperInterceptor (AC: #7)
  - [x] Create `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` implementing `NestInterceptor`
  - [x] Wrap single responses in `{ data }` envelope
  - [x] Detect paginated responses (objects with `items` + `total`/`count`) and wrap in `{ data, meta }` where `meta` contains pagination info
  - [x] Skip wrapping if response is already wrapped or null
  - [x] Create `libs/api/core/src/lib/interceptors/index.ts` barrel export

- [x] Task 11: Update CoreModule to register all providers (AC: #1-#12)
  - [x] Import and register `JwtModule.registerAsync()` with jwt.config
  - [x] Import and register `PassportModule`
  - [x] Import and register `ThrottlerModule.forRoot()` with default ttl/limit
  - [x] Register JWT strategy as a provider
  - [x] Export all guards, decorators, pipes, filters, interceptors
  - [x] Update `libs/api/core/src/index.ts` barrel exports

- [x] Task 12: Update main.ts bootstrap (AC: #5, #7, #12, #13, #14, #15)
  - [x] Apply `AllExceptionsFilter` globally via `app.useGlobalFilters()`
  - [x] Apply `ResponseWrapperInterceptor` globally via `app.useGlobalInterceptors()`
  - [x] Apply Helmet middleware via `app.use(helmet())`
  - [x] Configure CORS via `app.enableCors(corsConfig)`
  - [x] ThrottlerGuard applied globally via module-level APP_GUARD (not in main.ts)
  - [x] Keep NestJS Logger usage (already present)

- [x] Task 13: Write unit tests (AC: #1-#10)
  - [x] `libs/api/core/src/lib/guards/jwt-auth.guard.spec.ts` — validates guard activation
  - [x] `libs/api/core/src/lib/guards/club.guard.spec.ts` — validates club membership check, rejection on non-member
  - [x] `libs/api/core/src/lib/guards/roles.guard.spec.ts` — validates role checking, permissive when no roles set
  - [x] `libs/api/core/src/lib/filters/all-exceptions.filter.spec.ts` — validates structured error output for HttpException and unknown errors
  - [x] `libs/api/core/src/lib/pipes/zod-validation.pipe.spec.ts` — validates success parsing and failure with field errors
  - [x] `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.spec.ts` — validates `{ data }` and `{ data, meta }` wrapping
  - [x] All tests use Vitest 4, co-located `*.spec.ts` pattern

## Dev Notes

### Architecture Guardrails

**Guard Chain Order (Sacred — Never Reorder):**
```
Request → JwtAuthGuard → ClubGuard → RolesGuard → Controller
```
- `JwtAuthGuard` authenticates the JWT → sets `request.user`
- `ClubGuard` validates club membership → sets `request.clubId` + `request.clubRole`
- `RolesGuard` checks role against `@Roles()` metadata

**Guard Ordering Enforcement:** Guards are applied per-controller/route via `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)`. NestJS executes guards in the order they are listed. Do NOT register auth guards globally via `APP_GUARD` — apply them explicitly on controllers so the order is visible and controllable. Exception: `ThrottlerGuard` IS registered as `APP_GUARD` since it applies to all routes.

**JWT Payload Structure:**
```typescript
{
  sub: string;          // userId (UUID)
  email: string;
  activeClubId: string; // Current tenant context (UUID)
  role: 'OWNER' | 'ADMIN' | 'MEMBER'; // Per-club role
}
```

**Error Response Format:**
```typescript
{
  statusCode: number;    // 400, 401, 403, 404, 500
  error: string;         // 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR'
  message: string;       // Human-readable (French "we" phrasing for frontend, English for API)
  details?: Array<{ field: string; message: string }>;  // Validation errors only
}
```

**Success Response Format:**
```typescript
// Single resource
{ data: T }

// Paginated list
{ data: T[], meta: { total: number; page: number; limit: number } }
```

**Logging Rule:** Always use `new Logger(ClassName.name)` — never `console.log`. Structured JSON in production.

### Dependencies to Install

These packages are NOT in `package.json` yet and must be added:

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/passport` | latest compatible with NestJS 11 | Auth framework |
| `passport` | ^0.7.x | Core passport (required by @nestjs/passport) |
| `passport-jwt` | ^4.x | JWT strategy |
| `@types/passport-jwt` | ^4.x | Type definitions |
| `@nestjs/jwt` | latest compatible with NestJS 11 | JWT token handling |
| `@nestjs/throttler` | latest compatible with NestJS 11 | Rate limiting |
| `helmet` | ^8.x | Security headers |
| `zod` | ^3.x | Schema validation |

### Previous Story Intelligence (Story 1.1)

Story 1.1 establishes the Prisma schema and database foundation. Key facts for this story:
- **PrismaService** currently lives at `libs/api/core/src/lib/prisma.service.ts` — if Story 1.1 has relocated it to `libs/shared/prisma-client`, update imports in ClubGuard accordingly
- **ClubMember model** from Story 1.1's schema is the join table used by ClubGuard to verify membership: `prisma.clubMember.findFirst({ where: { userId, clubId } })`
- **Role enum** (`OWNER`, `ADMIN`, `MEMBER`) is defined in the Prisma schema — reuse the Prisma-generated enum type, do NOT redefine it
- **UUID v4 IDs** — all entity IDs are UUIDs, JWT `sub` and `activeClubId` are UUID strings
- No previous story file exists yet (this is the first story to be implemented)

### Existing Code to Build On

- **PrismaService** already exists at `libs/api/core/src/lib/prisma.service.ts` — singleton, lifecycle hooks, global module
- **CoreModule** at `libs/api/core/src/lib/api-core.ts` — currently only provides PrismaService, needs expansion
- **AppModule** at `apps/api/src/app/app.module.ts` — imports CoreModule + FeaturesModule
- **main.ts** at `apps/api/src/main.ts` — minimal bootstrap, needs global filters/interceptors/middleware

### Anti-Patterns to Avoid

- **DO NOT** create a separate `__tests__/` directory — tests are co-located as `*.spec.ts`
- **DO NOT** use `class-validator` / `class-transformer` — this project uses Zod for validation
- **DO NOT** call Prisma directly from controllers — always go through services
- **DO NOT** use `console.log` anywhere — use NestJS `Logger`
- **DO NOT** register guards globally in `main.ts` with `useGlobalGuards()` for ThrottlerGuard — use `APP_GUARD` provider token in the module instead so DI works
- **DO NOT** hardcode JWT secrets — read from environment variables
- **DO NOT** skip ClubGuard on tenant-scoped routes — this causes data breaches
- **DO NOT** return raw Prisma entities — always go through ResponseWrapperInterceptor

### Project Structure Notes

**Target file tree after this story:**
```
libs/api/core/src/
├── index.ts                              ← barrel exports (update)
└── lib/
    ├── api-core.ts                       ← CoreModule (update: register JWT, Passport, Throttler)
    ├── prisma.service.ts                 ← existing, no changes
    ├── config/
    │   ├── jwt.config.ts                 ← NEW
    │   └── cors.config.ts                ← NEW
    ├── guards/
    │   ├── jwt-auth.guard.ts             ← NEW
    │   ├── club.guard.ts                 ← NEW
    │   ├── roles.guard.ts                ← NEW
    │   ├── index.ts                      ← NEW barrel
    │   ├── jwt-auth.guard.spec.ts        ← NEW test
    │   ├── club.guard.spec.ts            ← NEW test
    │   └── roles.guard.spec.ts           ← NEW test
    ├── strategies/
    │   └── jwt.strategy.ts               ← NEW
    ├── decorators/
    │   ├── current-user.decorator.ts     ← NEW
    │   ├── current-club.decorator.ts     ← NEW
    │   ├── roles.decorator.ts            ← NEW
    │   └── index.ts                      ← NEW barrel
    ├── pipes/
    │   ├── zod-validation.pipe.ts        ← NEW
    │   ├── zod-validation.pipe.spec.ts   ← NEW test
    │   └── index.ts                      ← NEW barrel
    ├── filters/
    │   ├── all-exceptions.filter.ts      ← NEW
    │   ├── all-exceptions.filter.spec.ts ← NEW test
    │   └── index.ts                      ← NEW barrel
    └── interceptors/
        ├── response-wrapper.interceptor.ts       ← NEW
        ├── response-wrapper.interceptor.spec.ts  ← NEW test
        └── index.ts                              ← NEW barrel
```

**Monorepo Import Pattern:**
- Nx uses tsconfig path aliases (configured in `tsconfig.base.json` by Nx generators) — check the exact alias before importing
- Workspace scope is `@org` (from root `package.json` name `@org/source`)
- Shared types will come from the shared/types lib (Story 1.3)

**Environment Variables Required:**
- `JWT_SECRET` — HMAC secret for access token signing
- `JWT_REFRESH_SECRET` — HMAC secret for refresh token signing
- `CORS_ORIGINS` — comma-separated allowed origins (e.g., `http://localhost:4200`)
- Add these to `.env.example` if it exists, or create one at the project root

### References

- [Source: _bmad-output/planning-artifacts/epics.md, lines 286-311 — Story 1.2 AC]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard chain, JWT config, error format, file structure]
- [Source: _bmad-output/planning-artifacts/architecture.md — Multi-tenant ClubGuard pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md — Testing: Vitest 4, co-located *.spec.ts]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Error UX: "we" language, always provide next step]
- [Source: libs/api/core/src/lib/prisma.service.ts — Existing PrismaService to reuse]
- [Source: libs/api/core/src/lib/api-core.ts — Existing CoreModule to extend]
- [Source: apps/api/src/main.ts — Bootstrap to update with global filters/interceptors/middleware]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Pre-existing PrismaClient typecheck issue with `nodenext` module resolution — resolved itself after `nx sync`
- Git stash/pop during investigation reverted main.ts, api-core.ts, and index.ts — all files re-applied successfully

### Completion Notes List

- All 8 npm packages installed: @nestjs/passport, passport, passport-jwt, @nestjs/jwt, @nestjs/throttler, helmet, zod, @types/passport-jwt
- JWT config with 15min access token and 7d refresh token (httpOnly cookie)
- CORS config reads CORS_ORIGINS from env var, enables credentials
- 3 decorators: @CurrentUser(), @CurrentClub(), @Roles()
- JwtAuthGuard extends AuthGuard('jwt'), JwtStrategy validates Bearer tokens
- ClubGuard verifies club membership via PrismaService.clubMember, injects clubId + clubRole
- RolesGuard checks @Roles() metadata, permissive when no roles specified
- AllExceptionsFilter returns structured { statusCode, error, message, details? } — maps HTTP status to error codes
- ZodValidationPipe validates against Zod schema, throws BadRequestException with field-level details
- ResponseWrapperInterceptor wraps in { data } or { data, meta } — detects paginated results, skips null/already-wrapped
- CoreModule registers PassportModule, JwtModule, ThrottlerModule with ThrottlerGuard as APP_GUARD
- main.ts updated with helmet, CORS, AllExceptionsFilter, ResponseWrapperInterceptor
- vitest.config.mts created for api-core lib to enable Nx test target inference
- 30 unit tests across 6 spec files — all passing
- Typecheck passes for api-core, api-features, and api app

### Change Log

- 2026-03-22: Story 1.2 implemented — all 15 ACs satisfied, 30 tests passing

### File List

- libs/api/core/src/lib/config/jwt.config.ts (NEW)
- libs/api/core/src/lib/config/cors.config.ts (NEW)
- libs/api/core/src/lib/decorators/current-user.decorator.ts (NEW)
- libs/api/core/src/lib/decorators/current-club.decorator.ts (NEW)
- libs/api/core/src/lib/decorators/roles.decorator.ts (NEW)
- libs/api/core/src/lib/decorators/index.ts (NEW)
- libs/api/core/src/lib/strategies/jwt.strategy.ts (NEW)
- libs/api/core/src/lib/guards/jwt-auth.guard.ts (NEW)
- libs/api/core/src/lib/guards/club.guard.ts (NEW)
- libs/api/core/src/lib/guards/roles.guard.ts (NEW)
- libs/api/core/src/lib/guards/index.ts (NEW)
- libs/api/core/src/lib/guards/jwt-auth.guard.spec.ts (NEW)
- libs/api/core/src/lib/guards/club.guard.spec.ts (NEW)
- libs/api/core/src/lib/guards/roles.guard.spec.ts (NEW)
- libs/api/core/src/lib/filters/all-exceptions.filter.ts (NEW)
- libs/api/core/src/lib/filters/all-exceptions.filter.spec.ts (NEW)
- libs/api/core/src/lib/filters/index.ts (NEW)
- libs/api/core/src/lib/pipes/zod-validation.pipe.ts (NEW)
- libs/api/core/src/lib/pipes/zod-validation.pipe.spec.ts (NEW)
- libs/api/core/src/lib/pipes/index.ts (NEW)
- libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts (NEW)
- libs/api/core/src/lib/interceptors/response-wrapper.interceptor.spec.ts (NEW)
- libs/api/core/src/lib/interceptors/index.ts (NEW)
- libs/api/core/src/lib/api-core.ts (MODIFIED)
- libs/api/core/src/index.ts (MODIFIED)
- libs/api/core/vitest.config.mts (NEW)
- apps/api/src/main.ts (MODIFIED)
- package.json (MODIFIED — dependencies added)
- package-lock.json (MODIFIED)
