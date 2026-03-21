---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-21'
inputDocuments:
  - prd.md
  - product-brief-CaniPotes42-2026-03-21.md
  - ux-design-specification.md
  - domain-canicross-ffslc-club-management-research-2026-03-21.md
  - technical-canipotes42-platform-research-2026-03-21.md
workflowType: 'architecture'
project_name: 'CaniFed'
user_name: 'Leader'
date: '2026-03-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (49 FRs across 8 domains):**

| Domain | FRs | Architectural Impact |
|---|---|---|
| Club Management | FR1-FR5 | Multi-tenant CRUD, club lifecycle, club switcher API |
| Auth & Access Control | FR6-FR12 | JWT with clubId claim, email invite flow, per-club RBAC (Owner/Admin/Member), ClubGuard middleware |
| Member Management | FR13-FR15 | Tenant-scoped queries, search/filter, profile management |
| Dog Profiles & Health | FR16-FR21 | Nested entity (Dog → Member → Club), vaccine expiry calculation, admin dashboard aggregation |
| Document Management | FR22-FR26 | Cloudflare R2 integration, signed URLs, expiry tracking, tenant-scoped file access |
| Event Management & Maps | FR27-FR35 | GPS storage (lat/lng), draft/published state machine, deep link generation (Waze/Google Maps), participation tracking |
| Real-Time Chat | FR36-FR40 | WebSocket gateway (Socket.IO), club-scoped channels, image attachment pipeline, message persistence + delivery |
| License Payments | FR41-FR45 | Stripe Checkout redirect, webhook handler (idempotent), per-club license configuration, season-based status tracking |
| Data Privacy | FR46-FR49 | RGPD consent recording, data export endpoint, account deletion cascade, retention policies |

**Non-Functional Requirements (26 NFRs):**

| Category | Key NFRs | Architectural Driver |
|---|---|---|
| Performance | FCP <1.5s, API <200ms, chat <500ms, uploads <2s | Efficient queries, connection pooling, CDN for static assets, optimistic UI |
| Security | HTTPS, signed URLs, JWT validation, bcrypt/argon2, PCI delegation, RGPD minimization | Security middleware stack, no raw file access, Stripe handles card data |
| Scalability | 2 clubs / 200 users at pilot, horizontal to 50+ clubs | Shared DB with clubId isolation (no schema changes to scale), stateless API |
| Accessibility | WCAG 2.1 AA, keyboard nav, 44px touch targets, screen reader support | Radix UI primitives, semantic HTML, ARIA labels, axe-core testing |
| Reliability | No data loss on restart, guaranteed chat delivery, idempotent webhooks | PostgreSQL persistence, reconnect + fetch-missed for WebSocket, webhook deduplication |

**Scale & Complexity:**

- Primary domain: Full-stack web (PWA)
- Complexity level: Medium-High
- Estimated architectural components: ~8 NestJS modules, ~4 shared Nx libraries, 1 React app, 10+ custom UI components
- Phased delivery: Phase A (core), Phase B (dogs/docs/chat), Phase C (payments/polish)

### Technical Constraints & Dependencies

| Constraint | Impact |
|---|---|
| **Free-tier hosting** | Render (cold starts <30s), Neon (connection pooling required), Vercel/Netlify (static), R2 (10GB) — architecture must be efficient |
| **Solo developer + AI agents** | Architecture must be modular enough for parallel agent implementation across NestJS modules |
| **Nx monorepo** | Shared libraries for types (Prisma), validation (Zod), and UI components (shadcn/ui) — enforces type safety across stack |
| **PWA delivery** | No app store, browser-based push (post-MVP), service worker for installability |
| **Stripe Checkout redirect** | No custom payment form — redirect to Stripe-hosted page. PCI compliance by delegation. |
| **FFSLC API (post-MVP)** | Undocumented, could change. Must build abstraction layer. Read-only CRON sync with local PostgreSQL cache. |
| **French language UI** | All user-facing text in French. Date/time formatting (dd/MM/yyyy, 24h). French text ~15% longer than English — layout implications. |

### Cross-Cutting Concerns Identified

1. **Tenant Isolation** — Every database query, every API route, every file access, every WebSocket channel must be scoped to the active club. ClubGuard middleware extracts clubId from JWT and injects it into the request context. This is the single most critical architectural concern — a failure here is a data breach.

2. **Authentication & Authorization** — JWT-based auth with clubId claim. User can belong to multiple clubs (ClubMember join table). Active club stored client-side, switchable. RBAC checks are always (userId + clubId + role) — never just role alone.

3. **File Storage Pipeline** — Documents (vaccine certificates, registration forms, health records), dog photos, chat images all flow through the same upload → validate → store (R2) → signed URL pipeline. Tenant-scoped. Upload validation for type and size (NFR13).

4. **RGPD Compliance** — Consent tracking on signup, data export API, account deletion cascade (user → club memberships → dogs → documents → chat messages), retention policies for health-adjacent data. Medical certificates for competition are Code du Sport obligations (not consent-based).

5. **Shared Type Safety** — Prisma generates TypeScript types from schema. Zod schemas shared between React Hook Form validation and NestJS DTO validation via Nx shared library. Single source of truth for data shapes.

6. **Error Handling** — UX principle: "never blame the user." API must return structured, user-friendly error responses. Frontend maps API errors to French-language, "we" phrasing messages. No technical jargon in user-facing errors.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web (PWA) — React frontend + NestJS REST API backend in an Nx monorepo, based on project requirements analysis.

### Starter Options Considered

