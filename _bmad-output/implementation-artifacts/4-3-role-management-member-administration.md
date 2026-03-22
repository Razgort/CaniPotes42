# Story 4.3: Role Management & Member Administration

Status: ready-for-dev

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

- [ ] **Task 1: Prisma schema migration** (AC: #4)
  - [ ] Add `status` field to `ClubMember` model: `status MemberStatus @default(ACTIVE)`
  - [ ] Add `MemberStatus` enum: `ACTIVE | SUSPENDED`
  - [ ] Add `suspendedAt DateTime?` field to `ClubMember`
  - [ ] Run `npx nx run prisma-client:prisma-migrate -- --name add-member-status`
  - [ ] Regenerate Prisma client

- [ ] **Task 2: Shared types & Zod schemas** (AC: #1, #2, #3, #4)
  - [ ] Add `MemberStatus` enum to `libs/shared/types/src/lib/enums.ts`
  - [ ] Create/update `libs/shared/types/src/lib/schemas/member.schema.ts`:
    - `updateMemberRoleSchema` — already exists, verify it validates against `Role` enum
    - `suspendMemberSchema` — optional reason field
  - [ ] Export new types from `libs/shared/types/src/index.ts`

- [ ] **Task 3: Member management service** (AC: #1, #2, #3, #4, #5, #6)
  - [ ] Create `libs/api/features/src/lib/member/member.module.ts`
  - [ ] Create `libs/api/features/src/lib/member/member.service.ts` with methods:
    - `updateRole(clubId, memberId, newRole, requestingUserId, requestingRole)` — business logic for role changes
    - `removeMember(clubId, memberId, requestingUserId, requestingRole)` — delete ClubMember record
    - `suspendMember(clubId, memberId, requestingUserId, requestingRole)` — set status=SUSPENDED
    - `unsuspendMember(clubId, memberId)` — set status=ACTIVE
  - [ ] Implement authorization rules in service layer:
    - Owner can promote/demote anyone except themselves to Owner
    - Admin can promote Member→Admin and demote Admin→Member
    - Admin cannot change Owner's role or promote to Owner
    - Admin cannot demote themselves
    - Nobody can remove/suspend the sole Owner
  - [ ] All queries scoped by `clubId` from `request.clubId` (ClubGuard-injected)

- [ ] **Task 4: Member management controller** (AC: #1, #2, #3, #4)
  - [ ] Create `libs/api/features/src/lib/member/member.controller.ts`
  - [ ] Endpoints:
    - `PATCH /clubs/:clubId/members/:memberId/role` — `@Roles('OWNER', 'ADMIN')` — change role
    - `DELETE /clubs/:clubId/members/:memberId` — `@Roles('OWNER', 'ADMIN')` — remove member
    - `PATCH /clubs/:clubId/members/:memberId/suspend` — `@Roles('OWNER', 'ADMIN')` — suspend
    - `PATCH /clubs/:clubId/members/:memberId/unsuspend` — `@Roles('OWNER', 'ADMIN')` — unsuspend
  - [ ] All endpoints use guard chain: `@UseGuards(JwtAuthGuard, ClubGuard, RolesGuard)`
  - [ ] Use `@CurrentUser()` and `@CurrentClub()` decorators
  - [ ] Use `ZodValidationPipe` with shared schemas for request body validation
  - [ ] Register MemberModule in FeaturesModule (`libs/api/features/src/lib/api-features.ts`)

- [ ] **Task 5: ClubGuard suspension check** (AC: #4)
  - [ ] Update `ClubGuard` in `libs/api/core/src/lib/guards/club.guard.ts`:
    - When querying ClubMember, also select `status`
    - If `status === 'SUSPENDED'`, throw `ForbiddenException('Membership suspended')`
    - This blocks suspended members from ALL club-scoped endpoints automatically

- [ ] **Task 6: Backend unit tests** (AC: all)
  - [ ] Create `libs/api/features/src/lib/member/member.service.spec.ts`
  - [ ] Create `libs/api/features/src/lib/member/member.controller.spec.ts`
  - [ ] Test authorization matrix:
    - Owner can change any role except promote to Owner
    - Admin can promote Member→Admin, demote Admin→Member
    - Admin cannot demote self, cannot touch Owner
    - Member cannot change any role (403)
    - Sole owner cannot be removed/suspended
  - [ ] Test suspension blocks API access via ClubGuard
  - [ ] Test removal deletes ClubMember record

### Frontend

- [ ] **Task 7: API hooks for member management** (AC: #1, #2, #3, #4)
  - [ ] Create `libs/frontend/data-access/src/lib/hooks/useMembers.ts`:
    - `useUpdateMemberRole(clubId, memberId)` — TanStack mutation, invalidates `['club-members', clubId]`
    - `useRemoveMember(clubId, memberId)` — TanStack mutation
    - `useSuspendMember(clubId, memberId)` — TanStack mutation
    - `useUnsuspendMember(clubId, memberId)` — TanStack mutation
  - [ ] Attach auth token via fetchApi (Bearer header)
  - [ ] Handle error responses: map API error codes to French toast messages

- [ ] **Task 8: Role change UI** (AC: #1, #2)
  - [ ] Create `libs/frontend/features/src/lib/members/components/RoleChangeSheet.tsx`:
    - Mobile: shadcn/ui Sheet with role radio options (Member / Admin)
    - Desktop: shadcn/ui Dialog with Select dropdown
    - Shows current role highlighted
    - Disables Owner option (cannot promote to Owner)
    - On confirm: calls `useUpdateMemberRole` mutation
    - Success toast: "[Name] est maintenant [Role]"
  - [ ] Integrate into member directory row actions and member detail view

- [ ] **Task 9: Remove member UI** (AC: #3)
  - [ ] Create `libs/frontend/features/src/lib/members/components/RemoveMemberDialog.tsx`:
    - Confirmation Dialog: "Retirer [name] du club ?"
    - Subtitle: "[Name] ne pourra plus voir les événements, documents ou le chat du club."
    - Cancel button (ghost) + Remove button (destructive/red)
    - On confirm: calls `useRemoveMember` mutation
    - Success toast: "[name] a été retiré du club"
  - [ ] Owner protection: if target is sole owner, show disabled state with message

- [ ] **Task 10: Suspend member UI** (AC: #4)
  - [ ] Create `libs/frontend/features/src/lib/members/components/SuspendMemberDialog.tsx`:
    - Confirmation Dialog: "Suspendre [name] ?"
    - Subtitle: "[Name] ne pourra plus accéder aux données du club."
    - Cancel + Suspend buttons
    - On confirm: calls `useSuspendMember` mutation
  - [ ] Show "Suspended" badge (Badge variant) on suspended members in directory (admin/owner view only)
  - [ ] Add "Unsuspend" option for suspended members

- [ ] **Task 11: Member directory admin actions integration** (AC: #1, #2, #3, #4, #5)
  - [ ] Add action menu (3-dot menu or context actions) to member rows/cards:
    - "Changer le rôle" → opens RoleChangeSheet
    - "Suspendre" → opens SuspendMemberDialog (or "Réactiver" if suspended)
    - "Retirer du club" → opens RemoveMemberDialog
  - [ ] Conditionally render actions based on `request.clubRole`:
    - `MEMBER` role: no action menu visible
    - `ADMIN` role: show actions except on Owner rows
    - `OWNER` role: show all actions except remove/suspend self (sole owner)
  - [ ] Note: Member directory listing (story 4.2) may not exist yet — coordinate with 4.2 or build minimal list

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

### Debug Log References

### Completion Notes List

### File List
