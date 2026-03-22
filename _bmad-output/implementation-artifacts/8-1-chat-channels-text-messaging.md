# Story 8.1: Chat Channels & Text Messaging

Status: ready-for-dev

## Story

As a club member,
I want to send and receive text messages in my club's chat channels in real-time,
So that our club can coordinate without relying on WhatsApp or Facebook groups.

## Acceptance Criteria (BDD)

1. **Given** I am a member of the club, **When** I tap the Chat tab, **Then** I see a list of chat channels for the active club, a default "General" channel exists for every club (auto-created on club creation), and channels are scoped to the club (no cross-club channels visible — FR40).

2. **Given** I open a chat channel, **When** I see the chat view, **Then** messages display as WhatsApp-familiar bubbles: my messages right-aligned (blue tint), others left-aligned (gray tint). Each message shows sender name, sender avatar (initials fallback), message content, and timestamp. Chat input is at the bottom with auto-resize textarea.

3. **Given** I type a message and tap send, **When** the message is submitted, **Then** the message appears immediately (optimistic update), a ChatMessage record is created in PostgreSQL (`content`, `userId`, `channelId`, `createdAt`), the message is broadcast via Socket.IO to all connected members in the same channel, and other members see it within 500ms (NFR3).

4. **Given** a member in my club sends a message, **When** I have the channel open, **Then** the message appears in real-time without page refresh and the view auto-scrolls to the new message if I was at the bottom.

5. **Given** I am on a different tab (not Chat), **When** a new message arrives, **Then** the Chat tab in BottomTabBar shows a coral unread badge with count, and the badge announces the count to screen readers: "N messages non lus".

6. **Given** the WebSocket connection is authenticated, **When** I connect to the chat gateway, **Then** Socket.IO gateway validates my JWT on connection, I am auto-joined to rooms matching my active club's channels only, and messages include clubId for server-side validation (no cross-club delivery).

7. **Given** no messages exist in a channel, **When** I open it, **Then** an empty state shows: "Lancez la conversation !" with focus on the input field.

## Out of Scope (Handled by Stories 8.2 & 8.3)

- Image sharing in chat (8.2)
- Message history pagination / infinite scroll (8.2)
- Reconnection strategy & offline message queuing (8.3)
- Desktop split layout (channel list + conversation) — 8.2
- For 8.1: load latest 50 messages on channel open, no infinite scroll needed

## Tasks / Subtasks

