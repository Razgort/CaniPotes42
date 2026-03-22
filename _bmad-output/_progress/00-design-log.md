# Design Log: CaniFed

## Current

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| Phase 1: Product Brief | COMPLETE | 2026-03-22 | project-brief.md + content-language.md |
| Phase 2: Trigger Mapping | COMPLETE | 2026-03-22 | Dream mode, full trigger map with 3 personas + feature impact analysis |
| Phase 3: UX Scenarios | COMPLETE | 2026-03-22 | See `C-UX-Scenarios/00-ux-scenarios.md` |

## Design Loop Status

| Scenario | Step | Page | Status | Date |
|----------|------|------|--------|------|
| 01-perrine-sets-up-club | 01.1 | Landing Page | specified | 2026-03-22 |
| 02-perrine-admin-day | 02.1 | Event Creation/Edit | specified | 2026-03-22 |

## Backlog

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 4: Page Specifications | IN PROGRESS | Landing specified; Event — proposition Suggest en revue |
| Phase 5: Visual Design | PENDING | |

## Progress

### 2026-03-22 — [P] complet : 3ᵉ lot (10 pages) → **27/27**

**Pages :** `01.5` Invitation membre, `01.6` Rôles, `02.2` Annuaire, `02.3` Tableau vaccins admin, `02.4` Documents admin, `02.5` Config licences, `02.6` Historique paiements, `04.4` Carnet vaccins membre, `04.6` Mes documents, `05.1` Club switcher.  
**Index :** [00-page-specs-index.md](../C-UX-Scenarios/00-page-specs-index.md) — toutes les lignes marquées **[P] complet** ; fin du mode yolo condensé pour le périmètre 27 pages.

### 2026-03-22 — [P] complet ×10 (2 lots : login→club settings)

**Lot 1 :** `03.1` Login, `03.4` RSVP, `05.2` Paiement licence, `04.5` Upload document, `03.5` Liste canaux chat.  
**Lot 2 :** `03.6` Conversation chat, `04.2` Profil membre, `04.3` Fiche chien, `05.3` Paramètres compte global, `01.4` Paramètres club.  
**Note :** spec Login alignée sur `LoginForm.tsx` (redirect `/club-setup`, lien `/register`).

### 2026-03-22 — [P] complet ×5 (Sign Up, Club wizard, Feed, Event detail, Invite)

**Pages :** `01.2`, `01.3`, `03.2`, `03.3`, `04.1` — specs étendues niveau landing/02.1. Index mis à jour dans `00-page-specs-index.md`.

### 2026-03-22 — Dream yolo : specs des 27 pages

**Agent:** Cursor (WDS `[D]` interprétation « toutes les specs pages »)  
**Outputs:** Une spec markdown par page sous `C-UX-Scenarios/**` ; index [00-page-specs-index.md](../C-UX-Scenarios/00-page-specs-index.md).  
**Note:** 25 pages en mode condensé yolo ; `01.1` + `02.1` restent les seules specs [P] ultra-détaillées. Dossiers `Sketches/` ajoutés avec `.gitkeep`.

### 2026-03-22 — Dream Up Design : prototypes HTML

**Agent:** Cursor / Freya (mode `[D]`)  
**Outputs:** `C-UX-Scenarios/html-prototypes/01-landing.html`, `02-event-create.html`, `README.md`, `DREAM-2026-03-22-summary.md`  
**Note:** Maquettes statiques pour revue rapide ; specs 01.1 / 02.1 restent la référence normative.

### 2026-03-22 — Phase 4: Event 02.1 specified (décisions Leader)

**Agent:** Cursor / Freya  
**Done:** Spec `02.1-event-creation-edit.md` — Enregistrer + toggle, modale publish MVP, carte optionnelle par événement + `defaultEventShowMap` club.  
**Next:** 02.2 Member Directory ou implémentation API/Prisma pour `showMap` + settings club.

### 2026-03-22 — Phase 4: Landing specified + Event Suggest proposal

**Agent:** Cursor / Freya (WDS [P] puis [S])  
**Done:** Spec complète landing `01.1-landing-page/01.1-landing-page.md` ; proposition création d’événement `02.1-event-creation-edit-design-proposal.md`.  
**Next:** Validation des 3 questions Event → puis [P] sur 02.1.

### 2026-03-22 — Phase 3: UX Scenarios Complete

**Agent:** Cursor (WDS Phase 3 — Suggest mode outlines)  
**Scenarios:** 5 scenarios covering 27 pages  
**Quality:** Good (see `C-UX-Scenarios/phase-3-quality-review.md`)

**Artifacts Created:**

- `C-UX-Scenarios/scenario-plan-approved.md` — Approved scenario plan (Step 4)  
- `C-UX-Scenarios/00-ux-scenarios.md` — Scenario index + coverage matrix  
- `C-UX-Scenarios/phase-3-quality-review.md` — Self-review checklist  
- `C-UX-Scenarios/01-perrine-sets-up-club/01-perrine-sets-up-club.md`  
- `C-UX-Scenarios/01-perrine-sets-up-club/01.1-landing-page/01.1-landing-page.md`  
- `C-UX-Scenarios/01-perrine-sets-up-club/01.1-landing-page/Sketches/.gitkeep`  
- `C-UX-Scenarios/02-perrine-admin-day/02-perrine-admin-day.md`  
- `C-UX-Scenarios/02-perrine-admin-day/02.1-event-creation-edit/02.1-event-creation-edit.md`  
- `C-UX-Scenarios/02-perrine-admin-day/02.1-event-creation-edit/Sketches/.gitkeep`  
- `C-UX-Scenarios/03-julie-race-weekend/03-julie-race-weekend.md`  
- `C-UX-Scenarios/03-julie-race-weekend/03.1-login/03.1-login.md`  
- `C-UX-Scenarios/03-julie-race-weekend/03.1-login/Sketches/.gitkeep`  
- `C-UX-Scenarios/04-new-member-joins/04-new-member-joins.md`  
- `C-UX-Scenarios/04-new-member-joins/04.1-email-invitation-accept/04.1-email-invitation-accept.md`  
- `C-UX-Scenarios/04-new-member-joins/04.1-email-invitation-accept/Sketches/.gitkeep`  
- `C-UX-Scenarios/05-patrick-simple-club-life/05-patrick-simple-club-life.md`  
- `C-UX-Scenarios/05-patrick-simple-club-life/05.1-club-switcher/05.1-club-switcher.md`  
- `C-UX-Scenarios/05-patrick-simple-club-life/05.1-club-switcher/Sketches/.gitkeep`  

**Summary:** Five linear scenarios anchor Perrine (onboarding + admin ops), Julie (member engagement), Camille (invitee onboarding), and Patrick (casual path). Every UI page from the scope inventory maps to exactly one scenario. Named persona **Camille** for scenario 04 while keeping folder slug `04-new-member-joins` for alignment with implementation epics. First-step page boilerplate exists for each scenario; additional step folders remain to be added during Phase 4 or a continuation pass.

**Next:** Phase 4 — UX Design  

## Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-22 | Invited member named **Camille**; slug `04-new-member-joins` | WDS requires persona-in-title; epic/story naming may still use “new member” |

## Phase 2 Details

- **Mode:** Dream (autonomous)
- **Personas:** Perrine (admin, PRIMARY), Julie (active member, SECONDARY), Patrick (casual member, TERTIARY)
- **Key insight:** Events + GPS are the absolute core — 4 of 5 HIGH priority forces relate to event creation, discovery, or GPS navigation
- **Design log:** _progress/agent-experiences/2026-03-22-trigger-map-dream.md
