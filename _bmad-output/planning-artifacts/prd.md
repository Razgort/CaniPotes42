---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - product-brief-CaniPotes42-2026-03-21.md
  - domain-canicross-ffslc-club-management-research-2026-03-21.md
  - technical-canipotes42-platform-research-2026-03-21.md
  - technical-nx-react-nestjs-shipping-research-2026-03-21.md
  - sprint-change-proposal-2026-03-21.md
documentCounts:
  briefs: 1
  research: 3
  brainstorming: 0
  projectDocs: 0
  other: 1
workflowType: 'prd'
classification:
  projectType: saas_web_app
  domain: sports_club_management
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - CaniFed

**Author:** Leader
**Date:** 2026-03-21

## Executive Summary

CaniFed is a free, multi-tenant club management platform for canine sports clubs in France. It solves two problems at once: FFSLC clubs stuck with CaniClub Connect's broken maps, unusable chat, and rigid workflows get a modern replacement that simply works. CNEAC clubs — agility, obedience, and other disciplines — running entirely on paper forms, handwritten vaccine records, and check payments in 2026 get their first digital tool ever.

The platform is federation-agnostic by design. Any canine sports club can sign up, create their space, and manage members, dogs, documents, events, and payments independently. Federation integrations (FFSLC calendar sync, CNEAC workflows) are layered on top as optional modules, not hardwired dependencies. Built on React + NestJS + Prisma in an Nx monorepo, delivered as a PWA, hosted entirely on free-tier infrastructure (Vercel, Render, Neon, Cloudflare R2).

