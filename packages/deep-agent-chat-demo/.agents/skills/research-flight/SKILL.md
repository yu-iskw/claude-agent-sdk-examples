---
name: research-flight
description: Generate structured flight options from origin/destination for trip-planning (best-effort live WebFetch + heuristic fallback).
---

# Research Flight

Use this skill when a trip-planning agent needs flight options between an `origin` and a `destination`.

## When to use

1. The user requests a complete trip plan and flight options are required.
2. The `flight-researcher` agent asks for flight options using origin/destination constraints.

## Inputs (provided implicitly in the task)

- `origin`: city/airport/region to depart from
- `destination`: city/airport/region to arrive at
- (optional) `date_range`
- (optional) `budget`
- (optional) `preferences` (example: nonstop only, avoid red-eyes, prefer shortest travel time)

If any input is missing, make reasonable assumptions and list them explicitly.

## Output Contract (required)

Return only this structure (do not add extra prose outside the block):

```text
flight_options:
  origin: <string>
  destination: <string>
  assumptions:
    - <string>
  options:
    - id: <F1|F2|...>
      airline: <string>
      depart_local: <ISO-8601-ish string or 'TBD'>
      arrive_local: <ISO-8601-ish string or 'TBD'>
      stops: <'nonstop'|'1_stop'|'2_plus_stops'|'TBD'>
      estimated_price_usd: <number or 'TBD'>
      highlights: <short string>
      tradeoffs: <short string>
  confidence: <'low'|'medium'|'high'>
```

## Live lookup workflow (best-effort)

1. Use `WebFetch` only on hosts allowed by the project sandbox (e.g. meta-search sites such as `kayak.com`, `skyscanner.net`, `expedia.com`, or official airline sites on the allowlist such as `aa.com`, `delta.com`).
2. Prefer 1–2 fetches with clear search URLs or result pages; extract approximate times, stops, carriers, and price **ranges** from the returned text or markup. Treat all numbers as **non-binding estimates**, not guaranteed quotes.
3. If the page is empty, blocked, mostly JavaScript, or parsing fails: set `confidence: 'low'`, use `TBD` for unknown fields, and record what failed under `assumptions` (e.g. "WebFetch to kayak.com returned no parseable itinerary rows").
4. If no fetch is attempted or all fetches fail: still return **at least two** diverse synthetic options (cheapest vs fastest vs fewest stops) with `confidence: 'low'` and explicit assumptions—same as heuristic fallback below.

## Heuristic fallback

- Use diverse tradeoffs across options (cheapest vs fastest vs fewest stops).
- Use `TBD` when you cannot infer an exact time or price.
- Estimated prices should be plausible ranges, not precise quotes.
