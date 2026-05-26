# Maintenance scripts

## `scrape_riftbound_index.py`

Rebuilds `src/domain/processing/tcg/sources/riftbound-index.json` by
scraping every page of `piltoverarchive.com/cards`. The page's React
Server Components payload pairs each card image URL with its alt-text
name; we extract those pairs and de-dup.

Run after a new Riftbound set drops:

```
python scripts/scrape_riftbound_index.py \
  src/domain/processing/tcg/sources/riftbound-index.json
```

By default scrapes 21 pages. Pass a higher page count when more sets
release. Takes ~10s, ~50 KB of CDN traffic.

When a name maps to multiple printings (alt art, showcase, foil), the
script picks the lowest set+number ID — i.e. the original printing. Add
explicit overrides to the JSON if you want a specific reprint.
