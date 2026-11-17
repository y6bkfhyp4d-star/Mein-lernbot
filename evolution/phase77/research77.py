#!/usr/bin/env python3
"""7.7: Ask targeted follow-up questions about gaps, store search leads.
Wikipedia search results are NOT independent evidence or verified claims.
No third-party Python packages, no automatic approval of facts.
"""
from __future__ import annotations
import datetime as dt
import html
import json
import pathlib
import re
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
KNOWLEDGE = HERE.parent / 'phase70' / 'knowledge.json'
PREVIOUS = HERE.parent / 'phase76' / 'review76.json'
REPORT = HERE / 'research77.json'
API = 'https://de.wikipedia.org/w/api.php'
HEADERS = {'User-Agent': 'MeinLernBot/7.7 (educational research; source attribution)', 'Accept':'application/json'}
MAX_QUERY = 3


def load(path, default):
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
        return value if isinstance(value, dict) else default
    except (ValueError, OSError):
        return default


def compact(x, limit=160):
    return re.sub(r'\s+', ' ', str(x or '')).strip()[:limit]


def choose_gaps(db, old, cross):
    entries = [e for e in db.get('entries', []) if isinstance(e,dict) and compact(e.get('title')) and isinstance(e.get('excerpt'),str)]
    entries = entries[-150:]
    reviewed = {compact(e.get('title')).lower():e for e in cross.get('entities',[]) if isinstance(e,dict)}
    previous = {compact(x.get('topic')).lower():x for x in old.get('questions',[]) if isinstance(x,dict)}
    selected=[]
    for e in entries:
        title=compact(e['title'],100)
        info=reviewed.get(title.lower(),{})
        # Never infer falsity from an absent/mismatching P31 class.
        kind='klassifikation_offen' if info.get('status')!='ok' or not info.get('classes') else 'weiterer_kontext'
        question=f'Was ist {title} und wie wird es eingeordnet?'
        old_rec=previous.get(title.lower(),{})
        successful=old_rec.get('status') == 'suchtreffer'
        # Lower-priority successful topics are only revisited after all unanswered topics.
        priority=(0 if not successful else 2, 0 if kind=='klassifikation_offen' else 1, title.lower())
        selected.append((priority, {'topic':title,'question':question,'reason':kind,'source':compact(e.get('source') or e.get('url'),300)}))
    selected.sort(key=lambda pair: pair[0])
    return [entry for _,entry in selected]


def search_wikipedia(query):
    parameters={'action':'query','list':'search','srsearch':query,'srlimit':'3','format':'json','utf8':'1'}
    url=API+'?'+urllib.parse.urlencode(parameters)
    req=urllib.request.Request(url,headers=HEADERS)
    with urllib.request.urlopen(req,timeout=13) as response:
        value=json.loads(response.read(400000).decode('utf-8'))
    out=[]
    for result in value.get('query',{}).get('search',[])[:3]:
        pageid=result.get('pageid')
        if not isinstance(pageid,int) or pageid<=0: continue
        snippet=html.unescape(re.sub(r'<[^>]*>','',str(result.get('snippet',''))))
        out.append({'title':compact(result.get('title'),120),'snippet':compact(snippet,360), 'url':'https://de.wikipedia.org/?curid='+str(pageid), 'ecosystem':'Wikimedia'})
    return out


def update(db, old, cross, fetcher=search_wikipedia, now=None, limit=MAX_QUERY):
    now = now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    gaps=choose_gaps(db,old,cross)
    existing={compact(q.get('topic')).lower():q for q in old.get('questions',[]) if isinstance(q,dict) and q.get('topic')}
    batch=[]
    # Search missing/new questions first and refresh previously unanswered questions.
    candidates=[g for g in gaps if g['topic'].lower() not in existing or existing[g['topic'].lower()].get('status')!='suchtreffer']
    if not candidates: candidates=gaps
    for gap in candidates[:max(0,min(limit,5))]:
        try:
            hits=fetcher(gap['question'])
            if not isinstance(hits,list): raise ValueError('invalid result')
            hits=[x for x in hits[:3] if isinstance(x,dict) and str(x.get('url','')).startswith('https://de.wikipedia.org/')]
            status='suchtreffer' if hits else 'keine_treffer'
            record={**gap,'status':status,'checked_at':now,'hits':hits,'independent_confirmation':False}
        except Exception as exc:
            record={**gap,'status':'recherche_fehler','checked_at':now,'hits':[], 'error':type(exc).__name__,'independent_confirmation':False}
        existing[gap['topic'].lower()]=record
        batch.append(record)
    active={g['topic'].lower() for g in gaps}
    question_list=[existing[k] for k in sorted(active) if k in existing][-150:]
    runs=list(old.get('runs',[]))[-29:]+[{'at':now,'open_gaps':len(gaps),'searched':len(batch),'with_results':sum(x['status']=='suchtreffer' for x in batch),'no_results':sum(x['status']=='keine_treffer' for x in batch),'errors':sum(x['status']=='recherche_fehler' for x in batch)}]
    return {'schema':77,'questions':question_list,'runs':runs,'last_batch':[x['topic'] for x in batch], 'independent_confirmations':0,'verified_corrections':0}


def main():
    db=load(KNOWLEDGE,{'entries':[]})
    old=load(REPORT,{})
    cross=load(PREVIOUS,{})
    report=update(db,old,cross)
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    run=report['runs'][-1]
    print(f"Phase 7.7: gaps {run['open_gaps']}, researched {run['searched']}, leads {run['with_results']}, errors {run['errors']}; verified corrections 0")

if __name__=='__main__': main()
