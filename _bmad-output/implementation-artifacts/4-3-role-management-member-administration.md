# Story 4.3: Role Management & Member Administration

Status: review

## Story

As a club owner,
I want to manage member roles and remove/suspend members,
so that I can organize my club's leadership and handle departures.

## Acceptance Criteria

1. **Role Change by Owner**
   - **Given** I am the club owner
   - **When** I view a member's profile or the directory
   - **Then** I see options to change their role (promote to Admin, demote to Member)
   - **And** role changes are confirmed via a Sheet on mobile with the role options
   - **And** the new role takes effect immediately — the member's next JWT refresh reflects the updated role
   - **And** a success toast confirms the change

2. **Role Change by Admin**
   - **Given** I am an admin
   - **When** I try to change roles
   - **Then** I can promote members to Admin and demote Admins to Member
   - **And** I cannot change the Owner's role or promote anyone to Owner
   - **And** I cannot demote myself (prevents accidental self-demotion)

3. **Remove Member**
   - **Given** I am an owner or admin
   - **When** I tap "Remove member" on a member's profile
   - **Then** a confirmation dialog appears: "Retirer [name] du club ?"
   - **And** on confirmation, the ClubMember record is deleted
   - **And** the removed member's JWT for this club is invalidated
   - **And** the member is removed from the directory immediately
   - **And** a success toast confirms: "[name] a été retiré du club"

4. **Suspend Member**
   - **Given** I am an owner or admin
   - **When** I tap "Suspend member"
   - **Then** the member's ClubMember record is flagged as suspended
   - **And** the suspended member cannot access the club's data — API returns 403
   - **And** the suspended member appears in the directory with a "Suspended" badge (admin view only)

5. **Member-Only View**
   - **Given** I am a regular member
   - **When** I view the directory
   - **Then** no role management or remove/suspend options are visible

6. **Owner Protection**
   - **Given** there is only one owner
   - **When** the owner tries to leave or be removed
   - **Then** the action is blocked with a message: "Vous devez transférer la propriété avant de quitter le club"

## Tasks / Subtasks

### Backend

