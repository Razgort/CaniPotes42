# Story 5.2: Event Feed & Date-Grouped List

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a club member,
I want to see upcoming published events in a chronological, date-grouped feed,
So that I can quickly scan what's happening and when.

## Acceptance Criteria

1. **Given** I am a member of the club, **When** I open the app or tap the Events tab, **Then** I land on the event feed (home screen / default tab) **And** published events are displayed as compact EventCard rows in an Information-Dense layout **And** events are sorted chronologically with the next upcoming event at the top.

2. **Given** the event feed has events, **When** I scroll through the feed, **Then** DateGroupHeader dividers separate events by date: "Aujourd'hui", "Demain", "Cette semaine", "Semaine prochaine", or absolute dates (e.g., "Dimanche 23 mars") **And** DateGroupHeaders have `role="heading"` level 3 for screen reader structure **And** each EventCard shows: event type icon, title, date/time, participant count, my RSVP status indicator **And** each EventCard is a tappable link with `aria-label` including event title + date.

3. **Given** I am an admin or owner, **When** I view the event feed, **Then** I see both published AND draft events **And** draft events display an orange "Brouillon" badge **And** I can filter: "Tous" / "Publiés" / "Brouillons" via toggle chips.

4. **Given** the event feed is loading, **When** data is being fetched, **Then** skeleton card placeholders are shown matching the EventCard shape (never a spinner).

5. **Given** no events exist yet, **When** I view the feed as an admin, **Then** an empty state is shown: "Aucun evenement pour le moment" with a "Creer votre premier evenement" CTA. **When** I view the feed as a member, **Then** an empty state is shown: "Les evenements apparaitront ici quand les admins les publieront".

6. **Given** the feed renders on different devices, **When** I view on mobile (<640px), **Then** compact rows are full-width with date grouping. **When** I view on desktop (>1024px), **Then** a 2-column layout is available: event list + map sidebar showing pins for visible events.

