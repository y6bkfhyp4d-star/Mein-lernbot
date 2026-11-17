#!/usr/bin/env python3
"""Phase 7.11: attributed extraction after contextual lead-ins and aliases.
Wikipedia text is NOT independently verified. Keeps past phase710 as baseline.
"""
from __future__ import annotations
import datetime as dt
import hashlib
import json
import pathlib
import re
import unicodedata
from research710 import resolve_topic, is_same_topic, canonical, request_json
from research79 import parse_claims, sentence_split, clean, norm, load, UNCERTAIN, BAD_START

HERE=pathlib.Path(__file__).resolve().parent
SOURCE=HERE.parent/'phase77'/'research77.json'
REPORT=HERE/'research711.json'
LIMIT=6

ARTICLES=r'(?:der|die|das|ein|eine|einer|eines)'
VERB=r'(?:ist|sind|bezeichnet|beschreibt|umfasst|bedeutet|stellt)'


def normalize_space(text):
    return re.sub(r'\s+',' ',str(text or '')).strip()


def candidate_subjects(topic, page):
    """Exactly source-confirmed title, requested title, and limited explicit aliases."""
    title=page.get('title','')
    names=[title]
    if norm(topic)!=norm(title) and page.get('redirect_from') and is_same_topic(topic,title,page.get('redirect_from')):
        names.append(topic)
    # Some article leads use abbreviation directly in parentheses after long title.
    if canonical(title)=='desoxyribonukleinsäure': names += ['DNA']
    return list(dict.fromkeys(x for x in names if x))


def find_subject_start(sentence,names):
    """Subject can follow a constrained, non-semantic leading phrase.
    No arbitrary in-sentence keyword search: it would create false attributions.
    """
    s=normalize_space(sentence)
    # neutral editorial/time/context lead-in only, not independent clauses
    prefixes=[r'',r'Im allgemeinen Sprachgebrauch\s*,?\s*',
              r'In der Biologie\s*,?\s*',r'In der Chemie\s*,?\s*',
              r'In der Physik\s*,?\s*',r'In den Naturwissenschaften\s*,?\s*',
              r'Als\s+(?:biologischer?|chemischer?|physikalischer?)\s+Begriff\s*,?\s*']
    for pre in prefixes:
        for name in names:
            # Optionally article, nested single short parentheses, alternative acronym.
            rx=(r'^'+pre+r'(?:(?:'+ARTICLES+r')\s+)?'+re.escape(name)
                +r'(?:\s*\([^()]{1,130}\))?\s*,?\s*(?='+VERB+r'\b)')
            m=re.match(rx,s,re.I)
            if m:return m.end(),name,'direkt' if not pre else 'einleitung'
    # Explicit definitional constructions with subject in a constrained grammatical slot.
    for name in names:
        for pat in [r'^Unter\s+'+re.escape(name)+r'(?:\s*\([^()]{1,100}\))?\s+versteht\s+man\s+',
                    r'^Als\s+'+re.escape(name)+r'(?:\s*\([^()]{1,100}\))?\s+bezeichnet\s+man\s+']:
            m=re.match(pat,s,re.I)
            if m:return m.end(),name,'definitionseinleitung'
    # Leading subject with a single parenthetical after the SUBJECT but before verb
    # e.g. 'Die Desoxyribonukleinsäure (DNS, englisch DNA) ist ...'
    return None,None,'subjekt_nicht_erkannt'


