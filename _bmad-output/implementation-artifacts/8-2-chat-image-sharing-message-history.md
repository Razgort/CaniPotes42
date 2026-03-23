# Story 8.2: Chat Image Sharing & Message History

Status: review

## Story

As a club member,
I want to share images in chat and scroll through message history,
So that I can share photos from events and reference past conversations.

## Prerequisites

**Story 8.1 (Chat Channels & Text Messaging) MUST be completed first.** This story builds on:
- `libs/api/features/src/lib/chat/` — ChatModule, ChatGateway, ChatService, ChatController
- `libs/frontend/features/src/lib/chat/` — ChatPage, ChatBubble, message rendering
- The `ChatChannel` and `ChatMessage` Prisma models (already in schema)
- Socket.IO WebSocket gateway with JWT auth and club-scoped rooms

Do NOT implement a new ChatModule from scratch — extend the existing one from Story 8.1.

## Acceptance Criteria

**AC1 — Image picker with camera-first pattern**
- **Given** I am in a chat channel
- **When** I tap the image/attachment icon next to the input
- **Then** the camera option is prominent (first), photo gallery/file picker is secondary
- **And** I can select or capture a JPEG, PNG, or WebP image (max 5MB)

**AC2 — Image upload pipeline**
- **Given** I select an image to share
- **When** I confirm the send
- **Then** a preview placeholder appears immediately in the chat (optimistic UI)
- **And** the image is uploaded to Cloudflare R2 via POST `/clubs/:clubId/chat/channels/:channelId/messages/image`
- **And** upload pipeline: validate MIME type (JPEG/PNG/WebP) + max 5MB → store with key `{clubId}/chat/{channelId}/{uuid}.{ext}` → return signed URL
- **And** a `ChatMessage` record is created with `imageUrl` pointing to the signed URL
- **And** the image renders inline in the chat bubble for all members via `chat:message` WebSocket event

**AC3 — Full-screen image viewer**
- **Given** a message contains an image
- **When** I tap the image
- **Then** it opens in a full-screen viewer with a close/dismiss control

**AC4 — Upload failure handling**
- **Given** the image upload fails
- **When** the error occurs
- **Then** the placeholder is replaced with a retry indicator: "Échec de l'envoi — appuyez pour réessayer"
- **And** the message is NOT broadcast via WebSocket until upload succeeds

**AC5 — Message history pagination**
- **Given** I open a chat channel with existing messages
- **When** the channel loads
- **Then** the most recent 50 messages are displayed (GET `/clubs/:clubId/chat/channels/:channelId/messages?cursor=&limit=50`)
- **And** I can scroll up to load older messages via infinite scroll with skeleton placeholders
- **And** scroll position is preserved when new messages arrive (no jump to bottom if reading history)

**AC6 — Lazy image loading in history**
- **Given** messages contain images
- **When** I scroll through history
- **Then** images load lazily with a blur-up placeholder transitioning to the sharp image
- **And** images are max-width constrained within the chat bubble (max-w-[240px] or equivalent)

**AC7 — Responsive layout**
- **Given** the chat loads on mobile (≤1024px)
- **Then** chat is full-screen with input at the bottom (WhatsApp layout)
- **Given** the chat loads on desktop (>1024px)
- **Then** a split layout: channel list on the left, conversation on the right

## Tasks / Subtasks

- [x] Task 1: Backend — Image upload endpoint (AC: 2, 4)
  - [x] Add `POST /clubs/:clubId/chat/channels/:channelId/messages/image` to `ChatController`
  - [x] Use `@UseGuards(JwtAuthGuard, ClubGuard)` — no exceptions
  - [x] Use `FileInterceptor` from `@nestjs/platform-express` + `MulterModule` in ChatModule
  - [x] Validate MIME type (JPEG/PNG/WebP only) and size ≤5MB via Multer options or custom validator
  - [x] Inject `R2Service` into `ChatService` (import R2Service from `libs/api/features/src/lib/document/r2.service.ts`)
  - [x] Generate R2 key: `` `${clubId}/chat/${channelId}/${uuid()}.${ext}` ``
  - [x] Call `r2Service.upload(key, buffer, contentType)` → get signed URL
  - [x] Create `ChatMessage` via Prisma: `{ channelId, userId, content: '', imageUrl: signedUrl }`
  - [x] Broadcast `chat:message` WebSocket event with the new message (call ChatGateway emit from controller)
  - [x] Return `{ data: ChatMessageDto }` on success; 400 on MIME/size violation; 500 on R2 failure
  - [x] Write `chat.controller.spec.ts` and `chat.service.spec.ts` tests for image upload path

