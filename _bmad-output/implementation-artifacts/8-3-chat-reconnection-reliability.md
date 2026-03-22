# Story 8.3: Chat Reconnection & Reliability

Status: ready-for-dev

## Story

As a club member,
I want my chat to recover gracefully from connection drops and never lose messages,
So that I can trust the chat even on spotty mobile networks at outdoor events.

## Acceptance Criteria

1. **Given** my WebSocket connection drops (network change, phone sleep, server restart), **When** the client detects disconnection, **Then** a subtle inline indicator appears: "Reconnexion en cours..." (no blocking modal or error toast), **And** Socket.IO's built-in reconnection strategy activates (exponential backoff — 1s base, 10s max, 0.5 jitter).

2. **Given** the WebSocket reconnects, **When** the connection is re-established, **Then** the client automatically fetches all messages sent since the last received message timestamp (`GET /messages?channelId=<id>&since=<ISO8601>`) via REST, **And** missed messages appear in the correct chronological position in the chat, **And** the reconnection indicator disappears, **And** no duplicate messages are displayed (deduplication by message ID).

3. **Given** a message is sent while offline (WebSocket disconnected), **When** the user taps Send, **Then** the message is queued locally in memory with a "pending" visual indicator (clock icon, gray bubble), **And** when reconnection succeeds the queued message is sent automatically, **And** the pending indicator is replaced with the delivered state (no clock icon).

4. **Given** all messages are persisted in PostgreSQL, **When** the server restarts, **Then** no messages are lost — all chat history is available via REST API `GET /messages` fetch on reconnect (NFR23, NFR24).

5. **Given** I switch clubs via the ClubSwitcher, **When** the active club changes, **Then** the WebSocket leaves the previous club's channel rooms (`socket.emit('chat:leave-channel', { channelId })`), **And** joins the new club's channel rooms (`socket.emit('chat:join-channel', { channelId, clubId })`), **And** the chat view refreshes to show the new club's channels and messages.

## Dependencies

**CRITICAL:** This story adds the reliability layer on top of Story 8.1 (Chat Channels & Text Messaging) and Story 8.2 (Chat Image Sharing & Message History). Stories 8.1 and 8.2 MUST be implemented first. Story 8.3 extends the `ChatGateway`, `ChatService`, `useChat` hook, and channel components — it does NOT create them from scratch.

## Tasks / Subtasks

### Backend

