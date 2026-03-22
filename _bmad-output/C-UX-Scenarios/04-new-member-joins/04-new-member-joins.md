# 04: Camille's Club Onboarding

**Project:** CaniFed  
**Created:** 2026-03-22  
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**  
Camille accepts her invitation, completes her member profile, registers her dog, records vaccines, and uploads proof so she is compliant before her first session.

---

## Business Goal (Q2)

**Goal:** ⭐ Club Adoption (member completion)  
**Objective:** Each invited member finishes onboarding so the admin’s decision is validated and the club runs on real data, not placeholders.

---

## User & Situation (Q3)

**Persona:** Camille — new invited member (onboarding archetype; secondary to Perrine’s adoption story)  
**Situation:** At home after work; she taps the invite link from email on her phone while her dog is at her feet—she wants to “be official” before Saturday.

---

## Driving Forces (Q4)

**Hope:** She wants a clear checklist: account, dog, vaccines, documents—done.  

**Worry:** She fears uploading the wrong file or missing a step and being turned away at training.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile  
**Entry:** Taps personalized invitation link in email; lands on accept-invite flow tied to her club.

---

## Best Outcome (Q7)

**User Success:** Active membership, complete dog profile, vaccine record entered, certificate uploaded, and visible under “my documents.”  

**Business Success:** Admin sees compliant member; reduces chase messages; strengthens network effects inside the tenant.

---

## Shortest Path (Q8)

1. **Email Invitation Accept** — Validates token, creates password if new user, joins club.  
2. **Member Profile** — Adds contact and club-visible profile details.  
3. **Dog Profile** — Creates dog with breed, identifiers, photo.  
4. **Vaccine Record** — Enters vaccine dates/types required by the club.  
5. **Document Upload** — Attaches PDF/photo proof to dog or self as required.  
6. **My Documents (Member)** — Confirms files are stored and accessible. ✓

---

## Trigger Map Connections

**Persona:** Invited member (implements admin fear/want bridge)

**Driving Forces Addressed:**
- ✅ **Want:** Clear path to “ready to participate”  
- ❌ **Fear (admin-side):** Members won’t adopt; **(member-side):** Missing compliance  

**Business Goal:** ⭐ Club Adoption — completing the funnel from invite to active participant  

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|--------------|
| 04.1 | `04.1-email-invitation-accept/` | Join tenant | Continue to profile |
| 04.2 | `04.2-member-profile/` | Identity in club | Save profile |
| 04.3 | `04.3-dog-profile/` | Register dog | Save dog |
| 04.4 | `04.4-vaccine-record/` | Compliance data | Save vaccines |
| 04.5 | `04.5-document-upload/` | Proof upload | Submit files |
| 04.6 | `04.6-my-documents-member/` | Confirm vault | Done ✓ |

**First step** (04.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
