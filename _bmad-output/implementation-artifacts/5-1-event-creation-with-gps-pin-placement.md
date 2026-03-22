# Story 5.1: Event Creation with GPS Pin Placement

Status: ready-for-dev

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

- [ ] Task 1: Create Event API Module (AC: #1, #4, #5)
  - [ ] 1.1 Create `libs/api/features/src/lib/event/event.module.ts`
  - [ ] 1.2 Create `libs/api/features/src/lib/event/event.service.ts` with `createEvent(userId, clubId, dto)` method
  - [ ] 1.3 Create `libs/api/features/src/lib/event/event.controller.ts` with `POST /events` endpoint
  - [ ] 1.4 Create `libs/api/features/src/lib/event/dto/create-event.dto.ts` importing shared Zod schema
  - [ ] 1.5 Register EventModule in FeaturesModule (`libs/api/features/src/lib/api-features.ts`)
  - [ ] 1.6 Add `GET /events/:id` endpoint for event detail (needed for post-create redirect)

- [ ] Task 2: Backend Guards & Authorization (AC: #5)
  - [ ] 2.1 Apply guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')` on create endpoint
  - [ ] 2.2 Apply `@UseGuards(JwtAuthGuard, ClubGuard)` on GET endpoint (all members can read)

- [ ] Task 3: Backend Unit Tests (AC: #1-5)
  - [ ] 3.1 Create `event.service.spec.ts` — test createEvent, getEventById, clubId scoping
  - [ ] 3.2 Create `event.controller.spec.ts` — test POST /events (201, 400, 403), GET /events/:id

### Frontend

- [ ] Task 4: Event Form Component (AC: #1, #4)
  - [ ] 4.1 Create `libs/frontend/features/src/lib/events/EventForm.tsx` with React Hook Form + Zod validation
  - [ ] 4.2 Fields: title (text, required), description (textarea, optional), dateTime (datetime-local, required), location (map picker trigger)
  - [ ] 4.3 Form labels above inputs, single column on mobile, 16px min font on inputs
  - [ ] 4.4 On submit: POST /events via API client, show success toast "Evenement cree en brouillon", navigate to `/events/:id`

- [ ] Task 5: Map Pin Picker Component (AC: #2, #3)
  - [ ] 5.1 Create `libs/frontend/ui/src/lib/MapWidget.tsx` — Leaflet/react-leaflet interactive map
  - [ ] 5.2 Edit mode: tap map to drop pin, drag pin to adjust, confirm button
  - [ ] 5.3 Reverse geocoding: fetch address from coordinates (Nominatim or similar free service)
  - [ ] 5.4 Error state: "Carte indisponible" fallback with manual lat/lng inputs
  - [ ] 5.5 View mode: static map with pin (for future event detail page)

- [ ] Task 6: Events Hook & API Integration (AC: #1, #4)
  - [ ] 6.1 Create `libs/frontend/features/src/lib/events/hooks/useEvents.ts` with TanStack Query mutations
  - [ ] 6.2 `useCreateEvent()` mutation — POST /events, invalidate ['events', clubId] cache on success

- [ ] Task 7: Route & Navigation Integration (AC: #1, #5)
  - [ ] 7.1 Update EventsPage to show "+" FAB for admin/owner role (hidden for members)
  - [ ] 7.2 Add route `/events/new` → EventForm (lazy loaded, ProtectedRoute)
  - [ ] 7.3 Add route `/events/:id` → EventDetail placeholder (for post-create redirect)

- [ ] Task 8: Frontend Tests (AC: #1-5)
  - [ ] 8.1 EventForm.test.tsx — form validation, submission, error states
  - [ ] 8.2 MapWidget.test.tsx — pin placement, fallback state, coordinate output

### Schema Updates

- [ ] Task 9: Zod Schema Refinements (AC: #1)
  - [ ] 9.1 Update `event.schema.ts`: make `description` optional (currently required with `.min(1)`), add `locationName` optional field
  - [ ] 9.2 Verify Prisma Event model has `locationName` field (it does per schema)

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

### Debug Log References

### Completion Notes List

### File List
