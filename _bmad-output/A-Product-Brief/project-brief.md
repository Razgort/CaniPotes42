# Product Brief: CaniFed

## Strategic Summary

CaniFed is a free, multi-tenant club management platform for canine sports clubs in France. Born from daily frustrations with CaniClub Connect's broken maps, unusable chat, and rigid workflows, CaniFed delivers a beautiful, fluid experience for both club members and administrators. It is federation-agnostic by design: equally suited for canicross (FFSLC), agility (CNEAC), or any canine sports discipline, with federation integrations layered on top as optional plugins.

The platform addresses two distinct market failures simultaneously. FFSLC clubs are locked into a broken monopoly with no competitive pressure to improve. CNEAC clubs — representing agility, obedience, and other disciplines — have absolutely no digital club management tools. Everything is paper-based. CaniFed is the first platform to serve both segments from a single, modern codebase.

The product is offered as a free service with no obligations, architected for future freemium. Clubs get full independence: no vendor lock-in, no federation dependency, just a modern tool that works and that clubs are proud to use.

---

## Vision

CaniFed exists to give every canine sports club in France the digital tools they deserve — beautiful, reliable, and free. By replacing broken incumbents for FFSLC clubs and filling a total void for CNEAC clubs, CaniFed becomes the go-to platform where club life happens: events, communication, documents, payments — all in one place. Club autonomy is sacred: no vendor lock-in, no federation dependency, just a modern tool that works and that clubs are proud to use.

**Vision Pillars:**
1. **Liberation** — free clubs from broken tools (FFSLC) or no tools at all (CNEAC)
2. **Beauty & reliability** — a modern UX that just works (maps, chat, events)
3. **Club autonomy** — free, open, federation-agnostic, customizable
4. **Unified club life** — one platform for everything, replacing scattered workarounds

---

## Positioning

**For** canine sports club administrators and members in France (FFSLC, CNEAC, and independent clubs) **who need** a reliable, modern platform to manage club life — events, communication, documents, and payments — **CaniFed is** a free, multi-tenant club management platform **that** delivers beautiful UX, working maps, real-time chat, and full document management. **Unlike** CaniClub Connect (broken UX, FFSLC-only, closed ecosystem) or generic association tools (HelloAsso, AssoConnect — no canine sports specifics), **CaniFed** is federation-agnostic, free with no vendor lock-in, and serves the entirely unserved CNEAC market from day one.

**Positioning Components:**
- **Target:** Club admins and members across all French canine sports federations
- **Need:** Reliable digital club management (events, chat, docs, payments)
- **Category:** Club management platform
- **Key benefit:** It just works — beautiful, modern, free
- **Alternatives:** CaniClub Connect, HelloAsso/AssoConnect, paper/Facebook/WhatsApp workarounds
- **Differentiator:** Only federation-agnostic option; first digital tool for CNEAC; free & open vs. closed monopoly

---

## Product Concept

**Core Structural Idea: The Club as a Digital Space**

Every interaction in CaniFed is scoped to a club. You enter your club, and everything lives there — events, chat, members, documents, dogs. The club is the container, the boundary, and the identity.

**Implementation Principle:** Multi-tenant architecture with `club_id` as the universal scope. Every entity (event, message, document, member) belongs to a club. No data leaks across clubs. Multi-club members switch context between clubs, not merge them.

**Rationale:** This mirrors how club life actually works — you belong to a club, your identity within it is as a member of that club. It enables the platform to scale to any club without cross-contamination, and keeps the mental model dead simple: "Open app > I'm in my club > here's what's happening."

**Features That Stem From This Concept:**
- Club-scoped channels, events, member directories
- Admin roles per-club (not global)
- Federation plugins layered on top of the club space (not baked in)
- Multi-club switcher for members in multiple clubs

---

## Target Users

### Business Customers (B2B Layer)

- **Organization type:** French canine sports clubs (FFSLC, CNEAC, independent)
- **Size:** 30-150 members typical, no hard limits
- **Decision-maker:** Club president or lead admin — typically one person decides, rest follow
- **Buyer vs. User:** Admin adopts the platform (buyer), members use it daily (end users). No procurement process — it's free, so the barrier is effort, not budget
- **Two acquisition paths:**
  - FFSLC clubs: "Replace your broken tool" — pain-driven migration
  - CNEAC clubs: "Get your first digital tool" — greenfield adoption
