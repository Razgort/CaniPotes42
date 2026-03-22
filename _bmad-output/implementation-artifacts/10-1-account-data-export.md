# Story 10.1: Account Data Export

Status: ready-for-dev

## Story

As a user,
I want to request and download an export of all my personal data,
so that I can exercise my RGPD right of access and portability.

## Acceptance Criteria

1. **Export Request Trigger**
   - **Given** I am a logged-in user
   - **When** I navigate to my Profile page and tap "Exporter mes données"
   - **Then** a loading indicator appears with: "Préparation de vos données en cours..."
   - **And** the button is disabled to prevent duplicate requests

2. **Export Data Scope**
   - **Given** I confirm the export request
   - **When** the API processes it
   - **Then** the export JSON contains ALL of my personal data across ALL clubs I belong to:
     - User profile: `firstName`, `lastName`, `email`, `avatarUrl`, `createdAt`
     - Club memberships: `clubName`, `role`, `status`, `joinDate` (one entry per club)
     - Dogs: `name`, `breed`, `birthdate`, `chipNumber` per dog (all clubs)
     - Vaccine records: `vaccineName`, `dateAdministered`, `expiryDate` per dog
     - Document metadata: `type`, `fileName`, `expiryDate`, `uploadedAt` (NOT the files themselves)
     - Chat messages sent by me: `content`, `createdAt`, `channelName`, `clubName`
     - Payment history: `amount`, `status`, `createdAt`, `licenseType`, `season`, `clubName`
   - **And** only MY data is included — no other members' data
   - **And** no internal UUIDs of other users are exposed
   - **And** all dates are in ISO 8601 format

3. **File Download**
   - **Given** the API returns the export data
   - **When** processing completes
   - **Then** a JSON file download is triggered automatically in the browser
   - **And** the filename is `mes-donnees-canifed-{YYYY-MM-DD}.json`
   - **And** a success toast shows: "Vos données sont prêtes à télécharger"
   - **And** the toast auto-dismisses after 3 seconds

4. **Error Handling**
   - **Given** the export request fails (network or server error)
   - **When** the error is received
   - **Then** a persistent red toast appears: "Impossible d'exporter vos données. Veuillez réessayer."
   - **And** the export button is re-enabled

## Tasks / Subtasks

### Backend