def parse_flexible(topic,page):
    """Find complete source sentences. Zero inferred facts. Explanatory relations only."""
    if not is_same_topic(topic,page.get('title'),page.get('redirect_from')):
        return [],'titel_nicht_bestaetigt',{}
    text=clean(page.get('excerpt'),7000)
    sentences=sentence_split(text)
    names=candidate_subjects(topic,page)
    claims=[]; reasons={}
    for sentence in sentences[:12]:
        reason=''
        if len(sentence)<24:reason='zu_kurz'
        elif len(sentence)>680:reason='satz_zu_lang'
        elif UNCERTAIN.search(sentence):reason='unsicher_oder_negiert'
        elif BAD_START.search(sentence):reason='kontextabhaengig'
        else:
            pos,matched_name,kind=find_subject_start(sentence,names)
            if pos is None:reason='subjekt_nicht_erkannt'
            else:
                tail=sentence[pos:].strip()
                match=(re.match(r'^('+VERB+r')\s+(.+)[.!?]$',tail,re.I)
                  if kind!='definitionseinleitung' else re.match(r'^(.+)[.!?]$',tail,re.I))
                if not match:reason='verb_unterstuetzt_nicht'
                else:
                    verb=match.group(1).casefold() if kind!='definitionseinleitung' else 'definiert_als'
                    body=match.group(2).strip() if kind!='definitionseinleitung' else match.group(1).strip()
                    if verb=='stellt' and not re.search(r'\s+dar$',body,re.I):reason='konstruktion_unvollstaendig'
                    elif verb in {'ist','sind'} and not re.match(r'^(?:ein(?:e|en|er|es|em)?|der|die|das)\s+',body,re.I):reason='keine_klare_klassifikation'
                    elif re.search(r'\b(?:beziehungsweise|entweder|wobei|obwohl|jedoch)\b',body,re.I):reason='mehrdeutige_relation'
                    elif not 10<=len(body)<=450:reason='objekt_unvollstaendig'
                    elif not re.search(r'[A-Za-zÄÖÜäöüß]',body):reason='objekt_unvollstaendig'
                    else:
                        cid=hashlib.sha256((canonical(topic)+'|'+normalize_space(sentence)+'|'+str(page.get('url'))).encode()).hexdigest()[:14]
                        claims.append({'id':'p711-'+cid,'subject':topic,'relation':'quellenbeschreibung',
                           'statement':sentence,'quote':sentence,'source':page.get('url'),
                           'status':'unbestaetigte_quellenbehauptung','independent_verified':False,
                           'quality':'vollstaendiger_quellensatz','rule':verb,'subject_form':matched_name,'pattern':kind})
        if reason:reasons[reason]=reasons.get(reason,0)+1
        if len(claims)>=3:break
    best=(sorted(reasons,key=lambda k:(-reasons[k],k))[0] if reasons else 'kein_abgeschlossener_satz')
    return claims,('aussagen_gefunden' if claims else best),reasons


def update(source, previous, resolver=resolve_topic, now=None, limit=LIMIT):
    now=now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    old={r['topic'].casefold():r for r in previous.get('records',[]) if isinstance(r,dict) and isinstance(r.get('topic'),str)}
    questions=[q for q in source.get('questions',[]) if isinstance(q,dict) and q.get('status')=='suchtreffer' and isinstance(q.get('topic'),str)]
    questions.sort(key=lambda q:(q['topic'].casefold() in old,q['topic'].casefold()))
    batch=[]
    for q in questions[:max(0,min(12,int(limit)))]:
        topic=clean(q['topic'],160)
        rec={'topic':topic,'question':clean(q.get('question'),240),'checked_at':now,
             'status':'nicht_geprueft','claims':[],'old_claims_same_page':0,
             'new_claims_same_page':0,'title_resolution':None,'diagnostics':{},
             'independent_verified':False,'verified_correction':False}
        try:
            page,method=resolver(topic)
            rec['title_resolution']=method
            if not page:rec['status']=method
            else:
                rec.update(source=page['url'],page_title=page['title'])
                baseline,_=parse_claims(page['title'],page)
                claims,status,diagnostics=parse_flexible(topic,page)
                rec.update(claims=claims,status=status,diagnostics=diagnostics,
                           old_claims_same_page=len(baseline),new_claims_same_page=len(claims))
                prev=old.get(topic.casefold())
                if prev and {(x.get('statement'),x.get('source')) for x in prev.get('claims',[])} != {(x['statement'],x['source']) for x in claims}:
                    rec['change_notice']='Extraktion geändert; keine bestätigte Sachkorrektur'
        except Exception as exc:rec.update(status='abruf_fehler',error=type(exc).__name__)
        old[topic.casefold()]=rec;batch.append(rec)
    records=sorted(old.values(),key=lambda x:x['topic'].casefold())[-150:]
    run={'at':now,'processed':len(batch),'titles_resolved':sum(bool(r.get('source')) for r in batch),
         'topics_with_claims':sum(bool(r['claims']) for r in batch),
         'claims':sum(len(r['claims']) for r in batch),
         'old_extractor_same_pages':sum(r['old_claims_same_page'] for r in batch),
         'new_extractor_same_pages':sum(r['new_claims_same_page'] for r in batch),
         'errors':sum(r['status']=='abruf_fehler' for r in batch),
         'unresolved_topics':[r['topic'] for r in batch if not r['claims']]}
    return {'schema':711,'records':records,'runs':list(previous.get('runs',[]))[-29:]+[run],
            'last_batch':[r['topic'] for r in batch], 'independent_confirmations':0,'verified_corrections':0}


def main():
    result=update(load(SOURCE,{}),load(REPORT,{}))
    REPORT.write_text(json.dumps(result,ensure_ascii=False,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print('Phase 7.11 – flexible, belegte Satzanalyse:',result['runs'][-1])
if __name__=='__main__':main()
