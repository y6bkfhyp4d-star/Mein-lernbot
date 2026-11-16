/** Phase 6.0: Entscheidungsarchitektur mit getrennten Planer-, Lern- und Sicherheitsurteilen.
 * Keine verdeckten Karten-/Weltdaten; nur Eingaben aus dem Agenten-Blickfeld.
 * Die Q-Tabelle liefert eine Empfehlung, nicht automatisch die Entscheidung.
 */
const MOVES=new Set(['north','south','west','east']);
export function arbitrate60({base,allowed,energy,previewChoice,previewAdv,q,visits}){
 const permissible=new Set(allowed);
 const baseline=permissible.has('follow')?'follow':allowed[0];
 const candidates=allowed.filter(a=>MOVES.has(a));
 const baseScore=Number(q[baseline]||0);
 const proposals=candidates.map(a=>({a,score:Number(q[a]||0),margin:Number(q[a]||0)-baseScore})).sort((a,b)=>b.margin-a.margin);
 const best=proposals[0];
 const reply=(choice,reason,more={})=>({choice,reason,qAttempt:!!best&&best.margin>=0.5,qAccepted:false,qRejected:false,
  proposal:best?.a||null,qMargin:best?+best.margin.toFixed(2):null,trainingVisits:visits,...more});
 if(base?.type!=='move')return reply(baseline,'missionsaktion_geschuetzt');
 if(energy<=6)return reply(baseline,'energieschutz');
 if(!best||best.margin<0.5)return reply(baseline,'q_kein_vorteil');
 if(visits<20)return reply(baseline,'q_zu_wenig_erfahrung',{qRejected:true});
 // Convert abstract Q-value advantage to a bounded preference; planner remains conservative.
 if(best.margin<1.5)return reply(baseline,'q_vorteil_zu_klein',{qRejected:true});
 if(previewChoice!=='follow'&&previewChoice!==best.a&&previewAdv>3.8)
  return reply(previewChoice,'vorschau_widerspricht_q',{qRejected:true});
 // Never permit a pure 180-degree reversal immediately for a weak margin; visited-state risk is
 // handled in the surrounding short-horizon preview, not by reading unknown cells.
 return reply(best.a,'q_akzeptiert',{qAccepted:true});
}
