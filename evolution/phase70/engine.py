#!/usr/bin/env python3
"""LernBot Phase 7.0: quellgebundenes automatisches Sammeln, KEIN Sprachmodell.
Nur Python-Standardbibliothek; auf GitHub Actions ausführbar.
"""
from __future__ import annotations
import datetime as dt
import json
import os
import pathlib
import re
import time
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
DB_PATH = HERE / 'knowledge.json'
TOPICS_PATH = HERE / 'topics.json'
MAX_PER_RUN = 5
MAX_ENTRIES = 150
MAX_QUEUE = 90
API = 'https://de.wikipedia.org/w/api.php'
USER_AGENT = 'MeinLernBotResearch/7.0 (educational prototype; source attribution via GitHub repository)'


def load_json(path, fallback):
    if not path.exists():
        return fallback
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    text = json.dumps(data, ensure_ascii=False, sort_keys=True, indent=2) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == text:
        return False
    path.write_text(text, encoding='utf-8')
    return True


def clean_title(title):
    text = re.sub(r'\s+', ' ', str(title)).strip()[:110]
    if not text or re.search(r'[\x00-\x1f<>\[\]{}|#]', text):
        return ''
    if ':' in text or text.startswith(('Liste ', 'Portal ', 'Kategorie ')):
        return ''
    return text


def fetch_article(title, timeout=18):
    params = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'formatversion': '2',
        'prop': 'extracts|links|pageprops', 'exintro': '1', 'explaintext': '1',
        'exchars': '1250', 'pllimit': '30', 'redirects': '1', 'titles': title
    })
    req = urllib.request.Request(API + '?' + params, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        if res.status != 200:
            raise ValueError(f'HTTP {res.status}')
        payload = json.loads(res.read(350000).decode('utf-8'))
    pages = payload.get('query', {}).get('pages', [])
    if len(pages) != 1:
        raise ValueError('Mehrdeutige API-Antwort')
    page = pages[0]
    if page.get('missing') or page.get('pageprops', {}).get('disambiguation') is not None:
        return None
    extract = re.sub(r'\s+', ' ', page.get('extract', '')).strip()
    if len(extract) < 100:
        return None
    canonical = clean_title(page.get('title', title))
    if not canonical:
        return None
    links = [clean_title(x.get('title', '')) for x in page.get('links', []) if x.get('ns') == 0]
    return {'title': canonical, 'excerpt': extract[:850], 'links': [x for x in links if x],
            'url': 'https://de.wikipedia.org/wiki/' + urllib.parse.quote(canonical.replace(' ', '_'))}


def choose_topics(db, topics, amount=MAX_PER_RUN):
    done = {x['title'].casefold() for x in db.get('entries', [])}
    attempted = {x.casefold() for x in db.get('failed_titles', [])}
    choices = []
    for original in list(topics.get('curated', [])) + list(db.get('discovered_queue', [])):
        title = clean_title(original)
        if title and title.casefold() not in done and title.casefold() not in attempted and title.casefold() not in {c.casefold() for c in choices}:
            choices.append(title)
        if len(choices) >= amount:
            break
    return choices


def run(fetcher=fetch_article, now=None, sleep_fn=time.sleep):
    stamp = now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    db = load_json(DB_PATH, {'schema': 1, 'entries': [], 'discovered_queue': [], 'failed_titles': [], 'runs': []})
    topics = load_json(TOPICS_PATH, {'curated': []})
    for name in ('entries', 'discovered_queue', 'failed_titles', 'runs'):
        if not isinstance(db.get(name), list):
            raise ValueError(f'Ungueltige Datenbankstruktur: {name}')
    choices = choose_topics(db, topics)
    added, errors = [], []
    already = {x['title'].casefold() for x in db['entries']}
    queue = set(x.casefold() for x in db['discovered_queue'])
    for i, topic in enumerate(choices):
        try:
            page = fetcher(topic)
            if not page:
                db['failed_titles'].append(topic)
                errors.append(f'{topic}: kein geeigneter Artikel')
                continue
            title = clean_title(page['title'])
            if title.casefold() in already:
                continue
            entry = {
                'title': title,
                'excerpt': re.sub(r'\s+', ' ', page['excerpt']).strip()[:850],
                'source': page['url'],
                'source_name': 'Deutschsprachige Wikipedia',
                'source_license': 'CC BY-SA (Lizenzbedingungen der Quelle beachten)',
                'collected_at': stamp,
                'status': 'eine_quelle_nicht_unabhaengig_verifiziert',
                'method': 'Quellenauszug, keine eigenständige Faktenprüfung'
            }
            if len(entry['excerpt']) < 100:
                db['failed_titles'].append(topic)
                continue
            db['entries'].append(entry)
            already.add(title.casefold())
            added.append(title)
            # Neue Lernthemen aus verlinkten Artikeln, max. 2 pro Artikel.
            count = 0
            for raw in page.get('links', []):
                item = clean_title(raw)
                if item and len(item) > 3 and item.casefold() not in already and item.casefold() not in queue:
                    db['discovered_queue'].append(item)
                    queue.add(item.casefold())
                    count += 1
                    if count >= 2:
                        break
        except Exception as ex:
            # Vorübergehende Netzfehler: beim nächsten Lauf erneut probieren.
            errors.append(f'{topic}: {type(ex).__name__}: {str(ex)[:140]}')
        if i < len(choices) - 1:
            sleep_fn(0.6)
    db['entries'] = db['entries'][-MAX_ENTRIES:]
    db['discovered_queue'] = [x for x in db['discovered_queue'] if x.casefold() not in already][-MAX_QUEUE:]
    db['failed_titles'] = list(dict.fromkeys(db['failed_titles']))[-100:]
    db['runs'].append({'time': stamp, 'attempted': len(choices), 'added': len(added), 'errors': len(errors), 'new_titles': added, 'error_samples': errors[:3]})
    db['runs'] = db['runs'][-30:]
    save_json(DB_PATH, db)
    print(json.dumps(db['runs'][-1], ensure_ascii=False))
    return db['runs'][-1]


if __name__ == '__main__':
    run()
