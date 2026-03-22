# Story 5.4: RSVP & Participation Tracking

Status: review

## Story

As a club member,
I want to indicate whether I'm going to an event and see who else is going,
so that the group can coordinate attendance.

## Acceptance Criteria

1. **RSVP Options Display**
   - **Given** I am viewing a published event (detail page)
   - **When** I see the RSVP section
   - **Then** three options are displayed: "J'y vais" (Going), "Peut-etre" (Maybe), "Je ne peux pas" (Can't go)
   - **And** the RSVPButton group has `role="radiogroup"` with each option as a radio
   - **And** my current selection (if any) is highlighted: blue filled for Going, muted for others

2. **RSVP Selection with Optimistic Update**
   - **Given** I tap an RSVP option
   - **When** I select "Going"
   - **Then** my selection is updated instantly via optimistic update (no loading spinner)
   - **And** the participant count increments immediately on the event card and detail
   - **And** if the optimistic update fails (network error), the selection reverts and an error toast appears
   - **And** an EventParticipation record is created/updated: userId + eventId + status (GOING/MAYBE/NOT_GOING)

3. **RSVP Toggle Behavior**
   - **Given** I have already RSVP'd
   - **When** I tap a different option
   - **Then** my selection changes instantly (toggle behavior) — no confirmation needed (reversible action)

4. **Participant List ("Who's Going")**
   - **Given** I view the event detail
   - **When** I look at the "Who's going" section
   - **Then** I see a list of members who RSVP'd as Going, with their names and avatars
   - **And** the count of Going / Maybe / Can't go is displayed
   - **And** the list is expandable if there are many participants

5. **Inline RSVP on EventCard**
   - **Given** I view the EventCard in the feed
   - **When** RSVP data exists
   - **Then** the inline RSVPButton variant shows my status as an icon
   - **And** the participant count (Going) is displayed on the card

6. **Past Event Disabled RSVP**
   - **Given** the event is in the past
   - **When** I view the RSVP options
   - **Then** the RSVPButton is disabled — I can no longer change my status
   - **And** the final participation list is still visible

## Tasks / Subtasks

### Backend

- [x] **Task 1: Add Zod schemas for participation** (AC: #2)
  - [x] 1.1 Add `rsvpSchema` to `libs/shared/types/src/lib/schemas/event.schema.ts`:
    ```typescript
    export const rsvpSchema = z.object({
      status: z.nativeEnum(ParticipationStatus),
    });
    export type Rsvp = z.infer<typeof rsvpSchema>;
    ```
  - [x] 1.2 Add `eventParticipantSchema` for response shape:
    ```typescript
    export const eventParticipantSchema = z.object({
      userId: z.string().uuid(),
      firstName: z.string(),
      lastName: z.string(),
      avatarUrl: z.string().nullable(),
      status: z.nativeEnum(ParticipationStatus),
    });
    export type EventParticipant = z.infer<typeof eventParticipantSchema>;
    ```
  - [x] 1.3 Add `eventWithParticipationSchema` extending event response with counts + user RSVP:
    ```typescript
    export const participationCountsSchema = z.object({
      going: z.number(),
      maybe: z.number(),
      notGoing: z.number(),
    });
    export type ParticipationCounts = z.infer<typeof participationCountsSchema>;
    ```
  - [x] 1.4 Re-export new types from `libs/shared/types/src/lib/schemas/index.ts`

- [x] **Task 2: Create Event NestJS module** (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 Create `libs/api/features/src/lib/event/event.module.ts`
  - [x] 2.2 Create `libs/api/features/src/lib/event/event.controller.ts` with endpoints:
    - `PUT /clubs/:clubId/events/:eventId/rsvp` — upsert RSVP (idempotent)
    - `GET /clubs/:clubId/events/:eventId/participants` — list participants with counts
    - `GET /clubs/:clubId/events` — list events (with my RSVP status + going count per event)
    - `GET /clubs/:clubId/events/:eventId` — single event detail (with participants + counts)
  - [x] 2.3 Create `libs/api/features/src/lib/event/event.service.ts` with methods:
    - `upsertRsvp(clubId, eventId, userId, status)` — upsert EventParticipation
    - `getParticipants(clubId, eventId)` — return participant list with user info + counts
    - `findAllEvents(clubId, userId)` — return events with goingCount + myRsvpStatus
    - `findOneEvent(clubId, eventId, userId)` — return event detail with full participation data
  - [x] 2.4 Create `libs/api/features/src/lib/event/dto/rsvp.dto.ts` importing `rsvpSchema`
  - [x] 2.5 Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard)` on all endpoints
  - [x] 2.6 RSVP endpoint must verify event belongs to club AND event is PUBLISHED and not in the past
  - [x] 2.7 Register `EventModule` in `libs/api/features/src/lib/api-features.ts` (add to `FeaturesModule` imports)

- [x] **Task 3: Backend tests** (AC: #2, #6)
  - [x] 3.1 Create `event.controller.spec.ts` — test RSVP upsert, participants list, guard enforcement
  - [x] 3.2 Create `event.service.spec.ts` — test upsert logic, past event rejection, participant aggregation
  - [x] 3.3 Test 403 for non-club-members, 400 for past events, 404 for non-existent events

### Frontend

- [x] **Task 4: RSVPButton UI component** (AC: #1, #3, #6)
  - [x] 4.1 Create `libs/frontend/ui/src/lib/RSVPButton.tsx`
    - Props: `currentStatus`, `onSelect`, `disabled`, `compact` (for inline card variant)
    - Full variant: 3 labeled buttons in a `role="radiogroup"`
    - Compact variant: icon-only for EventCard inline display
    - Disabled state: muted colors, no interaction (past events)
    - Active Going: `bg-blue-600 text-white`; Maybe/Not Going: muted variants
  - [x] 4.2 Create `libs/frontend/ui/src/lib/RSVPButton.test.tsx` — test selection, disabled, a11y roles
  - [x] 4.3 Export from `libs/frontend/ui/src/index.ts`

- [x] **Task 5: Participation hooks (data-access)** (AC: #2, #4, #5)
  - [x] 5.1 Create `libs/frontend/data-access/src/lib/useEventParticipation.ts`:
    - `useRsvpMutation(clubId, eventId)` — `PUT /clubs/:clubId/events/:eventId/rsvp`
      - Optimistic update: update query cache for `['events', clubId, eventId]` and `['events', clubId]`
      - On error: revert cache, show error toast
    - `useEventParticipants(clubId, eventId)` — `GET .../participants`
    - Query keys: `['events', clubId, eventId, 'participants']`
  - [x] 5.2 Create `libs/frontend/data-access/src/lib/useEvents.ts`:
    - `useEvents(clubId)` — `GET /clubs/:clubId/events` (includes goingCount + myRsvpStatus per event)
    - `useEvent(clubId, eventId)` — `GET /clubs/:clubId/events/:eventId`
    - Query keys: `['events', clubId]`, `['events', clubId, eventId]`
  - [x] 5.3 Export hooks from `libs/frontend/data-access/src/index.ts`

- [x] **Task 6: ParticipantList component** (AC: #4)
  - [x] 6.1 Create `libs/frontend/features/src/lib/events/ParticipantList.tsx`
    - Show avatars + names for Going members
    - Display counts: Going / Maybe / Can't go
    - Expandable list (show first 5, "Voir tous" button for rest)
  - [x] 6.2 Test file: `ParticipantList.test.tsx`

- [x] **Task 7: Integrate RSVP into EventDetail page** (AC: #1, #2, #3, #4, #6)
  - [x] 7.1 Create `libs/frontend/features/src/lib/events/EventDetail.tsx` (or update if exists from story 5.3)
    - Below event info and map: RSVPButton (full variant)
    - Below RSVPButton: ParticipantList
    - Check if event date is past → pass `disabled` to RSVPButton
  - [x] 7.2 Wire `useRsvpMutation` to RSVPButton `onSelect`
  - [x] 7.3 Wire `useEventParticipants` to ParticipantList

- [x] **Task 8: Integrate inline RSVP into EventCard** (AC: #5)
  - [x] 8.1 Update EventCard component (from story 5.2) to include:
    - RSVPButton compact variant showing my status icon
    - Going count display
  - [x] 8.2 EventCard receives `myRsvpStatus` and `goingCount` from event list query

### Tests & Polish

- [x] **Task 9: Error handling & edge cases**
  - [x] 9.1 Error toast on RSVP failure with cache revert (French message: "Impossible de mettre a jour votre participation")
  - [x] 9.2 Skeleton loading for participant list
  - [x] 9.3 Empty state when no one has RSVP'd yet: "Soyez le premier a confirmer votre presence !"

## Dev Notes

### Dependencies on Previous Stories

This story depends on stories 5.1 (Event model + creation), 5.2 (EventCard + feed), and 5.3 (EventDetail page). If those story files don't exist yet, the dev agent must implement the minimum Event module infrastructure needed:
- Event model already exists in Prisma schema (lines 130-149)
- EventParticipation model already exists (lines 151-166)
- ParticipationStatus enum already exists: GOING, MAYBE, NOT_GOING
- EventStatus enum already exists: DRAFT, PUBLISHED

### Backend Implementation

**Module location:** `libs/api/features/src/lib/event/`

**Endpoint design:**
| Method | Path | Description | Guards |
|--------|------|-------------|--------|
| PUT | `/clubs/:clubId/events/:eventId/rsvp` | Upsert my RSVP | JwtAuthGuard, ClubGuard |
| GET | `/clubs/:clubId/events/:eventId/participants` | List participants + counts | JwtAuthGuard, ClubGuard |
| GET | `/clubs/:clubId/events` | List events with RSVP summary | JwtAuthGuard, ClubGuard |
| GET | `/clubs/:clubId/events/:eventId` | Event detail with participants | JwtAuthGuard, ClubGuard |

**RSVP upsert uses Prisma `upsert`:**
```typescript
await this.prisma.eventParticipation.upsert({
  where: { eventId_userId: { eventId, userId } },
  create: { eventId, userId, clubId, status },
  update: { status },
});
```

**Participant aggregation:**
```typescript
const counts = await this.prisma.eventParticipation.groupBy({
  by: ['status'],
  where: { eventId, clubId },
  _count: true,
});
```

**Validation rules:**
- Event must belong to `clubId` (tenant isolation)
- Event must be PUBLISHED (no RSVP on drafts)
- Event date must be in the future (no RSVP on past events)
- User must be an ACTIVE member of the club

**Response envelope:** Always `{ data: ... }` or `{ data: [...], meta: { ... } }`

**Register module:** Add `EventModule` to `FeaturesModule` imports in `libs/api/features/src/lib/api-features.ts`

### Frontend Implementation

**RSVPButton location:** `libs/frontend/ui/src/lib/RSVPButton.tsx` (reusable UI component)

**Feature components location:** `libs/frontend/features/src/lib/events/`

**Data-access hooks location:** `libs/frontend/data-access/src/lib/`

**Optimistic update pattern for TanStack Query:**
```typescript
const rsvpMutation = useMutation({
  mutationFn: (status: ParticipationStatus) =>
    apiClient.put(`/clubs/${clubId}/events/${eventId}/rsvp`, { status }),
  onMutate: async (newStatus) => {
    await queryClient.cancelQueries({ queryKey: ['events', clubId, eventId] });
    const previous = queryClient.getQueryData(['events', clubId, eventId]);
    // Optimistically update cached event data
    queryClient.setQueryData(['events', clubId, eventId], (old) => ({
      ...old,
      myRsvpStatus: newStatus,
      // adjust counts accordingly
    }));
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['events', clubId, eventId], context?.previous);
    toast.error("Impossible de mettre a jour votre participation");
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['events', clubId, eventId] });
    queryClient.invalidateQueries({ queryKey: ['events', clubId] });
  },
});
```

**Past event check (frontend):**
```typescript
const isPast = new Date(event.date) < new Date();
```

### Existing Code to Reuse

- **apiClient:** `libs/frontend/data-access/src/lib/api-client.ts` — use `apiClient.put()`, `apiClient.get()`
- **AuthContext:** `libs/frontend/data-access/src/lib/AuthContext.tsx` — get `activeClubId` from auth context
- **Avatar component:** `libs/frontend/ui/src/lib/Avatar.tsx` — already exists for participant list
- **Prisma models:** Event and EventParticipation already defined in schema
- **ParticipationStatus enum:** `libs/shared/types/src/lib/enums.ts` — already exported
- **Guard chain:** JwtAuthGuard + ClubGuard already in `libs/api/core/` — reuse, never recreate

### Anti-Patterns to Avoid

- Do NOT create a separate `participation.module.ts` — RSVP is part of the Event domain
- Do NOT use POST for RSVP — use PUT (idempotent upsert on unique [eventId, userId])
- Do NOT query without `clubId` WHERE clause — tenant isolation is mandatory
- Do NOT add loading spinners for RSVP — use optimistic updates only
- Do NOT allow RSVP on DRAFT events or past events — validate both server-side
- Do NOT import from `@prisma/client` directly — use `PrismaService` from `libs/api/core`
- Do NOT create `__tests__/` directories — co-locate `.spec.ts` and `.test.tsx` with source

### Testing

**Backend tests (Vitest):**
- `event.service.spec.ts`: mock PrismaService, test upsert, past-event rejection, count aggregation
- `event.controller.spec.ts`: mock EventService, test HTTP status codes, guard application

**Frontend tests (Vitest + jsdom):**
- `RSVPButton.test.tsx`: render states, selection callback, disabled state, a11y roles
- `ParticipantList.test.tsx`: render participant avatars, expandable list, count display

### Project Structure Notes

- Follows NestJS module pattern: controller -> service -> Prisma
- Follows React feature pattern: pages -> features -> ui components -> data-access hooks
- All Zod schemas in `libs/shared/types` — never inline
- Tests co-located with source files
- French UI strings used directly (no i18n library at MVP stage)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5 - Story 5.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Event Management Module FR27-FR35]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Guard Chain]
- [Source: libs/shared/prisma-client/prisma/schema.prisma#Event, EventParticipation models]
- [Source: libs/shared/types/src/lib/enums.ts#ParticipationStatus]
- [Source: libs/shared/types/src/lib/schemas/event.schema.ts]
- [Source: libs/frontend/data-access/src/lib/api-client.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
