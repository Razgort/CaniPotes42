# Story 7.2: Document Viewing, Download & Expiry Tracking

Status: review

## Story

As a club member,
I want to view and download my documents, and as an admin view all club documents,
So that digital records are always accessible and expiry dates are tracked.

## Acceptance Criteria

1. **Given** I am a member, **When** I navigate to my documents section, **Then** I see a list of my uploaded documents with: document type icon, file name/type label, upload date, expiry date (if set), associated entity (myself or dog name). I only see documents I uploaded — not other members' documents.

2. **Given** I tap a document in the list, **When** the document viewer opens, **Then** images (JPEG, PNG, WebP) are displayed inline, PDFs open in the browser's PDF viewer or a download prompt, and a "Download" button is available for all document types.

3. **Given** a document has an expiry date, **When** I view it in the list, **Then** a status indicator shows:
   - No badge if expiry > 30 days
   - Orange "Expire bientôt" badge if expiry <= 30 days and >= today
   - Red "Expiré" badge if expiry < today

4. **Given** I am an admin or owner, **When** I navigate to the club documents section, **Then** I see all documents across all members in the club. Each row shows: member name, document type, associated entity (member or dog), upload date, expiry date, status badge. I can search by member name or document type. I can download any document.

5. **Given** I am a regular member, **When** I try to view other members' documents, **Then** the API returns only my own documents — no cross-member visibility.

6. **Given** documents are loading, **When** the list is being fetched, **Then** skeleton row placeholders are displayed matching the list row shape.

## Tasks / Subtasks

