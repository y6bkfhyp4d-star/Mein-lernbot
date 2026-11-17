export function assess713(raw){
 const valid=raw?.schema===713 && raw?.audit && raw?.checks;
 if(!valid)return {available:false,checked:0,flagged:0,pairs:[],rows:[],holdout:null,status:'bericht_fehlt'};
 return {available:true,checked:Number(raw.audit.checked)||0,flagged:Number(raw.audit.flagged)||0,
  pairs:Array.isArray(raw.audit.conflict_pairs)?raw.audit.conflict_pairs:[],
  rows:Array.isArray(raw.audit.rows)?raw.audit.rows:[],
  holdout:raw.checks.synthetic_holdout||null,baseline:raw.checks.baseline_holdout||null,
  threshold:raw.checks.calibrated_parameter,status:raw.phase7_closure||'unbekannt',
  limitations:Array.isArray(raw.limitations)?raw.limitations:[],
  syntheticPassed:Boolean(raw.checks.contradiction_test_passed),
  independent:0,corrections:0};
}
export function test713(){const a=assess713({schema:713,audit:{checked:1,flagged:0,rows:[],conflict_pairs:[]},checks:{synthetic_holdout:{tested:13},contradiction_test_passed:true},phase7_closure:'technisch_abgeschlossen_mit_offenen_wahrheitsfragen'});return {passed:Number(a.available)+Number(a.checked===1)+Number(a.holdout.tested===13)+Number(a.syntheticPassed),total:4};}
