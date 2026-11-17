/** Live decision gate. Absolutely no imports from offline counterfactuals. */
const DIR={north:[0,-1],south:[0,1],west:[-1,0],east:[1,0]};
function same(label,base){return base?.type==='move'&&DIR[label]&&DIR[label][0]===base.dx&&DIR[label][1]===base.dy;}
export function arbitrate62({base,allowed,energy,previewChoice,previewAdv,q,visits}){
 const normal=allowed.includes('follow')?'follow':allowed[0];
 const follow=Number(q[normal]||0);
 const ranked=allowed.filter(a=>DIR[a]).map(label=>({label,value:Number(q[label]||0),margin:Number(q[label]||0)-follow})).sort((a,b)=>b.margin-a.margin);
 const best=ranked[0];const proposal=best?.margin>=0.5?best:null;
 const finish=(choice,reason,accepted=false)=>({choice,reason,proposed:!!proposal,accepted:!!proposal&&accepted,rejected:!!proposal&&!accepted,
   proposal:proposal?.label||null,qFollow:follow,qCandidate:proposal?.value??null,
   qMargin:proposal?Number(proposal.margin.toFixed(3)):null,visits,
   actionEquivalent:!!proposal&&same(proposal.label,base),
   previewChoice,previewAdv:Number(previewAdv||0),
   physicalChange:!!proposal&&accepted&&choice!=='follow'&&!same(choice,base),candidateScores:ranked.slice(0,4)});
 if(!proposal)return finish(normal,'q_kein_vorteil');
 if(base?.type!=='move')return finish(normal,'missionsaktion_geschuetzt');
 if(energy<=6)return finish(normal,'energieschutz');
 if(visits<20)return finish(normal,'q_zu_wenig_erfahrung');
 if(proposal.margin<1.5)return finish(normal,'q_vorteil_zu_klein');
 if(same(proposal.label,base))return finish(normal,'q_gleiche_ausgefuehrte_aktion',true);
 if(previewChoice!=='follow'&&previewChoice!==proposal.label&&previewAdv>3.8)return finish(normal,'vorschau_widerspricht_q');
 return finish(proposal.label,'q_physische_abweichung',true);
}
