(() => {
"use strict";
const $=id=>document.getElementById(id);
const KEY="meinLernBot.v1";
const seed=[
["Hallo Hi Guten Tag","Hallo! Schön, dass du da bist. Tippe „hilfe“, um zu sehen, was ich kann."],
["Notfall","Bei akuter Gefahr zuerst 112 anrufen (Rettungsdienst und Feuerwehr). Polizei: 110. Nenne zuerst den genauen Ort und beschreibe kurz, was passiert ist. Stelle das Telefon auf Lautsprecher und befolge die Anweisungen der Leitstelle. Ich bin kein Ersatz für den Notruf."],
["Notruf Nummer Polizei Feuerwehr Krankenwagen","112: Rettungsdienst und Feuerwehr. 110: Polizei. 116 117: ärztlicher Bereitschaftsdienst bei dringenden, nicht lebensbedrohlichen Beschwerden. Bei unmittelbarer Lebensgefahr immer 112."],
["Herzstillstand Wiederbelebung Reanimation","Bei Bewusstlosigkeit und keiner normalen Atmung sofort 112 wählen, Lautsprecher einschalten und den Anweisungen der Leitstelle folgen. Beginne unverzüglich mit Wiederbelebung, wenn du dazu aufgefordert wirst oder entsprechend geschult bist. Einen AED holen lassen und dessen Sprachanweisungen befolgen."],
["Bewusstlos Seitenlage","Bei Bewusstlosigkeit sofort 112 rufen und die Atmung prüfen. Atmet die Person normal, bringe sie – sofern keine Verletzung dagegenspricht – in die stabile Seitenlage und kontrolliere die Atmung weiter. Bei fehlender oder nicht normaler Atmung: 112 und Wiederbelebung nach Anleitung der Leitstelle."],
["Blutung Wunde blutet","Bei starker Blutung sofort 112 rufen und mit einem sauberen Tuch oder Verband direkten, festen Druck auf die Wunde ausüben. Die Anweisungen der Leitstelle befolgen."],
["Verbrennung verbrannt Verbrühung","Bei einer Verbrennung die Stelle von der Hitzequelle entfernen. Keine Eiswürfel, Hausmittel oder Salben verwenden. Bei größeren, tiefen oder kritischen Verbrennungen sowie Atemproblemen 112 rufen. Folge den Anweisungen der Leitstelle."],
["Schlaganfall","Mögliche Zeichen: plötzlich hängender Mundwinkel, Schwäche oder Taubheit auf einer Seite, Sprach- oder Sehstörungen. Sofort 112 rufen und den Zeitpunkt merken, zu dem die Symptome begonnen haben. Nichts essen oder trinken geben."],
["Herzinfarkt Brustschmerzen","Bei Verdacht auf Herzinfarkt – zum Beispiel Druck oder Schmerzen in der Brust, Atemnot, kalter Schweiß oder Übelkeit – sofort 112 rufen. Die Person nicht allein lassen und den Anweisungen der Leitstelle folgen."],
["Vergiftung vergiftet Gift","Kein Erbrechen auslösen und keine Hausmittel geben. Verpackung oder Stoff bereithalten. Bei Bewusstlosigkeit, Krämpfen, Atemnot oder akuter Gefahr 112 rufen. Bei unklarer Vergiftung ohne schwere Symptome ein Giftinformationszentrum kontaktieren."],
["Brand Feuer brennt","Menschen warnen, Gebäude verlassen, Türen hinter sich schließen und keinen Aufzug benutzen. Von draußen 112 rufen. Bei Rauch möglichst niedrig bleiben. Nur löschen, wenn das gefahrlos möglich ist. Brennendes Fett niemals mit Wasser löschen."],
["Wer bist du Was kannst du","Ich bin ein lokaler Lern-Chatbot. Ich speichere Wissen auf diesem Gerät und kann aus deinen Eingaben lernen. Ich habe kein eigenes Internet und kann Fehler machen. Bei medizinischen Notfällen immer 112."]
];
const help=`So bringst du mir etwas bei:

• lerne: Die Hauptstadt von Frankreich = Paris
• lerne: Quantenphysik
• lerne kategorie Tier: Der Hund bellt
• ordne ein: Das Pferd galoppiert
• grundwissen laden
• was weißt du?
• vergiss: Paris
• verlauf löschen
• hilfe

Ich arbeite lokal. Meine Ähnlichkeitssuche ist einfach und kann Fragen falsch zuordnen. Bei akuter Gefahr immer 112 wählen.`;
let data;
try{data=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
if(!data||typeof data!=="object")data={qa:[],classes:[],log:[],pending:null,theme:"dark"};
data.qa=Array.isArray(data.qa)?data.qa:[];data.classes=Array.isArray(data.classes)?data.classes:[];data.log=Array.isArray(data.log)?data.log:[];
const save=()=>{data.log=data.log.slice(-150);try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){alert("Speicher voll oder nicht verfügbar. Exportiere dein Wissen zur Sicherung.")}};
const norm=s=>String(s).toLocaleLowerCase("de").replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
const stop=new Set("der die das den dem des ein eine einen einem einer ist sind war was wer wie wo wann und oder von zu in im am an auf für mit ich du es mir dir wir ihr sie bitte mal denn also".split(" "));
function toks(s){return norm(s).split(" ").filter(w=>w.length>1&&!stop.has(w)).map(w=>{if(w.length>6){for(const x of ["ern","en","er","es","e","n","s"])if(w.endsWith(x)&&w.length-x.length>=4)return w.slice(0,-x.length)}return w})}
function grams(s){s=" "+norm(s)+" ";let a=[];for(let i=0;i<s.length-2;i++)a.push(s.slice(i,i+3));return a}
function counts(a){let m={};a.forEach(x=>m[x]=(m[x]||0)+1);return m}
function cosine(a,b){let keys=Object.keys(a),dot=keys.reduce((v,k)=>v+a[k]*(b[k]||0),0),na=Math.sqrt(keys.reduce((v,k)=>v+a[k]**2,0)),nb=Math.sqrt(Object.values(b).reduce((v,x)=>v+x*x,0));return na&&nb?dot/(na*nb):0}
function sim(a,b){return .68*cosine(counts(toks(a)),counts(toks(b)))+.32*cosine(counts(grams(a)),counts(grams(b)))}
function best(q){let bi=-1,bs=0;data.qa.forEach((x,i)=>{let s=sim(q,x.k||"");if(s>bs){bs=s;bi=i}});return {i:bi,s:bs}}
function addSeed(){let known=new Set(data.qa.map(x=>norm(x.k)));let n=0;seed.forEach(([k,a])=>{if(!known.has(norm(k))){data.qa.push({k,a,source:"seed"});n++}});save();return n}
if(!data.seeded){addSeed();data.seeded=true;save()}
function learn(q,a){if(!q.trim()||!a.trim())return"Frage und Antwort dürfen nicht leer sein.";let b=best(q);if(b.i>=0&&b.s>.94){data.qa[b.i]={k:q,a,source:"user"};save();return"Vorhandenen Eintrag aktualisiert."}data.qa.push({k:q,a,source:"user"});save();return"Gelernt! Ich habe jetzt "+data.qa.length+" Wissenseinträge."}
function classify(t){let groups={};data.classes.forEach(x=>(groups[x.c]??=[]).push(x.t));let names=Object.keys(groups);if(names.length<2)return"Ich brauche Beispiele aus mindestens zwei Kategorien.\nlerne kategorie Tier: Der Hund bellt";let words=toks(t),vocab=new Set();Object.values(groups).flat().forEach(x=>toks(x).forEach(w=>vocab.add(w)));let total=data.classes.length,scores=names.map(n=>{let c={};let count=0;groups[n].forEach(x=>toks(x).forEach(w=>{c[w]=(c[w]||0)+1;count++}));let s=Math.log(groups[n].length/total);words.forEach(w=>s+=Math.log(((c[w]||0)+.5)/(count+.5*(vocab.size+1))));return [n,s/Math.sqrt(Math.max(1,words.length))]}).sort((a,b)=>b[1]-a[1]);let ex=scores.map(x=>Math.exp(Math.max(-30,(x[1]-scores[0][1])*2.5))),z=ex.reduce((a,b)=>a+b,0);return`Ich tippe auf: ${scores[0][0]} (${Math.round(ex[0]/z*100)} %)\nDie Prozentwerte sind nur grobe Vergleichswerte.`}
function handle(t){
 let low=t.toLocaleLowerCase("de"),m;
 if(/(selbstmord|suizid|umbringen|nicht mehr leben|sterben (will|möchte)|töten will|ritzen|selbstverletz)/i.test(t))return"Das klingt ernst. Bitte bleib damit nicht allein und sprich jetzt mit einer vertrauten Person. Die TelefonSeelsorge erreichst du kostenlos unter 0800 111 0 111, 0800 111 0 222 oder 116 123. Bei unmittelbarer Gefahr ruf 112.";
 if(data.pending){let q=data.pending;data.pending=null;if(/^(abbrechen|egal|nein|stop|lass es)$/.test(low)){save();return"Okay, ich lerne dazu nichts."}let r=learn(q,t);return r+"\nAuf „"+q+"“ werde ich künftig so antworten: „"+t+"“"}
 if(/^(hilfe|help|\?)$/.test(low))return help;
 if(low==="grundwissen laden")return "Grundwissen ergänzt: "+addSeed()+" neue Einträge.";
 if(low==="verlauf löschen"){data.log=[];save();return"Chatverlauf gelöscht. Dein gelerntes Wissen bleibt erhalten."}
 if(/^(was weißt du|was hast du gelernt|zeig.*gelernt)/i.test(t))return data.qa.length?"Gelernt:\n"+data.qa.map(x=>"• "+x.k+" → "+(x.a||"(nur gemerkt)")).join("\n"):"Noch nichts gelernt.";
 if(m=t.match(/^(?:lerne|lern|merk dir|merke dir|speichere)\s*:?\s+(.+)$/i)){let b=m[1],c=b.match(/^kategorie\s+([^:]+?)\s*:\s*(.+)$/i);if(c){data.classes.push({t:c[2],c:c[1]});save();return`Gespeichert: „${c[2]}“ gehört zu „${c[1]}“.`}let p=b.match(/^(.+?)\s*(?:=>|->|=)\s*(.+)$/);if(p)return learn(p[1],p[2]);data.qa.push({k:b,a:null,source:"user"});save();return"Okay, gemerkt. Mit „lerne: Frage = Antwort“ kannst du mir eine Antwort beibringen."}
 if(m=t.match(/^(?:ordne ein|einordnen|kategorie\?)\s*:?\s*(.+)$/i))return classify(m[1]);
 if(low==="vergiss alles")return"Zum Schutz vor versehentlichem Löschen: Tippe „ALLES LÖSCHEN“ zum Bestätigen.";
 if(low==="alles löschen"){data.qa=[];data.classes=[];data.pending=null;save();return"Dein gelerntes Wissen und die Kategorien wurden gelöscht."}
 if(m=t.match(/^vergiss\s*:?\s+(.+)$/i)){let b=best(m[1]);if(b.i<0||b.s<.28)return"Dazu finde ich nichts.";let x=data.qa.splice(b.i,1)[0];save();return`Vergessen: „${x.k}“`}
 let b=best(t);if(b.i>=0&&b.s>=.34){let x=data.qa[b.i],a=x.a||"Das habe ich gelernt: "+x.k;return b.s<.43?"Ich bin nicht ganz sicher, aber vielleicht meinst du:\n"+a:a}
 data.pending=t;save();return"Das weiß ich noch nicht. Wie soll ich darauf antworten? Schreib die Antwort oder „abbrechen“.";
}
function bubble(role,text,store=true){let d=document.createElement("div");d.className="msg "+role;d.textContent=text;$("log").appendChild(d);$("log").scrollTop=$("log").scrollHeight;if(store){data.log.push({role,text});save()}}
function send(text){text=(text??$("input").value).trim();if(!text)return;$("input").value="";bubble("user",text);bubble("bot",handle(text))}
$("bar").addEventListener("submit",e=>{e.preventDefault();send()});
$("menu").onclick=()=>$("drawer").classList.toggle("open");
document.querySelectorAll("[data-msg]").forEach(b=>b.onclick=()=>send(b.dataset.msg));
document.querySelectorAll("[data-cmd]").forEach(b=>b.onclick=()=>{let c=b.dataset.cmd;$("drawer").classList.remove("open");if(c==="theme"){document.body.classList.toggle("light");return}if(c==="export"){let blob=new Blob([JSON.stringify({qa:data.qa,classes:data.classes},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mein-lernbot-wissen.json";a.click();URL.revokeObjectURL(url);return}if(c==="import"){$("filepick").click();return}send(c)});
const picker=document.createElement("input");picker.type="file";picker.accept=".json,application/json";picker.hidden=true;picker.id="filepick";document.body.appendChild(picker);picker.onchange=()=>{let f=picker.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!Array.isArray(x.qa)||!Array.isArray(x.classes))throw Error();data.qa=x.qa;data.classes=x.classes;save();bubble("bot","Wissen importiert.")}catch(e){bubble("bot","Datei konnte nicht importiert werden.")}};r.readAsText(f)};
if(data.log.length)data.log.forEach(x=>bubble(x.role,x.text,false));else bubble("bot","Hallo! Ich bin dein LernBot. Du kannst mir Fragen stellen oder Wissen beibringen.",false);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
})();