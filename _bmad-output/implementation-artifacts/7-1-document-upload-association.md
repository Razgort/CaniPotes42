# Story 7.1: Document Upload & Association

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a club member,
I want to upload documents and associate them to myself or my dogs,
So that my registration forms, certificates, and health records are stored digitally in one place.

## Acceptance Criteria

1. **Given** I am a member of the club, **When** I navigate to the Documents section or tap "Upload" from my profile or a dog's profile, **Then** I see an upload form with: document type (required — select from: registration form, vaccine certificate, health record, license, other), expiry date (optional), association (myself or one of my dogs).

2. **Given** I initiate an upload, **When** I see the upload interface, **Then** the camera-first pattern is used: camera button prominent ("Prendre en photo"), file picker secondary ("Choisir un fichier"). Accepted file types: JPEG, PNG, WebP, PDF. Maximum file size: 5MB — oversized files show error: "Le fichier est trop volumineux (max 5 Mo)".

3. **Given** I select or capture a file, **When** the upload processes, **Then** a progress indicator is shown (the one exception where a progress bar is used instead of skeleton). The file is validated server-side for MIME type and size (NFR13). The file is stored in Cloudflare R2 with a tenant-scoped key (`clubId/documents/...`). A Document record is created with: type, fileUrl, expiryDate, clubId, userId, dogId (if associated to a dog).

4. **Given** the upload succeeds, **When** I see the confirmation, **Then** a success toast appears: "Document ajouté" and the document appears in my document list immediately.

5. **Given** the upload fails (network error, invalid file), **When** I see the error, **Then** an error toast appears: "Nous n'avons pas pu télécharger ce fichier — réessayez". My form state is preserved — I can retry without re-entering metadata.

6. **Given** I upload from a dog's profile page, **When** the association dropdown shows, **Then** the dog is pre-selected as the association target. I can change it to myself or another dog if needed.

## Tasks / Subtasks

### Backend Tasks