- [ ] Task 1: Missed Messages REST Endpoint (AC: #2, #4)
  - [ ] 1.1 Add `GET /channels/:channelId/messages?since=<ISO8601>` to `chat.controller.ts`
  - [ ] 1.2 Add `getMissedMessages(channelId: string, since: Date, clubId: string)` to `chat.service.ts`
  - [ ] 1.3 Prisma query: `findMany({ where: { channelId, clubId, createdAt: { gt: since } }, orderBy: { createdAt: 'asc' } })`
  - [ ] 1.4 Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard)` — members can read (no RolesGuard)
  - [ ] 1.5 Response: `{ data: ChatMessage[] }` (200); 404 if channel not in club; 400 if `since` is invalid ISO8601
  - [ ] 1.6 Validate `channelId` belongs to `request.clubId` — never expose cross-club messages
  - [ ] 1.7 Add unit tests in `chat.service.spec.ts` for `getMissedMessages` (happy path, cross-club rejection, invalid since)
  - [ ] 1.8 Add unit tests in `chat.controller.spec.ts` for `GET /channels/:channelId/messages` (200, 400, 404)

- [ ] Task 2: Gateway Reconnection Handling (AC: #5)
  - [ ] 2.1 In `chat.gateway.ts`, handle `handleConnection` to re-join rooms when client reconnects (Socket.IO fires `handleConnection` on each new socket)
  - [ ] 2.2 Implement `@SubscribeMessage('chat:leave-channel')` handler: validate clubId, call `socket.leave(room)`
  - [ ] 2.3 Verify JWT re-validation on each new Socket.IO connection in `handleConnection` (already in 8.1 — confirm it's there)
  - [ ] 2.4 Add unit tests for `leave-channel` handler

### Frontend

- [ ] Task 3: Socket.IO Client Reconnection Configuration (AC: #1)
  - [ ] 3.1 In `useChat.ts`, configure socket with reconnection options:
    ```ts
    const socket = io(WS_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });
    ```
  - [ ] 3.2 Track `isConnected` state: `true` on `connect` event, `false` on `disconnect` event
  - [ ] 3.3 Track `isReconnecting` state: `true` on `reconnect_attempt` event, `false` on `connect` event

- [ ] Task 4: Reconnection Indicator UI (AC: #1)
  - [ ] 4.1 Add inline `ReconnectingBanner` inside `ChatChannel.tsx` — render only when `isReconnecting === true`
  - [ ] 4.2 Banner: subtle top-of-chat bar, no modal, no toast. Text: "Reconnexion en cours..." with a small spinner (EXCEPTION: spinner is acceptable for connection status per architecture loading state rules)
  - [ ] 4.3 Banner disappears when `isConnected` becomes `true`
  - [ ] 4.4 Add `ReconnectingBanner.test.tsx` — renders when disconnected, hides when connected

- [ ] Task 5: Missed Message Fetch on Reconnect (AC: #2)
  - [ ] 5.1 In `useChat.ts`, store `lastReceivedAt: string | null` (ISO8601 of last message's `createdAt`)
  - [ ] 5.2 On `connect` event (after first connection, on reconnect): if `lastReceivedAt` is set, call `GET /channels/:channelId/messages?since=<lastReceivedAt>` via `api-client.ts`
  - [ ] 5.3 Merge fetched messages into local state, deduplicating by `id` (use `Set<string>` of known IDs)
  - [ ] 5.4 Insert missed messages at correct chronological position (sort by `createdAt`)
  - [ ] 5.5 Update `lastReceivedAt` from the latest message received (both WebSocket and REST responses)
  - [ ] 5.6 Add tests in `useChat.test.ts` — reconnect triggers fetch, deduplication works, insertion order correct

- [ ] Task 6: Offline Message Queue (AC: #3)
  - [ ] 6.1 In `useChat.ts`, maintain `pendingMessages: PendingMessage[]` state (in-memory only — no localStorage needed)
  - [ ] 6.2 `PendingMessage` type: `{ id: string (client-generated UUID), content: string, imageUrl?: string, queuedAt: Date }`
  - [ ] 6.3 When `sendMessage` is called and `!isConnected`: push to `pendingMessages`, show in `ChatBubble` with clock icon + gray tint
  - [ ] 6.4 On `connect` event after reconnect: drain `pendingMessages` in order (emit `chat:send` for each), clear queue
  - [ ] 6.5 When server confirms message via `chat:message` event: match by content+queuedAt or by replacing pending with confirmed, remove from `pendingMessages`
  - [ ] 6.6 Add tests: offline queue accumulates, drains on reconnect, pending indicator shown/removed

- [ ] Task 7: Pending Message Visual (AC: #3)
  - [ ] 7.1 Update `ChatBubble.tsx` to accept `isPending?: boolean` prop
  - [ ] 7.2 When `isPending === true`: gray tint on bubble, clock icon (use lucide-react `Clock` icon, 14px) appended after timestamp
  - [ ] 7.3 When delivered: normal styling, no clock icon
  - [ ] 7.4 Add `ChatBubble.test.tsx` — pending vs delivered visual states

- [ ] Task 8: Club Switch Room Management (AC: #5)
  - [ ] 8.1 In `useChat.ts`, subscribe to `activeClub` from `AuthContext`
  - [ ] 8.2 On `activeClub` change: emit `chat:leave-channel` for all channels of previous club, then emit `chat:join-channel` for new club's channels
  - [ ] 8.3 Reset `lastReceivedAt` and `pendingMessages` on club switch (messages are club-scoped)
  - [ ] 8.4 Add tests — club switch triggers leave/join events, state resets

## Dev Notes

### Architecture Compliance

**CRITICAL — Guard chain:** All new REST endpoints must use `JwtAuthGuard → ClubGuard`. The `clubId` comes from `request.clubId` (set by ClubGuard from JWT `activeClubId`). Never trust `clubId` from request body for security decisions.

**CRITICAL — Multi-tenant isolation:** The missed messages query MUST filter by BOTH `channelId` AND `clubId` (via channel ownership). Verify the channel belongs to the requesting club before returning messages. A failure here is a data breach.

**CRITICAL — No chat module from scratch:** Stories 8.1 and 8.2 create `chat.module.ts`, `chat.gateway.ts`, `chat.service.ts`, `ChatChannel.tsx`, `ChatBubble.tsx`, `useChat.ts`. Story 8.3 EXTENDS these — read them before touching anything.

**WebSocket event naming:** Follow `kebab-case` with namespace convention:
- Server → Client: `chat:message`, `chat:reconnected`
- Client → Server: `chat:send`, `chat:join-channel`, `chat:leave-channel`
- Payload always includes `clubId` for server-side validation

### API Contract

**GET /channels/:channelId/messages**
- Guards: `JwtAuthGuard, ClubGuard`
- Query params: `since` (required, ISO8601 string), e.g., `?since=2026-03-22T10:00:00.000Z`
- Response: `{ data: ChatMessage[] }` (200, ordered by `createdAt` ASC)
- Errors: 400 (missing/invalid `since`), 404 (channel not in club), 401, 403

**POST /channels/:channelId/messages (for sending — from 8.1)**
- This endpoint is added in 8.1. In 8.3, queued messages are sent via Socket.IO `chat:send`, NOT via REST POST.

### Prisma Models (Already Migrated — DO NOT add new migrations)

```prisma
model ChatChannel {
  id        String   @id @default(uuid())
  clubId    String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  club      Club     @relation(...)
  messages  ChatMessage[]
  @@index([clubId])
}

