import * as THREE from '../runner/vendor/three.module.min.js';
import {size,key,height,pieces,water,scenery,islandGround,islandTreasure,isRail,railPorts,stations} from './model.js';

export function createImmersive(canvas, state, enterCell, useCell){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();
 scene.background=new THREE.Color('#a9d5d6');
 scene.fog=new THREE.Fog('#a9d5d6',17,39);
 scene.add(new THREE.HemisphereLight('#fff9df','#72876a',2.1));
 const sun=new THREE.DirectionalLight('#fff0bf',2);
 sun.position.set(-12,18,8);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(62,1,.045,50);
 camera.rotation.order='YXZ';
 const world=new THREE.Group();scene.add(world);
 const people=new THREE.Group();scene.add(people);
 const residentSphere=new THREE.SphereGeometry(.5,10,8);
 const residentModels=Array.from({length:16},(_,i)=>{
  const figure=new THREE.Group();
  const cloth=new THREE.Mesh(residentSphere,new THREE.MeshStandardMaterial({
   color:['#a9534e','#5a846c','#6e6490'][i%3]
  }));
  cloth.scale.set(.39,.64,.36);cloth.position.y=.39;
  const head=new THREE.Mesh(residentSphere,new THREE.MeshStandardMaterial({color:'#bd865f'}));
  head.scale.set(.27,.29,.27);head.position.y=.79;
  figure.add(cloth,head);people.add(figure);return figure;
 });

 const cube=new THREE.BoxGeometry(1,1,1);
 const crown=new THREE.SphereGeometry(.5,12,8);
 const roof=new THREE.ConeGeometry(.72,.9,4);roof.rotateY(Math.PI/4);
 const materials=new Map();
 const pickables=[];
 const keys=new Set();
 const ray=new THREE.Raycaster();
 const ghostBody=new THREE.Mesh(cube,new THREE.MeshBasicMaterial({color:'#b8f8dd',transparent:true,opacity:.35,depthWrite:false}));
 ghostBody.visible=false;scene.add(ghostBody);
 const guide=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.65,0xffe195,.24,.22);
 guide.visible=false;scene.add(guide);
 const trainBody=new THREE.Mesh(cube,new THREE.MeshStandardMaterial({color:'#b14f3a'}));
 trainBody.scale.set(.73,.37,1);trainBody.visible=false;scene.add(trainBody);
 const outline=new THREE.LineSegments(new THREE.EdgesGeometry(cube),new THREE.LineBasicMaterial({color:'#ffd36e'}));
 outline.visible=false;scene.add(outline);
 let x=0,z=0,y=0,vy=0,yaw=-Math.PI/2,pitch=-.24,last=0,dirty=true,aim=null,adjacent;
 function mesh(geometry,color,x,y,z,sx,sy,sz,cell){
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.84}));
  const part=new THREE.Mesh(geometry,materials.get(color));
  part.position.set(x,y,z);part.scale.set(sx,sy,sz);
  world.add(part);
  if(cell){part.userData.cell=cell;pickables.push(part);}
  return part;
 }
 const block=(color,x,y,z,sx,sy,sz,cell)=>mesh(cube,color,x,y,z,sx,sy,sz,cell);
 function piece(type,x,z,y,cell,rotation=0){
  const color=pieces[type]?.[1]||'#ae9c79';
  if(isRail(type)){
   for(const port of railPorts(type,rotation)){
    const angle=port*Math.PI/2;
    for(const side of [-1,1]){
     const cx=x+.5+Math.cos(angle)*.26-Math.sin(angle)*side*.19;
     const cz=z+.5+Math.sin(angle)*.26+Math.cos(angle)*side*.19;
     block('#aeb9b8',cx,y+.075,cz,.53,.08,.055,cell).rotation.y=-angle;
    }
   }
   return;
  }
  if(type==='harborLantern'){
   block('#314e48',x+.5,y+.09,z+.5,.55,.18,.55,cell);
   block('#ffdc85',x+.5,y+.4,z+.5,.42,.48,.42,cell);
   mesh(roof,'#3e6054',x+.5,y+.76,z+.5,.43,.3,.43,cell);
   return;
  }
  if(type==='roof'){
   mesh(roof,color,x+.5,y+.45,z+.5,1,1,1,cell).rotation.y=rotation*Math.PI/2;return;
  }
  if(type==='tree'){
   block('#805f41',x+.5,y+.48,z+.5,.16,.96,.16,cell);
   mesh(crown,color,x+.5,y+1.04,z+.5,.91,.92,.91,cell);return;
  }
  if(type==='arch'){
   for(const d of [-.35,.35])block(color,x+.5+(rotation%2?0:d),y+.5,z+.5+(rotation%2?d:0),rotation%2?1:.3,1,rotation%2?.3:1,cell);
   block(color,x+.5,y+.88,z+.5,1,.24,1,cell);return;
  }
  if(type==='steps'){
   for(let i=0;i<3;i++){
    const shift=(i-1)*.333, h=(i+1)/3;
    block(color,x+.5+(rotation%2?shift*(rotation===1?1:-1):0),y+h/2,
     z+.5+(rotation%2?0:shift*(rotation===0?1:-1)),rotation%2?.34:1,h,rotation%2?1:.34,cell);
   }
   return;
  }
  block(color,x+.5,y+.5,z+.5,1,1,1,cell);
  if(type==='door')block('#563b2f',x+.5,y+.42,z+1,.53,.84,.026,cell);
 }
 const isLand=(island,x,z)=>island?islandGround(x,z)!==null:!water(x,z);
 function rebuild(data){
  world.clear();pickables.length=0;
  for(let x=0;x<size;x++)for(let z=0;z<size;z++){
   const cell=[x,z],land=isLand(data.island,x,z);
   const color=land ? data.island ? ((x+z)%2?'#dcca98':'#e5d4a8') :
    ((x+z)%2?'#9caf77':'#aabe85') : '#449cad';
   block(color,x+.5,land?-.17:-.25,z+.5,1,.34,1,cell);
   if(data.targets.some(([tx,tz])=>tx===x&&tz===z))block('#efd36a',x+.5,land?.01:-.075,z+.5,.86,.025,.86);
   if(data.island){
    if((x===14&&z===4)||(x===14&&z===12)||(x===9&&z===9))piece('tree',x,z,0);
    continue;
   }
   scenery.get(x+','+z)?.forEach((type,i)=>piece(type,x,z,i,cell));
   for(let level=0;level<height(data.board,x,z);level++){
    const id=key(x,z,level);piece(data.board.get(id),x,z,level,cell,data.rotations[id]);
   }
   if(stations.some(p=>p[0]===x&&p[1]===z))block('#3f8984',x+.5,.035,z+.5,.83,.07,.83,cell);
   const id=x+','+z, mark=data.marks[id], floor=data.ground(x,z);
   if(mark&&floor!==null&&!data.collected?.has(id)){
    if(mark==='star')mesh(crown,data.markColors[mark],x+.5,floor+.38,z+.5,.38,.38,.38,cell);
    else if(mark==='hurdle')block(data.markColors[mark],x+.5,floor+.18,z+.5,.72,.36,.16,cell);
    else block(data.markColors[mark],x+.5,floor+.045,z+.5,.78,.09,.78,cell);
   }
  }
  if(!data.island&&data.hasPier){
   block('#965738',8.5,.14,5.5,.6,.34,.94);
   block('#e7d3a3',8.5,.85,5.5,.05,1.35,.05);
   mesh(roof,'#fff0c9',8.67,.91,5.5,.54,.94,.13);
  }
  if(data.island)for(const item of islandTreasure){
   if(data.found.has(item.id))continue;
   if(Math.abs(item.at[0]-Math.floor(x))+Math.abs(item.at[1]-Math.floor(z))>3)continue;
   block('#efb63e',item.at[0]+.5,.22,item.at[1]+.5,.37,.44,.38);
  }
  dirty=false;
 }
 function reset(){
  const {point,ground}=state();
  x=point[0]+.5;z=point[1]+.5;y=ground(...point)??0;
  vy=0;last=0;dirty=true;keys.clear();yaw=-Math.PI/2;pitch=-.24;
 }
 function moveAxis(dx,dz,data){
  if(!dx&&!dz)return;
  const nx=x+dx,nz=z+dz;
  const cell=[Math.floor(nx+Math.sign(dx)*.16),Math.floor(nz+Math.sign(dz)*.16)];
  const target=data.ground(...cell);
  if(target===null||target>y+.19||!data.canCross(cell,y-target>.4))return;
  x=nx;z=nz;
 }
 function frame(time){
  const data=state();
  const dt=last?Math.min(.045,Math.max(0,(time-last)/1000)):0;last=time;
  const fromX=Math.floor(x), fromZ=Math.floor(z), floor=data.ground(fromX,fromZ);
  if(floor===null){reset();return;}
  if(!data.paused&&!data.ride){
   if(keys.has('jump')&&vy<=0&&y<=floor+.025)vy=5.3;
   keys.delete('jump');
   vy-=13*dt;y+=vy*dt;
   if(y<=floor){y=floor;vy=0;}
   const forward=Number(keys.has('forward'))-Number(keys.has('back'));
   const side=Number(keys.has('right'))-Number(keys.has('left'));
   const speed=(keys.has('run')?5.6:3.15)*dt/(Math.hypot(forward,side)||1);
   moveAxis((-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,0,data);
   moveAxis(0,(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed,data);
   const nx=Math.floor(x),nz=Math.floor(z);
   if(nx!==fromX||nz!==fromZ){enterCell([nx,nz]);dirty||=data.island;}
  }
  if(dirty)rebuild(data);
  const residents=data.island?[]:data.residents;
  residentModels.forEach((figure,i)=>{
   const person=residents[i];
   figure.visible=Boolean(person);
   if(person)figure.position.set(person.x+.29,(data.ground(Math.floor(person.x),Math.floor(person.z))??0)
    +(person.moving?Math.abs(Math.sin(time/110+i))*.06:0),person.z+.29);
  });
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const renderSize=renderer.getSize(new THREE.Vector2());
  if(renderSize.x!==rect.width||renderSize.y!==rect.height){
   renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
  }
  trainBody.visible=Boolean(data.ride);
  if(data.ride){
   const [tx,tz,ty]=data.ride.point;
   trainBody.position.set(tx+.5,ty+.22,tz+.5);
   trainBody.rotation.y=data.ride.heading;
   camera.position.set(tx+.5,ty+1.69,tz+.5);
   camera.rotation.set(-.18,data.ride.heading,0,'YXZ');
  } else {
   camera.position.set(x,y+1.53,z);
   camera.rotation.set(pitch,yaw,0,'YXZ');
  }
  camera.updateMatrixWorld();
  world.updateMatrixWorld();
  ray.setFromCamera({x:0,y:0},camera);ray.far=6;
  const hit=data.ride?null:ray.intersectObjects(pickables,false)[0];
  aim=hit?.object.userData.cell;
  adjacent=undefined;
  if(hit&&hit.point.y>.08){
   const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
   if(Math.abs(normal.y)<.45){
    adjacent=[aim[0]+Math.round(normal.x),aim[1]+Math.round(normal.z)];
   }
  }
  const target=aim?data.preview(aim,adjacent):null;
  ghostBody.visible=Boolean(target);
  guide.visible=Boolean(target)&&['rail','curve','roof','arch','steps'].includes(data.selected);
  if(target){
   ghostBody.position.set(target[0]+.5,target[2]+.5,target[1]+.5);
   ghostBody.rotation.y=data.rotation*Math.PI/2;
   ghostBody.material.color.set(pieces[data.selected][1]);
   const isTrack=isRail(data.selected);
   ghostBody.scale.set(1,isTrack?.10:1,1);
   if(isTrack)ghostBody.position.y=target[2]+.05;
   if(guide.visible){
    const angle=data.rotation*Math.PI/2;
    guide.position.set(target[0]+.5,target[2]+(isTrack?.16:1.08),target[1]+.5);
    guide.setDirection(new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)));
   }
  }
  outline.visible=Boolean(aim)&&!target;
  if(aim)outline.position.set(aim[0]+.5,(data.island?0:Math.max(0,height(data.board,...aim)-1))+.5,aim[1]+.5);
  renderer.render(scene,camera);
 }
 const turn=(dx,dy)=>{yaw-=dx*.005;pitch=Math.max(-1.41,Math.min(1.41,pitch-dy*.005));};
 let drag;
 canvas.onpointerdown=e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,moved:false};};
 canvas.onpointermove=e=>{
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(dx||dy){turn(dx,dy);drag={x:e.clientX,y:e.clientY,moved:true};}
 };
 canvas.onpointerup=()=>{if(drag&&!drag.moved&&aim)useCell(aim,adjacent);drag=null;};
 canvas.onpointercancel=()=>{drag=null;};
 return {frame,reset,keys,turn, invalidate(){dirty=true;}, action(){if(aim)useCell(aim,adjacent);}};
}