- [x] Task 2: Backend — Message history pagination endpoint (AC: 5)
  - [x] Add `GET /clubs/:clubId/chat/channels/:channelId/messages` to `ChatController`
  - [x] Query params: `cursor` (ISO timestamp or message ID), `limit` (default 50, max 100)
  - [x] Prisma query: `findMany({ where: { channelId, ...(cursor ? { createdAt: { lt: cursor } } : {}) }, orderBy: { createdAt: 'desc' }, take: limit, include: { user: { select: { id, name, avatarUrl } } } })`
  - [x] Return `{ data: ChatMessageDto[], meta: { hasMore: boolean, nextCursor: string | null } }`
  - [x] Add test for pagination in `chat.service.spec.ts`

- [x] Task 3: Shared types — ChatMessage DTO with image support (AC: 2)
  - [x] Add/update `ChatMessageSchema` in `libs/shared/types/src/lib/schemas/` to include `imageUrl?: string`
  - [x] Add `ChatMessageDto` type export
  - [x] Export from `libs/shared/types/src/index.ts`

- [x] Task 4: Frontend — Image attachment button and picker (AC: 1)
  - [x] Add image icon button (`PaperclipIcon` or camera icon from `lucide-react`) next to chat input in `ChatInput` component
  - [x] On tap: show `<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" />` — `capture="environment"` makes camera prominent on mobile
  - [x] Show secondary option for gallery/file without `capture` attribute
  - [x] Validate file size (≤5MB) and type on client before upload — show French error message on violation
  - [x] Store selected file in local state; render preview thumbnail alongside input

- [x] Task 5: Frontend — Image upload mutation and optimistic UI (AC: 2, 4)
  - [x] Create `useUploadChatImage` mutation hook in `libs/frontend/features/src/lib/chat/hooks/useChatImage.ts`
  - [x] Use `api-client` multipart POST to `/clubs/:clubId/chat/channels/:channelId/messages/image`
  - [x] Optimistic update: insert a local `ChatMessage` with `status: 'uploading'` and a local `objectURL` preview
  - [x] On success: replace local message with server response (remove `status: 'uploading'`)
  - [x] On failure: update local message to `status: 'failed'` — render retry button with "Échec de l'envoi — appuyez pour réessayer"
  - [x] Retry tap: re-run the mutation with the same file

- [x] Task 6: Frontend — Update ChatBubble for image rendering (AC: 3, 6)
  - [x] Update `ChatBubble` component (`libs/frontend/features/src/lib/chat/ChatBubble.tsx`) to handle `imageUrl`
  - [x] Render image with `loading="lazy"` and blur-up technique: CSS `filter: blur(...)` while loading, sharp once loaded (`onLoad` callback)
  - [x] Constrain image: `max-w-[240px] rounded-lg cursor-pointer`
  - [x] On tap: set `selectedImageUrl` state → render full-screen `<dialog>` or overlay with close button
  - [x] Accessibility: `alt="Image partagée par {senderName}"`, close button `aria-label="Fermer l'image"`
  - [x] Handle `status: 'uploading'` — render skeleton placeholder with spinner
  - [x] Handle `status: 'failed'` — render retry button

- [x] Task 7: Frontend — Message history infinite scroll (AC: 5)
  - [x] Create `useChatHistory` hook in `libs/frontend/features/src/lib/chat/hooks/useChatHistory.ts`
  - [x] Use TanStack Query `useInfiniteQuery` with `GET /clubs/:clubId/chat/channels/:channelId/messages`
  - [x] Load oldest page first in display; next page loads older messages on scroll-up
  - [x] Scroll anchor: use `useRef` on scroll container + `IntersectionObserver` on top sentinel element
  - [x] When sentinel is visible and `hasMore`, call `fetchNextPage()`
  - [x] Show skeleton placeholders (3–5 `ChatBubble` skeletons) while loading more
  - [x] Preserve scroll position: before fetching older page, save `scrollHeight`; after fetch, restore position via `scrollTop = newScrollHeight - savedScrollHeight`
  - [x] New real-time messages (from Socket.IO) are appended to bottom; only auto-scroll if user was at bottom (check `scrollTop + clientHeight >= scrollHeight - 50`)

