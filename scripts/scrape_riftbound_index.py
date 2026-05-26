"""
Scrape every page of piltoverarchive.com/cards and emit two indices:

  1. <out>            — name -> single ID (lowest-numbered printing, the
                         black-bordered original). Backward-compatible with
                         the existing riftbound source.

  2. <out>.variants   — name -> [all known printing IDs, sorted lowest-first].
                         Used by the deck editor UI so each slot's dropdown
                         can offer every alt-art / promo variant.

The listing-page React Server Components payload pairs each card's image URL
with its alt-text name:

  ..."src":"https://cdn.piltoverarchive.com/cards/OGN-039.webp",
     "alt":"Kai'Sa, Survivor",...

In the on-the-wire HTML those quotes are escaped (`\"`). Regex below
matches one ID + its alt name per occurrence and stops at the first
non-escaped backslash.
"""
import gzip, json, re, sys, time, urllib.request

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url, headers={'User-Agent': UA, 'Accept-Encoding': 'gzip'}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read()
        if resp.headers.get('Content-Encoding') == 'gzip':
            body = gzip.decompress(body)
        return body.decode('utf-8', errors='replace')


# Each card row in the listing payload has the literal text:
#   cards/SET-NUM.webp\",\"alt\":\"<name>\"
# We capture SET-NUM and the alt-text up to the next escaped quote. The
# `[^"\\]+` class stops at backslash so we never run past the closing `\"`.
PATTERN = re.compile(
    r'cards/([A-Z]+-\d+[a-z]?)\.webp\\",\\"alt\\":\\"([^"\\]+)\\"'
)


def main():
    out_path = sys.argv[1]
    total_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 21

    # name -> {id: occurrence_count}
    pairs: dict[str, dict[str, int]] = {}

    for page in range(1, total_pages + 1):
        url = f'https://piltoverarchive.com/cards?page={page}'
        try:
            html = fetch(url)
        except Exception as e:
            print(f'  page {page}: ERROR {e}')
            continue

        unique = set(PATTERN.findall(html))
        for cid, name in unique:
            if 1 < len(name) < 80:
                pairs.setdefault(name, {})[cid] = pairs.get(name, {}).get(cid, 0) + 1
        print(f'  page {page:2}: {len(unique)} unique pairs; running names: {len(pairs)}')
        time.sleep(0.4)

    # For each name, prefer the LOWEST set+number printing (the original).
    # This avoids the showcase/alt-art reprints when a name has multiple IDs.
    def sort_key(cid: str) -> tuple[str, int, str]:
        m = re.match(r'^([A-Z]+)-(\d+)([a-z]?)$', cid)
        if not m:
            return (cid, 0, '')
        return (m.group(1), int(m.group(2)), m.group(3))

    primary_index = {}
    variants_index = {}
    multi_variant_count = 0
    for name, ids in pairs.items():
        sorted_ids = sorted(ids.keys(), key=sort_key)
        primary_index[name] = sorted_ids[0]
        variants_index[name] = sorted_ids
        if len(sorted_ids) > 1:
            multi_variant_count += 1

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(primary_index, f, indent=2, sort_keys=True)
    print(f'\nWrote {len(primary_index)} primary entries to {out_path}')

    variants_path = out_path.replace('.json', '-variants.json')
    if variants_path == out_path:
        variants_path = out_path + '.variants'
    with open(variants_path, 'w', encoding='utf-8') as f:
        json.dump(variants_index, f, indent=2, sort_keys=True)
    print(f'Wrote {len(variants_index)} variant lists to {variants_path}')
    print(f'  {multi_variant_count} names have >1 variant')


if __name__ == '__main__':
    main()
