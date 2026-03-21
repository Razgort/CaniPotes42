---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: 'CaniFed Platform - Replacing CaniClub Connect with React/NestJS/Nx'
research_goals: 'Define data flow between club data and FFSLC, reverse-engineer public endpoints, architecture decisions'
user_name: 'Leader'
date: '2026-03-21'
web_research_enabled: true
source_verification: true
---

# Technical Research Report: CaniFed Platform

**Date:** 2026-03-21
**Author:** Leader
**Research Type:** Technical — Full-Stack Platform Architecture & FFSLC Integration

---

## Executive Summary

CaniFed is a project to replace **CaniClub Connect** (by Canicompet) with a custom-built club management platform for the **cani'potes 42** dog sports club (FFSLC Club ID: 1171, Loire Sud / Haute-Loire). The new platform will be built with **React + NestJS** in an **Nx monorepo**, designed with **Paper.design** (MCP-integrated), and deployed on a **100% free hosting stack**.

This research documents:
1. What CaniClub Connect currently offers (features to match or exceed)
2. The FFSLC public API endpoints discovered via network analysis (reverse-engineered)
3. The data flow architecture between club data and FFSLC
4. Technology stack decisions and deployment strategy

---

## Table of Contents

1. [CaniClub Connect Feature Analysis](#1-caniclub-connect-feature-analysis)
2. [FFSLC Public API — Reverse-Engineered Endpoints](#2-ffslc-public-api--reverse-engineered-endpoints)
3. [Club Identity: cani'potes 42](#3-club-identity-canipotes-42)
4. [Data Flow Architecture: Club <-> FFSLC](#4-data-flow-architecture-club--ffslc)
5. [Technology Stack Decisions](#5-technology-stack-decisions)
6. [Deployment Strategy (100% Free)](#6-deployment-strategy-100-free)
7. [Design Workflow: Paper.design + MCP](#7-design-workflow-paperdesign--mcp)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Risks & Mitigations](#9-risks--mitigations)

---

## 1. CaniClub Connect Feature Analysis

**Source:** [CaniClub Connect](https://caniclubconnect.com/) by Canicompet ([Documentation](https://doc.canicompet.com/fr/caniclub/Gestion-clubs-canins))

CaniClub Connect is an Ionic/Angular mobile-first application. Key features:

### Member Management
- Member registration, profile updates, subscription tracking
- Photo directory (trombinoscope) for member identification
- Membership fee tracking and renewal

### Dog Management
- Dog profiles with tags/labels (e.g., mordeur, groupe education 2, CSAU, PASS Agility)
- Vaccine tracking and verification (club can check)
- Dog-member association

### Communication
- Instant messaging between members and club leaders
- Push notifications
- Club announcements

### Events & Competitions
- Create events: training sessions, competitions, seminars, meetings
- **Import competitions from FFSLC, CNEAC, and Canicompet calendars**
- Event details: dates, locations, instructors

### Accounting
- Simplified association accounting (income, expenses, donations)
- Annual general assembly preparation

### FFSLC Integration
- License management (planned: license purchasing, pre-registrations)
- Calendar import from FFSLC federal calendar

### What CaniFed Must Do Better
- **Modern web-first experience** (not just mobile app)
- **Direct FFSLC data sync** (not just import)
- **Better UX** via Paper.design mockups
- **Open, extensible** (Nx monorepo, REST API)
- **Free to host** (no subscription fees)

---

## 2. FFSLC Public API — Reverse-Engineered Endpoints

**Base URL:** `https://servercourses.ffslc.fr`

The FFSLC platform (courses.ffslc.fr) is an Angular/Ionic app backed by a Django-style REST API. The following **public endpoints** were identified via browser network inspection:

### 2.1 Events List (Public)

```
GET /fr/events/ws_public/GetEventsList/
```

**Response structure:**
```json
{
  "can_create_formations": false,
  "all_fedes": [
    { "id": 2, "name": "FFSLC" },
    { "id": 6, "name": "CNEAC" },
    { "id": 17, "name": "FFC" }
    // ... 40 total federations including ICF members
  ],
  "all_countries": [
    { "code": "France", "label": "France", "count": 70 }
  ],
  "events_nb": 70,
  "events": [
    // Mix of month separators and event objects
    {
      "data_type": "month",
      "month": "2026-03-01",
      "count": 13
    },
    {
      "data_type": "event",
      "id": 969,
      "type": "race",           // "race" | "formation" | "interclub"
      "typeRace": "canicross",
      "name": "La Canicreusoise",
      "country": "France",
      "date_time_start": "2026-03-21",
      "date_time_end": "2026-03-22",
      "is_important": false,
      "is_chien_dor": true,
      "poster": "https://servercourses.ffslc.fr//fr/download/{uuid}.jpeg",
      "is_past": false,
      "fede_name": "FFSLC",
      "fede_id": 2,
      "fedeLogo": "marker_blue.png",
      "isPublished": true,
      "club_name": "Entente Athletique Aubussonnaise section Canicross",
      "clubLogo": "",
      "postal_code": "23",
      "isSimplifiedEvent": false,
      "location": {
        "latitude": 45.96085679018606,
        "longitude": 2.111772281417909
      },
      "hasResults": false,
      "testTypes": [
        "Canicross", "Canitrail", "Canimarche non chronometree",
        "CaniVTT", "Cani Pedicycle"
      ]
    }
  ],
  "all_postal_code": [...],
  "all_postal_code_sorted": [
    ["-1", "Auvergne-Rhone-Alpes"],
    ["-2", "Bourgogne-Franche-Comte"],
    // ... regions with negative IDs, departments with postal codes
  ]
}
```

**Event types discovered:** `race`, `formation`, `interclub`
**Test types discovered:** Canicross, Canitrail, Canimarche, CaniVTT, Cani Pedicycle

### 2.2 Event Detail (Public)

```
GET /fr/events/ws_public/{event_id}/GetEventFiche/
```

**Response structure (key fields):**
```json
{
  "success": true,
  "id": 1114,
  "name": "Course des Vins de Patrimonio",
  "type": "race",
  "typeRace": "canicross",
  "country": "France",
  "postalCode": "20",
  "dateTimeStart": "2026-03-22",
  "dateTimeEnd": "2026-03-22",
  "dateTimeStakeout": null,
  "dateTimeBibStart": null,
  "dateTimeBibEnd": null,
  "location": {
    "latitude": 42.697,
    "longitude": 9.362,
    "address": ""
  },
  "coordinates": {
    "type": "Point",
    "coordinates": [9.362, 42.697]
  },
  "clubs": [
    { "id": 1140, "name": "Corsica sport canin", "avatar": null }
  ],
  "contact": "Arnaud Bruyant",
  "fedeName": "FFSLC",
  "fedeId": 2,
  "isPublished": true,
  "isPast": false,
  "hasResults": false,
  "hasResultsPublished": false,
  "hasResultsLive": false,
  "vaccinesRequired": [
    { "name": "CHP (Carre, Hepatite, Parvovirose)" },
    { "name": "Leptospirose" },
    { "name": "Rage" },
    { "name": "Toux du chenil (TC)" }
  ],
  "tests": [
    {
      "type": "test",
      "testId": 4680,
      "testName": "course des vins",
      "dates": [
        { "date": "2026-03-22 07:30:00+00:00", "length_meter": 10000, "length_km": 10 }
      ],
      "fedeName": "FFSLC",
      "testTypeName": "Canitrail",
      "testTypeType": "Canitrail",
      "priceFirst": 25,
      "priceSuppIfNoFedeIs": true,
      "priceSuppIfNoFede": 5,
      "registrationsIsClosed": false,
      "isLimitation": true,
      "isLimitationCount": 38,
      "useWaiting": true
    }
  ],
  "registrations": {...},
  "paymentOnlineIs": false,
  "paymentOnSiteIs": true,
  "paymentMoneyIs": true,
  "paymentBankCheckIs": true,
  "poster": "https://servercourses.ffslc.fr//fr/download/{uuid}.jpeg",
  "urlToSubscribe": "...",
  "isFromFedeCalendar": true,
  "FFSLCImportIs": true,
  "step": "...",
  "banners": [...],
  "devise": "..."
}
```

### 2.3 Clubs List (Public)

```
POST /fr/clubs/ws_public/GetClubsList/
Content-Type: application/json
Body: {}
```

**Response structure:**
```json
{
  "clubs": [
    {
      "regionId": 1,
      "regionName": "Region 1 : Centre",
      "clubs": [
        {
          "id": 1190,
          "name": "ACC Val Drouette",
          "fedes": ["FFSLC"],
          "postal_code": "28",
          "avatar": null,
          "location": { "latitude": 51.01, "longitude": 2.12 }
        }
      ]
    }
    // ... grouped by region, 215 total clubs
  ]
}
```

### 2.4 Club Detail (Public)

```
GET /fr/clubs/ws_public/{club_id}/GetClub/
```

**Response structure:**
```json
{
  "id": 1171,
  "name": "cani'potes 42",
  "type": "club",
  "avatar": "https://servercourses.ffslc.fr//fr/download/{uuid}.png",
  "fedes": ["FFSLC"],
  "location": { "latitude": 45.447, "longitude": 4.337 },
  "responsibles": ["PERRINE ABATTU"],
  "phoneNumber": "",
  "email": "contact.canipotes42@gmail.com",
  "website": "https://www.facebook.com/media/set/?set=a.479278267542840",
  "website_url": "...",
  "website2": "https://www.helloasso.com/associations/cani-potes-42/adhesions/adhesion-2025-2026-sport",
  "website2_url": "...",
  "description": "<p>Club base sur Loire Sud, limitrophe Haute Loire !...</p>",
  "displayActionJoin": false,
  "displayActionResponsible": false,
  "displayActionLicences": false,
  "displayActionMemberships": false,
  "displayActionEvents": false,
  "displayActionCompta": false
}
```

### 2.5 Private Endpoint (Auth Required)

```
GET /fr/accounts/ws_private/User/
```
Returns authenticated user info. Requires session cookie from courses.ffslc.fr login.

### 2.6 File Downloads (Public)

```
GET /fr/download/{uuid}.{ext}
```
Serves posters, avatars, and other media files. UUID-based, publicly accessible.

### 2.7 Endpoint Summary Table

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/fr/events/ws_public/GetEventsList/` | GET | No | All future events + federations + regions |
| `/fr/events/ws_public/{id}/GetEventFiche/` | GET | No | Full event detail with tests, prices, registrations |
| `/fr/clubs/ws_public/GetClubsList/` | POST | No | All 215 clubs grouped by region |
| `/fr/clubs/ws_public/{id}/GetClub/` | GET | No | Club detail with contact, description, links |
| `/fr/accounts/ws_private/User/` | GET | Yes | Authenticated user profile |
| `/fr/download/{uuid}.{ext}` | GET | No | Media files (posters, avatars) |

---

## 3. Club Identity: cani'potes 42

| Field | Value |
|-------|-------|
| **FFSLC ID** | 1171 |
| **Name** | cani'potes 42 |
| **Federation** | FFSLC |
| **Location** | Loire Sud, limitrophe Haute-Loire (45.447N, 4.337E) |
| **Responsible** | Perrine Abattu |
| **Email** | contact.canipotes42@gmail.com |
| **Facebook** | [facebook.com/Canipotes42](https://www.facebook.com/Canipotes42) |
| **Adhesions** | Via HelloAsso (2025-2026 season) |
| **Activities** | Canirando, Canicross, Canitrail, CaniVTT, Canitrotinette |
| **Description** | Club base sur Loire Sud, limitrophe Haute Loire |

---

## 4. Data Flow Architecture: Club <-> FFSLC

### 4.1 Architecture Overview

```
+---------------------+        +------------------+        +-------------------+
|                     |        |                  |        |                   |
|   React Frontend    | <----> |  NestJS Backend  | <----> |  PostgreSQL DB    |
|   (Vercel/Netlify)  |        |  (Render)        |        |  (Neon/Supabase)  |
|                     |        |                  |        |                   |
+---------------------+        +--------+---------+        +-------------------+
                                        |
                                        | FFSLC Sync Service
                                        | (Scheduled CRON)
                                        v
                               +--------+---------+
                               |                  |
                               |  FFSLC Public    |
                               |  API (REST)      |
                               |  servercourses.  |
                               |  ffslc.fr        |
                               |                  |
                               +------------------+
```

### 4.2 Data Flow: FFSLC -> CaniFed (Read-Only Sync)

The FFSLC API is **read-only** from our perspective. No write endpoints are publicly available. The sync strategy is:

1. **Scheduled CRON Job** (NestJS `@nestjs/schedule`):
   - Runs every 6-12 hours
   - Calls `GET /fr/events/ws_public/GetEventsList/` to fetch all upcoming events
   - Calls `GET /fr/clubs/ws_public/{id}/GetClub/` for club details (our club 1171)
   - Stores/updates data in PostgreSQL

2. **On-Demand Sync**:
   - Admin can trigger manual sync via the dashboard
   - Event detail fetched lazily: `GET /fr/events/ws_public/{id}/GetEventFiche/` when a user clicks an event

3. **Data Mapping:**

| FFSLC Data | CaniFed Model | Notes |
|---|---|---|
| Event (race/formation/interclub) | `FfslcEvent` | Synced events from calendar |
| Event tests | `FfslcEventTest` | Individual races within an event |
| Club info | `Club` (self-reference) | Our club profile synced from FFSLC |
| Federations | `Federation` | Reference data (FFSLC, CNEAC, FFC...) |
| Regions/Postal codes | `Region` | Geographic filtering |

### 4.3 Data Flow: Club-Owned Data (Internal Only)

These are **not** synced to FFSLC — they live only in CaniFed:

| Domain | Description |
|--------|-------------|
| **Members** | Member profiles, roles, contact info |
| **Dogs** | Dog profiles, breeds, vaccines, tags |
| **Member-Dog links** | Which member owns which dog(s) |
| **Club Events** | Training sessions, internal gatherings (not FFSLC races) |
| **Attendance** | Who attended which training/event |
| **Memberships** | Subscription plans, payment tracking (HelloAsso integration) |
| **Communication** | Announcements, notifications |
| **Accounting** | Income, expenses, donations |

### 4.4 Hybrid Data: Enriched FFSLC Events

When a member registers for an FFSLC race, we create a **club-level enrichment**:

```
FfslcEvent (synced from FFSLC)
  -> ClubEventRegistration (local)
       -> member_id
       -> dog_id
       -> transport (carpool info)
       -> accommodation
       -> notes
```

This allows the club to:
- Track which members are going to which FFSLC race
- Organize carpools
- Share logistics info
- Without needing write access to FFSLC

---

## 5. Technology Stack Decisions

### 5.1 Core Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Monorepo** | Nx | Already initialized. Shared libs, affected builds, code generators |
| **Frontend** | React + Tailwind CSS + shadcn/ui | Modern, component-driven, great DX |
| **Backend** | NestJS | TypeScript, modular, built-in scheduling, guards, interceptors |
| **ORM** | Prisma | Type-safe, great migrations, PostgreSQL support |
| **Database** | PostgreSQL | Relational data model fits club/member/dog/event relationships |
| **API** | REST | Simple, well-understood, matches FFSLC API pattern |

### 5.2 Key Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| FFSLC Sync | `@nestjs/schedule` + `@nestjs/axios` | CRON-based HTTP sync |
| Auth | `@nestjs/passport` + JWT | Member login |
| Validation | `class-validator` + `class-transformer` | DTO validation |
| State Management | TanStack Query (React Query) | Server state caching |
| Forms | React Hook Form + Zod | Form validation |
| Date handling | date-fns | Lightweight, tree-shakeable |
| Maps | Leaflet / react-leaflet | Show events on map (like FFSLC) |

### 5.3 Design Tooling

| Tool | Purpose |
|------|---------|
| **Paper.design** (Pro) | Mockups, wireframes, visual design |
| **Paper MCP** | Bidirectional sync: design <-> code |
| **MCP Setup** | `claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user` |
| **Workflow** | Design in Paper -> Validate together -> Generate React/Tailwind -> Commit |

---

## 6. Deployment Strategy (100% Free)

| Service | Provider | Free Tier |
|---------|----------|-----------|
| **Frontend** | Vercel or Netlify | Auto-deploy from GitHub, CDN, SSL, custom domain |
| **Backend** | Render | 512 MB RAM, sleeps after inactivity (cold start ~30s) |
| **Database** | Neon or Supabase | PostgreSQL with generous free tier |
| **DNS** | Cloudflare (optional) | Free DNS, DDoS protection |

### Cold Start Mitigation
- Render free tier sleeps after 15 min inactivity
- For a club app with <100 active users, cold starts are acceptable
- Can add a health-check ping from UptimeRobot (free) to keep alive during peak hours

---

## 7. Design Workflow: Paper.design + MCP

### Setup
1. Install Paper Desktop (local instance)
2. Add MCP: `claude mcp add paper --transport http http://127.0.0.1:29979/mcp --scope user`
3. Pro account: 1M MCP calls/week

### Workflow
```
1. DESIGN:     Create mockups in Paper.design
2. VALIDATE:   Review together, iterate
3. GENERATE:   Paper MCP -> get_jsx -> React/Tailwind components
4. REFINE:     Adjust code, push to repo
5. PREVIEW:    Preview in browser via Nx serve
```

### Available MCP Tools (24 total)
- **Read:** `get_selection`, `get_jsx`, `get_screenshot`, `get_computed_styles`
- **Write:** `create_artboard`, `write_html`, `set_text_content`, `update_styles`, `rename_layer`, `duplicate_node`, `delete_node`
- **Utility:** Various helpers

---

## 8. Implementation Roadmap

### Phase 1: Foundation
- [ ] Prisma schema (Member, Dog, Club, Event models)
- [ ] NestJS API scaffolding (auth, CRUD endpoints)
- [ ] React app shell with routing and auth
- [ ] Paper.design: main layout mockups

### Phase 2: FFSLC Integration
- [ ] FFSLC sync service (CRON-based)
- [ ] Events calendar view (list + map)
- [ ] Event detail pages
- [ ] Club profile page (synced from FFSLC)

### Phase 3: Club Management
- [ ] Member management (CRUD)
- [ ] Dog profiles with vaccine tracking
- [ ] Club event creation (training sessions)
- [ ] Attendance tracking

### Phase 4: Social & Logistics
- [ ] FFSLC race registration tracking (who's going)
- [ ] Carpool organization
- [ ] Club announcements / notifications
- [ ] HelloAsso integration for memberships

### Phase 5: Accounting & Admin
- [ ] Simple accounting (income/expenses)
- [ ] Admin dashboard
- [ ] Export capabilities

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FFSLC API changes without notice | Sync breaks | Version checks, error handling, admin alerts |
| FFSLC rate limiting | Sync throttled | Cache aggressively, sync every 6-12h only |
| FFSLC blocks automated access | No sync possible | Use browser-like headers, respect robots.txt, contact FFSLC |
| Render cold starts | Poor UX on first load | UptimeRobot pings, or upgrade to paid if needed |
| Neon/Supabase free tier limits | DB unavailable | Monitor usage, data is small (<100 members) |
| Paper.design MCP changes | Design workflow breaks | Pin MCP version, fallback to manual export |
| CORS on FFSLC endpoints | Can't call from frontend | All FFSLC calls go through NestJS backend (server-side) |

---

## Appendix A: Raw FFSLC API Data Samples

### A.1 Event Types
- `race` — Competition (canicross, canitrail, etc.)
- `formation` — Training/certification (e.g., judge training)
- `interclub` — Inter-club events

### A.2 Test Types (Disciplines)
- Canicross
- Canitrail
- CaniVTT
- Cani Pedicycle
- Canimarche (non chronometree)

### A.3 Vaccine Types Required
- CHP (Carre, Hepatite, Parvovirose)
- Leptospirose
- Rage
- Toux du chenil (TC)

### A.4 Regions (all_postal_code_sorted)
Negative IDs = regions, positive = departments
- -1: Auvergne-Rhone-Alpes
- -2: Bourgogne-Franche-Comte
- -3: Bretagne
- -4: Centre-Val de Loire
- -5: Corse
- -14: DOM-TOM
- -6: Grand Est
- -7: Hauts-de-France
- -9: Normandie
- -10: Nouvelle-Aquitaine
- etc.

---

## Sources

- [CaniClub Connect](https://caniclubconnect.com/)
- [Canicompet Documentation](https://doc.canicompet.com/fr/caniclub/Gestion-clubs-canins)
- [FFSLC Calendar](https://courses.ffslc.fr/calendar)
- [FFSLC Club List](https://courses.ffslc.fr/club-list)
- [cani'potes 42 Club Page](https://courses.ffslc.fr/club-fiche/1171)
- [CaniFed Facebook](https://www.facebook.com/Canipotes42)
- [Paper.design MCP Docs](https://paper.design/docs/mcp)
- [Paper MCP GitHub](https://github.com/ripgrim/paper-mcp)

---

*Research conducted via live browser network inspection of courses.ffslc.fr Angular application, web search, and documentation analysis.*
