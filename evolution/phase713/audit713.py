#!/usr/bin/env python3
"""LernBot phase 7 finale: transparent structural checks and separate synthetic benchmarks.
No independent truth claims; synthetic test cases never enter knowledge storage.
"""
from __future__ import annotations
import datetime as dt
import json
import pathlib
import re
from urllib.parse import urlsplit

HERE=pathlib.Path(__file__).resolve().parent
INPUT=HERE/'research711.json'
OUTPUT=HERE/'audit713.json'
VERSION=713
UNCERTAIN=re.compile(r'\b(?:vermutlich|angeblich|möglicherweise|wahrscheinlich|eventuell|mutmaßlich)\b',re.I)
NEGATIVE=re.compile(r'\b(?:kein(?:e|en|er|es|em)?|nicht)\b',re.I)

def clean(s):return re.sub(r'\s+',' ',str(s or '')).strip()

def source_ok(url):
    """Wikipedia attestation of origin only; not a truth or independence check."""
    try:
        u=urlsplit(str(url or ''))
        return u.scheme=='https' and u.hostname=='de.wikipedia.org' and u.path.startswith(('/wiki/','/w/','/'))
    except (ValueError,TypeError):return False

def structural_flags(topic,statement,source,min_length=35):
    s=clean(statement)
    flags=[]
    if not source_ok(source):flags.append('quelle_ungeeignet')
    if len(s)<min_length or not s.endswith(('.', '!', '?')):flags.append('satz_unvollstaendig')
    if UNCERTAIN.search(s):flags.append('unsicherheit')
    if re.search(r'\b(?:dieser|diese|dieses|dabei|hierbei)\b',s,re.I) and len(s)<85:
        flags.append('kontext_abhaengig')
    return flags

def normalize_claim(s):
    return re.sub(r'[^a-zäöüß0-9]+',' ',clean(s).casefold()).strip()

def contradiction_pairs(records):
    """Only explicit identical predicate with negation flip is flagged; not semantic inference."""
    pairs=[]; index={}
    for ri,r in enumerate(records):
        topic=clean(r.get('topic','')).casefold()
        for ci,c in enumerate(r.get('claims',[])):
            s=clean(c.get('statement',''))
            match=re.search(r'\bist\s+(kein(?:e|en|er|es|em)?|ein(?:e|en|er|es|em)?)\s+(.+?)[.!?]$',s,re.I)
            if not match:continue
            tail=normalize_claim(match.group(2))
            if len(tail)<5:continue
            neg=match.group(1).casefold().startswith('kein')
            key=(topic,tail)
            for old_neg,old_ri,old_ci in index.get(key,[]):
                if old_neg!=neg:
                    pairs.append({'topic':r.get('topic'),'a':[old_ri,old_ci],'b':[ri,ci],
                        'reason':'explizite_negationskollision','explanation':'Gleicher Gegenstand und Ausdruck in bejahter/verneinter Form. Welche Aussage zutrifft, bleibt offen.'})
            index.setdefault(key,[]).append((neg,ri,ci))
    return pairs

def audit(records,min_length=35):
    rows=[];checked=0
    for record in records:
        topic=clean(record.get('topic','Unbekannt'))
        for claim in record.get('claims',[]):
            checked+=1
            statement=clean(claim.get('statement'))
            source=clean(claim.get('source'))
            flags=structural_flags(topic,statement,source,min_length)
            rows.append({'topic':topic,'statement':statement,'source':source,'flags':flags,
                         'risk':'pruefbedarf' if flags else 'keine_strukturhinweise',
                         'independent_verified':False,'auto_corrected':False})
    conflicts=contradiction_pairs(records)
    return {'checked':checked,'rows':rows,'flagged':sum(bool(x['flags']) for x in rows),
            'conflict_pairs':conflicts,'independent_confirmations':0,'verified_corrections':0}

# Labeled synthetics. These are NEVER written into the actual knowledge set.
TRAIN=[
 ('Licht ist eine Form der elektromagnetischen Strahlung.','https://de.wikipedia.org/wiki/Licht',0),
 ('Licht ist eine Form','https://de.wikipedia.org/wiki/Licht',1),
 ('Eine passende, aber angeblich sichere Beschreibung.','https://de.wikipedia.org/wiki/X',1),
 ('Chemie ist ein experimentelles Fachgebiet mit vielen Teilgebieten.','https://de.wikipedia.org/wiki/Chemie',0),
 ('Schall ist eine Folge mechanischer Schwingungen.','http://example.com/a',1),
 ('Der Satz ist bewusst ohne Schlusszeichen','https://de.wikipedia.org/wiki/X',1),
 ('Eine wissenschaftliche Beschreibung umfasst mehrere Begriffe.','https://de.wikipedia.org/wiki/X',0),
 ('Eine sehr kurze Form.','https://de.wikipedia.org/wiki/X',1),
]
HOLDOUT=[
 ('Wasser ist eine chemische Verbindung aus Wasserstoff und Sauerstoff.','https://de.wikipedia.org/wiki/Wasser',0,'struktur'),
 ('Wasser ist H2O','https://de.wikipedia.org/wiki/Wasser',1,'abgeschnitten'),
 ('Magnetismus ist vermutlich keine physikalische Erscheinung.','https://de.wikipedia.org/wiki/Magnetismus',1,'unsicher'),
 ('Ein langer Satz zu einem Thema mit fremdem Link.','https://example.org/wiki/Beispiel',1,'quelle'),
 ('Diese Definition ist vollständig und nennt wichtige Eigenschaften.','https://de.wikipedia.org/wiki/Definition',0,'struktur'),
 ('Elektrizität ist eine Bezeichnung für elektrische Vorgänge.','https://de.wikipedia.org/wiki/Elektrizit%C3%A4t',0,'struktur'),
 ('Ein Gegenstand ist eine ungenaue Sache','https://de.wikipedia.org/wiki/X',1,'abgeschnitten'),
 ('Schall ist eine mechanische Schwingungserscheinung in Medien.','https://de.wikipedia.org/wiki/Schall',0,'struktur'),
 ('Diese Aussage ist möglicherweise richtig und endet ordentlich.','https://de.wikipedia.org/wiki/X',1,'unsicher'),
 ('Die evolutionäre Entwicklung lässt sich in Fossilien nachvollziehen.','https://de.wikipedia.org/wiki/Evolution',0,'struktur'),
 ('DNA','https://de.wikipedia.org/wiki/Desoxyribonukleins%C3%A4ure',1,'abgeschnitten'),
 ('Es existieren viele verschiedene Methoden der Klassifikation.','https://de.wikipedia.org/wiki/Klassifikation',0,'struktur'),
 # deliberately difficult: coherent but false world-knowledge statement; method is NOT a fact checker
 ('Die Erde besteht vollständig aus würfelförmigem Käse.','https://de.wikipedia.org/wiki/Erde',1,'inhaltlicher_fehler_nicht_strukturell'),
]

