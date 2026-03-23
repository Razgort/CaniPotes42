---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# CaniFed - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CaniFed, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Any user can register a new club by providing club name, federation affiliation (FFSLC/CNEAC/other/none), logo, contact email, and description
FR2: Club owner can update club settings (name, logo, federation, description, contact email)
FR3: Club owner can delete the club
FR4: Users can belong to multiple clubs simultaneously
FR5: Users can switch between their clubs via a club switcher
FR6: Users can sign up with email and password
FR7: Users can log in and receive a session scoped to their active club
FR8: Club owner/admin can invite new members by email
FR9: Invited users receive an email invitation and can join the club by creating an account or linking an existing one
FR10: Club owner can assign and change member roles (owner, admin, member)
FR11: Club owner/admin can suspend or remove members from the club
FR12: All data access is scoped to the active club — no cross-club data visibility
FR13: Admin can view the club member directory with profiles and roles
FR14: Members can view and edit their own profile within the club
FR15: Admin can search and filter the member directory
FR16: Members can add dogs to their profile (name, breed, birthdate, chip number, photo)
FR17: Members can edit and remove their own dogs
FR18: Members can add vaccine records to their dogs (vaccine name, date administered, expiry date)
FR19: Members can upload a vaccine certificate document linked to a vaccine record
FR20: Admin can view all dogs in the club with their vaccine status (up to date / expiring soon / expired)
FR21: Admin can filter dogs by vaccine status to identify dogs with expiring or expired vaccines
FR22: Members can upload documents (registration forms, vaccine certificates, health records, licenses) and associate them to themselves or their dogs
FR23: Admin can view and download all documents within the club
FR24: Members can view and download their own documents
FR25: Documents track expiry dates where applicable
FR26: Admin can see a dashboard of documents nearing or past expiry
FR27: Admin can create events with title, description, date/time, and GPS location (pin placement on map)
FR28: Admin can save events as draft (visible only to admins) or published (visible to all members)
FR29: Admin can edit and delete events
FR30: Admin can change event visibility from draft to published and back
FR31: Members can view published events in a chronological feed
FR32: Members can view event location on an embedded map
FR33: Members can open the event GPS location in Waze or Google Maps with one tap
FR34: Members can indicate their participation status for an event (going / maybe / not going)
FR35: Members can see who else is going to an event
FR36: Members can send text messages in club-scoped chat channels
FR37: Members can share images in chat
FR38: Messages are delivered in real-time via WebSocket
FR39: Members can view message history in a channel
FR40: Chat channels are scoped to the club — no cross-club messaging
FR41: Admin can configure license types for the club (name, amount, season — e.g., annual license, day pass)
FR42: Members can pay for a license via Stripe Checkout (redirect to Stripe-hosted page)
FR43: The system tracks payment status (pending, completed, failed, refunded) via Stripe webhooks
FR44: Admin can view license status per member per season (paid / pending / expired)
FR45: Admin can view payment history for the club
FR46: Users are shown a privacy notice explaining data usage during signup
FR47: Users can request deletion of their account and associated data
FR48: Users can request export of their personal data
FR49: Consent is recorded for optional data collection (photos, communications)

### NonFunctional Requirements

NFR1: Page loads complete within 1.5s (First Contentful Paint) on 4G mobile connections
NFR1b: Time to Interactive under 3s on 4G mobile connections
NFR2: API CRUD operations respond within 200ms under normal load
NFR3: Chat messages are delivered to recipients within 500ms of sending
NFR4: Document uploads complete within 2s for files under 5MB
NFR5: Event feed renders within 1s for clubs with up to 100 events/month
NFR6: Render free-tier cold starts (<30s) are acceptable at pilot scale
NFR7: All data in transit is encrypted via HTTPS/TLS
NFR8: All stored documents (Cloudflare R2) are accessible only via signed URLs — no public bucket access
NFR9: JWT tokens include clubId claim; every API request is validated against tenant context server-side
NFR10: Passwords are hashed with bcrypt (or argon2) — never stored in plaintext
NFR11: Stripe Checkout handles all card data — no payment card information touches our servers (PCI compliance via delegation)
NFR12: Health-adjacent data (vaccine records, medical certificate references) follows RGPD data minimization — store validity status, not certificate content where possible
NFR13: File uploads are validated for type and size before storage (prevent malicious uploads)
NFR14: System supports 2 clubs with up to 100 members each at MVP launch (pilot scale)
NFR15: Architecture supports horizontal scaling to 50+ clubs without schema changes (shared DB, clubId isolation)
NFR16: WebSocket connections scale to 200 concurrent users on Render free tier
NFR17: Cloudflare R2 storage scales from free tier (10 GB) to paid with no code changes
NFR18: WCAG 2.1 AA compliance across all user-facing pages
NFR19: All interactive elements are keyboard-navigable
NFR20: Color contrast ratios meet AA minimum (4.5:1 for normal text, 3:1 for large text)
NFR21: Form inputs have associated labels and error messages are announced to screen readers
NFR22: Touch targets are minimum 44x44px on mobile for users like Patrick (limited tech comfort)
NFR23: No data loss on server restart or deployment — all state persisted in PostgreSQL and R2
NFR24: Chat message delivery is guaranteed (messages persist in DB even if WebSocket disconnects; client reconnects and fetches missed messages)
NFR25: Stripe webhook handler is idempotent — duplicate webhook events do not create duplicate payment records
NFR26: FFSLC API sync failures (post-MVP) degrade gracefully — cached data is served, admin is alerted, app continues to function

### Additional Requirements

- Existing Nx 22.6 monorepo scaffold is the starter (no external template). Initialization commands already executed. Epic 1, Story 1 must build on this existing scaffold.
- Prisma 7.5 schema design is the first implementation task — all models, relationships, enums, with clubId FK on every tenant-scoped entity
- Guard chain order: JwtAuthGuard → ClubGuard → RolesGuard on every authenticated route
- ClubGuard middleware extracts clubId from JWT and injects into request context
- Shared Zod validation schemas in libs/shared/types — single source of truth for frontend (React Hook Form) and backend (NestJS DTOs)
- API response envelope format: { data } for single items, { data, meta } for paginated lists
- Global AllExceptionsFilter for structured JSON error responses: { statusCode, error, message, details? }
- Frontend error mapping: API error codes → French "we" phrasing user-friendly messages
- Email sending service needed (Resend or SendGrid free tier) in libs/api/core as MailService for invite flow
- Docker Compose for local PostgreSQL development
- GitHub Actions CI/CD pipeline with nx affected for targeted builds/tests
- Swagger/OpenAPI documentation via @nestjs/swagger decorators
- Code splitting via React.lazy() + Suspense on route boundaries
- Environment variable validation with Zod schema at API startup (fail fast if misconfigured)
- JWT strategy: access token (15min) + refresh token (7d, httpOnly cookie)
- Club switching via /auth/switch-club endpoint issuing new JWT with updated activeClubId + role
- TanStack Query keys follow convention: [entity, clubId, ...params]
- React Context for auth state only (user, activeClub, token, role). All server state via TanStack Query.
- NestJS Logger with class context — never console.log
- Co-located tests: *.spec.ts for NestJS, *.test.tsx for React (no separate __tests__ directories)
- Non-buildable Nx React libs (path aliases, Vite resolves imports directly)
- Rate limiting via @nestjs/throttler on login and public endpoints

### UX Design Requirements

