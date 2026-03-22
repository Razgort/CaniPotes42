# Story 5.3: Event Detail, Map & One-Tap Navigation

Status: ready-for-dev

## Story

As a club member,
I want to view event details with a map and navigate to the meeting point in one tap,
so that I always arrive at the right place without workarounds.

## Acceptance Criteria

1. **Event Detail Page Display**
   - Given I tap an EventCard in the feed
   - When the event detail page loads
   - Then I see: title, description, date/time, and a full-width MapWidget showing the GPS pin with location name
   - And the map is in view mode (static, not editable)
   - And the map is aria-hidden (decorative) with coordinates available as text for screen readers

2. **Navigate Button Visibility & Detection**
   - Given the event has GPS coordinates
   - When I look below the map
   - Then a large coral NavigateButton is visible above the fold (48px height) — the most prominent CTA on the page
   - And the button shows the detected app name: "Naviguer avec Waze" or "Naviguer avec Google Maps"
   - And the button has aria-label: "Ouvrir l'itinéraire vers [location] dans [Waze/Google Maps]"

3. **Waze Navigation**
   - Given I tap the NavigateButton
   - When Waze is installed on my device
   - Then Waze opens immediately with the correct coordinates — no intermediate screen, no loading spinner

4. **Google Maps Fallback**
   - Given I tap the NavigateButton
   - When Waze is not installed but Google Maps is
   - Then Google Maps opens with the correct coordinates

5. **Browser Default Fallback**
   - Given I tap the NavigateButton
   - When neither Waze nor Google Maps is installed
   - Then the browser's default map opens with the coordinates as fallback

6. **Map Loading Error Handling**
   - Given the map fails to load
   - When I see the MapWidget error state
   - Then I see "Carte indisponible" with the coordinates displayed as text
   - And the NavigateButton still works — deep link uses the stored coordinates regardless of map rendering

7. **Tablet Layout**
   - Given the event detail loads on tablet (768px+)
   - When I view the layout
   - Then the map and event info are displayed side by side

8. **Missing Coordinates Handling**
   - Given the event has no coordinates set (showMap=false or lat/lng null)
   - When I view the event detail
   - Then the NavigateButton is disabled with muted styling
   - And no map is shown — just the event text details with location text
   - And a notice: "Pas de point GPS pour cet evenement — le lieu indique ci-dessus fait foi."

## Tasks / Subtasks

### Backend

- [ ] Task 1: Create Event API module (AC: 1, 6, 8)
  - [ ] 1.1 Create `libs/api/features/src/lib/event/event.module.ts` — NestJS module with controller + service
  - [ ] 1.2 Create `libs/api/features/src/lib/event/event.controller.ts` — REST endpoints
  - [ ] 1.3 Create `libs/api/features/src/lib/event/event.service.ts` — Business logic with Prisma
  - [ ] 1.4 Add `GET /events` endpoint — list events for club (published for members, all for admins)
  - [ ] 1.5 Add `GET /events/:eventId` endpoint — single event detail with GPS coords
  - [ ] 1.6 Register EventModule in `libs/api/features/src/lib/api-features.ts`
  - [ ] 1.7 Write co-located unit tests: `event.controller.spec.ts`, `event.service.spec.ts`

### Frontend

- [ ] Task 2: Install and configure react-leaflet (AC: 1, 6)
  - [ ] 2.1 Install `leaflet` and `react-leaflet` packages
  - [ ] 2.2 Install `@types/leaflet` dev dependency
  - [ ] 2.3 Add Leaflet CSS import to app entry point

- [ ] Task 3: Create MapWidget component (AC: 1, 6)
  - [ ] 3.1 Create `libs/frontend/ui/src/lib/MapWidget.tsx` — view-mode map with GPS pin
  - [ ] 3.2 Handle loading state (skeleton placeholder)
  - [ ] 3.3 Handle error state ("Carte indisponible" + coordinates as text)
  - [ ] 3.4 Add `aria-hidden="true"` on map container, text fallback for screen readers
  - [ ] 3.5 Export from `libs/frontend/ui/src/index.ts`
  - [ ] 3.6 Write `MapWidget.test.tsx`

- [ ] Task 4: Create NavigateButton component (AC: 2, 3, 4, 5, 8)
  - [ ] 4.1 Create `libs/frontend/ui/src/lib/NavigateButton.tsx`
  - [ ] 4.2 Implement deep link generation: Waze (`waze://?ll={lat},{lng}&navigate=yes`) → Google Maps (`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`) → browser geo URI (`geo:{lat},{lng}`)
  - [ ] 4.3 Coral accent styling, 48px height, prominent CTA
  - [ ] 4.4 Disabled state when coordinates are null (muted, non-clickable)
  - [ ] 4.5 Accessible `aria-label`: "Ouvrir l'itineraire vers [location] dans [app]"
  - [ ] 4.6 Export from `libs/frontend/ui/src/index.ts`
  - [ ] 4.7 Write `NavigateButton.test.tsx`