No external starter template needed — the project was scaffolded directly using Nx generators (`@nx/react:application`, `@nx/nest:application`, `@nx/js:library`) with manual additions for Prisma, Tailwind, and shadcn/ui.

### Selected Starter: Existing Nx 22.6 Monorepo Scaffold

**Rationale for Selection:**
The monorepo is already initialized and structurally sound. The Nx generator approach provides maximum control over project structure while leveraging Nx's task orchestration, caching, and project graph. This is the correct approach for a multi-app monorepo with shared libraries — better than opinionated full-stack starters (T3, RedwoodJS) which assume different architectural patterns.

**Initialization Command (already executed):**

```bash
npx create-nx-workspace@22.6.0 CaniPotes42 --preset=apps
nx g @nx/react:application apps/frontend --bundler=vite --style=css
nx g @nx/nest:application apps/api
nx g @nx/js:library libs/shared/prisma-client
nx g @nx/js:library libs/shared/types
nx g @nx/js:library libs/shared/utils
nx g @nx/js:library libs/api/core
nx g @nx/js:library libs/api/features
nx g @nx/react:library libs/frontend/ui
nx g @nx/react:library libs/frontend/features
nx g @nx/react:library libs/frontend/data-access
```

**Architectural Decisions Provided by Scaffold:**

**Language & Runtime:**
TypeScript 5.9 with strict mode, ES2022 target, `nodenext` module resolution. Shared `tsconfig.base.json` with composite projects.

**Styling Solution:**
Tailwind CSS 4 with `@tailwindcss/vite` plugin. shadcn/ui ecosystem (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).

**Build Tooling:**
Vite 7 for React frontend (HMR, fast builds). Webpack for NestJS API (required by `@nx/nest`). Nx task orchestration with caching.

**Testing Framework:**
Vitest 4 with jsdom environment (configured, no tests written yet). `@vitest/ui` available for interactive test runner.

**Code Organization:**

```
apps/
  api/           → NestJS application (entry point, AppModule)
  frontend/      → React application (entry point, routing)
libs/
  api/
    core/        → NestJS core services (PrismaService, guards, middleware)
    features/    → NestJS feature modules (one per domain: club, auth, event, etc.)
  frontend/
    ui/          → shadcn/ui components, design tokens, layout components
    features/    → React feature modules (pages, domain-specific components)
    data-access/ → React hooks, API client, TanStack Query wrappers
  shared/
    prisma-client/ → Prisma schema, client singleton, generated types
    types/         → Shared TypeScript interfaces/types
    utils/         → Shared utilities (date formatting, validation helpers)
```

**Development Experience:**
Vite HMR for frontend. Webpack watch for API. Nx project graph for dependency visualization. Docker Compose for local PostgreSQL.

**Key Technical Detail — Prisma Driver Adapter:**
The scaffold uses `@prisma/adapter-pg` with raw `pg` driver instead of Prisma's default connection. This is the recommended pattern for Neon serverless PostgreSQL — it supports connection pooling and serverless-friendly connection management out of the box.

**Gaps to Address in Architecture (subsequent steps):**
- ESLint / code quality tooling
- Auth module (JWT, Passport, guards)
- ClubGuard tenant isolation middleware
- WebSocket gateway (Socket.IO)
- File upload pipeline (Cloudflare R2)
- Stripe integration module
- Prisma schema (currently placeholder)
- CI/CD pipeline
- Environment configuration strategy
- Error handling / response formatting

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Multi-tenant data isolation via ClubGuard middleware + clubId in JWT
2. Prisma 7.5 schema with clubId FK on all tenant-scoped entities
3. JWT auth via Passport + bcrypt password hashing
4. Shared Zod validation schemas (frontend + backend)

**Important Decisions (Shape Architecture):**
5. TanStack Query for server state + React Context for client state
6. Cloudflare R2 file pipeline with signed URLs
7. Socket.IO WebSocket gateway for real-time chat
8. Stripe Checkout redirect flow
9. GitHub Actions CI/CD with `nx affected`
10. Swagger/OpenAPI documentation

**Deferred Decisions (Post-MVP):**
- i18n framework (French-only hardcoded for MVP)
- External monitoring (Sentry or similar)
- Redis caching layer
- OAuth/social login providers
- PWA service worker / offline support

### Data Architecture

| Decision | Choice | Version | Rationale |
|---|---|---|---|
| **Database** | PostgreSQL (Neon serverless) | Latest via Neon | Free tier, serverless scaling, Prisma adapter support |
| **ORM** | Prisma | 7.5 | Type-safe queries, migration system, shared types via Nx library |
| **DB Driver** | `pg` + `@prisma/adapter-pg` | pg 8.20 | Neon-compatible driver adapter pattern, connection pooling |
| **Validation** | Zod | Latest | Shared schemas in `libs/shared/types` — single source of truth for frontend (React Hook Form) and backend (NestJS DTOs) |
| **Migrations** | Prisma Migrate | Built-in | `prisma migrate deploy` on Render startup. Schema-first approach. |
| **Caching** | TanStack Query (client) | Latest | Client-side cache with `staleTime` + background refetch. No server-side cache at pilot scale. |

**Multi-Tenant Data Model:**
- Shared database, shared schema, `clubId` FK isolation
- Every tenant-scoped table has `clubId` column with FK to `Club`
- ClubGuard middleware extracts `clubId` from JWT, injects into request context
- All Prisma queries scoped by `clubId` — enforced at service layer
- `ClubMember` join table: `userId + clubId + role` — enables multi-club membership
- Automated tenant isolation tests in CI

### Authentication & Security

