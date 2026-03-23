# Patrick le Randonneur — The Casual Member

> Tertiary persona: The simplicity litmus test — if Patrick can use it, the design is right

**Document:** Trigger Map - Tertiary Persona
**Created:** 2026-03-22
**Status:** COMPLETE
**Priority:** 🌟 TERTIARY TARGET

---

## Who Patrick Is

Patrick is 55, a casual canirando participant who walks with his labrador once a week with the club. He works in a trade, isn't particularly tech-savvy, and uses his smartphone mainly for calls, texts, and Facebook. He joined the club for the social aspect — meeting other dog owners, discovering new trails, getting fresh air. Competition doesn't interest him. He's loyal to his club but engagement is low-frequency: one walk per week, maybe a club barbecue.

---

## Psychological Profile

Patrick values **simplicity and routine** above everything. His weekly walk is a fixture — same time, same group, predictable and pleasant. He doesn't want to think about technology when he's about to walk his dog. He wants to know: when is the walk, where do I go, who's coming. That's it.

He has a **narrow comfort zone** with technology. He can use Facebook (he's been on it for years), text messages, and Google Maps. Anything beyond that requires effort he's unwilling to invest. He won't read help pages, watch tutorials, or figure out non-obvious interfaces. If the first screen confuses him, he'll ask his wife or his daughter for help — or just give up.

Patrick represents a large and underserved segment: **the non-digital club member**. In many clubs, 30-40% of members have Patrick's profile. They're loyal, they show up, they participate — but they're invisible in digital tools because the tools are too complex for them. Designing for Patrick means designing for inclusion.

He's not resistant to technology — he's **indifferent** to it. The tool is a means to an end (knowing when and where the walk is), not an end in itself. If the tool disappears tomorrow, he'd just call someone to ask.

---

## Internal State

When Patrick encounters a new app, he feels **mild anxiety mixed with resignation**. He knows technology is moving forward and he can't avoid it forever, but every new interface makes him feel a little less competent. He's proud of his practical skills — he builds things with his hands, he knows every trail in the region — but screens make him feel clumsy.

When an app works intuitively on the first try, he feels **quiet relief and satisfaction**. He'll never say "great UX design" but he'll think "ah, that was easy." That moment of relief is what we're designing for. When he can find Sunday's walk and the meeting point in under 15 seconds without asking anyone, we've succeeded.

---

## Usage Context

**Access/Discovery:** Patrick is told about CaniFed by the club admin or another member at a training session. Someone helps him install it or he gets a link on WhatsApp. He opens it because he was told to, not because he sought it out.

**Emotional State:** Mildly reluctant, slightly nervous, hoping it's not complicated. His threshold for frustration is very low — two confusing screens and he's out.

**Behavior Pattern:** Patrick opens the app once a week, usually Thursday or Friday, to check if Sunday's walk is happening and where. He looks for: (1) the next event, (2) the location, (3) how to get there. He doesn't browse, explore features, or read descriptions. He scans for the one thing he needs and closes the app.

**Decision Criteria:** (1) Can I find Sunday's walk immediately? (2) Is the meeting point obvious? (3) Can I tap to get directions? If all three are yes within 15 seconds, the app works for him.

**Success Outcome:** Patrick gets a notification on Friday: "Rando dimanche 9h - Foret de Bouconne." He taps, sees the map with a pin, taps "Y aller avec Google Maps." On Sunday morning, he follows the directions to the exact parking spot. He never thinks about the app again until next week. Perfect.

---

## Driving Forces

### Wants (Positive Drivers)

**✅ Get notified about Sunday's walk and tap to see where**
- WHAT: Push notification with event name, time, and one-tap access to details
- WHY: He forgets the schedule and currently relies on someone texting him or a Facebook post he might miss
- WHEN: Thursday-Friday, when he's planning his weekend
- **CaniFed Promise:** Automatic push notification for upcoming events he's interested in. Tap the notification → event details → map → directions. Three taps from lock screen to navigation.

**✅ Find the meeting point with zero friction**
- WHAT: Clear map with a pin that opens in Google Maps or Waze
- WHY: Meeting points are often in forests, parking lots, or rural areas without clear addresses
- WHEN: Sunday morning, in the car, possibly running late
- **CaniFed Promise:** Map preview on the event card, big "Y aller" button, immediate handoff to his preferred navigation app. No GPS coordinates to copy-paste, no addresses to type.

**✅ Feel included in club life without effort**
- WHAT: Passive awareness of what's happening in the club — upcoming events, group photos, announcements
- WHY: He values belonging to the group even though he participates minimally; the club is part of his identity
- WHEN: Whenever he opens the app (weekly) or receives a notification
- **CaniFed Promise:** A simple home feed showing upcoming events and recent club activity. No pressure to interact, comment, or post. Being a spectator is valid.

### Fears (Negative Drivers)

**❌ A confusing interface makes him feel incompetent**
- WHAT: Screens with too many options, unclear navigation, jargon he doesn't understand
- WHY: He already feels behind with technology; every confusing interface reinforces his insecurity
- WHEN: First time opening the app and every time he encounters a new screen
- **CaniFed Answer:** Obvious-first design. The home screen shows the next event, big and clear. No hamburger menus hiding critical info. No feature discovery required. Patrick's workflow (see event → see location → get directions) is the primary UI path.

**❌ Missing events because notifications are unreliable**
- WHAT: He relies on notifications but they don't arrive, arrive late, or get lost in notification overload
- WHY: If the notification doesn't come, he forgets. He won't proactively open the app to check.
- WHEN: Thursday-Friday, the planning window before weekend events
- **CaniFed Answer:** Reliable push notifications for events in his club, sent at a predictable time (e.g., 2 days before). Fallback: email digest if push fails. The notification is his primary and often only touchpoint.

**❌ Being forced to learn yet another complicated app**
- WHAT: Required training, tutorials, or multi-step onboarding before he can see anything useful
- WHY: He's been forced to create accounts on platforms he never uses; each one feels like a waste of time
- WHEN: First time opening the app — the onboarding moment
- **CaniFed Answer:** Zero onboarding screens. He clicks the invite link, creates an account (name + email), and immediately sees his club's events. No tour, no tips, no setup. He's in.

---

## Relationship to Business Goals

- ⭐ **Club Adoption (THE ENGINE):** Patrick is the adoption test. If the club admin can get Patrick using CaniFed, the platform passes the simplicity test. Patrick's adoption = full club adoption.
- 🚀 **Member Engagement:** Patrick defines the floor for WAU. If he opens the app once a week to check Sunday's walk, the 80%+ WAU target is achievable across the member base.
- 🌟 **Club Autonomy:** Patrick benefits from not needing Facebook for club info. One place, one notification, one tap. His club life is simpler.

---

## Design Principle: The Patrick Test

> If Patrick — 55, trades worker, uses his phone for calls and Facebook — can find Sunday's walk and navigate to the meeting point in under 15 seconds without help, the design is right.

Apply this test to every screen, every flow, every feature. Patrick doesn't forgive complexity.

---

## Related Documents

- **[../trigger-map.md](../trigger-map.md)** — Visual overview and navigation
- **[perrine-admin.md](perrine-admin.md)** — Primary persona: The Club Admin
- **[julie-active.md](julie-active.md)** — Secondary persona: The Active Member
- **[../feature-impact-analysis.md](../feature-impact-analysis.md)** — Driving forces prioritization

---

_Back to [Trigger Map](../trigger-map.md)_