- **Decision criteria:** Free (no budget approval needed), better UX than status quo, low switching effort, no vendor lock-in

### Primary Users (B2C Layer)

**Julie, 32 — The Competitor**
Active canicross/canitrail runner, in-app daily, high engagement. Plans her competition season around club events and FFSLC races. Frustrated by broken maps and unreliable chat that forces coordination onto Facebook/WhatsApp. Success: sees an upcoming race, checks clubmates going, joins carpool thread, taps GPS for Waze on race day — all in one place.

**Patrick, 55 — The Rando Walker**
Casual canirando participant, weekly use, limited tech comfort. Needs things to be obvious and intuitive. Picks walks from the busy calendar, needs clear GPS meeting points. Frustrated by confusing UI and broken maps. Success: gets notification about Sunday's walk, taps it, sees where to meet, taps for Google Maps. Zero friction.

**Perrine, admin — The Event Organizer**
One of ~10 club administrators, near-daily event creation. Needs easy GPS pin placement, draft/admin-only visibility, smooth event workflows. Frustrated by painful GPS placement and no draft mode. Success: creates event, drops GPS pin in two taps, previews as admin-only, publishes when ready.

**Marie, 45 — The CNEAC Club Admin**
President of a small agility club (~60 members). Manages all admin on paper — registrations, license tracking, vaccine verification. Has zero digital tools. Success: new member registers online, uploads vaccine certificate, pays license via platform. Marie sees everything in one dashboard.

### Secondary Users

- **Parents of junior members** — use the app as regular members, no special features needed
- **Multi-club members** — belong to both FFSLC and CNEAC clubs, need easy club switching

### Design Implication

Tech comfort runs wide (Julie to Patrick). UI must be obvious-first — if Patrick can use it without help, Julie will fly.

---

## Business Model

**Model:** B2B2C Platform

- **B2B layer:** Clubs sign up, create their space, onboard members. Club admins are decision-makers.
- **B2C layer:** Members interact with events, chat, documents daily.
- **Revenue (MVP):** 100% free. Zero cost to clubs. Infrastructure on free tiers. Stripe transaction fees (1.4% + 0.25 EUR) on license payments are the only cost.
- **Revenue (Post-validation):** Architected for freemium. Potential premium features: expanded document storage, priority support, custom branding, advanced analytics. Decision deferred until after dual pilot validation.

**Implications:**
- Two UX tracks: admin experience (club management) and member experience (events, chat, docs)
- Acquisition is B2B: convince one club admin, get 100 members
- Retention is B2C: members must love the daily experience
- Free removes every adoption barrier

---

## Success Criteria

### Primary Metrics

| Criteria | Metric | Target | Timeline |
|---|---|---|---|
| Dual pilot validation | Pilot members confirm value | 10 FFSLC + 10 CNEAC testers approve | Pilot period |
| Maps just work | GPS complaints | Zero broken map reports | From day 1 |
| Chat replaces workarounds | In-app messaging adoption | Members coordinate in-app, not Facebook/WhatsApp | During pilot |
| Multi-tenant integrity | Cross-club data leakage | Zero incidents | From day 1 |

### Secondary Metrics

| Criteria | Metric | Target | Timeline |
|---|---|---|---|
| CNEAC document digitization | % of member/dog docs uploaded | 80%+ for pilot club | Post-pilot |
| Weekly active users | Members opening app weekly | >80% after full switch | Post-pilot |
| Admin self-service | Admins creating events without training | All admins from both clubs | During pilot |
| Payment integration | Successful Stripe transaction | At least 1 processed | During pilot |

**Priority:** Multi-tenant integrity and maps working are table stakes. Dual pilot approval is the ultimate gate.

---

## Competitive Landscape

### Alternatives

| Alternative | Why they stick | Strength | Weakness |
|---|---|---|---|
| CaniClub Connect | FFSLC endorsement, only dedicated option, habit | Established user base, federation integration | Broken maps, terrible chat, dated UX, closed ecosystem |
| Facebook/WhatsApp groups | Free, everyone has it, zero setup | Ubiquitous, familiar | Not a club tool — no events, no dog profiles, no documents |
| HelloAsso / AssoConnect | Payment & membership management | Good at donations/payments | Zero canine sports specifics |
| Paper + spreadsheets | Zero cost, zero learning curve | Works "well enough" | Doesn't scale, lost docs, manual verification |
| Do nothing | No effort required | — | CNEAC stays on paper forever; FFSLC keeps working around broken features |

