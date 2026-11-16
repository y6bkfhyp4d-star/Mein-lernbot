import {TYPES,zone} from './world.js';
const KEY='lernbot7.phase52.memory.v1';
export function emptyMemory(){return{version:1,episodes:0,biomes:{},recent:[]};}
export function safeMemory(raw){const out=emptyMemory();if(!raw||typeof raw!=='object')return out;out.episodes=Math.max(0,Math.min(100000,Math.floor(Number(raw.episodes)||0)));for(const [b,records] of Object.entries(raw.biomes||{})){if(!Array.isArray(records)||records.length!==3)continue;out.biomes[b]=records.map(arr=>Array.from({length:4},(_,i)=>({seen:Math.max(0,Math.min(100000,Number(arr?.[i]?.seen)||0)),found:Math.max(0,Math.min(100000,Number(arr?.[i]?.found)||0))})));}out.recent=Array.isArray(raw.recent)?raw.recent.slice(-20):[];return out;}
export function loadMemory(){try{return safeMemory(JSON.parse(localStorage.getItem(KEY)));}catch{return emptyMemory();}}
export function saveMemory(m){try{localStorage.setItem(KEY,JSON.stringify(safeMemory(m)));return true;}catch{return false;}}
export function learn(m,s){const biome=s.world.biome;const records=m.biomes[biome]||TYPES.map(()=>Array.from({length:4},()=>({seen:0,found:0})));for(const t of s.known.values()){if(t.wall||t.site)continue;const z=zone(t);for(let i=0;i<TYPES.length;i++){records[i][z].seen++;if(s.seenResources.get(`${t.x},${t.y}`)===TYPES[i])records[i][z].found++;}}m.biomes[biome]=records;m.episodes++;m.recent.push({seed:s.world.seed,biome,success:s.success,steps:s.steps,known:s.known.size});m.recent=m.recent.slice(-20);return m;}
export function probability(m,biome,type,p){const row=m?.biomes?.[biome]?.[TYPES.indexOf(type)]?.[zone(p)];return row?(row.found+1)/(row.seen+8):0.125;}
export function summary(m){return{episodes:m.episodes,biomes:Object.fromEntries(Object.entries(m.biomes).map(([b,v])=>[b,v.map((arr,i)=>({type:TYPES[i],zones:arr.map(x=>({observed:x.seen,resources:x.found}))}))]))};}
export const memoryKey=KEY;
