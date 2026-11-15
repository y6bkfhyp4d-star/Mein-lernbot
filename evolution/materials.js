// Phase 2: Deterministische Materialregeln. Keine externen Abhängigkeiten.
export const MATERIALS = Object.freeze({
  wood: {name:'Holz',color:'#a87543',mass:4,hardness:3,conductivity:2,heatLimit:75,energy:9},
  stone:{name:'Stein',color:'#8b96a8',mass:9,hardness:8,conductivity:3,heatLimit:140,energy:0},
  metal:{name:'Metall',color:'#60a5fa',mass:8,hardness:9,conductivity:9,heatLimit:180,energy:0},
  crystal:{name:'Kristall',color:'#c084fc',mass:5,hardness:6,conductivity:7,heatLimit:95,energy:18},
  water:{name:'Wasser',color:'#06b6d4',mass:3,hardness:0,conductivity:5,heatLimit:100,energy:0}
});
export const MATERIAL_KEYS=Object.keys(MATERIALS);
export function makeObject(type,id,random){
  if(!MATERIALS[type])throw Error('Unbekanntes Material');
  return {id,type,temp:Math.round(12+random()*35),integrity:100,charged:false,experiments:0};
}
export function publicObject(o){
  const m=MATERIALS[o.type];
  return {id:o.id,erscheinung:m.name,temperatur:o.temp,stabilitaet:o.integrity,untersucht:o.experiments>0};
}
export function experiment(o,action){
  const m=MATERIALS[o.type];
  if(!['touch','heat','cool'].includes(action))throw Error('Ungültiges Experiment');
  if(o.integrity<=0)return {message:'Objekt bereits zerfallen',energyCost:1};
  o.experiments++;
  let message='';
  if(action==='touch'){
    message=`Berührung: ${m.name}; Härte ${m.hardness}/10, Masse ${m.mass}/10.`;
  }else if(action==='heat'){
    o.temp+=20;
    if(o.temp>=m.heatLimit){o.integrity=Math.max(0,o.integrity-25);message=`Erhitzt: ${m.name} verliert Stabilität.`;}
    else message=`Erhitzt: Temperatur jetzt ${o.temp} °C.`;
  }else{
    o.temp=Math.max(-20,o.temp-20);
    message=`Abgekühlt: Temperatur jetzt ${o.temp} °C.`;
  }
  if(o.type==='crystal'&&o.temp>=60&&o.integrity>0){o.charged=true;message+=' Kristall reagiert und lädt sich auf.';}
  if(o.type==='water'&&o.temp>=100){message+=' Wasser verdampft teilweise.';o.integrity=Math.max(0,o.integrity-15);}
  return {message,energyCost:action==='touch'?1:3,discovery:{type:o.type,hardness:m.hardness,mass:m.mass,conductivity:m.conductivity,heatLimit:m.heatLimit,energy:m.energy}};
}
