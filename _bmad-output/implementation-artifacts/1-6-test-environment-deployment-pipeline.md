# Story 1.6: Test Environment Deployment Pipeline

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want an automated deployment pipeline to a test environment triggered on merges to develop branch,
So that I can verify features in a real environment with real infrastructure before promoting to production.

## Acceptance Criteria

1. **Given** a merge to the develop branch
   **When** the GitHub Actions deploy workflow triggers
   **Then** the frontend is built with `nx build frontend` and deployed to Vercel (or Netlify) preview/staging environment
   **And** the API is built and deployed to Render staging service
   **And** Prisma migrations run automatically against the Neon staging database on deploy
   **And** environment variables for the test environment are configured in the hosting platform (not committed to repo)
   **And** the deployment workflow runs only after CI checks pass (lint, typecheck, test)

2. **Given** the test environment is deployed
   **When** I access the staging frontend URL
   **Then** it connects to the staging API and staging database
   **And** the frontend is served over HTTPS
   **And** the API health endpoint (`/api/health`) returns 200

3. **Given** a merge to the main branch
   **When** the production deploy workflow triggers
   **Then** the same build and deploy process runs against production infrastructure (Vercel prod, Render prod, Neon prod)
   **And** the deployment is separate from the test environment — no shared database or API instance

## Tasks / Subtasks

