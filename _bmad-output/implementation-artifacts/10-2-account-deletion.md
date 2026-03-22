# Story 10.2: Account Deletion

Status: ready-for-dev

## Story

As a user,
I want to request deletion of my account and all associated data,
so that I can exercise my RGPD right to erasure and leave the platform completely.

## Acceptance Criteria

1. **Given** I am a logged-in user, **When** I navigate to my profile settings and tap "Delete my account", **Then** a confirmation dialog appears (destructive pattern): "Supprimer votre compte ? Cette action est irréversible. Toutes vos données seront supprimées : profil, chiens, vaccins, documents, messages et historique de paiements." **And** the dialog has a "Annuler" secondary button and a red "Supprimer définitivement" destructive button.

2. **Given** I am the sole OWNER of one or more clubs (no other OWNER exists in ClubMember for that club), **When** I attempt to delete my account (DELETE /auth/account), **Then** the API returns 409 with `{ error: 'SOLE_CLUB_OWNER', clubs: [{ id, name }] }` **And** the frontend shows: "Vous êtes propriétaire de [club names]. Veuillez transférer la propriété ou supprimer ces clubs avant de supprimer votre compte." **And** links to each club's settings page are provided.

3. **Given** I am NOT a sole owner of any club and confirm deletion, **When** the API processes DELETE /auth/account, **Then** a full cascade deletion executes inside a Prisma $transaction:
   - EventParticipation records for my userId are deleted
   - VaccineRecords for all my Dogs are deleted
   - Documents for all my Dogs are deleted (DB records)
   - My Dogs are deleted
   - My ClubMember records are deleted (leave all clubs)
   - My ChatMessages are deleted
   - My Payments are anonymized: userId set to null (amount, date, status preserved for club accounting)
   - My Consent records are deleted
   - My User record is deleted
   **And** after the transaction, all R2 files for my Documents are deleted (best-effort, errors logged but do not block the response) **And** the refresh token cookie is cleared **And** the response is 204 No Content.

4. **Given** the deletion succeeds, **When** the frontend receives 204, **Then** `clearAuthState()` is called on the AuthContext, the user is redirected to `/` (landing/login page), **And** a final toast fires: "Votre compte a été supprimé".

5. **Given** the deletion is processing, **When** the cascade is running, **Then** a loading indicator is shown on the dialog button (spinner + "Suppression en cours...") and the button is disabled to prevent double-submit.

6. **Given** another member views chat history after deletion, **When** my messages were deleted, **Then** the chat thread shows no messages from my account (messages are removed, not anonymized — Epic 8 will revisit if anonymization becomes a product requirement).

