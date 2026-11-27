import {connect} from '../auth/firebase.js';
import {firebaseConfig} from '../auth/firebase-config.js';
import {makeRun,move,step} from './simulation.js';
import {createWorld} from './world.js';
import {createCanvasWorld} from './fallback.js';
const el=id=>document.getElementById(id);
const status=t=>el('status').textContent=t;
const defaults=['السلام عليكم','هل أنت مستعد؟','هيا نبدأ','أحسنت!','مبارك الفوز','نلعب مرة أخرى؟','شكرًا لك','إلى اللقاء'];
let api,db,user,room,slot,run,graphics,offset=0,phrases={},remote=null,peer=null,unsub=[],epoch=0,lastSent=0,finished=false,playing=false,frameId=0,clock=0,seen=0,waiting=false;
const path=p=>api.ref(db,p);
const now=()=>Date.now()+offset;
const notice=e=>{console.warn(e);status('تعذّر الاتصال أو تنفيذ الطلب. حاول مجددًا.');};
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const listen=(p,fn)=>unsub.push(api.onValue(path(p),s=>fn(s.val()),notice));
const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;return b;};
function renderPhrases(){
 el('phrases').replaceChildren();
 Object.entries(phrases).sort((a,b)=>a[1].order-b[1].order).filter(([,v])=>v.enabled).forEach(([id,v])=>el('phrases').append(button(v.text,()=>{if(room&&slot)api.set(path('races/'+room+'/chat/'+slot),{phrase:id,at:api.serverTimestamp()}).catch(notice);})));
}
function editRows(){
 const rows=el('phraseRows');rows.replaceChildren();
 const list=Object.entries(phrases).sort((a,b)=>a[1].order-b[1].order);
 for(const [id,v] of list){
  const row=document.createElement('div');row.dataset.id=id;
  const input=document.createElement('input');input.maxLength=80;input.value=v.text;
  const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=v.enabled;enabled.setAttribute('aria-label','إظهار العبارة');
  row.append(input,enabled,button('↑',()=>{if(row.previousElementSibling)rows.insertBefore(row,row.previousElementSibling);}),button('↓',()=>{if(row.nextElementSibling)rows.insertBefore(row.nextElementSibling,row);}),button('حذف',()=>row.remove()));rows.append(row);
 }
}
function addRow(){const row=document.createElement('div');row.dataset.id=crypto.randomUUID();const input=document.createElement('input');input.maxLength=80;input.placeholder='العبارة';const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=true;row.append(input,enabled,button('↑',()=>{if(row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);}),button('↓',()=>{if(row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row);}),button('حذف',()=>row.remove()));el('phraseRows').append(row);}
async function leave(){
 const old=room,side=slot;room=null;slot=null;waiting=false;playing=false;cancelAnimationFrame(frameId);unsub.splice(0).forEach(fn=>fn());
 el('track').hidden=el('chat').hidden=true;el('lobby').hidden=false;el('invite').disabled=false;el('cancel').hidden=true;el('messages').replaceChildren();remote=peer=null;
 if(old){if(side==='host')await api.remove(path('raceLobby/'+old)).catch(()=>{});await api.set(path('races/'+old+'/left/'+side),true).catch(()=>{});}
 status('اختر منافسًا للعب.');
}
async function invite(){
 if(room)return;el('invite').disabled=true;
 const id=api.push(path('races')).key;const seed=crypto.getRandomValues(new Uint32Array(1))[0];
 try{await api.set(path('races/'+id),{host:user.uid,seed,created:api.serverTimestamp()});
 room=id;slot='host';waiting=true;
 await api.onDisconnect(path('races/'+id+'/left/host')).set(true);
 await api.onDisconnect(path('raceLobby/'+id)).remove();
 await api.set(path('raceLobby/'+id),{created:api.serverTimestamp()});
 el('cancel').hidden=false;status('بانتظار منافس...');
 watchRoom();
 }catch(e){await leave();notice(e);}
}
async function join(id){
 if(room)return;el('invite').disabled=true;
 try{await api.set(path('races/'+id+'/guest'),{uid:user.uid,at:api.serverTimestamp()});room=id;slot='guest';
 await api.onDisconnect(path('races/'+id+'/left/guest')).set(true);
 await api.remove(path('raceLobby/'+id)).catch(()=>{});
 watchRoom();
 }catch(e){el('invite').disabled=false;notice(e);}
}
function watchRoom(){
 const id=room,other=slot==='host'?'guest':'host';
 listen('races/'+id,v=>{
 if(!v||room!==id)return;
 if(v.left?.[other]){if(!playing){leave();status('غادر المنافس.');return;}peer={...(peer||{}),out:true};}
 if(v.guest&&!playing&&!finished&&!v.left?.[other]){waiting=false;epoch=v.guest.at+5000;start(v.seed);}
 peer=v.left?.[other]?{...(v.state?.[other]||{}),out:true}:v.state?.[other]||null;
 const msg=v.chat?.[other];if(msg&&msg.at>seen){seen=msg.at;const phrase=phrases[msg.phrase];if(phrase?.enabled){const p=document.createElement('p');p.textContent='المنافس: '+phrase.text;el('messages').append(p);while(el('messages').children.length>8)el('messages').firstChild.remove();}}
 });
}
function start(seed){
 playing=true;finished=false;seen=0;clock=0;lastSent=0;remote=null;
 el('lobby').hidden=true;el('track').hidden=el('chat').hidden=false;
 try{if(!graphics){const c=el('world');let ctx;try{ctx=c.getContext('webgl2',{antialias:true});}catch{}if(ctx)try{graphics=createWorld(c,ctx);}catch{}if(!graphics){c.hidden=true;el('worldFallback').hidden=false;graphics=createCanvasWorld(el('worldFallback'));}}graphics.resize();
 run=makeRun(['mohammad','habiba'],seeded(seed));run.players.forEach(p=>{p.x=0;p.lane=0;});run.players[slot==='host'?1:0].out=true;graphics.reset(run);
 frameId=requestAnimationFrame(tick);
 }catch(e){leave();notice(e);}
}
function tick(){
 if(!playing||!room)return;
 const me=slot==='host'?0:1,other=1-me,p=run.players[me];
 const elapsed=Math.max(0,(now()-epoch)/1000);
 if(now()<epoch){el('onlineHud').textContent='استعد: '+Math.ceil((epoch-now())/1000);graphics.draw(run,0);frameId=requestAnimationFrame(tick);return;}
 if(elapsed-clock>3){leave();status('انقطع الاتصال أو توقفت اللعبة. ابدأ جولة جديدة.');return;}
 while(clock+1/90<=elapsed){step(run,1/90);clock+=1/90;}
 const snapshot={x:p.x,y:p.y,slide:p.slide,glide:p.glide,out:p.out,stars:p.stars,distance:p.distance,at:api.serverTimestamp()};
 if(now()-lastSent>=200){lastSent=now();api.set(path('races/'+room+'/state/'+slot),snapshot).catch(notice);}
 const ghost=run.players[other];
 if(peer){const original={...ghost};Object.assign(ghost,peer,{avatar:original.avatar,shield:0,support:null});graphics.draw(run,run.time);Object.assign(ghost,original);}else graphics.draw(run,run.time);
 el('onlineHud').textContent='أنت: '+Math.floor(p.distance)+' م · ★ '+p.stars+' | المنافس: '+Math.floor(peer?.distance||0)+' م · ★ '+(peer?.stars||0);
 if(p.out&&peer?.out){finished=true;playing=false;const a=p.distance,b=peer.distance||0;status(a>b?'فزت بالسباق!':a<b?'فاز المنافس!':'تعادل اللاعبان!');return;}
 status(p.out?'خرجت من السباق، بانتظار نتيجة المنافس.':'السباق جارٍ');
 frameId=requestAnimationFrame(tick);
}
function command(c){if(playing&&now()>=epoch&&run)move(run.players[slot==='host'?0:1],c);}
document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();command(b.dataset.move);}));
window.addEventListener('keydown',e=>{if(!playing||e.repeat||/INPUT|TEXTAREA/.test(e.target.tagName))return;const c={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',ArrowDown:'down',Space:'jump',KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'down'}[e.code];if(c){e.preventDefault();command(c);}});
el('invite').onclick=invite;el('cancel').onclick=leave;el('leave').onclick=()=>{finished=false;leave();};
el('addPhrase').onclick=addRow;
el('savePhrases').onclick=async()=>{const next={};for(const [order,row] of [...el('phraseRows').children].entries()){const [input,enabled]=row.querySelectorAll('input');const text=input.value.trim();if(!text||text.length>80){status('أدخل عبارة صحيحة.');return;}next[row.dataset.id]={text,enabled:enabled.checked,order};}if(Object.keys(next).length>40){status('الحد الأقصى ٤٠ عبارة.');return;}try{await api.set(path('racePhrases'),next);status('حُفظت العبارات.');}catch(e){notice(e);}};
try{
 const conn=await connect();user=conn?.auth.currentUser;
 if(!user?.emailVerified){status('ينبغي تسجيل الدخول بحساب موثق للعب عبر الإنترنت.');}
 else{
 api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js');db=api.getDatabase(conn.auth.app,firebaseConfig.databaseURL);
 api.onValue(path('.info/serverTimeOffset'),s=>offset=s.val()||0);
 api.onValue(path('racePhrases'),s=>{phrases=s.val()||{};renderPhrases();if(!el('editor').hidden)editRows();},notice);
 api.onValue(api.query(path('raceLobby'),api.orderByChild('created'),api.startAt(now()-120000),api.limitToLast(30)),s=>{el('offers').replaceChildren();s.forEach(c=>{if(c.key===room)return;const row=document.createElement('div');row.append(document.createTextNode('لاعب ينتظر منافسًا'),button('أنا!',()=>{finished=false;join(c.key);}));el('offers').append(row);});},notice);
 el('lobby').hidden=false;status('اختر منافسًا للعب.');
 if(user.email==='quraaty@gmail.com'){el('editor').hidden=false;editRows();const snap=await api.get(path('racePhrases'));if(!snap.exists()){const initial={};defaults.forEach((text,order)=>initial['p'+order]={text,order,enabled:true});await api.set(path('racePhrases'),initial);}}
 }
}catch(e){notice(e);}
