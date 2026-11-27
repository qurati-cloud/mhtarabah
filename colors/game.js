import {pour,won,complete,palette,symbols} from './model.js';
import {showMedia,clearMedia} from './media.js';
const el=id=>document.getElementById(id);
const text=id=>document.querySelector('[data-text-key="colors:'+id+'"]').textContent;
const store='mh-colors-v1',reward='mh-colors-lantern';
let saved={};
try{saved=JSON.parse(localStorage.getItem(store)||'{}')||{};}catch{}
const best=saved.best&&typeof saved.best==='object'&&!Array.isArray(saved.best)?saved.best:{};
let stages,level=0,board,history,selected,target,worker,look,locked=false;
const day=86400000, epoch=Date.UTC(2026,10,27);
const isoToday=()=>{const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const copy=id=>el('status').textContent=text(id);
let moves=0, advanceTimer;
function scheduleAdvance(){
 clearTimeout(advanceTimer);
 if(!won(board)||level>=stages.length-1||level>=unlockedLevel())return;
 const completed=level;
 advanceTimer=setTimeout(()=>{if(level===completed&&won(board))setLevel(completed+1);},1000);
}
function unlockedLevel(){
 let index=0;
 while(index<stages.length-1&&Number.isInteger(best[index])&&best[index]>0)index++;
 return index;
}
function render(){
 el('tubes').replaceChildren();el('lamps').replaceChildren();
 const colors=new Set(stages[level].b.flat());
 const lit=new Set(board.filter(complete).map(t=>t[0]));
 for(const color of colors){
  const lamp=document.createElement('span');lamp.className='lamp'+(lit.has(color)?' lit':'');
  lamp.style.setProperty('--liquid',palette[color]);el('lamps').append(lamp);
 }
 board.forEach((tube,i)=>{
  const button=document.createElement('button');button.type='button';
  button.className='tube'+(target===i?' hint-target':'');
  button.setAttribute('aria-pressed',String(selected===i));
  button.setAttribute('aria-label',text('tube')+' '+(i+1)+' '+tube.map(c=>symbols[c]).join(' '));
  const glass=document.createElement('span');glass.className='glass';glass.setAttribute('aria-hidden','true');
  for(const color of tube){
   const liquid=document.createElement('span');liquid.className='liquid';
   liquid.style.setProperty('--liquid',palette[color]);liquid.textContent=symbols[color];glass.append(liquid);
  }
  const number=document.createElement('span');number.className='tube-num';number.textContent=i+1;
  button.append(glass,number);button.onclick=()=>choose(i);el('tubes').append(button);
 });
 el('moves').textContent=moves;
 el('best').textContent=Number.isInteger(best[level])?best[level]:'—';
 el('goal').textContent=text('goal')+' · '+stages[level].s.length;
 el('undo').disabled=!history.length;
 el('hint').disabled=won(board);
 const unlocked=unlockedLevel(), picker=el('level');
 el('prev').disabled=level===0;el('next').disabled=level>=unlocked;
 for(let i=picker.options.length;i<=unlocked;i++)picker.add(new Option(String(i+1),String(i)));
 picker.value=String(level);
}
function setLevel(next,resume=false){
 if(!Number.isInteger(next)||next<0||next>=stages.length)return;
 if(next>unlockedLevel()){
  copy('locked');
  el('level').value=String(level);
  return;
 }
 clearTimeout(advanceTimer);
 level=next;
 const initial=stages[level].b;
 const prior=saved.board;
 const signature=b=>b.flat().sort((a,b)=>a-b).join(',');
 board=resume&&Array.isArray(prior)&&prior.length===initial.length&&prior.every(t=>Array.isArray(t)&&t.length<=4&&t.every(c=>Number.isInteger(c)&&c>=0&&c<palette.length))&&signature(prior)===signature(initial)?prior:initial;
 moves=board===prior&&Number.isInteger(saved.moves)&&saved.moves>=0?saved.moves:0;
 history=[];selected=target=undefined;locked=false;
 copy(won(board)?'finish':'ready');render();
 try{localStorage.setItem(store,JSON.stringify({level,best,board,moves}));}catch{}
}
function remember(){
 try{
  localStorage.setItem(store,JSON.stringify({level,best,board,moves}));
  if(Object.keys(best).length>=8)localStorage.setItem(reward,'1');
 }catch{}
 el('building-reward').hidden=Object.keys(best).length<8;
}
function choose(id){
 if(locked||won(board))return;
 if(selected===id){selected=target=undefined;render();return;}
 if(selected===undefined){if(board[id].length)selected=id;render();return;}
 const next=pour(board,selected,id);
 if(!next){copy('invalid');selected=board[id].length?id:undefined;target=undefined;render();return;}
 history.push({board,moves});
 board=next;moves++;selected=target=undefined;
 if(won(board)){
  best[level]=Math.min(best[level]||Infinity,moves);copy('finish');
 }else el('status').textContent='';
 remember();render();
 if(won(board))scheduleAdvance();
 const arrival=el('tubes').children[id]?.querySelector('.glass');
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)
  arrival?.animate?.([{transform:'rotate(-5deg)',filter:'brightness(1.4)'},{transform:'none'}],{duration:230});
}
function knownHint(){
 let known=stages[level].b;
 for(const [a,b] of stages[level].s){
  const map=[];const seen=new Set();
  for(const tube of known){
   const index=board.findIndex((other,i)=>!seen.has(i)&&other.join()===tube.join());
   if(index<0)break;seen.add(index);map.push(index);
  }
  if(map.length===board.length&&pour(board,map[a],map[b]))return [map[a],map[b]];
  known=pour(known,a,b);
 }
 return null;
}
function closeHint(){
 worker?.terminate();worker=undefined;locked=false;clearMedia();
 if(el('hint-dialog').open)el('hint-dialog').close();
}
el('close-hint').onclick=closeHint;
el('hint-dialog').addEventListener('close',closeHint);
el('hint').onclick=()=>{
 if(!board||won(board))return;
 el('hint-message').textContent='';
 el('show-hint').disabled=false;
 el('hint-dialog').showModal();showMedia(level);
};
function reveal(move){
 locked=false;worker?.terminate();worker=undefined;
 if(!move){el('hint-message').textContent=text('noHint');return;}
 closeHint();[selected,target]=move;copy('look');render();
}
el('show-hint').onclick=()=>{
 if(locked)return;
 const known=knownHint();if(known){reveal(known);return;}
 locked=true;el('show-hint').disabled=true;el('hint-message').textContent=text('thinking');
 try{
  const current=new Worker(new URL('./hint-worker.js',import.meta.url),{type:'module'});
  worker=current;
  const finish=result=>{if(worker===current)reveal(result);};
  current.onmessage=e=>finish(e.data);
  current.onerror=()=>finish(null);
  current.postMessage(board);
  setTimeout(()=>finish(null),4200);
 }catch{reveal(null);}
};
el('undo').onclick=()=>{clearTimeout(advanceTimer);const prev=history.pop();if(prev){({board,moves}=prev);selected=target=undefined;copy('ready');remember();render();}};
el('restart').onclick=()=>setLevel(level);
el('prev').onclick=()=>setLevel(level-1);
el('next').onclick=()=>setLevel(level+1);
el('level').onchange=e=>setLevel(Number(e.target.value));
el('daily').min='2026-11-27';el('daily').max=isoToday();
el('daily').onchange=e=>{
 const d=Date.parse(e.target.value);
 if(Number.isFinite(d)&&e.target.validity.valid)setLevel(Math.floor((d-epoch)/day)%stages.length);
};
new MutationObserver(()=>{if(board){render();if(!el('status').textContent||won(board))copy(won(board)?'finish':'ready');}}).observe(el('colors-copy'),{childList:true,subtree:true,characterData:true});
try{
 const response=await fetch(new URL('./levels.json',import.meta.url));
 if(!response.ok)throw Error('levels');
 stages=await response.json();
 const canResume=Number.isInteger(saved.level)&&saved.level>=0&&saved.level<=unlockedLevel();
 setLevel(canResume?saved.level:unlockedLevel(),canResume);
 remember();
 if(won(board))scheduleAdvance();
}catch{copy('loadError');document.querySelectorAll('.quay-actions button:not(#edit-hints),.quay-top select,.quay-top input').forEach(el=>el.disabled=true);}
