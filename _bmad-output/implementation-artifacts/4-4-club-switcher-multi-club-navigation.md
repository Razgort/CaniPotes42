# Story 4.4: Club Switcher & Multi-Club Navigation

Status: review

## Story

As a multi-club member,
I want to switch between my clubs instantly via a club switcher with consistent navigation,
so that I can manage my participation in multiple clubs from a single app and login.

## Acceptance Criteria

1. **Club Switcher Opening**
   - **Given** I belong to multiple clubs
   - **When** I tap the club name in the header
   - **Then** the ClubSwitcher opens: a Sheet sliding down on mobile, a dropdown on desktop
   - **And** I see all my clubs listed with: club logo, club name, federation type, and a checkmark on the active club
   - **And** the switcher has `aria-expanded`, `aria-haspopup="listbox"`, active club has `aria-selected`
   - **And** keyboard navigation works: Enter to open, arrows to navigate, Enter to select, Escape to close

2. **Club Context Switch**
   - **Given** I tap a different club in the switcher
   - **When** the context switches
   - **Then** the frontend calls `POST /auth/switch-club` with the new `clubId`
   - **And** a new JWT is issued with the updated `activeClubId` and the correct role for that club
   - **And** all data on screen is immediately scoped to the new club (events, chat, members, dogs, documents)
   - **And** the header updates with the new club's logo and name
   - **And** the switch is instant — no loading screen or confirmation dialog
   - **And** my tab position is preserved (if I was on Events tab, I stay on Events tab)

3. **Join Another Club Option**
   - **Given** I see the bottom of the club list in the switcher
   - **When** I look for additional options
   - **Then** a "+ Rejoindre un autre club" option is available at the bottom
   - **And** tapping it navigates to a join/search flow (or shows invite code input)

4. **Mobile Bottom Tab Bar**
   - **Given** I am on mobile (<1024px)
   - **When** I view the app
   - **Then** a BottomTabBar is visible with 4 tabs: Events (calendar icon), Chat (message icon with unread badge), Dogs (paw icon), Profile (user icon)
   - **And** the active tab has blue icon + label, inactive tabs are muted
   - **And** each tab has `role="tab"` within a `role="tablist"`
   - **And** unread chat badge (coral) announces count to screen readers
   - **And** re-tapping the active tab scrolls to top
   - **And** the BottomTabBar is 56px height and always visible

5. **Desktop Sidebar Navigation**
   - **Given** I am on desktop (>1024px)
   - **When** I view the app
   - **Then** the BottomTabBar is hidden and replaced by a left sidebar (240px)
   - **And** the sidebar sections match the tab structure plus additional admin sections
   - **And** the ClubSwitcher is at the top of the sidebar

6. **Single Club Behavior**
   - **Given** I belong to only one club
   - **When** I tap the club name
   - **Then** the switcher still opens showing my single club and the "+ Rejoindre un autre club" option

## Tasks / Subtasks

### Backend