- [x] **Task 1: Prisma schema migration** (AC: #4)
  - [x] Add `status` field to `ClubMember` model: `status MemberStatus @default(ACTIVE)`
  - [x] Add `MemberStatus` enum: `ACTIVE | SUSPENDED`
  - [x] Add `suspendedAt DateTime?` field to `ClubMember`
  - [x] Run `npx nx run prisma-client:prisma-migrate -- --name add-member-status`
  - [x] Regenerate Prisma client

- [x] **Task 2: Shared types & Zod schemas** (AC: #1, #2, #3, #4)
  - [x] Add `MemberStatus` enum to `libs/shared/types/src/lib/enums.ts`
  - [x] Create/update `libs/shared/types/src/lib/schemas/member.schema.ts`:
    - `updateMemberRoleSchema` — already exists, verify it validates against `Role` enum
    - `suspendMemberSchema` — optional reason field
  - [x] Export new types from `libs/shared/types/src/index.ts`

- [x] **Task 3: Member management service** (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `libs/api/features/src/lib/member/member.module.ts`
  - [x] Create `libs/api/features/src/lib/member/member.service.ts` with methods:
    - `updateRole(clubId, memberId, newRole, requestingUserId, requestingRole)` — business logic for role changes
    - `removeMember(clubId, memberId, requestingUserId, requestingRole)` — delete ClubMember record
    - `suspendMember(clubId, memberId, requestingUserId, requestingRole)` — set status=SUSPENDED
    - `unsuspendMember(clubId, memberId)` — set status=ACTIVE
  - [x] Implement authorization rules in service layer:
    - Owner can promote/demote anyone except themselves to Owner
    - Admin can promote Member→Admin and demote Admin→Member
    - Admin cannot change Owner's role or promote to Owner
    - Admin cannot demote themselves
    - Nobody can remove/suspend the sole Owner
  - [x] All queries scoped by `clubId` from `request.clubId` (ClubGuard-injected)

- [x] **Task 4: Member management controller** (AC: #1, #2, #3, #4)
  - [x] Create `libs/api/features/src/lib/member/member.controller.ts`
  - [x] Endpoints:
    - `PATCH /clubs/:clubId/members/:memberId/role` — `@Roles('OWNER', 'ADMIN')` — change role
    - `DELETE /clubs/:clubId/members/:memberId` — `@Roles('OWNER', 'ADMIN')` — remove member
    - `PATCH /clubs/:clubId/members/:memberId/suspend` — `@Roles('OWNER', 'ADMIN')` — suspend
    - `PATCH /clubs/:clubId/members/:memberId/unsuspend` — `@Roles('OWNER', 'ADMIN')` — unsuspend
  - [x] All endpoints use guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)`
  - [x] Use `@CurrentUser()` and `@CurrentClub()` decorators
  - [x] Use `ZodValidationPipe` with shared schemas for request body validation
  - [x] Register MemberModule in FeaturesModule (`libs/api/features/src/lib/api-features.ts`)

- [x] **Task 5: ClubGuard suspension check** (AC: #4)
  - [x] Update `ClubGuard` in `libs/api/core/src/lib/guards/club.guard.ts`:
    - When querying ClubMember, also select `status`
    - If `status === 'SUSPENDED'`, throw `ForbiddenException('Membership suspended')`
    - This blocks suspended members from ALL club-scoped endpoints automatically

- [x] **Task 6: Backend unit tests** (AC: all)
  - [x] Create `libs/api/features/src/lib/member/member.service.spec.ts`
  - [x] Create `libs/api/features/src/lib/member/member.controller.spec.ts`
  - [x] Test authorization matrix:
    - Owner can change any role except promote to Owner
    - Admin can promote Member→Admin, demote Admin→Member
    - Admin cannot demote self, cannot touch Owner
    - Member cannot change any role (403)
    - Sole owner cannot be removed/suspended
  - [x] Test suspension blocks API access via ClubGuard
  - [x] Test removal deletes ClubMember record

### Frontend

- [x] **Task 7: API hooks for member management** (AC: #1, #2, #3, #4)
  - [x] Create `libs/frontend/features/src/lib/members/hooks/useMembers.ts` (extended existing file):
    - `useUpdateMemberRole(clubId)` — TanStack mutation, invalidates `['members', clubId]`
    - `useRemoveMember(clubId)` — TanStack mutation
    - `useSuspendMember(clubId)` — TanStack mutation
    - `useUnsuspendMember(clubId)` — TanStack mutation
  - [x] Attach auth token via apiClient (Bearer header)
  - [x] Handle error responses: map API error codes to French toast messages

- [x] **Task 8: Role change UI** (AC: #1, #2)
  - [x] Create `libs/frontend/features/src/lib/members/components/RoleChangeSheet.tsx`:
    - Mobile: bottom sheet with role radio options (Member / Admin)
    - Desktop: centered modal with same radio options
    - Shows current role highlighted
    - Disables Owner option (cannot promote to Owner)
    - On confirm: calls `useUpdateMemberRole` mutation
    - Success toast: "[Name] est maintenant [Role]"
  - [x] Integrate into member directory row actions via MemberActions component

- [x] **Task 9: Remove member UI** (AC: #3)
  - [x] Create `libs/frontend/features/src/lib/members/components/RemoveMemberDialog.tsx`:
    - Confirmation Dialog: "Retirer [name] du club ?"
    - Subtitle: "[Name] ne pourra plus voir les événements, documents ou le chat du club."
    - Cancel button (ghost) + Remove button (destructive/red)
    - On confirm: calls `useRemoveMember` mutation
    - Success toast: "[name] a été retiré du club"
  - [x] Owner protection: server-side sole owner check returns 403

- [x] **Task 10: Suspend member UI** (AC: #4)
  - [x] Create `libs/frontend/features/src/lib/members/components/SuspendMemberDialog.tsx`:
    - Confirmation Dialog: "Suspendre [name] ?"
    - Subtitle: "[Name] ne pourra plus accéder aux données du club."
    - Cancel + Suspend buttons
    - On confirm: calls `useSuspendMember` mutation
  - [x] Show "Suspendu" badge on suspended members in directory (admin/owner view only)
  - [x] Add "Réactiver" option for suspended members via MemberActions

- [x] **Task 11: Member directory admin actions integration** (AC: #1, #2, #3, #4, #5)
  - [x] Add action menu (3-dot menu) to member rows/cards via MemberActions component:
    - "Changer le rôle" → opens RoleChangeSheet
    - "Suspendre" → opens SuspendMemberDialog (or "Réactiver" if suspended)
    - "Retirer du club" → opens RemoveMemberDialog
  - [x] Conditionally render actions based on `request.clubRole`:
    - `MEMBER` role: no action menu visible
    - `ADMIN` role: show actions except on Owner rows
    - `OWNER` role: show all actions except remove/suspend self (sole owner)
  - [x] Integrated with existing MemberDirectory from story 4.2

## Dev Notes

### Architecture Compliance

- **Guard chain is mandatory**: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)` on ALL endpoints. Never skip ClubGuard.
- **Tenant isolation**: Every Prisma query MUST include `where: { clubId }`. ClubGuard injects `request.clubId`.
- **Response format**: Controllers return plain data. `ResponseWrapperInterceptor` auto-wraps to `{ data }`. Never manually wrap.
- **Error handling**: Throw `ForbiddenException`, `NotFoundException`, `BadRequestException`. The `AllExceptionsFilter` formats to structured JSON with French-friendly error codes.
- **Logging**: Use `private readonly logger = new Logger(MemberService.name)`. Never `console.log`.
- **Validation**: Import Zod schemas from `@org/types`. Use `ZodValidationPipe`. Never define inline schemas.

### Key Authorization Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Change role to Admin | Yes | Yes | No |
| Change role to Member (demote) | Yes | Yes (not self, not Owner) | No |
| Change role to Owner | No | No | No |
| Remove member | Yes (not sole self) | Yes (not Owner) | No |
| Suspend member | Yes (not self) | Yes (not Owner) | No |
| Unsuspend member | Yes | Yes | No |

### Critical Business Rules

1. **Sole owner protection**: If only one Owner exists, block removal, suspension, and demotion. Check: `COUNT(ClubMember WHERE clubId AND role='OWNER') === 1`.
2. **Self-demotion block for Admin**: Admin cannot demote themselves. Owner CAN demote themselves only if another Owner exists (edge case — currently only one Owner per club by design).
3. **Suspension = soft block**: Suspended members keep their ClubMember record but are blocked by ClubGuard from all API access. They appear with a "Suspended" badge to admins.
4. **Removal = hard delete**: Removing a member deletes the ClubMember record. Cascade behavior means they lose access to club-scoped data. Their User account remains.
5. **JWT invalidation on role change**: Role changes take effect on the member's next JWT refresh (15m max). No real-time invalidation needed at MVP scale.

### Existing Code to Reuse

| What | Location | Notes |
|------|----------|-------|
| `ClubGuard` | `libs/api/core/src/lib/guards/club.guard.ts` | Extend to check suspension status |
| `RolesGuard` | `libs/api/core/src/lib/guards/roles.guard.ts` | Use as-is |
| `@Roles()` decorator | `libs/api/core/src/lib/decorators/roles.decorator.ts` | Use as-is |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Extracts JwtPayload |
| `@CurrentClub()` | `libs/api/core/src/lib/decorators/current-club.decorator.ts` | Extracts clubId |
| `ZodValidationPipe` | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Use with shared schemas |
| `updateMemberRoleSchema` | `libs/shared/types/src/lib/schemas/member.schema.ts` | Already exists |
| `Role` enum | `libs/shared/types/src/lib/enums.ts` | OWNER/ADMIN/MEMBER |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Inject via DI |
| `ResponseWrapperInterceptor` | `libs/api/core/src/lib/interceptors/response-wrapper.interceptor.ts` | Auto-wraps responses |
| `AllExceptionsFilter` | `libs/api/core/src/lib/filters/all-exceptions.filter.ts` | Structured error responses |
| `fetchApi` | `libs/frontend/data-access/src/lib/data-access.tsx` | Frontend API client |
| shadcn/ui components | `libs/frontend/ui/` | Sheet, Dialog, Badge, Button, Toast |

### NestJS Module Pattern

```
libs/api/features/src/lib/member/
  member.module.ts          ← @Module declaration
  member.controller.ts      ← REST endpoints with guards
  member.service.ts         ← Business logic + Prisma queries
  member.controller.spec.ts ← Controller tests
  member.service.spec.ts    ← Service tests
```

Register in `libs/api/features/src/lib/api-features.ts`:
```typescript
@Module({ imports: [MemberModule] })
export class FeaturesModule {}
```

### Frontend Component Pattern

```
libs/frontend/features/src/lib/members/
  components/
    RoleChangeSheet.tsx
    RemoveMemberDialog.tsx
    SuspendMemberDialog.tsx
    MemberActions.tsx        ← Action menu wrapper (3-dot menu)
```

```
libs/frontend/data-access/src/lib/hooks/
  useMembers.ts              ← TanStack Query mutations
```

### TanStack Query Keys

- `['club-members', clubId]` — member list (invalidate after role change, remove, suspend)
- `['club-members', clubId, memberId]` — single member detail

### Project Structure Notes

- All French UI text hardcoded (no i18n framework at MVP)
- Touch targets minimum 44x44px on mobile
- Destructive actions (remove) always require confirmation Dialog
- Non-destructive reversible actions (role change) use Sheet on mobile
- Role badges: use shadcn/ui Badge component

### Dependencies on Other Stories

- **Story 4.1** (Email Invitation & Member Join Flow): Provides the invitation infrastructure. Story 4.3 manages members AFTER they've joined.
- **Story 4.2** (Member Directory & Profile Management): Provides the member list UI. Story 4.3 adds admin action overlays to it. If 4.2 is not yet implemented, build a minimal member list to support admin actions.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4, Story 4.3 lines 708-749]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guards & RBAC section]
- [Source: _bmad-output/planning-artifacts/architecture.md — ClubMember schema, Role enum]
- [Source: _bmad-output/planning-artifacts/architecture.md — NestJS module pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend patterns, TanStack Query]
- [Source: _bmad-output/planning-artifacts/prd.md — FR10, FR11, FR13 RBAC matrix]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Member management UI, Sheet/Dialog patterns]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — ClubMember model lines 90-103]
- [Source: libs/api/core/src/lib/guards/ — Existing guard implementations]
- [Source: libs/shared/types/src/lib/schemas/member.schema.ts — Existing Zod schemas]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Existing member test files used `jest.fn()` but project uses vitest — rewrote to use `vi.fn()` with direct instantiation pattern
- No shadcn/ui or Radix installed — built custom modal/sheet components using native HTML + Tailwind
- Prisma migration ran via `npx prisma migrate dev` directly (no nx target configured for migrations)

