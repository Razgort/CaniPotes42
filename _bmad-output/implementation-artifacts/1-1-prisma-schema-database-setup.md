# Story 1.1: Prisma Schema & Database Setup

Status: review

## Story

As a developer,
I want the complete Prisma data model with all entities, relationships, enums, and migrations,
So that all subsequent features have a solid, tenant-isolated data foundation.

## Acceptance Criteria

1. **Given** the Prisma schema file at `libs/shared/prisma-client/prisma/schema.prisma`
   **When** I review the schema
   **Then** it contains all models: User, Club, ClubMember, Event, EventParticipation, Dog, VaccineRecord, Document, ChatChannel, ChatMessage, LicenseType, Payment, Consent

2. Every tenant-scoped model has a `clubId` UUID foreign key referencing Club

3. ClubMember is a join table with `userId` + `clubId` + `role` (enum: OWNER, ADMIN, MEMBER)

4. All IDs are UUID v4 via `@default(uuid())`

5. Models use PascalCase singular names, columns use camelCase

6. Enums use PascalCase names with SCREAMING_SNAKE values: Role, EventStatus, ParticipationStatus, VaccineStatus, PaymentStatus, DocumentType

7. Event has status enum (DRAFT, PUBLISHED), latitude/longitude Float fields, and a relation to Club

8. Dog has name, breed, birthdate, chipNumber, photoUrl fields and belongs to User scoped by Club

9. VaccineRecord has vaccineName, dateAdministered, expiryDate, certificateUrl and belongs to Dog

10. Document has type enum, fileUrl, expiryDate, and can be associated to User or Dog within a Club

11. ChatMessage has content, imageUrl, and belongs to ChatChannel scoped by Club

12. Payment has amount, status enum (PENDING, COMPLETED, FAILED, REFUNDED), stripeSessionId, and relates to User + LicenseType within a Club

13. `createdAt`/`updatedAt` timestamps exist on all models

14. `prisma migrate dev` runs successfully and creates all tables in PostgreSQL

15. Docker Compose file provides a local PostgreSQL instance for development

16. The PrismaService singleton in `libs/shared/prisma-client` uses `@prisma/adapter-pg` with the `pg` driver

## Tasks / Subtasks

- [x] Task 1: Design complete Prisma schema (AC: 1-13)
  - [x] 1.1 Define all 6 enums: Role, EventStatus, ParticipationStatus, VaccineStatus, PaymentStatus, DocumentType
  - [x] 1.2 Replace placeholder User model with full model + relations
  - [x] 1.3 Create Club model + relations
  - [x] 1.4 Create ClubMember join table with @@unique([userId, clubId])
  - [x] 1.5 Create Event model with status, lat/lng, createdBy relation
  - [x] 1.6 Create EventParticipation model with clubId FK and @@unique([eventId, userId])
  - [x] 1.7 Create Dog model scoped by userId + clubId
  - [x] 1.8 Create VaccineRecord model scoped via Dog
  - [x] 1.9 Create Document model with optional dogId FK
  - [x] 1.10 Create ChatChannel model with club relation
  - [x] 1.11 Create ChatMessage model (immutable, no updatedAt)
  - [x] 1.12 Create LicenseType model with Decimal amount
  - [x] 1.13 Create Payment model with stripeSessionId @unique
  - [x] 1.14 Create Consent model (user-level, no clubId)
  - [x] 1.15 Add all relation fields and FK constraints between models
  - [x] 1.16 Add indexes on clubId (all tenant-scoped), email (User), stripeSessionId (Payment), channelId (ChatMessage)

- [x] Task 2: Update prisma-client to use @prisma/adapter-pg (AC: 16)
  - [x] 2.1 Modify `libs/shared/prisma-client/src/lib/prisma-client.ts` — PrismaClient with PrismaPg adapter
  - [x] 2.2 Prisma 7.5 has driver adapters GA — no previewFeatures needed. Removed `url` from datasource block (deprecated in Prisma 7). Created `prisma.config.ts` at project root with datasource.url and migrate.adapter.
  - [x] 2.3 Updated PrismaService in `libs/api/core/src/lib/prisma.service.ts` with adapter in constructor

- [x] Task 3: Generate and run initial migration (AC: 14)
  - [x] 3.1 Started PostgreSQL via `docker compose up -d`
  - [x] 3.2 Ran `npx prisma migrate dev --name init` — migration 20260322060450_init created
  - [x] 3.3 Verified all 13 tables + _prisma_migrations created in PostgreSQL
  - [x] 3.4 Ran `npx prisma generate` — client generated successfully

- [x] Task 4: Verify Docker Compose setup (AC: 15)
  - [x] 4.1 Confirmed docker-compose.yml: PostgreSQL 16 Alpine, port 5432, canifed/canifed/canifed
  - [x] 4.2 Confirmed .env: DATABASE_URL="postgresql://canifed:canifed@localhost:5432/canifed?schema=public"

## Dev Notes

### Architecture Constraints — MUST FOLLOW

**Multi-Tenancy (CRITICAL):**
- Every tenant-scoped model MUST have a `clubId` UUID FK referencing Club
- Tenant-scoped models: ClubMember, Event, EventParticipation, Dog, Document, ChatChannel, ChatMessage, LicenseType, Payment
- Non-tenant-scoped: User, Consent (user-level, not club-level)
- VaccineRecord is scoped via Dog (Dog has clubId) — no direct clubId needed
- [Source: architecture.md — Multi-Tenant Data Model section, lines 202-208]

**Naming Conventions:**
- Models: PascalCase singular (User, ClubMember, VaccineRecord)
- Columns: camelCase (userId, clubId, createdAt)
- Enums: PascalCase name with SCREAMING_SNAKE values (enum Role { OWNER ADMIN MEMBER })
- [Source: architecture.md — Database Naming section, lines 294-301]

