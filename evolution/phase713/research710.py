#!/usr/bin/env python3
"""Phase 7.10: strict Wikipedia title resolution + provenance-preserving extraction.
No truth validation, no independent verification, no self-modifying code.
"""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import re
import urllib.parse
import urllib.request
import unicodedata
from research79 import parse_claims, norm, clean, load
from research78 import page_id, candidates as baseline_candidates

HERE=pathlib.Path(__file__).resolve().parent
SOURCE=HERE.parent/'phase77'/'research77.json'
REPORT=HERE/'research710.json'
API='https://de.wikipedia.org/w/api.php'
HEADERS={'User-Agent':'MeinLernBot/7.10 (educational source attribution; no factual certification)', 'Accept':'application/json'}
LIMIT=6

def canonical(text):
    s=unicodedata.normalize('NFKC',str(text or '')).casefold()
    s=re.sub(r'\s*\([^)]*\)','',s)
    s=re.sub(r'[^\wäöüß]+',' ',s)
    return ' '.join(s.split())

def is_same_topic(topic,title,redirect_from=None):
    # Accepted: exact name, typographic variants, disambiguation suffix,
    # or a redirect explicitly confirmed by Wikimedia from requested title.
    if canonical(topic)==canonical(title):return True
    return bool(redirect_from and canonical(topic)==canonical(redirect_from))

def request_json(params):
    req=urllib.request.Request(API+'?'+urllib.parse.urlencode(params),headers=HEADERS)
    with urllib.request.urlopen(req,timeout=15) as response:
        return json.loads(response.read(350000).decode('utf-8'))

def resolve_topic(topic,requester=request_json):
    """Fetch by *requested* article title, never by arbitrary fuzzy search hit.
    Explicit redirect metadata supplies the allowed alias; article content is
    used only after title/redirect verification. No other-site requests.
    """
    data=requester({'action':'query','prop':'extracts','titles':topic,'redirects':'1',
                    'explaintext':'1','exintro':'1','exchars':'4500','format':'json','formatversion':'2'})
    query=data.get('query',{})
    pages=query.get('pages',[])
    if not isinstance(pages,list) or len(pages)!=1:return None,'mehrdeutige_antwort'
    page=pages[0]
    if page.get('missing') is True or not page.get('extract') or not isinstance(page.get('pageid'),int):
        return None,'seite_fehlt_oder_leer'
    redirected=any(canonical(x.get('from'))==canonical(topic) and canonical(x.get('to'))==canonical(page.get('title')) for x in query.get('redirects',[]) if isinstance(x,dict))
    if not is_same_topic(topic,page.get('title'),topic if redirected else None):
        return None,'titel_nicht_bestaetigt'
    pid=page['pageid'];title=clean(page['title'],160)
    return {'title':title,'excerpt':clean(page['extract'],6000),
            'url':f'https://de.wikipedia.org/?curid={pid}',
            'redirect_from':topic if redirected else None,'pageid':pid},'weiterleitung' if redirected else 'direkter_titel'

def parse_topic(topic,page):
    # parse_claims from 7.9 remains the quality gate. For *confirmed* redirects,
    # translate the exact subject prefix to the canonical article title only.
    title=page['title']; content=page['excerpt']
    if canonical(topic)==canonical(title):return parse_claims(topic,page)
    if not is_same_topic(topic,title,page.get('redirect_from')):return [],'titel_nicht_bestaetigt'
    # The original claim and original sentence are always preserved; no
    # rewriting / automatic promotion of facts.
    claims,status=parse_claims(title,page)
    for c in claims:c['requested_topic']=topic
    return claims,status

def update(source,previous,resolver=resolve_topic,now=None,limit=LIMIT):
    now=now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    old={str(r['topic']).casefold():r for r in previous.get('records',[]) if isinstance(r,dict) and isinstance(r.get('topic'),str)}
    questions=[q for q in source.get('questions',[]) if isinstance(q,dict) and q.get('status')=='suchtreffer' and isinstance(q.get('topic'),str)]
    # Fresh topics first, deterministic stable order. Recheck visited later.
    questions.sort(key=lambda q:(q['topic'].casefold() in old,q['topic'].casefold()))
    batch=[]
    for q in questions[:max(0,min(10,int(limit)))]:
        topic=clean(q['topic'],160)
        original_hits=q.get('hits') if isinstance(q.get('hits'),list) else []
        exact=next((h for h in original_hits if isinstance(h,dict) and canonical(topic)==canonical(h.get('title')) and page_id(h)),None)
        rec={'topic':topic,'question':clean(q.get('question'),240),
             'checked_at':now,'original_hit_count':len(original_hits),
             'had_exact_search_hit':bool(exact),'claims':[],
             'source_method':'direkte_titelabfrage','status':'nicht_geprueft',
             'independent_verified':False,'verified_correction':False,
             'old_extractor_claims_same_page':0,'new_extractor_claims_same_page':0}
        try:
            page,reason=resolver(topic)
            rec['title_resolution']=reason
            if page:
                rec['source']=page['url'];rec['page_title']=page['title'];rec['redirect_from']=page.get('redirect_from')
                claims,status=parse_topic(topic,page)
                # Only compare parsers when using the same resolved page.
                baseline,_=baseline_candidates(page['title'],page)
                rec.update(status=status,claims=claims,old_extractor_claims_same_page=len(baseline),
                           new_extractor_claims_same_page=len(claims))
                prior=old.get(topic.casefold())
                if prior and {(x.get('statement'),x.get('source')) for x in prior.get('claims',[])} != {(x['statement'],x['source']) for x in claims}:
                    rec['change_notice']='Extrahierter Text geändert; keine sachlich bestätigte Korrektur'
            else:rec['status']=reason
        except Exception as exc:
            rec.update(status='abruf_fehler',error=type(exc).__name__)
        old[topic.casefold()]=rec;batch.append(rec)
    records=sorted(old.values(),key=lambda x:x['topic'].casefold())[-150:]
    run={'at':now,'processed':len(batch),'titles_resolved':sum(bool(r.get('source')) for r in batch),
         'previously_without_exact_hit':sum(not r['had_exact_search_hit'] for r in batch),
         'resolved_without_exact_hit':sum(not r['had_exact_search_hit'] and bool(r.get('source')) for r in batch),
         'topics_with_claims':sum(bool(r['claims']) for r in batch),
         'claims':sum(len(r['claims']) for r in batch),
         'old_extractor_same_pages':sum(r['old_extractor_claims_same_page'] for r in batch),
         'new_extractor_same_pages':sum(r['new_extractor_claims_same_page'] for r in batch),
         'errors':sum(r['status']=='abruf_fehler' for r in batch),
         'unresolved':sum(not r.get('source') for r in batch)}
    return {'schema':710,'records':records,'runs':list(previous.get('runs',[]))[-29:]+[run],
            'last_batch':[r['topic'] for r in batch],'independent_confirmations':0,'verified_corrections':0}

def main():
    result=update(load(SOURCE,{}),load(REPORT,{}))
    REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('Phase 7.10 – geprüfte Titelauflösung:',result['runs'][-1])
if __name__=='__main__':main()
