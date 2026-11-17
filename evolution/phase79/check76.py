#!/usr/bin/env python3
"""Phase 7.6: Wikidata consistency lookup, source text drift log.
Neither a proof of truth nor independent validation. Only Python stdlib.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = HERE.parent / 'phase70' / 'knowledge.json'
REPORT = HERE / 'review76.json'
API = 'https://www.wikidata.org/w/api.php'
HEADERS = {'User-Agent': 'MeinLernBot/7.6 (educational research, source attribution in public GitHub repository)', 'Accept': 'application/json'}
LIMIT = 5

def read(path, fallback):
    try:
        with path.open(encoding='utf-8') as f:
            x = json.load(f)
        return x if isinstance(x, dict) else fallback
    except (FileNotFoundError, ValueError, OSError):
        return fallback

def canonical(s):
    return re.sub(r'\s+', ' ', str(s or '')).strip()[:150]

def sha(s):
    return hashlib.sha256(canonical(s).encode('utf-8')).hexdigest()[:20]

def wiki_query(params):
    url = API + '?' + urllib.parse.urlencode({'action': 'wbgetentities', 'format': 'json', **params})
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read(300000).decode('utf-8'))

def labels_of(ids):
    if not ids:
        return {}
    output = {}
    for p in range(0, min(len(ids), 25), 25):
        response = wiki_query({'ids': '|'.join(ids[p:p+25]), 'props': 'labels', 'languages': 'de|en'})
        for qid, record in response.get('entities', {}).items():
            labels = record.get('labels', {})
            v = labels.get('de', labels.get('en', {})).get('value', '')
            if v:
                output[qid] = canonical(v)
    return output

def lookup(title):
    """Retrieve only direct instance-of classes (P31); no fake semantic entailment."""
    title = canonical(title)
    if not title:
        return {'status': 'invalid_title', 'classes': [], 'wikidata_id': None, 'wikidata_url': ''}
    try:
        response = wiki_query({'sites': 'dewiki', 'titles': title, 'props': 'claims|labels', 'languages': 'de|en'})
        entities = [v for k, v in response.get('entities', {}).items() if isinstance(v, dict) and not v.get('missing') and re.fullmatch(r'Q\d+', k)]
        if len(entities) != 1:
            return {'status': 'not_found', 'classes': [], 'wikidata_id': None, 'wikidata_url': ''}
        record = entities[0]
        qid = record['id']
        claims = record.get('claims', {}).get('P31', [])[:12]
        ids = []
        for claim in claims:
            value = claim.get('mainsnak', {}).get('datavalue', {}).get('value', {})
            if isinstance(value, dict) and re.fullmatch(r'Q\d+', str(value.get('id', ''))):
                ids.append(value['id'])
        mapped = labels_of(list(dict.fromkeys(ids)))
        return {'status': 'ok', 'classes': list(dict.fromkeys(mapped.values())), 'wikidata_id': qid, 'wikidata_url': 'https://www.wikidata.org/wiki/'+qid}
    except Exception as exc:
        return {'status': 'error', 'classes': [], 'wikidata_id': None, 'wikidata_url': '', 'error': type(exc).__name__}

def update(db, old, fetcher=lookup, stamp=None, limit=LIMIT):
    stamp = stamp or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    entries = [x for x in db.get('entries', []) if isinstance(x, dict) and x.get('title') and isinstance(x.get('excerpt'), str)]
    entries = entries[-150:]
    result = {'schema': 76, 'entities': list(old.get('entities', []))[-150:], 'changes': list(old.get('changes', []))[-100:], 'runs': list(old.get('runs', []))[-29:], 'snapshots': dict(old.get('snapshots', {})), 'cursor': int(old.get('cursor', 0))}
    snapshots = result['snapshots']
    source_changed = set()
    existing = {canonical(x.get('title')): x for x in result['entities'] if isinstance(x, dict)}
    for e in entries:
        title = canonical(e['title'])
        digest = sha(e['excerpt'])
        previous = snapshots.get(title)
        if previous and previous != digest:
            result['changes'].append({'at': stamp, 'title': title, 'type': 'quelltext_geaendert', 'note': 'Auszug änderte sich; alte Extraktion muss neu geprüft werden.'})
            source_changed.add(title)
        snapshots[title] = digest
    current = {canonical(x['title']) for x in entries}
    for title in list(snapshots):
        if title not in current:
            result['changes'].append({'at':stamp, 'title':title, 'type':'quelle_entfallen', 'note':'Nicht mehr im aktuellen Archiv; keine Widerlegung der Aussage.'})
            snapshots.pop(title, None)
            existing.pop(title, None)
    if entries:
        start = result['cursor'] % len(entries)
        batch = [entries[(start + i) % len(entries)] for i in range(min(limit, len(entries)))]
        for e in batch:
            title = canonical(e['title'])
            info = fetcher(title)
            existing[title] = {'title':title, **info, 'checked_at':stamp, 'source_changed':title in source_changed}
        result['cursor'] = (start + len(batch)) % len(entries)
    result['entities'] = list(existing.values())[-150:]
    result['changes'] = result['changes'][-100:]
    result['runs'].append({'at':stamp,'checked': min(limit,len(entries)), 'known_sources':len(entries), 'source_changes':len(source_changed), 'error_count':sum(e.get('status')=='error' for e in result['entities'])})
    return result

def main():
    db = read(SOURCE, {'entries': []})
    old = read(REPORT, {})
    result = update(db, old)
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)+'\n', encoding='utf-8')
    print(f"Phase 7.6: {len(result['entities'])} class lookups stored, {len(result['changes'])} source changes, independent confirmations: 0")

if __name__ == '__main__':
    main()
