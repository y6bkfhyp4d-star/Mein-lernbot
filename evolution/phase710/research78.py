#!/usr/bin/env python3
"""Phase 7.8: From 7.7 search leads to attributed, provisional claim candidates.
Not a fact-checker. Never marks independent verification or confirmed corrections.
Python standard library only. Limits work to 3 topics/run to be GitHub-friendly.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import pathlib
import re
import urllib.parse
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = HERE.parent / 'phase77' / 'research77.json'
REPORT = HERE / 'research78.json'
API = 'https://de.wikipedia.org/w/api.php'
HEADERS = {'User-Agent': 'MeinLernBot/7.8 (research attribution and educational prototype)', 'Accept':'application/json'}
LIMIT = 3

def load(path, fallback):
    try:
        data=json.loads(path.read_text(encoding='utf-8'))
        return data if isinstance(data,dict) else fallback
    except (OSError,ValueError):
        return fallback

def clean(s,limit=450):
    return re.sub(r'\s+',' ',str(s or '')).strip()[:limit]

def page_id(hit):
    url=str(hit.get('url',''))
    parsed=urllib.parse.urlparse(url)
    if parsed.scheme!='https' or parsed.netloc!='de.wikipedia.org':
        return None
    raw=urllib.parse.parse_qs(parsed.query).get('curid',[''])[0]
    return int(raw) if raw.isdigit() and 0<int(raw)<1000000000 else None

def get_excerpt(pid):
    params={'action':'query','prop':'extracts','explaintext':'1','exintro':'1','exchars':'2400','pageids':str(pid),'format':'json','redirects':'1'}
    req=urllib.request.Request(API+'?'+urllib.parse.urlencode(params),headers=HEADERS)
    with urllib.request.urlopen(req,timeout=14) as response:
        data=json.loads(response.read(250000).decode('utf-8'))
    page=data.get('query',{}).get('pages',{}).get(str(pid),{})
    if page.get('missing') is not None or not page.get('extract'):
        raise ValueError('page missing or empty extract')
    return {'title':clean(page.get('title'),110),'excerpt':clean(page['extract'],2200),'url':'https://de.wikipedia.org/?curid='+str(pid)}

UNCERTAIN=re.compile(r'\b(?:angeblich|vermutlich|wahrscheinlich|möglicherweise|nicht|kein(?:e|en|er|es)?|laut|umstritten|soll(?:te|ten)?)\b',re.I)

def candidates(topic,page):
    """Only start-of-sentence, plain copular text; no hidden use of the page contents."""
    title=clean(page.get('title'),110)
    topic=clean(topic,110)
    # Don't treat search result on a different page as the answer to the question.
    canon=lambda x: re.sub(r'\s*\([^)]*\)','',x).casefold().strip()
    if canon(title)!=canon(topic):
        return [],'themenabweichung'
    intro=clean(page.get('excerpt'),2200)
    first_sentences=re.split(r'(?<=[.!?])\s+',intro)[:5]
    found=[]
    for sentence in first_sentences:
        s=clean(sentence,400)
        if UNCERTAIN.search(s): continue
        # Optional articles; allow trailing parenthetical disambiguation before ist.
        name=re.escape(topic)
        match=re.match(r'^(?:Der|Die|Das|Ein|Eine)?\s*'+name+r'(?:\s*\([^)]{1,75}\))?\s+ist\s+(?:ein|eine|einer|eines|das|der|die)\s+([^,.;:]{3,85})',s,re.I)
        if not match:continue
        obj=clean(match.group(1),80)
        obj=re.split(r'\s+\b(?:mit|und|sowie|aus|durch|dessen|deren|welche|wobei)\b',obj,1,flags=re.I)[0].strip()
        if not obj or len(obj.split())>7:continue
        cid=hashlib.sha256((topic.casefold()+'|'+obj.casefold()+'|'+page['url']).encode()).hexdigest()[:14]
        found.append({'id':'p78-'+cid,'subject':topic,'relation':'text_klassifikation','object':obj,'quote':s,'source':page['url'],'status':'vorlaeufige_quellenbehauptung','independent_verified':False})
        if len(found)>=2:break
    return found,('kandidaten_gefunden' if found else 'kein_sicheres_muster')

def update(source, old, fetcher=get_excerpt, now=None, limit=LIMIT):
    now=now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    existing={x['topic'].casefold():x for x in old.get('records',[]) if isinstance(x,dict) and isinstance(x.get('topic'),str)}
    questions=[q for q in source.get('questions',[]) if isinstance(q,dict) and q.get('status')=='suchtreffer' and isinstance(q.get('topic'),str)]
    # Prefer new topics; remaining topics can refresh after all are visited.
    questions.sort(key=lambda q:(q['topic'].casefold() in existing,q['topic'].casefold()))
    batch=[]
    for q in questions[:max(0,min(5,int(limit)))]:
        topic=clean(q['topic'],110)
        hits=q.get('hits') if isinstance(q.get('hits'),list) else []
        direct=next((h for h in hits if isinstance(h,dict) and clean(h.get('title')).casefold()==topic.casefold() and page_id(h)),None)
        rec={'topic':topic,'question':clean(q.get('question'),180),'checked_at':now,'status':'nur_suchtreffer','claims':[], 'independent_verified':False, 'verified_correction':False}
        if direct:
            try:
                page=fetcher(page_id(direct))
                rec['source']=page['url']
                rec['page_title']=page['title']
                claims,status=candidates(topic,page)
                rec.update(status=status,claims=claims)
                previous=existing.get(topic.casefold(),{})
                old_statements={(c['relation'],c['object']) for c in previous.get('claims',[]) if isinstance(c,dict)}
                new_statements={(c['relation'],c['object']) for c in claims}
                if previous and old_statements!=new_statements:
                    rec['change_notice']='Extraktion verändert; keine bestätigte Sachkorrektur'
            except Exception as exc:
                rec.update(status='abruf_fehler',error=type(exc).__name__)
        existing[topic.casefold()]=rec
        batch.append(rec)
    records=sorted(existing.values(),key=lambda x:x['topic'].casefold())[-150:]
    run={'at':now,'processed':len(batch),'with_claims':sum(bool(x['claims']) for x in batch),'candidates':sum(len(x['claims']) for x in batch),'errors':sum(x['status']=='abruf_fehler' for x in batch)}
    return {'schema':78,'records':records,'runs':list(old.get('runs',[]))[-29:]+[run],'last_batch':[x['topic'] for x in batch],'independent_confirmations':0,'verified_corrections':0}

def main():
    current=update(load(SOURCE,{}),load(REPORT,{}))
    REPORT.write_text(json.dumps(current,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('Phase 7.8:',current['runs'][-1],'- no independent verification claimed')

if __name__=='__main__':main()
