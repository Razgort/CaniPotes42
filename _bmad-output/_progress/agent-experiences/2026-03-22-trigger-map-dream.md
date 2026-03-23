# Design Log: Trigger Map (Dream Mode)

**Date:** 2026-03-22
**Mode:** Dream (autonomous generation with final review)
**Agent:** Saga the Analyst

---

## Layer 1: WDS Form Learned

- Trigger Map structure: Business Goals -> Product/Solution -> Target Groups -> Driving Forces
- Business Goals: 3x3 format (3 visionary goals, 3 SMART objectives each)
- Personas: psychological depth, not demographics — include Who/Psychology/Internal State/Usage Context/Goals
- Driving Forces: positive (wants) + negative (fears), WHAT + WHY + WHEN pattern
- Prioritization: Frequency x Intensity x Fit scoring (1-5 each, max 15)
- Mermaid diagram: LR flowchart, light gray palette, Inter font, 3 drivers per persona
- Quality: 6 driving forces per persona (3 wants + 3 fears), each with Product Promise/Answer

## Layer 2: Project Context (Initial)

- **Product:** CaniFed — free, multi-tenant club management platform for French canine sports clubs
- **Market:** FFSLC (canicross, ~6000 members, ~200 clubs) + CNEAC (agility, paper-based) + independent clubs
- **Key personas from brief:** Julie (competitor), Patrick (casual walker), Perrine (event organizer admin), Marie (CNEAC club admin)
- **Core concept:** Club as digital space, club_id scopes everything
- **Positioning:** Federation-agnostic, free, beautiful UX vs broken CaniClub Connect or total void for CNEAC
- **Constraints:** Solo dev, zero budget, Nx monorepo, PWA, mobile-first
- **Tone:** Friendly, clear, encouraging, confident (tu not vous)

## Layer 2: Project Context (Cumulative)

### Business Goals (added after Step 1)
- Primary: Platform adoption (clubs onboarded)
- Secondary: Member engagement & retention
- Tertiary: Club autonomy & community empowerment

### Target Groups (added after Step 2)
- TG0: Club Administrator (Perrine/Marie composite) — PRIMARY
- TG1: Active Member (Julie) — SECONDARY
- TG2: Casual Member (Patrick) — TERTIARY

### Driving Forces (added after Step 3)
- See trigger-map.md for full details

### Prioritization (added after Step 4)
- See feature-impact-analysis.md for full scoring

## Layer 3: Domain Research

### Key Findings
- 71% of French associations report digital difficulties (Solidatech 2025)
- 84% of sports associations not digitally experienced
- Adoption driven by personal pain relief, not organizational strategy
- Zero-training, instant-value tools win; anything requiring config fails
- Facebook Groups = dominant communication channel, but no structure
- No tool combines canine-specific workflows + club management + federation integration
- Club admins are passionate volunteers with extremely low friction tolerance
- Member engagement is event-centric, mobile-first, cyclically seasonal
- Peer recommendation is the primary adoption channel between clubs
- Migration anxiety is real: clubs won't switch mid-season

## Layer 5: Self-Review Summary

### Business Goals: 9/10
- Clear 3x3 structure, measurable objectives, hierarchical priorities
- Goals are aspirational, metrics support but don't replace them

### Target Groups: 9/10
- 3 personas with psychological depth, connected to business goals
- Clear priority ordering, distinct profiles, not just demographics

### Driving Forces: 9/10
- WHAT + WHY + WHEN pattern followed
- Both positive and negative forces, specific and actionable
- Each has CaniFed Promise/Answer

### Prioritization: 8/10
- Frequency x Intensity x Fit scoring applied
- Clear HIGH/MEDIUM/LOW tiers with strategic rationale

### Overall: 9/10 — Proceeding to final assembly