**Prisma Driver Adapter Pattern:**
- Use `@prisma/adapter-pg` with raw `pg` driver — NOT Prisma's default connection
- This is required for Neon serverless PostgreSQL compatibility (connection pooling)
- Add `previewFeatures = ["driverAdapters"]` to generator client block
- [Source: architecture.md — Key Technical Detail, lines 151-152]

**ID Strategy:**
- All IDs are UUID v4: `id String @id @default(uuid())`
- All models have `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- Exception: ChatMessage may omit updatedAt (messages are immutable)

### Existing Code — DO NOT RECREATE

| File | Status | Action |
|---|---|---|
| `libs/shared/prisma-client/prisma/schema.prisma` | Placeholder User model | **REPLACE** contents with full schema |
| `libs/shared/prisma-client/src/lib/prisma-client.ts` | Basic PrismaClient singleton | **MODIFY** to use @prisma/adapter-pg |
| `libs/api/core/src/lib/prisma.service.ts` | Extends PrismaClient | **VERIFY** still works after adapter change |
| `docker-compose.yml` | PostgreSQL 16 ready | **NO CHANGE** — already correct |
| `libs/shared/prisma-client/src/index.ts` | Exports prisma-client | **NO CHANGE** |

### Dependencies — ALREADY INSTALLED

All required packages are in package.json. Do NOT install anything:
- `@prisma/client` ^7.5.0
- `@prisma/adapter-pg` ^7.5.0
- `prisma` ^7.5.0 (devDependency)
- `pg` ^8.20.0
- `@types/pg` ^8.20.0

### Model Relationship Summary

```
User ──< ClubMember >── Club
User ──< Dog ──< VaccineRecord
User ──< Document
User ──< Payment
User ──< Consent
User ──< ChatMessage
User ──< EventParticipation

Club ──< Event ──< EventParticipation
Club ──< Dog
Club ──< Document
Club ──< ChatChannel ──< ChatMessage
Club ──< LicenseType ──< Payment
```

### Anti-Patterns to Avoid

- Do NOT create separate Prisma schema files per module — single schema.prisma is the source of truth
- Do NOT use autoincrement IDs — UUID v4 only
- Do NOT add a `clubId` to VaccineRecord — it's scoped transitively via Dog (Dog has clubId)
- EventParticipation DOES need a direct `clubId` — it's a tenant-scoped entity and direct FK enables efficient club-scoped queries
- Do NOT add `updatedAt` to ChatMessage — messages are immutable
- Do NOT create any NestJS modules, controllers, or services — this story is schema-only + prisma-client adapter
- Do NOT create Zod schemas — that's a separate story
- Do NOT create seed files — not required by AC

### Project Structure Notes

- Schema lives at `libs/shared/prisma-client/prisma/schema.prisma` — shared across API and any future consumers
- Migrations will be generated at `libs/shared/prisma-client/prisma/migrations/`
- Generated Prisma client types are consumed via `@prisma/client` import — the Nx lib re-exports them
- PrismaService in `libs/api/core` is the NestJS injectable wrapper — it should continue to extend PrismaClient

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.1 section, lines 259-285]
- [Source: _bmad-output/planning-artifacts/architecture.md — Multi-Tenant Data Model, lines 202-208]
- [Source: _bmad-output/planning-artifacts/architecture.md — Database Naming, lines 294-301]
- [Source: _bmad-output/planning-artifacts/architecture.md — Prisma Driver Adapter, lines 151-152]
- [Source: _bmad-output/planning-artifacts/architecture.md — Tech Stack, lines 192-199]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure, lines 566-573]
- [Source: _bmad-output/planning-artifacts/epics.md — Additional Requirements, lines 105-127]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Prisma 7.5 breaking change: `datasource.url = env("DATABASE_URL")` no longer supported in schema.prisma. Moved to `prisma.config.ts` at project root with `defineConfig()`.
- `previewFeatures = ["driverAdapters"]` not needed in Prisma 7.5 — driver adapters are GA.
- `prisma.config.ts` must be at project root when using `npx prisma` (not in subdirectory).
- `earlyAccess` property in defineConfig is not a valid Prisma 7 config option — removed.

### Completion Notes List

- All 13 models created with correct relations, enums, and FK constraints
- 6 enums defined with SCREAMING_SNAKE values
- All tenant-scoped models have `clubId` FK with index
- EventParticipation has direct `clubId` FK for efficient queries
- VaccineRecord scoped transitively via Dog (no direct clubId)
- ChatMessage is immutable (no updatedAt)
- PrismaClient and PrismaService updated to use `@prisma/adapter-pg` PrismaPg adapter
- Migration 20260322060450_init successfully applied — all tables verified in PostgreSQL
- `prisma.config.ts` created at project root for Prisma 7.5 CLI compatibility
- All 30 existing tests pass — no regressions
- API build succeeds with TypeScript compilation

### Change Log

- 2026-03-22: Story 1.1 implemented — complete Prisma schema with 13 models, 6 enums, adapter-pg integration, initial migration

### File List

- libs/shared/prisma-client/prisma/schema.prisma (MODIFIED — replaced placeholder with full schema)
- libs/shared/prisma-client/prisma/migrations/20260322060450_init/migration.sql (NEW)
- libs/shared/prisma-client/src/lib/prisma-client.ts (MODIFIED — added PrismaPg adapter)
- libs/api/core/src/lib/prisma.service.ts (MODIFIED — added PrismaPg adapter in constructor)
- prisma.config.ts (NEW — Prisma 7.5 config with datasource.url and migrate.adapter)