7. **Given** my account is deleted, **When** an admin views the vaccine dashboard or member list, **Then** my dogs no longer appear and my member entry is gone.

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Prisma migration — make Payment.userId nullable** (AC: #3)
  - [ ] In `libs/shared/prisma-client/prisma/schema.prisma`: change `Payment.userId String` → `Payment.userId String?`
  - [ ] Run `pnpm nx run shared-prisma-client:generate` to generate migration
  - [ ] Verify migration file created in `libs/shared/prisma-client/prisma/migrations/`
  - [ ] **DO NOT** make `Event.creatorId` nullable in this story — Events created by the user are not in scope for deletion. If the user created events, those events remain (owned by the club) — set Event.userId to null if nullable, otherwise document that event creator is historical data only. Check schema: if `Event.creatorId` is non-nullable FK, add a small migration to make it nullable and null it on deletion.

- [ ] **Task 2: Add deleteAccount to AuthService** (AC: #2, #3)
  - [ ] In `libs/api/features/src/lib/auth/auth.service.ts`:
    - Inject `R2Service` (add to constructor: `private readonly r2Service: R2Service`)
    - Implement `async deleteAccount(userId: string): Promise<void>`
  - [ ] **Sole owner check** (before transaction):
    ```ts
    const soleOwnedClubs = await this.prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT c.id, c.name FROM "Club" c
      WHERE (
        SELECT COUNT(*) FROM "ClubMember" cm
        WHERE cm."clubId" = c.id AND cm.role = 'OWNER'
      ) = 1
      AND EXISTS (
        SELECT 1 FROM "ClubMember" cm
        WHERE cm."clubId" = c.id AND cm."userId" = ${userId} AND cm.role = 'OWNER'
      )
    `;
    if (soleOwnedClubs.length > 0) {
      throw new ConflictException({ error: 'SOLE_CLUB_OWNER', clubs: soleOwnedClubs });
    }
    ```
    Alternative using Prisma fluent API (avoid raw SQL if possible):
    ```ts
    const ownedClubs = await this.prisma.clubMember.findMany({
      where: { userId, role: 'OWNER' },
      include: { club: { select: { id: true, name: true } } },
    });
    const soleOwnedClubs = [];
    for (const m of ownedClubs) {
      const ownerCount = await this.prisma.clubMember.count({
        where: { clubId: m.clubId, role: 'OWNER' },
      });
      if (ownerCount === 1) soleOwnedClubs.push(m.club);
    }
    if (soleOwnedClubs.length > 0) {
      throw new ConflictException({ error: 'SOLE_CLUB_OWNER', clubs: soleOwnedClubs });
    }
    ```
  - [ ] **Collect document R2 keys before transaction**:
    ```ts
    const documents = await this.prisma.document.findMany({
      where: { userId },
      select: { fileUrl: true },
    });
    const r2Keys = documents.map(d => d.fileUrl);
    ```
    Note: `fileUrl` stores the R2 key (not a signed URL) — established in Story 7.1 spec.
  - [ ] **Cascade transaction**:
    ```ts
    await this.prisma.$transaction(async (tx) => {
      await tx.eventParticipation.deleteMany({ where: { userId } });
      const userDogs = await tx.dog.findMany({ where: { userId }, select: { id: true } });
      const dogIds = userDogs.map(d => d.id);
      await tx.vaccineRecord.deleteMany({ where: { dogId: { in: dogIds } } });
      await tx.document.deleteMany({ where: { userId } }); // covers dog-associated docs too
      await tx.dog.deleteMany({ where: { userId } });
      await tx.clubMember.deleteMany({ where: { userId } });
      await tx.chatMessage.deleteMany({ where: { userId } });
      await tx.payment.updateMany({ where: { userId }, data: { userId: null } });
      await tx.consent.deleteMany({ where: { userId } });
      // Handle createdEvents: set creatorId to null if nullable, or skip if not yet scoped
      // Check schema: if Event has creatorId FK to User (non-nullable), add to migration
      await tx.user.delete({ where: { id: userId } });
    });
    ```
  - [ ] **Post-transaction R2 cleanup** (best-effort):
    ```ts
    for (const key of r2Keys) {
      try {
        await this.r2Service.delete(key);
      } catch (err) {
        this.logger.error(`Failed to delete R2 key ${key} for deleted user ${userId}`, err);
      }
    }
    ```
  - [ ] Log: `this.logger.log('Account deleted: ' + userId)`

- [ ] **Task 3: Add DELETE /auth/account to AuthController** (AC: #2, #3, #4)
  - [ ] In `libs/api/features/src/lib/auth/auth.controller.ts`:
    ```ts
    @Delete('account')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard)
    async deleteAccount(
      @CurrentUser() user: JwtPayload,
      @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
      await this.authService.deleteAccount(user.sub);
      res.cookie(
        jwtConstants.refreshTokenCookieName,
        '',
        this.authService.getClearRefreshTokenCookieOptions(),
      );
    }
    ```
  - [ ] Import `Delete` from `@nestjs/common`
  - [ ] The 409 ConflictException from the service propagates automatically via the global exception filter

- [ ] **Task 4: Add R2Service to AuthModule** (AC: #3)
  - [ ] In `libs/api/features/src/lib/auth/auth.module.ts`:
    - Add `R2Service` to `providers: [AuthService, R2Service]`
    - Import `R2Service` from `'../document/r2.service.js'`
  - [ ] **Note**: `DocumentModule` does not exist yet (Story 7.1 creates it). For now, instantiate R2Service directly in AuthModule. When Story 7.1 creates `DocumentModule`, refactor to import DocumentModule and use its exported R2Service.

- [ ] **Task 5: Handle Event.creatorId FK constraint** (AC: #3)
  - [ ] Check `libs/shared/prisma-client/prisma/schema.prisma`: look for `Event` model's creator relation
  - [ ] If `Event.creatorId String` (non-nullable): add to the Prisma migration — `Event.creatorId String?` — and add `tx.event.updateMany({ where: { creatorId: userId }, data: { creatorId: null } })` before `tx.user.delete(...)` in the transaction
  - [ ] If already nullable or not present: skip

- [ ] **Task 6: Write backend tests** (AC: all)
  - [ ] In `libs/api/features/src/lib/auth/auth.service.spec.ts`:
    - Mock `PrismaService` and `R2Service`
    - Test: sole owner check throws 409 with clubs list
    - Test: non-sole-owner proceeds with full cascade (verify all Prisma deleteMany/updateMany called)
    - Test: R2 deletion called for each document key
    - Test: R2 failure is caught and logged, does not throw
    - Test: user.delete called last in transaction
  - [ ] In `libs/api/features/src/lib/auth/auth.controller.spec.ts`:
    - Test: `DELETE /auth/account` returns 204 and clears cookie
    - Test: `DELETE /auth/account` returns 409 if sole owner
    - Test: requires JwtAuthGuard (unauthenticated request returns 401)

### Frontend Tasks

- [ ] **Task 7: Implement ProfilePage with account deletion** (AC: #1, #4, #5)
  - [ ] Replace placeholder in `libs/frontend/features/src/lib/pages/ProfilePage.tsx`
  - [ ] Add a "Danger Zone" section at the bottom of the page
  - [ ] Button: destructive variant, label "Supprimer mon compte"
  - [ ] On click: open `<DeleteAccountDialog>` (see Task 8)

- [ ] **Task 8: Create DeleteAccountDialog component** (AC: #1, #2, #4, #5)
  - [ ] Create `libs/frontend/features/src/lib/pages/DeleteAccountDialog.tsx`
  - [ ] Uses existing `Dialog` from the UI lib (or shadcn/radix Dialog component)
  - [ ] **Dialog content**:
    - Title: "Supprimer votre compte ?"
    - Body: "Cette action est irréversible. Toutes vos données seront supprimées : profil, chiens, vaccins, documents, messages et historique de paiements."
    - Buttons: "Annuler" (secondary, closes dialog) + "Supprimer définitivement" (red/destructive)
  - [ ] **On "Supprimer définitivement" click**:
    - Set loading state → show spinner + "Suppression en cours..." + disable button
    - Call `apiClient.delete('/auth/account')`
    - **On success (204)**: call `logout()` from `useAuth()` (which calls `clearAuthState()`), navigate to `/`, show toast: "Votre compte a été supprimé"
    - **On 409** (`error.response.data.error === 'SOLE_CLUB_OWNER'`): close dialog, show blocking message with club list and links to club settings
    - **On other error**: show error toast "Une erreur est survenue, veuillez réessayer"

- [ ] **Task 9: Add useDeleteAccount hook** (AC: #4, #5)
  - [ ] Create `libs/frontend/features/src/lib/pages/useDeleteAccount.ts` (or inline in dialog)
  - [ ] Uses `useMutation` from TanStack Query (or simple async state — no query key invalidation needed since we log out)
  - [ ] `mutationFn: () => apiClient.delete('/auth/account')`

- [ ] **Task 10: Write frontend tests** (AC: #1, #2, #4, #5)
  - [ ] Create `libs/frontend/features/src/lib/pages/DeleteAccountDialog.test.tsx`
  - [ ] Test: dialog renders with correct text
  - [ ] Test: "Annuler" closes dialog without API call
  - [ ] Test: confirms calls DELETE /auth/account, shows loading state
  - [ ] Test: on success, calls logout() and redirects to /
  - [ ] Test: on 409 sole owner, shows club list with links
  - [ ] Test: on error, shows error toast

## Dev Notes

### Guard Strategy

- `DELETE /auth/account` uses `@UseGuards(JwtAuthGuard)` ONLY — no `ClubGuard` needed because account deletion is user-scoped, not tenant-scoped. The user may be deleting themselves out of all clubs.
- Standard guard chain for this endpoint: `JwtAuthGuard` → controller (no ClubGuard, no RolesGuard).

### Transaction Ordering (Critical)

Prisma FK constraints require strict deletion order. Default `onDelete` is `Restrict` — deleting a parent when children exist will throw a FK violation. Follow this order inside `$transaction`:

1. `eventParticipation.deleteMany` — FK to User
2. `vaccineRecord.deleteMany` — FK to Dog (collect dogIds first)
3. `document.deleteMany` — FK to User/Dog
4. `dog.deleteMany` — FK to User
5. `clubMember.deleteMany` — FK to User
6. `chatMessage.deleteMany` — FK to User
7. `payment.updateMany` — set userId null (userId must be nullable — see migration Task 1)
8. `consent.deleteMany` — FK to User
9. `event.updateMany` (creatorId → null) — if creatorId is non-nullable (see Task 5)
10. `user.delete` — the user itself

**Collect document fileUrls BEFORE the transaction** — after the transaction they are deleted from DB.

### R2 File Deletion

- `Document.fileUrl` stores the R2 storage key directly (not a signed URL). Established by Story 7.1 spec: `fileUrl` = `${clubId}/documents/${userId}/${timestamp}-${originalFilename}`.
- Post-transaction, iterate keys and call `r2Service.delete(key)` best-effort.
- Failure to delete from R2 is logged at ERROR level but does NOT fail the response. The user is already deleted from DB.

### JWT "Invalidation"

- Access tokens (15min) are stateless — cannot be server-side invalidated.
- The refresh token cookie (httpOnly) is cleared in the controller response — this prevents token renewal.
- The client's AuthContext is cleared via `clearAuthState()` — removes the in-memory access token.
- The 15-minute window before access token natural expiry is an acceptable RGPD tradeoff (standard industry practice).

### Payment Anonymization

- `Payment.userId` will be nullable after the migration in Task 1.
- `updateMany({ where: { userId }, data: { userId: null } })` preserves amount, date, status, stripeSessionId for club accounting — compliant with RGPD (financial records retention obligation).

### Chat Messages

- Current schema: `ChatMessage.userId` is a non-nullable FK to User.
- Approach for this story: hard delete (`chatMessage.deleteMany({ where: { userId } })`).
- Epic 8 (Chat) will revisit whether to show "Utilisateur supprimé" placeholder — that will require making `userId` nullable or storing `senderNameSnapshot` separately. Out of scope for Story 10.2.

### AuthContext.logout vs clearAuthState

- Do NOT call `logout()` (which calls `POST /auth/logout`) after a successful account deletion — the user account no longer exists, the logout API call would fail.
- Call `clearAuthState()` directly, or expose it from `useAuth()` context. Check `AuthContext.tsx`: `clearAuthState` is defined internally but not currently exported via context value. Options:
  1. Add `clearAuthState` to `AuthContextValue` interface and export it
  2. Or: since the user record is deleted, `logout()` will get a 401 which `clearAuthState()` catches anyway — calling `logout()` is safe (the catch block calls `clearAuthState()` regardless)
  3. Simplest: reuse existing `logout()` — the `try/catch` in `AuthContext.logout` ensures `clearAuthState()` is always called even on error

### Frontend Routing After Deletion

- After `clearAuthState()`, the existing `ProtectedRoute` component should redirect unauthenticated users to `/`. No additional routing logic needed.
- Show the success toast BEFORE calling `logout()` to avoid timing issues where the component unmounts before the toast fires. Use a global toast store (outside React tree) — `toast` from `@org/ui` is already used this way in AuthContext.

### Project Structure Notes

- `DELETE /auth/account` belongs in `auth.module.ts` / `auth.controller.ts` / `auth.service.ts` — confirmed by architecture RGPD endpoint mapping: `DELETE /auth/account` → auth module.
- No new module needed. R2Service is added as a provider to AuthModule temporarily until DocumentModule (Story 7.1) is created.
- `DeleteAccountDialog.tsx` co-located with `ProfilePage.tsx` in `libs/frontend/features/src/lib/pages/`.
- Tests co-located: `DeleteAccountDialog.test.tsx` in same folder.

### Sole Owner Check — Performance Note

The fluent API approach (loop with individual count queries) issues N+1 queries. For typical users (< 5 clubs), this is acceptable. If performance becomes an issue, replace with a single `$queryRaw` query.

### References

- Epic 10 acceptance criteria: `_bmad-output/planning-artifacts/epics.md` — Epic 10 / Story 10.2
- RGPD endpoint mapping: `_bmad-output/planning-artifacts/architecture.md` — "RGPD endpoints not explicitly mapped" gap resolution
- Auth service patterns: `libs/api/features/src/lib/auth/auth.service.ts`
- Auth controller patterns: `libs/api/features/src/lib/auth/auth.controller.ts`
- R2Service: `libs/api/features/src/lib/document/r2.service.ts`
- R2 key storage convention: `_bmad-output/implementation-artifacts/7-1-document-upload-association.md` — Task 3 specifies `fileUrl` = R2 key
- AuthContext / clearAuthState: `libs/frontend/data-access/src/lib/AuthContext.tsx` lines 90-96
- Prisma schema: `libs/shared/prisma-client/prisma/schema.prisma`
- Guard chain: `_bmad-output/planning-artifacts/architecture.md` — "Guard chain" section
- NestJS module pattern: `libs/api/features/src/lib/auth/auth.module.ts`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