- [ ] Task 5: Create EventDetail page component (AC: 1, 2, 6, 7, 8)
  - [ ] 5.1 Create `libs/frontend/features/src/lib/events/EventDetail.tsx`
  - [ ] 5.2 Create `libs/frontend/features/src/lib/events/hooks/useEventDetail.ts` — TanStack Query hook for `GET /events/:eventId`
  - [ ] 5.3 Layout: back button, title (h1), date/time, location text, MapWidget (conditional), NavigateButton, description
  - [ ] 5.4 Skeleton loading state (no spinner)
  - [ ] 5.5 404 / not found state
  - [ ] 5.6 Past event banner: "Evenement passe"
  - [ ] 5.7 Responsive: full-width stacked on mobile, side-by-side on tablet (768px+)
  - [ ] 5.8 Write `EventDetail.test.tsx`

- [ ] Task 6: Add routing for event detail (AC: 1)
  - [ ] 6.1 Add `/events/:eventId` route in `features.tsx` with lazy loading
  - [ ] 6.2 Wrap in ProtectedRoute

## Dev Notes

### Critical: This is the Hero Interaction

The "Tap -> Navigate -> Arrive" flow is the single most critical UX pattern for CaniFed. The NavigateButton must:
- Be visible without scrolling (above the fold)
- Open navigation in ONE tap (zero intermediate screens)
- Work 100% reliably — wrong coordinates = broken user trust
- This is the #1 pain point from the predecessor app (CaniClub Connect)

### Architecture Compliance

**Backend Pattern (MANDATORY):**
```
Controller (@UseGuards(JwtAuthGuard, ClubGuard)) → Service (Prisma queries scoped by clubId) → DTO response
```
- ALL Prisma queries MUST include `WHERE clubId = requestContext.clubId`
- Never return raw Prisma entities — wrap in `{ data: dto }` envelope
- Use `NestJS Logger` with class context — never `console.log`
- Admin-only endpoints add `@Roles('ADMIN', 'OWNER')` + `@UseGuards(RolesGuard)`
- Event list: members see only PUBLISHED; admins see DRAFT + PUBLISHED

**Frontend Pattern (MANDATORY):**
```
TanStack Query hook → API client (auto auth headers) → Render with loading/error/success states
```
- Query keys: `['events', clubId, eventId]` for detail
- Use skeleton placeholders, never spinners
- Lazy load page component via `React.lazy()` + `Suspense`
- API client from `libs/frontend/data-access` handles token refresh automatically

### Deep Link Strategy (Frontend-Only, No Backend)

NavigateButton generates deep links client-side:

1. **Waze:** `waze://?ll={lat},{lng}&navigate=yes`
2. **Google Maps:** `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
3. **Browser fallback:** `geo:{lat},{lng}` (opens default map app)

Detection approach: Try Waze link first. On PWA/mobile web, there's no reliable way to detect installed apps. Use the cascade: attempt Waze deep link with a timeout fallback to Google Maps URL. Since Google Maps URL is a regular HTTPS link, it always works as final fallback.

Practical implementation: Use a simple `<a href>` with the Waze deep link. If Waze is not installed, the link fails silently on most browsers. Provide a secondary "Google Maps" option or use the `geo:` URI scheme which lets the OS choose.

**Recommended approach for MVP:** Show two buttons — "Waze" and "Google Maps" — letting the user choose. This avoids unreliable app detection and follows the UX scenario spec (`event-detail-nav-cta`) which mentions a modal choice pattern.

### Map Library: Leaflet / react-leaflet

**NOT currently installed** — must be added as dependencies:
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

Leaflet CSS must be imported (either in `index.html` or main entry):
```typescript
import 'leaflet/dist/leaflet.css';
```

MapWidget renders a `<MapContainer>` with a `<TileLayer>` (OpenStreetMap tiles) and a `<Marker>` at the event coordinates. View mode only — no dragging, no zoom controls needed for member view.

**Known Leaflet + Vite issue:** Default marker icons break with Vite bundling. Fix by importing marker icon explicitly:
```typescript
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, shadowUrl: markerShadow });
```

### Zod Schemas (Already Exist)

Event schemas are defined in `libs/shared/types/src/lib/schemas/event.schema.ts`:
- `createEventSchema` — validates title (1-200), description, dateTime, latitude (-90 to 90), longitude (-180 to 180), status
- `updateEventSchema` — partial version
- Types: `CreateEvent`, `UpdateEvent`

Do NOT create new schemas — import and reuse these.

### Prisma Schema (Already Exists)

Event and EventParticipation models exist in `libs/shared/prisma-client/prisma/schema.prisma` (lines 130-166). Enums: `EventStatus` (DRAFT/PUBLISHED), `ParticipationStatus` (GOING/MAYBE/NOT_GOING).

Do NOT modify the Prisma schema for this story. Use it as-is.

### File Structure

```
libs/api/features/src/lib/event/
  event.module.ts
  event.controller.ts
  event.service.ts
  event.controller.spec.ts
  event.service.spec.ts

