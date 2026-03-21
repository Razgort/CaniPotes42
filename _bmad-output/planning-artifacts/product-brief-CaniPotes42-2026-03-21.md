---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - domain-canicross-ffslc-club-management-research-2026-03-21.md
  - technical-nx-react-nestjs-shipping-research-2026-03-21.md
  - technical-canipotes42-platform-research-2026-03-21.md
date: 2026-03-21
author: Leader
---

# Product Brief: CaniFed

## Executive Summary

CaniFed is a modern, free, multi-club management platform for canine sports clubs in France. Born from daily frustrations with CaniClub Connect's broken maps, unusable chat, and rigid workflows, CaniFed delivers a beautiful, fluid experience for both club members and administrators. Built on a modern tech stack (React, NestJS, Nx monorepo), the platform is **multi-tenant from day one** — any canine sports club can sign up and manage their members, dogs, documents, and events independently. It is federation-agnostic: equally suited for canicross (FFSLC), agility (CNEAC), or any canine sports club, with federation integrations layered on top as optional plugins. The platform targets a specific underserved market: **CNEAC clubs have zero digital tools today**, making this a greenfield opportunity. The platform is offered as a free service with no obligations (architected for future freemium), giving clubs full independence.

---

## Core Vision

### Problem Statement

Canine sports clubs in France face two distinct problems:

1. **FFSLC clubs** rely on CaniClub Connect, the only dedicated club management app, which suffers from poor UX, broken core features (maps, messaging), rigid event workflows, and a closed ecosystem that prevents customization. This creates daily friction for both administrators and members.

2. **CNEAC clubs** (agility, obedience, and other disciplines) have **absolutely no digital club management tools**. Everything is handled on paper — member registration forms, dog health records, vaccine certificates, license payments. This is an entirely unserved market.

### Problem Impact

- **FFSLC members** deal with broken GPS coordinates, unreliable chat, and a dated interface that makes the club feel less professional than it is
- **FFSLC administrators** lack event visibility controls (draft vs. published), struggle with clunky workflows for placing GPS rendez-vous points, and cannot tailor the app to their club's specific needs
- **Workarounds proliferate** — members re-sharing GPS coordinates manually in chat, relying on Facebook or WhatsApp for coordination that should happen in-app
- **CNEAC clubs have no digital identity** — all club administration is paper-based. Member registration, dog health tracking, vaccine verification, and license payments are manual processes
- **Document management is non-existent** — clubs maintain paper files for carnet de santé du chien, vaccine certificates, and registration forms. Lost or outdated documents are a recurring problem

### Why Existing Solutions Fall Short

CaniClub Connect holds a de facto monopoly through its FFSLC endorsement, but this has led to complacency:
- **Broken maps** — GPS/location features frequently fail, no Waze or Google Maps handoff
- **Unusable messaging** — the built-in chat is described as the worst feature
- **No event visibility control** — no draft/admin-only state before publishing to members
- **Closed ecosystem** — clubs cannot customize or extend the tool. They depend entirely on the developer's roadmap
- **No competitive pressure** — as the only dedicated solution, there is no incentive to improve

Generic association tools (HelloAsso, AssoConnect) lack canine sports specifics (dog profiles, vaccines, federation calendars).

### Proposed Solution

CaniFed is a club-first platform with three core promises:

1. **Beautiful, fluid UX** — a modern interface (React + Tailwind + shadcn/ui) that makes members proud to use their club app. Maps that work, with easy GPS pin placement for organizers and Waze/Google Maps redirect for members
2. **Real communication** — reliable, real-time messaging that replaces the broken CaniClub chat
3. **Club autonomy** — a free, open platform that clubs can customize to their needs, not locked into a vendor's roadmap. Federation integrations (FFSLC, CNEAC, others) are modular plugins, not hardwired dependencies

Event workflows include admin-only visibility (draft mode) before publishing, and the platform is designed to serve any canine sports club regardless of federation affiliation.

### Key Differentiators

