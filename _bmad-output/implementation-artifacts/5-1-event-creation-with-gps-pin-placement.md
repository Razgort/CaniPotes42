# Story 5.1: Event Creation with GPS Pin Placement

Status: review

## Story

As a club admin,
I want to create events with a title, description, date/time, and GPS location placed on an interactive map,
So that members always know exactly where and when to meet.

## Acceptance Criteria

1. **Given** I am an admin or owner, **When** I tap "+" or "New Event" from the Events tab, **Then** I see an event creation form with fields: title (required), description (optional), date/time (required), location.

2. **Given** I tap "Set Location" on the form, **When** the map view opens full-screen, **Then** I see an interactive Leaflet/react-leaflet map in edit mode. I can tap any point to drop a GPS pin (two taps max to place), drag the pin to adjust, and the address auto-fills from reverse geocoding if available (or shows coordinates). I confirm the location to return to the form with coordinates saved.

3. **Given** the map fails to load, **When** I see the error state, **Then** a fallback is shown: "Carte indisponible" with manual latitude/longitude input fields. The Navigate button will still work with manually entered coordinates.

4. **Given** I fill in all required fields, **When** I save the event, **Then** the event defaults to DRAFT status. An Event record is created with title, description, dateTime, latitude, longitude, status=DRAFT, clubId. A success toast confirms: "Evenement cree en brouillon". I am navigated to the event detail page showing a "Draft" orange badge.

5. **Given** I am a regular member, **When** I try to access event creation, **Then** the "+" button is not visible. Direct API calls return 403 Forbidden.

## Tasks / Subtasks

### Backend

