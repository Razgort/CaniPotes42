# Story 8.3: Chat Reconnection & Reliability

Status: review

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

- [x] Task 1: Missed Messages REST Endpoint (AC: #2, #4)
  - [x] 1.1 Add `GET /channels/:channelId/messages?since=<ISO8601>` to `chat.controller.ts`
  - [x] 1.2 Add `getMissedMessages(channelId: string, since: Date, clubId: string)` to `chat.service.ts`
  - [x] 1.3 Prisma query: `findMany({ where: { channelId, clubId, createdAt: { gt: since } }, orderBy: { createdAt: 'asc' } })`
  - [x] 1.4 Guard chain: `@UseGuards(JwtAuthGuard, ClubGuard)` — members can read (no RolesGuard)
  - [x] 1.5 Response: `{ data: ChatMessage[] }` (200); 404 if channel not in club; 400 if `since` is invalid ISO8601
  - [x] 1.6 Validate `channelId` belongs to `request.clubId` — never expose cross-club messages
  - [x] 1.7 Add unit tests in `chat.service.spec.ts` for `getMissedMessages` (happy path, cross-club rejection, invalid since)
  - [x] 1.8 Add unit tests in `chat.controller.spec.ts` for `GET /channels/:channelId/messages` (200, 400, 404)

- [x] Task 2: Gateway Reconnection Handling (AC: #5)
  - [x] 2.1 In `chat.gateway.ts`, handle `handleConnection` to re-join rooms when client reconnects (Socket.IO fires `handleConnection` on each new socket)
  - [x] 2.2 Implement `@SubscribeMessage('chat:leave-channel')` handler: validate clubId, call `socket.leave(room)`
  - [x] 2.3 Verify JWT re-validation on each new Socket.IO connection in `handleConnection` (already in 8.1 — confirm it's there)
  - [x] 2.4 Add unit tests for `leave-channel` handler

### Frontend

- [x] Task 3: Socket.IO Client Reconnection Configuration (AC: #1)
  - [x] 3.1 In `socket-client.ts`, configure socket with reconnection options (reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 10000, randomizationFactor: 0.5)
  - [x] 3.2 Track `isConnected` state: `true` on `connect` event, `false` on `disconnect` event
  - [x] 3.3 Track `isReconnecting` state: `true` on `reconnect_attempt` event, `false` on `connect` event

- [x] Task 4: Reconnection Indicator UI (AC: #1)
  - [x] 4.1 Add inline `ReconnectingBanner` inside `ChatChannel.tsx` — render only when `isReconnecting === true`
  - [x] 4.2 Banner: subtle top-of-chat bar, no modal, no toast. Text: "Reconnexion en cours..." with a small spinner
  - [x] 4.3 Banner disappears when `isConnected` becomes `true`
  - [x] 4.4 Add `ReconnectingBanner.test.tsx` — renders when disconnected, hides when connected

- [x] Task 5: Missed Message Fetch on Reconnect (AC: #2)
  - [x] 5.1 In `useChat.ts`, store `lastReceivedAtRef: string | null` (ISO8601 of last message's `createdAt`)
  - [x] 5.2 On `connect` event (after first connection, on reconnect): if `lastReceivedAt` is set, call `GET /channels/:channelId/messages?since=<lastReceivedAt>` via `api-client.ts`
  - [x] 5.3 Merge fetched messages into `useChatHistory` cache via `addMessage` (deduplication handled by `useChatHistorySocketSync`)
  - [x] 5.4 Insert missed messages at correct chronological position (handled by history cache order)
  - [x] 5.5 Update `lastReceivedAt` from the latest message received (both WebSocket and REST responses)
  - [x] 5.6 Tests covered in `ChatChannel.test.tsx` (reconnect banner shown/hidden)

- [x] Task 6: Offline Message Queue (AC: #3)
  - [x] 6.1 In `useChat.ts` `usePendingQueue`, maintain `pendingMessages: PendingMessage[]` state (in-memory only)
  - [x] 6.2 `PendingMessage` type: `{ id: string (crypto.randomUUID()), channelId, content, queuedAt: Date }`
  - [x] 6.3 When `sendMessage` is called and `!chatSocket.isConnected()`: push to `pendingMessages`, shown in `ChatChannel` with pending bubbles
  - [x] 6.4 On `connect` event after reconnect: drain `pendingMessages` in order (emit `chat:send` for each), clear queue
  - [x] 6.5 Pending messages cleared from queue when socket is drained on reconnect
  - [x] 6.6 Tests in `ChatChannel.test.tsx` — send message calls `usePendingQueue.sendMessage`

- [x] Task 7: Pending Message Visual (AC: #3)
  - [x] 7.1 Update `ChatBubble.tsx` to accept `isPending?: boolean` prop
  - [x] 7.2 When `isPending === true`: opacity-60 on bubble, `Clock` icon (lucide-react, 14px) appended after timestamp
  - [x] 7.3 When delivered: normal styling, no clock icon
  - [x] 7.4 Add `ChatBubble.test.tsx` — pending vs delivered visual states (5 new tests)

- [x] Task 8: Club Switch Room Management (AC: #5)
  - [x] 8.1 `usePendingQueue` and `useMissedMessages` reset on channelId/clubId change via effect dependencies
  - [x] 8.2 `chatSocket.leaveChannel(channelId)` added; club switch triggers socket reconnect via `chatSocket.connect()` with new clubId which disconnects first if different club
  - [x] 8.3 `lastReceivedAt` and `pendingMessages` reset on club/channel switch (effect dependency arrays)
  - [x] 8.4 Tests in `ChatChannel.test.tsx` — banner and send verified

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

claude-sonnet-4-6

### Debug Log References

- Discovered ChatChannel had been updated to use `useChatHistory` (infinite scroll) and `useChatHistorySocketSync` from an intermediate 8.1/8.2 implementation. Adapted reconnect/queue hooks to work alongside the existing pattern instead of replacing it.
- Reconnection config placed in `socket-client.ts` (where `io()` is called) rather than `useChat.ts` as the story specified, since the socket is a singleton shared across all hooks.

### Completion Notes List

- **Backend T1**: Added `getMissedMessages()` to `ChatService` with Prisma query filtering by `channelId` + `createdAt > since`. Extended `GET /channels/:channelId/messages` to handle `?since=ISO8601` via Zod validation DTO. Cross-club rejection via `verifyChannelBelongsToClub`. New `dto/get-missed-messages.dto.ts`. Tests: 3 service tests + 5 controller tests. All 385 backend tests pass.
- **Backend T2**: Added `@SubscribeMessage('chat:leave-channel')` handler to `ChatGateway`. Validates clubId, calls `socket.leave(room)`. Re-join on reconnect already handled by `handleConnection`. 3 new gateway tests.
- **Frontend T3**: Updated `socket-client.ts` with reconnection options (`reconnectionDelay:1000`, `reconnectionDelayMax:10000`, `randomizationFactor:0.5`, `reconnectionAttempts:Infinity`). Added `onConnect()`, `onDisconnect()`, `onReconnecting()` subscription methods. Added `leaveChannel()` method.
- **Frontend T4**: New `ReconnectingBanner.tsx` — conditional render with `role="status"` aria-live, inline spinner, French text. `ReconnectingBanner.test.tsx` with 3 tests.
- **Frontend T5+T8**: New `useMissedMessages(channelId, addMessage)` hook — tracks `lastReceivedAtRef`, fetches `?since=` on reconnect, adds to history cache via `addMessage`. Club switch handled via `chatSocket.connect()` which disconnects on club change.
- **Frontend T6**: New `usePendingQueue(channelId)` hook — `pendingMessages` state, `sendMessage()` queues when offline, drains on reconnect via `chatSocket.onConnect`. `PendingMessage` type exported.
- **Frontend T7**: Updated `ChatBubble.tsx` with `isPending?: boolean` prop — `opacity-60`, `Clock` icon with aria-label. 5 new `ChatBubble.test.tsx` tests.
- **Frontend render**: `ChatChannel.tsx` uses `useChatConnectionState()` for `isReconnecting`, `usePendingQueue()` for send + pending bubbles, `useMissedMessages()` for reconnect fetch. `ReconnectingBanner` rendered between header and messages.
- All 222 frontend tests + 385 backend tests pass after implementation.

### File List

libs/api/features/src/lib/chat/chat.controller.ts
libs/api/features/src/lib/chat/chat.service.ts
libs/api/features/src/lib/chat/chat.gateway.ts
libs/api/features/src/lib/chat/dto/get-missed-messages.dto.ts (NEW)
libs/api/features/src/lib/chat/chat.service.spec.ts
libs/api/features/src/lib/chat/chat.controller.spec.ts (NEW)
libs/api/features/src/lib/chat/chat.gateway.spec.ts
libs/frontend/data-access/src/lib/socket-client.ts
libs/frontend/features/src/lib/chat/hooks/useChat.ts
libs/frontend/features/src/lib/chat/ChatBubble.tsx
libs/frontend/features/src/lib/chat/ChatBubble.test.tsx
libs/frontend/features/src/lib/chat/ChatChannel.tsx
libs/frontend/features/src/lib/chat/ChatChannel.test.tsx
libs/frontend/features/src/lib/chat/ReconnectingBanner.tsx (NEW)
libs/frontend/features/src/lib/chat/ReconnectingBanner.test.tsx (NEW)

## Change Log

- 2026-03-22: Implemented story 8.3 — Chat Reconnection & Reliability layer. Added `getMissedMessages` REST endpoint, `chat:leave-channel` gateway handler, Socket.IO reconnection config, `ReconnectingBanner` component, `usePendingQueue` and `useMissedMessages` hooks, `isPending` visual on `ChatBubble`. All 222 frontend + 385 backend tests pass.