### Unfair Advantage

1. **CaniClub Connect is structurally slow to improve** — single developer, no competition, no incentive. Years of broken features unfixed.
2. **CNEAC market is untouched** — even if CaniClub Connect became perfect tomorrow, CNEAC clubs still have zero. This alone justifies CaniFed.
3. **Multi-federation architecture can't be retrofitted** — CaniClub Connect is hardwired to FFSLC. Going federation-agnostic would require a rewrite.
4. **Free removes the decision** — no budget approval, no risk. Clubs can try CaniFed with zero commitment.

**Biggest risk:** Adoption inertia ("what we have is fine"). Antidote: dual pilot proving undeniable value.

---

## Constraints & Context

### Fixed Constraints

| Category | Constraint | Rationale |
|---|---|---|
| Budget | Zero infrastructure cost at MVP | Free tiers only (Vercel, Render, Neon, Cloudflare R2) |
| Budget | Free to clubs, no subscription | Core to positioning |
| Technical | Nx monorepo, React, NestJS, Prisma, PostgreSQL | Already built |
| Technical | Web-first PWA | Architecture decision made |
| Technical | Multi-tenant from day one | Cannot retrofit |
| Team | Solo developer | Building alone |
| Brand | Federation-agnostic | Core differentiator |

### Flexible Parameters

| Category | Parameter | Flexibility |
|---|---|---|
| Timeline | No hard deadline | Pilot when ready |
| Scope | MVP feature order | Phases can shift based on feedback |
| Design | Visual identity | No existing brand — full creative freedom |
| Technical | Hosting providers | Free tier providers can be swapped |
| Growth | Number of pilot clubs | Could start with 1 instead of 2 |

---

## Platform & Device Strategy

| Aspect | Decision | Rationale |
|---|---|---|
| Primary platform | Progressive Web App (PWA) | Web-first, installable, no app store friction, solo dev constraint |
| Tech stack | React + Tailwind + shadcn/ui, NestJS backend | Already built in Nx monorepo |
| Device priority | Mobile-first | Members use phones for events, GPS, chat in the field |
| Desktop support | Responsive — fully usable | Admins prefer desktop for event creation and document management |
| Interaction models | Touch (primary), mouse+keyboard (secondary) | Mobile-first with admin desktop comfort |
| Offline | Not MVP | Can add service worker caching later |
| Native features | Geolocation, camera, notifications (Phase 2) | Core to GPS and document use cases |

**Design implications:** Design mobile breakpoints first, scale up to tablet/desktop. Admin-heavy screens comfortable at desktop widths. Touch targets and thumb-friendly navigation throughout.

---

## Tone of Voice

**Attributes:**
1. **Friendly & warm** — club app, not enterprise software. Members are clubmates.
2. **Clear & simple** — Patrick needs to understand instantly. No jargon, no ambiguity.
3. **Encouraging** — people coordinating dog sports is a passion. The app should feel supportive.
4. **Confident & reliable** — replacing something broken. Quietly signals "this works."

**Examples:**

| Context | Avoid | Use |
|---|---|---|
| Empty event list | "No events found" | "Rien de prevu pour l'instant" |
| GPS redirect | "Open in external navigation app" | "Y aller avec Waze" |
| Event created | "Event successfully created" | "Evenement cree ! Publie-le quand tu es pret." |
| Upload error | "Upload failed: file too large" | "Ce fichier est trop lourd. Essaie avec moins de 5 Mo." |
| Empty chat | "No messages in this channel" | "C'est calme ici... Lance la discussion !" |

**Guidelines:**
- Use "tu" (not "vous")
- Short sentences, action verbs
- Encouraging empty states
- No corporate speak, no jargon, no passive voice, no cold error messages

---

**Status:** Product Brief Complete
**Next Phase:** Content & Language Strategy (Step 13), then Visual Direction, Platform Requirements
**Last Updated:** 2026-03-22
