import {createImmersive} from './immersive.js';
import {size,levels,pieces,key,water,start,dock,garden,square,loadBoard,height,surface,path,bridgeReady,gardenReady,squareReady,scenery,pier,pierReady,islandStart,islandGround,islandTreasure,households,marketRoute,market,stations,isRail,railPorts,trainRoute,challengeReady,pointId,valid} from './model.js';

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
const rooms=Object.create(null);
for(const [id,choice] of Object.entries(saved.rooms||{})){
 if(['rug','plant','lamp'].includes(choice))rooms[id]=choice;
}
const rotations=Object.create(null), marks=Object.create(null);
for(const [id,value] of Object.entries(saved.rotations||{}))if(board.has(id)&&Number.isInteger(value))rotations[id]=((value%4)+4)%4;
for(const [id,value] of Object.entries(saved.marks||{})){
 const point=id.split(',').map(Number);
 if(point.length===2&&valid(...point,0)&&pointId(point)===id&&['start','finish','star','hurdle'].includes(value))marks[id]=value;
}
const rewards=new Set(Array.isArray(saved.rewards)?saved.rewards.filter(id=>['bench','fountain'].includes(id)):[]);
const rotatable=['rail','curve','roof','arch','steps'];
const markColors={start:'#66ca8d',finish:'#b788e8',star:'#ffcf57',hurdle:'#d56c4f'};
let rotation=0, markTool, racing, ride, tracks=[], fixedStep=0, mapJump=false;
let homes=[], activeHome, residents=[], lastResidentFrame=0;
let immersive, firstPerson=false;
const roomIcons={rug:'▰',plant:'🪴',lamp:'🏮'};
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
 button.onclick=()=>{selected=type;rotation=0;setTool('build');};
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
  localStorage.setItem(saveKey,JSON.stringify({board:[...board],mission,player,avatar,mode,island,islandPosition,found:[...found],unlocked:[...unlocked],rooms,rotations,marks,rewards:[...rewards]}));
  el('status').textContent=copy('saved');
 } catch { el('status').textContent=copy('storage'); }
}
const missionIds=['bridge','garden','square','done'];
function syncHomes(){
 immersive?.invalidate();
 homes=households(board);
 residents=homes.slice(0,16).map((home,index)=>({...home,index,route:marketRoute(board,home.entrance)}));
 tracks=trainRoute(board,rotations);
 if(homes.some(home=>marketRoute(board,home.entrance).length))rewards.add('bench');
 if(gardenReady(board))rewards.add('fountain');
}
function refresh(){
 immersive?.invalidate();
 const id=missionIds[mission];
 el('mission-card').hidden=mode==='free'||island;
 el('village-card').hidden=island;
 for(const id of ['rail-card','course-card','requests-card'])el(id).hidden=island;
 el('rail-status').textContent=copy(tracks.length?'railReady':'railHelp');
 el('ride-rail').disabled=Boolean(ride||racing)||!tracks.length||!stations.some(p=>same(p,player));
 el('race-start').disabled=Boolean(racing||ride)||!challengeReady(board,marks);
 el('race-stop').hidden=!racing;
 el('map-jump').hidden=!racing||firstPerson;
 el('request-road').textContent=copy(rewards.has('bench')?'roadDone':'roadRequest');
 el('request-garden').textContent=copy(rewards.has('fountain')?'gardenDone':'gardenRequest');
 el('rotate-piece').hidden=island||Boolean(racing||ride)||tool!=='build'||!rotatable.includes(selected);
 for(const button of document.querySelectorAll('[data-mark]'))button.disabled=Boolean(racing||ride);

 el('home-count').textContent=new Intl.NumberFormat('ar').format(homes.length);
 el('visit-home').disabled=Boolean(ride||racing)||!homes.some(home=>same(home.entrance,player));
 el('sail').disabled=Boolean(ride||racing);
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
  button.hidden=island||(islandTreasure.some(t=>t.id===id)&&!unlocked.has(id))||(['bench','fountain'].includes(id)&&!rewards.has(id));
 }
 palette.hidden=island||Boolean(racing||ride);
 for(const button of document.querySelectorAll('[data-tool]'))button.hidden=(island||Boolean(racing||ride))&&button.dataset.tool!=='walk';
 el('reset').hidden=island||Boolean(racing||ride);
 el('undo').hidden=el('redo').hidden=island||Boolean(racing||ride);
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
 tool=value;markTool=undefined;
 for(const button of document.querySelectorAll('[data-mark]'))button.setAttribute('aria-pressed','false');
 immersive?.invalidate();
 for(const button of document.querySelectorAll('[data-tool]'))button.setAttribute('aria-pressed',String(button.dataset.tool===tool));
 for(const button of palette.children)button.setAttribute('aria-pressed',String(button.dataset.piece===selected&&tool==='build'));
 refresh();
}
document.querySelectorAll('[data-tool]').forEach(button=>button.onclick=()=>setTool(button.dataset.tool));
for(const id of ['mohammad','habiba'])el(id).onclick=()=>{avatar=id;update();};
for(const id of ['missions','free'])el(id).onclick=()=>{mode=id;update();};
function visit(home){
 if(!home||island||ride||racing||!same(home.entrance,player)||el('home-room').open)return;
 activeHome=home.id;route=[];
 showRoom();
 el('home-room').showModal();
}
function showRoom(){
 const choice=rooms[activeHome];
 el('room-furniture').textContent=roomIcons[choice]||'';
 for(const button of document.querySelectorAll('[data-furniture]')){
  button.setAttribute('aria-pressed',String(choice===button.dataset.furniture));
 }
}
el('visit-home').onclick=()=>visit(homes.find(home=>same(home.entrance,player)));
el('leave-room').onclick=()=>el('home-room').close();
el('home-room').onclose=()=>{activeHome=undefined;};
for(const button of document.querySelectorAll('[data-furniture]'))button.onclick=()=>{
 if(!activeHome)return;
 rooms[activeHome]=button.dataset.furniture;
 showRoom();persist();
};
function apply({id,before,after,beforeRotation,afterRotation},reverse){
 const type=reverse?before:after;
 if(type)board.set(id,type);else board.delete(id);
 const angle=reverse?beforeRotation:afterRotation;
 if(type&&angle)rotations[id]=angle;else delete rotations[id];
 if(surface(board,...player)===null)player=[...start];
 route=[];
 syncHomes();
 update();
}
el('undo').onclick=()=>{const edit=undo.pop();if(edit){redo.push(edit);apply(edit,true);}};
el('redo').onclick=()=>{const edit=redo.pop();if(edit){undo.push(edit);apply(edit,false);}};
el('reset').onclick=()=>{
 if(!confirm(copy('confirm')))return;
 board.clear();for(const store of [rotations,marks])for(const id of Object.keys(store))delete store[id];rewards.clear();for(const id of Object.keys(rooms))delete rooms[id];syncHomes();mission=0;island=false;found.clear();player=[...start];undo.length=redo.length=0;route=[];panX=panY=0;immersive?.reset();update();
};
function returnHome(){
 island=false;route=[];panX=panY=0;
 immersive?.reset();center();update();
}
el('return-home').onclick=returnHome;
el('sail').onclick=()=>{
 if(ride||racing||mission<1||!same(player,dock)||!pierReady(board))return;
 island=true;route=[];found.clear();islandPosition=[...islandStart];
 setTool('walk');immersive?.reset();center();update();
};
el('rotate-piece').onclick=()=>{rotation=(rotation+1)%4;immersive?.invalidate();draw();};
for(const button of document.querySelectorAll('[data-mark]')){
 button.onclick=()=>{
  setTool('walk');markTool=button.dataset.mark;
  for(const option of document.querySelectorAll('[data-mark]'))option.setAttribute('aria-pressed',String(option===button));
 };
}
el('ride-rail').onclick=()=>{
 if(ride||racing||!tracks.length||!stations.some(p=>same(p,player)))return;
 const cells=same(player,stations[0])?tracks:[...tracks].reverse();
 ride={cells,frame:undefined,point:[...cells[0],surface(board,...cells[0])??0],heading:0};route=[];
 setTool('walk');
};
el('race-start').onclick=()=>{
 if(ride||racing||!challengeReady(board,marks))return;
 player=Object.keys(marks).find(id=>marks[id]==='start').split(',').map(Number);
 racing={start:undefined,found:new Set(),lastTime:0};
 route=[];mapJump=false;setTool('walk');immersive?.reset();center();
};
el('race-stop').onclick=()=>{racing=undefined;route=[];refresh();};
el('map-jump').onclick=()=>{mapJump=true;};
function canCross(point,jump){
 if(!racing||marks[pointId(point)]!=='hurdle'||jump)return true;
 racing.notice='courseBump';
 el('course-status').textContent=copy('courseBump');
 return false;
}
function showRace(time){
 if(!racing)return;
 racing.start??=time;
 const elapsed=Math.floor((time-racing.start)/1000);
 racing.lastTime=elapsed;
 const count=Object.values(marks).filter(value=>value==='star').length;
 el('course-status').textContent='★ '+racing.found.size+'/'+count+' · '+elapsed+ ' '+copy('courseTime')+(racing.notice?' · '+copy(racing.notice):'');
}
function walk(to){
 const here=island?islandPosition:player;
 if(same(here,to))return;
 route=island?path(board,here,to,islandGround):path(board,here,to);
 if(!route.length)el('status').textContent=copy('blocked');
 else nextStep=0;
}
function candidate(cell,faceCell){
 if(!cell||ride||racing||island||markTool||!['build','remove'].includes(tool))return null;
 const [x,z]=tool==='build'&&faceCell?faceCell:cell;
 if(!valid(x,z,0)||scenery.has(x+','+z)||same([x,z],player)||same([x,z],start))return null;
 const y=height(board,x,z), roof=board.get(key(x,z,y-1));
 if(tool==='remove')return y?[x,z,y-1]:null;
 if(y>=levels||roof==='tree'||isRail(roof)||selected==='tree'&&water(x,z)||
    isRail(selected)&&water(x,z)&&!y)return null;
 return [x,z,y];
}
function interact(cell,faceCell){
 if(!cell||ride)return;
 if(markTool&&!island&&!racing){
  if(surface(board,...cell)===null)return;
  const id=pointId(cell);
  if(markTool==='erase')delete marks[id];
  else {
   if(markTool==='start'||markTool==='finish')for(const key of Object.keys(marks))if(marks[key]===markTool)delete marks[key];
   marks[id]=markTool;
  }
  update();return;
 }
 if(island||tool==='walk'){
  const home=!island&&!racing&&homes.find(home=>same(home.at,cell));
  if(home){
   if(same(home.entrance,player))visit(home);
   else walk(home.entrance);
  } else walk(cell);
  return;
 }
 const placement=candidate(cell,faceCell);
 if(!placement){el('status').textContent=copy('placement');return;}
 const id=key(...placement);
 const edit={id,before:board.get(id),after:tool==='build'?selected:undefined,
  beforeRotation:rotations[id],afterRotation:rotatable.includes(selected)?rotation:0};
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
function piece(x,z,y,type,angle=0){
 const color=pieces[type][1];
 if(isRail(type)){
  const [px,py]=project(x+.5,z+.5,y+.08);
  const endpoints=[[1,.5],[.5,1],[0,.5],[.5,0]];
  for(const port of railPorts(type,angle)){
   const [dx,dz]=endpoints[port], [ex,ey]=project(x+dx,z+dz,y+.08);
   ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(ex,ey);
   ctx.strokeStyle='#685344';ctx.lineWidth=unit*.24;ctx.stroke();
   ctx.strokeStyle='#e2e4d9';ctx.lineWidth=unit*.10;ctx.stroke();
  }
 } else if(type==='bench'||type==='fountain'){
  const [px,py]=project(x+.5,z+.5,y+.4);
  dot(px,py,unit*.39,unit*.22,color);
  dot(px,py-unit*.13,unit*.28,unit*.14,type==='fountain'?'#8ed0ce':'#b88152');
 } else if(type==='tree'){
  const [px,py]=project(x+.5,z+.5,y);
  ctx.fillStyle='#805f41';ctx.fillRect(px-unit*.08,py-unit*.7,unit*.16,unit*.7);
  dot(px,py-unit*.73,unit*.42,unit*.48,color);
  dot(px-unit*.12,py-unit*.88,unit*.24,unit*.26,'#79a16b');
 } else if(type==='roof'){
  const base=tile(x,z,y), ridge=angle%2?[project(x,z+.5,y+1),project(x+1,z+.5,y+1)]:[project(x+.5,z,y+1),project(x+.5,z+1,y+1)];
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
  if(type==='door'){
   poly([project(x+.24,z+1,y),project(x+.24,z+1,y+.81),
    project(x+.76,z+1,y+.81),project(x+.76,z+1,y)],'#563b2f');
   const [px,py]=project(x+.64,z+1,y+.39);
   dot(px,py,unit*.036,unit*.036,'#eac074');
  }
  if(type==='road'){
   const [px,py]=project(x+.5,z+.5,y+1);
   dot(px,py,unit*.15,unit*.035,'#e4dbb5');
  }
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
function residentPositions(){
 const positions=new Map();
 for(const {index,entrance,route} of residents){
  const leg=Math.max(0,route.length-1);
  const progress=(lastResidentFrame/1050+index*.63)%(leg*2||1);
  const step=progress>leg?2*leg-progress:progress;
  const a=route[Math.floor(step)]||entrance,b=route[Math.ceil(step)]||a;
  const fraction=step%1;
  const x=a[0]+(b[0]-a[0])*fraction,z=a[1]+(b[1]-a[1])*fraction;
  const cell=Math.floor(x)+','+Math.floor(z);
  const occupants=positions.get(cell)||[];
  occupants.push({x,z,index,moving:leg>0});
  positions.set(cell,occupants);
 }
 return positions;
}
function drawResident({x,z,index,moving}){
 const [px,py]=project(x+.29,z+.29,height(board,Math.floor(x),Math.floor(z)));
 const bob=moving?Math.sin(lastResidentFrame/82+index)*unit*.035:0;
 dot(px,py,unit*.14,unit*.075,'#23403d4a');
 dot(px,py-unit*.19+bob,unit*.13,unit*.19,['#a9534e','#5a846c','#6e6490'][index%3]);
 dot(px,py-unit*.41+bob,unit*.095,unit*.10,'#bd865f');
}
function draw(){
 if(firstPerson)return;
 if(!width||!ctx)return;
 ctx.fillStyle='#bdddd0';ctx.fillRect(0,0,width,heightPx);hits=[];
 if(island){drawIsland();return;}
 const people=residentPositions();
 const targets=mode==='missions'?[ [[7,8],[8,8],[9,8]],garden,square,[] ][mission]:[];
 for(let sum=0;sum<2*size-1;sum++)for(let x=Math.max(0,sum-size+1);x<=Math.min(size-1,sum);x++){
  const z=sum-x, wet=water(x,z), y=height(board,x,z);
  const highlighted=targets.some(cell=>same(cell,[x,z]))||mission>=1&&!pierReady(board)&&pier.some(cell=>same(cell,[x,z]));
  const ground=wet?((x+z)%2?'#58aab9':'#64b4c0'):x>=10&&z>=6&&z<=9?'#d9bf8b':(x+z)%2?'#a6bf82':'#afc78b';
  poly(tile(x,z,0),ground,'#ffffff28');
  if(!y&&highlighted)poly(tile(x,z,0),'#ffe0887c','#f8d56b');
  const decor=scenery.get(x+','+z);
  if(decor&&!y)decor.forEach((type,level)=>piece(x,z,level,type));
  for(let level=0;level<y;level++){
   const id=key(x,z,level);piece(x,z,level,board.get(id),rotations[id]);
  }
  if(stations.some(point=>same(point,[x,z]))){
   const [px,py]=project(x+.5,z+.5,.08);
   dot(px,py,unit*.37,unit*.18,'#306968');
   ctx.fillStyle='#fff7d4';ctx.textAlign='center';ctx.font='bold '+Math.max(8,unit*.32)+'px Tahoma';
   ctx.fillText(copy(same(stations[0],[x,z])?'stationMarket':'stationHarbor'),px,py,unit*1.8);
  }
  const mark=marks[x+','+z];
  if(mark&&!racing?.found.has(x+','+z)){
   const [px,py]=project(x+.5,z+.5,surface(board,x,z)??y);
   if(mark==='hurdle')poly([[px-unit*.36,py-unit*.22],[px+unit*.36,py-unit*.22],
     [px+unit*.36,py-unit*.42],[px-unit*.36,py-unit*.42]],markColors.hurdle);
   else dot(px,py,unit*.22,unit*.15,markColors[mark]);
  }
  if(same(hover,[x,z]))poly(tile(x,z,tool==='build'&&y<levels?y+.05:y),'#fff1a368','#fff0a0');
  if(same(dock,[x,z])&&!y){const [px,py]=project(x+.5,z+.5);dot(px,py,unit*.52,unit*.21,'#c77c42');}
  if(x===8&&z===5&&pierReady(board)){
   const [px,py]=project(x+.5,z+.5,.1);
   dot(px,py,unit*.65,unit*.29,'#295d68');
   poly([[px-unit*.58,py],[px+unit*.58,py],[px+unit*.38,py+unit*.22],[px-unit*.38,py+unit*.22]],'#934d32');
   poly([[px,py-unit*.78],[px,py],[px+unit*.47,py]],'#faf2d7','#cbaf78');
  }
  hits.push({cell:[x,z],face:tile(x,z,y)});
  if(same(market,[x,z])){
   const [px,py]=project(x+.5,z+1,1.55);
   ctx.fillStyle='#894b39';ctx.fillRect(px-unit*.41,py-unit*.22,unit*.82,unit*.37);
   ctx.fillStyle='#fff1d6';ctx.textAlign='center';ctx.font='bold '+Math.max(8,unit*.38)+'px Tahoma';
   ctx.fillText(copy('market'),px,py+unit*.06,unit*.76);
  }
  for(const resident of people.get(x+','+z)||[])drawResident(resident);
  if(!ride&&same(player,[x,z]))character(x,z,surface(board,x,z)??y);
 }
 if(ride){
  const [x,z,y]=ride.point;
  const [px,py]=project(x+.5,z+.5,y+.36);
  poly([[px-unit*.55,py],[px,py-unit*.46],[px+unit*.55,py],[px,py+unit*.34]],'#b14f3a','#763c33');
  dot(px,py-unit*.23,unit*.24,unit*.13,'#f0cb76');
  character(x,z,y+.48);
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
 if(firstPerson){
  if(commands[e.code]){
   e.preventDefault();if(e.code!=='Space'||!e.repeat)immersive.keys.add(commands[e.code]);
  } else if(e.code==='KeyE') {e.preventDefault();immersive.action();}
  else if(e.code==='KeyQ')immersive.turn(-24,0);
  else if(e.code==='KeyR')immersive.turn(24,0);
  return;
 }
 if(e.code==='Space'&&racing){e.preventDefault();mapJump=true;return;}
 const direction={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,1],ArrowRight:[0,-1]}[e.key];
 if(direction){e.preventDefault();const p=island?islandPosition:player;walk([p[0]+direction[0],p[1]+direction[1]]);}
});
function enterCell(point){
 if(racing){
  racing.notice=undefined;
  const id=pointId(point);
  if(marks[id]==='star')racing.found.add(id);
  if(marks[id]==='finish'){
   const goal=Object.values(marks).filter(value=>value==='star').length;
   if(racing.found.size===goal){
    el('course-status').textContent=copy('courseFinish')+' '+racing.lastTime+' '+copy('courseTime');
    racing=undefined;route=[];
   } else racing.notice='courseMissing';
  }
 }
 if(island){
  islandPosition=point;
  const treasure=islandTreasure.find(t=>same(t.at,point));
  if(treasure)found.add(treasure.id);
 } else player=point;
 const won=checkMission();
 persist();if(won)el('status').textContent=copy('complete');
 refresh();
}
function setPerspective(enabled){
 firstPerson=Boolean(enabled&&immersive);
 route=[];
 for(const id of ['town-3d','town-aim','motion'])el(id).hidden=!firstPerson;
 for(const id of ['town-view','zoom-in','zoom-out','center'])el(id).hidden=firstPerson;
 el('perspective').setAttribute('aria-pressed',String(firstPerson));
 el('map-jump').hidden=!racing||firstPerson;
 if(firstPerson)immersive.reset();
 else {immersive?.keys.clear();resize();center();}
}
function startImmersive(){
 try {
  immersive=createImmersive(el('town-3d'),()=>({
   board,island,found,rotations,marks:island?{}:marks,markColors, collected:racing?.found,
   ride, selected, rotation, preview:(cell,adjacent)=>tool==='build'?candidate(cell,adjacent):null,
   canCross, hasPier:pierReady(board),residents:[...residentPositions().values()].flat(),point:island?islandPosition:player,ground:island?islandGround:(x,z)=>surface(board,x,z),
   paused:Boolean(document.querySelector('dialog[open]')),
   targets:island?[]:[
    ...(mode==='missions'?[[[7,8],[8,8],[9,8]],garden,square,[]][mission]:[]),
    ...(mission>=1&&!pierReady(board)?pier:[])
   ]
  }),enterCell,(cell,adjacent)=>{
   if(markTool&&!island){interact(cell);return;}
   if(tool==='walk'||island){
    if(!island)visit(homes.find(home=>same(home.at,cell)&&same(home.entrance,player)));
   } else interact(cell,adjacent);
  });
 } catch {el('view-message').hidden=false;el('perspective').disabled=true;return;}
 el('perspective').onclick=()=>setPerspective(!firstPerson);
 el('use-aim').onclick=()=>immersive.action();
 for(const button of document.querySelectorAll('[data-motion]')){
  const command=button.dataset.motion;
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);immersive.keys.add(command);};
  const release=()=>{if(command!=='jump')immersive.keys.delete(command);};
  button.onpointerup=button.onpointercancel=button.onlostpointercapture=release;
  button.onclick=e=>{if(e.detail===0&&command==='jump'&&e.pointerType===undefined)immersive.keys.add(command);};
 }
 setPerspective(true);
}
const commands={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'run',ShiftRight:'run',Space:'jump'};
window.addEventListener('keyup',e=>immersive?.keys.delete(commands[e.code]));
window.addEventListener('blur',()=>immersive?.keys.clear());
function animateRail(time){
 if(!ride)return;
 ride.frame??=time;
 const index=Math.max(0,(time-ride.frame)/430);
 if(index>=ride.cells.length-1){
  player=ride.cells.at(-1);ride=undefined;immersive?.reset();center();update();
  el('status').textContent=copy('railArrival');return;
 }
 const a=ride.cells[Math.floor(index)],b=ride.cells[Math.floor(index)+1],t=index%1;
 const ay=surface(board,...a)??0,by=surface(board,...b)??0;
 ride.point=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,ay+(by-ay)*t];
 ride.heading=Math.atan2(a[0]-b[0],a[1]-b[1]);
}
function frame(time){
 animateRail(time);showRace(time);
 if(firstPerson){lastResidentFrame=time;immersive.frame(time);requestAnimationFrame(frame);return;}
 if(ride)draw();
 if(!island&&residents.some(resident=>resident.route.length)&&time-lastResidentFrame>=45){
  lastResidentFrame=time;draw();
 }
 if(route.length&&time>=nextStep){
  const point=route.shift();nextStep=time+105;
  if(!canCross(point,mapJump)){route=[];requestAnimationFrame(frame);return;}
  mapJump=false;
  enterCell(point);
  const [x,y]=project(...point);
  if(x<30||x>width-30||y<35||y>heightPx-40)center();
 }
 requestAnimationFrame(frame);
}
new MutationObserver(refresh).observe(el('town-copy'),{subtree:true,childList:true,characterData:true});
new ResizeObserver(resize).observe(canvas);
syncHomes();resize();center();setTool(tool);refresh();startImmersive();requestAnimationFrame(frame);