7. **Given** the API receives a GET request for events, **Then** events are scoped to the active club via `clubId` from JWT context **And** members see only `PUBLISHED` events **And** admins/owners see both `DRAFT` and `PUBLISHED` **And** the response uses paginated envelope `{ data: [...], meta: { total, page, pageSize } }` **And** the event feed renders within 1s for clubs with up to 100 events/month (NFR5).

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Create event feature module** (AC: #7)
  - [ ] Create `libs/api/features/src/lib/event/event.module.ts`
  - [ ] Create `libs/api/features/src/lib/event/event.controller.ts`
  - [ ] Create `libs/api/features/src/lib/event/event.service.ts`
  - [ ] Create `libs/api/features/src/lib/event/event.controller.spec.ts`
  - [ ] Create `libs/api/features/src/lib/event/event.service.spec.ts`
  - [ ] Register `EventModule` in `FeaturesModule` (`libs/api/features/src/lib/api-features.ts`)

- [ ] **Task 2: Implement event list endpoint** (AC: #1, #3, #7)
  - [ ] `GET /clubs/:clubId/events` — guarded by `JwtAuthGuard`, `ClubGuard`
  - [ ] Query params: `page` (default 1), `pageSize` (default 20), `status` (optional: `DRAFT` | `PUBLISHED`)
  - [ ] Service logic: if user role is `MEMBER`, force filter `status = PUBLISHED`; if `ADMIN`/`OWNER`, return all or filter by `status` param
  - [ ] Order by `date ASC` (next upcoming first), filter `date >= now()` for upcoming events
  - [ ] Include aggregated participant count: `_count: { participants: true }`
  - [ ] Include current user's participation status via a subquery or join on `EventParticipation` where `userId = req.user.id`
  - [ ] Return `{ data: EventDto[], meta: { total, page, pageSize } }`
  - [ ] EventDto shape: `{ id, title, description, date, latitude, longitude, locationName, status, createdById, participantCount, myRsvpStatus: ParticipationStatus | null, createdAt }`
  - [ ] Wrap response in envelope — never return raw Prisma entities

- [ ] **Task 3: Add event list Zod schema** (AC: #7)
  - [ ] Add `eventListQuerySchema` to `libs/shared/types/src/lib/schemas/event.schema.ts`: `{ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20), status: z.nativeEnum(EventStatus).optional() }`
  - [ ] Add `eventResponseSchema` for the DTO shape (for type inference)
  - [ ] Export from `libs/shared/types/src/lib/schemas/index.ts`

### Frontend Tasks

- [ ] **Task 4: Create `useEvents` TanStack Query hook** (AC: #1, #3, #7)
  - [ ] Create `libs/frontend/features/src/lib/events/hooks/useEvents.ts`
  - [ ] Query key: `['events', clubId]` (matches architecture convention)
  - [ ] Fetch via `apiClient.get<{ data: Event[], meta: PaginationMeta }>(`/clubs/${clubId}/events?page=${page}&pageSize=${pageSize}${statusFilter}`)`
  - [ ] Use `useAuth()` to get `activeClub.id` as `clubId`
  - [ ] Return `{ events, meta, isLoading, isFetching, isError, error }`

- [ ] **Task 5: Create EventCard component** (AC: #2, #3)
  - [ ] Create `libs/frontend/features/src/lib/events/components/EventCard.tsx`
  - [ ] Create `libs/frontend/features/src/lib/events/components/EventCard.test.tsx`
  - [ ] Props: `{ event: EventDto }` — renders title, formatted date/time (fr-FR locale via `Intl.DateTimeFormat`), participant count, RSVP status indicator (icon-only inline variant), draft badge (orange "Brouillon" for `DRAFT` status)
  - [ ] Card is a `<Link to={`/events/${event.id}`}>` with `aria-label` = `${event.title} - ${formattedDate}`
  - [ ] Use shadcn Card primitives for structure
  - [ ] Mobile: full-width compact row

- [ ] **Task 6: Create DateGroupHeader component** (AC: #2)
  - [ ] Create `libs/frontend/ui/src/lib/DateGroupHeader.tsx`
  - [ ] Create `libs/frontend/ui/src/lib/DateGroupHeader.test.tsx`
  - [ ] Export from `libs/frontend/ui/src/index.ts`
  - [ ] Props: `{ date: string }` — renders relative labels ("Aujourd'hui", "Demain", "Cette semaine", "Semaine prochaine") or absolute ("Dimanche 23 mars") using `fr-FR` locale
  - [ ] Logic: compare event date to `new Date()` to determine relative bucket
  - [ ] Renders `role="heading"` `aria-level={3}` for screen reader structure
  - [ ] Styling: subtle divider/separator between groups

- [ ] **Task 7: Create EventFeed page component** (AC: #1-6)
  - [ ] Replace placeholder in `libs/frontend/features/src/lib/pages/EventsPage.tsx`
  - [ ] Create `libs/frontend/features/src/lib/events/EventFeed.tsx` as the main feed component
  - [ ] Group events by date bucket (today, tomorrow, this week, next week, absolute dates) using a utility function
  - [ ] Render: DateGroupHeader + EventCard list per group
  - [ ] Admin filter chips: "Tous" / "Publies" / "Brouillons" (only visible for admin/owner role) — use shadcn ToggleGroup or custom chips
  - [ ] Loading state: skeleton cards matching EventCard shape (use existing `SkeletonList` pattern or create `EventCardSkeleton`)
  - [ ] Empty state: role-aware messaging per AC #5
  - [ ] Desktop layout (>1024px): 2-column with map sidebar placeholder (map implementation is Story 5.3 — just render a placeholder div with "Map coming soon" for now)
  - [ ] Use `useAuth()` to check role for admin features

- [ ] **Task 8: Wire EventsPage to EventFeed** (AC: #1)
  - [ ] Update `libs/frontend/features/src/lib/pages/EventsPage.tsx` to import and render `EventFeed`
  - [ ] Ensure lazy loading via existing `React.lazy()` in `features.tsx` still works (default export)

### Testing Tasks

- [ ] **Task 9: Backend tests** (AC: #7)
  - [ ] Unit test `event.service.ts`: verify clubId scoping, role-based filtering (MEMBER sees only PUBLISHED, ADMIN sees all), pagination, participant count aggregation
  - [ ] Unit test `event.controller.ts`: verify guard chain (`JwtAuthGuard`, `ClubGuard`), query param parsing, response envelope

- [ ] **Task 10: Frontend tests** (AC: #1-6)
  - [ ] Test `EventCard`: renders title, date, participant count, draft badge for draft events, aria-label, link destination
  - [ ] Test `DateGroupHeader`: renders relative labels correctly (today, tomorrow, this week), renders absolute for distant dates, has correct ARIA role
  - [ ] Test `EventFeed`: renders skeleton during loading, renders empty state per role, renders grouped events, shows filter chips for admin only

## Dev Notes

### Architecture Compliance

- **Guard chain**: `@UseGuards(JwtAuthGuard, ClubGuard)` on all event endpoints — ClubGuard extracts `clubId` from JWT, injects into request context
- **Service pattern**: Controller -> Service -> Prisma. No direct Prisma calls in controller
- **Response envelope**: Always `{ data, meta }` for list endpoints. Never return raw Prisma entities
- **Zod validation**: Import shared schemas from `libs/shared/types`. Use `ZodValidationPipe` for query param validation
- **Naming**: Endpoint `GET /clubs/:clubId/events` (plural noun, kebab-case). Controller file `event.controller.ts`, service `event.service.ts`
- **Tests co-located**: `*.spec.ts` for NestJS, `*.test.tsx` for React

### Existing Code to Reuse

- **API client**: `libs/frontend/data-access/src/lib/api-client.ts` — use `apiClient.get()` for fetching events
- **Auth context**: `libs/frontend/data-access/src/lib/AuthContext.tsx` — `useAuth()` provides `user`, `activeClub`, `role`
- **Prisma schema**: Event model already exists at `libs/shared/prisma-client/prisma/schema.prisma:130-149` with all needed fields (id, clubId, title, description, date, latitude, longitude, locationName, status, createdById, participants relation)
- **EventParticipation model**: Already exists at schema line 151-166 with `@@unique([eventId, userId])` — use for current user RSVP lookup
- **Enums**: `EventStatus` and `ParticipationStatus` already in `libs/shared/types/src/lib/enums.ts`
- **Event Zod schemas**: `createEventSchema` and `updateEventSchema` already in `libs/shared/types/src/lib/schemas/event.schema.ts` — extend with list query schema
- **SkeletonList**: Already exported from `@org/ui` (used in features.tsx Suspense fallback)
- **Routing**: `/events` route already wired in `features.tsx:24-32` with lazy loading and ProtectedRoute
- **Feature module pattern**: Follow `libs/api/features/src/lib/member/` structure as reference for creating event module

### Date Grouping Logic

Implement a `groupEventsByDate(events: EventDto[])` utility:
- Compare each event's `date` to current date using `Intl.DateTimeFormat('fr-FR')` for locale-aware comparison
- Buckets: "Aujourd'hui" (same day), "Demain" (next day), "Cette semaine" (same ISO week), "Semaine prochaine" (next ISO week), then absolute dates formatted as "Dimanche 23 mars" via `Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })`
- Return `Array<{ label: string; events: EventDto[] }>`
- Place this utility in `libs/frontend/features/src/lib/events/utils/groupEventsByDate.ts`

### TanStack Query Keys

Per architecture convention:
- `['events', clubId]` — list all events for club
- `['events', clubId, eventId]` — single event detail (Story 5.3)
- `['events', clubId, { status: 'DRAFT' }]` — filtered list

### API Response DTO

Do NOT return raw Prisma Event entity. Map to DTO:
```typescript
{
  id: string;
  title: string;
  description: string | null;
  date: string; // ISO 8601
  latitude: number;
  longitude: number;
  locationName: string | null;
  status: EventStatus;
  createdById: string;
  participantCount: number;
  myRsvpStatus: ParticipationStatus | null;
  createdAt: string; // ISO 8601
}
```

### Performance

- NFR5: Event feed must render within 1s for 100 events/month
- Use Prisma `include: { _count: { select: { participants: true } } }` for efficient participant counting
- Paginate server-side (default 20 per page) — don't fetch all events at once
- Frontend: skeleton loading, no spinners

### Desktop Map Sidebar

Story 5.3 handles the full map + navigation. For this story, the desktop 2-column layout should render a placeholder for the map sidebar. This avoids scope creep while establishing the responsive layout grid.

### Project Structure Notes

Files to create:
```
libs/api/features/src/lib/event/
  event.module.ts
  event.controller.ts
  event.service.ts
  event.controller.spec.ts
  event.service.spec.ts

libs/frontend/features/src/lib/events/
  EventFeed.tsx
  components/
    EventCard.tsx
    EventCard.test.tsx
  hooks/
    useEvents.ts
  utils/
    groupEventsByDate.ts
    groupEventsByDate.test.ts

libs/frontend/ui/src/lib/
  DateGroupHeader.tsx
  DateGroupHeader.test.tsx
```

Files to modify:
```
libs/api/features/src/lib/api-features.ts          — register EventModule
libs/shared/types/src/lib/schemas/event.schema.ts   — add eventListQuerySchema, eventResponseSchema
libs/shared/types/src/lib/schemas/index.ts           — export new schemas
libs/frontend/features/src/lib/pages/EventsPage.tsx  — replace placeholder with EventFeed
libs/frontend/ui/src/index.ts                        — export DateGroupHeader
```

### Anti-Patterns to Avoid

- Do NOT query events without `clubId` WHERE clause — tenant data leakage
- Do NOT return raw Prisma entities in API response — always map to DTO with envelope
- Do NOT use `console.log` — use NestJS `Logger` with class context
- Do NOT create `__tests__/` directories — co-locate tests
- Do NOT add inline Zod schemas in DTO files — import from shared types
- Do NOT use spinners for loading — use skeleton placeholders per UX spec
- Do NOT implement full map for desktop sidebar — that's Story 5.3 scope

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2] — acceptance criteria and BDD scenarios
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns] — API response envelope, TanStack Query keys, guard chain
- [Source: _bmad-output/planning-artifacts/architecture.md#Feature Module Pattern] — NestJS module structure, React feature structure
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#EventCard] — component spec: content, states, variants, accessibility
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DateGroupHeader] — component spec: date divider, relative/absolute variants, ARIA
- [Source: libs/shared/prisma-client/prisma/schema.prisma] — Event and EventParticipation models
- [Source: libs/shared/types/src/lib/schemas/event.schema.ts] — existing Zod schemas
- [Source: libs/frontend/data-access/src/lib/api-client.ts] — API client pattern
- [Source: libs/api/features/src/lib/member/] — reference NestJS feature module structure

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
