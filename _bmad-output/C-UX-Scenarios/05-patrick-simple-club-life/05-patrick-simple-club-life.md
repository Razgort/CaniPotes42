# 05: Patrick's Simple Club Life

**Project:** CaniFed  
**Created:** 2026-03-22  
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**  
Patrick switches to the right club, pays his license without thinking, and adjusts his account—proving the “Patrick Test” for low-friction casual use.

---

## Business Goal (Q2)

**Goal:** 🚀 Member Engagement + 🌟 Club Autonomy  
**Objective:** Casual members stay weekly-active; payments flow; users feel in control without vendor lock-in anxiety.

---

## User & Situation (Q3)

**Persona:** Patrick le Randonneur (TERTIARY)  
**Situation:** Sunday morning after a push notification; one-handed on his phone in the kitchen before heading out to the walk.

---

## Driving Forces (Q4)

**Hope:** He wants to see where and when in one tap and pay what he owes without forms.  

**Worry:** He fears confusing menus or being “trapped” in an app he does not understand.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile  
**Entry:** Taps push notification: “Sunday walk — reminder”; lands in app scoped to the notifying club or last active club.

---

## Best Outcome (Q7)

**User Success:** Correct club context, event location visible in under ~15 seconds, license paid, privacy/export comfort from settings if needed.  

**Business Success:** Retained casual cohort; recorded payment; demonstrates autonomy-friendly UX (simple exit paths, clear account control).

---

## Shortest Path (Q8)

1. **Club Switcher** — Confirms he is in the club that sent the walk (switches if needed).  
2. **License Payment** — Completes Stripe Checkout for annual license.  
3. **User Settings** — Optionally checks data export / deletion reassurance. ✓

---

## Trigger Map Connections

**Persona:** Patrick le Randonneur (TERTIARY)

**Driving Forces Addressed:**
- ✅ **Want:** Notification → see where; minimal cognitive load  
- ❌ **Fear:** Complicated UI; feeling incompetent with tech  

**Business Goal:** 🚀 Engagement at the long tail + 🌟 trust via autonomy  

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|--------------|
| 05.1 | `05.1-club-switcher/` | Correct club context | Open payment or event |
| 05.2 | `05.2-license-payment/` | Pay fee | Return to app success |
| 05.3 | `05.3-user-settings/` | Account trust | Done ✓ |

**First step** (05.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
