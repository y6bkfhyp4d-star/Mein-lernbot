#!/usr/bin/env python3
"""Phase 7.12 – conservative diagnostics of attributed statements, never fact-check truth.
Uses the existing phase711 report; does not edit facts or award independent verification.
"""
from __future__ import annotations
import json, pathlib, re, datetime
ROOT=pathlib.Path(__file__).resolve().parent
SOURCE=ROOT/'research711.json'
OUT=ROOT/'audit712.json'

def analyze(data):
    records=data.get('records',[]) if isinstance(data,dict) else []
    findings=[];checked=0;seen={}
    for rec in records:
        topic=str(rec.get('topic','Unbekannt'))
        for claim in rec.get('claims',[]):
            checked+=1
            statement=re.sub(r'\s+',' ',str(claim.get('statement',''))).strip()
            url=str(claim.get('source',''))
            def flag(code,detail):findings.append({'topic':topic,'reason':code,'detail':detail,'source':url})
            if not url.startswith('https://de.wikipedia.org/'):
                flag('quelle_fehlt_oder_unerwartet','Die hinterlegte URL ist keine deutsche Wikipedia-URL; Herkunft prüfen.')
            if len(statement)<35 or statement[-1:] not in '.!?':
                flag('satz_unvollstaendig','Die Aussage wirkt abgeschnitten oder zu kurz.')
            if re.search(r'\b(?:vermutlich|angeblich|möglicherweise|wahrscheinlich)\b',statement,re.I):
                flag('unsicherheitsmarker','Aussage enthält ein Unsicherheitswort; manuelle Bewertung nötig.')
            key=(topic.casefold(),statement.casefold())
            if key in seen and seen[key]!=url:
                flag('mehrfachquelle_wikimedia','Ähnliche Aussage auf weiteren Wikipedia-Seiten; keine unabhängige Bestätigung.')
            seen[key]=url
    return {'schema':712,'checked':checked,'findings':findings,'independent_confirmations':0,'verified_corrections':0}

def main():
    base=json.loads(SOURCE.read_text(encoding='utf-8')) if SOURCE.exists() else {}
    data=analyze(base)
    existing=json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    sig=(data['checked'],data['findings'])
    oldsig=(existing.get('checked',0),existing.get('findings',[]))
    runs=existing.get('runs',[])
    if sig!=oldsig or not runs:
        runs=(runs+[{'time':datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),'checked':data['checked'],'flags':len(data['findings'])}])[-30:]
    data['runs']=runs
    if data!=existing:OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Phase 7.12:',data['checked'],'Aussagen,',len(data['findings']),'Pruefhinweise; keine automatisch bestaetigten Sachkorrekturen.')
if __name__=='__main__':main()
