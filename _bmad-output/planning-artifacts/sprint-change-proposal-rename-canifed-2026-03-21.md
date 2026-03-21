# Sprint Change Proposal: Rename CaniPotes42 → CaniFed

**Date:** 2026-03-21
**Author:** Scrum Master
**Status:** APPROVED
**Scope:** Minor

## 1. Issue Summary

The platform name "CaniPotes42" ties the product identity to a single club (cani'potes 42). As a multi-tenant, federation-agnostic platform serving any canine sports club, the name should reflect its broader purpose. The new name "CaniFed" communicates openness and federation-agnostic design.

**Trigger:** Product owner decision — the platform name must not be tied to one club's identity.
**Evidence:** "CaniPotes42" references a specific FFSLC club; the platform now serves FFSLC, CNEAC, and unaffiliated clubs.

## 2. Impact Analysis

### Epic Impact
No epic changes. Zero functional, architectural, or scope impact. This is a pure text/brand rename.

### Story Impact
No story changes required.

### Artifact Conflicts
All planning artifacts contained platform name references requiring update:

| Artifact | Occurrences Updated |
|----------|-------------------|
| config.yaml | 1 |
| prd.md | 23 |
| product-brief-CaniPotes42-2026-03-21.md | 9 |
| ux-design-specification.md | 8 |
| sprint-change-proposal-2026-03-21.md | 5 |
| prd-validation-report.md | 5 |
| domain-canicross research | 13 |
| technical-canipotes42 research | 17 |
| ui.tsx | 1 |
| docker-compose.yml | 3 |
| .env + .env.example | 2 |
| Memory files | 3 |

**Total:** ~90 occurrences across 12 files.

### Technical Impact
- Database name/user changed: `canipotes42` → `canifed` (docker-compose.yml, .env)
- If a local PostgreSQL database existed with the old name, it would need to be recreated or renamed
- No code logic changes — only string literals

### Preserved References
- "cani'potes 42" (the actual FFSLC club name) — kept as-is throughout all documents
- Filename `product-brief-CaniPotes42-2026-03-21.md` — kept for git history
- Filename `technical-canipotes42-platform-research-2026-03-21.md` — kept for git history
- Club email `contact.canipotes42@gmail.com` — real email, kept as-is

## 3. Recommended Approach

**Direct Adjustment** — find-and-replace across all artifacts, distinguishing platform name ("CaniPotes42" → "CaniFed") from club name ("cani'potes 42" → unchanged).

- **Effort:** Low
- **Risk:** Low
- **Timeline impact:** None

## 4. Detailed Changes

All changes were text replacements of "CaniPotes42" → "CaniFed" in document content, and "canipotes"/"canipotes42" → "canifed" in infrastructure config (docker-compose, .env).

No structural, functional, or architectural changes.

## 5. Implementation Handoff

**Scope classification:** Minor — completed directly.

**Action items for developer:**
- If a local PostgreSQL database named `canipotes42` exists, drop and recreate as `canifed` (or `docker compose down -v && docker compose up -d`)
- Future: consider renaming the git repository folder from `CaniPotes42` to `CaniFed` (optional, cosmetic)

**Success criteria:**
- Zero remaining "CaniPotes42" platform references in active documents (verified)
- Database connection works with new credentials
- UI displays "CaniFed" in header