| Differentiator | CaniClub Connect | CaniFed |
|---|---|---|
| **Maps & GPS** | Broken, no nav handoff | Working maps, Waze/Google Maps redirect, easy pin placement |
| **Messaging** | "Horrible" built-in chat | Modern real-time messaging |
| **UI/UX** | Dated, clunky | Modern, beautiful, fluid |
| **Event workflow** | No draft/visibility control | Admin-only draft → published flow |
| **Customization** | Closed, vendor-controlled | Open, customizable to club needs |
| **Federation support** | FFSLC only | Club-agnostic core, federation plugins (FFSLC, CNEAC, etc.) |
| **Cost** | Vendor dependency | Free, no obligations |
| **Architecture** | Mobile-first (Ionic) | Web-first PWA, modern stack |

---

## Target Users

### Primary Users

#### Persona 1: The Competitor — "Julie, 32"
- **Profile:** Active canicross/canitrail runner, age 25-50, runs with her border collie
- **Tech comfort:** Comfortable with apps, uses them daily
- **Club engagement:** High — with ~30 club events per month, she's in the app almost daily. Also follows the FFSLC race calendar to plan her competition season
- **Needs:** Unified event feed (club events + FFSLC races), GPS meeting points with Waze redirect, reliable chat to coordinate carpools to races, seeing who else from the club is going to a race, race logistics (carpool, accommodation)
- **Pain today:** Broken maps on CaniClub mean she sometimes gets wrong coordinates for rendez-vous. Chat is unreliable so coordination falls back to Facebook/WhatsApp. Has to check the FFSLC website separately for race info
- **Success moment:** Sees an upcoming FFSLC canitrail in the app, checks that 3 clubmates are going, joins the carpool thread, taps the GPS for Waze directions on race day. All in one place.

#### Persona 2: The Rando Walker — "Patrick, 55"
- **Profile:** Casual canirando participant, age 35-65, walks with his labrador
- **Tech comfort:** Limited — struggled with CaniClub Connect initially, eventually adapted. Needs things to be obvious and intuitive
- **Club engagement:** Regular — picks his walks from the busy calendar (~30 events/month across the club), needs to quickly find what's relevant to him
- **Needs:** Simple view of upcoming walks filtered to his interests, clear GPS meeting point, easy chat to ask questions, no unnecessary complexity
- **Pain today:** The app feels confusing. When the map doesn't work, he relies on other members re-sharing coordinates in chat
- **Success moment:** Gets a notification about Sunday's canirando, taps it, sees where to meet, taps for Google Maps directions. No friction.

#### Persona 3: The Event Organizer — "Perrine, admin"
- **Profile:** One of ~10 club administrators who create and publish events
- **Tech comfort:** Moderate — comfortable enough to manage a club app daily
- **Club engagement:** Very high — with ~30 events/month to manage across 10 admins, event creation is a near-daily task
- **Needs:** Easy GPS pin placement for rendez-vous points, draft/admin-only event visibility before publishing, smooth event creation workflow, member management
- **Pain today:** Placing GPS points is painful on CaniClub. No way to prepare an event privately before members see it. 10 admins all deal with the same clunky workflow
- **Success moment:** Creates an event, drops a GPS pin on the map in two taps, previews it as admin-only, then publishes when ready. All 10 admins can do this without training.

#### Persona 4: The CNEAC Club Admin — "Marie, 45"
- **Profile:** President of a small agility club (~60 members), CNEAC-affiliated
- **Tech comfort:** Moderate — uses Facebook for club communication, HelloAsso for payments
- **Club engagement:** Very high — manages all administrative tasks: registrations, license tracking, vaccine verification before competitions
- **Needs:** A single platform to store member documents (registration forms, dog health records, vaccine certificates), track license payment status, manage event scheduling, and communicate with members. Currently does everything on paper or scattered across email/Facebook/HelloAsso
- **Pain today:** Spends hours chasing paper documents. Before every competition, must manually verify each dog's vaccines are up to date. License payment tracking is a spreadsheet nightmare. Has no dedicated club management tool — CNEAC clubs have zero digital options
- **Success moment:** A new member registers online, uploads their dog's vaccine certificate, pays their license via the platform. Marie sees everything in one dashboard — no paper, no chasing.

### Secondary Users

