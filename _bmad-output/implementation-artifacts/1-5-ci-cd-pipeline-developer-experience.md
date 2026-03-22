# Story 1.5: CI/CD Pipeline & Developer Experience

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want GitHub Actions CI running lint, typecheck, and tests on PRs, plus local dev tooling (Docker Compose, env validation, Swagger),
So that code quality is enforced automatically and local development is fast and reliable.

## Acceptance Criteria

1. **Given** the GitHub repository
   **When** a pull request is opened against main or develop
   **Then** a CI workflow runs: `nx affected -t lint typecheck test` against the PR changes
   **And** the CI workflow fails if any lint error, type error, or test failure occurs
   **And** the CI workflow uses Node.js LTS and caches node_modules and Nx cache for speed

2. **Given** the local development environment
   **When** a developer runs `docker compose up -d`
   **Then** a PostgreSQL container starts on port 5432 with a preconfigured database
   **And** `.env.example` documents all required environment variables
   **And** `cp .env.example .env` + `prisma migrate dev` + `nx serve api` + `nx serve frontend` is the complete setup flow

3. **Given** the API application
   **When** it starts up
   **Then** environment variables are validated against the Zod env schema — startup fails fast with clear error messages if any are missing or invalid
   **And** Swagger/OpenAPI documentation is available at /api/docs in development mode
   **And** @nestjs/swagger decorators are used on all DTOs and controllers

## Tasks / Subtasks

