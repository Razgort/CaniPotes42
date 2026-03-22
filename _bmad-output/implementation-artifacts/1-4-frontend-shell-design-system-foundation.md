# Story 1.4: Frontend Shell & Design System Foundation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a consistent visual foundation with proper design tokens, typography, spacing, responsive layout shell, and accessibility baseline,
So that the app looks polished and feels reliable from the very first screen.

## Acceptance Criteria

1. CSS variables are defined in `apps/frontend/src/styles.css` for all design tokens: `--primary` (#2563EB), `--primary-hover` (#1D4ED8), `--primary-light` (#DBEAFE), `--accent` (#F97316), `--accent-hover` (#EA580C), `--accent-light` (#FFF7ED), `--success` (#16A34A), `--warning` (#D97706), `--danger` (#DC2626), `--background` (#FAFAFA), `--card` (#FFFFFF), `--foreground` (#18181B), `--muted` (#71717A), `--border` (#E4E4E7)
2. Inter font is loaded via Google Fonts `<link>` in `index.html` with system font fallback stack (`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
3. Typography scale is implemented: H1 (24px/700), H2 (20px/600), H3 (16px/600), Body (14px/400), Body Large (16px/400), Small (12px/400), Caption (11px/500)
4. Tailwind v4 `@theme` directive extends the theme with custom color tokens mapping to CSS variables and spacing scale (4/8/12/16/24/32/48px)
5. A responsive `AppShell` layout component exists in `libs/frontend/ui` with: mobile bottom tab bar placeholder (56px height), header with club name placeholder (56px height), and scrollable main content area
6. Responsive breakpoints work: mobile (<640px single column, 16px padding), tablet (640-1024px, 24px padding, max-width 768px), desktop (>1024px, left sidebar 240px placeholder, 32px padding, max-width 1200px)
7. shadcn/ui is configured in `libs/frontend/ui` with `cn()` utility (clsx + tailwind-merge) — ALREADY EXISTS, verify only
8. A Toast notification system is set up using `sonner` with success (green, auto-dismiss 3s) and error (red, persist until dismissed) variants
9. Skeleton placeholder components exist for card and list loading states in `libs/frontend/ui`
10. React Router is configured with `React.lazy()` + `Suspense` for route-level code splitting in `libs/frontend/features`
11. `AuthContext` provider shell exists with `{ user, accessToken, activeClub, role, isAuthenticated, switchClub(), logout() }` — state management ready for Epic 2, no real auth logic
12. TanStack Query client is configured with sensible defaults (`staleTime: 5 * 60 * 1000`, `retry: 1`, `refetchOnWindowFocus: false`)
13. A centralized API client exists in `libs/frontend/data-access` with base URL from env, auth header injection, and error formatting (API error codes → French "nous" phrasing messages)
14. `eslint-plugin-jsx-a11y` is configured and passing
15. Visible focus ring (`2px solid var(--primary)`, `outline-offset: 2px`) is applied globally to all focusable elements via `:focus-visible`
16. `prefers-reduced-motion` is respected: all transitions/animations disabled when media query matches
17. PWA `manifest.json` is present in `apps/frontend/public/` with app name "CaniFed", icons placeholder, theme color #2563EB, background color #FAFAFA, display standalone

## Tasks / Subtasks

### Task 1: Install missing dependencies (AC: #8, #12, #14)

- [ ] 1.1 Run `pnpm add @tanstack/react-query sonner`
- [ ] 1.2 Run `pnpm add -D eslint-plugin-jsx-a11y @testing-library/react @testing-library/jest-dom`
- [ ] 1.3 Verify packages resolve in `node_modules`

### Task 2: Design tokens + Tailwind v4 theme (AC: #1, #4)

- [ ] 2.1 In `apps/frontend/src/styles.css`, add `:root` block with ALL CSS custom properties from AC #1
- [ ] 2.2 In the same file, add `@theme` block (Tailwind v4 CSS-first config) mapping custom colors and spacing:
  ```css
  @theme {
    --color-primary: var(--primary);
    --color-primary-hover: var(--primary-hover);
    --color-primary-light: var(--primary-light);
    --color-accent: var(--accent);
    --color-accent-hover: var(--accent-hover);
    --color-accent-light: var(--accent-light);
    --color-success: var(--success);
    --color-warning: var(--warning);
    --color-danger: var(--danger);
    --color-background: var(--background);
    --color-card: var(--card);
    --color-foreground: var(--foreground);
    --color-muted: var(--muted);
    --color-border: var(--border);
    --spacing-1: 4px;
    --spacing-2: 8px;
    --spacing-3: 12px;
    --spacing-4: 16px;
    --spacing-6: 24px;
    --spacing-8: 32px;
    --spacing-12: 48px;
  }
  ```

### Task 3: Inter font + typography (AC: #2, #3)

- [ ] 3.1 In `apps/frontend/index.html`, add Google Fonts `<link>` for Inter (weights 400, 500, 600, 700) with `display=swap`
- [ ] 3.2 In `apps/frontend/index.html`, set `<html lang="fr">` (MVP is French)
- [ ] 3.3 In `apps/frontend/index.html`, update `<title>` to "CaniFed"
- [ ] 3.4 In `styles.css` `@theme` block, add: `--font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`
- [ ] 3.5 In `styles.css`, add base `body` styles: font-family, color foreground, background, font-size 14px, line-height 1.5
- [ ] 3.6 In `styles.css`, add typography utility classes:
  - `.text-h1` → 24px / font-weight 700
  - `.text-h2` → 20px / font-weight 600
  - `.text-h3` → 16px / font-weight 600
  - `.text-body` → 14px / font-weight 400
  - `.text-body-lg` → 16px / font-weight 400
  - `.text-small` → 12px / font-weight 400
  - `.text-caption` → 11px / font-weight 500 / uppercase / letter-spacing 0.05em

### Task 4: Accessibility CSS (AC: #15, #16)

- [ ] 4.1 In `styles.css`, add global `:focus-visible` rule: `outline: 2px solid var(--primary); outline-offset: 2px;`
- [ ] 4.2 In `styles.css`, add `@media (prefers-reduced-motion: reduce)` block disabling all animations/transitions

### Task 5: AppShell responsive layout (AC: #5, #6)

- [ ] 5.1 Create `libs/frontend/ui/src/lib/AppShell.tsx`:
  - `<header>` fixed top, 56px h, club name prop (default "CaniFed"), bg-card, border-bottom border-border
  - `<main>` scrollable content area, responsive padding (16px mobile / 24px tablet / 32px desktop), max-width (768px tablet / 1200px desktop), centered
  - `<nav>` fixed bottom on mobile only (<640px), 56px h, placeholder tab icons, bg-card, border-top border-border
  - Desktop (>1024px): `<aside>` fixed left sidebar 240px, placeholder, bg-card, border-right; main shifts right
  - Tablet (640-1024px): no sidebar, no bottom nav, centered content
  - Use semantic HTML: `<header>`, `<main>`, `<nav>`, `<aside>`
- [ ] 5.2 Replace old `Layout` in `libs/frontend/ui/src/lib/ui.tsx` — either rewrite to re-export AppShell or delete and update index.ts
- [ ] 5.3 Update `libs/frontend/ui/src/index.ts`: export `AppShell`, remove old `Layout` export
- [ ] 5.4 Update `apps/frontend/src/app/app.tsx`: import `AppShell` instead of `Layout`
- [ ] 5.5 Write test `libs/frontend/ui/src/lib/AppShell.test.tsx`: verify header, main, nav render; verify club name renders

### Task 6: Toast notification system (AC: #8)

- [ ] 6.1 Create `libs/frontend/ui/src/lib/Toast.tsx`:
  - Thin wrapper exporting `<Toaster />` from sonner with design token styling
  - Position: `bottom-center` (mobile-friendly)
  - Export typed helpers: `toast.success(msg)` (green, auto-dismiss 3000ms) and `toast.error(msg)` (red, duration Infinity)
- [ ] 6.2 Add `<Toaster />` to AppShell component
- [ ] 6.3 Update `libs/frontend/ui/src/index.ts`: export Toast utilities
- [ ] 6.4 Write test `libs/frontend/ui/src/lib/Toast.test.tsx`: verify Toaster renders

### Task 7: Skeleton loading components (AC: #9)

- [ ] 7.1 Create `libs/frontend/ui/src/lib/Skeleton.tsx`:
  - `SkeletonCard`: rounded rectangle, pulse animation, configurable height (default 120px), full width, bg-border/opacity
  - `SkeletonList`: accepts `count` prop (default 3), renders horizontal bar skeletons with varying widths, pulse animation
  - Pulse animation respects `prefers-reduced-motion`
- [ ] 7.2 Update `libs/frontend/ui/src/index.ts`: export skeleton components
- [ ] 7.3 Write test `libs/frontend/ui/src/lib/Skeleton.test.tsx`: verify correct number of elements render

### Task 8: React Router with lazy loading (AC: #10)

- [ ] 8.1 Create placeholder pages in `libs/frontend/features/src/lib/pages/`:
  - `HomePage.tsx` — div with "Accueil" heading
  - `NotFoundPage.tsx` — div with "Page non trouvée" message
- [ ] 8.2 Rewrite `libs/frontend/features/src/lib/features.tsx` (AppRoutes):
  - `React.lazy()` imports for HomePage, NotFoundPage
  - `<Suspense fallback={<SkeletonList />}>` wrapping `<Routes>`
  - Route `/` → lazy HomePage
  - Route `*` → lazy NotFoundPage
- [ ] 8.3 Write test `libs/frontend/features/src/lib/features.test.tsx`: verify routes render correct content

### Task 9: AuthContext provider shell (AC: #11)

- [ ] 9.1 Create `libs/frontend/data-access/src/lib/AuthContext.tsx`:
  ```typescript
  interface User { id: string; email: string; firstName: string; lastName: string; }
  interface Club { id: string; name: string; }
  type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

  interface AuthContextValue {
    user: User | null;
    accessToken: string | null;
    activeClub: Club | null;
    role: UserRole | null;
    isAuthenticated: boolean;
    switchClub: (clubId: string) => void;
    logout: () => void;
  }
  ```
  - `AuthProvider` component — all values initially null/false
  - `switchClub` and `logout` are no-op stubs
  - `useAuth()` hook — throws if used outside `AuthProvider`
- [ ] 9.2 Update `libs/frontend/data-access/src/index.ts`: export `AuthProvider`, `useAuth`, type interfaces
- [ ] 9.3 Write test `libs/frontend/data-access/src/lib/AuthContext.test.tsx`: verify useAuth throws outside provider, verify default values inside

### Task 10: TanStack Query setup (AC: #12)

- [ ] 10.1 Create `libs/frontend/data-access/src/lib/QueryProvider.tsx`:
  - `QueryClient` with `defaultOptions.queries`: `staleTime: 5 * 60 * 1000`, `retry: 1`, `refetchOnWindowFocus: false`
  - `QueryProvider` component wrapping children with `<QueryClientProvider>`
  - Export `queryClient` for test access
- [ ] 10.2 Update `libs/frontend/data-access/src/index.ts`: export `QueryProvider`
- [ ] 10.3 Write test `libs/frontend/data-access/src/lib/QueryProvider.test.tsx`: verify renders children

### Task 11: Centralized API client (AC: #13)

- [ ] 11.1 Create `libs/frontend/data-access/src/lib/api-client.ts`:
  - `API_BASE_URL` from `import.meta.env.VITE_API_URL || '/api'`
  - French error messages mapped from HTTP status codes:
    - 400: "Nous n'avons pas pu traiter votre demande."
    - 401: "Nous devons vous identifier. Veuillez vous connecter."
    - 403: "Nous ne pouvons pas vous autoriser à accéder à cette ressource."
    - 404: "Nous n'avons pas trouvé ce que vous cherchez."
    - 409: "Nous avons détecté un conflit avec les données existantes."
    - 500: "Nous rencontrons un problème technique. Veuillez réessayer."
  - `apiClient` object with methods: `get<T>`, `post<T>`, `patch<T>`, `delete<T>`
  - `setTokenGetter(fn: () => string | null)` — avoids circular deps with AuthContext
  - Auth header injection: `Authorization: Bearer ${token}` when token available
  - On error: parse JSON body, map status to French message, throw typed `ApiClientError`
- [ ] 11.2 Delete old `libs/frontend/data-access/src/lib/data-access.tsx`
- [ ] 11.3 Update `libs/frontend/data-access/src/index.ts`: export apiClient, setTokenGetter, ApiClientError (remove old fetchApi)
- [ ] 11.4 Write test `libs/frontend/data-access/src/lib/api-client.test.ts`: mock fetch, verify GET/POST, verify auth header, verify French error mapping

### Task 12: Wire up providers in App (AC: #5, #11, #12)

- [ ] 12.1 Rewrite `apps/frontend/src/app/app.tsx`:
  ```tsx
  import { AppShell } from '@org/ui';
  import { AppRoutes } from '@org/features';
  import { AuthProvider, QueryProvider } from '@org/data-access';

  export function App() {
    return (
      <QueryProvider>
        <AuthProvider>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </AuthProvider>
      </QueryProvider>
    );
  }
  ```
  Provider nesting (outermost → innermost): `BrowserRouter` (in main.tsx, already exists) → `QueryProvider` → `AuthProvider` → `AppShell` → `Toaster` + `AppRoutes`

### Task 13: ESLint jsx-a11y configuration (AC: #14)

- [ ] 13.1 Configure `eslint-plugin-jsx-a11y` — find and update the project's ESLint configuration (check for existing Nx-generated config, or create one). Apply recommended rules to `*.tsx` files
- [ ] 13.2 Run `pnpm nx lint frontend` and fix any violations
- [ ] 13.3 Verify lint passes with zero errors

### Task 14: PWA manifest (AC: #17)

- [ ] 14.1 Create `apps/frontend/public/manifest.json`:
  ```json
  {
    "name": "CaniFed",
    "short_name": "CaniFed",
    "description": "Gestion de club de canicross",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#2563EB",
    "background_color": "#FAFAFA",
    "icons": [
      { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- [ ] 14.2 Create placeholder icons at `apps/frontend/public/icons/icon-192.png` and `icon-512.png`
- [ ] 14.3 In `apps/frontend/index.html`, add `<link rel="manifest" href="/manifest.json" />` and `<meta name="theme-color" content="#2563EB" />`

### Task 15: Verify end-to-end (AC: all)

- [ ] 15.1 Run `pnpm nx serve frontend` — verify: Inter font loads, design tokens apply, AppShell renders with header/content/nav, responsive breakpoints work
- [ ] 15.2 Run `pnpm nx test frontend` — all tests pass (also test libs: `pnpm nx run-many -t test -p @org/ui @org/features @org/data-access`)
- [ ] 15.3 Run `pnpm nx lint frontend` — zero errors including jsx-a11y
- [ ] 15.4 Run `pnpm nx build frontend` — build succeeds

## Dev Notes

### CRITICAL: Tailwind CSS 4 — NO tailwind.config.js

This project uses **Tailwind CSS 4.2.2** with `@tailwindcss/vite` plugin. Tailwind v4 uses CSS-first configuration:
- There is **NO `tailwind.config.js`** or `tailwind.config.ts`. Do NOT create one.
- Theme customization via `@theme { ... }` directive in CSS
- Custom colors: `--color-*` inside `@theme`
- Custom spacing: `--spacing-*` inside `@theme`
- Custom fonts: `--font-*` inside `@theme`
- `@import "tailwindcss"` already exists in `styles.css`
- `@tailwindcss/vite` already configured in `vite.config.mts`
- Do NOT use Tailwind v3 `theme.extend` patterns — they will not work

### Library imports via `@org/*` path aliases

Nx workspace uses non-buildable libraries with custom TypeScript condition `@org/source`. Each lib's `package.json` has exports mapping `"@org/source": "./src/index.ts"` so Vite resolves directly to TypeScript source.
- Import from `@org/ui`, `@org/features`, `@org/data-access`
- All new exports MUST be added to the lib's `src/index.ts` barrel file
- Do NOT use relative cross-lib imports

### AuthContext — shell only

The AuthContext is a **placeholder**. All values start null/false. `switchClub` and `logout` are no-ops. Real auth logic comes in Epic 2. Do NOT import or call any backend endpoints.

### API client — token injection pattern

To avoid circular deps between AuthContext and API client, use a `setTokenGetter` callback pattern: AuthProvider calls `setTokenGetter(() => accessToken)` on mount. The API client calls the getter before each request.

### Error messages — French "nous" phrasing

All user-facing error strings in **French**, using "nous" (we) phrasing per architecture decision. Never blame the user. [Source: architecture.md — Error Handling Pipeline]

### Testing approach

- **Vitest** with jsdom environment
- **@testing-library/react** for component tests (MUST INSTALL)
- Co-locate test files next to source: `*.test.tsx` / `*.test.ts`
- No `__tests__` directories

### Provider nesting order

```
<BrowserRouter>          ← main.tsx (ALREADY EXISTS — do NOT touch)
  <QueryProvider>        ← TanStack Query
    <AuthProvider>       ← Auth context
      <AppShell>         ← Layout shell
        <Toaster />      ← Sonner toast container
        <AppRoutes />    ← Lazy routes with Suspense
      </AppShell>
    </AuthProvider>
  </QueryProvider>
</BrowserRouter>
```

### Project Structure Notes

```
apps/frontend/
  index.html                    ← MODIFY (Inter font, manifest link, lang="fr", title)
  public/
    manifest.json               ← CREATE
    icons/
      icon-192.png              ← CREATE (placeholder)
      icon-512.png              ← CREATE (placeholder)
  src/
    styles.css                  ← MODIFY (design tokens, @theme, typography, a11y)
    main.tsx                    ← NO CHANGE
    app/
      app.tsx                   ← MODIFY (add providers, swap Layout→AppShell)

libs/frontend/ui/src/
  index.ts                      ← MODIFY (update exports)
  lib/
    cn.ts                       ← NO CHANGE
    ui.tsx                      ← DELETE or REPLACE (old Layout)
    AppShell.tsx                ← CREATE
    AppShell.test.tsx           ← CREATE
    Toast.tsx                   ← CREATE
    Toast.test.tsx              ← CREATE
    Skeleton.tsx                ← CREATE
    Skeleton.test.tsx           ← CREATE

libs/frontend/features/src/
  index.ts                      ← NO CHANGE
  lib/
    features.tsx                ← MODIFY (React.lazy + Suspense)
    features.test.tsx           ← CREATE
    pages/
      HomePage.tsx              ← CREATE
      NotFoundPage.tsx          ← CREATE

libs/frontend/data-access/src/
  index.ts                      ← MODIFY (new exports)
  lib/
    data-access.tsx             ← DELETE (replaced by api-client.ts)
    api-client.ts               ← CREATE
    api-client.test.ts          ← CREATE
    AuthContext.tsx              ← CREATE
    AuthContext.test.tsx         ← CREATE
    QueryProvider.tsx            ← CREATE
    QueryProvider.test.tsx       ← CREATE
```

### Existing Code — DO NOT RECREATE

| File | Status | Notes |
|---|---|---|
| `libs/frontend/ui/src/lib/cn.ts` | CORRECT | `cn()` with clsx + tailwind-merge. Do NOT modify. |
| `apps/frontend/src/main.tsx` | CORRECT | BrowserRouter + StrictMode + App. Do NOT modify. |
| `apps/frontend/vite.config.mts` | CORRECT | @tailwindcss/vite + @vitejs/plugin-react configured. Do NOT modify. |
| `apps/frontend/tsconfig.json` | CORRECT | Do NOT modify. |
| `apps/frontend/tsconfig.app.json` | CORRECT | Do NOT modify. |

### Dependencies — ALREADY INSTALLED (do NOT reinstall)

| Package | Version |
|---|---|
| `react` / `react-dom` | ^19.0.0 |
| `react-router-dom` | 6.30.3 |
| `tailwindcss` | ^4.2.2 |
| `@tailwindcss/vite` | ^4.2.2 |
| `clsx` | ^2.1.1 |
| `tailwind-merge` | ^3.5.0 |
| `class-variance-authority` | ^0.7.1 |
| `lucide-react` | ^0.577.0 |
| `zod` | ^4.3.6 |
| `vitest` | ~4.0.0 |
| `vite` | ^7.0.0 |
| `typescript` | ~5.9.2 |

### Dependencies — MUST INSTALL

| Package | Command | Purpose |
|---|---|---|
| `@tanstack/react-query` | `pnpm add @tanstack/react-query` | Server state (AC #12) |
| `sonner` | `pnpm add sonner` | Toast notifications (AC #8) |
| `eslint-plugin-jsx-a11y` | `pnpm add -D eslint-plugin-jsx-a11y` | Accessibility linting (AC #14) |
| `@testing-library/react` | `pnpm add -D @testing-library/react` | Component testing |
| `@testing-library/jest-dom` | `pnpm add -D @testing-library/jest-dom` | DOM matchers |

### Anti-Patterns — DO NOT DO

1. **DO NOT create `tailwind.config.js`** — Tailwind v4 uses CSS-first `@theme`. A JS config will cause conflicts.
2. **DO NOT use `@apply`** for typography classes — define as plain CSS.
3. **DO NOT implement real auth logic** — AuthContext is a shell. No API calls, no token storage.
4. **DO NOT create actual page content** — placeholders only (HomePage: "Accueil", NotFoundPage: "Page non trouvée").
5. **DO NOT install React Hook Form** — not needed for this story.
6. **DO NOT add `postcss.config.js`** — Tailwind v4 with @tailwindcss/vite does not use PostCSS.
7. **DO NOT use spinners** — use Skeleton components per UX spec.
8. **DO NOT put tests in `__tests__/` directories** — co-locate next to source files.
9. **DO NOT modify `cn.ts`** — it already works correctly.
10. **DO NOT use relative cross-lib imports** — always import via `@org/ui`, `@org/features`, `@org/data-access`.
11. **DO NOT use `theme.extend` syntax** — that is Tailwind v3. Use `@theme { --color-*: ... }` in CSS.
12. **DO NOT use `console.log`** — follow architecture convention.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.4, lines 337-363]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Architecture, lines 240-250]
- [Source: _bmad-output/planning-artifacts/architecture.md — Implementation Patterns, lines 286-498]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming Conventions, lines 292-324]
- [Source: _bmad-output/planning-artifacts/architecture.md — React Feature Pattern, lines 343-356]
- [Source: _bmad-output/planning-artifacts/architecture.md — TanStack Query Keys, lines 422-432]
- [Source: _bmad-output/planning-artifacts/architecture.md — AuthContext shape, lines 434-438]
- [Source: _bmad-output/planning-artifacts/architecture.md — Error Handling Pipeline, lines 443-449]
- [Source: _bmad-output/planning-artifacts/architecture.md — Loading State Pattern, lines 452-456]
- [Source: _bmad-output/planning-artifacts/epics.md — UX-DR11 Design tokens, line 141]
- [Source: _bmad-output/planning-artifacts/epics.md — UX-DR12 Typography, line 142]
- [Source: _bmad-output/planning-artifacts/epics.md — UX-DR13 Spacing/Layout, line 143]
- [Source: _bmad-output/planning-artifacts/epics.md — UX-DR14 Feedback patterns, line 144]
- [Source: _bmad-output/planning-artifacts/epics.md — UX-DR17 Responsive layout, line 147]
- [Source: _bmad-output/planning-artifacts/epics.md — UX-DR18 Accessibility, line 148]
- [Source: _bmad-output/planning-artifacts/epics.md — Additional Requirements, lines 105-127]

### Previous Story Intelligence

Story 1.1 (Prisma Schema & Database Setup) — file at `_bmad-output/implementation-artifacts/1-1-prisma-schema-database-setup.md`:
- Established task breakdown pattern with AC references
- Used explicit file action tables (REPLACE/MODIFY/NO CHANGE)
- Docker Compose for local PostgreSQL already exists and works
- No stories 1.2 or 1.3 exist yet — this story is independent of them (frontend-only)

### Git Intelligence

Recent commits show the project is in early scaffolding phase:
- `4ff40d7` — architecture document completed
- `5c352ee` — renamed to CaniFed, added planning artifacts and dependencies
- `162e935` — initial Nx monorepo with React + NestJS + Prisma + Tailwind/shadcn

No frontend implementation work has been done yet beyond the scaffold.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
