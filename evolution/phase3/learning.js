export const EXPERIMENTS=['touch','heat','cool'];
export function createBrain(){return {counts:{},results:{},history:[],total:0,novel:0};}
export function chooseExperiment(brain,world,random,mode='curious'){
 const objects=Object.entries(world.objects).filter(([i])=>world.cells[Number(i)]==='object');
 if(!objects.length)return null;
 if(mode==='random'){
  const [index,obj]=objects[Math.floor(random()*objects.length)];
  return {index:Number(index),type:obj.type,action:EXPERIMENTS[Math.floor(random()*EXPERIMENTS.length)]};
 }
 // Only discovered appearance/type is used; hidden material parameters are not read.
 const options=[];
 for(const [index,obj] of objects){
  for(const action of EXPERIMENTS){
   const key=obj.type+':'+action,n=brain.counts[key]||0;
   // Prefer never-tested material/action pairs; small deterministic jitter breaks ties.
   const score=1/(1+n)+random()*.001;
   options.push({index:Number(index),type:obj.type,action,score});
  }
 }
 options.sort((a,b)=>b.score-a.score);
 return options[0];
}
export function recordExperiment(brain,world,choice,result){
 const key=choice.type+':'+choice.action;
 brain.counts[key]=(brain.counts[key]||0)+1;
 brain.total++;
 const discovered=world.knowledge[choice.type]||{};
 const fields=Object.keys(discovered);
 const known=brain.results[choice.type]||[];
 const added=fields.filter(x=>!known.includes(x));
 if(added.length)brain.novel++;
 brain.results[choice.type]=[...new Set([...known,...fields])];
 brain.history.push({step:world.steps,type:choice.type,action:choice.action,newFields:added,message:result.event});
 if(brain.history.length>120)brain.history.shift();
 return added;
}
export function scoreBrain(brain){return {experiments:brain.total,novelExperiments:brain.novel,knownProperties:Object.values(brain.results).reduce((s,x)=>s+x.length,0),types:Object.keys(brain.results).length};}
export function runTrial(seed,mode,createWorld,inspectAtWorld,rng,limit=35){
 const world=createWorld(seed),brain=createBrain(),random=rng(seed^0x5A17);
 for(let i=0;i<limit&&world.alive;i++){
  const choice=chooseExperiment(brain,world,random,mode);
  if(!choice)break;
  const result=inspectAtWorld(world,choice.index,choice.action);
  recordExperiment(brain,world,choice,result);
 }
 return {brain,world,score:scoreBrain(brain)};
}