| Decision | Choice | Rationale |
|---|---|---|
| **Auth framework** | `@nestjs/passport` + `@nestjs/jwt` + `passport-jwt` | Standard NestJS approach. Extensible for future OAuth/social login. |
| **Token strategy** | Access token (JWT, 15min) + refresh token (7d, httpOnly cookie) | Short-lived access for security, refresh for UX. HttpOnly cookie prevents XSS token theft. |
| **JWT payload** | `{ sub: userId, email, activeClubId, role }` | ClubGuard reads `activeClubId` from token. Role is per-club. |
| **Club switching** | Client calls `/auth/switch-club` → new JWT issued with updated `activeClubId` + `role` | Instant context switch, new token reflects new club's role. |
| **Password hashing** | bcrypt | Industry standard, simple, well-supported. OWASP-compliant. |
| **Guards** | `JwtAuthGuard` (authentication) → `ClubGuard` (tenant extraction) → `RolesGuard` (authorization) | Layered: authenticate → identify tenant → check permission. Order matters. |
| **API security** | HTTPS only, CORS whitelist, Helmet headers, `@nestjs/throttler` rate limiting | Defense in depth. Rate limiting protects login and public endpoints. |
| **File access** | Signed URLs (Cloudflare R2) — time-limited, tenant-scoped | No public bucket. Files accessible only via signed URL generated by API after auth + tenant check. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|---|---|---|
| **API style** | REST (NestJS controllers) | Simple, well-understood, sufficient for CRUD + real-time via WebSocket |
| **Documentation** | `@nestjs/swagger` (OpenAPI) | Auto-generated from decorators. Useful for debugging and future consumers. |
| **Error format** | Structured JSON: `{ statusCode, error, message, details? }` | NestJS global exception filter. Frontend maps `error` codes to French user-friendly messages. |
| **Rate limiting** | `@nestjs/throttler` | Per-IP rate limiting on login and public endpoints. No external dependency. |
| **Real-time** | Socket.IO via `@nestjs/websockets` gateway | Club-scoped rooms. JWT auth on connection. Message persistence in PostgreSQL + real-time delivery via WebSocket. Reconnect → fetch missed messages. |
| **File upload** | Multipart upload → NestJS → validate (type, size) → Cloudflare R2 | Upload pipeline: validate MIME type + file size (NFR13) → generate tenant-scoped key → upload to R2 → return signed URL |

**Error Handling Pipeline:**
```
NestJS Exception → Global ExceptionFilter → Structured JSON Response
Frontend: API error → error code lookup → French "we" phrasing message → Toast/inline display
```

### Frontend Architecture

| Decision | Choice | Rationale |
|---|---|---|
| **Server state** | TanStack Query (React Query) | Cache, background refetch, optimistic updates. Perfect for REST API consumption. |
| **Client state** | React Context | Auth state (user, active club, token), UI preferences. Lightweight, no Redux overhead. |
| **Forms** | React Hook Form + Zod | Shared Zod schemas for validation. Performant, minimal re-renders. |
| **Routing** | React Router 6 | Already in scaffold. Protected routes via auth context wrapper. |
| **i18n** | Hardcoded French (MVP) | No i18n library. French strings in components. Structure allows future extraction. |
| **Icons** | Lucide React | Already in scaffold (shadcn/ui ecosystem). Consistent icon set. |
| **HTTP client** | `fetch` wrapper or lightweight client | Centralized in `libs/frontend/data-access`. Handles auth headers, error formatting, base URL. |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|---|---|---|
| **Frontend hosting** | Vercel or Netlify | Free tier, CDN, automatic HTTPS. Vite build output. |
| **Backend hosting** | Render | Free tier, Docker support, automatic deploys from Git. Cold starts <30s acceptable at pilot. |
| **Database** | Neon (serverless PostgreSQL) | Free tier (0.5 GB), connection pooling built-in, Prisma adapter support. |
| **File storage** | Cloudflare R2 | S3-compatible, 10 GB free, no egress fees. Signed URLs for access control. |
| **CI/CD** | GitHub Actions | `nx affected` for targeted builds/tests. Run on PR + merge to main. |
| **Env config** | `.env` local + platform env vars | Zod schema validates env vars at startup — fail fast if misconfigured. |
| **Monitoring** | NestJS logger + Render logs (MVP) | Structured JSON logging in production. Add Sentry post-MVP if needed. |
| **Local dev** | Docker Compose (PostgreSQL) + Nx serve | `docker compose up` for DB, `nx serve api` + `nx serve frontend` for dev servers. |

### Decision Impact Analysis

**Implementation Sequence:**
1. Prisma schema + migrations (data model is the foundation)
2. Auth module (JWT + Passport + bcrypt + guards)
3. ClubGuard middleware (tenant isolation — must exist before any feature module)
4. Club management module (CRUD, registration, settings)
5. Member management module (invite flow, directory, roles)
6. Event management module (CRUD, GPS, draft/publish, RSVP)
7. Dog profiles + vaccine tracking module
8. Document management module (R2 upload pipeline)
9. Chat module (WebSocket gateway, channels, image sharing)
10. Payment module (Stripe Checkout, webhooks)

**Cross-Component Dependencies:**
- Auth → ClubGuard → All feature modules (auth is prerequisite for everything)
- Prisma schema → All modules (data model shapes everything)
- File upload pipeline → Document module + Chat module + Dog profiles (shared infrastructure)
- Zod schemas → Frontend forms + Backend DTOs (shared validation)
- Error handling → All controllers (global exception filter)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 7 categories where AI agents could make incompatible choices — naming, structure, API formats, communication, process, validation, and guard ordering.