- [x] Task 8: Frontend — Desktop split layout (AC: 7)
  - [x] Update `ChatPage` layout: on `lg:` breakpoint, render two-column grid (`lg:grid lg:grid-cols-[280px,1fr]`)
  - [x] Left column: channel list (already built in Story 8.1)
  - [x] Right column: active conversation (full height)
  - [x] Mobile: single column, chat is full-screen, input fixed at bottom
  - [x] No separate component needed — CSS grid + Tailwind responsive classes

- [x] Task 9: Tests (AC: all)
  - [x] `chat.controller.spec.ts`: test image upload — 200 success, 400 MIME violation, 400 size violation
  - [x] `chat.service.spec.ts`: test image upload flow (mock R2Service), test pagination (mock Prisma)
  - [x] `ChatBubble.test.tsx`: test image rendering, blur-up state, full-screen viewer open/close, failed state retry button
  - [x] `useChatHistory.test.ts`: test infinite scroll trigger, scroll position preservation

## Dev Notes

### Critical: Do Not Reinvent

- **R2Service already exists** at `libs/api/features/src/lib/document/r2.service.ts`. Import and inject it — do NOT create a new upload service.
- **ChatModule/ChatGateway already exists** from Story 8.1. Extend it — add the image endpoint and history endpoint to the existing controller/service.
- **ChatMessage.imageUrl is already in the Prisma schema** — no migration needed. Model: `imageUrl String?` in `ChatMessage`.
- **Socket.IO room/auth** is already wired in Story 8.1. Use existing `chat:message` event — just include `imageUrl` in payload.

### File Structure

```
libs/api/features/src/lib/chat/
  chat.module.ts                    ← Add MulterModule import + R2Service provider
  chat.controller.ts                ← Add image upload + history endpoints
  chat.service.ts                   ← Add uploadImage(), getHistory() methods
  dto/
    chat-message.dto.ts             ← Add imageUrl?: string
  chat.controller.spec.ts           ← Add image upload tests
  chat.service.spec.ts              ← Add uploadImage + getHistory tests

libs/frontend/features/src/lib/chat/
  ChatPage.tsx                      ← Update layout for lg: split
  ChatBubble.tsx                    ← Update for image rendering + full-screen viewer
  ChatInput.tsx                     ← Add image attachment button
  hooks/
    useChatHistory.ts               ← NEW: useInfiniteQuery for message history
    useChatImage.ts                 ← NEW: mutation hook for image upload

libs/shared/types/src/lib/schemas/
  chat.schema.ts                    ← Add ChatMessageSchema with imageUrl?
```

### Architecture Compliance

**Guard chain** — NEVER skip:
```
Request → JwtAuthGuard → ClubGuard → Controller
```
The image upload endpoint MUST have `@UseGuards(JwtAuthGuard, ClubGuard)` — uploading without auth is a security violation.

**R2 key namespacing** — tenant isolation via prefix:
```typescript
const key = `${clubId}/chat/${channelId}/${uuid()}.${ext}`;
```
Never use a flat key — this is the tenant isolation boundary.

**WebSocket event** after image upload:
- The `ChatService.uploadImage()` method must call `chatGateway.server.to(channelId).emit('chat:message', messageDto)` after Prisma insert.
- Do NOT return the message to the HTTP response and also emit from controller — do it from the service.

**Structured error responses** (existing pattern):
```typescript
{ statusCode: 400, error: 'BadRequest', message: 'Type de fichier non supporté. JPEG, PNG ou WebP requis.' }
{ statusCode: 400, error: 'BadRequest', message: 'Fichier trop volumineux. Taille maximale: 5MB.' }
```

**MulterModule config** (add to ChatModule imports):
```typescript
MulterModule.register({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
})
```