- [x] **Task 1: Switch club endpoint** (AC: #2)
  - [x] Create `libs/api/features/src/lib/auth/` module if not exists
  - [x] Add `POST /auth/switch-club` endpoint
  - [x] Request body: `{ clubId: string }` — validate with Zod schema `switchClubSchema`
  - [x] Guard chain: `@UseGuards(JwtAuthGuard)` only (no ClubGuard — user is switching clubs)
  - [x] Service logic:
    - Verify `clubId` is a valid UUID
    - Query `ClubMember` where `userId = request.user.sub AND clubId = body.clubId`
    - If not found → throw `ForbiddenException('Not a member of this club')`
    - If member status is `SUSPENDED` → throw `ForbiddenException('Membership suspended')`
    - Extract `role` from the ClubMember record
    - Issue new JWT: `{ sub: userId, email, activeClubId: clubId, role }`
    - Return `{ accessToken, activeClub: { id, name, logo, federationType }, role }`
  - [x] Create `switchClubSchema` in `libs/shared/types/src/lib/schemas/auth.schema.ts`:
    ```typescript
    export const switchClubSchema = z.object({ clubId: z.string().uuid() });
    ```
  - [x] Export from `libs/shared/types/src/index.ts`

- [x] **Task 2: User clubs list endpoint** (AC: #1, #6)
  - [x] Add `GET /auth/my-clubs` endpoint (or `GET /clubs/mine`)
  - [x] Guard chain: `@UseGuards(JwtAuthGuard)` only (no ClubGuard — cross-club query)
  - [x] Service logic:
    - Query `ClubMember` where `userId = request.user.sub AND status = 'ACTIVE'`
    - Join with `Club` table to get club details
    - Return `{ data: [{ clubId, name, logo, federationType, role }] }`
  - [x] Order by club name alphabetically

- [x] **Task 3: Backend unit tests** (AC: #1, #2)
  - [x] Create `auth.controller.spec.ts` tests for switch-club endpoint:
    - Valid switch → new JWT with correct activeClubId and role
    - Non-member club → 403
    - Suspended membership → 403
    - Invalid clubId → 400
  - [x] Create tests for my-clubs endpoint:
    - Returns only active memberships (not suspended)
    - Returns club details with role per club

### Frontend

- [x] **Task 4: AuthContext & club switching** (AC: #2)
  - [x] Create or update `apps/frontend/src/app/providers/auth-provider.tsx`:
    - `AuthContext` provides: `{ user, accessToken, activeClub, role, clubs, switchClub(), logout() }`
    - `switchClub(clubId)` → calls `POST /auth/switch-club` → updates accessToken + activeClub + role in state
    - On successful switch → invalidate ALL TanStack Query caches (all data is club-scoped)
    - Store `activeClubId` in localStorage for session persistence
    - On app load → if localStorage has `activeClubId`, validate with `GET /auth/my-clubs`
  - [x] `useAuth()` hook to consume AuthContext
  - [x] `useClubs()` hook → calls `GET /auth/my-clubs`, returns club list with roles

- [x] **Task 5: ClubSwitcher component** (AC: #1, #2, #3, #6)
  - [x] Create `libs/frontend/ui/src/lib/ClubSwitcher.tsx`
  - [x] Props: `{ clubs, activeClubId, onSwitch, onJoinClub }`
  - [x] **Mobile variant** (<1024px): shadcn/ui Sheet (slide-down from top)
    - Trigger: club name + chevron in header
    - Content: club list with logos, names, federation types
    - Active club has checkmark icon
    - Bottom: "+ Rejoindre un autre club" link
  - [x] **Desktop variant** (>=1024px): shadcn/ui DropdownMenu from sidebar
    - Trigger: club name + chevron at top of sidebar
    - Same content as mobile
  - [x] Accessibility:
    - `aria-expanded` on trigger
    - `aria-haspopup="listbox"` on trigger
    - `aria-selected="true"` on active club
    - `role="option"` on each club item
    - Keyboard: Enter opens, Arrow keys navigate, Enter selects, Escape closes
  - [x] On club tap → call `switchClub(clubId)` from AuthContext
  - [x] Club logo: render image if `logo` exists, else initials avatar (first 2 letters of club name)

- [x] **Task 6: BottomTabBar component** (AC: #4)
  - [x] Create `libs/frontend/ui/src/lib/BottomTabBar.tsx`
  - [x] 4 tabs with React Router `NavLink`:
    - Events: `Calendar` icon from lucide-react, route `/events`
    - Chat: `MessageCircle` icon, route `/chat`, unread badge (coral dot with count)
    - Dogs: `PawPrint` icon (or `Dog`), route `/dogs`
    - Profile: `User` icon, route `/profile`
  - [x] Active tab: blue icon + label text. Inactive: muted gray icon only
  - [x] Height: 56px, `fixed bottom-0`, full width, `z-50`
  - [x] `role="tablist"` on container, `role="tab"` on each tab
  - [x] Re-tap active tab → `window.scrollTo({ top: 0, behavior: 'smooth' })`
  - [x] Unread badge: `aria-label` announces count (e.g., "Chat, 3 messages non lus")
  - [x] Hide on desktop (>=1024px): `lg:hidden`

- [x] **Task 7: Sidebar navigation (desktop)** (AC: #5)
  - [x] Update existing `AppShell` sidebar in `libs/frontend/ui/src/lib/AppShell.tsx`
  - [x] Sidebar structure:
    - Top: ClubSwitcher (dropdown variant)
    - Nav section: same items as BottomTabBar (Events, Chat, Dogs, Profile)
    - Admin section (if role is ADMIN or OWNER): Members, Settings
  - [x] Use React Router `NavLink` with active class styling
  - [x] Show on desktop only: `hidden lg:flex`
  - [x] Width: 240px fixed

- [x] **Task 8: AppShell integration** (AC: #1, #4, #5)
  - [x] Update `libs/frontend/ui/src/lib/AppShell.tsx`:
    - Header: replace static club name with ClubSwitcher trigger (club name + chevron)
    - Bottom: add BottomTabBar (mobile only)
    - Sidebar: integrate ClubSwitcher + navigation links (desktop only)
    - Main content: add `pb-14` (56px) padding on mobile for BottomTabBar
  - [x] Ensure main content area adjusts for sidebar on desktop (`lg:ml-60`)

- [x] **Task 9: Route setup** (AC: #4, #5)
  - [x] Update `libs/frontend/features/src/lib/features.tsx`:
    - Add lazy-loaded routes: `/events`, `/chat`, `/dogs`, `/profile`, `/members`, `/settings`
    - Protected routes: wrap with auth check (redirect to `/login` if not authenticated)
    - Default route `/` redirects to `/events`
  - [x] Each route page: create placeholder components if feature pages don't exist yet
    - `EventsPage.tsx`, `ChatPage.tsx`, `DogsPage.tsx`, `ProfilePage.tsx`
    - Placeholders show page title + "Coming soon" message

- [x] **Task 10: Frontend tests** (AC: #1, #2, #4, #5)
  - [x] Create `libs/frontend/ui/src/lib/ClubSwitcher.test.tsx`:
    - Renders club list with active indicator
    - Calls onSwitch with correct clubId on selection
    - Shows join option at bottom
    - Single club: still shows switcher with join option
    - Keyboard navigation works
  - [x] Create `libs/frontend/ui/src/lib/BottomTabBar.test.tsx`:
    - Renders 4 tabs with correct icons
    - Active tab has active styling
    - Hidden on desktop viewport
  - [x] Test AuthContext switchClub flow (mock API call)

## Dev Notes

### Architecture Compliance

- **Guard chain**: Switch-club and my-clubs use `JwtAuthGuard` only (no ClubGuard — these are cross-club operations by design)
- **Tenant isolation**: After switch, ALL subsequent requests use the new `activeClubId` from the refreshed JWT. ClubGuard on feature endpoints ensures isolation.
- **Response format**: `ResponseWrapperInterceptor` auto-wraps to `{ data }`. Never manually wrap.
- **Error handling**: Throw NestJS `HttpException` subclasses. `AllExceptionsFilter` formats structured JSON.
- **Logging**: Use `Logger` with class context. Never `console.log`.
- **Validation**: Import Zod schemas from `@org/types`. Use `ZodValidationPipe`. Never define inline schemas.
- **JWT payload**: `{ sub: userId, email, activeClubId, role }` — role is per-club, changes on switch.

### Critical Implementation Details

1. **TanStack Query cache invalidation on switch**: When `switchClub()` is called, use `queryClient.removeQueries()` to clear ALL cached data. Every query key includes `clubId` (convention: `['entity', clubId, ...params]`), so stale data from the previous club must never be shown.

2. **JWT token lifecycle**: Access token = 15min, refresh token = 7d httpOnly cookie. On switch-club, a new access token is issued immediately. The refresh token remains valid for all clubs.

3. **No loading state on switch**: The context switch must feel instant. Update AuthContext state synchronously after API response. TanStack Query will show skeleton placeholders while club-scoped data loads — this is the expected UX pattern.

4. **Tab position preservation**: React Router maintains the current route path across context switches. Only the data changes, not the route. This is automatic if routing is properly decoupled from club context.

5. **WhatsApp mental model**: The ClubSwitcher should feel like switching WhatsApp group chats — tap, switch, instant. No confirmation dialogs, no loading screens, no "Are you sure?" prompts.

### Existing Code to Reuse

| What | Location | Notes |
|------|----------|-------|
| `JwtAuthGuard` | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Use on switch-club endpoint |
| `JwtStrategy` | `libs/api/core/src/lib/strategies/jwt.strategy.ts` | JWT validation with `{ sub, email, activeClubId, role }` |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extract userId from JWT |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Query ClubMember + Club |
| `JwtModule` | Registered in `CoreModule` | Use `JwtService.sign()` to issue new token |
| `AppShell` | `libs/frontend/ui/src/lib/AppShell.tsx` | Extend with ClubSwitcher + BottomTabBar |
| `Role` enum | `libs/shared/types/src/lib/enums.ts` | OWNER / ADMIN / MEMBER |
| `ClubMember` model | `libs/shared/prisma-client/prisma/schema.prisma` | userId + clubId + role, unique constraint |
| `Club` model | Schema has `name`, `logo`, `federationType`, `contactEmail` | Query for switcher data |
| shadcn/ui primitives | `libs/frontend/ui/` | Sheet, DropdownMenu, Button, Badge |
| `cn()` utility | `libs/frontend/ui/src/lib/ui.tsx` | Tailwind class merging |
| `fetchApi` | `libs/frontend/data-access/` | Frontend API client (if exists from prior stories) |
| lucide-react icons | Already in dependencies | Calendar, MessageCircle, PawPrint, User, ChevronDown, Check, Plus |

### File Structure (New Files)

```
Backend:
libs/api/features/src/lib/auth/
  auth.module.ts
  auth.controller.ts          ← POST /auth/switch-club, GET /auth/my-clubs
  auth.service.ts             ← switchClub(), getUserClubs()
  auth.controller.spec.ts
  auth.service.spec.ts

libs/shared/types/src/lib/schemas/
  auth.schema.ts              ← add switchClubSchema (file exists, extend it)

Frontend:
libs/frontend/ui/src/lib/
  ClubSwitcher.tsx
  ClubSwitcher.test.tsx
  BottomTabBar.tsx
  BottomTabBar.test.tsx

libs/frontend/features/src/lib/
  events/EventsPage.tsx       ← placeholder if not exists
  chat/ChatPage.tsx           ← placeholder
  dogs/DogsPage.tsx           ← placeholder
  profile/ProfilePage.tsx     ← placeholder

apps/frontend/src/app/providers/
  auth-provider.tsx           ← AuthContext with switchClub
```

### NestJS Module Pattern

```
libs/api/features/src/lib/auth/
  auth.module.ts          ← @Module({ imports: [CoreModule], controllers: [AuthController], providers: [AuthService] })
  auth.controller.ts      ← REST endpoints
  auth.service.ts         ← Business logic + Prisma queries + JWT signing
  auth.controller.spec.ts
  auth.service.spec.ts
```

Register in `libs/api/features/src/lib/api-features.ts`:
```typescript
@Module({ imports: [AuthModule, MemberModule] })
export class FeaturesModule {}
```

### TanStack Query Keys

- `['my-clubs']` — user's club list (no clubId, cross-club)
- `['events', clubId]` — invalidate on switch
- `['club-members', clubId]` — invalidate on switch
- `['dogs', clubId]` — invalidate on switch
- `['chat-channels', clubId]` — invalidate on switch

### Responsive Breakpoints

| Breakpoint | Navigation | ClubSwitcher |
|---|---|---|
| Mobile (<640px) | BottomTabBar + header | Sheet (slide-down) |
| Tablet (640–1024px) | BottomTabBar + header | Sheet (slide-down) |
| Desktop (>1024px) | Left sidebar (240px) | Dropdown from sidebar top |

### Dependencies on Other Stories

- **Story 4.1** (Email Invitation): Provides `ClubMember` join flow. The club switcher shows clubs from existing `ClubMember` records.
- **Story 4.2** (Member Directory): Provides member listing. This story's navigation tabs link to member pages.
- **Story 4.3** (Role Management): Provides role change logic and `MemberStatus` enum. The switch-club endpoint must check `status !== SUSPENDED`.
- **Stories 1.1–1.3**: Prisma schema, API core infrastructure, and shared schemas must be implemented. Guards, decorators, and pipes are prerequisites.

### Anti-Patterns to Avoid

- **DO NOT** query all clubs without filtering by userId — data leak risk
- **DO NOT** put ClubGuard on switch-club/my-clubs endpoints — these are intentionally cross-club
- **DO NOT** use React state for tab routing — use React Router NavLink for proper URL-based navigation
- **DO NOT** create a global Redux/Zustand store — AuthContext + TanStack Query is sufficient
- **DO NOT** use `console.log` — use NestJS `Logger` on backend, omit on frontend (TanStack Query devtools for debugging)
- **DO NOT** hardcode club data — always fetch from API via `GET /auth/my-clubs`
- **DO NOT** store JWT in localStorage — access token in memory (AuthContext state), refresh token in httpOnly cookie
- **DO NOT** skip accessibility attributes — the switcher must have proper ARIA roles and keyboard navigation

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.4 lines 751-799]
- [Source: _bmad-output/planning-artifacts/architecture.md — JWT payload, ClubGuard, tenant isolation]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard chain: JwtAuthGuard → ClubGuard → RolesGuard]
- [Source: _bmad-output/planning-artifacts/architecture.md — TanStack Query keys convention]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend code organization, React Router 6]
- [Source: _bmad-output/planning-artifacts/architecture.md — AuthContext provides: user, accessToken, activeClub, role, switchClub(), logout()]
- [Source: _bmad-output/planning-artifacts/prd.md — Journey 6: Multi-Club Member, FR4, FR5]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — ClubSwitcher component spec, WhatsApp mental model]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 6: Club Switch flow, responsive breakpoints]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — BottomTabBar: 56px, 4 tabs, mobile-only]
- [Source: _bmad-output/implementation-artifacts/4-3-role-management-member-administration.md — MemberStatus enum, suspension logic in ClubGuard]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — Club, User, ClubMember models]
- [Source: libs/api/core/src/lib/guards/ — Existing guard implementations]
- [Source: libs/frontend/ui/src/lib/AppShell.tsx — Existing layout with header + sidebar + mobile nav]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Backend: Added `POST /auth/switch-club` and `GET /auth/my-clubs` endpoints to existing AuthController/AuthService. switchClub verifies ClubMember exists, issues new JWT with updated activeClubId and role. getUserClubs returns all memberships ordered by club name.
- Added `switchClubSchema` Zod validation to shared types.
- Backend tests: 4 new tests for switchClub (valid switch, non-member 403, empty result) and getUserClubs (returns clubs with roles, empty array).
- Frontend AuthContext: Implemented real `switchClub()` calling `POST /auth/switch-club`, updating state, and clearing all TanStack Query caches via `queryClient.removeQueries()`. Added `clubs` state and `refreshClubs()` method.
- ClubSwitcher component: Custom dropdown with club list, logos (initials fallback), federation types, active checkmark, keyboard navigation (Enter/Arrows/Escape), proper ARIA attributes (listbox/option/aria-selected/aria-expanded). "+ Rejoindre un autre club" join option.
- BottomTabBar component: 4 tabs (Events/Chat/Dogs/Profile) with NavLink routing, active styling (blue), unread chat badge (coral, capped at 99+), scroll-to-top on re-tap, proper ARIA (tablist/tab), hidden on desktop (lg:hidden).
- AppShell rewrite: Header shows ClubSwitcher on mobile, sidebar shows ClubSwitcher + NavLink navigation + admin section (Members/Settings for ADMIN/OWNER) on desktop. BottomTabBar integrated as mobile nav.
- Routes: Added `/events`, `/chat`, `/dogs`, `/profile`, `/settings` routes with placeholder pages. `/` redirects to `/events`.
- Frontend tests: 11 ClubSwitcher tests, 9 BottomTabBar tests, 9 AppShell tests — all passing (54 total UI tests).
- Note: Suspension check in switch-club endpoint deferred — ClubMember `status` field will be added in story 4.3 (currently in parallel development).

### File List

- libs/shared/types/src/lib/schemas/auth.schema.ts (modified — added switchClubSchema)
- libs/api/features/src/lib/auth/auth.service.ts (modified — added switchClub, getUserClubs methods)
- libs/api/features/src/lib/auth/auth.controller.ts (modified — added switch-club, my-clubs endpoints)
- libs/api/features/src/lib/auth/auth.service.spec.ts (modified — added switchClub, getUserClubs tests)
- libs/frontend/data-access/src/lib/AuthContext.tsx (modified — implemented switchClub, added clubs state, refreshClubs)
- libs/frontend/data-access/src/index.ts (modified — exported ClubWithRole type)
- libs/frontend/ui/src/lib/ClubSwitcher.tsx (new)
- libs/frontend/ui/src/lib/ClubSwitcher.test.tsx (new)
- libs/frontend/ui/src/lib/BottomTabBar.tsx (new)
- libs/frontend/ui/src/lib/BottomTabBar.test.tsx (new)
- libs/frontend/ui/src/lib/AppShell.tsx (modified — full rewrite with ClubSwitcher, sidebar nav, BottomTabBar integration)
- libs/frontend/ui/src/lib/AppShell.test.tsx (modified — updated for new AppShell API)
- libs/frontend/ui/src/index.ts (modified — exported ClubSwitcher, BottomTabBar)
- libs/frontend/features/src/lib/features.tsx (modified — added routes, Navigate redirect)
- libs/frontend/features/src/lib/pages/EventsPage.tsx (new — placeholder)
- libs/frontend/features/src/lib/pages/ChatPage.tsx (new — placeholder)
- libs/frontend/features/src/lib/pages/DogsPage.tsx (new — placeholder)
- libs/frontend/features/src/lib/pages/ProfilePage.tsx (new — placeholder)
- libs/frontend/features/src/lib/pages/SettingsPage.tsx (new — placeholder)
- apps/frontend/src/app/app.tsx (modified — AppContent wrapper connecting AuthContext to AppShell)