- [x] Task 1: Install required dependencies (AC: #3)
  - [x] 1.1 Install `@nestjs/swagger` (NestJS 11 compatible)
  - [x] 1.2 Install `zod` (shared env validation — also needed by Story 1.3)
  - [x] 1.3 Verify both packages resolve correctly in the monorepo root `package.json`

- [x] Task 2: Configure ESLint for the workspace (AC: #1)
  - [x] 2.1 Install `@nx/eslint` and run the Nx ESLint init generator to enable linting across projects
  - [x] 2.2 Ensure `lint` target is available on `api`, `frontend`, and library projects
  - [x] 2.3 Verify `npx nx run-many -t lint` passes (or only has fixable warnings)
  - [x] 2.4 Update `nx.json` generator defaults to remove `"linter": "none"` so future projects get ESLint by default

- [x] Task 3: Update CI workflow to match AC requirements (AC: #1)
  - [x] 3.1 Edit `.github/workflows/ci.yml`
  - [x] 3.2 Change trigger: add `develop` branch to `push.branches` list (keep `main`)
  - [x] 3.3 Change PR trigger to only fire on PRs targeting `main` or `develop`
  - [x] 3.4 Replace `npx nx run-many -t lint test build typecheck e2e-ci` with `npx nx affected -t lint typecheck test` (use `affected` not `run-many`, remove `build` and `e2e-ci` from this workflow)
  - [x] 3.5 Keep Node.js LTS setup with `actions/setup-node@v4` and npm cache
  - [x] 3.6 Add Nx cache to GitHub Actions cache (cache `.nx/cache` directory)
  - [x] 3.7 Decide on Nx Cloud: keep the `nx start-ci-run --distribute-on` line if Nx Cloud token is configured, or remove it if not using Nx Cloud (the `nxCloudId` exists in nx.json so keep it)
  - [x] 3.8 Keep `nx format:check` step
  - [x] 3.9 Keep `nx fix-ci` step (Nx Cloud self-healing)

- [x] Task 4: Expand `.env.example` with all required variables (AC: #2)
  - [ ] 4.1 Edit `.env.example` to document all variables the API needs:
    ```
    # Database
    DATABASE_URL="postgresql://canifed:canifed@localhost:5432/canifed?schema=public"

    # Server
    PORT=3000
    NODE_ENV=development

    # Authentication (Story 1.2 will use these)
    JWT_SECRET=dev-jwt-secret-change-in-production
    JWT_REFRESH_SECRET=dev-jwt-refresh-secret-change-in-production

    # CORS
    CORS_ORIGINS=http://localhost:4200

    # Swagger (disable in production)
    SWAGGER_ENABLED=true
    ```
  - [ ] 4.2 Add comments explaining each variable's purpose

- [x] Task 5: Create Zod environment validation schema (AC: #3)
  - [ ] 5.1 Create `libs/shared/utils/src/lib/env.schema.ts`
  - [ ] 5.2 Define `envSchema` using Zod with all required env vars:
    - `DATABASE_URL`: z.string().url() — required
    - `PORT`: z.coerce.number().default(3000)
    - `NODE_ENV`: z.enum(['development', 'production', 'test']).default('development')
    - `JWT_SECRET`: z.string().min(16)
    - `JWT_REFRESH_SECRET`: z.string().min(16)
    - `CORS_ORIGINS`: z.string().default('http://localhost:4200')
    - `SWAGGER_ENABLED`: z.coerce.boolean().default(true) — coerce string "true"/"false"
  - [ ] 5.3 Export inferred type: `export type Env = z.infer<typeof envSchema>`
  - [ ] 5.4 Export a `validateEnv()` function that parses `process.env` against the schema and returns typed env, or throws with clear error listing all validation failures
  - [ ] 5.5 Re-export from `libs/shared/utils/src/index.ts`

- [ ] Task 6: Integrate env validation into API bootstrap (AC: #3)
  - [ ] 6.1 Edit `apps/api/src/main.ts`
  - [ ] 6.2 Call `validateEnv()` at the top of `bootstrap()` BEFORE `NestFactory.create()`
  - [ ] 6.3 On validation failure: log each invalid/missing variable with its error message, then `process.exit(1)`
  - [ ] 6.4 On success: store validated env for use by NestJS ConfigModule or direct access

- [ ] Task 7: Configure Swagger/OpenAPI (AC: #3)
  - [ ] 7.1 Edit `apps/api/src/main.ts`
  - [ ] 7.2 Import `SwaggerModule`, `DocumentBuilder` from `@nestjs/swagger`
  - [ ] 7.3 After `NestFactory.create()`, conditionally set up Swagger (only when `SWAGGER_ENABLED=true` or `NODE_ENV=development`):
    ```typescript
    if (env.SWAGGER_ENABLED) {
      const config = new DocumentBuilder()
        .setTitle('CaniFed API')
        .setDescription('Multi-club canine sports platform API')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);
    }
    ```
  - [ ] 7.4 Verify Swagger UI is accessible at `http://localhost:3000/api/docs` in dev mode
  - [ ] 7.5 Add `@ApiTags()` decorator to existing controllers (AppController if it exists)

- [ ] Task 8: Verify Docker Compose local dev flow (AC: #2)
  - [ ] 8.1 Confirm `docker-compose.yml` is correct (PostgreSQL 16 Alpine, port 5432, canifed/canifed/canifed) — ALREADY DONE, no changes needed
  - [ ] 8.2 Test the complete setup flow:
    1. `docker compose up -d`
    2. `cp .env.example .env`
    3. `npx prisma migrate dev --schema libs/shared/prisma-client/prisma/schema.prisma`
    4. `npx nx serve api`
    5. `npx nx serve frontend`
  - [ ] 8.3 Verify API starts without env validation errors
  - [ ] 8.4 Verify Swagger is accessible at /api/docs

## Dev Notes

### Architecture Constraints — MUST FOLLOW

**Package Manager:** npm (not pnpm). The workspace uses `"workspaces"` in package.json (npm native workspaces). CI uses `npm ci`. All Nx commands: `npx nx <target>`.

**Testing Framework:** Vitest 4 with jsdom environment. Tests co-located with source files as `*.spec.ts` / `*.test.tsx`. [Source: architecture.md — Testing Framework, line 126]

**NestJS Logger:** Use `Logger` from `@nestjs/common` with class context. Never `console.log`. [Source: architecture.md — Enforcement Guidelines, line 488]

**Swagger Decorators:** Use `@nestjs/swagger` decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`) on all DTOs and controllers. Auto-generated docs. [Source: architecture.md — API & Communication, line 228]

**Zod Env Schema Location:** `libs/shared/utils/src/lib/env.schema.ts` — architecture defines this path. [Source: architecture.md — Project Structure, line 594]

**CI Pipeline:** `nx affected` for targeted builds/tests on PRs. Run on PR + merge to main. [Source: architecture.md — Infrastructure & Deployment, line 260]

**Environment Config:** `.env` local + platform env vars in production. Zod validates at startup — fail fast if misconfigured. [Source: architecture.md — Infrastructure & Deployment, line 261]

### Existing Code — DO NOT RECREATE

| File | Status | Action |
|------|--------|--------|
| `.github/workflows/ci.yml` | Exists — Nx Cloud CI | **MODIFY** triggers, change `run-many` to `affected`, adjust targets |
| `docker-compose.yml` | Correct — PostgreSQL 16 | **NO CHANGE** |
| `.env.example` | Exists — only DATABASE_URL | **EXPAND** with all required vars |
| `apps/api/src/main.ts` | Basic NestJS bootstrap | **MODIFY** to add env validation + Swagger |
| `libs/shared/utils/src/lib/` | Empty utils library | **ADD** env.schema.ts |
| `nx.json` | Linter set to "none" | **MODIFY** generator defaults after adding ESLint |
| `package.json` | Missing swagger + zod | **MODIFY** to add dependencies |

### Critical Warning: ESLint is NOT Configured

The Nx generators were set up with `"linter": "none"`. No ESLint plugin is in nx.json plugins. No `.eslintrc.*` files exist. The `lint` target will fail because there's nothing to lint against.

**This MUST be fixed before CI can run `nx affected -t lint`.** Use `@nx/eslint` init generator to bootstrap ESLint across the workspace. This is a prerequisite for AC #1.

### Dependencies to Install

| Package | Type | Purpose |
|---------|------|---------|
| `@nestjs/swagger` | dependency | Swagger/OpenAPI docs at /api/docs |
| `zod` | dependency | Env validation schema (also used by Story 1.3 for shared schemas) |
| `@nx/eslint` | devDependency | ESLint plugin for Nx workspace |
| `eslint` | devDependency | Required by @nx/eslint |

**DO NOT install packages already in package.json.** Check first. `@nestjs/swagger` may require `swagger-ui-express` — check NestJS 11 docs. In NestJS 11 with Express adapter, `swagger-ui-express` is typically auto-resolved as a peer dep.

### CI Workflow Key Decisions

The current CI uses Nx Cloud distributed agents (`--distribute-on="3 linux-medium-js"`). This is optional — it requires Nx Cloud to be set up. The `nxCloudId` in nx.json suggests it's configured. **Keep Nx Cloud integration unless it causes issues.**

Key change: `run-many` → `affected`. The `affected` command only runs targets on projects changed in the PR, making CI faster. This is the architecture's prescribed approach.

The `format:check` and `fix-ci` steps are Nx best practices — keep them.

### Swagger in NestJS 11

NestJS 11 uses `@nestjs/swagger` v11+. The API:
- `DocumentBuilder` for configuration
- `SwaggerModule.createDocument()` for generating the OpenAPI spec
- `SwaggerModule.setup('api/docs', app, document)` to mount at the path
- Note: the global prefix is `api`, so Swagger at `api/docs` means it's relative to root (path = `/api/docs`)
- `addBearerAuth()` to add JWT auth to Swagger UI (for testing protected endpoints later)

### Previous Story Intelligence

**From Story 1.1 (Prisma Schema):**
- Docker Compose confirmed working (PostgreSQL 16, canifed/canifed/canifed)
- Prisma migrations run via `npx prisma migrate dev --schema libs/shared/prisma-client/prisma/schema.prisma`
- DATABASE_URL format: `postgresql://canifed:canifed@localhost:5432/canifed?schema=public`

**From Story 1.2 (API Core Infrastructure):**
- Story 1.2 plans to install `zod` — coordinate to avoid duplicate install. If 1.2 is done first, zod will already be present.
- Story 1.2 creates JWT config that reads `JWT_SECRET` and `JWT_REFRESH_SECRET` from env vars — these MUST be in `.env.example` and env schema.
- Story 1.2 creates CORS config that reads `CORS_ORIGINS` env var — this MUST be in `.env.example` and env schema.
- Story 1.2 installs `helmet`, `@nestjs/throttler`, `@nestjs/passport`, `@nestjs/jwt` — no overlap with our dependencies.

### Anti-Patterns to Avoid

- Do NOT create a separate `deploy.yml` workflow — that's Story 1.6
- Do NOT configure ESLint rules manually — use `@nx/eslint` generator which sets up recommended configs
- Do NOT hardcode env vars in main.ts — always read from validated env object
- Do NOT enable Swagger in production — gate on `SWAGGER_ENABLED` or `NODE_ENV`
- Do NOT use `console.log` for env validation errors — use NestJS `Logger`
- Do NOT modify `docker-compose.yml` — it's already correct
- Do NOT create seed files or test data — not in scope
- Do NOT add e2e tests — that's Story 1.6
- Do NOT install `pnpm` or change the package manager — project uses npm

### Project Structure Notes

Files to create:
```
libs/shared/utils/src/lib/env.schema.ts   ← Zod env validation schema
```

Files to modify:
```
.github/workflows/ci.yml                   ← CI trigger + affected command
.env.example                               ← Expand with all env vars
apps/api/src/main.ts                       ← Env validation + Swagger setup
package.json                               ← Add @nestjs/swagger, zod
nx.json                                    ← Remove linter: none defaults
```

Files to generate (via Nx):
```
ESLint configs (generated by @nx/eslint init)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.5, lines 365-389]
- [Source: _bmad-output/planning-artifacts/architecture.md — CI/CD, line 260]
- [Source: _bmad-output/planning-artifacts/architecture.md — Env Config, line 261]
- [Source: _bmad-output/planning-artifacts/architecture.md — Local Dev, line 263]
- [Source: _bmad-output/planning-artifacts/architecture.md — Swagger, line 228]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure env.schema.ts, line 594]
- [Source: _bmad-output/planning-artifacts/architecture.md — DX Workflow, lines 803-827]
- [Source: _bmad-output/planning-artifacts/architecture.md — Enforcement Guidelines, lines 479-491]
- [Source: _bmad-output/implementation-artifacts/1-1-prisma-schema-database-setup.md — Docker Compose, Tasks 3-4]
- [Source: _bmad-output/implementation-artifacts/1-2-api-core-infrastructure.md — JWT/CORS env vars, Tasks 1-3]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
