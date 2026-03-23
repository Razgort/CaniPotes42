# Feature Impact Analysis: CaniFed

> Prioritized driving forces scored by Frequency x Intensity x Fit to guide design and development decisions

**Document:** Trigger Map - Feature Impact Analysis
**Created:** 2026-03-22
**Status:** COMPLETE

---

## Scoring Method

Each driving force is scored on three dimensions (1-5 scale):
- **Frequency:** How often does this force matter? (5 = every interaction, 1 = rare)
- **Intensity:** How strongly do they feel this? (5 = blocks action if unaddressed, 1 = nice-to-have)
- **Fit:** How well can CaniFed address this? (5 = perfect fit, 1 = hard to address)

**Total Score = Frequency + Intensity + Fit (max 15)**

| Score | Priority | Action |
|-------|----------|--------|
| 14-15 | HIGH | Must address in core product |
| 11-13 | MEDIUM | Should address if feasible |
| 8-10 | LOW | Nice to have, defer |
| <8 | DEPRIORITIZE | Minimal strategic value |

---

## ⭐ Perrine l'Organisatrice — The Club Admin (PRIMARY)

| # | Force | Type | Freq | Int | Fit | Total | Priority |
|---|-------|------|------|-----|-----|-------|----------|
| P1 | Set up club in 10 min, zero training | ✅ Want | 3 | 5 | 5 | 13 | MEDIUM |
| P2 | All members, dogs, docs in one dashboard | ✅ Want | 5 | 4 | 5 | 14 | HIGH |
| P3 | Create events with GPS in two taps | ✅ Want | 5 | 5 | 5 | 15 | HIGH |
| P4 | Migration disrupts club mid-season | ❌ Fear | 2 | 5 | 4 | 11 | MEDIUM |
| P5 | Tool requires ongoing tech maintenance | ❌ Fear | 3 | 5 | 5 | 13 | MEDIUM |
| P6 | Members won't adopt, revert to Facebook | ❌ Fear | 4 | 5 | 4 | 13 | MEDIUM |

**Analysis:**
- **P3 (GPS event creation)** scores maximum 15/15 — this is the #1 design priority. CaniClub Connect's broken GPS is the most cited pain point. Nailing this is table stakes.
- **P2 (unified dashboard)** scores 14/15 — the admin's daily driver. This is what makes the tool sticky for admins.
- **P1 (10-min onboarding)** scores 13 despite lower frequency (it only happens once) because intensity is maximum — if onboarding fails, nothing else matters.
- **P5 and P6** both score 13 — these are critical fears that must be addressed through architecture (zero maintenance) and product design (pull members via events/notifications).

---

## 🚀 Julie la Compétitrice — The Active Member (SECONDARY)

| # | Force | Type | Freq | Int | Fit | Total | Priority |
|---|-------|------|------|-----|-----|-------|----------|
| J1 | See events, who's going, join instantly | ✅ Want | 5 | 4 | 5 | 14 | HIGH |
| J2 | Coordinate carpools in one place | ✅ Want | 4 | 3 | 4 | 11 | MEDIUM |
| J3 | Tap GPS, navigate to meeting point | ✅ Want | 4 | 5 | 5 | 14 | HIGH |
| J4 | Broken maps send her to wrong field | ❌ Fear | 4 | 5 | 5 | 14 | HIGH |
| J5 | Important info buried in Facebook noise | ❌ Fear | 5 | 4 | 4 | 13 | MEDIUM |
| J6 | Another app nobody else uses | ❌ Fear | 3 | 4 | 3 | 10 | LOW |

**Analysis:**
- **J1, J3, J4** all score 14+ — events and GPS are equally critical from the member side. This reinforces P3 (admin GPS) as the highest priority.
- **J4 (broken maps fear)** scores 14 because it's the negative mirror of J3 — both confirm GPS reliability as existential for the product.
- **J5 (Facebook noise)** scores 13 — CaniFed's event-attached communication model directly addresses this.
- **J6 (empty platform)** scores lower on Fit because it depends on club-level adoption, not product features.

---

## 🐕 Patrick le Randonneur — The Casual Member (TERTIARY)

| # | Force | Type | Freq | Int | Fit | Total | Priority |
|---|-------|------|------|-----|-----|-------|----------|
| K1 | Get notified, tap to see event | ✅ Want | 4 | 4 | 5 | 13 | MEDIUM |
| K2 | Find meeting point, zero friction | ✅ Want | 4 | 4 | 5 | 13 | MEDIUM |
| K3 | Feel included without effort | ✅ Want | 3 | 3 | 4 | 10 | LOW |
| K4 | Confusing interface makes him feel incompetent | ❌ Fear | 4 | 4 | 5 | 13 | MEDIUM |
| K5 | Missing events, unreliable notifications | ❌ Fear | 4 | 4 | 4 | 12 | MEDIUM |
| K6 | Forced to learn a complicated app | ❌ Fear | 2 | 4 | 5 | 11 | MEDIUM |

