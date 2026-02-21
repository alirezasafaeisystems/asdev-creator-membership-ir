# 03 Search and Filter UX

## Search Entry
- single query box on `/creators`
- supports search by creator slug or display name

## Result Contract
- deterministic list with bounded result size
- empty state message for no matches

## Performance
- server-side fetch with no-store for freshness
- avoid expensive client-side filtering on large result sets
