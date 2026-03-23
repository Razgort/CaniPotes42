# 02: Perrine's Admin Day

**Project:** CaniFed  
**Created:** 2026-03-22  
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**  
Perrine publishes next week’s training with a reliable GPS pin, then checks members, vaccine compliance, documents, and license setup in one admin pass—no spreadsheets, no side channels.

---

## Business Goal (Q2)

**Goal:** ⭐ Club Adoption (zero broken maps) + 🚀 Member Engagement (admin self-service)  
**Objective:** Events + GPS flawless from day one; admins operate without training; engagement follows trustworthy logistics.

---

## User & Situation (Q3)

**Persona:** Perrine l'Organisatrice (PRIMARY)  
**Situation:** Monday morning at home; she opens the app from the home screen to prepare the club’s weekly session and clear admin housekeeping before reminders go out.

---

## Driving Forces (Q4)

**Hope:** She wants to drop a pin and publish in under two minutes and see “who’s OK to run” in one glance.  

**Worry:** She fears a wrong map or buried vaccine info will cause chaos on site and erode trust in the platform.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile-first; may switch to desktop for long document review.  
**Entry:** Opens installed PWA / app from home screen with admin session already active.

---

## Best Outcome (Q7)

**User Success:** Event is live with correct time, place, and GPS; she has scanned member roster, vaccine flags, expiring docs, and license configuration without leaving CaniFed.  

**Business Success:** Zero broken-map incidents; admin proves self-service; members receive a trustworthy event they can open and navigate.

---

## Shortest Path (Q8)

1. **Event Creation/Edit** — Creates/edits session, places GPS pin, publishes.  
2. **Member Directory** — Scans roles and member status for the week.  
3. **Vaccine Dashboard (Admin)** — Reviews green/orange/red at club level.  
4. **Document Management (Admin)** — Checks expiries and missing uploads.  
5. **License Configuration (Admin)** — Confirms fee types and amounts for the season.  
6. **Payment History (Admin)** — Verifies who has paid and who is outstanding. ✓

---

## Trigger Map Connections

**Persona:** Perrine l'Organisatrice (PRIMARY)

**Driving Forces Addressed:**
- ✅ **Want:** Create events with GPS in two taps; see members, dogs, docs in one dashboard  
- ❌ **Fear:** Broken tools and operational failure mid-season  

**Business Goal:** ⭐ Adoption quality + 🚀 Engagement via reliable operations  

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|--------------|
| 02.1 | `02.1-event-creation-edit/` | Publish training with map pin | Save / publish event |
| 02.2 | `02.2-member-directory/` | Operational view of members | Navigate to compliance tools |
| 02.3 | `02.3-vaccine-dashboard-admin/` | Club-wide vaccine posture | Open document admin if needed |
| 02.4 | `02.4-document-management-admin/` | Expiry and coverage | Open license setup |
| 02.5 | `02.5-license-configuration-admin/` | Define licenses | Open payments view |
| 02.6 | `02.6-payment-history-admin/` | Reconcile payments | Done ✓ |

**First step** (02.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
