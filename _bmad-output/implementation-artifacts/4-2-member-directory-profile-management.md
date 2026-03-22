# Story 4.2: Member Directory & Profile Management

Status: ready-for-dev

## Story

As a club member,
I want to view the member directory and manage my own profile,
So that I can see who's in my club and keep my information up to date.

## Acceptance Criteria

1. **Member Directory View (All Members)**
   - Given I am a member of the club
   - When I navigate to the members section
   - Then I see a list of all club members with their name, avatar (initials fallback), and role badge
   - And the list is scoped to the active club only — no cross-club data visible (FR12)

2. **Search & Filter (Admin/Owner Only)**
   - Given I am an admin or owner
   - When I view the member directory
   - Then I can search by name or email with a search input at the top (debounced 300ms, instant results)
   - And I can filter by role: "All" / "Admin" / "Member" via toggle chips
   - And on desktop, the directory renders as a full data table with sortable columns

3. **Own Profile View & Edit**
   - Given I am any member
   - When I tap my own profile
   - Then I see my profile page with my name, email, avatar, and club-specific information
   - And I can edit my display name and avatar (photo upload with camera-first pattern)
   - And changes are saved with a success toast

4. **Other Member Profile View (Read-Only)**
   - Given I am a regular member
   - When I view another member's profile
   - Then I see their public information (name, avatar, role) but cannot edit it

5. **Empty State**
   - Given the member directory is empty (only me)
   - When I view the directory
   - Then an empty state is shown: "Invitez votre equipe pour commencer" with an "Invite" CTA (admin/owner only)

## Tasks / Subtasks

### Backend