### Completion Notes List

- **Task 1**: Added `MemberStatus` enum (`ACTIVE | SUSPENDED`), `status` field, and `suspendedAt` to ClubMember. Migration: `20260322144411_add_member_status`
- **Task 2**: Added `MemberStatus` enum to shared types and `suspendMemberSchema` (optional reason field) to member.schema.ts
- **Task 3**: Extended `MemberService` with `updateRole`, `removeMember`, `suspendMember`, `unsuspendMember` methods implementing the full authorization matrix (owner protection, admin self-demotion block, sole owner guard)
- **Task 4**: Added 4 new endpoints to `MemberController`: `PATCH :memberId/role`, `DELETE :memberId`, `PATCH :memberId/suspend`, `PATCH :memberId/unsuspend` — all with `JwtAuthGuard + ClubGuard + RolesGuard` chain
- **Task 5**: Updated `ClubGuard` to select `status` field and throw `ForbiddenException('Membership suspended')` for suspended members
- **Task 6**: 34 service + controller unit tests + 6 ClubGuard tests (including suspension check) — all passing. Authorization matrix fully covered
- **Task 7**: Added `useUpdateMemberRole`, `useRemoveMember`, `useSuspendMember`, `useUnsuspendMember` TanStack Query mutations to existing `useMembers.ts` hook. Updated `MemberDto` to include `status` and `suspendedAt`
- **Task 8**: Created `RoleChangeSheet.tsx` — bottom sheet/modal with radio options for Admin/Member roles, current role highlighted, French toast on success
- **Task 9**: Created `RemoveMemberDialog.tsx` — confirmation dialog with destructive red button, French messages
- **Task 10**: Created `SuspendMemberDialog.tsx` — confirmation dialog with amber button, "Suspendu" badge on suspended members, "Réactiver" unsuspend option
- **Task 11**: Created `MemberActions.tsx` wrapper (3-dot MoreVertical menu) and integrated into both mobile card list and desktop table in MemberDirectory. Conditional rendering based on caller role (Member: hidden, Admin: hidden on Owner rows, Owner: full access)