- [ ] Task 1: Create API health endpoint (AC: #2)
  - [ ] 1.1 Create `libs/api/core/src/lib/health/health.controller.ts` with `@Controller('health')` and a `GET /` handler
  - [ ] 1.2 Return `{ status: 'ok', timestamp: new Date().toISOString() }` — no auth guards (public endpoint)
  - [ ] 1.3 Register `HealthController` in `ApiCoreModule` exports
  - [ ] 1.4 Write unit test `health.controller.spec.ts` verifying 200 response with expected shape
  - [ ] 1.5 Verify endpoint works at `GET /api/health` (global prefix is `api`)

- [ ] Task 2: Create GitHub Actions deploy workflow for staging (AC: #1, #2)
  - [ ] 2.1 Create `.github/workflows/deploy.yml`
  - [ ] 2.2 Trigger on push to `develop` branch only
  - [ ] 2.3 Add `workflow_run` dependency on CI workflow or use the `needs` pattern to ensure CI checks pass first (use `concurrency` group to prevent parallel deploys)
  - [ ] 2.4 Set up Node.js LTS with npm cache (same as ci.yml)
  - [ ] 2.5 Run `npm ci` to install dependencies
  - [ ] 2.6 Add **Frontend deploy step**: run `npx nx build frontend --configuration=production`, then deploy `dist/apps/frontend/` to Vercel using `amondnet/vercel-action@v25` (or Vercel CLI) with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets
  - [ ] 2.7 Add **API deploy step**: trigger Render deploy via deploy hook URL (`RENDER_DEPLOY_HOOK_STAGING` secret) — Render auto-builds from the repo, or use Render API with `RENDER_API_KEY` and `RENDER_SERVICE_ID_STAGING`
  - [ ] 2.8 Add **Database migration step**: run `npx prisma migrate deploy --schema libs/shared/prisma-client/prisma/schema.prisma` using `DATABASE_URL_STAGING` secret (Neon staging connection string)
  - [ ] 2.9 Add **Smoke test step**: `curl -f $STAGING_API_URL/api/health` to verify API is reachable after deploy
  - [ ] 2.10 Add `concurrency: group: deploy-staging, cancel-in-progress: true` to prevent overlapping deploys

- [ ] Task 3: Add production deploy job to deploy workflow (AC: #3)
  - [ ] 3.1 Add a second job `deploy-production` triggered on push to `main` branch
  - [ ] 3.2 Use same structure as staging job but with production secrets: `VERCEL_TOKEN` (same), `VERCEL_PROJECT_ID_PROD` (if different project), `RENDER_DEPLOY_HOOK_PROD` or `RENDER_SERVICE_ID_PROD`, `DATABASE_URL_PROD`
  - [ ] 3.3 Add `concurrency: group: deploy-production, cancel-in-progress: false` (never cancel production deploys mid-flight)
  - [ ] 3.4 Add production smoke test: `curl -f $PROD_API_URL/api/health`
  - [ ] 3.5 Ensure production and staging use completely separate secrets (no shared DB or API instance)

- [ ] Task 4: Configure Render for API deployment (AC: #1, #3)
  - [ ] 4.1 Create `render.yaml` (Blueprint spec) at repo root defining the API web service:
    - `name: canifed-api-staging` (and `canifed-api-prod`)
    - `env: node`
    - `buildCommand: npm ci && npx nx build api --configuration=production`
    - `startCommand: node dist/apps/api/main.js`
    - `envVars` referencing platform env groups (not hardcoded values)
  - [ ] 4.2 Add `prisma migrate deploy` to Render's pre-deploy command (or as part of the build command) so migrations run on every deploy
  - [ ] 4.3 Document required Render environment variables in a `docs/deployment.md` or as comments in render.yaml

- [ ] Task 5: Configure Vercel for frontend deployment (AC: #1, #3)
  - [ ] 5.1 Create `vercel.json` at repo root (or in `apps/frontend/`) with:
    - `buildCommand: npx nx build frontend --configuration=production`
    - `outputDirectory: dist/apps/frontend`
    - `framework: vite`
    - Rewrites for SPA routing: `{ "source": "/(.*)", "destination": "/index.html" }`
  - [ ] 5.2 Document required Vercel environment variables: `VITE_API_URL` pointing to staging/prod API URL
  - [ ] 5.3 Ensure environment variables are set per Vercel environment (Preview = staging API, Production = prod API)

- [ ] Task 6: Update `.env.example` with deployment-related documentation (AC: #1)
  - [ ] 6.1 Add a comment block at the bottom of `.env.example` documenting deployment secrets (not their values):
    ```
    # === Deployment (GitHub Actions secrets — NOT local) ===
    # VERCEL_TOKEN=           ← Vercel deployment token
    # VERCEL_ORG_ID=          ← Vercel org/team ID
    # VERCEL_PROJECT_ID=      ← Vercel project ID (staging)
    # RENDER_DEPLOY_HOOK_STAGING= ← Render deploy hook URL
    # RENDER_DEPLOY_HOOK_PROD=    ← Render deploy hook URL (production)
    # DATABASE_URL_STAGING=   ← Neon staging connection string
    # DATABASE_URL_PROD=      ← Neon production connection string
    # STAGING_API_URL=        ← e.g. https://canifed-api-staging.onrender.com
    # PROD_API_URL=           ← e.g. https://canifed-api.onrender.com
    ```

- [ ] Task 7: Verify end-to-end deploy pipeline (AC: #1, #2, #3)
  - [ ] 7.1 Verify deploy.yml syntax is valid YAML and GitHub Actions compliant
  - [ ] 7.2 Verify all referenced secrets are documented
  - [ ] 7.3 Verify staging and production use completely separate secret names (no accidental sharing)
  - [ ] 7.4 Verify Prisma migration command uses correct schema path
  - [ ] 7.5 Verify health endpoint is accessible and returns expected JSON

## Dev Notes

### Architecture Constraints — MUST FOLLOW

**Package Manager:** npm (not pnpm). The workspace uses `"workspaces"` in package.json (npm native workspaces). CI uses `npm ci`. All Nx commands: `npx nx <target>`.

**Hosting Stack (architecture.md):**
- **Frontend:** Vercel or Netlify — free tier, CDN, automatic HTTPS. Vite build output. [Source: architecture.md — Infrastructure & Deployment, line 256]
- **Backend:** Render — free tier, Docker support, automatic deploys from Git. Cold starts <30s acceptable at pilot. [Source: architecture.md — Infrastructure & Deployment, line 257]
- **Database:** Neon (serverless PostgreSQL) — free tier (0.5 GB), connection pooling built-in, Prisma adapter support. [Source: architecture.md — Infrastructure & Deployment, line 258]

**CI/CD Pipeline:** GitHub Actions. `nx affected` for targeted builds/tests. Run on PR + merge to main. [Source: architecture.md — Infrastructure & Deployment, line 260]

**Deployment file:** `deploy.yml` is prescribed by architecture at `.github/workflows/deploy.yml`. [Source: architecture.md — Project Structure, line 515]

**Prisma Migrations in Deployment:** Use `prisma migrate deploy` (NOT `prisma migrate dev`) for CI/production environments. `prisma migrate dev` is for local development only. [Source: architecture.md — Data Architecture, line 199]

**Prisma Driver Adapter:** The project uses `@prisma/adapter-pg` with raw `pg` driver — the Neon-recommended pattern for serverless PostgreSQL. Connection pooling is built-in. [Source: architecture.md, line 152]

**NestJS Logger:** Use `Logger` from `@nestjs/common` with class context. Never `console.log`. [Source: architecture.md — Enforcement Guidelines, line 488]

**API Global Prefix:** The API uses `api` as global prefix. Health endpoint at `GET /api/health`.

**Testing Framework:** Vitest with jsdom environment. Tests co-located with source files as `*.spec.ts`. [Source: architecture.md — Testing Framework, line 126]

### Existing Code — DO NOT RECREATE

| File | Status | Action |
|------|--------|--------|
| `.github/workflows/ci.yml` | Exists — CI workflow | **NO CHANGE** — deploy workflow is separate |
| `docker-compose.yml` | Exists — PostgreSQL 16 | **NO CHANGE** |
| `apps/api/src/main.ts` | Exists — NestJS bootstrap | **NO CHANGE** (health controller registered via module) |
| `libs/api/core/src/lib/api-core.ts` | Exists — ApiCoreModule | **MODIFY** to register HealthController |
| `libs/shared/prisma-client/prisma/schema.prisma` | Exists — Prisma schema | **NO CHANGE** (migration path referenced) |

### Files to Create

```
.github/workflows/deploy.yml                      ← Deployment pipeline (staging + production)
libs/api/core/src/lib/health/health.controller.ts  ← Health check endpoint
libs/api/core/src/lib/health/health.controller.spec.ts ← Health controller test
render.yaml                                        ← Render Blueprint (optional but recommended)
vercel.json                                        ← Vercel config for SPA routing
```

### Files to Modify

```
libs/api/core/src/lib/api-core.ts                  ← Register HealthController
.env.example                                       ← Add deployment secrets documentation
```

### Critical Warning: Deploy vs CI Workflow

The deploy workflow (`deploy.yml`) is SEPARATE from the CI workflow (`ci.yml`). Do NOT modify `ci.yml` — that was Story 1.5's scope. The deploy workflow should:
1. Trigger on push to `develop` (staging) and `main` (production)
2. Ensure CI passes before deploying (either via `workflow_run` trigger referencing CI, or by including its own lint/typecheck/test step)
3. Build → Deploy → Migrate → Smoke test

### GitHub Actions Secrets Required

All secrets must be configured in the GitHub repository settings. The workflow file references them but NEVER contains actual values.

**Staging:**
- `VERCEL_TOKEN` — Vercel personal access token
- `VERCEL_ORG_ID` — Vercel organization ID
- `VERCEL_PROJECT_ID` — Vercel project ID
- `RENDER_DEPLOY_HOOK_STAGING` — Render deploy hook URL for staging service
- `DATABASE_URL_STAGING` — Neon staging database connection string
- `STAGING_API_URL` — Staging API base URL (for smoke tests)

**Production:**
- `RENDER_DEPLOY_HOOK_PROD` — Render deploy hook URL for production service
- `DATABASE_URL_PROD` — Neon production database connection string
- `PROD_API_URL` — Production API base URL (for smoke tests)

### Render Deployment Notes

Render supports two deployment approaches:
1. **Deploy Hook** — Simple POST to a webhook URL triggers a deploy. Easiest to set up. Use `curl -X POST $RENDER_DEPLOY_HOOK_STAGING`.
2. **Render API** — More control (check deploy status, trigger specific commits). Requires `RENDER_API_KEY` and service ID.

For MVP, deploy hooks are simpler and sufficient. The workflow should use deploy hooks.

Render's build command should include Prisma migration: `npm ci && npx prisma migrate deploy --schema libs/shared/prisma-client/prisma/schema.prisma && npx nx build api --configuration=production`

Start command: `node dist/apps/api/main.js`

### Vercel Deployment Notes

Vercel can auto-detect Vite projects, but the monorepo setup requires explicit configuration:
- Build command must use Nx: `npx nx build frontend --configuration=production`
- Output directory: `dist/apps/frontend`
- SPA routing requires rewrite rules (all paths → index.html)
- Environment variables set per environment in Vercel dashboard (Preview vs Production)
- `VITE_API_URL` must be different per environment (staging API vs production API)

### Neon Database Notes

- Staging and production MUST use separate Neon projects/databases
- Connection strings include pooling by default with Neon
- `prisma migrate deploy` applies pending migrations without creating new ones
- The `@prisma/adapter-pg` driver adapter pattern works seamlessly with Neon's serverless PostgreSQL

### Previous Story Intelligence

**From Story 1.5 (CI/CD Pipeline & Developer Experience):**
- CI workflow exists at `.github/workflows/ci.yml` with `nx affected -t lint typecheck test`
- ESLint configured via `@nx/eslint`
- Swagger available at `/api/docs` in dev mode
- `.env.example` has all required local dev variables
- Zod env validation runs at API startup via `validateEnv()` in `libs/shared/utils/src/lib/env.schema.ts`
- Docker Compose provides local PostgreSQL

**From Story 1.1 (Prisma Schema):**
- Schema at `libs/shared/prisma-client/prisma/schema.prisma`
- Migrations at `libs/shared/prisma-client/prisma/migrations/`
- PrismaService uses `@prisma/adapter-pg` with `pg` driver

**From Story 1.2 (API Core Infrastructure):**
- ApiCoreModule at `libs/api/core/src/lib/api-core.ts` — HealthController must be registered here
- Guards, filters, pipes, interceptors already exist in `libs/api/core/`
- Global prefix is `api` — all endpoints prefixed with `/api/`

### Anti-Patterns to Avoid

- Do NOT put actual secret values in any file committed to the repository
- Do NOT use `prisma migrate dev` in CI/production — always `prisma migrate deploy`
- Do NOT share database instances between staging and production
- Do NOT modify the CI workflow (`ci.yml`) — it's owned by Story 1.5
- Do NOT create Dockerfiles for the API — Render uses native Node.js builds (Docker is optional, not needed for MVP)
- Do NOT install new npm dependencies — this story uses only what's already in the project
- Do NOT add authentication/guards to the health endpoint — it must be public
- Do NOT hardcode URLs in the deploy workflow — always use GitHub Secrets/variables
- Do NOT use `console.log` — use NestJS `Logger`

### Project Structure Notes

The health controller follows the existing pattern in `libs/api/core/`:
```
libs/api/core/src/lib/
├── config/
├── decorators/
├── filters/
├── guards/
├── health/              ← NEW
│   ├── health.controller.ts
│   └── health.controller.spec.ts
├── interceptors/
├── pipes/
├── strategies/
├── api-core.ts          ← MODIFY (register HealthController)
└── prisma.service.ts
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.6, lines 391-417]
- [Source: _bmad-output/planning-artifacts/architecture.md — Infrastructure & Deployment, lines 252-263]
- [Source: _bmad-output/planning-artifacts/architecture.md — Project Structure deploy.yml, line 515]
- [Source: _bmad-output/planning-artifacts/architecture.md — Prisma Driver Adapter, line 152]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Architecture Migrations, line 199]
- [Source: _bmad-output/planning-artifacts/architecture.md — CI Pipeline, lines 823-827]
- [Source: _bmad-output/implementation-artifacts/1-5-ci-cd-pipeline-developer-experience.md — CI workflow, ENV validation]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