UX-DR1: BottomTabBar component — primary mobile navigation with 4 tabs (Events/calendar, Chat/message+unread badge, Dogs/paw, Profile/user), active state blue, inactive muted, role="tablist" with role="tab", re-tap scrolls to top, hidden on desktop (replaced by left sidebar 240px)
UX-DR2: ClubSwitcher component — WhatsApp-style context switching from header, shows current club logo+name+dropdown arrow, lists all clubs with logos/names/federation types, Sheet slide-down on mobile, dropdown on desktop, aria-expanded/haspopup/selected, keyboard navigable, instant context switch, includes "+ Join another club" option
UX-DR3: EventCard compact component — Information-Dense layout for event feed, shows event icon/title/date-time/participant count/RSVP status/draft badge (admin), card is tappable link with aria-label, published and draft variants
UX-DR4: MapWidget component — Leaflet/react-leaflet integration with two modes: view mode (static map+pin+Navigate button for members) and edit mode (interactive tap-to-place/drag-to-adjust pin for admins), loading skeleton state, error fallback showing coordinates text + working Navigate button, full-width and thumbnail variants, map is aria-hidden (decorative)
UX-DR5: NavigateButton component — coral accent CTA, deep link priority Waze → Google Maps → browser fallback, shows detected app name, 48px height on event detail, aria-label with location name and app name, no loading spinner or confirmation, disabled state when no coordinates
UX-DR6: RSVPButton component — three options Going/Maybe/Can't go, one-tap toggle with optimistic update, role="radiogroup" with radio options, inline variant (icon only for card) and expanded variant (icon+label+count for detail), announces current selection
UX-DR7: VaccineStatusBadge component — green "Up to date" / orange "Expiring" / red "Expired", color + text + aria-label (never color alone), compact badge variant for table rows and card variant with count, tappable in dashboard navigating to dog profile
UX-DR8: VaccineSummaryCards component — three cards showing count+label for green/orange/red vaccine statuses, each card is a filter button, announces "N dogs [status], tap to filter", at top of vaccine dashboard
UX-DR9: OnboardingStep component — single-question guided flow screens with progress dots, icon, title, description, input/choices, continue button, auto-focus on input, variants for text input/radio selection/file upload/success confirmation, back navigation preserves input
UX-DR10: DateGroupHeader component — date divider in event feed, relative ("Today", "Tomorrow", "This Week") and absolute ("Sunday 23 March") variants, role="heading" level 3 for screen readers
UX-DR11: Design token system implementation — CSS variables for primary blue (#2563EB), accent coral (#F97316), semantic colors (success green #16A34A, warning amber #D97706, danger red #DC2626), neutral warm grays (background #FAFAFA, card white, foreground #18181B), hover variants for primary and accent
UX-DR12: Typography system — Inter font with system fallback, 7-level scale (H1 24px/700, H2 20px/600, H3 16px/600, Body 14px/400, Body Large 16px/400, Small 12px/400, Caption 11px/500), body minimum 14px on mobile, touch labels minimum 16px, max line length 65-75 chars desktop
UX-DR13: Spacing and layout system — 4px base (Tailwind), defined scale (4/8/12/16/24/32/48px), mobile single column with 16px padding, tablet centered with 24px padding max 768px, desktop centered with 32px padding max 1200px
UX-DR14: Feedback pattern system — success green toast auto-dismiss 3s (top of screen), error red toast persists until dismissed, warning orange inline alert, info blue inline note, skeleton placeholder loading (never spinners except file upload), empty states with illustration + CTA
UX-DR15: Form UX patterns — validate on blur (Zod + React Hook Form), error message below field in red, required fields marked *, optional labeled "(optional)", single column mobile, labels above inputs, 16px minimum input font (prevents iOS zoom), auto-focus first field, full-width submit button on mobile, disable during submission
UX-DR16: Empty state patterns per screen — event feed ("No events yet" + create CTA for admin / passive message for member), dog list ("Add your first dog"), chat ("Start the conversation!"), members ("Invite your team"), vaccine dashboard ("No dogs registered yet")
UX-DR17: Responsive layout strategy — mobile (<640px bottom tab bar, single column, compact rows), tablet (640-1024px bottom tab bar, 2-column where appropriate), desktop (>1024px left sidebar 240px, multi-column grids, data tables), specific per-screen adaptations documented
UX-DR18: Accessibility implementation — WCAG 2.1 AA, axe-core in unit tests, eslint-plugin-jsx-a11y at lint time, visible focus ring (2px solid primary), prefers-reduced-motion support, semantic HTML (header/nav/main/section/article), ARIA roles on all custom components
UX-DR19: Camera-first upload pattern — camera button prominent for document/vaccine certificate/dog photo uploads, file picker as secondary option, WhatsApp-style media sharing flow
UX-DR20: Modal and overlay patterns — Dialog for destructive confirmations only, Sheet slide-up from bottom on mobile for selections/filters, Toast for non-blocking feedback, full-screen for complex creation flows (event+map, dog registration), no nested modals, Escape closes, Tab cycles focusable elements

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 3 | Register new club |
| FR2 | Epic 3 | Update club settings |
| FR3 | Epic 3 | Delete club |
| FR4 | Epic 4 | Multi-club membership |
| FR5 | Epic 4 | Club switcher |
| FR6 | Epic 2 | Sign up with email/password |
| FR7 | Epic 2 | Log in with club-scoped session |
| FR8 | Epic 4 | Invite members by email |
| FR9 | Epic 4 | Email invitation join flow |
| FR10 | Epic 4 | Assign/change member roles |
| FR11 | Epic 4 | Suspend/remove members |
| FR12 | Epic 1 | Club-scoped data isolation |
| FR13 | Epic 4 | Member directory |
| FR14 | Epic 4 | View/edit own profile |
| FR15 | Epic 4 | Search/filter member directory |
| FR16 | Epic 6 | Add dogs to profile |
| FR17 | Epic 6 | Edit/remove own dogs |
| FR18 | Epic 6 | Add vaccine records |
| FR19 | Epic 6 | Upload vaccine certificate |
| FR20 | Epic 6 | Admin view all dogs + vaccine status |
| FR21 | Epic 6 | Filter dogs by vaccine status |
| FR22 | Epic 7 | Upload documents |
| FR23 | Epic 7 | Admin view/download all documents |
| FR24 | Epic 7 | Member view/download own documents |
| FR25 | Epic 7 | Document expiry tracking |
| FR26 | Epic 7 | Admin document expiry dashboard |
| FR27 | Epic 5 | Create events with GPS location |
| FR28 | Epic 5 | Draft/published visibility |
| FR29 | Epic 5 | Edit/delete events |
| FR30 | Epic 5 | Change event visibility |
| FR31 | Epic 5 | View published events in feed |
| FR32 | Epic 5 | View event location on map |
| FR33 | Epic 5 | One-tap Waze/Google Maps navigation |
| FR34 | Epic 5 | RSVP participation status |
| FR35 | Epic 5 | See who's going |
| FR36 | Epic 8 | Send text messages in club channels |
| FR37 | Epic 8 | Share images in chat |
| FR38 | Epic 8 | Real-time WebSocket delivery |
| FR39 | Epic 8 | View message history |
| FR40 | Epic 8 | Club-scoped chat channels |
| FR41 | Epic 9 | Configure license types |
| FR42 | Epic 9 | Pay via Stripe Checkout |
| FR43 | Epic 9 | Track payment status via webhooks |
| FR44 | Epic 9 | License status per member/season |
| FR45 | Epic 9 | Payment history |
| FR46 | Epic 2 | Privacy notice at signup |
| FR47 | Epic 10 | Account deletion request |
| FR48 | Epic 10 | Data export request |
| FR49 | Epic 2 | Consent recording |

## Epic List

### Epic 1: Project Foundation & Multi-Tenant Core
Set up the architectural foundation — Prisma schema, ClubGuard middleware, shared libraries, design tokens, CI/CD — so that every subsequent epic can be built on a solid, tenant-isolated base.
**FRs covered:** FR12
**Additional Reqs:** Prisma schema, guard chain, Zod schemas, response envelopes, error handling, email service, Docker Compose, CI/CD, env validation, design tokens (UX-DR11, UX-DR12, UX-DR13)

### Epic 2: Authentication & User Accounts
Users can sign up, log in, manage their session, and have a secure identity across the platform. Privacy notices shown at signup, consent recorded.
**FRs covered:** FR6, FR7, FR46, FR49

### Epic 3: Club Creation & Onboarding
Any user can register a new club with guided onboarding, configure club settings, and manage the club lifecycle. Aude's 10-minute setup journey is enabled.
**FRs covered:** FR1, FR2, FR3
**UX-DRs:** UX-DR9 (OnboardingStep), UX-DR16 (empty states)

### Epic 4: Member Management & Invitations
Admins can invite members by email, manage roles, suspend/remove members. Members can view the directory and edit profiles. Multi-club membership and the club switcher enable seamless multi-club use.
**FRs covered:** FR4, FR5, FR8, FR9, FR10, FR11, FR13, FR14, FR15
**UX-DRs:** UX-DR1 (BottomTabBar), UX-DR2 (ClubSwitcher), UX-DR17 (responsive layout)

### Epic 5: Event Management & GPS Navigation
Admins can create events with GPS pins, save as draft, publish when ready. Members can see events in a chronological feed, navigate to the meeting point with one tap via Waze/Google Maps, and RSVP.
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35
**UX-DRs:** UX-DR3 (EventCard), UX-DR4 (MapWidget), UX-DR5 (NavigateButton), UX-DR6 (RSVPButton), UX-DR10 (DateGroupHeader)

### Epic 6: Dog Profiles & Vaccine Tracking
Members can register dogs with photos, add vaccine records with expiry dates. Admins can view the vaccine dashboard with green/orange/red status for all dogs — Marie's 30-second competition-day check.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21
**UX-DRs:** UX-DR7 (VaccineStatusBadge), UX-DR8 (VaccineSummaryCards), UX-DR19 (camera-first upload)

### Epic 7: Document Management
Members can upload documents and associate them to themselves or their dogs. Admins can view all documents, track expiry dates, and see a dashboard of documents nearing expiry.
**FRs covered:** FR22, FR23, FR24, FR25, FR26
**UX-DRs:** UX-DR19 (camera-first upload), UX-DR20 (modal patterns)

### Epic 8: Real-Time Chat
Members can send messages and share images in club-scoped channels with real-time delivery via WebSocket. Chat history available. No cross-club messaging.
**FRs covered:** FR36, FR37, FR38, FR39, FR40

### Epic 9: License Payments
Admins can configure license types with amounts. Members pay via Stripe Checkout. Payment status tracked via webhooks. License status per member per season and payment history available.
**FRs covered:** FR41, FR42, FR43, FR44, FR45

### Epic 10: Data Privacy & Account Management
Users can request deletion of their account and all associated data, and export their personal data. Full RGPD compliance.
**FRs covered:** FR47, FR48

---

## Epic 1: Project Foundation & Multi-Tenant Core

Set up the architectural foundation — Prisma schema, ClubGuard middleware, shared libraries, design tokens, CI/CD — so that every subsequent epic can be built on a solid, tenant-isolated base.

### Story 1.1: Prisma Schema & Database Setup

As a developer,
I want the complete Prisma data model with all entities, relationships, enums, and migrations,
So that all subsequent features have a solid, tenant-isolated data foundation.

**Acceptance Criteria:**

**Given** the Prisma schema file at libs/shared/prisma-client/prisma/schema.prisma
**When** I review the schema
**Then** it contains all models: User, Club, ClubMember, Event, EventParticipation, Dog, VaccineRecord, Document, ChatChannel, ChatMessage, LicenseType, Payment, Consent
**And** every tenant-scoped model has a clubId UUID foreign key referencing Club
**And** ClubMember is a join table with userId + clubId + role (enum: OWNER, ADMIN, MEMBER)
**And** all IDs are UUID v4 via @default(uuid())
**And** models use PascalCase singular names, columns use camelCase
**And** enums use PascalCase names with SCREAMING_SNAKE values (Role, EventStatus, ParticipationStatus, VaccineStatus, PaymentStatus, DocumentType)
**And** Event has status enum (DRAFT, PUBLISHED), latitude/longitude Float fields, and a relation to Club
**And** Dog has name, breed, birthdate, chipNumber, photoUrl fields and belongs to User scoped by Club
**And** VaccineRecord has vaccineName, dateAdministered, expiryDate, certificateUrl and belongs to Dog
**And** Document has type enum, fileUrl, expiryDate, and can be associated to User or Dog within a Club
**And** ChatMessage has content, imageUrl, and belongs to ChatChannel scoped by Club
**And** Payment has amount, status enum (PENDING, COMPLETED, FAILED, REFUNDED), stripeSessionId, and relates to User + LicenseType within a Club
**And** createdAt/updatedAt timestamps exist on all models
**And** `prisma migrate dev` runs successfully and creates all tables in PostgreSQL
**And** Docker Compose file provides a local PostgreSQL instance for development
**And** the PrismaService singleton in libs/shared/prisma-client uses @prisma/adapter-pg with the pg driver

### Story 1.2: API Core Infrastructure (Guards, Filters, Pipes)

As a developer,
I want the NestJS core infrastructure with guards, exception filters, validation pipes, interceptors, and decorators,
So that every feature module has security, tenant isolation, validation, and consistent error handling from the start.

**Acceptance Criteria:**

**Given** the libs/api/core library
**When** I review the core module
**Then** JwtAuthGuard exists and validates JWT tokens using @nestjs/passport + passport-jwt strategy
**And** ClubGuard exists and extracts activeClubId from the JWT payload, injects it into the request context, and rejects requests where the user is not a member of the claimed club
**And** RolesGuard exists and checks the user's role within the active club against @Roles() decorator requirements
**And** the guard execution order is enforced: JwtAuthGuard → ClubGuard → RolesGuard
**And** AllExceptionsFilter catches all exceptions and returns structured JSON: { statusCode, error, message, details? }
**And** ZodValidationPipe accepts a Zod schema and validates request body/params/query, returning structured validation errors
**And** ResponseWrapperInterceptor wraps successful responses in { data } envelope (single) or { data, meta } (paginated)
**And** @CurrentUser() decorator extracts the authenticated user from the request
**And** @CurrentClub() decorator extracts the active clubId from the request
**And** @Roles() decorator sets metadata for RolesGuard
**And** JWT configuration uses access token (15min expiry) + refresh token (7d, httpOnly cookie)
**And** @nestjs/throttler is configured for rate limiting on public endpoints
**And** Helmet middleware is applied for security headers
**And** CORS is configured with a whitelist
**And** NestJS Logger is used with class context throughout (never console.log)

### Story 1.3: Shared Zod Schemas & TypeScript Types

As a developer,
I want shared Zod validation schemas and inferred TypeScript types in libs/shared/types,
So that frontend and backend share a single source of truth for data shapes and validation rules.

**Acceptance Criteria:**

**Given** the libs/shared/types library
**When** I review the schemas directory
**Then** auth.schema.ts contains registerSchema (email, password) and loginSchema with Zod validation rules
**And** club.schema.ts contains createClubSchema (name, federation, logo?, contactEmail, description?) and updateClubSchema
**And** member.schema.ts contains inviteMemberSchema (email, role?) and updateMemberRoleSchema
**And** event.schema.ts contains createEventSchema (title, description, dateTime, latitude, longitude, status) and updateEventSchema
**And** dog.schema.ts contains createDogSchema (name, breed?, birthdate?, chipNumber?, photo?) and updateDogSchema
**And** vaccine.schema.ts contains createVaccineSchema (vaccineName, dateAdministered, expiryDate)
**And** document.schema.ts contains uploadDocumentSchema (type, expiryDate?, associatedDogId?)
**And** chat.schema.ts contains sendMessageSchema (content, imageUrl?, channelId)
**And** payment.schema.ts contains createLicenseTypeSchema (name, amount, season) and initiatePaymentSchema
**And** all schemas export inferred TypeScript types (e.g., CreateClub = z.infer<typeof createClubSchema>)
**And** enums.ts exports shared enums matching Prisma enum values
**And** index.ts re-exports all schemas and types
**And** Zod schemas use camelCase field names matching the API JSON format
**And** env.schema.ts in libs/shared/utils validates required environment variables (DATABASE_URL, JWT_SECRET, R2 credentials, STRIPE keys) with Zod

### Story 1.4: Frontend Shell & Design System Foundation

As a user,
I want a consistent visual foundation with proper design tokens, typography, spacing, responsive layout shell, and accessibility baseline,
So that the app looks polished and feels reliable from the very first screen.

**Acceptance Criteria:**

**Given** the frontend application at apps/frontend
**When** I load the app
**Then** CSS variables are defined in styles.css for all design tokens: --primary (#2563EB), --primary-hover (#1D4ED8), --primary-light (#DBEAFE), --accent (#F97316), --accent-hover (#EA580C), --accent-light (#FFF7ED), --success (#16A34A), --warning (#D97706), --danger (#DC2626), --background (#FAFAFA), --card (#FFFFFF), --foreground (#18181B), --muted (#71717A), --border (#E4E4E7) and their light variants
**And** Inter font is loaded with system font fallback stack
**And** typography scale is implemented: H1 (24px/700), H2 (20px/600), H3 (16px/600), Body (14px/400), Body Large (16px/400), Small (12px/400), Caption (11px/500)
**And** Tailwind config extends the theme with custom color tokens and spacing scale (4/8/12/16/24/32/48px)
**And** a responsive AppShell layout component exists with: mobile bottom tab bar placeholder (56px), header with club name placeholder (56px), and main content area
**And** responsive breakpoints work: mobile (<640px single column, 16px padding), tablet (640-1024px, 24px padding, max 768px), desktop (>1024px, left sidebar 240px placeholder, 32px padding, max 1200px)
**And** shadcn/ui is configured in libs/frontend/ui with cn() utility (clsx + tailwind-merge)
**And** a Toast component is set up for success (green, auto-dismiss 3s) and error (red, persist) notifications
**And** skeleton placeholder components exist for card and list loading states
**And** React Router is configured with React.lazy() + Suspense for route-level code splitting
**And** AuthContext provider shell exists (user, activeClub, token, role — state management ready for Epic 2)
**And** TanStack Query client is configured with sensible defaults (staleTime, retry)
**And** a centralized API client exists in libs/frontend/data-access with base URL, auth header injection, and error formatting
**And** eslint-plugin-jsx-a11y is configured and passing
**And** visible focus ring (2px solid primary) is applied globally to all focusable elements
**And** prefers-reduced-motion is respected (animations disabled when set)
**And** PWA manifest.json is present with app name, icons, and theme color

### Story 1.5: CI/CD Pipeline & Developer Experience

As a developer,
I want GitHub Actions CI running lint, typecheck, and tests on PRs, plus local dev tooling (Docker Compose, env validation, Swagger),
So that code quality is enforced automatically and local development is fast and reliable.

**Acceptance Criteria:**

**Given** the GitHub repository
**When** a pull request is opened against main or develop
**Then** a CI workflow runs: `nx affected -t lint typecheck test` against the PR changes
**And** the CI workflow fails if any lint error, type error, or test failure occurs
**And** the CI workflow uses Node.js LTS and caches node_modules and Nx cache for speed

**Given** the local development environment
**When** a developer runs `docker compose up -d`
**Then** a PostgreSQL container starts on port 5432 with a preconfigured database
**And** `.env.example` documents all required environment variables
**And** `cp .env.example .env` + `prisma migrate dev` + `nx serve api` + `nx serve frontend` is the complete setup flow

**Given** the API application
**When** it starts up
**Then** environment variables are validated against the Zod env schema — startup fails fast with clear error messages if any are missing or invalid
**And** Swagger/OpenAPI documentation is available at /api/docs in development mode
**And** @nestjs/swagger decorators are used on all DTOs and controllers

### Story 1.6: Test Environment Deployment Pipeline

As a developer,
I want an automated deployment pipeline to a test environment triggered on merges to develop branch,
So that I can verify features in a real environment with real infrastructure before promoting to production.

**Acceptance Criteria:**

**Given** a merge to the develop branch
**When** the GitHub Actions deploy workflow triggers
**Then** the frontend is built with `nx build frontend` and deployed to Vercel (or Netlify) preview/staging environment
**And** the API is built and deployed to Render staging service
**And** Prisma migrations run automatically against the Neon staging database on deploy
**And** environment variables for the test environment are configured in the hosting platform (not committed to repo)
**And** the deployment workflow runs only after CI checks pass (lint, typecheck, test)

**Given** the test environment is deployed
**When** I access the staging frontend URL
**Then** it connects to the staging API and staging database
**And** the frontend is served over HTTPS
**And** the API health endpoint (/api/health) returns 200

**Given** a merge to the main branch
**When** the production deploy workflow triggers
**Then** the same build and deploy process runs against production infrastructure (Vercel prod, Render prod, Neon prod)
**And** the deployment is separate from the test environment — no shared database or API instance

---

## Epic 2: Authentication & User Accounts

Users can sign up, log in, manage their session, and have a secure identity across the platform. Privacy notices shown at signup, consent recorded.

### Story 2.1: User Registration with Privacy Notice

As a new user,
I want to create an account with my email and password while being informed about data usage,
So that I have a secure identity on the platform and understand how my data is handled.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I fill in my email and password
**Then** the form validates on blur using the shared registerSchema (valid email format, password minimum 8 characters)
**And** required fields are marked with asterisk (*), labels are above inputs, single column layout on mobile
**And** input font size is minimum 16px to prevent iOS zoom on focus

**Given** I submit a valid registration form
**When** the API processes my request
**Then** a new User record is created with email and bcrypt-hashed password (never stored in plaintext)
**And** a privacy notice is displayed during signup explaining data usage (FR46)
**And** my consent for optional data collection (photos, communications) is recorded with a timestamp (FR49)
**And** I receive a success toast (green, auto-dismiss 3s) confirming account creation
**And** I am redirected to the login page or directly logged in

**Given** I try to register with an email that already exists
**When** the API processes my request
**Then** a structured error is returned: { statusCode: 409, error: "EMAIL_EXISTS", message: "..." }
**And** the frontend displays a French "we" phrasing error message (e.g., "Cette adresse email est déjà utilisée")
**And** my input is preserved — the form is not cleared

**Given** I submit the form with invalid data
**When** validation fails on blur
**Then** error messages appear below the errored fields in red
**And** the submit button remains enabled but submission is blocked until errors are fixed

### Story 2.2: User Login & JWT Session

As a registered user,
I want to log in with my email and password and receive a session scoped to my active club,
So that I can securely access my club's data.

**Acceptance Criteria:**

**Given** I am on the login page
**When** I enter my email and password and submit
**Then** the form validates using the shared loginSchema
**And** the API verifies credentials against the bcrypt-hashed password

**Given** my credentials are valid
**When** the API authenticates me
**Then** I receive an access token (JWT, 15min expiry) containing { sub: userId, email, activeClubId, role }
**And** a refresh token (7d expiry) is set as an httpOnly cookie
**And** if I belong to one club, activeClubId is set to that club with my role in that club
**And** if I belong to multiple clubs, activeClubId is set to my last active club (or first club if no preference)
**And** if I belong to no clubs, activeClubId is null and I am redirected to club creation/join flow
**And** the AuthContext on the frontend is populated with user, activeClub, token, and role
**And** the API client in libs/frontend/data-access automatically injects the Authorization header on all requests

**Given** I enter invalid credentials
**When** the API rejects the login
**Then** a structured error is returned: { statusCode: 401, error: "INVALID_CREDENTIALS", message: "..." }
**And** the frontend displays a French error message (e.g., "Email ou mot de passe incorrect")
**And** no information is leaked about whether the email exists or the password is wrong
**And** rate limiting via @nestjs/throttler prevents brute force (e.g., 5 attempts per minute per IP)

### Story 2.3: Token Refresh & Session Management

As a logged-in user,
I want my session to stay alive seamlessly via token refresh and to be able to log out,
So that I don't get unexpectedly kicked out during normal use but can end my session when I want.

**Acceptance Criteria:**

**Given** my access token has expired (after 15 minutes)
**When** the frontend makes an API request
**Then** the API client automatically calls the /auth/refresh endpoint with the httpOnly refresh cookie
**And** a new access token is issued and the original request is retried transparently
**And** the user experiences no interruption or error

**Given** my refresh token has expired (after 7 days)
**When** the frontend attempts to refresh
**Then** the refresh fails and the AuthContext is cleared
**And** I am redirected to the login page
**And** a toast informs me: "Votre session a expiré, veuillez vous reconnecter"

**Given** I am logged in
**When** I tap the logout action
**Then** the refresh token cookie is cleared (server-side invalidation)
**And** the access token is removed from memory
**And** the AuthContext is reset to unauthenticated state
**And** I am redirected to the login page

**Given** I am not authenticated
**When** I try to access any protected route
**Then** I am redirected to the login page
**And** after login, I am redirected back to the originally requested page

---

## Epic 3: Club Creation & Onboarding

Any user can register a new club with guided onboarding, configure club settings, and manage the club lifecycle. Aude's 10-minute setup journey is enabled.

### Story 3.1: Guided Club Registration Flow

As a user,
I want to register a new club through a guided step-by-step onboarding flow,
So that I can create my club's digital home in under 10 minutes without technical knowledge.

**Acceptance Criteria:**

**Given** I am a logged-in user
**When** I navigate to "Register your club"
**Then** I enter a guided onboarding flow with progress dots showing my advancement

**Given** I am on Step 1 (Club Name)
**When** I enter the club name
**Then** the input auto-focuses, validates on blur (required, min 2 characters)
**And** I tap Continue to proceed to the next step

**Given** I am on Step 2 (Federation)
**When** I select a federation affiliation
**Then** I can choose from FFSLC, CNEAC, Other, or None via radio selection
**And** I tap Continue to proceed

**Given** I am on Step 3 (Club Logo)
**When** I see the logo upload option
**Then** a camera-first upload option is prominent with file picker as secondary
**And** a "Skip" ghost button is clearly visible — logo is optional
**And** if I upload, the image is validated for type (JPEG, PNG, WebP) and size (max 2MB)

**Given** I am on Step 4 (Contact & Description)
**When** I enter the contact email and optional description
**Then** email validates on blur (valid format required), description is labeled "(optional)"

**Given** I complete all steps and confirm
**When** the API processes the club creation
**Then** a Club record is created with the provided information
**And** a ClubMember record is created with my userId, the new clubId, and role = OWNER
**And** my JWT is refreshed with the new activeClubId and role = OWNER
**And** I see a success confirmation screen with the club name and a congratulatory message
**And** I am redirected to the club dashboard showing an onboarding checklist (invite members, assign admins)
**And** empty states are shown for events ("No events yet"), members (just me), and other sections

**Given** I navigate back during the onboarding flow
**When** I tap the back arrow
**Then** my previously entered input is preserved — nothing is lost

### Story 3.2: Club Settings Management

As a club owner,
I want to update my club's settings,
So that I can keep the club information accurate and up to date.

**Acceptance Criteria:**

**Given** I am the club owner (role = OWNER)
**When** I navigate to club settings
**Then** I see a form pre-populated with current club data: name, logo, federation, description, contact email

**Given** I modify any field and submit
**When** the API processes the update
**Then** the Club record is updated with the new values
**And** a success toast appears: "Paramètres du club mis à jour"
**And** the updated club name/logo is reflected immediately in the header and club switcher

**Given** I upload a new logo
**When** the image is processed
**Then** it is validated for type (JPEG, PNG, WebP) and size (max 2MB)
**And** the old logo is replaced — the new one is stored in Cloudflare R2 with a signed URL
**And** if upload fails, the old logo is preserved and an error toast is shown

**Given** I am an admin or member (not owner)
**When** I try to access club settings
**Then** the settings page is not accessible — the menu item is hidden
**And** direct URL access returns 403 Forbidden

**Given** I submit the form with invalid data
**When** validation fails
**Then** errors are shown below the relevant fields (French "we" phrasing)
**And** my changes are preserved — the form is not reset

### Story 3.3: Club Deletion

As a club owner,
I want to delete my club,
So that I can remove the club's digital space if it is no longer needed.

**Acceptance Criteria:**

**Given** I am the club owner
**When** I tap "Delete club" in club settings
**Then** a confirmation dialog appears (destructive action pattern): "Supprimer ce club ? Cette action est irréversible. Tous les événements, messages, documents et données des membres seront supprimés."
**And** the dialog has a "Cancel" secondary button and a red "Delete" destructive button

**Given** I confirm deletion
**When** the API processes the request
**Then** the Club record and all associated data are deleted (cascade): ClubMember records, Events, EventParticipations, ChatChannels, ChatMessages, Dogs (scoped to club), VaccineRecords, Documents, LicenseTypes, Payments
**And** all files associated with the club in Cloudflare R2 are deleted
**And** all members' JWTs referencing this club become invalid — they are redirected to their next club or the club creation flow
**And** I see a success toast: "Le club a été supprimé"
**And** I am redirected to my next club (if I have one) or to the club creation/join flow

**Given** I am not the club owner
**When** I try to delete the club
**Then** the API returns 403 Forbidden
**And** the delete button is not visible in the UI

---

## Epic 4: Member Management & Invitations

Admins can invite members by email, manage roles, suspend/remove members. Members can view the directory and edit profiles. Multi-club membership and the club switcher enable seamless multi-club use.

### Story 4.1: Email Invitation & Member Join Flow

As a club admin,
I want to invite new members by email so they can join the club,
So that growing the club is frictionless and invitees get a guided path to joining.

**Acceptance Criteria:**

**Given** I am an admin or owner of the club
**When** I navigate to the invite members section
**Then** I see a form to enter one or more email addresses

**Given** I submit valid email addresses
**When** the API processes the invitations
**Then** an invitation record is created for each email with a unique token and expiry (e.g., 7 days)
**And** the MailService sends an email to each address with a deep link to join the club
**And** a success toast confirms: "Invitations envoyées"
**And** duplicate invitations to the same email for the same club are prevented — a clear message is shown

**Given** an invited user clicks the invitation link
**When** they do not have an account
**Then** they are directed to the registration page with the invitation token pre-loaded
**And** after registration, a ClubMember record is created (role = MEMBER) and they auto-join the club
**And** their JWT is issued with the new club as activeClubId

**Given** an invited user clicks the invitation link
**When** they already have an account
**Then** they are directed to the login page (or auto-join if already logged in)
**And** after login, a ClubMember record is created (role = MEMBER) and they auto-join the club

**Given** the invitation link has expired
**When** the user clicks it
**Then** they see a friendly message: "Cette invitation a expiré. Demandez à un administrateur de vous renvoyer une invitation."

**Given** I am a regular member (not admin/owner)
**When** I try to access the invite feature
**Then** the invite option is not visible in the UI
**And** direct API calls return 403 Forbidden

### Story 4.2: Member Directory & Profile Management

As a club member,
I want to view the member directory and manage my own profile,
So that I can see who's in my club and keep my information up to date.

**Acceptance Criteria:**

**Given** I am a member of the club
**When** I navigate to the members section
**Then** I see a list of all club members with their name, avatar (initials fallback), and role badge
**And** the list is scoped to the active club only — no cross-club data visible (FR12)

**Given** I am an admin or owner
**When** I view the member directory
**Then** I can search by name or email with a search input at the top (debounced 300ms, instant results)
**And** I can filter by role: "All" / "Admin" / "Member" via toggle chips
**And** on desktop, the directory renders as a full data table with sortable columns

**Given** I am any member
**When** I tap my own profile
**Then** I see my profile page with my name, email, avatar, and club-specific information
**And** I can edit my display name and avatar (photo upload with camera-first pattern)
**And** changes are saved with a success toast

**Given** I am a regular member
**When** I view another member's profile
**Then** I see their public information (name, avatar, role) but cannot edit it

**Given** the member directory is empty (only me)
**When** I view the directory
**Then** an empty state is shown: "Invitez votre équipe pour commencer" with an "Invite" CTA (admin/owner only)

### Story 4.3: Role Management & Member Administration

As a club owner,
I want to manage member roles and remove members,
So that I can organize my club's leadership and handle departures.

**Acceptance Criteria:**

**Given** I am the club owner
**When** I view a member's profile or the directory
**Then** I see options to change their role (promote to Admin, demote to Member)
**And** role changes are confirmed via a Sheet on mobile with the role options
**And** the new role takes effect immediately — the member's next JWT refresh reflects the updated role
**And** a success toast confirms the change

**Given** I am an admin
**When** I try to change roles
**Then** I can promote members to Admin and demote Admins to Member
**And** I cannot change the Owner's role or promote anyone to Owner
**And** I cannot demote myself (prevents accidental self-demotion)

**Given** I am an owner or admin
**When** I tap "Remove member" on a member's profile
**Then** a confirmation dialog appears: "Retirer [name] du club ?"
**And** on confirmation, the ClubMember record is deleted
**And** the removed member's JWT for this club is invalidated
**And** the member is removed from the directory immediately
**And** a success toast confirms: "[name] a été retiré du club"

**Given** I am an owner or admin
**When** I tap "Suspend member"
**Then** the member's ClubMember record is flagged as suspended
**And** the suspended member cannot access the club's data — API returns 403
**And** the suspended member appears in the directory with a "Suspended" badge (admin view only)

**Given** I am a regular member
**When** I view the directory
**Then** no role management or remove/suspend options are visible

**Given** there is only one owner
**When** the owner tries to leave or be removed
**Then** the action is blocked with a message: "Vous devez transférer la propriété avant de quitter le club"

### Story 4.4: Club Switcher & Multi-Club Navigation

As a multi-club member,
I want to switch between my clubs instantly via a club switcher with consistent navigation,
So that I can manage my participation in multiple clubs from a single app and login.

**Acceptance Criteria:**

**Given** I belong to multiple clubs
**When** I tap the club name in the header
**Then** the ClubSwitcher opens: a Sheet sliding down on mobile, a dropdown on desktop
**And** I see all my clubs listed with: club logo, club name, federation type, and a checkmark on the active club
**And** the switcher has aria-expanded, aria-haspopup="listbox", active club has aria-selected
**And** keyboard navigation works: Enter to open, arrows to navigate, Enter to select, Escape to close

**Given** I tap a different club in the switcher
**When** the context switches
**Then** the frontend calls /auth/switch-club with the new clubId
**And** a new JWT is issued with the updated activeClubId and the correct role for that club
**And** all data on screen is immediately scoped to the new club (events, chat, members, dogs, documents)
**And** the header updates with the new club's logo and name
**And** the switch is instant — no loading screen or confirmation dialog
**And** my tab position is preserved (if I was on Events tab, I stay on Events tab)

**Given** I see the bottom of the club list in the switcher
**When** I look for additional options
**Then** a "+ Join another club" option is available at the bottom
**And** tapping it navigates to a join/search flow (or shows invite code input)

**Given** I am on mobile
**When** I view the app
**Then** a BottomTabBar is visible with 4 tabs: Events (calendar icon), Chat (message icon with unread badge), Dogs (paw icon), Profile (user icon)
**And** the active tab has blue icon + label, inactive tabs are muted
**And** each tab has role="tab" within a role="tablist"
**And** unread chat badge (coral) announces count to screen readers
**And** re-tapping the active tab scrolls to top
**And** the BottomTabBar is 56px height and always visible

**Given** I am on desktop (>1024px)
**When** I view the app
**Then** the BottomTabBar is hidden and replaced by a left sidebar (240px)
**And** the sidebar sections match the tab structure plus additional admin sections
**And** the ClubSwitcher is at the top of the sidebar

**Given** I belong to only one club
**When** I tap the club name
**Then** the switcher still opens showing my single club and the "+ Join another club" option

---

## Epic 5: Event Management & GPS Navigation

Admins can create events with GPS pins, save as draft, publish when ready. Members can see events in a chronological feed, navigate to the meeting point with one tap via Waze/Google Maps, and RSVP.

### Story 5.1: Event Creation with GPS Pin Placement

As a club admin,
I want to create events with a title, description, date/time, and GPS location placed on an interactive map,
So that members always know exactly where and when to meet.

**Acceptance Criteria:**

**Given** I am an admin or owner
**When** I tap "+" or "New Event" from the Events tab
**Then** I see an event creation form with fields: title (required), description (optional), date/time (required), location

**Given** I tap "Set Location" on the form
**When** the map view opens full-screen
**Then** I see an interactive Leaflet/react-leaflet map in edit mode
**And** I can tap any point on the map to drop a GPS pin — two taps maximum to place
**And** I can drag the pin to adjust its position precisely
**And** the address auto-fills from reverse geocoding if available (or shows coordinates)
**And** I confirm the location to return to the form with coordinates saved

**Given** the map fails to load
**When** I see the error state
**Then** a fallback is shown: "Carte indisponible" with manual latitude/longitude input fields
**And** the Navigate button will still work with manually entered coordinates

**Given** I fill in all required fields
**When** I save the event
**Then** the event defaults to DRAFT status (safe by default — never publish accidentally)
**And** an Event record is created with title, description, dateTime, latitude, longitude, status=DRAFT, clubId
**And** a success toast confirms: "Événement créé en brouillon"
**And** I am navigated to the event detail page showing a "Draft" orange badge

**Given** I am a regular member
**When** I try to access event creation
**Then** the "+" button is not visible
**And** direct API calls return 403 Forbidden

### Story 5.2: Event Feed & Date-Grouped List

As a club member,
I want to see upcoming published events in a chronological, date-grouped feed,
So that I can quickly scan what's happening and when.

**Acceptance Criteria:**

**Given** I am a member of the club
**When** I open the app or tap the Events tab
**Then** I land on the event feed (home screen / default tab)
**And** published events are displayed as compact EventCard rows in an Information-Dense layout
**And** events are sorted chronologically with the next upcoming event at the top

**Given** the event feed has events
**When** I scroll through the feed
**Then** DateGroupHeader dividers separate events by date: "Aujourd'hui", "Demain", "Cette semaine", "Semaine prochaine", or absolute dates (e.g., "Dimanche 23 mars")
**And** DateGroupHeaders have role="heading" level 3 for screen reader structure
**And** each EventCard shows: event type icon, title, date/time, participant count, my RSVP status indicator
**And** each EventCard is a tappable link with aria-label including event title + date

**Given** I am an admin or owner
**When** I view the event feed
**Then** I see both published AND draft events
**And** draft events display an orange "Brouillon" badge
**And** I can filter: "Tous" / "Publiés" / "Brouillons" via toggle chips

**Given** the event feed is loading
**When** data is being fetched
**Then** skeleton card placeholders are shown matching the EventCard shape (never a spinner)

**Given** no events exist yet
**When** I view the feed as an admin
**Then** an empty state is shown: "Aucun événement pour le moment" with a "Créer votre premier événement" CTA
**When** I view the feed as a member
**Then** an empty state is shown: "Les événements apparaîtront ici quand les admins les publieront"

**Given** the feed renders on different devices
**When** I view on mobile (<640px)
**Then** compact rows are full-width with date grouping
**When** I view on desktop (>1024px)
**Then** a 2-column layout is available: event list + map sidebar showing pins for visible events

### Story 5.3: Event Detail, Map & One-Tap Navigation

As a club member,
I want to view event details with a map and navigate to the meeting point in one tap,
So that I always arrive at the right place without workarounds.

**Acceptance Criteria:**

**Given** I tap an EventCard in the feed
**When** the event detail page loads
**Then** I see: title, description, date/time, and a full-width MapWidget showing the GPS pin with location name
**And** the map is in view mode (static, not editable)
**And** the map is aria-hidden (decorative) with coordinates available as text for screen readers

**Given** the event has GPS coordinates
**When** I look below the map
**Then** a large coral NavigateButton is visible above the fold (48px height) — the most prominent CTA on the page
**And** the button shows the detected app name: "Naviguer avec Waze" or "Naviguer avec Google Maps"
**And** the button has aria-label: "Ouvrir l'itinéraire vers [location] dans [Waze/Google Maps]"

**Given** I tap the NavigateButton
**When** Waze is installed on my device
**Then** Waze opens immediately with the correct coordinates — no intermediate screen, no loading spinner

**Given** I tap the NavigateButton
**When** Waze is not installed but Google Maps is
**Then** Google Maps opens with the correct coordinates

**Given** I tap the NavigateButton
**When** neither Waze nor Google Maps is installed
**Then** the browser's default map opens with the coordinates as fallback

**Given** the map fails to load
**When** I see the MapWidget error state
**Then** I see "Carte indisponible" with the coordinates displayed as text
**And** the NavigateButton still works — deep link uses the stored coordinates regardless of map rendering

**Given** the event detail loads on tablet (768px+)
**When** I view the layout
**Then** the map and event info are displayed side by side

**Given** the event has no coordinates set
**When** I view the event detail
**Then** the NavigateButton is disabled with muted styling
**And** no map is shown — just the event text details

### Story 5.4: RSVP & Participation Tracking

As a club member,
I want to indicate whether I'm going to an event and see who else is going,
So that the group can coordinate attendance.

**Acceptance Criteria:**

**Given** I am viewing a published event (detail page)
**When** I see the RSVP section
**Then** three options are displayed: "J'y vais" (Going), "Peut-être" (Maybe), "Je ne peux pas" (Can't go)
**And** the RSVPButton group has role="radiogroup" with each option as a radio
**And** my current selection (if any) is highlighted: blue filled for Going, muted for others

**Given** I tap an RSVP option
**When** I select "Going"
**Then** my selection is updated instantly via optimistic update (no loading spinner)
**And** the participant count increments immediately on the event card and detail
**And** if the optimistic update fails (network error), the selection reverts and an error toast appears
**And** an EventParticipation record is created/updated: userId + eventId + status (GOING/MAYBE/NOT_GOING)

**Given** I have already RSVP'd
**When** I tap a different option
**Then** my selection changes instantly (toggle behavior) — no confirmation needed (reversible action)

**Given** I view the event detail
**When** I look at the "Who's going" section
**Then** I see a list of members who RSVP'd as Going, with their names and avatars
**And** the count of Going / Maybe / Can't go is displayed
**And** the list is expandable if there are many participants

**Given** I view the EventCard in the feed
**When** RSVP data exists
**Then** the inline RSVPButton variant shows my status as an icon
**And** the participant count (Going) is displayed on the card

**Given** the event is in the past
**When** I view the RSVP options
**Then** the RSVPButton is disabled — I can no longer change my status
**And** the final participation list is still visible

### Story 5.5: Draft/Publish Workflow & Event Management

As a club admin,
I want to manage event visibility with draft/publish toggling, edit events, and delete them,
So that I can prepare events properly before members see them.

**Acceptance Criteria:**

**Given** I am an admin viewing a draft event
**When** I tap "Publier" (Publish)
**Then** the event status changes to PUBLISHED with a single toggle
**And** the event becomes visible to all members in the feed immediately
**And** the orange "Brouillon" badge is removed
**And** a success toast confirms: "Événement publié"

**Given** I am an admin viewing a published event
**When** I tap "Dépublier" (Unpublish)
**Then** the event status reverts to DRAFT
**And** the event is hidden from members (visible only to admins)
**And** the orange "Brouillon" badge reappears
**And** this is a reversible action — no confirmation dialog needed

**Given** I am an admin
**When** I tap "Edit" on an event
**Then** the event form opens pre-populated with current data (title, description, date/time, GPS pin on map)
**And** I can modify any field including dragging the GPS pin to a new location
**And** saving updates the Event record and shows a success toast

**Given** I am an admin
**When** I tap "Delete" on an event
**Then** a confirmation dialog appears (destructive pattern): "Supprimer cet événement ? Cette action est irréversible."
**And** on confirmation, the Event and all related EventParticipation records are deleted
**And** a success toast confirms: "Événement supprimé"
**And** I am redirected to the event feed

**Given** I am a regular member
**When** I view a published event
**Then** no edit, delete, publish/unpublish controls are visible
**And** draft events are completely invisible — not in the feed, not accessible by direct URL (API returns 404)

---

## Epic 6: Dog Profiles & Vaccine Tracking

Members can register dogs with photos, add vaccine records with expiry dates. Admins can view the vaccine dashboard with green/orange/red status for all dogs — Marie's 30-second competition-day check.

### Story 6.1: Dog Registration & Profile Management

As a club member,
I want to register my dogs with their details and photo,
So that my dogs are part of my club profile and ready for vaccine tracking.

**Acceptance Criteria:**

**Given** I am a member of the club
**When** I navigate to the Dogs tab and tap "+ Add Dog"
**Then** I see a form with fields: name (required), breed (optional), birthdate (optional), chip number (optional), photo (optional)
**And** the photo upload uses camera-first pattern: camera button prominent, file picker secondary
**And** optional fields are labeled "(optional)"

**Given** I fill in the dog's name and submit
**When** the API processes the creation
**Then** a Dog record is created with the provided data, linked to my userId and the active clubId
**And** the photo (if uploaded) is validated for type (JPEG, PNG, WebP) and size (max 5MB), stored in Cloudflare R2 with a signed URL
**And** a success toast confirms: "Chien ajouté"
**And** I am navigated to the dog's profile page

**Given** I view my dog's profile
**When** I tap "Edit"
**Then** the form opens pre-populated with current data
**And** I can update any field including replacing the photo
**And** saving shows a success toast: "Profil mis à jour"

**Given** I want to remove a dog
**When** I tap "Remove" on the dog's profile
**Then** a confirmation dialog appears: "Retirer [dog name] ? Les carnets de vaccination et documents associés seront supprimés."
**And** on confirmation, the Dog record and all related VaccineRecords and Documents are deleted
**And** a success toast confirms: "Chien retiré"

**Given** I am a member
**When** I view the Dogs tab
**Then** I see only my own dogs listed with name, photo (or avatar with paw icon fallback), breed
**And** each dog card shows a vaccine status summary badge (if vaccines exist)

**Given** I have no dogs registered
**When** I view the Dogs tab
**Then** an empty state is shown: "Ajoutez votre premier chien pour commencer" with an "Ajouter un chien" CTA

**Given** I try to view or edit another member's dogs
**When** I access their dog profiles
**Then** I can see their dogs' public info (name, breed, photo) but cannot edit or remove them

### Story 6.2: Vaccine Records & Certificate Upload

As a club member,
I want to add vaccine records to my dogs with expiry dates and upload certificate photos,
So that my dog's health status is tracked digitally and admins can verify it.

**Acceptance Criteria:**

**Given** I am viewing my dog's profile
**When** I tap "+ Add Vaccine"
**Then** I see a form with fields: vaccine name (required, e.g., "Rage", "DHPP"), date administered (required), expiry date (required)

**Given** I fill in the vaccine details and submit
**When** the API processes the record
**Then** a VaccineRecord is created linked to the dog
**And** the vaccine status is auto-calculated from the expiry date:
- Green "À jour" if expiryDate > today + 30 days
- Orange "Expire bientôt" if expiryDate <= today + 30 days AND expiryDate >= today
- Red "Expiré" if expiryDate < today
**And** a success toast confirms: "Vaccin ajouté"

**Given** the vaccine form is submitted
**When** I see the certificate upload option
**Then** I can upload a vaccine certificate photo linked to this vaccine record
**And** the upload uses camera-first pattern: camera button prominent ("Prendre en photo"), file picker secondary ("Choisir un fichier")
**And** a photo preview is shown before confirmation with a "Retake" option
**And** the certificate is validated for type and size (max 5MB), stored in R2 with a signed URL
**And** the certificateUrl is saved on the VaccineRecord
**And** uploading is optional — "Skip" is available to save the record without a certificate

**Given** I view my dog's profile with vaccine records
**When** I look at the vaccine section
**Then** each vaccine shows: vaccine name, date administered, expiry date, VaccineStatusBadge (green/orange/red)
**And** the badge shows color + text label + aria-label "Statut vaccin : [status]" (never color alone)
**And** if a certificate was uploaded, a "View certificate" link is available
**And** I can edit or delete individual vaccine records

**Given** I edit a vaccine record
**When** I update the expiry date
**Then** the status badge recalculates immediately based on the new date

**Given** multiple vaccines exist for the same dog
**When** I view the dog's profile
**Then** all vaccines are listed with their individual status badges
**And** the dog's overall status is determined by its worst vaccine (if any is red, the dog is red)

### Story 6.3: Admin Vaccine Dashboard

As a club admin,
I want to see a dashboard of all dogs' vaccine statuses at a glance,
So that I can verify competition readiness in 30 seconds instead of flipping through a paper binder.

**Acceptance Criteria:**

**Given** I am an admin or owner
**When** I navigate to the Dogs tab
**Then** I see the Vaccine Status Dashboard at the top with VaccineSummaryCards: three cards showing counts for green (à jour), orange (expire bientôt), and red (expiré)
**And** each summary card is a tappable button with aria-label: "N chiens [status], appuyez pour filtrer"
**And** below the summary cards, a list of all club dogs is displayed

**Given** the dashboard is loaded
**When** I view the dog list
**Then** each row shows: dog name, owner name, VaccineStatusBadge (overall status), next expiry date
**And** rows are color-coded by status (green/orange/red background tint)
**And** the default sort shows problems first: expired → expiring → up to date

**Given** I tap a summary card (e.g., the red "Expired" card)
**When** the filter activates
**Then** the dog list below filters to show only dogs matching that status
**And** the active filter card has a selected visual state
**And** tapping "All" or the same card again clears the filter

**Given** I tap a dog row in the dashboard
**When** the dog profile opens
**Then** I see the full dog profile with all vaccine records and certificates
**And** I see the owner's name as a tappable link

**Given** I tap the owner's name
**When** contact options appear
**Then** I can choose to open a chat with the owner or see their profile
**And** this enables the workflow: see expired vaccine → contact owner → request updated certificate

**Given** the dashboard loads on mobile
**When** I view the layout
**Then** summary cards are stacked vertically, the dog list is scrollable
**Given** the dashboard loads on desktop
**When** I view the layout
**Then** summary cards are in a row, the list is a sortable data table with columns

**Given** no dogs are registered in the club
**When** I view the dashboard
**Then** an empty state is shown: "Aucun chien enregistré — les chiens apparaîtront ici quand les membres les ajouteront"

**Given** all dogs have green status
**When** I view the dashboard
**Then** the visual feedback conveys a sense of readiness: all-green summary, no action needed

---

## Epic 7: Document Management

Members can upload documents and associate them to themselves or their dogs. Admins can view all documents, track expiry dates, and see a dashboard of documents nearing expiry.

### Story 7.1: Document Upload & Association

As a club member,
I want to upload documents and associate them to myself or my dogs,
So that my registration forms, certificates, and health records are stored digitally in one place.

**Acceptance Criteria:**

**Given** I am a member of the club
**When** I navigate to the Documents section or tap "Upload" from my profile or a dog's profile
**Then** I see an upload form with: document type (required — select from: registration form, vaccine certificate, health record, license, other), expiry date (optional), association (myself or one of my dogs)

**Given** I initiate an upload
**When** I see the upload interface
**Then** the camera-first pattern is used: camera button prominent ("Prendre en photo"), file picker secondary ("Choisir un fichier")
**And** accepted file types are: JPEG, PNG, WebP, PDF
**And** maximum file size is 5MB — oversized files show a clear error: "Le fichier est trop volumineux (max 5 Mo)"

**Given** I select or capture a file
**When** the upload processes
**Then** a progress indicator is shown (the one exception where a progress bar is used instead of skeleton)
**And** the file is validated server-side for MIME type and size (NFR13)
**And** the file is stored in Cloudflare R2 with a tenant-scoped key (clubId/documents/...)
**And** a signed URL is generated and stored on the Document record
**And** a Document record is created with: type, fileUrl, expiryDate, clubId, userId, dogId (if associated to a dog)

**Given** the upload succeeds
**When** I see the confirmation
**Then** a success toast appears: "Document ajouté"
**And** the document appears in my document list immediately

**Given** the upload fails (network error, invalid file)
**When** I see the error
**Then** an error toast appears with a French "we" message: "Nous n'avons pas pu télécharger ce fichier — réessayez"
**And** my form state is preserved — I can retry without re-entering metadata

**Given** I upload from a dog's profile page
**When** the association dropdown shows
**Then** the dog is pre-selected as the association target
**And** I can change it to myself or another dog if needed

### Story 7.2: Document Viewing, Download & Expiry Tracking

As a club member,
I want to view and download my documents, and as an admin view all club documents,
So that digital records are always accessible and expiry dates are tracked.

**Acceptance Criteria:**

**Given** I am a member
**When** I navigate to my documents section
**Then** I see a list of my uploaded documents with: document type icon, file name/type label, upload date, expiry date (if set), associated entity (myself or dog name)
**And** I only see documents I uploaded — not other members' documents

**Given** I tap a document in the list
**When** the document viewer opens
**Then** images (JPEG, PNG, WebP) are displayed inline
**And** PDFs open in the browser's PDF viewer or a download prompt
**And** a "Download" button is available for all document types

**Given** a document has an expiry date
**When** I view it in the list
**Then** a status indicator shows:
- No badge if expiry > 30 days
- Orange "Expire bientôt" badge if expiry <= 30 days and >= today
- Red "Expiré" badge if expiry < today

**Given** I am an admin or owner
**When** I navigate to the club documents section
**Then** I see all documents across all members in the club
**And** each row shows: member name, document type, associated entity (member or dog), upload date, expiry date, status badge
**And** I can search by member name or document type
**And** I can download any document

**Given** I am a regular member
**When** I try to view other members' documents
**Then** the API returns only my own documents — no cross-member visibility

**Given** documents are loading
**When** the list is being fetched
**Then** skeleton row placeholders are displayed matching the list row shape

### Story 7.3: Admin Document Expiry Dashboard

As a club admin,
I want to see a dashboard of documents nearing or past expiry,
So that I can proactively follow up with members before documents lapse.

**Acceptance Criteria:**

**Given** I am an admin or owner
**When** I navigate to the document management section
**Then** I see a dashboard summary at the top showing counts: expired documents (red), expiring within 30 days (orange), up to date (green)
**And** the summary cards follow the same pattern as the vaccine dashboard (VaccineSummaryCards style)

**Given** I view the expiry dashboard
**When** I look at the document list below the summary
**Then** documents are sorted by urgency: expired first, then expiring soon, then up to date
**And** each row shows: member name, document type, associated entity, expiry date, status badge
**And** the default filter shows "Expired" + "Expiring" (problems first)

**Given** I tap a summary card
**When** the filter activates
**Then** the list filters to show only documents matching that status
**And** I can tap "All" to clear the filter

**Given** I tap a document row
**When** the detail opens
**Then** I see the document with member and association details
**And** the member's name is tappable — I can open a chat or view their profile to follow up

**Given** no documents with expiry dates exist
**When** I view the dashboard
**Then** summary cards show all zeros
**And** a helpful message: "Les documents avec date d'expiration apparaîtront ici"

---

## Epic 8: Real-Time Chat

Members can send messages and share images in club-scoped channels with real-time delivery via WebSocket. Chat history available. No cross-club messaging.

### Story 8.1: Chat Channels & Text Messaging

As a club member,
I want to send and receive text messages in my club's chat channels in real-time,
So that our club can coordinate without relying on WhatsApp or Facebook groups.

**Acceptance Criteria:**

**Given** I am a member of the club
**When** I tap the Chat tab
**Then** I see a list of chat channels for the active club
**And** a default "General" channel exists for every club (auto-created on club creation)
**And** channels are scoped to the club — no cross-club channels visible (FR40)

**Given** I open a chat channel
**When** I see the chat view
**Then** messages are displayed as WhatsApp-familiar bubbles: my messages on the right (blue tint), others on the left (gray tint)
**And** each message shows: sender name, sender avatar (initials fallback), message content, timestamp
**And** the chat input is at the bottom of the screen with auto-resize textarea

**Given** I type a message and tap send
**When** the message is submitted
**Then** the message appears immediately in my view (optimistic update)
**And** a ChatMessage record is created in PostgreSQL: content, userId, channelId, clubId, createdAt
**And** the message is broadcast via Socket.IO to all connected members in the same channel
**And** other members see the message appear in real-time within 500ms (NFR3)

**Given** a member in my club sends a message
**When** I have the channel open
**Then** the message appears in real-time without page refresh
**And** the view auto-scrolls to the new message if I was at the bottom

**Given** I am on a different tab (not Chat)
**When** a new message arrives in a channel
**Then** the Chat tab in the BottomTabBar shows a coral unread badge with count
**And** the badge announces the count to screen readers: "N messages non lus"

**Given** the WebSocket connection is authenticated
**When** I connect to the chat gateway
**Then** the Socket.IO gateway validates my JWT on connection
**And** I am auto-joined to rooms matching my active club's channels only
**And** messages include clubId for server-side validation — no cross-club delivery

**Given** no messages exist in a channel
**When** I open it
**Then** an empty state is shown: "Lancez la conversation !" with focus on the input field

### Story 8.2: Chat Image Sharing & Message History

As a club member,
I want to share images in chat and scroll through message history,
So that I can share photos from events and reference past conversations.

**Acceptance Criteria:**

**Given** I am in a chat channel
**When** I tap the image/attachment icon next to the input
**Then** the camera-first upload pattern is used: camera option prominent, photo gallery/file picker secondary
**And** I can select or capture an image (JPEG, PNG, WebP, max 5MB)

**Given** I select an image to share
**When** I confirm the send
**Then** a preview of the image is shown in the chat as a loading placeholder
**And** the image is uploaded to Cloudflare R2 via the upload pipeline (validate type + size → store → signed URL)
**And** a ChatMessage record is created with imageUrl pointing to the signed URL
**And** the image renders inline in the chat bubble for all members in real-time
**And** tapping the image opens it in a full-screen viewer

**Given** the image upload fails
**When** the error occurs
**Then** the placeholder is replaced with a retry indicator: "Échec de l'envoi — appuyez pour réessayer"
**And** the message is not broadcast to other members until upload succeeds

**Given** I open a chat channel with existing messages
**When** the channel loads
**Then** the most recent messages are displayed (latest page, e.g., last 50 messages)
**And** I can scroll up to load older messages (infinite scroll / lazy loading with skeleton placeholders)
**And** the scroll position is preserved when new messages arrive (no jump to bottom if I'm reading history)

**Given** messages contain images
**When** I scroll through history
**Then** images load lazily with blur-up placeholder → sharp image
**And** images are displayed at a reasonable size within the bubble (max-width constrained)

**Given** the chat loads on different devices
**When** I view on mobile
**Then** the chat is full-screen with input at the bottom (WhatsApp layout)
**When** I view on desktop (>1024px)
**Then** a split layout is available: channel list on the left + conversation on the right

### Story 8.3: Chat Reconnection & Reliability

As a club member,
I want my chat to recover gracefully from connection drops and never lose messages,
So that I can trust the chat even on spotty mobile networks at outdoor events.

**Acceptance Criteria:**

**Given** my WebSocket connection drops (network change, phone sleep, server restart)
**When** the client detects disconnection
**Then** a subtle inline indicator appears: "Reconnexion en cours..." (no blocking modal or error toast)
**And** Socket.IO's built-in reconnection strategy activates (exponential backoff)

**Given** the WebSocket reconnects
**When** the connection is re-established
**Then** the client automatically fetches all messages sent since the last received message timestamp
**And** missed messages appear in the correct chronological position in the chat
**And** the reconnection indicator disappears
**And** no duplicate messages are displayed (deduplication by message ID)

**Given** a message is sent while offline
**When** the WebSocket is disconnected
**Then** the message is queued locally with a "pending" visual indicator (clock icon)
**And** when reconnection succeeds, the queued message is sent automatically
**And** the pending indicator is replaced with the delivered state

**Given** all messages are persisted in PostgreSQL
**When** the server restarts
**Then** no messages are lost — all chat history is available via REST API fetch on reconnect (NFR23, NFR24)

**Given** I switch clubs via the ClubSwitcher
**When** the active club changes
**Then** the WebSocket leaves the previous club's channel rooms
**And** the WebSocket joins the new club's channel rooms
**And** the chat view refreshes to show the new club's channels and messages

---

## Epic 9: License Payments

Admins can configure license types with amounts and payment provider. Members pay via Stripe Checkout or HelloAsso. Payment status tracked via webhooks. License status per member per season and payment history available.

### Story 9.1: License Type Configuration

As a club admin,
I want to configure license types for my club with amounts, seasons, and payment provider,
So that members know what to pay and through which channel.

**Acceptance Criteria:**

**Given** I am an admin or owner
**When** I navigate to the license configuration section
**Then** I see a list of existing license types for the club (if any)
**And** I can tap "+ Add License Type" to create a new one

**Given** I create a new license type
**When** I fill in the form
**Then** I provide: name (required, e.g., "Licence annuelle", "Pass journée"), amount in euros (required), season (required, e.g., "2025-2026"), payment provider (required — select: Stripe or HelloAsso)
**And** the form validates on blur using the shared createLicenseTypeSchema

**Given** I submit a valid license type
**When** the API processes the creation
**Then** a LicenseType record is created with: name, amount, season, paymentProvider, clubId
**And** a success toast confirms: "Type de licence ajouté"
**And** the license type appears in the list immediately

**Given** I want to edit an existing license type
**When** I tap edit on a license type
**Then** the form opens pre-populated with current values
**And** I can modify any field and save with a success toast

**Given** I want to delete a license type
**When** I tap delete
**Then** a confirmation dialog appears: "Supprimer ce type de licence ? Les paiements existants ne seront pas affectés."
**And** on confirmation, the LicenseType is soft-deleted or removed (existing Payment records remain intact)

**Given** I am a regular member
**When** I view available licenses
**Then** I see the license types configured by admins with name, amount, season, and a "Pay" button
**And** I cannot access the configuration section

### Story 9.2: Stripe Checkout Payment Flow

As a club member,
I want to pay for a license via Stripe Checkout,
So that I can pay my club fees securely with a credit card.

**Acceptance Criteria:**

**Given** I am a member and a license type is configured with Stripe as payment provider
**When** I tap "Pay" on a license type
**Then** the frontend calls the API to initiate a Stripe Checkout session
**And** the API creates a Stripe Checkout Session with: amount, currency (EUR), success_url, cancel_url, metadata (userId, clubId, licenseTypeId)
**And** I am redirected to the Stripe-hosted checkout page — no card data touches our servers (NFR11, PCI compliance by delegation)

**Given** I complete payment on Stripe's page
**When** Stripe redirects me back to the success URL
**Then** I see a success page: "Paiement en cours de confirmation"
**And** a Payment record exists with status = PENDING and stripeSessionId

**Given** Stripe sends a checkout.session.completed webhook
**When** the API receives the event
**Then** the webhook handler verifies the Stripe signature for authenticity
**And** the Payment record is updated to status = COMPLETED with payment date
**And** the member's license status for that season is updated to "Paid"
**And** the webhook handler is idempotent — duplicate events do not create duplicate records (NFR25)

**Given** the payment fails on Stripe
**When** Stripe sends a checkout.session.expired or payment_intent.payment_failed webhook
**Then** the Payment record is updated to status = FAILED
**And** the member sees their license as "Unpaid" with an option to retry

**Given** an admin issues a refund via Stripe dashboard
**When** Stripe sends a charge.refunded webhook
**Then** the Payment record is updated to status = REFUNDED
**And** the member's license status reverts to "Unpaid"

**Given** I cancel on the Stripe checkout page
**When** I am redirected back to the cancel URL
**Then** I return to the license list with no payment created or a PENDING record that will expire

### Story 9.3: HelloAsso Payment Integration

As a club member,
I want to pay for a license via HelloAsso,
So that I can pay my club fees through the standard French association payment platform.

**Acceptance Criteria:**

**Given** I am a member and a license type is configured with HelloAsso as payment provider
**When** I tap "Pay" on a license type
**Then** the frontend calls the API to initiate a HelloAsso checkout
**And** the API creates a HelloAsso payment form/checkout URL via the HelloAsso API with: amount, label, return URL, metadata (userId, clubId, licenseTypeId)
**And** I am redirected to the HelloAsso-hosted payment page

**Given** I complete payment on HelloAsso's page
**When** HelloAsso redirects me back to the return URL
**Then** I see a confirmation page: "Paiement en cours de confirmation"
**And** a Payment record exists with status = PENDING and helloAssoPaymentId

**Given** HelloAsso sends a payment notification (webhook or API callback)
**When** the API receives the notification
**Then** the webhook handler verifies the notification authenticity
**And** the Payment record is updated to status = COMPLETED with payment date
**And** the member's license status for that season is updated to "Paid"
**And** the handler is idempotent — duplicate notifications do not create duplicate records

**Given** the payment fails or is cancelled on HelloAsso
**When** the notification indicates failure
**Then** the Payment record is updated to status = FAILED
**And** the member sees their license as "Unpaid" with an option to retry

**Given** the HelloAsso API is unavailable
**When** the initiation request fails
**Then** an error toast is shown: "Le service HelloAsso est temporairement indisponible — réessayez plus tard"
**And** the Stripe option (if configured) remains available as a fallback

**Given** the club has both Stripe and HelloAsso license types
**When** a member views available licenses
**Then** the payment provider is indicated on each license type (e.g., "Payer par carte" for Stripe, "Payer via HelloAsso" for HelloAsso)

### Story 9.4: License Status & Payment History

As a club admin,
I want to view license status per member per season and a complete payment history,
So that I can track who has paid and manage club finances.

**Acceptance Criteria:**

**Given** I am an admin or owner
**When** I navigate to the license management section
**Then** I see a member-by-season matrix: each row is a member, columns show license types for the current season
**And** each cell shows payment status: green "Payé" badge, orange "En attente" badge, or gray "Non payé"
**And** the payment provider icon (Stripe or HelloAsso) is shown next to paid entries

**Given** I want to filter the license status view
**When** I use the filter controls
**Then** I can filter by: season (dropdown), status ("All" / "Paid" / "Pending" / "Unpaid"), payment provider ("All" / "Stripe" / "HelloAsso")
**And** I can search by member name

**Given** I tap a member's payment status
**When** the detail opens
**Then** I see the payment details: amount, date, provider, transaction ID (Stripe session or HelloAsso payment ID), status

**Given** I navigate to the payment history section
**When** I view the full history
**Then** I see a chronological list of all payments for the club across all seasons
**And** each entry shows: member name, license type, amount, date, status, payment provider
**And** on desktop, this renders as a sortable data table

**Given** I am a regular member
**When** I view my own payment history
**Then** I see only my own payments with: license type, amount, date, status, provider
**And** I cannot see other members' payment information

**Given** the license status view is loading
**When** data is being fetched
**Then** skeleton rows are displayed matching the table layout

---

## Epic 10: Data Privacy & Account Management

Users can request deletion of their account and all associated data, and export their personal data. Full RGPD compliance.

### Story 10.1: Account Data Export

As a user,
I want to request and download an export of all my personal data,
So that I can exercise my RGPD right of access and portability.

**Acceptance Criteria:**

**Given** I am a logged-in user
**When** I navigate to my profile settings and tap "Export my data"
**Then** I see an explanation of what will be exported: profile information, club memberships, dogs, vaccine records, documents metadata, chat messages, payment history

**Given** I confirm the export request
**When** the API processes the request
**Then** the API generates a JSON export containing all my personal data across all clubs:
- User profile (name, email, created date)
- Club memberships (club names, roles, join dates)
- Dogs (names, breeds, birthdates, chip numbers)
- Vaccine records (vaccine names, dates, expiry dates)
- Document metadata (types, upload dates, expiry dates — not the files themselves)
- Chat messages I sent (content, timestamps, channel names)
- Payment history (amounts, dates, statuses, license types)
**And** the export is scoped to MY data only — no other members' data is included
**And** a download link is provided for the JSON file
**And** a success toast confirms: "Vos données sont prêtes à télécharger"

**Given** the export takes time to generate (large data)
**When** processing is in progress
**Then** a loading indicator is shown with: "Préparation de vos données en cours..."
**And** the user can navigate away and return — the download is available when ready

**Given** the export completes
**When** I download the file
**Then** the file is a well-structured JSON document with clear section labels
**And** dates are in ISO 8601 format
**And** no sensitive internal data is leaked (no UUIDs of other users, no club-internal data I shouldn't see)

### Story 10.2: Account Deletion

As a user,
I want to request deletion of my account and all associated data,
So that I can exercise my RGPD right to erasure and leave the platform completely.

**Acceptance Criteria:**

**Given** I am a logged-in user
**When** I navigate to my profile settings and tap "Delete my account"
**Then** a confirmation dialog appears (destructive pattern): "Supprimer votre compte ? Cette action est irréversible. Toutes vos données seront supprimées : profil, chiens, vaccins, documents, messages et historique de paiements."
**And** the dialog has a "Cancel" secondary button and a red "Supprimer définitivement" destructive button

**Given** I am the sole owner of one or more clubs
**When** I attempt to delete my account
**Then** the deletion is blocked with a message: "Vous êtes propriétaire de [club names]. Veuillez transférer la propriété ou supprimer ces clubs avant de supprimer votre compte."
**And** links to each club's settings are provided for ownership transfer or club deletion

**Given** I am not a sole owner of any club and I confirm deletion
**When** the API processes the request
**Then** a full cascade deletion is executed:
- All ClubMember records for my userId are deleted (I leave all clubs)
- All Dogs I own and their VaccineRecords are deleted
- All Documents I uploaded are deleted from PostgreSQL AND their files are deleted from Cloudflare R2
- All ChatMessages I sent are deleted (or anonymized with "Deleted user" placeholder, depending on club preference)
- All Payment records linked to my userId are anonymized (amount and date preserved for club accounting, personal data removed)
- All Consent records are deleted
- My User record is deleted
**And** my JWT and refresh token are invalidated immediately
**And** I am logged out and redirected to the landing page
**And** a final confirmation toast: "Votre compte a été supprimé"

**Given** the deletion is processing
**When** the cascade is running
**Then** a loading indicator is shown: "Suppression de vos données en cours..."
**And** the process completes fully — partial deletion is not acceptable (transaction-wrapped)

**Given** another member tries to view my former profile or messages
**When** my data has been deleted
**Then** my chat messages show "Utilisateur supprimé" as the sender name (if anonymized) or are removed entirely
**And** my dogs no longer appear in the admin vaccine dashboard
**And** no trace of my personal information remains in the system
