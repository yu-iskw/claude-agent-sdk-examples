---
name: research-hotel
description: Generate structured hotel options from destination and stay preferences for trip-planning (best-effort live WebFetch + heuristic fallback).
---

# Research Hotel

Use this skill when a trip-planning agent needs hotel options for a given `destination`.

## When to use

1. The user requests a complete trip plan and lodging options are required.
2. The `hotel-researcher` agent asks for hotel options using destination and constraints.

## Inputs (provided implicitly in the task)

- `destination`: city/region to stay in
- (optional) `date_range` (or number of nights)
- (optional) `party_size`
- (optional) `budget_per_night`
- (optional) `neighborhood_preferences`
- (optional) `amenities` (example: gym, breakfast, kitchenette, pool)

If any input is missing, make reasonable assumptions and list them explicitly.

## Output Contract (required)

Return only this structure (do not add extra prose outside the block):

```text
hotel_options:
  destination: <string>
  assumptions:
    - <string>
  options:
    - id: <H1|H2|...>
      property_name: <string>
      area: <string>
      estimated_nightly_rate_usd: <number or 'TBD'>
      estimated_total_price_usd: <number or 'TBD'>
      room_type: <string or 'TBD'>
      amenities: <short string>
      distance_notes: <short string (e.g., 'walkable to transit')>
      tradeoffs: <short string>
  confidence: <'low'|'medium'|'high'>
```

## Live lookup workflow (best-effort)

1. Use `WebFetch` only on hosts allowed by the project sandbox (e.g. `booking.com`, `hotels.com`, `expedia.com`, `tripadvisor.com`, or official brand sites such as `marriott.com`, `hilton.com` on the allowlist).
2. Prefer 1–2 fetches; extract approximate nightly or total prices, neighborhood hints, and amenities from the returned content. Treat all rates as **non-binding estimates**.
3. Optionally use `openstreetmap.org` / `nominatim.openstreetmap.org` (if allowed) only to clarify neighborhood or distance notes—do not invent precise walking times without basis.
4. If fetch/parse fails: set `confidence: 'low'`, use `TBD` for unknown fields, and document the failure under `assumptions`.
5. If no usable live data: return **at least two** diverse options (value vs central vs higher quality) with `confidence: 'low'` and explicit assumptions—same as heuristic fallback below.

## Heuristic fallback

- Include diversity across budget/quality (value vs central vs higher quality).
- Use `TBD` when you cannot infer a nightly rate or total.
- Estimated prices should be plausible ranges, not precise quotes.