### Naming Patterns

**Database Naming (Prisma schema):**

| Element | Convention | Example |
|---|---|---|
| Tables/Models | PascalCase singular | `Club`, `User`, `ClubMember`, `VaccineRecord` |
| Columns | camelCase | `clubId`, `createdAt`, `expiryDate` |
| Foreign keys | `{entity}Id` | `clubId`, `userId`, `dogId` |
| Enums | PascalCase name, SCREAMING_SNAKE values | `enum Role { OWNER ADMIN MEMBER }` |
| IDs | UUID v4 via `@default(uuid())` | Never numeric IDs |

**API Naming Conventions:**

| Element | Convention | Example |
|---|---|---|
| Endpoints | Plural nouns, kebab-case | `/clubs`, `/events`, `/vaccine-records` |
| Route params | `:paramName` | `/clubs/:clubId/events/:eventId` |
| Query params | camelCase | `?status=DRAFT&pageSize=20` |
| HTTP verbs | Standard REST | GET (list/detail), POST (create), PATCH (update), DELETE |

**Code Naming Conventions:**

| Element | Convention | Example |
|---|---|---|
| NestJS files | kebab-case | `club.service.ts`, `create-club.dto.ts` |
| NestJS classes | PascalCase | `ClubService`, `CreateClubDto` |
| React component files | PascalCase | `EventCard.tsx`, `MapWidget.tsx` |
| React hook files | camelCase with `use` prefix | `useEvents.ts`, `useActiveClub.ts` |
| Variables/functions | camelCase | `getClubMembers`, `isAdmin`, `activeClubId` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE`, `JWT_EXPIRY` |
| Zod schemas | camelCase + `Schema` suffix | `createClubSchema`, `updateEventSchema` |
| TypeScript types (inferred from Zod) | PascalCase | `CreateClub`, `UpdateEvent` |

### Structure Patterns

**NestJS Module Pattern (every feature follows this):**

```
libs/api/features/src/lib/
  club/
    club.module.ts          ← NestJS module declaration
    club.controller.ts      ← REST endpoints
    club.service.ts         ← Business logic + Prisma queries
    dto/
      create-club.dto.ts    ← imports Zod schema from shared/types
      update-club.dto.ts
    club.controller.spec.ts ← co-located test
    club.service.spec.ts    ← co-located test
```

**React Feature Pattern:**

```
libs/frontend/features/src/lib/
  events/
    EventFeed.tsx           ← page-level component
    EventDetail.tsx
    EventForm.tsx
    components/             ← feature-specific sub-components
      EventCard.tsx
      RSVPButton.tsx
    hooks/
      useEvents.ts          ← TanStack Query hooks
      useEventDetail.ts
```

**Shared Zod Schemas:**

```
libs/shared/types/src/lib/
  schemas/
    club.schema.ts          ← Zod schemas + inferred TS types for Club
    event.schema.ts
    user.schema.ts
    dog.schema.ts
    document.schema.ts
    payment.schema.ts
  index.ts                  ← re-exports all schemas and types
```

**Tests:** Always co-located with source — `*.spec.ts` for NestJS, `*.test.tsx` for React. No separate `__tests__` directories.

**Frontend Bundle Strategy:**
- Non-buildable Nx libs (path aliases, no build artifacts) — Vite resolves imports directly
- Code splitting via `React.lazy()` + `Suspense` on route boundaries — each route loads its own chunk
- No publishable/buildable libs needed — Vite's ESM dev server and Rollup production builds handle scaling efficiently
- At scale: Nx `@nx/enforce-module-boundaries` prevents cross-feature imports

### Format Patterns

**API Response Formats:**

```typescript
// Success — single item
{ "data": { "id": "uuid", "name": "cani'potes 42", ... } }

// Success — list with pagination
{ "data": [...], "meta": { "total": 42, "page": 1, "pageSize": 20 } }