- [x] Task 1: Create Event API Module (AC: #1, #4, #5)
  - [x] 1.1 Create `libs/api/features/src/lib/event/event.module.ts`
  - [x] 1.2 Create `libs/api/features/src/lib/event/event.service.ts` with `createEvent(userId, clubId, dto)` method
  - [x] 1.3 Create `libs/api/features/src/lib/event/event.controller.ts` with `POST /events` endpoint
  - [x] 1.4 Create `libs/api/features/src/lib/event/dto/create-event.dto.ts` importing shared Zod schema
  - [x] 1.5 Register EventModule in FeaturesModule (`libs/api/features/src/lib/api-features.ts`)
  - [x] 1.6 Add `GET /events/:id` endpoint for event detail (needed for post-create redirect)

- [x] Task 2: Backend Guards & Authorization (AC: #5)
  - [x] 2.1 Apply guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')` on create endpoint
  - [x] 2.2 Apply `@UseGuards(JwtAuthGuard, ClubGuard)` on GET endpoint (all members can read)

- [x] Task 3: Backend Unit Tests (AC: #1-5)
  - [x] 3.1 Create `event.service.spec.ts` — test createEvent, getEventById, clubId scoping
  - [x] 3.2 Create `event.controller.spec.ts` — test POST /events (201, 400, 403), GET /events/:id

### Frontend

- [x] Task 4: Event Form Component (AC: #1, #4)
  - [x] 4.1 Create `libs/frontend/features/src/lib/events/EventCreateForm.tsx` with React Hook Form + Zod validation
  - [x] 4.2 Fields: title (text, required), description (textarea, optional), dateTime (datetime-local, required), location (map picker trigger)
  - [x] 4.3 Form labels above inputs, single column on mobile, 16px min font on inputs
  - [x] 4.4 On submit: POST /events via API client, show success toast "Evenement cree en brouillon", navigate to `/events/:id`

- [x] Task 5: Map Pin Picker Component (AC: #2, #3)
  - [x] 5.1 Added `MapWidgetEditor` to `libs/frontend/ui/src/lib/MapWidget.tsx` — Leaflet interactive map
  - [x] 5.2 Edit mode: tap map to drop pin, drag pin to adjust
  - [x] 5.3 Reverse geocoding: fetch address from coordinates (Nominatim, debounced 500ms)
  - [x] 5.4 Error state: "Carte indisponible" fallback with manual lat/lng inputs
  - [x] 5.5 View mode: static map with pin (already existed)

- [x] Task 6: Events Hook & API Integration (AC: #1, #4)
  - [x] 6.1 Added `useCreateEvent()` to `libs/frontend/features/src/lib/events/hooks/useEventMutations.ts`
  - [x] 6.2 `useCreateEvent()` mutation — POST /events, invalidate ['events', clubId] cache on success

- [x] Task 7: Route & Navigation Integration (AC: #1, #5)
  - [x] 7.1 Updated EventFeed to show "+" FAB for admin/owner role (hidden for members)
  - [x] 7.2 Added route `/events/new` → EventCreateForm (lazy loaded, ProtectedRoute)
  - [x] 7.3 Route `/events/:id` → EventDetail already existed

- [x] Task 8: Frontend Tests (AC: #1-5)
  - [x] 8.1 EventCreateForm.test.tsx — 9 tests: form rendering, validation, submission, navigation, pending state, map interaction, manual fallback
  - [x] 8.2 MapWidget.test.tsx — already existed from previous stories

### Schema Updates

- [x] Task 9: Zod Schema Refinements (AC: #1)
  - [x] 9.1 `event.schema.ts` already has description optional and locationName optional (done in prior stories)
  - [x] 9.2 Prisma Event model has `locationName` field (verified)

## Dev Notes

### Architecture Compliance

**Guard chain (CRITICAL):** Every event endpoint must use `JwtAuthGuard → ClubGuard` minimum. Create endpoint adds `RolesGuard` + `@Roles('ADMIN', 'OWNER')`. Never skip ClubGuard on tenant-scoped routes.

**Multi-tenant isolation:** All Prisma queries MUST include `clubId` filter. ClubGuard sets `request.clubId` from JWT `activeClubId`. Service layer receives clubId as parameter — never from request body.

**Module pattern:** Follow existing `AuthModule`, `ClubModule`, `MemberModule` patterns exactly:
```
event/
  event.module.ts
  event.controller.ts
  event.service.ts
  dto/create-event.dto.ts
  event.controller.spec.ts
  event.service.spec.ts
```

### API Contract

**POST /events**
- Guards: `JwtAuthGuard, ClubGuard, RolesGuard` with `@Roles('ADMIN', 'OWNER')`
- Body: `{ title, description?, dateTime, latitude, longitude, locationName? }`
- Response: `{ data: Event }` (201)
- Errors: 400 (validation), 401 (unauthenticated), 403 (not admin/owner)

**GET /events/:id**
- Guards: `JwtAuthGuard, ClubGuard`
- Response: `{ data: Event }` (200)
- Errors: 404 (not found or wrong club)

### Frontend Patterns

**React Hook Form + Zod:** Import `createEventSchema` from `@canipotes42/shared-types`. Use `zodResolver`. Validate on blur.

**TanStack Query keys:**
- `['events', clubId]` — event list
- `['events', clubId, eventId]` — single event detail

**Loading states:** Skeleton placeholders, never spinners. Optimistic updates not needed for create (redirect on success).

**Toast messages:** French strings hardcoded. Success: green, auto-dismiss 3s. Error: red, persist until dismissed.

**Role check for FAB:** Read `role` from AuthContext. Only show "+" button if `role === 'ADMIN' || role === 'OWNER'`.

**Code splitting:** New routes must use `React.lazy()` + `Suspense`. Import pattern:
```tsx
const EventForm = lazy(() => import('./events/EventForm'));
```

### Map Implementation (Leaflet/react-leaflet)

**Dependencies to install:**
- `leaflet` + `react-leaflet` + `@types/leaflet`
- Leaflet CSS must be imported (from `leaflet/dist/leaflet.css`)

**MapWidget modes:**
- **Edit mode** (admin creating event): Interactive. Tap to place pin, drag to reposition, confirm button returns `{lat, lng, locationName?}` to parent form.
- **View mode** (event detail): Static display. Pin shows location. `aria-hidden` map, coordinates as text for screen readers.

**Reverse geocoding:** Use Nominatim (OpenStreetMap, free, no API key). `GET https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json`. Debounce 500ms after pin move. Populate `locationName` field. If fails, show coordinates as fallback.

**Map error fallback:** If Leaflet tile loading fails or library errors, show "Carte indisponible" with two manual number inputs for lat/lng. NavigateButton still works with manually entered coordinates.

**Touch/click targets:** Pin marker must be min 44x44px touch target. Confirm button full-width on mobile.

**Tile provider:** OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). Free, no API key.

### Existing Code to Reuse

- **Zod schema:** `libs/shared/types/src/lib/schemas/event.schema.ts` — already has `createEventSchema` and `updateEventSchema`. FIX: `description` has `.min(1)` making it required; must change to `.optional()` or `.min(0)`.
- **Enums:** `EventStatus.DRAFT`, `EventStatus.PUBLISHED` in `libs/shared/types/src/lib/enums.ts`
- **Prisma Event model:** Already defined with all fields (id, clubId, title, description, date, latitude, longitude, locationName, status, createdById)
- **API client:** `libs/frontend/data-access/src/lib/api-client.ts` — use for all API calls
- **AuthContext:** `libs/frontend/data-access/src/lib/AuthContext.tsx` — `role`, `activeClub`, `accessToken`
- **Toast:** Already in UI lib (`libs/frontend/ui/src/lib/Toast.tsx`)
- **Skeleton:** Already in UI lib (`libs/frontend/ui/src/lib/Skeleton.tsx`)
- **AppShell:** Already implemented with BottomTabBar, sidebar nav, ClubSwitcher
- **ProtectedRoute:** `libs/frontend/features/src/lib/auth/ProtectedRoute.test.tsx` — already exists
- **EventsPage placeholder:** `libs/frontend/features/src/lib/pages/EventsPage.tsx` — replace content

### DO NOT

- Do NOT create a new `QueryClient` — one already exists in the app root
- Do NOT create custom fetch wrappers — use the existing `api-client.ts`
- Do NOT put business logic in controllers — delegate to service
- Do NOT call Prisma directly from controllers
- Do NOT use numeric IDs — UUIDs only (`@default(uuid())`)
- Do NOT skip `clubId` in any Prisma query — tenant isolation is critical
- Do NOT use `@nestjs/mapped-types` for DTOs — use Zod schemas from shared/types
- Do NOT create `__tests__` directories — co-locate tests with source
- Do NOT use spinners — use skeleton placeholders per UX spec
- Do NOT import pages synchronously — use `React.lazy()`

### Project Structure Notes

All paths align with architecture specification:
- Backend: `libs/api/features/src/lib/event/` (new module)
- Frontend features: `libs/frontend/features/src/lib/events/` (new directory)
- Frontend UI: `libs/frontend/ui/src/lib/MapWidget.tsx` (new component)
- Shared schemas: `libs/shared/types/src/lib/schemas/event.schema.ts` (existing, needs update)
- Routes: `apps/frontend/src/app/app.tsx` already delegates to features.tsx which has route definitions

### Previous Story Intelligence

From Story 4.4 (Club Switcher):
- Query cache must be invalidated per club — query keys use `['entity', clubId]` convention
- Guard pattern for cross-club endpoints: `JwtAuthGuard` only (no ClubGuard). But event endpoints ARE club-scoped, so use full guard chain.
- All existing API modules follow the same NestJS module pattern: Module → Controller → Service → DTO
- Existing tests use vitest with `vi.fn()` for mocking PrismaService
- AppShell, BottomTabBar, and routing are fully operational — Events tab already wired to `/events` route

### Git Intelligence

Recent commits show:
- Build deployed to Vercel (frontend) + Render (API)
- Stories 1.x-4.x implemented across full stack
- Pattern established: feature branches per story, review before merge

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Event Management FR27-FR35, API Patterns, Guard Chain, Multi-Tenant Model]
- [Source: _bmad-output/planning-artifacts/prd.md — FR27-FR30, RBAC Matrix, NFR1-5, NFR18-22]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 2 (Create Event), MapWidget spec, NavigateButton spec, Form Patterns]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Event model, EventParticipation model]
- [Source: libs/shared/types/src/lib/schemas/event.schema.ts — createEventSchema, updateEventSchema]
- [Source: libs/api/features/src/lib/auth/ — Guard chain pattern, module structure]
- [Source: _bmad-output/implementation-artifacts/4-4-club-switcher-multi-club-navigation.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Backend was fully implemented by prior stories (5.2-5.5), including full CRUD, guards, and tests (46 passing)
- Created `EventCreateForm.tsx` — dedicated create form with React Hook Form + Zod, map picker, manual fallback
- Added `MapWidgetEditor` to `MapWidget.tsx` — interactive Leaflet map with tap-to-place pin, drag to adjust, Nominatim reverse geocoding (debounced 500ms)
- Added `useCreateEvent()` hook in `useEventMutations.ts` — POST /events mutation with cache invalidation and French toast messages
- Added `/events/new` route in `features.tsx` with lazy loading and ProtectedRoute
- Added FAB "+" button in `EventFeed.tsx` for ADMIN/OWNER roles, plus wired empty-state button to `/events/new`
- Form uses relaxed dateTime validation (accepts datetime-local format, converts to ISO on submit)
- Manual fallback mode: toggleable "Saisie manuelle" link shows lat/lng number inputs when map unavailable
- All 9 EventCreateForm tests pass, all 46 backend event tests pass
- Pre-existing failures: 5 ChatChannel tests (unrelated to this story)

### Change Log

- 2026-03-22: Story 5.1 implementation completed — event creation flow with GPS pin placement

### File List

- libs/frontend/features/src/lib/events/EventCreateForm.tsx (new)
- libs/frontend/features/src/lib/events/EventCreateForm.test.tsx (new)
- libs/frontend/features/src/lib/events/hooks/useEventMutations.ts (modified — added useCreateEvent)
- libs/frontend/features/src/lib/events/EventFeed.tsx (modified — added FAB button + navigation)
- libs/frontend/features/src/lib/features.tsx (modified — added /events/new route)
- libs/frontend/ui/src/lib/MapWidget.tsx (modified — added MapWidgetEditor)
- libs/frontend/ui/src/index.ts (modified — exported MapWidgetEditor)
- libs/api/features/src/lib/event/event.service.spec.ts (modified — added createEvent tests, fixed findOne mocks)
- libs/api/features/src/lib/event/event.controller.spec.ts (modified — added create tests)