model ChatMessage {
  id        String   @id @default(uuid())
  channelId String
  userId    String
  content   String
  imageUrl  String?
  createdAt DateTime @default(now())
  channel   ChatChannel @relation(...)
  user      User        @relation(...)
  @@index([channelId])
}
```

Note: `ChatMessage` does NOT have a `clubId` column — club isolation is via the `ChatChannel.clubId` relationship. Queries must JOIN through channel to get clubId, or validate channel ownership first.

### Shared Schema (Existing — DO NOT Recreate)

```ts
// libs/shared/types/src/lib/schemas/chat.schema.ts (ALREADY EXISTS)
export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  imageUrl: z.string().url().optional(),
  channelId: z.string().uuid(),
});
export type SendMessage = z.infer<typeof sendMessageSchema>;
```

For missed messages response, add to `chat.schema.ts`:
```ts
export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  userId: z.string().uuid(),
  content: z.string(),
  imageUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
```

### Frontend Patterns

**Socket.IO client package:** Already installed as part of 8.1 (`socket.io-client`). Do NOT install again.

**AuthContext access:**
```tsx
const { accessToken, activeClub } = useAuth(); // from AuthContext
```

**API client for REST:** Use existing `api-client.ts` — do NOT create custom fetch:
```ts
const missedMessages = await apiClient.get<{ data: ChatMessage[] }>(
  `/channels/${channelId}/messages?since=${encodeURIComponent(lastReceivedAt)}`
);
```

**TanStack Query keys for channel messages:**
- `['messages', channelId, clubId]` — main message list (set up in 8.1)
- Do NOT use TanStack Query for WebSocket messages — manage in-hook state only

**Deduplication pattern:**
```ts
const knownIds = new Set(messages.map(m => m.id));
const newMessages = missed.filter(m => !knownIds.has(m.id));
setMessages(prev => [...prev, ...newMessages].sort((a, b) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
));
```

**Loading states:** The `ReconnectingBanner` is the ONE allowed spinner in chat (connection status is a valid exception per architecture patterns). Regular messages still use skeleton placeholders.

**Toast:** Do NOT use an error toast for disconnection — inline banner only. A toast IS appropriate if the offline queue fails to drain after reconnect (persistent send error).

**Lucide icons:** Already installed. Use `import { Clock } from 'lucide-react'` for pending indicator.

**Code splitting:** `ChatChannel`, `ChatBubble` etc. are lazy-loaded from the router. Do NOT change lazy loading — it's already set up in 8.1.

### Project File Locations

```
libs/api/features/src/lib/chat/          ← Extend (from 8.1/8.2)
  chat.module.ts                         ← No changes needed
  chat.gateway.ts                        ← Add leave-channel handler
  chat.service.ts                        ← Add getMissedMessages()
  chat.controller.ts                     ← Add GET /channels/:channelId/messages
  dto/get-missed-messages.dto.ts         ← NEW: query param validation
  chat.service.spec.ts                   ← Extend
  chat.controller.spec.ts               ← Extend

