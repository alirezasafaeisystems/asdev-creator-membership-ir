# 10 Search and Filtering

## Public Discovery APIs
- `GET /api/v1/creators?q=&limit=`
- `GET /api/v1/creators/:slug`
- `GET /api/v1/creators/:slug/plans`

## Query Rules
- case-insensitive matching for `slug` and `display_name`
- bounded page size (`limit`) to protect runtime
- deterministic ordering by recency

## UX Surfaces
- `/creators` for searchable list
- `/creators/[slug]` for creator profile and plans