- [ ] Task 1: Install WebSocket dependencies (AC: #6)
  - [ ] Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (backend)
  - [ ] Install `socket.io-client` (frontend)
- [ ] Task 2: Prisma migration for auto-created General channel (AC: #1)
  - [ ] Add seed logic or hook in ClubService to create "General" ChatChannel on club creation
  - [ ] Create migration if schema changes needed (schema already has ChatChannel + ChatMessage)
- [ ] Task 3: Backend ChatModule — service, controller, gateway (AC: #3, #4, #6)
  - [ ] Create `libs/api/features/src/lib/chat/chat.module.ts`
  - [ ] Create `libs/api/features/src/lib/chat/chat.service.ts` — CRUD for channels & messages
  - [ ] Create `libs/api/features/src/lib/chat/chat.controller.ts` — REST endpoints for channels list and message fetch
  - [ ] Create `libs/api/features/src/lib/chat/chat.gateway.ts` — Socket.IO gateway with JWT auth
  - [ ] Create `libs/api/features/src/lib/chat/dto/` — DTOs importing from shared Zod schemas
  - [ ] Register ChatModule in FeaturesModule (`api-features.ts`)
- [ ] Task 4: Expand shared Zod schemas (AC: #3)
  - [ ] Expand `chat.schema.ts` with channel schemas, message response schemas, gateway event payloads
- [ ] Task 5: Frontend Socket.IO integration layer (AC: #4, #6)
  - [ ] Create `libs/frontend/data-access/src/lib/socket-client.ts` — Socket.IO client singleton
  - [ ] Handle JWT auth on connection, auto-join club rooms
  - [ ] Expose connection status and incoming message events
- [ ] Task 6: Frontend chat UI components (AC: #2, #7)
  - [ ] Create `libs/frontend/features/src/lib/chat/ChatChannel.tsx` — channel view with messages
  - [ ] Create `libs/frontend/features/src/lib/chat/ChatBubble.tsx` — message bubble component
  - [ ] Create `libs/frontend/features/src/lib/chat/ChatInput.tsx` — auto-resize textarea + send
  - [ ] Create `libs/frontend/features/src/lib/chat/hooks/useChat.ts` — TanStack Query + Socket.IO
- [ ] Task 7: ChatPage and channel list (AC: #1)
  - [ ] Replace ChatPage.tsx placeholder with channel list view
  - [ ] Channel list shows all channels for active club
  - [ ] Tap channel navigates to ChatChannel view
- [ ] Task 8: Unread badge integration (AC: #5)
  - [ ] Track unread count in socket client or React context
  - [ ] Pass `unreadChatCount` to BottomTabBar (already accepts this prop)
- [ ] Task 9: Auto-create General channel for existing clubs (AC: #1)
  - [ ] Migration script or startup seed to ensure all existing clubs have a "General" channel
- [ ] Task 10: Unit tests (AC: all)
  - [ ] `chat.service.spec.ts` — message creation, channel listing, club scoping
  - [ ] `chat.gateway.spec.ts` — JWT validation, room joining, message broadcast
  - [ ] `ChatChannel.test.tsx` — renders messages, sends messages, empty state
  - [ ] `ChatBubble.test.tsx` — own vs other styling, avatar, timestamp

## Dev Notes

### Critical Architecture Compliance

**Tenant Isolation (MOST CRITICAL):**
- Every query MUST include `WHERE clubId = ?` — enforced at service layer
- ChatGateway MUST validate JWT on connection and extract clubId
- Room names MUST be scoped: `club:{clubId}:channel:{channelId}`
- Messages MUST include clubId server-side — never trust client-sent clubId
- Use existing `ClubGuard` for REST endpoints; for WebSocket, implement JWT validation in `handleConnection`

**NestJS Module Pattern (MANDATORY):**
- Controller → Service → Prisma (never direct Prisma from controller or gateway)
- ChatGateway calls ChatService for all DB operations
- DTOs import Zod schemas from `@org/types` (shared library)
- Wrap responses in `{ data }` envelope for REST endpoints
- Use NestJS `Logger` with class context — never `console.log`

**WebSocket Event Naming Convention:**
- Server → Client: `chat:message`, `chat:channel-joined`
- Client → Server: `chat:send`, `chat:join-channel`
- Kebab-case with namespace prefix

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How to Use |
|------|-------|------------|
| Prisma ChatChannel model | `schema.prisma:220-231` | Already defined — no schema changes needed for channels |
| Prisma ChatMessage model | `schema.prisma:233-245` | Already defined — content, imageUrl, channelId, userId |
| Zod `sendMessageSchema` | `libs/shared/types/src/lib/schemas/chat.schema.ts` | Expand this file, don't create new schema files |
| R2Service | `libs/api/features/src/lib/document/r2.service.ts` | NOT needed for 8.1 (no images) — but DON'T create a duplicate for 8.2 |
| BottomTabBar unread badge | `libs/frontend/ui/src/lib/BottomTabBar.tsx` | Already accepts `unreadChatCount` prop — just wire it up |
| ChatPage placeholder | `libs/frontend/features/src/lib/pages/ChatPage.tsx` | Replace "Coming soon" with real channel list |
| apiClient | `libs/frontend/data-access/src/lib/api-client.ts` | Use for REST calls (channel list, message history fetch) |
| AuthContext | `libs/frontend/data-access/src/lib/AuthContext.tsx` | Get `accessToken` for Socket.IO auth, `activeClub` for room scoping |
| JwtAuthGuard | `libs/api/core/src/lib/guards/jwt-auth.guard.ts` | Use for REST chat endpoints |
| ClubGuard | `libs/api/core/src/lib/guards/club.guard.ts` | Use for REST chat endpoints — extracts clubId from JWT |
| @Club() decorator | `libs/api/core/src/lib/decorators/club.decorator.ts` | Inject clubId in chat controller |
| @User() decorator | `libs/api/core/src/lib/decorators/user.decorator.ts` | Inject userId in chat controller |

### Project Structure — New Files

```
libs/api/features/src/lib/chat/
  chat.module.ts
  chat.controller.ts
  chat.service.ts
  chat.gateway.ts
  dto/
    send-message.dto.ts
    channel.dto.ts
  chat.service.spec.ts
  chat.gateway.spec.ts

libs/frontend/features/src/lib/chat/
  ChatChannel.tsx
  ChatBubble.tsx
  ChatInput.tsx
  hooks/
    useChat.ts

libs/frontend/data-access/src/lib/
  socket-client.ts
```

### Modified Files

- `libs/api/features/src/lib/api-features.ts` — add ChatModule import
- `libs/api/features/src/lib/club/club.service.ts` — add General channel auto-creation on club create
- `libs/shared/types/src/lib/schemas/chat.schema.ts` — expand with channel schemas
- `libs/frontend/features/src/lib/pages/ChatPage.tsx` — replace placeholder
- `libs/frontend/features/src/lib/features.tsx` — add chat route
- `libs/shared/utils/src/lib/env.schema.ts` — no changes needed (R2 env vars not needed for 8.1)
- `package.json` — add socket.io dependencies

### REST API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/clubs/:clubId/channels` | JwtAuthGuard + ClubGuard | List channels for active club |
| GET | `/clubs/:clubId/channels/:channelId/messages` | JwtAuthGuard + ClubGuard | Fetch latest 50 messages |
| POST | `/clubs/:clubId/channels/:channelId/messages` | JwtAuthGuard + ClubGuard | Create message (REST fallback) |

### WebSocket Gateway Events

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| Client → Server | `chat:send` | `{ channelId, content }` | Send text message |
| Client → Server | `chat:join-channel` | `{ channelId }` | Join channel room |
| Server → Client | `chat:message` | `{ id, channelId, content, userId, senderName, senderAvatar, createdAt }` | New message broadcast |
| Server → Client | `chat:error` | `{ message }` | Error notification |

### ChatGateway JWT Authentication Pattern

```typescript
// In chat.gateway.ts handleConnection:
// 1. Extract token from client.handshake.auth.token or client.handshake.headers.authorization
// 2. Verify with JwtService (inject @nestjs/jwt)
// 3. Extract userId, activeClubId from payload
// 4. Query ClubMember to verify membership
// 5. If invalid → client.disconnect()
// 6. Store userId + clubId on client.data
// 7. Auto-join room: `club:${clubId}:channel:*` (or specific channels)
```

### Frontend Socket.IO Client Pattern

```typescript
// socket-client.ts:
// 1. Create singleton socket instance (lazy initialization)
// 2. Connect with auth: { token: accessToken }
// 3. On 'connect' → join active club channels via chat:join-channel
// 4. On 'chat:message' → update TanStack Query cache (queryClient.setQueryData)
// 5. On 'disconnect' → show subtle indicator (handled in 8.3, basic for now)
// 6. On club switch → disconnect + reconnect with new token/club
// 7. Export: connect(), disconnect(), sendMessage(), onMessage()
```

### Chat UI Design Requirements

- **Bubble styling:** Own messages right-aligned with `bg-primary-light` (blue-100), others left-aligned with `bg-muted` (gray)
- **Avatar:** Use initials fallback (first letter of firstName + lastName) — no photo support yet
- **Timestamp:** Use `Intl.DateTimeFormat` with `fr-FR` locale, show time only (e.g., "14:30")
- **Input:** Auto-resize textarea at bottom, coral send button, disabled when empty
- **Empty state:** "Lancez la conversation !" centered, input field focused
- **Mobile layout:** Full-screen chat, input at bottom (WhatsApp pattern)
- **French strings:** All user-facing text in French (hardcoded, no i18n library)

### Database Notes

- ChatChannel and ChatMessage models already exist in `schema.prisma`
- ChatMessage has `channelId` index for efficient message queries
- ChatChannel has `clubId` index for efficient club-scoped queries
- No migration needed for schema — only for seed data (General channels)
- ChatMessage does NOT have `clubId` column — derive club scope through `channel.clubId` join. For gateway validation, look up channel's clubId before broadcasting.

### Dependencies to Install

```
# Backend
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Frontend
npm install socket.io-client
```

### Testing Standards

- Co-locate tests: `chat.service.spec.ts` next to `chat.service.ts`
- Use Vitest (already configured) with `jsdom` for React tests
- NestJS tests: use `@nestjs/testing` `Test.createTestingModule`
- Mock PrismaService for unit tests
- Test tenant isolation: verify queries always include clubId scoping
- Test WebSocket auth: verify connection rejected without valid JWT
- Frontend tests: use `@testing-library/react` + `@testing-library/user-event`

### Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| Direct Prisma calls in ChatGateway | Gateway calls ChatService methods |
| Trusting client-sent clubId | Extract clubId from JWT / socket.data |
| Creating new R2Service for chat | Reuse existing one in document module (story 8.2) |
| Returning raw Prisma entities | Wrap in `{ data }` envelope with mapped DTO |
| Using `console.log` | Use NestJS `Logger` with class context |
| `__tests__/` directory | Co-locate `*.spec.ts` / `*.test.tsx` |
| Inline Zod schemas | Import from `@org/types` shared library |
| Numeric IDs | Always UUID v4 string (already in schema) |
| `snake_case` API fields | camelCase everywhere |
| Importing pages synchronously | Use `React.lazy()` for route-level code splitting |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — WebSocket Communication Patterns, Component Boundaries, Chat Module Structure]
- [Source: _bmad-output/planning-artifacts/prd.md — FR36-FR40, NFR3, NFR24]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Chat UI patterns, BottomTabBar, ChatBubble component]
- [Source: libs/shared/prisma-client/prisma/schema.prisma — ChatChannel, ChatMessage models]
- [Source: libs/shared/types/src/lib/schemas/chat.schema.ts — sendMessageSchema]
- [Source: libs/frontend/ui/src/lib/BottomTabBar.tsx — unreadChatCount prop]
- [Source: libs/api/features/src/lib/document/r2.service.ts — R2Service for future image uploads]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