- [ ] **Task 1: Account export service** (AC: #2)
  - [ ] Create `libs/api/features/src/lib/member/account.service.ts`
  - [ ] `@Injectable()` class `AccountService` with `constructor(private readonly prisma: PrismaService)`
  - [ ] Method `exportUserData(userId: string): Promise<UserDataExport>`:
    - Query `User` by `userId`, select: `id, firstName, lastName, email, avatarUrl, createdAt`
    - Query `ClubMember` where `userId`, include `club` (name, federationType), select: role, status, createdAt
    - Query `Dog` where `userId`, include `vaccineRecords` (vaccineName, dateAdministered, expiryDate), select all Dog fields
    - Query `Document` where `userId`, include `club` (name), select: type, fileName, expiryDate, createdAt (NOT fileUrl)
    - Query `ChatMessage` where `userId`, include `channel` (name) + `channel.club` (name), select: content, createdAt
    - Query `Payment` where `userId`, include `licenseType` (name, season) + `club` (name), select: amount, status, createdAt
    - Assemble and return `UserDataExport` object
  - [ ] Map all `DateTime` fields to `.toISOString()` — never raw Date objects
  - [ ] Use `this.logger = new Logger(AccountService.name)` — never `console.log`

- [ ] **Task 2: Account export controller** (AC: #2)
  - [ ] Create `libs/api/features/src/lib/member/account.controller.ts`
  - [ ] `@Controller('members')` with `@UseGuards(JwtAuthGuard)` ONLY (no ClubGuard — cross-club operation)
  - [ ] `GET /members/me/export` endpoint:
    ```typescript
    @Get('me/export')
    async exportMyData(@CurrentUser() user: JwtPayload) {
      return this.accountService.exportUserData(user.sub);
    }
    ```
  - [ ] **CRITICAL**: This controller must be registered BEFORE `MemberController` in `member.module.ts` so the literal `me` route is resolved before `:memberId`
  - [ ] The `ResponseWrapperInterceptor` auto-wraps — return plain object, not `{ data: ... }`

- [ ] **Task 3: Zod schema for export response** (AC: #2)
  - [ ] Add `UserDataExport` TypeScript interface in `libs/shared/types/src/lib/schemas/member.schema.ts`:
    ```typescript
    export interface UserDataExport {
      exportedAt: string; // ISO 8601
      profile: {
        firstName: string;
        lastName: string;
        email: string;
        avatarUrl: string | null;
        memberSince: string;
      };
      memberships: Array<{
        clubName: string;
        federationType: string | null;
        role: string;
        status: string;
        joinedAt: string;
      }>;
      dogs: Array<{
        name: string;
        breed: string | null;
        birthdate: string | null;
        chipNumber: string | null;
        vaccineRecords: Array<{
          vaccineName: string;
          dateAdministered: string;
          expiryDate: string | null;
        }>;
      }>;
      documents: Array<{
        type: string;
        fileName: string;
        expiryDate: string | null;
        uploadedAt: string;
        clubName: string;
      }>;
      chatMessages: Array<{
        content: string;
        channelName: string;
        clubName: string;
        sentAt: string;
      }>;
      payments: Array<{
        amount: string; // Decimal as string
        status: string;
        licenseType: string;
        season: string;
        clubName: string;
        paidAt: string;
      }>;
    }
    ```
  - [ ] Export from `libs/shared/types/src/index.ts`

- [ ] **Task 4: Register in member module** (AC: #2)
  - [ ] Update `libs/api/features/src/lib/member/member.module.ts`:
    - Add `AccountController` to `controllers` array — **before** `MemberController`
    - Add `AccountService` to `providers` array
  - [ ] Ensure `CoreModule` is imported (provides `PrismaService`, guards, decorators)

- [ ] **Task 5: Backend tests** (AC: #2, #4)
  - [ ] Create `libs/api/features/src/lib/member/account.service.spec.ts`:
    - `exportUserData` returns all 6 data sections
    - Empty sections return empty arrays (user with no dogs, no payments, etc.)
    - All dates are ISO 8601 strings
    - Only userId-owned data is included (no other users' data)
  - [ ] Create `libs/api/features/src/lib/member/account.controller.spec.ts`:
    - `GET /members/me/export` — 200 with export data for authenticated user
    - `GET /members/me/export` — 401 without auth token
    - `GET /members/:memberId` — still resolves correctly (route conflict regression test)

### Frontend

- [ ] **Task 6: API client method** (AC: #2, #3)
  - [ ] Update `libs/frontend/data-access/src/lib/api-client.ts`:
    - Add `exportMyData(): Promise<UserDataExport>` — calls `GET /members/me/export`
    - No clubId header needed — this is a cross-club endpoint (JwtAuthGuard only)
    - Returns parsed JSON response directly
  - [ ] Export `UserDataExport` type from `libs/frontend/data-access/src/index.ts` (import from `@org/types`)

- [ ] **Task 7: ProfilePage with export UI** (AC: #1, #2, #3, #4)
  - [ ] Update `libs/frontend/features/src/lib/pages/ProfilePage.tsx` (currently placeholder):
    - Add `useExportData()` custom hook using `TanStack Query` with `enabled: false` (manual trigger)
    - Layout:
      ```
      ProfilePage
      ├── Section: "Mon profil" — displays firstName, lastName, email, avatarUrl (read-only for now)
      └── Section: "Données personnelles" (RGPD)
          ├── Description: "Téléchargez une copie de toutes vos données personnelles."
          └── Button: "Exporter mes données" (outline variant, Download icon from lucide-react)
      ```
    - On button click → call `refetch()` from TanStack Query
    - While loading: button shows spinner + disabled, text shows "Préparation de vos données en cours..."
    - On success: trigger JSON file download + show green success toast
    - On error: show persistent red toast "Impossible d'exporter vos données. Veuillez réessayer."
  - [ ] **File download trigger pattern** (no backend streaming needed):
    ```typescript
    const triggerDownload = (data: UserDataExport) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      a.href = url;
      a.download = `mes-donnees-canifed-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    ```
  - [ ] Use `shadcn/ui` `Button` (outline variant), `Separator` between sections
  - [ ] Wrap export in try/catch — `useQuery` `onError` → show persistent toast via `toast.error()`
  - [ ] Use `toast.success()` for success (auto-dismiss 3s is Sonner/shadcn/ui default)

- [ ] **Task 8: Frontend tests** (AC: #1, #3, #4)
  - [ ] Create `libs/frontend/features/src/lib/pages/ProfilePage.test.tsx`:
    - Renders "Exporter mes données" button
    - Shows loading state when export is in progress
    - Triggers file download on success (mock `URL.createObjectURL`)
    - Shows success toast after download
    - Shows error toast on API failure
    - Button re-enables after error

## Dev Notes

### Architecture Compliance

- **Guard chain**: `AccountController` uses `@UseGuards(JwtAuthGuard)` ONLY — ClubGuard is intentionally absent because export spans all clubs the user belongs to (cross-club operation, same pattern as `GET /auth/my-clubs` in Story 4.4)
- **Route ordering**: `AccountController` MUST be in `controllers` array before `MemberController` in `member.module.ts` to prevent `GET /members/me/export` from matching `:memberId = 'me'`
- **Response format**: `ResponseWrapperInterceptor` auto-wraps all responses to `{ data: {...} }`. Return plain object from controller. On frontend, access via `response.data`.
- **Dates**: All `DateTime` Prisma fields → `.toISOString()` — the `fr-FR` display formatting happens on the frontend via `Intl.DateTimeFormat`
- **Decimal fields**: Prisma `Decimal` (Payment.amount) → `.toString()` to avoid serialization issues
- **Logging**: `new Logger(AccountService.name)` — use `this.logger.log()` for info, `this.logger.error()` for errors
- **Validation**: No request body to validate — endpoint is `GET /members/me/export` with no query params
- **No ClubGuard = no `currentClub`**: Use `@CurrentUser()` to get `userId`, query by `userId` directly

### Critical Implementation Details

1. **Route conflict prevention**: NestJS resolves routes in registration order. `GET /members/me/export` (literal `me`) MUST be registered before `GET /members/:memberId` (param capture). This is achieved by placing `AccountController` first in the `controllers` array of `member.module.ts`. Failure to do this causes `me` to be interpreted as a `:memberId` UUID → 400 or 404.

2. **No streaming/presigned URLs for MVP**: The export is synchronous — the API assembles all data in memory and returns it in a single response. The frontend creates a `Blob` and triggers a browser download. This avoids the complexity of async job queues, R2 storage for exports, and polling mechanisms. This is acceptable for MVP as user data volumes are small.

3. **Data privacy in export**: The export must NOT include:
   - Other users' UUIDs or personal data
   - `fileUrl` values from `Document` table (signed R2 URLs expire and contain internal paths)
   - `passwordHash` from `User` table
   - Club-internal data the user shouldn't see (other members' data)
   - Only include `Document.fileName`, `Document.type`, `Document.expiryDate` (metadata only)

4. **Frontend download pattern**: Use `Blob` + `URL.createObjectURL` + programmatic `<a>` click. Do NOT use `window.open()` (blocked by popup blockers) or `window.location.href` (navigates away). Always call `URL.revokeObjectURL(url)` after click to release memory.

5. **TanStack Query for manual trigger**: Use `useQuery` with `enabled: false` + `refetch()` on button click rather than `useMutation`. The export is a GET (idempotent read), not a state mutation. Pattern:
   ```typescript
   const { refetch, isFetching, isError } = useQuery({
     queryKey: ['data-export'],
     queryFn: () => apiClient.exportMyData(),
     enabled: false,
   });
   ```

6. **Toast library**: The project uses `shadcn/ui` which includes Sonner. Use `toast.success()` and `toast.error()` from `sonner`. Success toasts auto-dismiss (default 4s). Error toasts for this feature should be persistent (use `toast.error(message, { duration: Infinity })`).

### Existing Code to Reuse

| What | Location | Notes |
|------|----------|-------|
| `JwtAuthGuard` | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Only guard needed on AccountController |
| `@CurrentUser()` | `libs/api/core/src/lib/decorators/current-user.decorator.ts` | Get `user.sub` (userId) |
| `PrismaService` | `libs/api/core/src/lib/prisma.service.ts` | Import via `@org/api-core` |
| `MemberModule` | `libs/api/features/src/lib/member/member.module.ts` | Add AccountController + AccountService here |
| `ProfilePage.tsx` | `libs/frontend/features/src/lib/pages/ProfilePage.tsx` | Currently "Coming soon" placeholder — replace content |
| `apiClient` | `libs/frontend/data-access/src/lib/api-client.ts` | Add `exportMyData()` method |
| `useAuth()` | `libs/frontend/data-access/src/lib/AuthContext.tsx` | Get current user profile info for display |
| `Button`, `Separator` | `libs/frontend/ui/src/` (shadcn/ui) | UI primitives |
| `Download` icon | `lucide-react` (already in deps) | Export button icon |
| `toast` | `sonner` (already in deps via shadcn/ui) | Success/error notifications |
| `UserDataExport` type | `libs/shared/types/src/lib/schemas/member.schema.ts` | Define here, import on frontend |

### File Structure (New Files)

```
Backend:
libs/api/features/src/lib/member/
  account.controller.ts         ← GET /members/me/export (JwtAuthGuard only)
  account.service.ts            ← exportUserData() aggregation logic
  account.controller.spec.ts
  account.service.spec.ts
  member.module.ts              ← modified: register AccountController + AccountService

libs/shared/types/src/lib/schemas/
  member.schema.ts              ← modified: add UserDataExport interface

Frontend:
libs/frontend/features/src/lib/pages/
  ProfilePage.tsx               ← modified: replace placeholder with export UI
  ProfilePage.test.tsx          ← new

libs/frontend/data-access/src/lib/
  api-client.ts                 ← modified: add exportMyData()
```

### Prisma Query Pattern for Export

```typescript
// In AccountService.exportUserData(userId: string)

const user = await this.prisma.user.findUniqueOrThrow({
  where: { id: userId },
  select: { firstName: true, lastName: true, email: true, avatarUrl: true, createdAt: true },
});

const memberships = await this.prisma.clubMember.findMany({
  where: { userId },
  include: { club: { select: { name: true, federationType: true } } },
});

const dogs = await this.prisma.dog.findMany({
  where: { userId },
  include: { vaccineRecords: { select: { vaccineName: true, dateAdministered: true, expiryDate: true } } },
});

const documents = await this.prisma.document.findMany({
  where: { userId },
  include: { club: { select: { name: true } } },
  select: { type: true, fileName: true, expiryDate: true, createdAt: true, club: true },
  // NOTE: Do NOT select fileUrl — document metadata only
});

const chatMessages = await this.prisma.chatMessage.findMany({
  where: { userId },
  include: { channel: { select: { name: true, club: { select: { name: true } } } } },
  select: { content: true, createdAt: true, channel: true },
  orderBy: { createdAt: 'desc' },
  take: 1000, // Safety limit — prevent runaway queries for heavy chatters
});

const payments = await this.prisma.payment.findMany({
  where: { userId },
  include: {
    licenseType: { select: { name: true, season: true } },
    club: { select: { name: true } },
  },
});
```

### NestJS Module Pattern (member.module.ts modification)

```typescript
@Module({
  imports: [CoreModule],
  controllers: [
    AccountController,  // ← FIRST: handles GET /members/me/export (literal route)
    MemberController,   // ← SECOND: handles GET /members/:memberId (param route)
    InvitationController,
  ],
  providers: [MemberService, InviteService, AccountService],
})
export class MemberModule {}
```

### Anti-Patterns to Avoid

- **DO NOT** use `ClubGuard` on `AccountController` — export is cross-club; adding ClubGuard requires a valid `activeClubId` in JWT and scopes queries to one club
- **DO NOT** include `Document.fileUrl` in export — these are internal R2 paths/signed URLs
- **DO NOT** include `User.passwordHash` in export — never expose password hashes
- **DO NOT** use streaming (`@Res()`) — return plain JSON object; `ResponseWrapperInterceptor` handles the envelope; frontend creates the Blob
- **DO NOT** store exported JSON in R2 — synchronous in-memory export is sufficient for MVP
- **DO NOT** use `window.open()` for download — use Blob + programmatic anchor click (popup blocker safe)
- **DO NOT** place `AccountController` after `MemberController` in module — route `me` will match `:memberId` param instead
- **DO NOT** skip `URL.revokeObjectURL(url)` — memory leak in long-running sessions
- **DO NOT** expose other users' UUIDs or personal data — query by `userId` only, aggregate own data only

### RGPD / GDPR Context

- This story fulfills **FR46** (data export right / droit d'accès) from the PRD
- The export covers all data categories defined in GDPR Art. 15 right of access
- Response must be machine-readable (JSON) and human-understandable (clear field names, no internal codes)
- Story 10.2 (account deletion) fulfills the complementary right to erasure — do not implement deletion logic here

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 10, Story 10.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — GDPR endpoints FR46-FR49, GET /members/me/export]
- [Source: _bmad-output/planning-artifacts/architecture.md — Guard chain, ClubGuard, JwtAuthGuard]
- [Source: _bmad-output/planning-artifacts/architecture.md — Response envelope pattern, ResponseWrapperInterceptor]
- [Source: _bmad-output/planning-artifacts/architecture.md — Tech stack: NestJS 11, Prisma 7.5, React 19, TanStack Query, shadcn/ui]
- [Source: _bmad-output/implementation-artifacts/4-4-club-switcher-multi-club-navigation.md — Cross-club endpoint pattern (JwtAuthGuard only, no ClubGuard)]
- [Source: _bmad-output/implementation-artifacts/4-3-role-management-member-administration.md — Guard chain, Logger pattern, Prisma query conventions]
- [Source: libs/api/features/src/lib/member/member.controller.ts — Existing controller structure, guard usage]
- [Source: libs/api/features/src/lib/member/member.service.ts — Existing service patterns, PrismaService usage]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — All models: User, ClubMember, Dog, VaccineRecord, Document, ChatMessage, Payment, Consent]
- [Source: libs/frontend/features/src/lib/pages/ProfilePage.tsx — Current placeholder, will be replaced]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
