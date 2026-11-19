/* NERYX S2 – gemeinsame, deterministische Retrieval-Bewertung.
   Keine Generierung, keine Änderung an Originaldaten. */
export function scoreRetrieval(ids, expectation) {
  const e=expectation?.retrieval;
  if(!e||typeof e!=='object')throw Error('Retrieval-Erwartung fehlt.');
  const verdict=e.verdict??expectation.verdict;
  if(!['hit','sufficient','none','any'].includes(verdict))throw Error('Unbekanntes Retrieval-Verdict: '+String(verdict));
  const include=e.mustInclude??[],exclude=e.mustExclude??[],allowOnly=e.allowOnly;
  if(!Array.isArray(include)||!Array.isArray(exclude)||allowOnly!==undefined&&!Array.isArray(allowOnly))
    throw Error('Retrieval-Bedingungen müssen Arrays sein.');
  if([...include,...exclude,...(allowOnly??[])].some(x=>typeof x!=='string'||!x))
    throw Error('Ungültige Claim-ID in Retrieval-Erwartung.');
  if(include.some(x=>exclude.includes(x)))throw Error('Widersprüchliche Retrieval-Bedingungen.');
  if((verdict==='hit'||verdict==='sufficient')&&!include.length)
    throw Error('Treffer-Erwartung ohne mustInclude.');
  if(verdict==='any'&&!exclude.length&&!allowOnly?.length)
    throw Error('any benötigt allowOnly oder mustExclude.');
  const found=[...new Set(ids.filter(Boolean))];
  const checks={
    include:include.every(x=>found.includes(x)),
    exclude:exclude.every(x=>!found.includes(x)),
    verdict:verdict==='none'?found.length===0:
      (verdict==='any'?true:found.length>0)
  };
  if(allowOnly)checks.allowOnly=found.every(x=>allowOnly.includes(x));
  // Rauschbudget nur für echte Positiv-Treffer; keine Änderung an alten Testfällen.
  if(verdict==='sufficient')checks.noise=found.length<=include.length+3;
  return {pass:Object.values(checks).every(Boolean),checks,found,
    kind:verdict==='any'?'noise_guard':'retrieval'};
}
