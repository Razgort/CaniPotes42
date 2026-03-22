# Story 5.5: Draft/Publish Workflow & Event Management

Status: ready-for-dev

## Story

As a club admin,
I want to manage event visibility with draft/publish toggling, edit events, and delete them,
so that I can prepare events properly before members see them.

## Acceptance Criteria

1. **Publish a Draft Event**
   - **Given** I am an admin or owner viewing a draft event detail page
   - **When** I tap "Publier" (Publish)
   - **Then** the event status changes from `DRAFT` to `PUBLISHED` in one tap
   - **And** the event becomes immediately visible to all members in the feed
   - **And** the orange "Brouillon" badge is removed from the event
   - **And** a success toast appears: "Événement publié"

2. **Unpublish a Published Event**
   - **Given** I am an admin or owner viewing a published event detail page
   - **When** I tap "Dépublier" (Unpublish)
   - **Then** the event status reverts to `DRAFT`
   - **And** the event is immediately hidden from members' feeds (returns 404 to non-admins)
   - **And** the orange "Brouillon" badge reappears
   - **And** a success toast appears: "Événement dépublié"
   - **And** this is a reversible action — no confirmation dialog

3. **Edit an Event**
   - **Given** I am an admin or owner
   - **When** I tap "Modifier" on any event (draft or published)
   - **Then** the event form opens pre-populated with current data: title, description, date/time, GPS pin on map
   - **And** I can modify any field including repositioning the GPS pin on the map
   - **And** saving calls `PATCH /events/:eventId` and shows: "Événement mis à jour"
   - **And** the event status is NOT changed by editing (draft stays draft, published stays published)

4. **Delete an Event**
   - **Given** I am an admin or owner
   - **When** I tap "Supprimer" on an event
   - **Then** a confirmation dialog appears: "Supprimer cet événement ? Cette action est irréversible."
   - **And** on confirmation, the Event and all related `EventParticipation` records are deleted via cascade
   - **And** a success toast confirms: "Événement supprimé"
   - **And** I am redirected to the event feed

5. **Member Visibility Rules**
   - **Given** I am a regular member
   - **When** I view the event feed or try to access a draft event by direct URL
   - **Then** draft events are completely invisible in the feed
   - **And** a direct URL to a draft event returns 404 (not 403 — do not reveal existence)
   - **And** no edit, delete, publish/unpublish controls are ever visible to members

6. **Admin Visibility Rules**
   - **Given** I am an admin or owner
   - **When** I view the event feed
   - **Then** both draft and published events are visible
   - **And** draft events have an orange "Brouillon" badge
   - **And** filter toggle chips ("Tous" / "Publiés" / "Brouillons") appear for admins

## Tasks / Subtasks

### Backend

- [ ] **Task 1: Create EventModule** (AC: all)
  - [ ] Create `libs/api/features/src/lib/event/event.module.ts`
  - [ ] Create `libs/api/features/src/lib/event/event.controller.ts`
  - [ ] Create `libs/api/features/src/lib/event/event.service.ts`
  - [ ] Register `EventModule` in `libs/api/features/src/lib/api-features.ts` (add to `@Module({ imports: [..., EventModule] })`)
  - [ ] Import `PrismaService` from `@org/api-core` in EventModule