- **Parents of junior members** — managed entirely by their parents. Parents use the app as regular members, no specific youth-facing features needed.
- **Multi-club members** — some members belong to both an FFSLC and a CNEAC club. The platform supports belonging to multiple clubs with easy switching.

### User Journey

**For FFSLC clubs (migrating from CaniClub Connect):**
1. **Discovery:** Club announces switch from CaniClub Connect to CaniFed
2. **Onboarding:** Admin creates the club on the platform, invites members. Members create accounts and join
3. **Core usage:** Daily — check club events, tap GPS for directions, chat with members, manage dog profiles and documents
4. **Success moment:** First time using the map → it works, Waze opens, they arrive at the right spot. "Finally."

**For CNEAC clubs (first-time digital adoption):**
1. **Discovery:** Word of mouth from FFSLC clubs, or direct outreach
2. **Onboarding:** Admin creates club, uploads existing member list. Members register, add their dogs, upload health documents
3. **Core usage:** Admin manages members and documents digitally. Members upload vaccine certificates, pay licenses online, check events
4. **Success moment:** Competition day — admin checks all participating dogs' vaccines in the app in 30 seconds. No more paper binder.

**Shared long-term:** The app becomes the single place for club life — events, chat, documents, payments. No more paper, no more scattered workarounds.

---

## Success Metrics

### User Success Metrics

| Metric | Target | How to Measure |
|---|---|---|
| **Map → navigation in one tap** | 100% of GPS points open directly in Waze/Google Maps | Zero complaints about broken maps or multi-step workarounds |
| **Chat that actually works** | Members can type, see what they're typing, edit, and send without fighting the UI | Zero UX complaints about basic messaging (vs. CaniClub where you can't see your own text while typing) |
| **Chat replaces workarounds** | Members coordinate in-app, not on Facebook/WhatsApp | Decline in club coordination happening outside the app |
| **Event discovery** | Members find relevant events quickly from the ~30/month feed | Members check the app weekly or daily |
| **Admin event creation** | All 10 admins create events with GPS pins and draft mode without training | Admins use draft → publish workflow naturally |

### Business Objectives

| Objective | Target | Timeframe |
|---|---|---|
| **Dual pilot validation** | 10 test members from cani'potes 42 (FFSLC) + 10 from a CNEAC club confirm value | Pilot period (duration TBD) |
| **FFSLC club migration** | cani'potes 42 (~100 members) fully switched, CaniClub Connect retired | Post-pilot |
| **CNEAC club adoption** | Pilot CNEAC club fully onboarded with documents and payments | Post-pilot |
| **Multi-club proof** | Both pilot clubs operate independently on the same platform with zero data leakage | During pilot |
| **Document digitization** | Pilot CNEAC club has 80%+ of member/dog documents uploaded | Post-pilot |
| **Platform expansion** | Offer to 5+ additional clubs (FFSLC and CNEAC) | Within 6 months of pilot |

### Key Performance Indicators

| KPI | Definition | Target |
|---|---|---|
| **Pilot approval rate** | % of pilot members who vote to proceed with full switch | 100% (all 10) |
| **Weekly active users** | Members who open the app at least once per week after full switch | >80% of members |
| **Map tap-through rate** | % of event views that result in a Waze/Google Maps redirect | Tracked, no hard target — just prove it works |
| **Admin draft usage** | % of events created in draft mode before publishing | Tracked — confirms the workflow is being used |
| **Chat adoption** | Messages sent in-app vs. workaround reports | Growing trend, qualitative |
| **Support requests** | Complaints or confusion reported by members | Near zero after onboarding |

---

## MVP Scope

> **Updated 2026-03-21:** MVP expanded from single-club to multi-club platform per Sprint Change Proposal (see `sprint-change-proposal-2026-03-21.md`).

### Core Features