- [ ] **Task 1: Add R2 env vars to configuration** (AC: #3)
  - [ ] Add `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` to `.env.example`
  - [ ] Add R2 env vars to `libs/shared/utils/src/lib/env.schema.ts` (optional in dev, required in prod)
  - [ ] Verify `R2Service` in `libs/api/features/src/lib/document/r2.service.ts` reads from these env vars (it already does)

- [ ] **Task 2: Create Document feature module** (AC: #1-6)
  - [ ] Create `libs/api/features/src/lib/document/document.module.ts` — imports `CoreModule`, provides `DocumentService`, `R2Service`
  - [ ] Create `libs/api/features/src/lib/document/document.controller.ts`
  - [ ] Create `libs/api/features/src/lib/document/document.service.ts`
  - [ ] Create `libs/api/features/src/lib/document/dto/upload-document.dto.ts` — imports from shared `uploadDocumentSchema`
  - [ ] Register `DocumentModule` in `FeaturesModule` (`libs/api/features/src/lib/api-features.ts`)

- [ ] **Task 3: Implement document upload endpoint** (AC: #1, #2, #3, #4, #5)
  - [ ] `POST /documents` — guarded by `JwtAuthGuard`, `ClubGuard`
  - [ ] Use `FileInterceptor('file')` from `@nestjs/platform-express` for multipart upload
  - [ ] Validate file MIME type (jpeg, png, webp, pdf) and size (max 5MB) — reject with 400 and French error message
  - [ ] Generate tenant-scoped R2 key: `${clubId}/documents/${userId}/${timestamp}-${originalFilename}`
  - [ ] Upload to R2 via `R2Service.upload(key, buffer, contentType)`
  - [ ] Generate signed URL via `R2Service.getSignedUrl(key)`
  - [ ] Create `Document` record via Prisma with: `clubId`, `userId`, `dogId` (optional from body), `type`, `fileName`, `fileUrl` (R2 key — NOT signed URL), `expiryDate` (optional)
  - [ ] Return `{ data: { id, type, fileName, fileUrl (signed URL), expiryDate, dogId, createdAt } }`

- [ ] **Task 4: Implement document list endpoint** (AC: #1)
  - [ ] `GET /documents` — guarded by `JwtAuthGuard`, `ClubGuard`
  - [ ] For regular members: return only own documents (`WHERE userId = currentUser AND clubId = activeClub`)
  - [ ] For admins/owners: return all club documents (`WHERE clubId = activeClub`)
  - [ ] Support optional query params: `dogId` (filter by dog), `type` (filter by DocumentType)
  - [ ] Return with signed URLs generated on-the-fly for each document
  - [ ] Return `{ data: [...documents], meta: { total, page, pageSize } }`

- [ ] **Task 5: Implement document delete endpoint** (AC: related to document management)
  - [ ] `DELETE /documents/:id` — guarded by `JwtAuthGuard`, `ClubGuard`
  - [ ] Members can only delete their own documents
  - [ ] Admins/owners can delete any club document
  - [ ] Delete R2 object via `R2Service.delete(key)`, then delete Prisma record
  - [ ] Return 204 No Content

- [ ] **Task 6: Write backend tests** (AC: all)
  - [ ] Create `document.controller.spec.ts` — test guard stacking, MIME validation, size rejection, successful upload flow
  - [ ] Create `document.service.spec.ts` — test tenant scoping, file association logic, signed URL generation
  - [ ] Test tenant isolation: member A cannot see member B's documents
  - [ ] Test admin can see all club documents

### Frontend Tasks

- [ ] **Task 7: Create document Zod schemas and API hooks** (AC: #1)
  - [ ] Verify `libs/shared/types/src/lib/schemas/document.schema.ts` has `uploadDocumentSchema` (it exists — has type + expiryDate + associatedDogId)
  - [ ] Export from `libs/shared/types/src/lib/schemas/index.ts` if not already
  - [ ] Create `libs/frontend/features/src/lib/documents/hooks/useDocuments.ts` — TanStack Query hooks:
    - `useDocuments(filters?)` — GET /documents with optional dogId/type filters
    - `useUploadDocument()` — POST /documents with FormData (mutation)
    - `useDeleteDocument()` — DELETE /documents/:id (mutation)

- [ ] **Task 8: Create UploadForm component** (AC: #1, #2, #5, #6)
  - [ ] Create `libs/frontend/features/src/lib/documents/UploadForm.tsx`
  - [ ] Camera-first UI: prominent "Prendre en photo" button (uses `capture="environment"` on file input), secondary "Choisir un fichier" button
  - [ ] Form fields: document type (select dropdown with DocumentType options in French), expiry date (optional date input), association (select: "Moi" or dog names from user's dogs)
  - [ ] If `preselectedDogId` prop provided (coming from dog profile), pre-select that dog
  - [ ] Client-side validation: file type (accept="image/jpeg,image/png,image/webp,application/pdf"), file size (5MB check before upload)
  - [ ] Upload as `FormData` with file + metadata fields
  - [ ] Show progress bar during upload (use XMLHttpRequest or fetch with ReadableStream for progress tracking)
  - [ ] On success: toast "Document ajouté", invalidate documents query cache
  - [ ] On error: toast "Nous n'avons pas pu télécharger ce fichier — réessayez", preserve form state

- [ ] **Task 9: Create DocumentList component** (AC: #1, #4)
  - [ ] Create `libs/frontend/features/src/lib/documents/DocumentList.tsx`
  - [ ] Display documents as card list: document type icon, file name, upload date, expiry date (if set), association (member name or dog name)
  - [ ] Expiry badge logic:
    - No badge if expiry > 30 days or no expiry
    - Orange "Expire bientôt" badge if expiry <= 30 days and >= today
    - Red "Expiré" badge if expiry < today
  - [ ] Tap document → open in new tab (images inline, PDFs in browser viewer)
  - [ ] Skeleton loading state matching list row shape
  - [ ] Empty state: "Aucun document. Ajoutez votre premier document." with upload CTA button

- [ ] **Task 10: Create documents route page** (AC: #1)
  - [ ] Create or update `apps/frontend/src/app/routes/documents.tsx` — lazy-loaded route
  - [ ] Page layout: header "Documents", upload button (FAB or header action), DocumentList below
  - [ ] Add route to `app.tsx` router: `/documents` (protected route)

- [ ] **Task 11: Write frontend tests** (AC: all)
  - [ ] Create `UploadForm.test.tsx` — test camera-first UI, file validation, form state preservation on error
  - [ ] Create `DocumentList.test.tsx` — test expiry badge logic, empty state, loading skeleton

## Dev Notes

### Architecture Patterns (MUST FOLLOW)

- **Module pattern:** Follow exact same structure as `ClubModule` and `MemberModule` — controller → service → Prisma. See `libs/api/features/src/lib/club/` and `libs/api/features/src/lib/member/` for reference.
- **Guard chain:** Every authenticated endpoint: `@UseGuards(JwtAuthGuard, ClubGuard)` minimum. Admin-only endpoints add `@Roles('ADMIN', 'OWNER')` + `RolesGuard`.
- **Tenant isolation (CRITICAL):** ALL Prisma queries MUST include `clubId` from request context. This is the #1 architectural concern — a failure here is a data breach. Use `request.clubId` injected by `ClubGuard`.
- **R2Service usage:** Only `DocumentService` calls `R2Service`. Never from controllers. The `R2Service` already exists at `libs/api/features/src/lib/document/r2.service.ts` with `upload()`, `delete()`, `getSignedUrl()` methods.
- **File upload pattern:** Use `@UseInterceptors(FileInterceptor('file'))` with `@UploadedFile()` decorator. See `ClubController.uploadLogo()` for exact pattern including MIME validation and size checks.
- **Store R2 key, not signed URL:** In the `Document.fileUrl` column, store the R2 object key (e.g., `clubId/documents/userId/timestamp-filename.jpg`). Generate signed URLs on-the-fly when serving documents. Signed URLs expire — stored URLs don't.
- **Response envelope:** `{ data: ... }` for single items, `{ data: [...], meta: { total, page, pageSize } }` for lists.
- **Error messages:** French "we" phrasing: "Nous n'avons pas pu..." Never blame the user.

### Existing Code to Reuse (DO NOT REINVENT)

| What | Where | How to Reuse |
|------|-------|-------------|
| R2Service (upload, delete, getSignedUrl) | `libs/api/features/src/lib/document/r2.service.ts` | Import directly — already has S3Client, PutObject, GetObject, DeleteObject, presigner |
| Document Prisma model | `libs/shared/prisma-client/prisma/schema.prisma` (lines ~201-218) | Model exists with all fields: id, clubId, userId, dogId, type, fileName, fileUrl, expiryDate, timestamps |
| DocumentType enum | `libs/shared/types/src/lib/enums.ts` (lines ~36-42) | Values: VACCINE_CERTIFICATE, REGISTRATION_FORM, HEALTH_RECORD, LICENSE, OTHER |
| uploadDocumentSchema | `libs/shared/types/src/lib/schemas/document.schema.ts` | Has type, expiryDate, associatedDogId fields |
| ClubGuard | `libs/api/core/src/lib/guards/club.guard.ts` | Extracts clubId from JWT, validates membership, injects `request.clubId` and `request.clubRole` |
| ZodValidationPipe | `libs/api/core/src/lib/pipes/zod-validation.pipe.ts` | Use for body/query validation with Zod schemas |
| API client | `libs/frontend/data-access/src/lib/api-client.ts` | Has get/post/patch/delete with auto token refresh |
| File upload pattern (club logo) | `libs/api/features/src/lib/club/club.controller.ts` | Shows FileInterceptor, MIME validation, R2 upload, key generation |
| File upload pattern (member avatar) | `libs/api/features/src/lib/member/member.controller.ts` | Shows 5MB limit, MIME check, R2 key pattern |

### Technical Stack Versions

- NestJS 11, Prisma 7.5, React 19, Vite 7, Tailwind CSS 4, Vitest 4
- `@aws-sdk/client-s3` ^3.1014.0, `@aws-sdk/s3-request-presigner` ^3.1014.0 (already in package.json)
- `@nestjs/platform-express` ^11.0.0 with `@types/multer` ^2.1.0 (already in package.json)

### File Upload Validation Rules (NFR13)

- **Accepted MIME types:** `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- **Max file size:** 5MB (5 * 1024 * 1024 bytes)
- **Server-side validation mandatory** — never trust frontend validation alone
- **Performance target:** uploads < 2 seconds (NFR13)

### R2 Key Pattern

```
{clubId}/documents/{userId}/{timestamp}-{originalFilename}
```

Example: `a1b2c3/documents/d4e5f6/1711100400000-vaccine-cert.jpg`

### UX Requirements (MUST FOLLOW)

- **Camera-first upload pattern (UX-DR19):** Camera button prominent, file picker secondary. WhatsApp-style media sharing flow. Use `<input type="file" accept="image/*" capture="environment">` for camera and separate `<input type="file">` for file picker.
- **Modal patterns (UX-DR20):** Sheet slide-up from bottom on mobile for the upload form. No nested modals.
- **Feedback patterns:** Success toast "Document ajouté" (auto-dismiss 3s). Error toast persists until dismissed. Progress bar (only exception to skeleton rule) during upload.
- **French UI labels:** "Prendre en photo", "Choisir un fichier", "Type de document", "Date d'expiration (optionnel)", "Associer à", "Moi", "Document ajouté", "Le fichier est trop volumineux (max 5 Mo)"
- **DocumentType French labels:** Registration form → "Formulaire d'inscription", Vaccine certificate → "Certificat de vaccination", Health record → "Carnet de santé", License → "Licence", Other → "Autre"
- **Empty state:** "Aucun document" with upload CTA
- **Skeleton loading:** Row placeholders matching document list row shape
- **Touch targets:** Minimum 44x44px on mobile
- **Expiry badges:** Same pattern as VaccineStatusBadge — green (>30d), orange (<=30d), red (expired). Use semantic color tokens `--success`, `--warning`, `--danger`.

### Project Structure Notes

- **Backend module:** `libs/api/features/src/lib/document/` — R2Service already exists here, add controller, service, module, dto/
- **Frontend feature:** `libs/frontend/features/src/lib/documents/` — new directory with DocumentList.tsx, UploadForm.tsx, hooks/useDocuments.ts
- **Route:** `apps/frontend/src/app/routes/documents.tsx` — lazy-loaded
- **Schemas:** `libs/shared/types/src/lib/schemas/document.schema.ts` — already exists
- **Prisma model:** Already defined in schema.prisma — NO migration needed
- **FeaturesModule registration:** Add `DocumentModule` to imports in `libs/api/features/src/lib/api-features.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7 - Document Management]
- [Source: _bmad-output/planning-artifacts/architecture.md#Document Module Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#File Storage Pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Multi-Tenant Data Model]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Camera-First Upload Pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns]
- [Source: libs/api/features/src/lib/club/club.controller.ts#uploadLogo — file upload pattern]
- [Source: libs/api/features/src/lib/member/member.controller.ts#uploadAvatar — file upload pattern]
- [Source: libs/api/features/src/lib/document/r2.service.ts — existing R2 integration]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
