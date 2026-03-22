# 03: Julie's Race Weekend

**Project:** CaniFed  
**Created:** 2026-03-22  
**Method:** Whiteport Design Studio (WDS)

---

## Transaction (Q1)

**What this scenario covers:**  
Julie locks in her weekend plan: finds the right event, confirms participation, coordinates with others in chat, and opens GPS to the meeting point—without Facebook noise or broken links.

---

## Business Goal (Q2)

**Goal:** 🚀 Member Engagement  
**Objective:** 80%+ WAU post-switch; in-app coordination replaces Facebook/WhatsApp for club logistics.

---

## User & Situation (Q3)

**Persona:** Julie la Compétitrice (SECONDARY)  
**Situation:** Monday evening after work; on her phone she checks the club feed to plan transport and start times for Saturday’s race.

---

## Driving Forces (Q4)

**Hope:** She wants one tap from “event list” to “I’m in” to “directions to the pin.”  

**Worry:** She fears a broken map or missing thread will make her late or stranded at the wrong entrance.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile  
**Entry:** Opens CaniFed from the home screen; if cold start, signs in quickly and lands on her default club feed.

---

## Best Outcome (Q7)

**User Success:** RSVP set, carpool chat updated, navigation started to the official meeting pin with confidence.  

**Business Success:** Demonstrates daily active use and in-app coordination replacing scattered channels; zero “map didn’t work” reports for that event.

---

## Shortest Path (Q8)

1. **Login** — Authenticates (if needed) and reaches club context.  
2. **Club Home / Event Feed** — Spots the weekend event and opens it.  
3. **Event Detail** — Reads time, constraints, pin, and participant context.  
4. **Event Participation** — Sets status to “going.”  
5. **Chat Channel List** — Opens the logistics / carpool channel.  
6. **Chat Conversation** — Sends/reads last messages, then launches GPS from the event when leaving home. ✓

---

## Trigger Map Connections

**Persona:** Julie la Compétitrice (SECONDARY)

**Driving Forces Addressed:**
- ✅ **Want:** See events, who’s going, join instantly; tap GPS to navigate  
- ❌ **Fear:** Broken maps; buried info in Facebook noise  

**Business Goal:** 🚀 Member Engagement — WAU + coordination inside the product  

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|--------------|
| 03.1 | `03.1-login/` | Enter authenticated session | Success → club feed |
| 03.2 | `03.2-club-home-event-feed/` | Discover upcoming events | Open event |
| 03.3 | `03.3-event-detail/` | Full event + map context | Open participation |
| 03.4 | `03.4-event-participation/` | RSVP | Open chat list |
| 03.5 | `03.5-chat-channel-list/` | Pick channel | Open thread |
| 03.6 | `03.6-chat-conversation/` | Coordinate + hand off to GPS | External maps ✓ |

**First step** (03.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