**Analysis:**
- Patrick's forces cluster in the 11-13 range — consistent MEDIUM priority. This makes sense: he's the simplicity litmus test, not the primary acquisition driver.
- **K1, K2, K4** all reinforce the same design principle: obvious-first UI, events front and center, GPS one tap away.
- **K4 (feeling incompetent)** is a design quality metric, not a feature. Every screen must pass "The Patrick Test."

---

## Priority Summary

### HIGH PRIORITY (14-15) — Must Build

| Force | Persona | Score | Design Implication |
|-------|---------|-------|--------------------|
| P3: GPS event creation | Admin | 15 | Flawless map + pin placement in event creation flow |
| P2: Unified dashboard | Admin | 14 | Members, dogs, documents in one admin view |
| J1: Event feed + join | Active | 14 | Clean event list with participants and one-tap join |
| J3: GPS navigation | Active | 14 | Event → map → Waze/Google Maps in one tap |
| J4: Fix broken maps | Active | 14 | GPS accuracy as non-negotiable technical requirement |

**Common thread:** Events + GPS are the absolute core. 4 of 5 HIGH priority forces relate to event creation, discovery, or GPS navigation. This is the product.

### MEDIUM PRIORITY (11-13) — Should Build

| Force | Persona | Score | Design Implication |
|-------|---------|-------|--------------------|
| P1: 10-min onboarding | Admin | 13 | Guided club creation, zero config |
| P5: Zero maintenance | Admin | 13 | Cloud-hosted, auto-update architecture |
| P6: Drive member adoption | Admin | 13 | Pull members via event notifications |
| J2: Carpool coordination | Active | 11 | Event-scoped chat/comments |
| J5: Replace Facebook noise | Active | 13 | Event-attached updates, push notifications |
| K1: Event notifications | Casual | 13 | Reliable push notifications |
| K2: Meeting point clarity | Casual | 13 | Map preview + navigation button |
| K4: Obvious-first UI | Casual | 13 | Patrick Test on every screen |
| K5: Reliable notifications | Casual | 12 | Push + email fallback |
| K6: Zero onboarding | Casual | 11 | Invite link → account → events. No tour. |
| P4: Safe migration | Admin | 11 | Parallel running, no data migration required |

**Common thread:** Notifications, onboarding simplicity, and admin peace of mind form the MEDIUM tier. These are "how we deliver well" rather than "what we build."

### LOW PRIORITY (8-10) — Defer

| Force | Persona | Score | Design Implication |
|-------|---------|-------|--------------------|
| J6: Empty platform fear | Active | 10 | Club-level problem, not feature problem |
| K3: Passive inclusion | Casual | 10 | Nice-to-have home feed, not MVP critical |

---

## Strategic Recommendations

### 1. Build the Event + GPS Core First
4 of 5 HIGH forces are about events and GPS. The MVP must nail: event creation with GPS (admin), event feed with join (member), GPS navigation handoff (all). Everything else can follow.

### 2. Notifications Are the Engagement Engine
Across all three personas, push notifications are the mechanism that pulls users back. Reliable notifications are infrastructure, not a feature — invest early.

### 3. Admin Onboarding Is a One-Shot Gate
P1 (10-min setup) only fires once but is maximum intensity. If it fails, nothing else matters. The guided club creation flow must be tested obsessively.

### 4. The Patrick Test Is a Design Quality Gate
K4 isn't a feature to build — it's a standard to uphold. Every screen, every flow must pass: "Can Patrick find Sunday's walk in 15 seconds?"

### 5. Don't Build Chat Before Events
J2 (carpool coordination) is MEDIUM, not HIGH. Event-scoped comments/threads can start simple. Full chat can wait until the event core is solid and adopted.

---

## Development Phase Alignment

**Phase 1 (MVP):** Event creation + GPS + member management + notifications + admin onboarding
**Phase 2:** Event-scoped chat/comments + document management + dog profiles
**Phase 3:** Federation plugins (FFSLC/CNEAC integration) + payment integration
**Phase 4:** Advanced features (analytics, custom branding, expanded storage)

---

## Related Documents

- **[trigger-map.md](trigger-map.md)** — Visual overview and navigation
- **[personas/perrine-admin.md](personas/perrine-admin.md)** — Primary persona: The Club Admin
- **[personas/julie-active.md](personas/julie-active.md)** — Secondary persona: The Active Member
- **[personas/patrick-casual.md](personas/patrick-casual.md)** — Tertiary persona: The Casual Member

---

_Back to [Trigger Map](trigger-map.md)_