### Prisma Schema Reference

```prisma
model ChatMessage {
  id        String   @id @default(uuid())
  channelId String
  userId    String
  content   String   // empty string '' for image-only messages
  imageUrl  String?  // ← R2 signed URL, nullable
  createdAt DateTime @default(now())

  channel ChatChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  user    User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([channelId])
}
```

No migration needed — `imageUrl` is already in the schema.

### Frontend Patterns to Follow

**TanStack Query for history** (pattern from existing feature hooks):
```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['chat', channelId, 'history'],
  queryFn: ({ pageParam }) =>
    apiClient.get(`/clubs/${clubId}/chat/channels/${channelId}/messages`, {
      params: { cursor: pageParam, limit: 50 }
    }),
  getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
  initialPageParam: undefined,
});
```

**Camera-first input** (mobile `capture` attribute):
```tsx
// Camera-first (tap → opens camera on mobile)
<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleCapture} />
// Gallery/file picker secondary
<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
```

**Blur-up image loading**:
```tsx
const [loaded, setLoaded] = useState(false);
<img
  src={imageUrl}
  loading="lazy"
  onLoad={() => setLoaded(true)}
  className={cn('max-w-[240px] rounded-lg', !loaded && 'blur-sm', loaded && 'blur-0 transition-all duration-300')}
  alt={`Image partagée par ${senderName}`}
/>
```

**Scroll preservation** (critical — prevents history jump):
```typescript
const containerRef = useRef<HTMLDivElement>(null);
const prevScrollHeight = useRef(0);

// Before fetching: save scroll height
const handleLoadMore = () => {
  if (containerRef.current) prevScrollHeight.current = containerRef.current.scrollHeight;
  fetchNextPage();
};

// After data updates: restore position
useEffect(() => {
  if (containerRef.current && prevScrollHeight.current > 0) {
    containerRef.current.scrollTop =
      containerRef.current.scrollHeight - prevScrollHeight.current;
    prevScrollHeight.current = 0;
  }
}, [data]);
```

### Testing Standards

- **Vitest 4** with jsdom — co-located tests (`*.spec.ts` / `*.test.tsx`)
- **Mock R2Service** in service tests (don't hit real R2):
  ```typescript
  const mockR2Service = { upload: vi.fn().mockResolvedValue('https://r2.example.com/signed') };
  ```
- **Mock Prisma** in service tests (existing pattern from auth/club services)
- **Component tests**: test image render path, failed state, full-screen viewer open/close
- Run with: `npx nx test frontend-features` or `npx nx affected:test`

### Security Notes

- Never expose raw R2 bucket URLs — always use signed URLs (1 hour TTL via `r2Service.getSignedUrl`)
- MIME type validation MUST happen server-side (Multer filter), not just client-side
- File extension derived from `file.mimetype`, not from `file.originalname` (prevents extension spoofing)
- All uploads scoped to the authenticated user's active club via ClubGuard

### Project Structure Notes

- Chat feature module is at `libs/api/features/src/lib/chat/` — follow same structure as `club/`, `member/`
- R2Service imported from `libs/api/features/src/lib/document/r2.service.ts` — add to ChatModule `imports` or `providers`
- Shared types in `libs/shared/types/src/lib/schemas/chat.schema.ts`
- Frontend components in `libs/frontend/features/src/lib/chat/`

### References

- R2Service implementation: `libs/api/features/src/lib/document/r2.service.ts`
- Guard chain pattern: `libs/api/core/src/lib/guards/` [Source: architecture.md#Guard Execution Order]
- WebSocket event conventions: `chat:message`, `chat:typing` [Source: architecture.md#Communication Patterns]
- Prisma schema: `libs/shared/prisma-client/prisma/schema.prisma` (ChatMessage model, line ~233)
- Multer + NestJS file upload: `@nestjs/platform-express` FileInterceptor [Source: architecture.md#File Storage Pipeline]
- TanStack Query infinite query: existing hook pattern from `libs/frontend/features/` [Source: architecture.md#Process Patterns]
- Cloudflare R2 signed URLs (1hr default TTL): see R2Service.getSignedUrl [Source: r2.service.ts]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