### Change Log

- 2026-03-22: Story 4.3 implemented — role management, member removal, suspension with full RBAC authorization matrix

### File List

**New files:**
- `libs/shared/prisma-client/prisma/migrations/20260322144411_add_member_status/migration.sql`
- `libs/frontend/features/src/lib/members/components/RoleChangeSheet.tsx`
- `libs/frontend/features/src/lib/members/components/RemoveMemberDialog.tsx`
- `libs/frontend/features/src/lib/members/components/SuspendMemberDialog.tsx`
- `libs/frontend/features/src/lib/members/components/MemberActions.tsx`

**Modified files:**
- `libs/shared/prisma-client/prisma/schema.prisma` — added MemberStatus enum, status/suspendedAt to ClubMember
- `libs/shared/types/src/lib/enums.ts` — added MemberStatus enum
- `libs/shared/types/src/lib/schemas/member.schema.ts` — added suspendMemberSchema, SuspendMember type
- `libs/api/features/src/lib/member/member.service.ts` — added updateRole, removeMember, suspendMember, unsuspendMember methods; updated mapMember to include status/suspendedAt
- `libs/api/features/src/lib/member/member.controller.ts` — added PATCH /role, DELETE, PATCH /suspend, PATCH /unsuspend endpoints
- `libs/api/core/src/lib/guards/club.guard.ts` — added status selection and suspension check
- `libs/api/features/src/lib/member/member.service.spec.ts` — rewrote with vitest, added 20 tests for new methods
- `libs/api/features/src/lib/member/member.controller.spec.ts` — rewrote with vitest, added 4 tests for new endpoints
- `libs/api/core/src/lib/guards/club.guard.spec.ts` — added suspension test, updated existing tests for status field
- `libs/frontend/features/src/lib/members/hooks/useMembers.ts` — added admin mutation hooks, updated MemberDto
- `libs/frontend/features/src/lib/members/MemberDirectory.tsx` — integrated MemberActions, suspended badge