- [ ] Task 1: Member directory API endpoint (AC: #1, #2)
  - [ ] Create `member` module in `libs/api/features/src/lib/member/`
  - [ ] `GET /clubs/:clubId/members` — list members scoped by `clubId` from JWT (via `@CurrentClub()`)
  - [ ] Return `{ data: [...], meta: { total, page, pageSize } }` with pagination
  - [ ] Each member object: `{ id, userId, firstName, lastName, email, avatarUrl, role, createdAt }`
  - [ ] Apply `JwtAuthGuard` + `ClubGuard` guard chain
  - [ ] Add `?search=` query param — filter by `firstName`, `lastName`, or `email` (case-insensitive `contains`)
  - [ ] Add `?role=` query param — filter by Role enum value
  - [ ] Search/filter only allowed for ADMIN/OWNER roles (return full list without filters for MEMBER role)
  - [ ] Join `ClubMember` with `User` table to get profile fields

- [ ] Task 2: Member detail API endpoint (AC: #3, #4)
  - [ ] `GET /clubs/:clubId/members/:memberId` — return single member profile
  - [ ] Apply `JwtAuthGuard` + `ClubGuard` guard chain
  - [ ] Return member with: `{ id, userId, firstName, lastName, email, avatarUrl, role, createdAt }`
  - [ ] Scope by `clubId` — never expose cross-club data

- [ ] Task 3: Profile update API endpoint (AC: #3)
  - [ ] `PATCH /clubs/:clubId/members/:memberId` — update own profile
  - [ ] Validate `memberId` matches `request.user.id`'s ClubMember record (self-only edit)
  - [ ] Updatable fields: `firstName`, `lastName`, `avatarUrl` on `User` model
  - [ ] Apply `JwtAuthGuard` + `ClubGuard` guard chain
  - [ ] Create Zod schema `updateProfileSchema` in `libs/shared/types/src/lib/schemas/member.schema.ts`
  - [ ] Return updated member object

- [ ] Task 4: Avatar upload endpoint (AC: #3)
  - [ ] `POST /clubs/:clubId/members/:memberId/avatar` — multipart file upload
  - [ ] Validate MIME type (image/jpeg, image/png, image/webp) and max size (5MB)
  - [ ] Upload to Cloudflare R2 with key: `{clubId}/avatars/{userId}/{filename}`
  - [ ] Update `User.avatarUrl` with the R2 key (generate signed URL on read)
  - [ ] Self-only: validate `memberId` belongs to current user

- [ ] Task 5: Zod schemas and DTOs (AC: all)
  - [ ] Add `updateProfileSchema` to `libs/shared/types/src/lib/schemas/member.schema.ts`
  - [ ] Add `findMembersQuerySchema` with optional `search` (string), `role` (Role enum), `page` (number), `pageSize` (number)
  - [ ] Export types: `UpdateProfile`, `FindMembersQuery`

### Frontend

- [ ] Task 6: Member directory page (AC: #1, #2, #5)
  - [ ] Create `libs/frontend/features/src/lib/members/MemberDirectory.tsx`
  - [ ] TanStack Query hook: `useMembers(clubId, { search, role, page })` in `hooks/useMembers.ts`
  - [ ] Mobile: scrollable list with `MemberCard` components (name, avatar with initials fallback, role badge)
  - [ ] Desktop (>1024px): data table with sortable columns (Name, Email, Role, Joined)
  - [ ] Admin/Owner: show search input (debounced 300ms) + role filter toggle chips ("All" / "Admin" / "Member")
  - [ ] Regular member: no search/filter controls visible
  - [ ] Empty state: illustration + "Invitez votre equipe pour commencer" + "Inviter" CTA (admin/owner only)
  - [ ] Tap member → navigate to member profile

- [ ] Task 7: Member profile page (AC: #3, #4)
  - [ ] Create `libs/frontend/features/src/lib/members/MemberProfile.tsx`
  - [ ] TanStack Query hook: `useMemberDetail(clubId, memberId)` in `hooks/useMembers.ts`
  - [ ] Display: name, email, avatar (full size), role badge, member since date
  - [ ] Own profile: show edit button → inline editing or edit form
  - [ ] Other member: read-only view, no edit controls
  - [ ] Detect own profile by comparing `memberId` with current user's ClubMember id

- [ ] Task 8: Profile edit form (AC: #3)
  - [ ] Create `libs/frontend/features/src/lib/members/ProfileEditForm.tsx`
  - [ ] React Hook Form + `zodResolver(updateProfileSchema)` from shared types
  - [ ] Fields: firstName, lastName
  - [ ] Avatar upload with camera-first pattern (mobile: camera option first, then gallery)
  - [ ] TanStack Mutation: `useUpdateProfile()` — `PATCH /clubs/:clubId/members/:memberId`
  - [ ] On success: invalidate `['members', clubId]` + `['members', clubId, memberId]` queries, show success toast
  - [ ] Validation: `mode: 'onBlur'`

- [ ] Task 9: UI components (AC: #1, #2, #4)
  - [ ] `MemberCard.tsx` in `libs/frontend/ui/src/lib/` — avatar (with initials fallback via `getInitials(firstName, lastName)`), name, role badge
  - [ ] `RoleBadge.tsx` in `libs/frontend/ui/src/lib/` — colored badge: Owner (gold), Admin (blue), Member (gray)
  - [ ] `Avatar.tsx` in `libs/frontend/ui/src/lib/` — image with initials fallback, size variants (sm/md/lg)
  - [ ] Use shadcn/ui primitives: `Badge`, `Input`, `Table`, `Card`

- [ ] Task 10: Routing (AC: all)
  - [ ] Add routes in `apps/frontend/src/app/app.tsx`:
    - `/members` → `MemberDirectory`
    - `/members/:memberId` → `MemberProfile`
  - [ ] Lazy load with `React.lazy` + `Suspense`

### Testing

- [ ] Task 11: Backend tests
  - [ ] `member.service.spec.ts` — unit tests: list members (scoped by clubId), search, filter, get detail, update profile (self-only), reject update for other user
  - [ ] `member.controller.spec.ts` — guard chain validation, DTO validation, response format

- [ ] Task 12: Frontend tests
  - [ ] `MemberDirectory.test.tsx` — renders member list, shows search/filter for admin, hides for member, shows empty state
  - [ ] `MemberProfile.test.tsx` — renders profile, shows edit for own profile, hides edit for others
  - [ ] `MemberCard.test.tsx` — renders avatar with initials fallback, shows role badge

## Dev Notes

### Architecture Compliance

**Guard Chain (CRITICAL):** Every authenticated endpoint MUST follow:
```
Request → JwtAuthGuard → ClubGuard → RolesGuard → Controller
```
- `JwtAuthGuard` validates JWT, extracts user payload
- `ClubGuard` extracts `clubId` from JWT `activeClubId` claim, sets `request.clubId`
- `RolesGuard` + `@Roles()` decorator for admin-only endpoints (search/filter)
- Use `@CurrentClub()` decorator to get `clubId` in controller methods
- Use `@CurrentUser()` decorator to get user payload

**Tenant Isolation (CRITICAL SECURITY):**
- ALL Prisma queries MUST include `WHERE clubId = <clubId from JWT>`
- Never accept `clubId` from request body/params for data scoping — always from JWT via `ClubGuard`
- The route param `:clubId` is for RESTful URL structure only; actual scoping uses JWT claim
- A failure here is a data breach

**API Response Format:**
```typescript
// List
{ "data": [...], "meta": { "total": 42, "page": 1, "pageSize": 20 } }
// Single
{ "data": { ... } }
// Error
{ "statusCode": 400, "error": "VALIDATION_ERROR", "message": "...", "details": [...] }
```

### Database Model Notes

**ClubMember** is the join table between `User` and `Club`. The member directory lists `ClubMember` records joined with `User` to get profile fields:
```
ClubMember.id, ClubMember.role, ClubMember.createdAt
User.firstName, User.lastName, User.email, User.avatarUrl
```

**Existing Prisma schema** already has:
- `ClubMember` model with `userId`, `clubId`, `role` (Role enum: OWNER/ADMIN/MEMBER), unique constraint on `[userId, clubId]`
- `User` model with `firstName`, `lastName`, `email`, `avatarUrl`, `passwordHash`
- `Role` enum: OWNER, ADMIN, MEMBER
- No `suspended` field on `ClubMember` yet (that's Story 4.3 scope)
- No `displayName` field — use `firstName` + `lastName` from `User` model

**Schema gap:** The PRD mentions `displayName` on profiles but the Prisma schema uses `firstName` + `lastName`. Use the existing schema fields. Do NOT add a `displayName` column — derive display name from `firstName + ' ' + lastName`.

### Existing Shared Schemas

`libs/shared/types/src/lib/schemas/member.schema.ts` already has:
- `inviteMemberSchema` (email + optional role) — Story 4.1 scope
- `updateMemberRoleSchema` (role) — Story 4.3 scope

Add to this file:
- `updateProfileSchema` — `{ firstName?: string, lastName?: string }`
- `findMembersQuerySchema` — `{ search?: string, role?: Role, page?: number, pageSize?: number }`

### Existing Infrastructure to Reuse

**Guards (already built in `libs/api/core/src/lib/guards/`):**
- `jwt-auth.guard.ts` — JwtAuthGuard
- `club.guard.ts` — ClubGuard (extracts clubId from JWT)
- `roles.guard.ts` — RolesGuard

**Decorators (already built in `libs/api/core/src/lib/decorators/`):**
- `current-club.decorator.ts` — `@CurrentClub()` returns `request.clubId`
- `current-user.decorator.ts` — `@CurrentUser()` returns `request.user`
- `roles.decorator.ts` — `@Roles('ADMIN', 'OWNER')`

**Prisma service:** `libs/api/core/src/lib/prisma.service.ts`

**DO NOT** recreate any of these. Import from `@canifed/api/core`.

### Frontend Patterns

**State management:** TanStack Query for all server state. No Redux/Zustand.

**Query key convention:**
- `['members', clubId]` — member list
- `['members', clubId, memberId]` — single member
- Invalidate list on mutation success

**Styling:** Tailwind CSS 4 + shadcn/ui components. Use `clsx` + `tailwind-merge` for conditional classes.

**Icons:** Lucide React — `Search`, `Filter`, `User`, `Edit`, `Camera`

**Responsive breakpoints (UX-DR17):**
- Mobile: `< 640px` — single column list, compact MemberCard
- Tablet: `640-1024px` — list with filters visible
- Desktop: `> 1024px` — full data table with sortable columns

**Avatar initials fallback:**
```tsx
function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}
```

**Debounced search:** Use `useDeferredValue` (React 19) or a simple `useDebounce` hook (300ms delay).

**Camera-first upload (UX-DR19):** On mobile, the file input `accept="image/*"` with `capture="environment"` attribute offers camera first. Fallback to gallery. Validate client-side: image/jpeg, image/png, image/webp, max 5MB.

**Form validation pattern:** React Hook Form + zodResolver, `mode: 'onBlur'`.

**Toast notifications:** Use shadcn/ui `toast` / `sonner` for success feedback. French messages:
- Profile update: "Profil mis a jour"
- Error: "Une erreur est survenue"

### NestJS Module Structure

Create in `libs/api/features/src/lib/member/`:
```
member/
  member.module.ts
  member.controller.ts
  member.service.ts
  dto/
    find-members-query.dto.ts
    update-profile.dto.ts
  member.controller.spec.ts
  member.service.spec.ts
```

Register `MemberModule` in the features barrel export and import it in `apps/api/src/main.ts` (or the root AppModule).

### File Upload to Cloudflare R2

- Use the S3-compatible client (`@aws-sdk/client-s3`) configured for R2
- R2 key pattern: `{clubId}/avatars/{userId}/{timestamp}-{filename}`
- Generate signed GET URLs for reading (time-limited)
- MIME validation: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5MB
- If R2 integration is not yet set up (check if it exists), create a placeholder service that stores URLs locally or skip avatar upload and document it as a dependency

### Scope Boundaries

**IN scope for this story:**
- Member directory list view (mobile list + desktop table)
- Search and filter (admin/owner only)
- Member profile view (own + others)
- Own profile edit (firstName, lastName, avatar)
- Empty state for directory
- API endpoints for above

**OUT of scope (other stories):**
- Email invitations (Story 4.1)
- Role changes (promote/demote) (Story 4.3)
- Member removal/suspension (Story 4.3)
- Club switcher UI (Story 4.4)
- BottomTabBar / sidebar navigation (Story 4.4)

### Cross-Story Dependencies

- **Depends on Epic 1** (Stories 1.1-1.3): Prisma schema, API core infrastructure, shared Zod schemas — these are in `review` status, should be available
- **Depends on Story 4.1** (email invitations): Members must exist in the database to list them. For development/testing, seed test data directly in the database
- **Depends on Epic 2/3** (auth, club creation): JWT auth and club context must work. These are still in `backlog`. For development, mock auth or use test JWT tokens

### Project Structure Notes

- Alignment with Nx monorepo structure: backend features in `libs/api/features/`, frontend features in `libs/frontend/features/`, shared types in `libs/shared/types/`
- UI components shared across features go in `libs/frontend/ui/`
- Feature-specific components stay within the feature directory
- Import paths use Nx path aliases: `@canifed/api/core`, `@canifed/shared/types`, `@canifed/frontend/ui`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, Guard Chain, Tenant Isolation]
- [Source: _bmad-output/planning-artifacts/prd.md — FR12, FR13, FR14, FR15]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR14, UX-DR15, UX-DR16, UX-DR17, UX-DR19]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — ClubMember, User models]
- [Source: libs/shared/types/src/lib/schemas/member.schema.ts — existing schemas]
- [Source: libs/api/core/src/lib/guards/ — JwtAuthGuard, ClubGuard, RolesGuard]
- [Source: libs/api/core/src/lib/decorators/ — @CurrentClub, @CurrentUser, @Roles]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
