import {size,levels,pieces,key,water,start,dock,garden,square,loadBoard,height,surface,path,bridgeReady,gardenReady,squareReady,scenery,pier,pierReady,islandStart,islandGround,islandTreasure} from './model.js';

const el=id=>document.getElementById(id);
const copy=id=>document.querySelector('[data-text-key="town:'+id+'"]').textContent;
const canvas=el('town-view'), ctx=canvas.getContext('2d');
const saveKey='mh-neighborhood-v1';
let saved={};
try { saved=JSON.parse(localStorage.getItem(saveKey)||'{}')||{}; } catch {}
let board=loadBoard(saved.board), mission=Number.isInteger(saved.mission)?Math.min(3,Math.max(0,saved.mission)):0;
let avatar=saved.avatar==='habiba'?'habiba':'mohammad';
let player=Array.isArray(saved.player)&&saved.player.length===2&&surface(board,...saved.player)!==null?saved.player:[...start];
let mode=saved.mode==='free'?'free':'missions', tool='build', selected='wood';
const unlocked=new Set(Array.isArray(saved.unlocked)?saved.unlocked.filter(id=>islandTreasure.some(t=>t.id===id)):[]);
const found=new Set(Array.isArray(saved.found)?saved.found.filter(id=>islandTreasure.some(t=>t.id===id)):[]);
const point=saved.islandPosition;
let island=saved.island===true&&mission>=1;
let islandPosition=Array.isArray(point)&&point.length===2&&islandGround(...point)!==null?point:[...islandStart];
const undo=[], redo=[];
let route=[], nextStep=0, hover, pointer, panX=0,panY=0, zoom=1,width=0,heightPx=0,unit=23, hits=[];
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
const palette=el('palette');
for(const [type,[label,color]] of Object.entries(pieces)){
 const button=document.createElement('button');
 button.type='button';button.dataset.piece=type;
 const swatch=document.createElement('i');swatch.style.setProperty('--piece',color);
 const name=document.createElement('span');name.dataset.textKey='town:piece:'+type;name.textContent=label;
 button.append(swatch,name);palette.append(button);
 button.onclick=()=>{selected=type;setTool('build');};
}
for(const {id,piece:[label]} of islandTreasure){
 const button=document.createElement('button');
 button.type='button';button.dataset.treasure=id;
 button.dataset.textKey='town:treasure:'+id;
 button.textContent=label;
 button.onclick=()=>{
  if(!island||found.size!==islandTreasure.length||unlocked.has(id))return;
  unlocked.add(id);
  returnHome();
  el('status').textContent=copy('treasureSaved');
 };
 el('treasure-options').append(button);
}
function persist(){
 try {
  localStorage.setItem(saveKey,JSON.stringify({board:[...board],mission,player,avatar,mode,island,islandPosition,found:[...found],unlocked:[...unlocked]}));
  el('status').textContent=copy('saved');
 } catch { el('status').textContent=copy('storage'); }
}
const missionIds=['bridge','garden','square','done'];
function refresh(){
 const id=missionIds[mission];
 el('mission-card').hidden=mode==='free'||island;
 el('harbor-card').hidden=mission<1;
 const complete=found.size===islandTreasure.length;
 const all=unlocked.size===islandTreasure.length;
 el('harbor-instruction').textContent=island?
   copy(all?'allTreasure':complete?'chooseTreasure':'islandBody')+(!complete?' ('+found.size+' / 3)':''):
   copy(pierReady(board)?'boatBody':'pierBody');
 el('sail').hidden=island||!pierReady(board)||!same(player,dock);
 el('return-home').hidden=!island;
 el('treasure-options').hidden=!island||!complete||all;
 for(const button of el('treasure-options').children)button.hidden=unlocked.has(button.dataset.treasure);
 for(const button of palette.children){
  const id=button.dataset.piece;
  button.hidden=island||(islandTreasure.some(t=>t.id===id)&&!unlocked.has(id));
 }
 palette.hidden=island;
 for(const button of document.querySelectorAll('[data-tool]'))button.hidden=island&&button.dataset.tool!=='walk';
 el('reset').hidden=island;
 el('undo').hidden=el('redo').hidden=island;
 el('mission-title').textContent=copy(id+'Title');
 el('mission-description').textContent=copy(id+'Body');
 el('mission-count').textContent=mission<3?(mission+1)+' / 3':'✓';
 for(const id of ['mohammad','habiba'])el(id).setAttribute('aria-pressed',String(id===avatar));
 for(const id of ['missions','free'])el(id).setAttribute('aria-pressed',String(id===mode));
 el('undo').disabled=!undo.length;el('redo').disabled=!redo.length;
 draw();
}
function checkMission(){
 if(mode!=='missions'||island)return false;
 const won=mission===0&&same(player,dock)&&bridgeReady(board)||
  mission===1&&gardenReady(board)||mission===2&&squareReady(board);
 if(won)mission++;
 return won;
}
function update(){
 const won=checkMission();
 persist();
 if(won)el('status').textContent=copy('complete');
 refresh();
}
function setTool(value){
 tool=value;
 for(const button of document.querySelectorAll('[data-tool]'))button.setAttribute('aria-pressed',String(button.dataset.tool===tool));
 for(const button of palette.children)button.setAttribute('aria-pressed',String(button.dataset.piece===selected&&tool==='build'));
 draw();
}
document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>setTool(button.dataset.tool));
for(const id of ['mohammad','habiba'])el(id).onclick=()=>{avatar=id;update();};
for(const id of ['missions','free'])el(id).onclick=()=>{mode=id;update();};
function apply({id,before,after},reverse){
 const type=reverse?before:after;
 if(type)board.set(id,type);else board.delete(id);
 if(surface(board,...player)===null)player=[...start];
 route=[];
 update();
}
el('undo').onclick=()=>{const edit=undo.pop();if(edit){redo.push(edit);apply(edit,true);}};
el('redo').onclick=()=>{const edit=redo.pop();if(edit){undo.push(edit);apply(edit,false);}};
el('reset').onclick=()=>{
 if(!confirm(copy('confirm')))return;
 board.clear();mission=0;island=false;found.clear();player=[...start];undo.length=redo.length=0;route=[];panX=panY=0;update();
};
function returnHome(){
 island=false;route=[];panX=panY=0;
 center();update();
}
el('return-home').onclick=returnHome;
el('sail').onclick=()=>{
 if(mission<1||!same(player,dock)||!pierReady(board))return;
 island=true;route=[];found.clear();islandPosition=[...islandStart];
 setTool('walk');center();update();
};
function walk(to){
 const here=island?islandPosition:player;
 if(same(here,to))return;
 route=island?path(board,here,to,islandGround):path(board,here,to);
 if(!route.length)el('status').textContent=copy('blocked');
 else nextStep=0;
}
function interact(cell){
 if(!cell)return;
 const [x,z]=cell;
 if(island||tool==='walk'){walk(cell);return;}
 const y=height(board,x,z);
 if(same(cell,player)||same(cell,start)||tool==='remove'&&!y||
    scenery.has(x+','+z)||tool==='build'&&(y>=levels||board.get(key(x,z,y-1))==='tree'||selected==='tree'&&water(x,z))){
  el('status').textContent=copy('placement');return;
 }
 const id=key(x,z,tool==='remove'?y-1:y);
 const edit={id,before:board.get(id),after:tool==='build'?selected:undefined};
 undo.push(edit);redo.length=0;apply(edit,false);
}
function project(x,z,y=0){
 return [width/2+panX+(x-z)*unit,heightPx*.18+panY+(x+z)*unit*.52-y*unit*.93];
}
function poly(points,fill,stroke){
 ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();
 ctx.fillStyle=fill;ctx.fill();
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.3;ctx.stroke();}
}
const tile=(x,z,y)=>[project(x,z,y),project(x+1,z,y),project(x+1,z+1,y),project(x,z+1,y)];
function box(x,z,y,color){
 const a=tile(x,z,y), b=tile(x,z,y+1);
 poly([b[1],b[2],a[2],a[1]],color);
 poly([b[1],b[2],a[2],a[1]],'#263c5149');
 poly([b[2],b[3],a[3],a[2]],color);
 poly([b[2],b[3],a[3],a[2]],'#263c5125');
 poly(b,color,'#2d463148');
}
function dot(x,y,rx,ry,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function piece(x,z,y,type){
 const color=pieces[type][1];
 if(type==='tree'){
  const [px,py]=project(x+.5,z+.5,y);
  ctx.fillStyle='#805f41';ctx.fillRect(px-unit*.08,py-unit*.7,unit*.16,unit*.7);
  dot(px,py-unit*.73,unit*.42,unit*.48,color);
  dot(px-unit*.12,py-unit*.88,unit*.24,unit*.26,'#79a16b');
 } else if(type==='roof'){
  const base=tile(x,z,y), ridge=[project(x+.5,z,y+1),project(x+.5,z+1,y+1)];
  poly([base[1],base[2],ridge[1],ridge[0]],color,'#744336');
  poly([base[2],base[3],ridge[1]],'#8b4838');
 } else if(type==='arch'){
  const base=tile(x,z,y), top=tile(x,z,y+1);
  const [px,py]=project(x+.5,z+.5,y);
  ctx.fillStyle=color;ctx.fillRect(px-unit*.47,py-unit*.75,unit*.17,unit*.76);
  ctx.fillRect(px+unit*.29,py-unit*.75,unit*.17,unit*.76);
  poly([top[0],top[1],top[2],top[3],base[3].map((v,i)=>v+(top[3][i]-v)*.73),base[0].map((v,i)=>v+(top[0][i]-v)*.73)],color);
 } else {
  box(x,z,y,color);
  if(type==='steps'){
   const [px,py]=project(x+.5,z+.5,y+1);
   ctx.strokeStyle='#81785c';ctx.beginPath();ctx.moveTo(px-unit*.5,py-unit*.26);ctx.lineTo(px+unit*.5,py+unit*.26);ctx.stroke();
  }
 }
}
function character(x,z,y){
 const [px,py]=project(x+.5,z+.5,y), girl=avatar==='habiba';
 dot(px,py,unit*.28,unit*.12,'#183b3b66');
 poly([[px-unit*.16,py-unit*.54],[px+unit*.16,py-unit*.54],[px+unit*.25,py],[px-unit*.25,py]],girl?'#8b57a0':'#274564');
 dot(px,py-unit*.65,unit*.17,unit*.20,girl?'#b58ac1':'#523d31');
 if(!girl)dot(px,py-unit*.79,unit*.16,unit*.08,'#fdf2de');
}
function drawIsland(){
 for(let sum=0;sum<2*size-1;sum++)for(let x=Math.max(0,sum-size+1);x<=Math.min(size-1,sum);x++){
  const z=sum-x, land=islandGround(x,z)!==null;
  poly(tile(x,z,0),land?((x+z)%2?'#e0c790':'#e8d5aa'):((x+z)%2?'#429bab':'#51a7b6'),'#ffffff22');
  if(!land)continue;
  hits.push({cell:[x,z],face:tile(x,z,0)});
  if(same(hover,[x,z]))poly(tile(x,z,.01),'#fff1a388','#fff0a0');
  const treasure=islandTreasure.find(t=>same(t.at,[x,z])&&!found.has(t.id));
  if(treasure && Math.abs(x-islandPosition[0])+Math.abs(z-islandPosition[1])<=3){
   const [px,py]=project(x+.5,z+.5,.32);
   dot(px,py,unit*.31,unit*.24,'#e89a36');
   dot(px,py,unit*.13,unit*.11,'#fff2a9');
  }
  if((x===14&&z===4)||(x===14&&z===12)||(x===9&&z===9))piece(x,z,0,'tree');
  if(same(islandPosition,[x,z]))character(x,z,0);
 }
}
function draw(){
 if(!width||!ctx)return;
 ctx.fillStyle='#bdddd0';ctx.fillRect(0,0,width,heightPx);hits=[];
 if(island){drawIsland();return;}
 const targets=mode==='missions'?[ [[7,8],[8,8],[9,8]],garden,square,[] ][mission]:[];
 for(let sum=0;sum<2*size-1;sum++)for(let x=Math.max(0,sum-size+1);x<=Math.min(size-1,sum);x++){
  const z=sum-x, wet=water(x,z), y=height(board,x,z);
  const highlighted=targets.some(cell=>same(cell,[x,z]))||mission>=1&&!pierReady(board)&&pier.some(cell=>same(cell,[x,z]));
  const ground=wet?((x+z)%2?'#58aab9':'#64b4c0'):x>=10&&z>=6&&z<=9?'#d9bf8b':(x+z)%2?'#a6bf82':'#afc78b';
  poly(tile(x,z,0),ground,'#ffffff28');
  if(!y&&highlighted)poly(tile(x,z,0),'#ffe0887c','#f8d56b');
  const decor=scenery.get(x+','+z);
  if(decor&&!y)decor.forEach((type,level)=>piece(x,z,level,type));
  for(let level=0;level<y;level++)piece(x,z,level,board.get(key(x,z,level)));
  if(same(hover,[x,z]))poly(tile(x,z,tool==='build'&&y<levels?y+.05:y),'#fff1a368','#fff0a0');
  if(same(dock,[x,z])&&!y){const [px,py]=project(x+.5,z+.5);dot(px,py,unit*.52,unit*.21,'#c77c42');}
  if(x===8&&z===5&&pierReady(board)){
   const [px,py]=project(x+.5,z+.5,.1);
   dot(px,py,unit*.65,unit*.29,'#295d68');
   poly([[px-unit*.58,py],[px+unit*.58,py],[px+unit*.38,py+unit*.22],[px-unit*.38,py+unit*.22]],'#934d32');
   poly([[px,py-unit*.78],[px,py],[px+unit*.47,py]],'#faf2d7','#cbaf78');
  }
  hits.push({cell:[x,z],face:tile(x,z,y)});
  if(same(player,[x,z]))character(x,z,y);
 }
}
function pick(x,y){
 for(let i=hits.length-1;i>=0;i--){
  const {face,cell}=hits[i];
  if(face.every(([ax,ay],j)=>{const [bx,by]=face[(j+1)%4];return (bx-ax)*(y-ay)-(by-ay)*(x-ax)>=0;}))return cell;
 }
}
function resize(){
 const rect=canvas.getBoundingClientRect();width=rect.width;heightPx=rect.height;
 const ratio=Math.min(devicePixelRatio,2);canvas.width=width*ratio;canvas.height=heightPx*ratio;
 ctx.setTransform(ratio,0,0,ratio,0,0);unit=Math.max(11,Math.min(width/30,heightPx/23))*zoom;
 draw();
}
function center(){
 panX=0;panY=0;
 const point=island?islandPosition:player;
 const [x,y]=project(point[0]+.5,point[1]+.5);
 panX=width/2-x;panY=heightPx*.49-y;draw();
}
canvas.onpointerdown=e=>{
 if(e.button!==0)return;
 canvas.setPointerCapture(e.pointerId);
 pointer={x:e.clientX,y:e.clientY,panX,panY,moved:false};
};
canvas.onpointermove=e=>{
 const rect=canvas.getBoundingClientRect();
 if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)pointer.moved=true;
 if(pointer?.moved){panX=pointer.panX+e.clientX-pointer.x;panY=pointer.panY+e.clientY-pointer.y;hover=null;}
 else hover=pick(e.clientX-rect.left,e.clientY-rect.top);
 draw();
};
canvas.onpointerup=e=>{
 if(pointer&&!pointer.moved){const rect=canvas.getBoundingClientRect();interact(pick(e.clientX-rect.left,e.clientY-rect.top));}
 pointer=null;
};
canvas.onpointercancel=()=>{pointer=null;hover=null;draw();};
canvas.onpointerleave=()=>{hover=null;draw();};
el('center').onclick=center;
for(const [id,scale] of [['zoom-in',1.18],['zoom-out',1/1.18]])el(id).onclick=()=>{
 zoom=Math.min(2.15,Math.max(.67,zoom*scale));resize();center();
};
window.addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 const direction={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,1],ArrowRight:[0,-1]}[e.key];
 if(direction){e.preventDefault();const p=island?islandPosition:player;walk([p[0]+direction[0],p[1]+direction[1]]);}
});
function frame(time){
 if(route.length&&time>=nextStep){
  const point=route.shift();nextStep=time+105;
  if(island){
   islandPosition=point;
   const treasure=islandTreasure.find(t=>same(t.at,point));
   if(treasure)found.add(treasure.id);
  } else player=point;
  const won=checkMission();persist();if(won)el('status').textContent=copy('complete');refresh();
  const [x,y]=project(...point);
  if(x<30||x>width-30||y<35||y>heightPx-40)center();
 }
 requestAnimationFrame(frame);
}
new MutationObserver(refresh).observe(el('town-copy'),{subtree:true,childList:true,characterData:true});
new ResizeObserver(resize).observe(canvas);
resize();center();setTool(tool);refresh();requestAnimationFrame(frame);
