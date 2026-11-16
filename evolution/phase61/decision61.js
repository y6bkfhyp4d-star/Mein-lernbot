/** Phase 6.1 – alle Vorschläge werden genau einmal als angenommen oder abgelehnt verbucht. */
const V={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]};
function sameMove(a,base){if(!V[a]||base?.type!=='move')return false;return V[a][0]===base.dx&&V[a][1]===base.dy;}
export function arbitrate61({base,allowed,energy,previewChoice,previewAdv,q,visits}){
 const normal=allowed.includes('follow')?'follow':allowed[0];
 const baseline=Number(q[normal]||0);
 const ranked=allowed.filter(a=>V[a]).map(a=>({label:a,value:Number(q[a]||0),margin:Number(q[a]||0)-baseline})).sort((a,b)=>b.margin-a.margin);
 const best=ranked[0];const proposal=best?.margin>=0.5?best:null;
 const finish=(choice,reason,accepted=false)=>({choice,reason,proposed:!!proposal,accepted:!!proposal&&accepted,rejected:!!proposal&&!accepted,
   proposal:proposal?.label||null,qFollow:baseline,qCandidate:proposal?.value??null,qMargin:proposal?Number(proposal.margin.toFixed(3)):null,
   visits,actionEquivalent:!!proposal&&sameMove(proposal.label,base),
   previewChoice,previewAdv:Number(previewAdv||0),physicalChange:!!proposal&&accepted&&choice!=='follow'&&!sameMove(choice,base),
   candidateScores:ranked.slice(0,4)});
 if(!proposal)return finish(normal,'q_kein_vorteil');
 if(base?.type!=='move')return finish(normal,'missionsaktion_geschuetzt');
 if(energy<=6)return finish(normal,'energieschutz');
 if(visits<20)return finish(normal,'q_zu_wenig_erfahrung');
 if(proposal.margin<1.5)return finish(normal,'q_vorteil_zu_klein');
 if(sameMove(proposal.label,base))return finish(normal,'q_gleiche_ausgefuehrte_aktion',true);
 if(previewChoice!=='follow'&&previewChoice!==proposal.label&&previewAdv>3.8)return finish(normal,'vorschau_widerspricht_q');
 return finish(proposal.label,'q_physische_abweichung',true);
}