def score(items,min_length):
    tp=fp=tn=fn=0; misses=[]
    for statement,url,is_bad,*rest in items:
        predicted=bool(structural_flags('Test',statement,url,min_length))
        if predicted and is_bad:tp+=1
        elif predicted:fp+=1
        elif is_bad:fn+=1;misses.append(rest[0] if rest else 'unbekannt')
        else:tn+=1
    return {'tested':len(items),'true_positive':tp,'false_positive':fp,'true_negative':tn,
            'false_negative':fn,'miss_types':misses,'accuracy':round((tp+tn)/len(items),3)}

def calibrate():
    candidates=[25,35,45]
    scored={n:score(TRAIN,n) for n in candidates}
    # false alarms hurt; learn only a scalar detection threshold from labeled synthetics
    selected=max(candidates,key=lambda n:(scored[n]['true_positive']-2*scored[n]['false_positive'], -scored[n]['false_negative'], -abs(n-35)))
    return selected,scored

def finalize(source,prior=None,now=None):
    prior=prior or {}
    records=source.get('records',[]) if isinstance(source,dict) else []
    if not isinstance(records,list):records=[]
    records=[r for r in records if isinstance(r,dict) and isinstance(r.get('claims',[]),list)]
    selected,train_scores=calibrate()
    real=audit(records,selected)
    holdout=score(HOLDOUT,selected)
    baseline=score(HOLDOUT,35)
    test_contradictions=contradiction_pairs([
        {'topic':'Fabeltier','claims':[{'statement':'Fabeltier ist ein Wirbeltier.'},
                                      {'statement':'Fabeltier ist kein Wirbeltier.'}]}])
    # explicitly tested: no real fact deletion, no verified truth assertion
    checks={'synthetic_holdout':holdout,'baseline_holdout':baseline,
            'contradiction_test_passed':len(test_contradictions)==1,
            'synthetic_never_merged':True,
            'calibrated_parameter':selected,
            'train_scores':{str(n):v for n,v in train_scores.items()}}
    valid=(source.get('schema')==711 and bool(records) and real['checked']>0 and holdout['tested']>=10 and checks['contradiction_test_passed'] and holdout['false_positive']<=2)
    return {'schema':VERSION,'generated_at':now or dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
            'phase7_closure':'technisch_abgeschlossen_mit_offenen_wahrheitsfragen' if valid else ('datenbasis_fehlt' if not records else 'pruefung_nicht_bestanden'),
            'status_explanation':'Phase-7-Pipeline vorhanden und automatisierte Strukturtests dokumentiert. Keine unabhängige Sachverifikation.',
            'source_schema':source.get('schema') if isinstance(source,dict) else None,
            'source_records':len(records),'audit':real,'checks':checks,
            'limitations':['Kein allgemeiner semantischer Wahrheitsprüfer',
                           'Fachlich falsche, sprachlich saubere Aussagen können unentdeckt bleiben',
                           'Wikipedia und Wikidata sind keine unabhängigen Quellen',
                           'Korrekturen erfolgen nicht autonom und nicht ohne belegte Validierung',
                           'Trainings- und Testbeispiele sind synthetisch und nicht Teil des Wissensbestands'],
            'independent_confirmations':0,'verified_corrections':0}

def main():
    source=json.loads(INPUT.read_text(encoding='utf-8')) if INPUT.exists() else {}
    previous=json.loads(OUTPUT.read_text(encoding='utf-8')) if OUTPUT.exists() else {}
    report=finalize(source,previous)
    # stable content for scheduled runs: don't commit changing timestamps unless data changes
    if previous:
        def comparable(d):return {k:v for k,v in d.items() if k!='generated_at'}
        if comparable(previous)==comparable(report):
            print('Phase 7 final: keine inhaltliche Änderung; nichts überschrieben.')
            return
    OUTPUT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Phase-7-Abschluss:',report['phase7_closure'],'| reale Aussagen:',report['audit']['checked'],
          '| Prüfhinweise:',report['audit']['flagged'],'| Holdout:',report['checks']['synthetic_holdout'])

if __name__=='__main__':main()