| Feature | Description | Why MVP |
|---|---|---|
| **Multi-tenant club platform** | Any club can sign up, create their space, invite members. Shared DB with club_id tenant isolation. Federation-agnostic (FFSLC, CNEAC, or unaffiliated) | Foundation for everything. Cannot retrofit multi-tenancy later. CNEAC market requires day-1. |
| **Authentication + RBAC** | Signup, login, JWT with clubId claim. Roles: owner, admin, member. Admin invite flow | Foundation for all access control |
| **Member management (per-club)** | Member profiles, directory, role management — all scoped to the active club | Core club operations, now tenant-scoped |
| **Dog profiles + health records** | Dog CRUD (name, breed, birthdate, chip number, photo), vaccine records with expiry tracking | Required for document management. CNEAC clubs track dog health for competition eligibility |
| **Document management** | Upload and store registration forms, vaccine certificates, health records. Associate to members or dogs. Expiry tracking. Cloudflare R2 for file storage | **Core value proposition for CNEAC clubs** — they have zero digital tools for this. Strongest differentiator |
| **Event management + maps** | Create events with GPS pin placement, draft/published visibility, event feed, Waze/Google Maps redirect, participation tracking | Core pain point for FFSLC clubs — admins need this daily |
| **Chat with image sharing** | Club-scoped channels, real-time messaging (WebSocket), image sharing, message history | #2 UX failure of CaniClub — replaces broken chat |
| **License payment integration** | License types per club, Stripe Checkout, payment status tracking, license status per member per season, Stripe webhook handler | Demonstrates real operational value. License payments are the primary admin headache for clubs |

### Out of Scope for MVP

| Feature | Rationale | Target Phase |
|---|---|---|
| **FFSLC race calendar sync** | Club experience must prove value first. Irrelevant for CNEAC clubs | Phase 2 |
| **Push notifications** | Members can check the app directly during pilot | Phase 2 |
| **Carpool coordination** | Can be handled via chat initially | Phase 2-3 |
| **Accounting** | Low priority — clubs use other tools | Phase 3 |
| **Freemium billing/subscription** | Free for MVP, freemium decisions after validation | Phase 3 |

### MVP Success Criteria

| Criteria | Validation |
|---|---|
| **Dual pilot approval** | 10 test members from FFSLC pilot + 10 from CNEAC pilot confirm value |
| **Multi-tenant works** | Both clubs operate independently, zero cross-club data leakage |
| **Maps work every time** | Zero complaints about GPS points or navigation redirect |
| **Chat is usable** | Members can type, see their text, share images — no workarounds needed |
| **Documents digitized** | CNEAC pilot club has 80%+ of member/dog documents uploaded |
| **Payments work** | At least one license payment processed successfully via Stripe |
| **Admins adopt the workflow** | Admins from both clubs create events and manage members without training |
| **Decision point** | Dual pilot success → full migration of cani'potes 42 + CNEAC club expansion |

### Phased Delivery

**Phase A — "Multi-Tenant Core" (sprints 1-4):**
- Multi-tenant foundation + auth + RBAC + member management + event management with maps
- Milestone: Start pilot testing with both clubs on core features

**Phase B — "Dogs, Docs, Chat" (sprints 5-8):**
- Dog profiles + document management + chat with image sharing
- Milestone: Full feature set available for testing

**Phase C — "Payments + Polish" (sprints 9-11):**
- License payment integration + integration testing + dual pilot launch
- Milestone: Production-ready for both pilot clubs

### Future Vision

**Phase 2 — Federation Bridge (post-MVP):**
- FFSLC race calendar sync via public API (already reverse-engineered)
- Unified event feed: club events + federation races
- Push notifications for events and reminders
- "Who's going" to races from the club

**Phase 3 — Scale + Monetization:**
- Freemium model: free core, premium document storage / payment features
- Carpool coordination for races
- HelloAsso membership integration
- Accounting module
- Expand to 50+ clubs

**Long-term Vision:**
- The go-to platform for canine sports clubs in France — FFSLC, CNEAC, and beyond
- Wearable IoT integration (dog health monitoring)
- AI-powered training recommendations
- The club management app that Canicompet should have built — free, open, and customizable

### Revenue Model

**MVP:** 100% free. Zero cost to clubs. Infrastructure runs on free tiers (Vercel, Render, Neon, Cloudflare R2). Stripe transaction fees (1.4% + €0.25) are the only cost, passed to members or absorbed by clubs.

**Post-validation:** Architected for freemium. Potential premium features: expanded document storage, priority support, custom branding, advanced analytics. Decision deferred until after dual pilot validation.