libs/frontend/features/src/lib/chat/    ← Extend (from 8.1/8.2)
  ChatChannel.tsx                        ← Add ReconnectingBanner
  ChatBubble.tsx                         ← Add isPending prop
  hooks/useChat.ts                       ← Core reconnection logic

libs/frontend/ui/src/lib/               ← Potentially
  ReconnectingBanner.tsx                 ← NEW or inline in ChatChannel

libs/shared/types/src/lib/schemas/
  chat.schema.ts                         ← Add chatMessageSchema (ALREADY EXISTS, extend)
```

### DO NOT

- Do NOT create a new Socket.IO connection — reuse the one from `useChat.ts` (established in 8.1)
- Do NOT implement custom exponential backoff — Socket.IO client handles it natively via config
- Do NOT persist the message queue to localStorage — in-memory is sufficient; messages are in DB
- Do NOT use a blocking modal or error toast for disconnection — inline banner ONLY
- Do NOT query messages by `ChatMessage.clubId` — that column doesn't exist; join through `ChatChannel`
- Do NOT skip `clubId` validation on the REST endpoint — verify channel ownership before returning messages
- Do NOT use `@nestjs/mapped-types` for DTOs — use Zod schemas from shared/types
- Do NOT create `__tests__` directories — co-locate tests with source files
- Do NOT use spinners for message loading — skeleton placeholders only (reconnect banner spinner is the exception)
- Do NOT send queued messages via REST POST — they go through Socket.IO `chat:send` event only
- Do NOT import pages synchronously — lazy loading already set up in 8.1, don't break it

### Testing Standards

**Backend (Vitest + NestJS testing):** Mirror the pattern in `auth.service.spec.ts`:
```ts
vi.mock('../prisma/prisma.service');
const mockPrisma = { chatMessage: { findMany: vi.fn() }, chatChannel: { findFirst: vi.fn() } };
```

**Frontend (Vitest + React Testing Library):** Mirror `AppShell.test.tsx` and `AuthContext.test.tsx` patterns. Mock socket.io-client:
```ts
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }))
}));
```

Test connection state transitions: disconnect → `isReconnecting=true` banner visible → reconnect → banner hidden, missed messages fetched, queue drained.

### Previous Story Intelligence

No previous story files exist for Epic 8 (8.1 and 8.2 must be created and implemented before 8.3). However, established patterns from Epics 1-5 apply:

- **Module pattern:** `chat.module.ts → chat.controller.ts → chat.service.ts` (same as auth, member, club modules)
- **Vitest mocking:** `vi.fn()` for PrismaService — never use real DB in unit tests
- **Guard chain:** Always `JwtAuthGuard → ClubGuard` on tenant-scoped routes — confirmed working in all prior epics
- **Query key convention:** `['entity', clubId]` — for messages: `['messages', channelId, clubId]`
- **Optimistic updates:** Architecture explicitly mentions optimistic updates for chat messages (revert on error). Queued messages are a form of optimistic update — show immediately, confirm on delivery.
- **French error messages:** All user-facing strings in French. "Reconnexion en cours...", "Message en attente d'envoi", "Échec de l'envoi — réessayer".

### Git Intelligence

Recent commits show:
- Epics 1-5 implemented across full stack
- Pattern: NestJS modules with Vitest specs co-located
- Build deployed on Render (API) + Vercel (frontend) — no CI/CD changes needed for this story
- All feature branches per story, code review before merge

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — WebSocket/Socket.IO patterns, Guard chain, NFR23-24, Loading State Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md — FR36-FR40, NFR3, NFR24]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — WhatsApp pattern adoption, chat bubbles]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — ChatChannel, ChatMessage models]
- [Source: libs/shared/types/src/lib/schemas/chat.schema.ts — sendMessageSchema (existing)]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