The founder is an active member of both an FFSLC club (cani'potes 42) and a CNEAC club, experiencing the pain daily on both sides. This is not a speculative market play — it's a practitioner building the tool they need.

### What Makes This Special

**Dual-world founder insight.** The founder lives in both FFSLC and CNEAC ecosystems. CaniClub Connect serves FFSLC poorly; CNEAC has nothing at all. Both problems collapse into one solution if you design federation-agnostic from day one. No competitor has this perspective because no competitor straddles both worlds.

**Zero-competition CNEAC market.** CNEAC clubs have absolutely no digital club management tools — hundreds of clubs running on paper in 2026. CaniFed is the first tool to serve them. Document management (vaccine certificates, registration forms, health records) and digitized license payments via Stripe are the killer features for this segment.

**"It just works" for FFSLC.** CaniFed doesn't need to innovate on core features — it needs to execute them properly. Maps with Waze/Google Maps redirect, real-time chat that isn't broken, event drafts before publishing. The bar set by CaniClub Connect is low; clearing it delivers immediate user delight.

**Free, open, no lock-in.** Clubs aren't beholden to a vendor's roadmap. The platform is free with no obligations, architectured for future freemium. Infrastructure costs are near-zero at pilot scale.

## Project Classification

| Attribute | Value |
|---|---|
| **Project Type** | SaaS / Web App hybrid (multi-tenant PWA) |
| **Domain** | Sports club management (canine sports niche) |
| **Complexity** | Medium — multi-tenancy, RGPD health data, real-time messaging, Stripe payments, FFSLC API integration |
| **Project Context** | Greenfield — codebase at scaffold stage (Nx monorepo initialized) |

## Success Criteria

### User Success

| Criteria | Metric | Target |
|---|---|---|
| **Maps work, every time** | GPS points open in Waze/Google Maps in one tap | Zero broken-map complaints (vs. CaniClub's recurring failures) |
| **Chat replaces workarounds** | Members coordinate in-app, not on Facebook/WhatsApp | Decline in out-of-app coordination within 4 weeks of launch |
| **Admin event workflow** | Event creation with GPS pin + draft/publish flow | All admins across both pilot clubs use it without training |
| **Document upload adoption** | Members upload vaccine certificates, registration forms | 80%+ of CNEAC pilot club member/dog documents digitized within 8 weeks |
| **Payment works end-to-end** | License payment via Stripe completes successfully | At least one real license payment processed per pilot club |
| **No more paper** | CNEAC pilot admin can verify dog vaccines from the app before competition | Admin checks take <30 seconds vs. flipping through a paper binder |

### Business Success

| Objective | Target | Timeframe |
|---|---|---|
| **Dual pilot validation** | 10 test members from cani'potes 42 (FFSLC) + 10 from a CNEAC club confirm value | Pilot period |
| **Pilot approval rate** | 100% of pilot members vote to proceed with full migration | End of pilot |
| **FFSLC full migration** | cani'potes 42 (~100 members) fully switched, CaniClub Connect retired | Post-pilot |
| **CNEAC full onboarding** | Pilot CNEAC club fully onboarded with documents and payments | Post-pilot |
| **Multi-tenant proof** | Both pilot clubs operate independently, zero cross-club data leakage | During pilot |
| **Platform expansion** | Offer to 5+ additional clubs (FFSLC and CNEAC) | Within 6 months post-pilot |

### Technical Success

| Criteria | Target |
|---|---|
| **Tenant isolation** | Zero cross-club data leakage — verified by test suite |
| **Real-time messaging** | WebSocket chat delivers messages in <500ms, handles image sharing |
| **File storage** | Document upload/download via Cloudflare R2, <2s for typical files |
| **Payment security** | Stripe Checkout handles all card data — PCI never touches our servers |
| **RGPD compliance** | Health data (vaccines) stored with proper consent, minimization, and retention policies |
| **Free-tier hosting** | Full platform runs within free tiers of Vercel + Render + Neon + R2 at pilot scale |

### Measurable Outcomes

| KPI | Definition | Target |
|---|---|---|
| **Weekly active users** | Members who open the app at least once per week | >80% after full migration |
| **Map tap-through rate** | % of event views resulting in Waze/Google Maps redirect | Tracked — proves maps work |
| **Admin draft usage** | % of events created in draft before publishing | Tracked — confirms workflow adoption |
| **Chat adoption** | Messages sent in-app per week | Growing trend, qualitative |
| **Support requests** | Complaints or confusion reported | Near zero after onboarding period |

## User Journeys

### Journey 1: Julie, The Competitor — "Finally, it just works"

Julie, 32, runs canicross with her border collie three times a week. She's in the app almost daily — cani'potes 42 runs ~30 events per month between training sessions, randos, and outings. She also follows the FFSLC race calendar to plan her competition season.

**Opening Scene.** Saturday morning. Julie checks the club app to see where tomorrow's canitrail training meets. On CaniClub Connect, she taps the event, hits the map — and it fails. Again. She screenshots the address, opens Google Maps separately, types it in manually. In the group WhatsApp, three other members are asking "where exactly is the rendez-vous?" Someone posts a pin. Someone else posts a different pin. Chaos.

**Rising Action.** The club switches to CaniFed. Julie opens the new app, sees tomorrow's canitrail in the event feed. She taps the event, sees the GPS point on the map. She taps "Navigate" — Waze opens instantly with the right coordinates. Done. No screenshot, no WhatsApp, no confusion.

**Climax.** That Sunday, she arrives at the right spot, on time. So does everyone else. In the app's chat, Perrine posted "see you at the parking lot by the bridge" with a photo. Julie replies with a thumbs up. The first time the whole group arrived without a single "where are you?" message.

**Resolution.** Julie checks the app daily. Events, chat, who's going to what. She stops opening WhatsApp for club coordination entirely. When she hears about an upcoming FFSLC canitrail in the Auvergne region, she wishes she could see it in the same app — but that's Phase 2. For now, the club experience is frictionless, and that's enough.

**Requirements revealed:** Event feed, GPS map with navigation redirect (Waze/Google Maps), chat with image sharing, participation tracking ("who's going").

---

### Journey 2: Patrick, The Rando Walker — "I just want to know where to go Sunday"

Patrick, 55, walks canirando with his labrador. He's not into competitions — he picks one or two walks per week from the club calendar. He struggled with CaniClub Connect initially and has limited patience for confusing interfaces.

**Opening Scene.** Patrick gets a notification about Sunday's canirando. He opens CaniClub Connect, scrolls through a cluttered feed of 30+ events this month — trainings, outings, meetings — trying to find the one relevant to him. He finds it, taps the location, and gets a broken map. He calls his friend Michel: "Where's the walk this Sunday?"

**Rising Action.** On CaniFed, Patrick gets a clean notification. He taps it, lands directly on the event page. The meeting point is on the map with a clear marker. He taps "Google Maps" — directions appear. He sees 12 other members are going. That's all he needed.

**Climax.** For the first time, Patrick navigated to a club event without calling anyone. He arrives, parks, and his friend Michel says "you found it easily?" — "I just tapped the map."

**Resolution.** Patrick uses the app weekly. He doesn't explore features he doesn't need. He opens the event, checks the location, taps navigate. Sometimes he reads the chat. The app doesn't demand more from him than that, and that's exactly why it works for him.

**Requirements revealed:** Clean event UI with filtering/relevance, one-tap navigation redirect, participation count, push notifications (post-MVP), low cognitive load for non-tech users.

---

### Journey 3: Perrine, The Event Organizer — "I can finally prepare events properly"

Perrine is one of ~10 administrators at cani'potes 42. With ~30 events per month across the club, she creates events almost daily. She's the one placing GPS rendez-vous points, writing event descriptions, managing the calendar.

**Opening Scene.** Perrine needs to set up next Saturday's canitrail training. On CaniClub Connect, she creates the event, then fights with the map to place the GPS pin — it's slow, imprecise, and she's never confident the coordinates are right. Worse: the moment she saves, all members see it immediately. She wanted to add details first, check with another admin, then publish. Too late — members are already asking questions about an incomplete event.

**Rising Action.** On CaniFed, Perrine creates a new event. She types the title, picks the date, and drops a GPS pin on the map — two taps, precise placement. She saves it as **Draft**. The event is visible only to admins. She messages her co-admin in the chat: "check the location for Saturday's training, does this look right?" Co-admin confirms. Perrine taps **Publish**. Members see the finalized event.

**Climax.** After two weeks of using draft mode, Perrine realizes she hasn't had a single "wait, ignore that event" message. Events go out clean, complete, correct. All 10 admins adopted the workflow naturally — no training needed.

**Resolution.** Perrine manages 30 events/month with less stress than she managed 10 on CaniClub. The draft/publish workflow becomes second nature. She uses the member directory to check who's attending, sends reminders via chat. She spends her time on the club, not fighting the tool.

**Requirements revealed:** Event CRUD with GPS pin placement, draft/published visibility toggle, admin-only view, role-based access (admin vs member), member directory, chat for admin coordination.

---

### Journey 4: Marie, The CNEAC Club Admin — "No more paper binder"

Marie, 45, is president of a small agility club (~60 members). The club is CNEAC-affiliated. She uses Facebook for communication, HelloAsso for payments, and a paper binder for everything else — registration forms, vaccine certificates, dog health records, license tracking.

**Opening Scene.** Competition day. Marie sits at a table with her binder, checking each participating dog's vaccines before they can enter the ring. She flips through pages — "Médor, where's Médor's vaccine certificate... was it updated? The rabies was due in February..." She finds a photocopy, but it's from 2024. She calls the owner: "Did you renew Médor's rabies vaccine?" Fifteen minutes for three dogs. There are twenty more to check.

**Rising Action.** Marie signs the club up on CaniFed. She creates the club, sets it as CNEAC-affiliated. Over two weeks, she asks members to register online, add their dogs, and upload vaccine certificates. Slowly, the binder gets thinner. She configures license types (annual license, day pass) with amounts, and enables Stripe payments.

**Climax.** Next competition day. Marie opens the app, goes to the member/dog dashboard. She sees a list of participating dogs with vaccine status: green (up to date), orange (expiring within 30 days), red (expired). All green for today's participants. Checked in 30 seconds. No binder, no phone calls, no photocopies.

**Resolution.** Within two months, 80% of the club's documents are digital. Members pay licenses via Stripe instead of handing checks at training. Marie still uses Facebook for public posts, but all club administration happens in CaniFed. She tells the president of the neighboring agility club: "You need to try this. It's free."

**Requirements revealed:** Club creation/onboarding (CNEAC), dog profiles with vaccine tracking (expiry dates, status indicators), document upload/storage (vaccine certificates, registration forms, health records), license configuration per club, Stripe Checkout for payments, admin dashboard with vaccine status overview, document expiry alerts.

---

### Journey 5: Aude, The Club Secretary — "I set this up myself?"

Aude is the secretary of an existing canine sports club. She handles registrations, correspondence, and administrative tasks. She's not technical at all — she uses her phone for WhatsApp and Facebook, and her laptop for email and Word documents. She's never set up a platform before.

**Opening Scene.** The club president tells Aude: "There's a free platform for managing the club. Can you set it up?" Aude is hesitant. She remembers the time she tried to create a Doodle poll and gave up. But the president insists — "It's supposed to be easy." Aude has the club's info in her head and in a Word doc somewhere: the club name, the logo from the Facebook page, the member list in an Excel spreadsheet, the federation affiliation.

**Rising Action.** Aude goes to CaniFed, taps "Register your club." She enters the club name, picks the federation (or "none"), uploads the club logo from her phone's photo gallery. The platform asks for a contact email and a short description. She types two sentences. That's it — the club's space exists. She's automatically the Owner. The platform shows a simple checklist: "Invite your first members." She taps it, types three email addresses of board members. They receive invitations, create accounts, and join the club. Aude sees them appear in the member list.

**Climax.** Aude tells the president: "It's done. The club is on the platform, and Marie, Jean, and Sophie are already in." The president is surprised — "Already? I thought it would take a week." Aude: "It took me ten minutes."

**Resolution.** Over the next few days, Aude invites the rest of the members. She assigns admin roles to board members. She doesn't touch event creation or document management — that's for the admins who know those features. But she handles what she knows: the member list, the invitations, the basic club info. The platform never asked her to do anything she didn't understand. The club that existed on paper and Facebook now has a digital home.

**Requirements revealed:** Club registration flow (bringing existing club online, minimal fields, guided), club settings (name, logo, federation, description, contact), email-based invite flow, role assignment (Owner auto-assigned, admin promotion), progressive disclosure (don't overwhelm non-tech users), member list management, onboarding checklist/guide.

---

### Journey 6: The Multi-Club Member — "One app, both my clubs"

A member belongs to both an FFSLC canicross club and a CNEAC agility club. Two different worlds, two different needs, same app.

**Opening Scene.** Monday evening, agility training with the CNEAC club. Wednesday morning, canicross training with the FFSLC club. Saturday, an agility competition. Sunday, a club canirando. Two clubs, two calendars, two sets of people, two sets of events — and until now, two completely separate worlds with no shared tool.

**Rising Action.** Both clubs are on CaniFed. The member opens the app and sees a club switcher. Tap: CNEAC agility club. Events for this week — agility training Tuesday, competition Saturday. Tap: FFSLC canicross club. Events — canicross training Wednesday, canirando Sunday. Each club has its own chat, its own members, its own documents. Zero bleed between them.

**Climax.** Saturday's agility competition. The member's dog's vaccine certificate is already uploaded in the CNEAC club — Marie (the admin) can verify it instantly. Sunday's canirando with the FFSLC club — the GPS point is on the map, one tap to Waze. Two completely different experiences, same app, same login, zero friction.

**Resolution.** The member stops context-switching between tools. One app, one login, two clubs. When a third club in the area hears about CaniFed, the member can join that too — just another club in the switcher. The platform grows through exactly this kind of organic multi-club membership.

**Requirements revealed:** Multi-club membership per user account, club switcher UI, strict data isolation between clubs, single authentication across clubs, per-club document/dog/event scoping.

---

### Journey Requirements Summary

| Capability Area | Revealed By |
|---|---|
| **Event management + GPS maps + navigation** | Julie, Patrick, Perrine |
| **Real-time chat + image sharing** | Julie, Perrine |
| **Draft/Published event workflow** | Perrine |
| **Club registration + onboarding** | Aude, Marie |
| **Email invite + role management** | Aude, Perrine |
| **Dog profiles + vaccine tracking** | Marie |
| **Document upload/storage + expiry** | Marie |
| **Stripe payment integration** | Marie |
| **Multi-club switcher + data isolation** | Multi-Club Member |
| **Progressive disclosure (non-tech users)** | Patrick, Aude |
| **Admin dashboard (vaccine status, members)** | Marie, Perrine |
| **Participation tracking** | Julie, Patrick |

## Domain-Specific Requirements

### Compliance & Regulatory

**RGPD (GDPR) — Health Data Handling:**
- Dog vaccination records and medical certificates qualify as health-adjacent data under RGPD
- Store vaccination **validity status** (valid/expired/date) — not the certificate image content itself when possible
- When storing certificate uploads: encrypt at rest, enforce retention limits, support right-to-delete
- Privacy notices required for all members explaining data usage
- Explicit consent for optional data (photos, communications)
- CNIL sport amateur guidance applies — medical certificates for competition are a legal obligation (Code du Sport), not consent-based

**French Association Law (Loi 1901):**
- Clubs are non-profit associations — no profit distribution
- Democratic governance required (statutes, general assembly)
- Financial transparency obligations
- CaniFed must not inadvertently create accounting obligations for clubs beyond what they already have

**Payment Regulation:**
- Stripe Checkout handles PCI-DSS — card data never touches our servers
- License payments are club-to-member transactions, not CaniFed revenue
- Stripe fees (1.4% + 0.25) must be transparently communicated — who absorbs them (club or member)?
- French Loi 1901 associations can open Stripe accounts but may face verification delays

### Technical Constraints

**Multi-Tenant Data Isolation:**
See detailed tenant model in [SaaS / Web App Specific Requirements > Technical Architecture Considerations](#technical-architecture-considerations). Key constraint: ClubGuard middleware on every API route, clubId in JWT, automated test suite for zero cross-club data leakage.

**File Storage Security:**
- Cloudflare R2 for document storage (vaccine certificates, registration forms)
- Signed URLs for document access — no public bucket access
- Files scoped to club — member of Club A cannot access Club B's documents
- 10 GB free tier covers pilot; at scale (~50 clubs), costs are negligible (~$0.04/month)

**Real-Time Messaging:**
- WebSocket via NestJS gateway (Socket.IO)
- Messages scoped to club channels — no cross-club message leakage
- Image sharing requires upload pipeline (R2) + message attachment model

### Integration Requirements

**FFSLC API (Post-MVP, Phase 2):**
- Public endpoints reverse-engineered: `GET /fr/events/ws_public/GetEventsList/`, `GET /fr/events/ws_public/{id}/GetEventFiche/`, `POST /fr/clubs/ws_public/GetClubsList/`
- Read-only sync via scheduled CRON (every 6-12 hours)
- API is undocumented and could change — build abstraction layer (`FfslcSyncService`)
- Cache events locally in PostgreSQL to survive API outages
- MVP does NOT depend on FFSLC integration — app must be valuable standalone

**Stripe Integration (MVP Phase C):**
- Stripe Checkout for license payments
- Webhook handler for payment status updates (completed, failed, refunded)
- License types configurable per club (annual, day pass, custom amounts)
- Payment history visible to admins

### Risk Mitigations

See comprehensive risk analysis in [Project Scoping & Phased Development > Risk Mitigation Strategy](#risk-mitigation-strategy).

## SaaS / Web App Specific Requirements

### Project-Type Overview

CaniFed is a multi-tenant SaaS platform delivered as a PWA (Progressive Web App). It combines B2B characteristics (clubs as tenants, admin dashboards, role-based access) with B2C member-facing features (events, chat, maps, document uploads). The web-first approach means no app store dependency, instant updates, and a single codebase.

### Technical Architecture Considerations

**Tenant Model:**
- Shared database, shared schema, `clubId` foreign key isolation
- ClubGuard middleware on all API routes extracts tenant context from JWT
- User belongs to multiple clubs via `ClubMember` join table
- Active club context stored client-side, switchable via club switcher UI
- All queries scoped by `clubId` — no global queries on tenant data

**RBAC Matrix:**

| Permission | Owner | Admin | Member |
|---|---|---|---|
| Club settings (name, logo, federation) | ✅ | ❌ | ❌ |
| Delete club | ✅ | ❌ | ❌ |
| Manage roles (promote/demote) | ✅ | ✅ (except Owner) | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Suspend/remove members | ✅ | ✅ | ❌ |
| Create/edit events | ✅ | ✅ | ❌ |
| Publish events (draft → published) | ✅ | ✅ | ❌ |
| View draft events | ✅ | ✅ | ❌ |
| View published events | ✅ | ✅ | ✅ |
| RSVP to events | ✅ | ✅ | ✅ |
| Send chat messages | ✅ | ✅ | ✅ |
| Share images in chat | ✅ | ✅ | ✅ |
| Add/edit own dogs | ✅ | ✅ | ✅ |
| Upload own documents | ✅ | ✅ | ✅ |
| View all member documents | ✅ | ✅ | ❌ |
| Configure license types/prices | ✅ | ✅ | ❌ |
| View payment history | ✅ | ✅ | Own only |
| Pay license (Stripe) | ✅ | ✅ | ✅ |
| Vaccine status dashboard | ✅ | ✅ | ❌ |

**Subscription Tiers:**
- MVP: 100% free. No tiers, no limits, no gating.
- Post-validation: architected for freemium. Potential premium gates: expanded document storage, advanced analytics, custom branding. Decision deferred.
- Infrastructure costs absorbed by the project at pilot scale (free tiers).

### Browser & Device Support

| Target | Requirement |
|---|---|
| **Browsers** | Modern only — Chrome, Firefox, Safari, Edge (last 2 versions) |
| **Devices** | Mobile-first responsive design (phones, tablets, desktop) |
| **PWA** | Installable via browser "Add to Home Screen", no app store |
| **Offline** | Not required for MVP |
| **SEO** | Not required — authenticated app, no public discovery pages |

### Accessibility

- **Target:** WCAG 2.1 AA compliance
- **Rationale:** Patrick (55, limited tech comfort) and Aude (non-tech secretary) represent users who benefit from accessible design — clear contrast, readable fonts, keyboard navigation, screen reader compatibility
- **Implementation:** shadcn/ui components are built on Radix UI primitives which provide accessibility out of the box. Supplement with semantic HTML and ARIA labels where needed

### Performance Targets

See [Non-Functional Requirements > Performance](#performance) for measurable targets (NFR1-NFR6). Key numbers: FCP <1.5s, API <200ms, chat <500ms, uploads <2s.

### Responsive Design

- **Mobile-first** — primary usage is on phones (members checking events, navigating to GPS points)
- **Tablet** — secondary usage for admins managing members/documents
- **Desktop** — tertiary, for admin dashboards and bulk operations
- **Breakpoints:** Follow Tailwind defaults (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)

### Integration List

| Integration | Phase | Type | Notes |
|---|---|---|---|
| **Stripe Checkout** | MVP (Phase C) | Payment | License payments, webhook handler |
| **Cloudflare R2** | MVP (Phase B) | File storage | Document uploads, signed URLs |
| **Socket.IO** | MVP (Phase B) | Real-time | Chat messaging via NestJS gateway |
| **Leaflet / react-leaflet** | MVP (Phase A) | Maps | Event GPS display, pin placement |
| **Waze / Google Maps** | MVP (Phase A) | Deep link | One-tap navigation redirect |
| **FFSLC API** | Post-MVP | REST sync | Race calendar, club data (read-only CRON) |
| **HelloAsso** | Vision | Payment | Membership fee integration |

### Implementation Considerations

- **React + Tailwind + shadcn/ui** — Component library provides accessible, consistent UI out of the box. Customizable with Tailwind theme tokens for club branding (future).
- **TanStack Query (React Query)** — Server state management with caching, optimistic updates, and background refetching. Reduces perceived latency.
- **React Hook Form + Zod** — Form validation with shared schemas (Zod schemas can be reused between frontend validation and NestJS DTOs via shared Nx library).
- **NestJS modular architecture** — Each epic maps roughly to a NestJS module (ClubModule, AuthModule, EventModule, DogModule, DocumentModule, ChatModule, PaymentModule).
- **Prisma shared types** — Full-stack type safety via shared Nx library exporting Prisma-generated types.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP — prove that multi-tenant club management works for both FFSLC and CNEAC clubs simultaneously. Phase A delivers usable software by sprint 4; full MVP by sprint 11.

**Resource Model:** Solo developer augmented by AI agent team (10 agents). This is a force multiplier but not a substitute for architectural decisions — the phased approach ensures each phase delivers testable value before moving to the next.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

| Journey | Phase A | Phase B | Phase C |
|---|---|---|---|
| Julie (Competitor) — events + maps + chat | Events + maps | Chat | — |
| Patrick (Rando Walker) — simple event + navigate | Full | — | — |
| Perrine (Event Organizer) — draft/publish + GPS | Full | — | — |
| Marie (CNEAC Admin) — documents + payments | — | Dogs + docs | Payments |
| Aude (Secretary) — club setup + invites | Full | — | — |
| Multi-Club Member — club switcher | Full | — | — |

**Must-Have Capabilities (by phase):**

**Phase A — "Multi-Tenant Core" (sprints 1-4):**
- Club registration + settings (name, logo, federation, description)
- Authentication (signup, login, JWT with clubId)
- RBAC (owner, admin, member roles + invite flow)
- Member management (club-scoped directory, profiles)
- Event management (CRUD, GPS pin, draft/published, Waze/Google Maps redirect)
- Participation tracking (GOING / MAYBE / NOT_GOING)
- Multi-club switcher
- **Milestone:** Both pilot clubs can use core features

**Phase B — "Dogs, Docs, Chat" (sprints 5-8):**
- Dog profiles (name, breed, birthdate, chip number, photo)
- Vaccine records (name, date, expiry, status indicators)
- Document upload/storage (Cloudflare R2, signed URLs, associate to member or dog)
- Document expiry tracking
- Chat (club-scoped channels, WebSocket, image sharing, message history)
- **Milestone:** Full feature set available for testing

**Phase C — "Payments + Polish" (sprints 9-11):**
- License types per club (annual, day pass, custom amounts)
- Stripe Checkout integration (redirect flow, no PCI on our servers)
- Webhook handler (payment completed/failed/refunded)
- License status per member per season
- Payment history (admin view)
- Integration testing + dual pilot launch
- **Milestone:** Production-ready for both pilot clubs

### Post-MVP Features

**Phase 2 (Growth):**
- FFSLC race calendar sync via public API
- Unified event feed (club events + federation races)
- Push notifications (events, reminders, vaccine expiry)
- "Who's going" to FFSLC races from the club
- Carpool coordination
- HelloAsso integration (membership fees — better long-term fit for associations than Stripe)

**Phase 3 (Expansion):**
- Freemium model (premium document storage, analytics, custom branding)
- Accounting module
- Expand to 50+ clubs
- Wearable IoT integration (Invoxia, Tractive)
- AI-powered training recommendations

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Multi-tenant data leakage | Critical | ClubGuard middleware + automated isolation tests from sprint 1 |
| WebSocket scaling on free tier | Medium | Socket.IO is efficient; <200 concurrent users at pilot scale is fine for Render free tier |
| Stripe account verification delays | Medium | Start Stripe onboarding early (parallel to Phase A/B dev). French Loi 1901 associations are supported but verification can take days |

**Market Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| CNEAC clubs don't adopt digital tools | High | Founder is in a CNEAC club — direct access to pilot users. If they won't adopt, no one will |
| CaniClub Connect improves | Low | Their monopoly position reduces improvement pressure. Even if they improve, CaniFed serves CNEAC which they don't |
| Clubs resist leaving Facebook/WhatsApp for chat | Medium | Chat is additive, not replacement. Don't force migration — let value pull users over |

**Resource Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Solo dev bottleneck | High | AI agent team compensates for breadth. Phased delivery ensures usable product at each phase boundary — if burnout hits, Phase A alone is valuable |
| Scope creep during development | Medium | PRD defines clear phase boundaries. If it's not in the current phase, it waits |
| Free-tier infrastructure limits | Low | At pilot scale (<200 users, <10 GB storage), free tiers are more than sufficient |

## Functional Requirements

### Club Management

- **FR1:** Any user can register a new club by providing club name, federation affiliation (FFSLC/CNEAC/other/none), logo, contact email, and description
- **FR2:** Club owner can update club settings (name, logo, federation, description, contact email)
- **FR3:** Club owner can delete the club
- **FR4:** Users can belong to multiple clubs simultaneously
- **FR5:** Users can switch between their clubs via a club switcher

### Authentication & Access Control

- **FR6:** Users can sign up with email and password
- **FR7:** Users can log in and receive a session scoped to their active club
- **FR8:** Club owner/admin can invite new members by email
- **FR9:** Invited users receive an email invitation and can join the club by creating an account or linking an existing one
- **FR10:** Club owner can assign and change member roles (owner, admin, member)
- **FR11:** Club owner/admin can suspend or remove members from the club
- **FR12:** All data access is scoped to the active club — no cross-club data visibility

### Member Management

- **FR13:** Admin can view the club member directory with profiles and roles
- **FR14:** Members can view and edit their own profile within the club
- **FR15:** Admin can search and filter the member directory

### Dog Profiles & Health Records

- **FR16:** Members can add dogs to their profile (name, breed, birthdate, chip number, photo)
- **FR17:** Members can edit and remove their own dogs
- **FR18:** Members can add vaccine records to their dogs (vaccine name, date administered, expiry date)
- **FR19:** Members can upload a vaccine certificate document linked to a vaccine record
- **FR20:** Admin can view all dogs in the club with their vaccine status (up to date / expiring soon / expired)
- **FR21:** Admin can filter dogs by vaccine status to identify dogs with expiring or expired vaccines

### Document Management

- **FR22:** Members can upload documents (registration forms, vaccine certificates, health records, licenses) and associate them to themselves or their dogs
- **FR23:** Admin can view and download all documents within the club
- **FR24:** Members can view and download their own documents
- **FR25:** Documents track expiry dates where applicable
- **FR26:** Admin can see a dashboard of documents nearing or past expiry

### Event Management & Maps

- **FR27:** Admin can create events with title, description, date/time, and GPS location (pin placement on map)
- **FR28:** Admin can save events as draft (visible only to admins) or published (visible to all members)
- **FR29:** Admin can edit and delete events
- **FR30:** Admin can change event visibility from draft to published and back
- **FR31:** Members can view published events in a chronological feed
- **FR32:** Members can view event location on an embedded map
- **FR33:** Members can open the event GPS location in Waze or Google Maps with one tap
- **FR34:** Members can indicate their participation status for an event (going / maybe / not going)
- **FR35:** Members can see who else is going to an event

### Real-Time Chat

- **FR36:** Members can send text messages in club-scoped chat channels
- **FR37:** Members can share images in chat
- **FR38:** Messages are delivered in real-time via WebSocket
- **FR39:** Members can view message history in a channel
- **FR40:** Chat channels are scoped to the club — no cross-club messaging

### License Payments

- **FR41:** Admin can configure license types for the club (name, amount, season — e.g., annual license, day pass)
- **FR42:** Members can pay for a license via Stripe Checkout (redirect to Stripe-hosted page)
- **FR43:** The system tracks payment status (pending, completed, failed, refunded) via Stripe webhooks
- **FR44:** Admin can view license status per member per season (paid / pending / expired)
- **FR45:** Admin can view payment history for the club

### Data Privacy & Consent

- **FR46:** Users are shown a privacy notice explaining data usage during signup
- **FR47:** Users can request deletion of their account and associated data
- **FR48:** Users can request export of their personal data
- **FR49:** Consent is recorded for optional data collection (photos, communications)

## Non-Functional Requirements

### Performance

- **NFR1:** Page loads complete within 1.5s (First Contentful Paint) on 4G mobile connections
- **NFR1b:** Time to Interactive under 3s on 4G mobile connections
- **NFR2:** API CRUD operations respond within 200ms under normal load
- **NFR3:** Chat messages are delivered to recipients within 500ms of sending
- **NFR4:** Document uploads complete within 2s for files under 5MB
- **NFR5:** Event feed renders within 1s for clubs with up to 100 events/month
- **NFR6:** Render free-tier cold starts (<30s) are acceptable at pilot scale

### Security

- **NFR7:** All data in transit is encrypted via HTTPS/TLS
- **NFR8:** All stored documents (Cloudflare R2) are accessible only via signed URLs — no public bucket access
- **NFR9:** JWT tokens include clubId claim; every API request is validated against tenant context server-side
- **NFR10:** Passwords are hashed with bcrypt (or argon2) — never stored in plaintext
- **NFR11:** Stripe Checkout handles all card data — no payment card information touches our servers (PCI compliance via delegation)
- **NFR12:** Health-adjacent data (vaccine records, medical certificate references) follows RGPD data minimization — store validity status, not certificate content where possible
- **NFR13:** File uploads are validated for type and size before storage (prevent malicious uploads)

### Scalability

- **NFR14:** System supports 2 clubs with up to 100 members each at MVP launch (pilot scale)
- **NFR15:** Architecture supports horizontal scaling to 50+ clubs without schema changes (shared DB, clubId isolation)
- **NFR16:** WebSocket connections scale to 200 concurrent users on Render free tier
- **NFR17:** Cloudflare R2 storage scales from free tier (10 GB) to paid with no code changes

### Accessibility

- **NFR18:** WCAG 2.1 AA compliance across all user-facing pages
- **NFR19:** All interactive elements are keyboard-navigable
- **NFR20:** Color contrast ratios meet AA minimum (4.5:1 for normal text, 3:1 for large text)
- **NFR21:** Form inputs have associated labels and error messages are announced to screen readers
- **NFR22:** Touch targets are minimum 44x44px on mobile for users like Patrick (limited tech comfort)

### Reliability

- **NFR23:** No data loss on server restart or deployment — all state persisted in PostgreSQL and R2
- **NFR24:** Chat message delivery is guaranteed (messages persist in DB even if WebSocket disconnects; client reconnects and fetches missed messages)
- **NFR25:** Stripe webhook handler is idempotent — duplicate webhook events do not create duplicate payment records
- **NFR26:** FFSLC API sync failures (post-MVP) degrade gracefully — cached data is served, admin is alerted, app continues to function
