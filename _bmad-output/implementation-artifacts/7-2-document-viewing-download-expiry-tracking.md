# Story 7.2: Document Viewing, Download & Expiry Tracking

Status: ready-for-dev

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

- [ ] Task 1: API — Document query endpoints (AC: #1, #4, #5)
  - [ ] 1.1 Create `DocumentController` with `GET /clubs/:clubId/documents` (admin: all docs, member: own docs)
  - [ ] 1.2 Create `GET /clubs/:clubId/documents/:documentId` for single document detail
  - [ ] 1.3 Create `DocumentService` with `findAll(clubId, userId?, filters?)` and `findOne(documentId, clubId)`
  - [ ] 1.4 Add search/filter support: by member name, document type, expiry status
  - [ ] 1.5 Enforce tenant isolation via ClubGuard + role-based filtering (admin sees all, member sees own)
- [ ] Task 2: API — Signed URL generation for viewing/download (AC: #2)
  - [ ] 2.1 Create `GET /clubs/:clubId/documents/:documentId/download` endpoint
  - [ ] 2.2 Use existing `R2Service.getSignedUrl()` to generate time-limited download URLs
  - [ ] 2.3 Return signed URL with appropriate Content-Disposition header (inline for images, attachment for PDFs)
- [ ] Task 3: API — Expiry status computation (AC: #3)
  - [ ] 3.1 Add computed expiry status logic in DocumentService: `valid` (>30d), `expiring` (<=30d, >=today), `expired` (<today)
  - [ ] 3.2 Include computed status in all document list/detail responses
  - [ ] 3.3 Add Zod response schema for document list with expiry status
- [ ] Task 4: Frontend — Document list page for members (AC: #1, #3, #6)
  - [ ] 4.1 Create `DocumentList.tsx` in `libs/frontend/features/src/lib/documents/`
  - [ ] 4.2 Create `useDocuments` hook in `libs/frontend/features/src/lib/documents/hooks/`
  - [ ] 4.3 Render document rows with: type icon, file name, upload date, expiry date, entity association
  - [ ] 4.4 Add expiry status badges (orange "Expire bientôt", red "Expiré") — always text+color, never color alone
  - [ ] 4.5 Add skeleton loading placeholders matching row shape
- [ ] Task 5: Frontend — Document viewer/download (AC: #2)
  - [ ] 5.1 Create `DocumentViewer.tsx` — inline image display for JPEG/PNG/WebP
  - [ ] 5.2 PDF handling: open in browser viewer or trigger download
  - [ ] 5.3 Add "Download" button using signed URL from API
- [ ] Task 6: Frontend — Admin document view (AC: #4)
  - [ ] 6.1 Create admin variant of document list showing all club members' documents
  - [ ] 6.2 Add member name column and associated entity column
  - [ ] 6.3 Add search bar: filter by member name or document type
  - [ ] 6.4 Reuse DocumentList component with admin flag for extended columns
- [ ] Task 7: Tests (AC: all)
  - [ ] 7.1 Unit tests for DocumentService (findAll with role filtering, expiry computation)
  - [ ] 7.2 Unit tests for DocumentController (auth guards, role-based access)
  - [ ] 7.3 Frontend tests for DocumentList (rendering, skeleton states, badge display)
  - [ ] 7.4 Frontend tests for search/filter functionality

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

### Debug Log References

### Completion Notes List

### File List