// Error — structured
{
  "statusCode": 400,
  "error": "VALIDATION_ERROR",
  "message": "Nous n'avons pas pu traiter votre demande.",
  "details": [{ "field": "email", "message": "Format d'email invalide" }]
}
```

**Data Exchange Rules:**

| Rule | Convention |
|---|---|
| JSON field casing | camelCase (Prisma default, JS convention) |
| Dates in JSON | ISO 8601 strings — `"2026-03-21T14:30:00.000Z"` |
| Date display | `Intl.DateTimeFormat` with `fr-FR` locale |
| Null handling | `null` for absent optional values. Never `undefined` in API responses. |
| Boolean | `true`/`false` (never 1/0) |
| IDs | UUID string (never numeric) |

### Communication Patterns

**WebSocket Events:**

| Direction | Convention | Example |
|---|---|---|
| Server → Client | `kebab-case` with namespace | `chat:message`, `chat:typing`, `event:updated` |
| Client → Server | `kebab-case` with namespace | `chat:send`, `chat:join-channel` |
| Payload | Always includes `clubId` for validation | `{ clubId, channelId, content, ... }` |

**TanStack Query Keys:**

```typescript
// Convention: [entity, clubId, ...params]
['events', clubId]                          // list all events
['events', clubId, eventId]                 // single event detail
['events', clubId, { status: 'DRAFT' }]    // filtered list
['club-members', clubId]                    // member directory
['dogs', clubId]                            // all dogs (admin)
['dogs', clubId, dogId]                     // single dog
```

**React Context (client state only):**

```typescript
// AuthContext provides: { user, accessToken, activeClub, role, switchClub(), logout() }
// No other global contexts at MVP — all server state via TanStack Query
```

### Process Patterns

**Error Handling Pipeline:**

```
Backend:  Throw HttpException subclass → Global AllExceptionsFilter → Structured JSON
Frontend: TanStack Query onError → Error code lookup → French "we" message → Toast/inline
Crashes:  React Error Boundary catches unexpected errors → generic fallback UI
Logging:  NestJS Logger with context (never console.log). JSON in production. Never log passwords/tokens/PII.
```

**Loading State Pattern:**
- Use TanStack Query's `isLoading`, `isFetching`, `isError` directly
- Skeleton placeholders for page loads (not spinners) — per UX spec
- Optimistic updates for RSVP and chat messages — revert on error
- File upload: progress indicator (the one exception where a spinner/progress bar is used)

**Validation Flow (defense in depth):**

```
1. Frontend: Zod schema validates on blur (React Hook Form mode: "onBlur")
2. Backend:  Same Zod schema validates via ZodValidationPipe in NestJS
3. Database: Prisma constraints (unique, FK, not null) as last defense
Rule: NEVER trust frontend validation alone — always validate server-side
```

**Guard Execution Order (every authenticated request):**

```
Request → JwtAuthGuard → ClubGuard → RolesGuard → Controller
```

- Every feature controller: `@UseGuards(JwtAuthGuard, ClubGuard)` minimum
- Admin endpoints add: `@Roles('ADMIN', 'OWNER')` + `RolesGuard`
- Public endpoints (club registration, login): no guards

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly — no exceptions, no "creative" alternatives
2. Use the NestJS module pattern (controller → service → Prisma) — no direct Prisma calls from controllers
3. Always scope queries by `clubId` from request context — never query tenant data without tenant filter
4. Use shared Zod schemas from `libs/shared/types` — never define validation schemas inline
5. Wrap API responses in `{ data }` or `{ data, meta }` envelope — never return raw Prisma entities
6. Co-locate tests with source files — never create separate test directories
7. Use the guard chain (JwtAuthGuard → ClubGuard → RolesGuard) — never skip ClubGuard on tenant-scoped routes
8. Use NestJS `Logger` with class context — never `console.log`
9. Return structured error responses via exception classes — never manual `res.status().json()`
10. Use `React.lazy()` for route-level code splitting — never import pages synchronously

**Anti-Patterns (NEVER do these):**

| Anti-Pattern | Why It's Wrong | Correct Approach |
|---|---|---|
| Direct Prisma in controllers | Bypasses business logic layer | Always go through service |
| Query without `clubId` WHERE | Tenant data leakage | ClubGuard injects clubId, service uses it |
| Inline Zod schema in a DTO | Duplicates shared schema, drifts | Import from `libs/shared/types` |
| `snake_case` in API payloads | Inconsistent with JS/TS ecosystem | camelCase everywhere |
| Numeric IDs | Not compatible with UUID strategy | Always UUID v4 string |
| `__tests__/` directory | Separates tests from code | Co-locate `*.spec.ts` / `*.test.tsx` |
| `console.log` | No context, no levels, no structure | NestJS `Logger` with class name |
| Raw entity in response | Exposes internal schema, no envelope | `{ data: mappedDto }` |
| Buildable/publishable React libs | Unnecessary overhead with Vite | Non-buildable libs with tsconfig paths |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
CaniPotes42/                              ← Nx workspace root
├── .github/
│   └── workflows/
│       ├── ci.yml                        ← PR: lint + typecheck + test (nx affected)
│       └── deploy.yml                    ← merge to main: build + deploy
├── .claude/
│   └── skills/                           ← BMAD agent skills
├── _bmad/                                ← BMAD config
├── _bmad-output/                         ← Planning artifacts (PRD, architecture, etc.)
│
├── apps/
│   ├── api/                              ← NestJS application
│   │   ├── src/
│   │   │   ├── main.ts                   ← Bootstrap, global pipes/filters/middleware
│   │   │   └── app/
│   │   │       └── app.module.ts         ← Root module, imports all feature modules
│   │   ├── webpack.config.js
│   │   ├── tsconfig.app.json
│   │   └── package.json
│   │
│   └── frontend/                         ← React PWA
│       ├── src/
│       │   ├── main.tsx                  ← React root, providers (QueryClient, AuthContext, Router)
│       │   ├── styles.css                ← Tailwind directives + CSS variables (design tokens)
│       │   └── app/
│       │       ├── app.tsx               ← Root component, route definitions
│       │       ├── routes/               ← Route-level components (lazy-loaded)
│       │       │   ├── login.tsx
│       │       │   ├── register.tsx
│       │       │   ├── club-setup.tsx
│       │       │   ├── events.tsx
│       │       │   ├── event-detail.tsx
│       │       │   ├── event-form.tsx
│       │       │   ├── chat.tsx
│       │       │   ├── dogs.tsx
│       │       │   ├── dog-detail.tsx
│       │       │   ├── dog-form.tsx
│       │       │   ├── members.tsx
│       │       │   ├── profile.tsx
│       │       │   ├── documents.tsx
│       │       │   ├── payments.tsx
│       │       │   └── admin/
│       │       │       ├── vaccine-dashboard.tsx
│       │       │       ├── member-management.tsx
│       │       │       ├── license-config.tsx
│       │       │       └── payment-history.tsx
│       │       └── providers/
│       │           └── auth-provider.tsx  ← AuthContext provider
│       ├── public/
│       │   ├── favicon.ico
│       │   └── manifest.json             ← PWA manifest
│       ├── index.html
│       ├── vite.config.mts
│       └── tsconfig.app.json
│
├── libs/
│   ├── shared/                           ← Stack-agnostic shared code
│   │   ├── prisma-client/
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma         ← THE data model (single source of truth)
│   │   │   │   └── migrations/           ← Prisma Migrate history
│   │   │   └── src/lib/
│   │   │       └── prisma-client.ts      ← Singleton client with pg adapter
│   │   │
│   │   ├── types/
│   │   │   └── src/lib/
│   │   │       ├── schemas/
│   │   │       │   ├── auth.schema.ts
│   │   │       │   ├── club.schema.ts
│   │   │       │   ├── member.schema.ts
│   │   │       │   ├── event.schema.ts
│   │   │       │   ├── dog.schema.ts
│   │   │       │   ├── vaccine.schema.ts
│   │   │       │   ├── document.schema.ts
│   │   │       │   ├── chat.schema.ts
│   │   │       │   └── payment.schema.ts
│   │   │       ├── enums.ts
│   │   │       └── types.ts
│   │   │
│   │   └── utils/
│   │       └── src/lib/
│   │           ├── date.utils.ts
│   │           ├── validation.utils.ts
│   │           └── env.schema.ts
│   │
│   ├── api/                              ← NestJS-specific libs
│   │   ├── core/
│   │   │   └── src/lib/
│   │   │       ├── core.module.ts
│   │   │       ├── prisma.service.ts
│   │   │       ├── guards/
│   │   │       │   ├── jwt-auth.guard.ts
│   │   │       │   ├── club.guard.ts
│   │   │       │   └── roles.guard.ts
│   │   │       ├── decorators/
│   │   │       │   ├── roles.decorator.ts
│   │   │       │   ├── current-user.decorator.ts
│   │   │       │   └── current-club.decorator.ts
│   │   │       ├── pipes/
│   │   │       │   └── zod-validation.pipe.ts
│   │   │       ├── filters/
│   │   │       │   └── all-exceptions.filter.ts
│   │   │       ├── interceptors/
│   │   │       │   └── response-wrapper.interceptor.ts
│   │   │       └── config/
│   │   │           ├── jwt.config.ts
│   │   │           └── cors.config.ts
│   │   │
│   │   └── features/
│   │       └── src/lib/
│   │           ├── features.module.ts
│   │           ├── auth/                 ← FR6-FR12
│   │           │   ├── auth.module.ts
│   │           │   ├── auth.controller.ts
│   │           │   ├── auth.service.ts
│   │           │   ├── strategies/jwt.strategy.ts
│   │           │   ├── dto/
│   │           │   ├── auth.controller.spec.ts
│   │           │   └── auth.service.spec.ts
│   │           ├── club/                 ← FR1-FR5
│   │           │   ├── club.module.ts
│   │           │   ├── club.controller.ts
│   │           │   ├── club.service.ts
│   │           │   ├── dto/
│   │           │   ├── club.controller.spec.ts
│   │           │   └── club.service.spec.ts
│   │           ├── member/               ← FR13-FR15, FR8-FR11
│   │           │   ├── member.module.ts
│   │           │   ├── member.controller.ts
│   │           │   ├── member.service.ts
│   │           │   ├── invite.service.ts
│   │           │   ├── dto/
│   │           │   └── member.service.spec.ts
│   │           ├── event/                ← FR27-FR35
│   │           │   ├── event.module.ts
│   │           │   ├── event.controller.ts
│   │           │   ├── event.service.ts
│   │           │   ├── dto/
│   │           │   └── event.service.spec.ts
│   │           ├── dog/                  ← FR16-FR21
│   │           │   ├── dog.module.ts
│   │           │   ├── dog.controller.ts
│   │           │   ├── dog.service.ts
│   │           │   ├── vaccine.controller.ts
│   │           │   ├── vaccine.service.ts
│   │           │   ├── dto/
│   │           │   └── vaccine.service.spec.ts
│   │           ├── document/             ← FR22-FR26
│   │           │   ├── document.module.ts
│   │           │   ├── document.controller.ts
│   │           │   ├── document.service.ts
│   │           │   ├── r2.service.ts
│   │           │   ├── dto/
│   │           │   └── r2.service.spec.ts
│   │           ├── chat/                 ← FR36-FR40
│   │           │   ├── chat.module.ts
│   │           │   ├── chat.gateway.ts
│   │           │   ├── chat.service.ts
│   │           │   ├── dto/
│   │           │   └── chat.service.spec.ts
│   │           └── payment/              ← FR41-FR45
│   │               ├── payment.module.ts
│   │               ├── payment.controller.ts
│   │               ├── payment.service.ts
│   │               ├── stripe-webhook.controller.ts
│   │               ├── dto/
│   │               └── payment.service.spec.ts
│   │
│   └── frontend/                         ← React-specific libs
│       ├── ui/
│       │   └── src/lib/
│       │       ├── cn.ts
│       │       ├── ui.tsx
│       │       ├── components/           ← shadcn/ui base (Button, Card, Dialog, etc.)
│       │       └── domain/              ← Custom domain components
│       │           ├── EventCard.tsx
│       │           ├── MapWidget.tsx
│       │           ├── NavigateButton.tsx
│       │           ├── RSVPButton.tsx
│       │           ├── VaccineStatusBadge.tsx
│       │           ├── VaccineSummaryCards.tsx
│       │           ├── ClubSwitcher.tsx
│       │           ├── BottomTabBar.tsx
│       │           ├── OnboardingStep.tsx
│       │           └── DateGroupHeader.tsx
│       │
│       ├── features/
│       │   └── src/lib/
│       │       ├── auth/
│       │       │   ├── LoginForm.tsx
│       │       │   ├── RegisterForm.tsx
│       │       │   └── hooks/useAuth.ts
│       │       ├── events/
│       │       │   ├── EventFeed.tsx
│       │       │   ├── EventDetail.tsx
│       │       │   ├── EventForm.tsx
│       │       │   └── hooks/useEvents.ts
│       │       ├── dogs/
│       │       │   ├── DogList.tsx
│       │       │   ├── DogDetail.tsx
│       │       │   ├── DogForm.tsx
│       │       │   ├── VaccineDashboard.tsx
│       │       │   └── hooks/useDogs.ts
│       │       ├── chat/
│       │       │   ├── ChatChannel.tsx
│       │       │   ├── ChatBubble.tsx
│       │       │   └── hooks/useChat.ts
│       │       ├── members/
│       │       │   ├── MemberDirectory.tsx
│       │       │   ├── InviteForm.tsx
│       │       │   └── hooks/useMembers.ts
│       │       ├── documents/
│       │       │   ├── DocumentList.tsx
│       │       │   ├── UploadForm.tsx
│       │       │   └── hooks/useDocuments.ts
│       │       ├── payments/
│       │       │   ├── LicenseList.tsx
│       │       │   ├── PaymentHistory.tsx
│       │       │   └── hooks/usePayments.ts
│       │       └── onboarding/
│       │           ├── ClubSetupWizard.tsx
│       │           └── OnboardingChecklist.tsx
│       │
│       └── data-access/
│           └── src/lib/
│               ├── api-client.ts
│               ├── query-client.ts
│               └── hooks/useApiMutation.ts
│
├── docker-compose.yml
├── .env
├── .env.example
├── nx.json
├── package.json
├── tsconfig.base.json
├── tsconfig.json
└── .prettierrc
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Rule |
|---|---|
| Controller → Service | Controllers delegate to services. Never call Prisma directly. |
| Service → Prisma | Services are the only layer that calls Prisma. All queries include `clubId`. |
| Guard chain | Every authenticated route: `JwtAuthGuard → ClubGuard → [RolesGuard]` |
| WebSocket | `ChatGateway` authenticates via JWT on connection. Joins club-scoped rooms only. |
| Stripe webhook | Separate controller, no auth guard (Stripe signature verification instead). |
| R2 service | Only `DocumentService` and `ChatService` call `R2Service`. Never from controllers. |

**Frontend Boundaries:**

| Boundary | Rule |
|---|---|
| Routes → Features | Route files are thin — import and render feature components from `libs/frontend/features` |
| Features → UI | Feature components compose domain components from `libs/frontend/ui` |
| Features → Data Access | All API calls through hooks in `libs/frontend/data-access` or feature-local hooks |
| No cross-feature imports | `events/` never imports from `dogs/`. Shared needs go to `libs/frontend/ui` or `libs/shared` |

**Data Boundaries:**

| Boundary | Rule |
|---|---|
| Tenant isolation | All tenant-scoped queries include `WHERE clubId = ?`. Enforced by service convention + CI tests. |
| Prisma schema | Single schema in `libs/shared/prisma-client/prisma/schema.prisma`. Never multiple schemas. |
| Zod schemas | Single source of truth in `libs/shared/types`. DTOs import from here. |

### FR-to-Structure Mapping

| FR Domain | Backend Module | Frontend Feature | Shared Schema |
|---|---|---|---|
| **Club (FR1-FR5)** | `libs/api/features/club/` | `libs/frontend/features/onboarding/` | `club.schema.ts` |
| **Auth (FR6-FR12)** | `libs/api/features/auth/` + `libs/api/core/guards/` | `libs/frontend/features/auth/` | `auth.schema.ts` |
| **Members (FR13-FR15)** | `libs/api/features/member/` | `libs/frontend/features/members/` | `member.schema.ts` |
| **Dogs (FR16-FR21)** | `libs/api/features/dog/` | `libs/frontend/features/dogs/` | `dog.schema.ts`, `vaccine.schema.ts` |
| **Documents (FR22-FR26)** | `libs/api/features/document/` | `libs/frontend/features/documents/` | `document.schema.ts` |
| **Events (FR27-FR35)** | `libs/api/features/event/` | `libs/frontend/features/events/` | `event.schema.ts` |
| **Chat (FR36-FR40)** | `libs/api/features/chat/` | `libs/frontend/features/chat/` | `chat.schema.ts` |
| **Payments (FR41-FR45)** | `libs/api/features/payment/` | `libs/frontend/features/payments/` | `payment.schema.ts` |

### External Integration Points

| Integration | Entry Point | Data Flow |
|---|---|---|
| **Stripe** | `payment.controller.ts` + `stripe-webhook.controller.ts` | Frontend → API → Stripe Checkout redirect → Webhook → API → DB |
| **Cloudflare R2** | `r2.service.ts` | Frontend upload → API validate → R2 PutObject → signed URL returned |
| **Waze/Google Maps** | Frontend deep link (no backend) | EventDetail → NavigateButton → deep link |
| **FFSLC API (post-MVP)** | Future `libs/api/features/ffslc-sync/` | CRON → API → FFSLC → local cache |
| **Socket.IO** | `chat.gateway.ts` | Frontend ↔ NestJS WebSocket gateway (club-scoped rooms) |

### DX-Optimized Development Workflow

**Local setup (first time):**
```bash
npm install
docker compose up -d
cp .env.example .env
npx prisma migrate dev
nx serve api
nx serve frontend
```

**Adding a new feature module:**
1. Create Zod schema in `libs/shared/types/src/lib/schemas/`
2. Add Prisma model → `npx prisma migrate dev`
3. Create NestJS module in `libs/api/features/src/lib/{feature}/`
4. Create React feature in `libs/frontend/features/src/lib/{feature}/`
5. Add route in `apps/frontend/src/app/routes/`
6. Register module in `features.module.ts`

**CI pipeline:**
```bash
nx affected -t lint typecheck test
nx affected -t build
```

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and proven together:
- Nx 22.6 + React 19 + Vite 7 — fully supported by `@nx/react`
- Nx 22.6 + NestJS 11 + Webpack — fully supported by `@nx/nest`
- Prisma 7.5 + `@prisma/adapter-pg` + pg 8.20 + Neon — documented pattern
- Socket.IO + NestJS `@nestjs/websockets` — native integration
- Passport + `@nestjs/jwt` + bcrypt — standard NestJS auth stack
- Zod + React Hook Form + NestJS pipes — proven cross-stack validation
- Tailwind 4 + shadcn/ui + Radix — default shadcn stack
- No version conflicts detected.

**Pattern Consistency:**
Naming (camelCase code/API + PascalCase models/components + kebab-case files/endpoints) is consistent with NestJS and React conventions. All patterns use the same guard chain order, response envelope, and Zod-first validation flow. No contradictions found.

**Structure Alignment:**
Every FR maps to exactly one backend module + one frontend feature + one shared schema. Boundaries are clear. Cross-cutting concerns live in `libs/api/core`.

### Requirements Coverage ✅

**Functional Requirements (FR1-FR49):** All covered.

| FR Range | Domain | Module | Status |
|---|---|---|---|
| FR1-FR5 | Club Management | `club/` | ✅ |
| FR6-FR12 | Auth & Access | `auth/` + `core/guards/` | ✅ |
| FR13-FR15 | Members | `member/` | ✅ |
| FR16-FR21 | Dogs & Health | `dog/` | ✅ |
| FR22-FR26 | Documents | `document/` + `r2.service` | ✅ |
| FR27-FR35 | Events & Maps | `event/` | ✅ |
| FR36-FR40 | Chat | `chat/` | ✅ |
| FR41-FR45 | Payments | `payment/` | ✅ |
| FR46-FR49 | RGPD | `auth/` + `member/` | ✅ |

**Non-Functional Requirements (NFR1-NFR26):** All covered.

| Category | NFRs | Architectural Support | Status |
|---|---|---|---|
| Performance | NFR1-6 | Vite build, Prisma queries, Socket.IO, R2 | ✅ |
| Security | NFR7-13 | HTTPS, signed URLs, JWT+ClubGuard, bcrypt, Stripe PCI, upload validation | ✅ |
| Scalability | NFR14-17 | Shared DB + clubId, stateless API, R2 scaling | ✅ |
| Accessibility | NFR18-22 | Radix primitives, semantic HTML, ARIA, 44px targets | ✅ |
| Reliability | NFR23-26 | PostgreSQL persistence, chat reconnect, idempotent webhooks | ✅ |

### Gap Analysis

| Gap | Priority | Resolution |
|---|---|---|
| RGPD endpoints not explicitly mapped | Important | `GET /members/me/export` in member module + `DELETE /auth/account` in auth module + consent flags on User model |
| Email sending service not specified | Important | Transactional email service (Resend or SendGrid free tier). Lives in `libs/api/core` as `MailService`. Consumed by `invite.service.ts`. |
| Prisma schema not yet designed | Expected | Placeholder — full data model is first implementation task |
| No E2E testing strategy | Nice-to-have | Defer to post-Phase A (Playwright or Cypress) |
| No PWA service worker | Nice-to-have | `manifest.json` in Phase A. Service worker deferred per PRD. |

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed (49 FRs, 26 NFRs, 6 user journeys)
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (free-tier hosting, solo dev + AI, Nx monorepo)
- [x] Cross-cutting concerns mapped (tenancy, auth, files, RGPD, types, errors)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (Stripe, R2, Socket.IO, FFSLC)
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (database, API, code)
- [x] Structure patterns defined (NestJS module, React feature, Zod schema)
- [x] Communication patterns specified (WebSocket, Query keys, Context)
- [x] Process patterns documented (errors, loading, validation, guards)

**✅ Project Structure**
- [x] Complete directory structure defined (file-level detail)
- [x] Component boundaries established
- [x] Integration points mapped (5 external integrations)
- [x] FR-to-structure mapping complete (8 domains)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
1. Multi-tenancy is architecturally first-class — ClubGuard + clubId on every entity
2. Full-stack type safety via shared Zod schemas + Prisma types
3. Clear DX workflow — `docker compose up` + `nx serve` and you're coding
4. Phased delivery aligns with implementation sequence
5. No over-engineering — right-sized for pilot scale with room to grow

**Areas for Future Enhancement (post-MVP):**
- i18n framework when expanding beyond French
- External monitoring (Sentry) when user base grows
- Redis caching when query load warrants it
- E2E testing framework when features stabilize
- Module Federation if frontend grows significantly

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt, check the anti-patterns list before making a choice

**First Implementation Priority:**
1. Design and implement the Prisma schema (all models, relationships, enums)
2. Set up `libs/api/core` (guards, filters, pipes, decorators, PrismaService)
3. Implement auth module (register, login, JWT, refresh, ClubGuard)
4. Club management module (CRUD, registration flow)