libs/frontend/features/src/lib/events/
  EventDetail.tsx
  EventDetail.test.tsx
  hooks/
    useEventDetail.ts

libs/frontend/ui/src/lib/
  MapWidget.tsx
  MapWidget.test.tsx
  NavigateButton.tsx
  NavigateButton.test.tsx
```

### Existing Code to Reuse

- **API client:** `libs/frontend/data-access/src/lib/api-client.ts` — singleton with `get<T>()`, auto JWT
- **Auth context:** `libs/frontend/data-access/src/lib/AuthContext.tsx` — `useAuth()` for user, activeClub, role
- **Guards:** `libs/api/core/src/lib/guards/` — JwtAuthGuard, ClubGuard, RolesGuard (import, don't recreate)
- **PrismaService:** `libs/api/core/src/lib/prisma/prisma.service.ts`
- **ZodValidationPipe:** `libs/api/core/src/lib/pipes/zod-validation.pipe.ts`
- **Skeleton component:** `libs/frontend/ui/src/lib/Skeleton.tsx`
- **AppShell + BottomTabBar:** Already has Events tab routing to `/events`
- **Club controller pattern:** Follow `libs/api/features/src/lib/club/club.controller.ts` as reference
- **Member controller pattern:** Follow `libs/api/features/src/lib/member/member.controller.ts` as reference

### Anti-Patterns to Avoid

| DO NOT | DO INSTEAD |
|--------|------------|
| Create inline Zod schemas | Import from `libs/shared/types` |
| Call Prisma directly from controller | Go through EventService |
| Query events without `WHERE clubId` | Always scope by clubId from ClubGuard |
| Return raw Prisma entities | Wrap in `{ data: dto }` envelope |
| Use `console.log` | Use NestJS `Logger` with class name |
| Create `__tests__/` directories | Co-locate `*.spec.ts` / `*.test.tsx` with source |
| Use spinners for loading | Use skeleton placeholders |
| Import page components synchronously | Use `React.lazy()` + `Suspense` |
| Add map editing to member view | View mode ONLY — static map with pin |

### Dependency on Stories 5.1 and 5.2

This story creates the event detail view. Stories 5.1 (event creation) and 5.2 (event feed) may not be implemented yet. The backend API endpoints created here (GET /events, GET /events/:eventId) serve both the feed (5.2) and detail (5.3). The dev agent should:
- Build the API module that supports both list and detail queries
- EventDetail page should work independently once event data exists in the database
- For testing, seed test events directly via Prisma in test setup

### Responsive Layout Spec

| Breakpoint | Layout |
|------------|--------|
| Mobile (<768px) | Full-width stacked: map on top, content below, NavigateButton above fold |
| Tablet (768px+) | Side-by-side: map + event info |
| Desktop (>1024px) | Side-by-side with wider content area |

### Accessibility Requirements (WCAG 2.1 AA)

- Map container: `aria-hidden="true"` (decorative), coordinates as text for screen readers
- NavigateButton: `aria-label="Ouvrir l'itineraire vers [location] dans [Waze/Google Maps]"`
- Touch targets: minimum 44x44px
- Back button: accessible keyboard navigation
- Date/time formatting: French locale (`jour mois . HH:mm`)

### Testing Standards

- **Framework:** Vitest 4 with jsdom
- **Backend:** `event.controller.spec.ts` + `event.service.spec.ts` co-located
- **Frontend:** `EventDetail.test.tsx`, `MapWidget.test.tsx`, `NavigateButton.test.tsx` co-located
- **Run via:** `npx nx test <project-name>`
- **Coverage areas:** Component renders, loading/error states, deep link generation, disabled state, responsive behavior

### Project Structure Notes

- Alignment with Nx monorepo structure: features in `libs/`, app shell in `apps/`
- Non-buildable libs — Vite resolves imports directly via tsconfig path aliases
- Event module follows exact same pattern as Club and Member modules

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, Frontend Patterns, Security]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Hero Interaction, MapWidget, NavigateButton]
- [Source: _bmad-output/C-UX-Scenarios/03-julie-race-weekend/03.3-event-detail/03.3-event-detail.md — Event Detail Page Spec]
- [Source: libs/shared/types/src/lib/schemas/event.schema.ts — Zod schemas]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Event model, lines 130-166]
- [Source: libs/api/features/src/lib/club/club.controller.ts — Controller pattern reference]
- [Source: libs/frontend/features/src/lib/features.tsx — Routing pattern reference]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