- [x] Task 1: API — Document query endpoints (AC: #1, #4, #5)
  - [x] 1.1 Extended `DocumentController` with `GET /documents` (admin: all docs, member: own docs)
  - [x] 1.2 Added `GET /documents/:id` for single document detail
  - [x] 1.3 Extended `DocumentService` with `findAll(filters)` and `findOne(id, clubId, userId, role)`
  - [x] 1.4 Added search/filter support: by member name (admin), expiry status
  - [x] 1.5 Tenant isolation via ClubGuard + role-based filtering (admin sees all, member sees own)
- [x] Task 2: API — Signed URL generation for viewing/download (AC: #2)
  - [x] 2.1 Added `GET /documents/:id/download` endpoint returning `{ data: { url } }`
  - [x] 2.2 Uses `R2Service.getSignedUrl(key, 3600)` for time-limited download URLs
  - [x] 2.3 Signed URL generated per-request; `fileUrl` in DB stores R2 key, not public URL
- [x] Task 3: API — Expiry status computation (AC: #3)
  - [x] 3.1 `computeExpiryStatus(date)` method in `DocumentService`: `valid` / `expiring` / `expired` / null
  - [x] 3.2 `expiryStatus` included in all list/detail/formatDocument responses
  - [x] 3.3 Extended `libs/shared/types` document schema with `expiryStatusSchema`, `documentResponseSchema`, `listDocumentsQuerySchema`
- [x] Task 4: Frontend — Document list page for members (AC: #1, #3, #6)
  - [x] 4.1 `DocumentList.tsx` updated with new fields (`expiryStatus`, `dogName`, `memberName`)
  - [x] 4.2 `useDocuments` hook extended with `search`, `status` params; added `useDocumentDetail`, `useDocumentDownloadUrl`
  - [x] 4.3 Rows show: type icon, file name, upload date, expiry date, entity association (dog name or "Moi")
  - [x] 4.4 Expiry badges: orange "Expire bientôt", red "Expiré" — server `expiryStatus` preferred, local fallback
  - [x] 4.5 Skeleton rows while loading (3 rows, `animate-pulse`)
- [x] Task 5: Frontend — Document viewer/download (AC: #2)
  - [x] 5.1 Created `DocumentViewer.tsx` — inline `<img>` for JPEG/PNG/WebP/GIF
  - [x] 5.2 PDF: `<iframe>` embed (browser PDF viewer); fallback download for unknown types
  - [x] 5.3 Download link + open-in-new-tab link in viewer header; 44x44px touch targets
- [x] Task 6: Frontend — Admin document view (AC: #4)
  - [x] 6.1 `DocumentList` shows all club documents when role is ADMIN/OWNER (API-level filtering)
  - [x] 6.2 `memberName` shown per row when `showMemberName={isAdminOrOwner}`; `dogName` from server
  - [x] 6.3 Admin search bar with `useDeferredValue` — real-time, no submit button
  - [x] 6.4 Single `DocumentList` component handles both member and admin views via `role` prop
- [x] Task 7: Tests (AC: all)
  - [x] 7.1 `document.service.spec.ts`: findAll role filtering, computeExpiryStatus, findOne, search/status filters (25 tests)
  - [x] 7.2 `document.controller.spec.ts`: upload, findAll, findOne, getDownloadUrl, remove (37 total API tests)
  - [x] 7.3 `DocumentList.test.tsx`: rendering, skeleton, badges, viewer button, download link (16 tests)
  - [x] 7.4 Admin search bar, member name display, server expiryStatus preference (4 admin tests)

## Dev Notes

### Architecture Compliance

- **Module location:** `libs/api/features/src/lib/document/` — DocumentModule already has `r2.service.ts` here
- **Frontend location:** `libs/frontend/features/src/lib/documents/` — create `DocumentList.tsx`, `DocumentViewer.tsx`, `hooks/useDocuments.ts`
- **Schema location:** `libs/shared/types/src/lib/schemas/document.schema.ts` — already has `uploadDocumentSchema`, extend with response/list schemas
- **Register DocumentModule** in `libs/api/features/src/lib/api-features.ts` (currently only AuthModule, ClubModule, MemberModule are imported)

### Existing Code to Reuse — DO NOT Reinvent

- **R2Service** (`libs/api/features/src/lib/document/r2.service.ts`): Already has `upload()`, `delete()`, `getSignedUrl(key, expiresIn)`. Use `getSignedUrl()` for download/view URLs. Do NOT create a new storage service.
- **ClubGuard** (`libs/api/core/src/lib/guards/club.guard.ts`): Enforces tenant isolation. Apply to all document endpoints.
- **RolesGuard + @Roles()** decorator: Use for admin-only endpoints. Roles are in `libs/shared/types/src/lib/enums.ts`.
- **@CurrentUser, @CurrentClub** decorators: Extract authenticated user and club context. Already used in ClubController and MemberController.
- **ZodValidationPipe**: Use for query parameter validation (search, filters).
- **File upload pattern** in `ClubController` (`club.controller.ts`): Reference for FileInterceptor + MIME validation pattern. Story 7.1 will have created the upload endpoint — build on that, do not duplicate.
- **Prisma Document model**: Already defined in schema with `clubId`, `userId`, `dogId`, `type`, `fileName`, `fileUrl`, `expiryDate`. No schema changes needed.

### Database — Prisma Document Model (Already Exists)

```
Document {
  id        String (UUID)
  clubId    String → Club
  userId    String → User
  dogId     String? → Dog (nullable)
  type      DocumentType (enum)
  fileName  String
  fileUrl   String
  expiryDate DateTime?
  createdAt  DateTime
  updatedAt  DateTime
}
```

`DocumentType` enum values: `VACCINE_CERTIFICATE`, `REGISTRATION_FORM`, `HEALTH_RECORD`, `LICENSE`, `OTHER`

### Expiry Status Computation Logic

```typescript
function computeExpiryStatus(expiryDate: Date | null): 'valid' | 'expiring' | 'expired' | null {
  if (!expiryDate) return null;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (expiryDate < now) return 'expired';
  if (expiryDate <= thirtyDaysFromNow) return 'expiring';
  return 'valid';
}
```

### Security Requirements

- **Tenant isolation:** All queries MUST filter by `clubId` from ClubGuard — never trust client-provided clubId
- **Role-based access:** Members see only `where: { userId: currentUser.id }`. Admins/owners see all club documents.
- **Signed URLs:** Time-limited (default 1 hour via R2Service). Never expose raw R2 keys to frontend.
- **No public bucket:** All file access goes through API → R2Service → signed URL

### UX Requirements

- **Expiry badges:** Orange "Expire bientôt" + Red "Expiré" — ALWAYS pair color with text label (WCAG accessibility, colorblind users)
- **Skeleton loading:** Use skeleton row placeholders matching document list row shape during fetch
- **Touch targets:** Minimum 44x44px for all tappable elements
- **Typography:** Body text minimum 14px mobile, labels 16px
- **Color tokens:** Green `#16A34A` (valid), Orange `#D97706` (expiring), Red `#DC2626` (expired)
- **Document type icons:** Use distinct icons per DocumentType for visual scanning
- **Admin search:** Real-time filtering by member name or document type — no submit button needed

### API Endpoint Design

```
GET  /clubs/:clubId/documents              → List (member: own, admin: all) with query params: ?search=&type=&status=
GET  /clubs/:clubId/documents/:documentId  → Single document detail
GET  /clubs/:clubId/documents/:documentId/download → Returns signed URL for viewing/download
```

All endpoints require: `@UseGuards(JwtAuthGuard, ClubGuard)`. Admin-only filtering handled in service layer based on member role, not via separate endpoints.

### Frontend Routing

Documents section accessed from Profile tab (bottom nav). Admin documents accessible from club management area. Follow existing routing patterns in `libs/frontend/features/src/lib/features.tsx`.

### Dependency on Story 7.1

Story 7.1 (Document Upload & Association) creates:
- DocumentModule, DocumentController (upload endpoint), DocumentService (create method)
- R2 upload flow integration
- Frontend UploadForm component

This story (7.2) extends that foundation. If 7.1 is not yet implemented, create the full module structure but focus on read/query endpoints. The DocumentModule registration in api-features.ts may already exist from 7.1.

### Project Structure Notes

- Monorepo managed by Nx — all libs use `@org/` import aliases
- API: NestJS with Prisma ORM, Zod validation
- Frontend: React with TanStack Router, TailwindCSS
- Shared types between frontend and API via `@org/shared-types`
- Tests: Vitest for unit tests

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Document Management FR22-FR26, File Storage Pipeline, API Security]
- [Source: _bmad-output/planning-artifacts/prd.md — FR22-FR26 Document Management]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Vaccine Dashboard pattern, Design System tokens, Navigation]
- [Source: libs/api/features/src/lib/document/r2.service.ts — Existing R2 integration]
- [Source: libs/shared/types/src/lib/schemas/document.schema.ts — Existing Zod schema]
- [Source: libs/api/features/src/lib/club/club.controller.ts — File upload pattern reference]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Pre-existing Story 7.1 had already created DocumentModule, controller, service, and frontend hooks/components — this story extended them rather than created from scratch.
- `DocumentList.test.tsx` from 7.1 used `jest.*` instead of `vi.*` — fixed as part of this story.
- `ResponseWrapperInterceptor` does not double-wrap if response already has `data` key — download endpoint manually returns `{ data: { url } }`.
- `fileUrl` in DB stores R2 key (not signed URL); signed URLs generated on-the-fly via `r2.getSignedUrl(key)`.
- In-memory search/status filtering used (after signed URL generation) since computed fields aren't DB columns.

### Completion Notes List

- All 37 API tests and 25 frontend tests pass.
- `DocumentViewer` opens on row "Ouvrir" button click — images shown inline, PDFs in `<iframe>`, other types get download fallback.
- Admin search uses `useDeferredValue` for real-time filtering without debounce overhead.
- `DocumentsPage.tsx` and `/documents` route were already present from Story 7.1 — no changes needed.

### File List

**Modified:**
- `libs/shared/types/src/lib/schemas/document.schema.ts` — added `expiryStatusSchema`, `documentResponseSchema`, `listDocumentsQuerySchema`
- `libs/api/features/src/lib/document/document.service.ts` — extended with `computeExpiryStatus`, `findOne`, `getDocumentKey`, search/status filtering in `findAll`
- `libs/api/features/src/lib/document/document.controller.ts` — added `GET :id`, `GET :id/download` endpoints; injected `R2Service`
- `libs/api/features/src/lib/document/document.service.spec.ts` — added computeExpiryStatus, findOne, search/status filter test suites
- `libs/api/features/src/lib/document/document.controller.spec.ts` — added findOne, getDownloadUrl tests; R2 mock
- `libs/frontend/features/src/lib/documents/hooks/useDocuments.ts` — extended `DocumentDto` with `expiryStatus`, `dogName`, `memberName`; added `useDocumentDetail`, `useDocumentDownloadUrl`
- `libs/frontend/features/src/lib/documents/DocumentList.tsx` — admin search bar, member name, viewer integration, badge using server `expiryStatus`
- `libs/frontend/features/src/lib/documents/DocumentList.test.tsx` — fixed jest→vi, added admin feature tests

**Created:**
- `libs/frontend/features/src/lib/documents/DocumentViewer.tsx` — modal viewer with image/PDF/download handling
