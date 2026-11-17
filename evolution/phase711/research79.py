#!/usr/bin/env python3
"""Phase 7.9: conservative, complete-source-sentence extraction and comparative quality audit.
Relies on 7.7 search results. No truth certification; standard library only.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import pathlib
import re
import sys
import unicodedata

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = HERE.parent / 'phase77' / 'research77.json'
REPORT = HERE / 'research79.json'
LIMIT = 4
# Reuse the exact fetch and page ID parsing from 7.8, plus its baseline parser.
sys.path.insert(0, str(HERE))
from research78 import page_id, get_excerpt, candidates as baseline_candidates

UNCERTAIN = re.compile(r'\b(?:angeblich|vermutlich|wahrscheinlich|möglicherweise|mutmaßlich|umstritten|laut|soll(?:en|te|ten)?|nicht|keine[smnr]?|könnte|würde)\b', re.I)
BAD_START = re.compile(r'^(?:hingegen|jedoch|außerdem|dabei|damit|danach|infolgedessen)\b',re.I)
VERBS = re.compile(r'\s+(?:ist|sind|bezeichnet|beschreibt|umfasst|bedeutet|stellt)\s+',re.I)


def clean(text, limit=2500):
    text = re.sub(r'\s+', ' ', str(text or '')).strip()
    return text[:limit]

def norm(text):
    s=unicodedata.normalize('NFKC',clean(text,180)).casefold()
    s=re.sub(r'\s*\([^)]*\)','',s)
    return re.sub(r'[^\wäöüß]+',' ',s).strip()

def sentence_split(text):
    """Sentence boundaries outside parentheses only; avoid decimal split and truncation."""
    s=clean(text,7000); result=[];start=0;depth=0
    for i,c in enumerate(s):
        if c=='(':depth+=1
        elif c==')':depth=max(0,depth-1)
        if c in '.!?' and depth==0 and (i+1==len(s) or s[i+1].isspace()) and (i==0 or not s[i-1].isdigit()):
            part=s[start:i+1].strip()
            if part:result.append(part)
            start=i+1
    return result

def subject_prefix(topic, page_title, sentence):
    title=norm(page_title); wanted=norm(topic)
    if title!=wanted:return None
    # only clearly anchored subject, either full title or a leading article + title
    # permit a short parenthetical like (Biologie) and a leading 'Eine Zelle'.
    name=re.escape(clean(topic,150))
    pattern=r'^(?:(?:Der|Die|Das|Ein|Eine|Einer|Eines)\s+)?'+name+r'(?:\s*\([^)]{1,80}\))?\s+'
    match=re.match(pattern,sentence,re.I)
    return match.end() if match else None

def parse_claims(topic,page):
    """Return attributed candidate(s) or diagnostic. No semantic truth decisions."""
    text=clean(page.get('excerpt'),7000)
    sentences=sentence_split(text)
    if norm(page.get('title'))!=norm(topic):return [],'themenabweichung'
    found=[];reasons=[]
    for sentence in sentences[:9]:
        if len(sentence)<24:reasons.append('zu_kurz');continue
        if len(sentence)>650:reasons.append('satz_zu_lang');continue
        if UNCERTAIN.search(sentence):reasons.append('unsicher_oder_negiert');continue
        if BAD_START.search(sentence):reasons.append('kontextabhaengig');continue
        start=subject_prefix(topic,page.get('title'),sentence)
        if start is None:reasons.append('subjekt_nicht_am_anfang');continue
        tail=sentence[start:].strip()
        matched=re.match(r'^(ist|sind|bezeichnet|beschreibt|umfasst|bedeutet|stellt)\s+(.+)[.!?]$',tail,re.I)
        if not matched:reasons.append('verb_unterstuetzt_nicht');continue
        verb=matched.group(1).casefold(); body=matched.group(2).strip()
        if verb=='stellt' and not re.search(r'\s+dar$',body,re.I):reasons.append('konstruktion_unvollstaendig');continue
        if verb in {'ist','sind'} and not re.match(r'^(?:ein(?:e|en|er|es|em)?|der|die|das)\s+',body,re.I):
            reasons.append('keine_klare_klassifikation');continue
        # Avoid source sentences involving multiple subjects or alternatives; don't try to compress them.
        if re.search(r'\b(?:beziehungsweise|entweder)\b',body,re.I):reasons.append('alternative_oder_mehrdeutig');continue
        if re.search(r'\b(?:welche|wobei|obwohl|jedoch)\b',body,re.I):reasons.append('komplexe_relation');continue
        if len(body)<9 or len(body)>440 or not re.search(r'[A-Za-zÄÖÜäöüß]',body):reasons.append('objekt_unvollstaendig');continue
        # Store FULL original sentence, without slicing it to a short label.
        cid=hashlib.sha256((norm(topic)+'|'+norm(sentence)+'|'+str(page.get('url'))).encode()).hexdigest()[:14]
        found.append({'id':'p79-'+cid,'subject':clean(topic,150),'relation':'quellenbeschreibung',
                      'statement':sentence,'quote':sentence,'source':page.get('url'),
                      'status':'unbestaetigte_quellenbehauptung','independent_verified':False,
                      'quality':'vollstaendiger_quellensatz','rule':verb})
        if len(found)>=3:break
    return found,('aussagen_gefunden' if found else (max(set(reasons),key=reasons.count) if reasons else 'kein_abgeschlossener_satz'))

def load(path,default):
    try:
        x=json.loads(path.read_text(encoding='utf-8'))
        return x if isinstance(x,dict) else default
    except (OSError,ValueError):return default

def update(source, old, fetcher=get_excerpt, now=None, limit=LIMIT):
    now=now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    existing={x['topic'].casefold():x for x in old.get('records',[]) if isinstance(x,dict) and isinstance(x.get('topic'),str)}
    questions=[q for q in source.get('questions',[]) if isinstance(q,dict) and q.get('status')=='suchtreffer' and isinstance(q.get('topic'),str)]
    questions.sort(key=lambda q:(q['topic'].casefold() in existing,q['topic'].casefold()))
    batch=[]
    for q in questions[:max(0,min(6,int(limit)))]:
        topic=clean(q['topic'],150)
        hits=q.get('hits') if isinstance(q.get('hits'),list) else []
        direct=next((h for h in hits if isinstance(h,dict) and norm(h.get('title'))==norm(topic) and page_id(h)),None)
        rec={'topic':topic,'question':clean(q.get('question'),210),'checked_at':now,
             'status':'kein_passender_titel','claims':[],'baseline_claims':0,
             'reasons':[],'independent_verified':False,'verified_correction':False}
        if direct:
            try:
                page=fetcher(page_id(direct))
                rec['source']=page['url'];rec['page_title']=page['title']
                claims,status=parse_claims(topic,page)
                oldclaims,_=baseline_candidates(topic,page)
                rec.update(status=status,claims=claims,baseline_claims=len(oldclaims),
                           excerpt_available=bool(page.get('excerpt')))
                prior=existing.get(topic.casefold())
                if prior and {(x.get('statement'),x.get('source')) for x in prior.get('claims',[])} != {(x['statement'],x['source']) for x in claims}:
                    rec['change_notice']='Extraktion geändert; keine bestätigte Korrektur'
            except Exception as exc:rec.update(status='abruf_fehler',error=type(exc).__name__)
        existing[topic.casefold()]=rec;batch.append(rec)
    allrecords=sorted(existing.values(),key=lambda v:v['topic'].casefold())[-150:]
    run={'at':now,'processed':len(batch),'with_claims':sum(bool(x['claims']) for x in batch),
         'candidates':sum(len(x['claims']) for x in batch),
         'baseline_candidates_same_pages':sum(x['baseline_claims'] for x in batch),
         'baseline_topics_same_pages':sum(x['baseline_claims']>0 for x in batch),
         'errors':sum(x['status']=='abruf_fehler' for x in batch),
         'without_matching_hit':sum(x['status']=='kein_passender_titel' for x in batch)}
    return {'schema':79,'records':allrecords,'runs':list(old.get('runs',[]))[-29:]+[run],
            'last_batch':[x['topic'] for x in batch], 'independent_confirmations':0,'verified_corrections':0}

def main():
    value=update(load(SOURCE,{}),load(REPORT,{}))
    REPORT.write_text(json.dumps(value,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('Phase 7.9 (same-page comparison):',value['runs'][-1])

if __name__=='__main__':main()
