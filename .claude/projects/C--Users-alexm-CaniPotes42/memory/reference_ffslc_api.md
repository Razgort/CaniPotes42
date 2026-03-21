---
name: FFSLC Canicompet API Endpoints
description: Reverse-engineered REST API endpoints for courses.ffslc.fr (Canicompet) — base URL, public/private endpoints, auth flow, response structure
type: reference
---

**Base URL:** `https://servercourses.ffslc.fr`

## Public Endpoints (no auth)

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/fr/events/ws_public/GetEventsList/` | GET | Full event calendar JSON (all FFSLC races/events) |
| `/fr/clubs/ws_public/GetClubsList/` | GET | Full list of all FFSLC clubs |

**GetEventsList response fields per event:**
- `id`, `name`, `date_time_start`, `date_time_end`
- `club_name`, `location` (lat/lng)
- `testTypes` (race disciplines), `type` (race/formation/interclub)
- `is_chien_dor`, `poster` (image URL), `data_type` ("event")
- Also returns: `all_fedes` (list of federations), department/region filters
- Cache-buster param: `?v={timestamp}`

## Auth Endpoints

| Endpoint | Method | Auth | Returns |
|----------|--------|------|---------|
| `/fr/accounts/ws_public/Login/` | POST | None (body: email+password) | `{key: "token"}` |
| `/fr/accounts/ws_private/User/` | GET | `Authorization: Token {key}` | User profile |

## API Convention
- `ws_public` = no auth required
- `ws_private` = requires `Authorization: Token {key}` header

## Integration Notes
- API is undocumented — discovered via Chrome DevTools Network tab
- Build abstraction layer to isolate from breaking changes
- Cache events in PostgreSQL (cron every 6h)
- `?iframe=true` param available on Canicompet calendar pages as fallback
- For user-level features (inscriptions, licenses): proxy auth through NestJS, encrypt credentials at rest