- [ ] **Task 2: PATCH /events/:eventId/status — Publish/Unpublish** (AC: #1, #2)
  - [ ] Add `PATCH /events/:eventId/status` endpoint in EventController
  - [ ] Body schema: `eventStatusSchema = z.object({ status: z.nativeEnum(EventStatus) })` — add to `libs/shared/types/src/lib/schemas/event.schema.ts`
  - [ ] Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')`
  - [ ] Service logic:
    - Query `Event` where `id = eventId AND clubId = request.clubId` (tenant-scoped)
    - If not found → throw `NotFoundException` (same response for draft accessed by member)
    - Update `status` field only — do NOT touch other fields
    - Return updated event wrapped in `{ data: mappedEvent }`
  - [ ] Map Prisma Event to response DTO (exclude internal fields if any)

- [ ] **Task 3: PATCH /events/:eventId — Edit Event** (AC: #3)
  - [ ] Add `PATCH /events/:eventId` endpoint in EventController
  - [ ] Use existing `updateEventSchema` from `libs/shared/types/src/lib/schemas/event.schema.ts` (already partial)
  - [ ] Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')`
  - [ ] Service logic:
    - Scope by `clubId` — query `Event` where `id = eventId AND clubId = request.clubId`
    - If not found → throw `NotFoundException`
    - Update only provided fields (Prisma partial update) — `status` field is NOT in `updateEventSchema` (status changed via `/status` endpoint only)
    - Return updated event in `{ data: mappedEvent }`

- [ ] **Task 4: DELETE /events/:eventId — Delete Event** (AC: #4)
  - [ ] Add `DELETE /events/:eventId` endpoint in EventController
  - [ ] Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')`
  - [ ] Service logic:
    - Scope by `clubId` — query `Event` where `id = eventId AND clubId = request.clubId`
    - If not found → throw `NotFoundException`
    - Delete event — Prisma cascade deletes all `EventParticipation` records (schema: `onDelete: Cascade`)
    - Return `{ data: { id: eventId } }` (deleted id confirmation)

- [ ] **Task 5: GET /events — Event Feed with visibility rules** (AC: #5, #6)
  - [ ] Add `GET /events` endpoint in EventController
  - [ ] Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard)` (all members can call this — filtering by role)
  - [ ] Query parameters: `status?: 'DRAFT' | 'PUBLISHED' | undefined`, `page?: number`, `pageSize?: number`
  - [ ] Service logic:
    - Extract `role` from request (injected by ClubGuard — available as `request.clubRole`)
    - If role is `MEMBER`: add `WHERE status = 'PUBLISHED'` always (ignore `status` query param)
    - If role is `ADMIN` or `OWNER`: apply `status` filter if provided, else return all
    - Always scope by `clubId`
    - Order by `date ASC` (chronological, upcoming first)
    - Return paginated: `{ data: [...events], meta: { total, page, pageSize } }`

- [ ] **Task 6: GET /events/:eventId — Event Detail with visibility** (AC: #5)
  - [ ] Add `GET /events/:eventId` endpoint in EventController
  - [ ] Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard)` (all members can call)
  - [ ] Service logic:
    - Query `Event` where `id = eventId AND clubId = request.clubId`
    - If not found → throw `NotFoundException`
    - If event is `DRAFT` AND role is `MEMBER` → throw `NotFoundException` (not 403 — do not reveal existence)
    - Return `{ data: mappedEvent }`

- [ ] **Task 7: Backend tests** (AC: all)
  - [ ] Create `libs/api/features/src/lib/event/event.service.spec.ts`:
    - Publish: DRAFT → PUBLISHED, success response
    - Unpublish: PUBLISHED → DRAFT, success response
    - Publish: non-existent event → NotFoundException
    - Publish: wrong clubId → NotFoundException (tenant isolation)
    - Edit: updates provided fields, status unchanged
    - Edit: non-existent → NotFoundException
    - Delete: event + participations cascade deleted
    - Delete: non-existent → NotFoundException
    - List (MEMBER): only PUBLISHED events returned
    - List (ADMIN): DRAFT + PUBLISHED returned
    - Detail (MEMBER + DRAFT event): NotFoundException
    - Detail (ADMIN + DRAFT event): returns event
  - [ ] Create `libs/api/features/src/lib/event/event.controller.spec.ts`:
    - Role guard: MEMBER calling PATCH /status → 403
    - Role guard: MEMBER calling DELETE → 403
    - Valid ADMIN calls return expected structure

### Frontend

- [ ] **Task 8: Event Zod schema additions** (AC: #1, #2)
  - [ ] Add `eventStatusSchema` to `libs/shared/types/src/lib/schemas/event.schema.ts`:
    ```typescript
    export const eventStatusSchema = z.object({
      status: z.nativeEnum(EventStatus),
    });
    export type EventStatusUpdate = z.infer<typeof eventStatusSchema>;
    ```
  - [ ] Export from `libs/shared/types/src/index.ts`

- [ ] **Task 9: API client — event mutations** (AC: #1, #2, #3, #4)
  - [ ] Add event API functions to `libs/frontend/data-access/src/lib/api-client.ts`:
    ```typescript
    // Publish/Unpublish
    patchEventStatus(eventId: string, status: EventStatus): Promise<Event>
    // Edit
    patchEvent(eventId: string, data: UpdateEvent): Promise<Event>
    // Delete
    deleteEvent(eventId: string): Promise<{ id: string }>
    // List
    getEvents(params?: { status?: EventStatus; page?: number; pageSize?: number }): Promise<PaginatedEvents>
    // Detail
    getEvent(eventId: string): Promise<Event>
    ```
  - [ ] All calls include `Authorization: Bearer {accessToken}` header (via existing `fetchApi` utility)
  - [ ] All calls include `x-club-id: {activeClubId}` header OR use the JWT-embedded clubId (check existing pattern in `api-client.ts`)

- [ ] **Task 10: TanStack Query hooks** (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Create `libs/frontend/features/src/lib/events/hooks/useEvents.ts`:
    ```typescript
    // Query keys:
    // ['events', clubId]                        — list all
    // ['events', clubId, { status }]            — filtered list
    // ['events', clubId, eventId]               — single event

    export function useEvents(params?: { status?: EventStatus })
    export function useEvent(eventId: string)
    export function usePublishEvent()    // useMutation → PATCH /events/:id/status PUBLISHED
    export function useUnpublishEvent()  // useMutation → PATCH /events/:id/status DRAFT
    export function useUpdateEvent()     // useMutation → PATCH /events/:id
    export function useDeleteEvent()     // useMutation → DELETE /events/:id
    ```
  - [ ] On mutation success: `queryClient.invalidateQueries(['events', clubId])`
  - [ ] Optimistic update on publish/unpublish: update cached event status immediately, revert on error

- [ ] **Task 11: EventAdminActions component** (AC: #1, #2, #3, #4, #5)
  - [ ] Create `libs/frontend/features/src/lib/events/components/EventAdminActions.tsx`
  - [ ] Props: `{ event: Event; onPublish; onUnpublish; onEdit; onDelete }`
  - [ ] Render only if `role === 'ADMIN' || role === 'OWNER'` (from `useAuth()` context)
  - [ ] Publish button (coral/accent): show when `event.status === 'DRAFT'` — label "Publier"
  - [ ] Unpublish button (secondary): show when `event.status === 'PUBLISHED'` — label "Dépublier"
  - [ ] Edit button (ghost): always visible to admin — label "Modifier" + Pencil icon
  - [ ] Delete button (destructive/red): always visible to admin — label "Supprimer" + Trash icon
  - [ ] Delete triggers confirmation dialog before calling `onDelete`

- [ ] **Task 12: Delete confirmation dialog** (AC: #4)
  - [ ] Use shadcn/ui `AlertDialog` from `libs/frontend/ui/`
  - [ ] Title: "Supprimer cet événement ?"
  - [ ] Description: "Cette action est irréversible. L'événement et toutes les participations associées seront supprimés."
  - [ ] Cancel button: "Annuler" (secondary)
  - [ ] Confirm button: "Supprimer" (destructive red)
  - [ ] On confirm: call `deleteEvent()` mutation → navigate to `/events` on success

- [ ] **Task 13: EventDetail page — integrate admin actions** (AC: #1, #2, #3, #4, #5)
  - [ ] Create or update `libs/frontend/features/src/lib/events/EventDetail.tsx`
  - [ ] Fetch event via `useEvent(eventId)` — shows NotFoundException as "Événement introuvable"
  - [ ] Render `<EventAdminActions />` conditionally (admin/owner only, via role from AuthContext)
  - [ ] Edit navigation: tap "Modifier" → navigate to `/events/:eventId/edit`
  - [ ] Show "Brouillon" badge on draft events (visible to admins only, orange/warning)
  - [ ] Published events: no badge

- [ ] **Task 14: EventForm component (Edit mode)** (AC: #3)
  - [ ] Create `libs/frontend/features/src/lib/events/EventForm.tsx` (shared for create & edit)
  - [ ] Props: `{ mode: 'create' | 'edit'; initialData?: Event; onSubmit }`
  - [ ] Fields: title (required), description (optional), dateTime (required), latitude + longitude (via MapWidget in edit mode)
  - [ ] Use React Hook Form + Zod resolver with `updateEventSchema` (edit mode) or `createEventSchema` (create mode)
  - [ ] Validation: `mode: 'onBlur'` (architecture standard)
  - [ ] Submit calls `useUpdateEvent()` mutation in edit mode
  - [ ] After successful edit: navigate to `/events/:eventId` (detail page)
  - [ ] Note: MapWidget (interactive GPS pin) is a placeholder in this story — coordinates can be text inputs. Full map interaction is in Story 5.1.

- [ ] **Task 15: EventFeed page — admin filter chips** (AC: #6)
  - [ ] Create or update `libs/frontend/features/src/lib/events/EventFeed.tsx`
  - [ ] Show filter chips only for ADMIN/OWNER: "Tous" | "Publiés" | "Brouillons"
  - [ ] Each chip calls `useEvents({ status: filterValue })`
  - [ ] "Tous" = no status filter (default)
  - [ ] "Brouillons" chip has orange/warning color to match badge
  - [ ] Members see no filter chips — always call `useEvents()` (server enforces PUBLISHED-only)

- [ ] **Task 16: Frontend tests** (AC: all)
  - [ ] Create `libs/frontend/features/src/lib/events/EventAdminActions.test.tsx`:
    - Admin sees publish button on draft event
    - Admin sees unpublish button on published event
    - Member sees no admin actions
    - Delete shows confirmation dialog
    - Confirmation cancel does not delete
    - Confirmation confirm calls delete mutation
  - [ ] Test `EventFeed.tsx`:
    - Admin sees filter chips; member does not
    - Filter chips call API with correct status param
  - [ ] Test `EventForm.tsx`:
    - Pre-populates fields in edit mode
    - Submits with correct data on save

## Dev Notes

### ⚠️ Dependency Warning

Story 5.5 implements the **management layer** (publish/unpublish, edit, delete) for events. Stories 5.1–5.4 implement event creation, the feed, event detail map/navigation, and RSVP. **If the EventModule does not yet exist** (i.e., stories 5.1–5.4 have not been implemented), this story must create the full EventModule scaffold including all endpoints above. If the EventModule exists from prior stories, extend it with the missing endpoints.

**Check first:**
```bash
ls libs/api/features/src/lib/event/
ls libs/frontend/features/src/lib/events/
```

### Architecture Compliance

- **Guard chain order (non-negotiable):** `JwtAuthGuard → ClubGuard → RolesGuard`
  - Write endpoints (publish, edit, delete): `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` + `@Roles('ADMIN', 'OWNER')`
  - Read endpoints (list, detail): `@UseGuards(JwtAuthGuard, ClubGuard)` — role-based filtering in service, not guard
- **Tenant isolation:** Every Prisma query for events MUST include `clubId` from `request.clubId` (injected by ClubGuard). Never query without it.
- **Response envelope:** Always return `{ data: ... }` or `{ data: [...], meta: {...} }`. `ResponseWrapperInterceptor` is global — do NOT manually wrap if already configured. Check existing controllers (MemberController) for whether the interceptor is active.
- **Controller → Service → Prisma boundary:** Controllers never call Prisma directly.
- **Draft 404 pattern:** When a member requests a draft event, throw `NotFoundException` (not `ForbiddenException`). This prevents enumeration — attackers can't discover draft event IDs.
- **Zod validation:** Import `updateEventSchema`, `createEventSchema` from `@org/types`. Never define schemas inline in DTOs.
- **Logging:** `private readonly logger = new Logger(EventService.name)` — never `console.log`.

### Critical Implementation Details

1. **Status-only PATCH endpoint**: Use a separate `PATCH /events/:eventId/status` endpoint for publish/unpublish rather than a general `PATCH /events/:eventId`. This prevents accidental status changes during edits and makes intent explicit. The `updateEventSchema` must NOT include `status` as an updatable field.

2. **Prisma cascade delete**: The schema already has `EventParticipation` with `onDelete: Cascade` on the `event` relation. A simple `prisma.event.delete({ where: { id, clubId } })` will cascade-delete all participation records automatically. No manual cleanup needed.

3. **Optimistic update for publish/unpublish**: The UI should update the badge and button state immediately on tap, before the API call completes. Use TanStack Query's `onMutate` / `onError` / `onSettled` for optimistic update + rollback. This matches the UX principle "one tap to value."

4. **Role extraction in service**: ClubGuard injects `request.clubRole` (the member's role in the active club). The EventService receives this via a parameter from the controller — do NOT re-query the database for role in the service.

5. **`date` vs `dateTime` field name**: The Prisma schema uses `date: DateTime` (not `dateTime`). The Zod schema uses `dateTime`. Map carefully between the two: DTO receives `dateTime`, Prisma stores as `date`. Apply this mapping in the service layer.

6. **locationName field**: The Prisma Event model has `locationName: String?`. The `createEventSchema` / `updateEventSchema` should include this optional field. If it's missing, add it to the schemas.

### Existing Code to Reuse

| What | Location | Notes |
|------|----------|-------|
| `JwtAuthGuard` | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Authentication guard |
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Injects `clubId` + `clubRole` into request |
| `RolesGuard` | `libs/api/core/src/lib/guards/roles.guard.ts` | Role-based authorization |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extracts JwtPayload from request |
| `@CurrentClub()` | `libs/api/core/src/lib/decorators/current-club.decorator.ts` | Extracts clubId from request (check if exists) |
| `@Roles()` decorator | `libs/api/core/src/lib/decorators/roles.decorator.ts` | Metadata for RolesGuard |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Use on body/query params |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Singleton Prisma client with pg adapter |
| `updateEventSchema` | `libs/shared/types/src/lib/schemas/event.schema.ts` | Already partial — use for PATCH body |
| `createEventSchema` | `libs/shared/types/src/lib/schemas/event.schema.ts` | For create (Story 5.1) |
| `EventStatus` enum | `libs/shared/types/src/lib/enums.ts` | DRAFT / PUBLISHED |
| `fetchApi` utility | `libs/frontend/data-access/src/lib/api-client.ts` | Base fetch with auth headers |
| `useAuth()` hook | `libs/frontend/data-access/src/lib/AuthContext.tsx` | Provides `{ role, activeClub }` |
| `shadcn/ui AlertDialog` | `libs/frontend/ui/` | Destructive confirmation pattern |
| `shadcn/ui Badge` | `libs/frontend/ui/` | For "Brouillon" badge (variant: warning/amber) |
| `cn()` utility | `libs/frontend/ui/src/lib/ui.tsx` | Tailwind class merging |
| `lucide-react` icons | Already in dependencies | `Pencil`, `Trash2`, `Eye`, `EyeOff` |
| `MemberController` | `libs/api/features/src/lib/member/member.controller.ts` | Reference for guard + pipe usage pattern |

### File Structure (New Files)

```
Backend (create if EventModule doesn't exist from 5.1-5.4):
libs/api/features/src/lib/event/
  event.module.ts
  event.controller.ts          ← GET /events, GET /events/:id, PATCH /:id, PATCH /:id/status, DELETE /:id
  event.service.ts             ← Business logic, Prisma queries, role-based filtering
  event.controller.spec.ts     ← Co-located test
  event.service.spec.ts        ← Co-located test

libs/shared/types/src/lib/schemas/
  event.schema.ts              ← Add eventStatusSchema (file exists, extend it)

Frontend (create if EventModule doesn't exist from 5.1-5.4):
libs/frontend/features/src/lib/events/
  EventFeed.tsx                ← Event list page with filter chips (admin)
  EventDetail.tsx              ← Event detail with admin actions panel
  EventForm.tsx                ← Shared create/edit form
  components/
    EventAdminActions.tsx      ← Publish/Unpublish/Edit/Delete controls (admin only)
  hooks/
    useEvents.ts               ← TanStack Query hooks for all event mutations/queries

Modified:
libs/api/features/src/lib/api-features.ts    ← Add EventModule to imports
libs/shared/types/src/lib/schemas/index.ts   ← Export eventStatusSchema
libs/shared/types/src/index.ts              ← Re-export new types
libs/frontend/data-access/src/lib/api-client.ts  ← Add event API functions
libs/frontend/features/src/lib/features.tsx  ← Wire up /events/:id and /events/:id/edit routes
```

### NestJS Module Pattern

```typescript
// event.module.ts
@Module({
  imports: [CoreModule],          // provides PrismaService, guards, pipes
  controllers: [EventController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}

// event.controller.ts
@Controller('events')
@UseGuards(JwtAuthGuard, ClubGuard)  // applied at class level for all routes
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Request() req, @Query(new ZodValidationPipe(eventQuerySchema)) query)

  @Get(':eventId')
  findOne(@Param('eventId') eventId: string, @Request() req)

  @Patch(':eventId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  update(@Param('eventId') eventId: string, @Body(new ZodValidationPipe(updateEventSchema)) dto, @Request() req)

  @Patch(':eventId/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  updateStatus(@Param('eventId') eventId: string, @Body(new ZodValidationPipe(eventStatusSchema)) dto, @Request() req)

  @Delete(':eventId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  remove(@Param('eventId') eventId: string, @Request() req)
}
```

### Prisma Schema (Reference — Already Exists)

```prisma
// libs/shared/prisma-client/prisma/schema.prisma
model Event {
  id           String      @id @default(uuid())
  clubId       String
  title        String
  description  String?
  date         DateTime              // NOTE: named 'date', not 'dateTime'
  latitude     Float
  longitude    Float
  locationName String?
  status       EventStatus @default(DRAFT)
  createdById  String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  club         Club                 @relation(fields: [clubId], references: [id], onDelete: Cascade)
  createdBy    User                 @relation("EventCreator", fields: [createdById], references: [id])
  participants EventParticipation[]

  @@index([clubId])
}

model EventParticipation {
  id        String              @id @default(uuid())
  eventId   String
  userId    String
  clubId    String
  status    ParticipationStatus
  // ...
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)  // ← Cascade delete!
  @@unique([eventId, userId])
}

enum EventStatus { DRAFT  PUBLISHED }
```

**No migrations needed** — Event and EventParticipation models already exist in the schema.

### TanStack Query Keys

```typescript
// Convention: [entity, clubId, ...params]
['events', clubId]                              // all events (admin) or published (member)
['events', clubId, { status: 'DRAFT' }]         // draft filter
['events', clubId, { status: 'PUBLISHED' }]     // published filter
['events', clubId, eventId]                     // single event detail
```

Invalidate on any mutation: `queryClient.invalidateQueries({ queryKey: ['events', clubId] })`

### UX Decisions

- **Publish/Unpublish** is the hero admin action — use the coral/accent button style for "Publier". "Dépublier" uses secondary style.
- **Draft badge**: amber/orange, text "Brouillon". Use `--warning` color token (`#D97706`). Visible only to admins.
- **Delete** is destructive — always requires `AlertDialog` confirmation. No exceptions.
- **Edit** does NOT change status — admins can safely edit published events without accidentally unpublishing them.
- **No intermediate screens**: Publish/unpublish are single-tap with optimistic update. The action resolves in the background.
- **Member 404 on draft**: From the member's perspective, draft events do not exist. Never show a "you don't have access" message — it would reveal the event exists.
- **Admin filter chips**: "Tous" / "Publiés" / "Brouillons" — chip style (not full buttons), visible only when role is ADMIN or OWNER.

### Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| `PATCH /events/:id` changes status field | Use dedicated `PATCH /events/:id/status` endpoint |
| `ForbiddenException` for member accessing draft | `NotFoundException` — never reveal draft existence |
| Manual `EventParticipation` delete before event delete | Prisma cascade handles it — `prisma.event.delete()` is sufficient |
| Query events without `clubId` WHERE clause | Always scope: `{ where: { id: eventId, clubId: req.clubId } }` |
| Re-query role from DB in EventService | Use `req.clubRole` injected by ClubGuard |
| `console.log` anywhere | `new Logger(EventService.name).log(...)` |
| Inline Zod schema in controller/DTO | Import from `@org/types` → `libs/shared/types` |
| Blocking UI on publish/unpublish | Optimistic update — UI changes instantly, API syncs in background |
| `status` in `updateEventSchema` | Remove if present — status has its own endpoint and schema |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.5 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5 overview, FR27-FR35, cross-story context 5.1-5.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard chain, NestJS module pattern, anti-patterns table]
- [Source: _bmad-output/planning-artifacts/architecture.md — Tenant isolation: clubId scoping rule, ClubGuard]
- [Source: _bmad-output/planning-artifacts/architecture.md — API response format `{ data }` / `{ data, meta }`]
- [Source: _bmad-output/planning-artifacts/architecture.md — TanStack Query keys convention]
- [Source: _bmad-output/planning-artifacts/architecture.md — FR-to-structure mapping: event module paths]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 2: Create Event → Draft → Publish flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — EventCard draft badge, filter chips]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Button styling: coral for Publish, secondary for Unpublish, destructive for Delete]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Modal pattern: AlertDialog for destructive confirmation]
- [Source: _bmad-output/planning-artifacts/prd.md — FR28: draft/published visibility, FR29: edit/delete, FR30: visibility toggle]
- [Source: _bmad-output/planning-artifacts/prd.md — Journey 3: Perrine, event organizer — draft/publish workflow narrative]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Event model (date field name), EventParticipation cascade delete]
- [Source: libs/shared/types/src/lib/schemas/event.schema.ts — Existing createEventSchema, updateEventSchema]
- [Source: libs/shared/types/src/lib/enums.ts — EventStatus enum: DRAFT, PUBLISHED]
- [Source: libs/api/features/src/lib/member/member.controller.ts — Reference for guard + pipe usage pattern]
- [Source: _bmad-output/implementation-artifacts/4-4-club-switcher-multi-club-navigation.md — TanStack Query cache invalidation pattern, guard chain pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
