# Sprint Change Proposal: Pivot Multi-Club Platform + Document Management + Paiements

**Date:** 2026-03-21
**Author:** Scrum Master
**Status:** APPROVED
**Trigger:** Strategic pivot — expand MVP from single-club (cani'potes 42) to multi-club SaaS platform targeting CNEAC clubs (zero digital tooling market)
**Scope Classification:** MAJOR — fundamental MVP redefinition

---

## 1. Issue Summary

### Problem Statement

CaniFed was originally scoped as a single-club replacement for CaniClub Connect, serving only cani'potes 42 (FFSLC). However, a strategic opportunity has been identified: **CNEAC clubs (agility, obedience, and other canine sports) have absolutely zero digital club management tools**. This is an empty market with no competition.

The user wants to pivot CaniFed into a **multi-club platform** that serves any canine sports club, regardless of federation affiliation. Additionally, the user wants to add **document management** (digitized health records, registration papers, vaccine certificates) and **digitized license payments** — features that no existing solution provides.

### Context

- Discovered during pre-implementation planning (codebase is at scaffold stage — ideal timing for a pivot)
- CNEAC clubs have no equivalent to CaniClub Connect
- The document management + license payment combo is a strong value proposition with zero competition
- The codebase has only a stub Prisma `User` model — no technical debt to migrate

### Evidence

- CaniClub Connect serves FFSLC clubs only; CNEAC clubs are completely unserved
- FFSLC has ~215 clubs; CNEAC has hundreds more — the addressable market multiplies
- Document management (carnet de santé du chien, registration papers) is currently handled 100% on paper by most clubs

---

## 2. Impact Analysis

### 2.1 Product Brief Impact

| Area | Impact |
|---|---|
| MVP Scope | REWRITE — from single-club to multi-club platform |
| Personas | ADD — CNEAC club admin persona (agility/obedience workflows) |
| Business Objectives | REWRITE — double pilot (FFSLC + CNEAC), new success criteria |
| Future Vision | REWRITE — phasing changed (multi-club pulled to MVP, other features deferred) |
| Revenue Model | ADD — new section: free now, architected for freemium |

### 2.2 Architecture Impact

| Area | Impact |
|---|---|
| Data Model | REDESIGN — multi-tenant (Club as root), add Dog, Document, Payment, License entities |
| API | ADD — tenant isolation middleware (ClubGuard), new modules |
| File Storage | ADD — Cloudflare R2 integration for document uploads |
| Payments | ADD — Stripe Checkout integration |
| Infrastructure | MINOR — add R2 bucket (free), Stripe account (per-txn) |

### 2.3 UX Impact

| Area | Impact |
|---|---|
| Onboarding | ADD — club creation/signup flow |
| Dog Profiles | ADD — new screens for dog management + vaccine tracking |
| Documents | ADD — upload, view, download screens |
| Payments | ADD — license payment flow |
| Personas | ADD — CNEAC-oriented persona |

### 2.4 Epic/Backlog Impact

| Area | Impact |
|---|---|
| Epic count | EXPAND — from 5 implicit epics to 8 explicit epics |
| New epics | Multi-Tenant Foundation, Dog Profiles, Document Management, License Payments |
| Sequencing | CHANGE — multi-tenant must be Epic 1 (foundation) |

---

## 3. Recommended Approach: MVP Scope Redefinition

### KEEP from current MVP (unchanged)

| Feature | Status |
|---|---|
| Event management + GPS/maps | Unchanged |
| Chat + image sharing | Unchanged |
| Authentication | Unchanged |
| Member management | Now scoped per-club |

### PULL FORWARD into MVP

| Feature | Was | Why |
|---|---|---|
| Multi-tenant architecture | Phase 3 | Cannot retrofit later. CNEAC opportunity requires day-1. |
| Dog profiles + vaccine tracking | Phase 2 | Required for document storage. CNEAC dogs need health clearances. |
| Document storage | Not in any phase | Core value prop for CNEAC clubs with zero digital tooling. |
| Payment integration (Stripe) | Phase 3 | License payment = real operational value for pilot clubs. |

### STILL DEFERRED

| Feature | Target |
|---|---|
| FFSLC calendar sync | Phase 2 |
| Push notifications | Phase 2 |
| Carpool coordination | Phase 2-3 |
| Accounting module | Phase 3 |
| Freemium billing/subscription | Phase 3 |

---

## 4. Architecture Changes

### 4.1 Multi-Tenant Data Model

Shared database, shared schema, `clubId` foreign key on all domain entities.

```
Club (tenant root)
 ├── ClubMember (User ↔ Club, role: OWNER/ADMIN/MEMBER)
 ├── Event (club-scoped, draft/published)
 │    └── EventParticipant
 ├── Dog (owned by ClubMember)
 │    └── VaccineRecord
 ├── Document (attached to ClubMember or Dog)
 ├── ChatChannel (club-scoped)
 │    └── ChatMessage
 └── License / Payment (club-scoped)
```

### 4.2 New Entities

**Club** — Tenant root: id, name, slug, description, federation (FFSLC/CNEAC/OTHER/NONE), logo, contact email, settings (JSON)

**ClubMember** — Join: userId + clubId, role (OWNER/ADMIN/MEMBER), status (ACTIVE/INVITED/SUSPENDED)

**Dog** — name, breed, birthDate, chipNumber, photo, linked to ClubMember

**VaccineRecord** — vaccineName, administeredDate, expiryDate, linked to Dog + optional Document

**Document** — type (REGISTRATION_FORM/VACCINE_CERTIFICATE/HEALTH_RECORD/LICENSE/OTHER), fileUrl, fileName, mimeType, size, linked to ClubMember or Dog, expiryDate

**License** — season, type (ANNUAL/DAY_PASS), status (PENDING/PAID/EXPIRED), amount, linked to Payment

**Payment** — stripeSessionId, amount, currency, status (PENDING/COMPLETED/FAILED/REFUNDED)

### 4.3 New Infrastructure

| Component | Solution | Cost |
|---|---|---|
| File storage | Cloudflare R2 (10 GB free, S3-compatible) | $0 |
| Payments | Stripe Checkout (PCI handled by Stripe) | Per-txn only (1.4% + €0.25) |
| Tenant middleware | NestJS ClubGuard (clubId from JWT) | N/A |

### 4.4 Infrastructure Cost Impact

**Zero additional hosting cost.** R2 free tier covers pilot needs. Stripe fees are per-transaction, paid by the club or passed to members. At scale (50 clubs × 100 members × 5 docs × 500 KB = 12.5 GB), R2 costs ~$0.04/month beyond free tier.

---

## 5. New Epic Structure

### Epic 1: Multi-Tenant Foundation (MUST BE FIRST)
- Club entity + CRUD
- ClubMember join table + roles (OWNER, ADMIN, MEMBER)
- Tenant-scoped API middleware (ClubGuard)
- Club onboarding flow (admin creates club)
- Club selection UI (user can belong to multiple clubs)
- Club settings page (name, logo, federation)

### Epic 2: Authentication + RBAC
- User signup / login (email + password)
- JWT with clubId claim
- Role-based access control (owner, admin, member)
- Invite flow (admin invites members by email)

### Epic 3: Member Management (per-club)
- Member directory (club-scoped)
- Member profile (within club context)
- Admin: manage members, assign roles, suspend

### Epic 4: Dog Profiles + Health Records
- Dog CRUD (name, breed, birthdate, chip number, photo)
- Vaccine record tracking (name, date, expiry)
- Upload vaccine certificates → Document entity
- Dashboard: dogs with expiring vaccines (admin view)

### Epic 5: Document Management
- Upload documents (registration forms, health records, certificates)
- Associate documents with members or dogs
- View/download (access-controlled per club)
- Expiry date tracking + alerts (admin dashboard)
- Cloudflare R2 integration

### Epic 6: Event Management + Maps
- Create/edit events with GPS pin placement
- Draft → Published visibility workflow
- Event feed (club-scoped)
- One-tap redirect to Waze/Google Maps
- Participation (GOING / MAYBE / NOT_GOING)

### Epic 7: Chat + Image Sharing
- Club-scoped chat channels (general, per-event)
- Real-time messaging (WebSocket via NestJS gateway)
- Image sharing in chat
- Message history

### Epic 8: License Payment Integration
- License types configuration per club (annual, day pass, amounts)
- Stripe Checkout integration
- Payment status tracking
- License status per member per season
- Payment history (admin view)
- Webhook handler for Stripe events

---

## 6. Phased Delivery

### Phase A — "Multi-Tenant Core" (sprints 1-4)
**Epics:** 1 + 2 + 3 + 6
**Delivers:** Usable multi-club app with tenant isolation, auth, member management, and events with maps.
**Milestone:** Start pilot testing with both clubs on core features.

### Phase B — "Dogs, Docs, Chat" (sprints 5-8)
**Epics:** 4 + 5 + 7
**Delivers:** Dog profiles, document storage, real-time chat. The differentiating features.

### Phase C — "Payments + Polish" (sprints 9-11)
**Epics:** 8 + integration testing + dual pilot launch
**Delivers:** License payments, end-to-end validation, production launch for both pilots.

**Key insight:** Usable software reaches both pilot clubs by sprint 4 instead of sprint 13.

---

## 7. Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| MVP complexity ~doubles (~13 vs ~7 sprints) | HIGH | CERTAIN | Phased delivery (A/B/C) — value delivered by sprint 4 |
| PCI compliance for payments | LOW | LOW | Stripe Checkout = card data never touches our servers |
| Document storage costs at scale | LOW | LOW | R2 10 GB free; 50 clubs = ~$0.04/month |
| Double pilot coordination overhead | MEDIUM | HIGH | Single onboarding flow adapts to federation type |
| Delayed launch vs original timeline | HIGH | HIGH | Phase A delivers usable product early |
| CNEAC needs differ from FFSLC | MEDIUM | MEDIUM | Federation-agnostic core; interview CNEAC pilot early |
| Stripe onboarding friction for associations | MEDIUM | MEDIUM | French Loi 1901 associations can open Stripe accounts; plan for verification delay |

---

## 8. Implementation Handoff

### Scope Classification: MAJOR
**Route to:** Product Manager + Solution Architect + Development Team

### Immediate Actions

| # | Action | Owner | Deliverable |
|---|---|---|---|
| 1 | Identify CNEAC pilot club | Perrine / Product Owner | Club name, admin contact, federation ID |
| 2 | Update Product Brief | Product Manager | Revised `product-brief-CaniFed-2026-03-21.md` |
| 3 | Create Architecture Document | Solution Architect | New `architecture-canipotes42.md` |
| 4 | Design Prisma Schema | Tech Lead | Full multi-tenant `schema.prisma` |
| 5 | Create Epic Stories | Scrum Master | 8 epics with user stories + acceptance criteria |
| 6 | Set up Cloudflare R2 | Tech Lead | R2 bucket + credentials |
| 7 | Create Stripe account | Product Owner | Verified Stripe account |
| 8 | Design UX flows | UX Designer | Club onboarding, dog profiles, document upload, payment flow |
| 9 | Update project context | Scrum Master | Memory files + CLAUDE.md updated |

### Success Criteria

- [ ] Both pilot clubs (FFSLC + CNEAC) can independently create accounts and manage members
- [ ] Documents can be uploaded, stored, and retrieved per-club
- [ ] License payments process correctly via Stripe
- [ ] All data is properly tenant-isolated (no cross-club data leakage)
- [ ] Both pilot clubs confirm the platform meets their needs

---

*Sprint Change Proposal approved on 2026-03-21. Correct Course workflow complete, Leader!*
