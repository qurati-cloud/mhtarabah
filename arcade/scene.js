import * as T from '../runner/vendor/three.module.min.js';

export function createArcadeScene(canvas, ocean){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
 renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();
 scene.background=new T.Color(ocean?0x105879:0xb4e2da);
 scene.add(new T.HemisphereLight(ocean?0x8fdbff:0xfff3cb,0x536381,2.3));
 const sun=new T.DirectionalLight(ocean?0xa9efff:0xffe4ad,2.4);
 sun.position.set(-4,7,6);scene.add(sun);
 const camera=new T.OrthographicCamera(-450,450,250,-250,1,1900);
 camera.position.z=1000;
 const cube=new T.BoxGeometry(1,1,1), rock=new T.IcosahedronGeometry(1,0);
 const sphere=new T.SphereGeometry(1,12,8), spike=new T.ConeGeometry(1,1,5);
 const strut=new T.CylinderGeometry(1,1,1,7);
 const materials=new Map();
 const shape=new T.Shape();
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5+Math.PI/2,r=i%2?.46:1;
  shape[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);
 }
 shape.closePath();
 const star=new T.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:true,bevelThickness:.075,bevelSize:.09,bevelSegments:2});
 function mesh(parent,geo,color,x,y,z,sx,sy,sz){
  if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.76}));
  const object=new T.Mesh(geo,materials.get(color));
  object.position.set(x,y,z);object.scale.set(sx,sy,sz);parent.add(object);return object;
 }
 const backdrop=new T.Group();scene.add(backdrop);
 const ornaments=[];
 for(let i=0;i<25;i++){
  const depth=i%3, phase=i*149%1040;
  if(ocean){
   const coral=new T.Group();backdrop.add(coral);
   const c=[0x377b97,0x77619c,0x499997,0xbb6483][i%4];
   for(const side of [-1,0,1]){
    const arm=mesh(coral,strut,c,side*8,22+depth*5,-18,3.6,43+depth*9,3.6);
    arm.rotation.z=side*-.39;
    mesh(coral,sphere,c,side*18,43+depth*9,-18,5.5,5,4);
   }
   ornaments.push({object:coral,phase,depth,y:-217});
   const fish=new T.Group();backdrop.add(fish);
   mesh(fish,sphere,[0x65c5bb,0xe0ab66,0x8fb9dc][depth],0,0,-90,14,6,4);
   mesh(fish,spike,0x609ea4,-13,0,-90,6,8,3).rotation.z=-Math.PI/2;
   ornaments.push({object:fish,phase:phase+80,depth:depth+1,y:30+(i*58)%163-55});
  }else{
   const hill=mesh(backdrop,rock,[0x6f9d8e,0x91b4a0,0x83a8a0][depth],0,-133-depth*6,-115,155,70+depth*15,35);
   ornaments.push({object:hill,phase,depth:depth+2,y:-135-depth*5});
   if(i%3===0){
    const tree=new T.Group();backdrop.add(tree);
    mesh(tree,strut,0x705946,0,25,-20,4.3,54,4.3);
    mesh(tree,rock,0x3d846a,0,61,-20,31,47,23);
    ornaments.push({object:tree,phase,depth:1,y:-155});
   }
  }
 }
 const ground=mesh(scene,cube,ocean?0x28627d:0x647c69,0,ocean?-245:-203,-80,1090,ocean?39:87,140);
 ground.rotation.x=-.27;
 const stripes=Array.from({length:12},(_,i)=>{
  const mark=mesh(scene,cube,ocean?0x38809a:0xd5c19a,0,ocean?-227:-177,-10,39,2,5);
  return {mark,i};
 });
 const craft=new T.Group();scene.add(craft);
 let propeller;
 if(ocean){
  mesh(craft,sphere,0xf4a322,0,-8,0,71,32,25);
  mesh(craft,sphere,0xe96430,61,-7,5,15,14,14);
  mesh(craft,sphere,0xf99729,-22,-28,0,26,7,20).rotation.z=.2;
  mesh(craft,strut,0xe8b435,10,25,-3,7,22,7);
  mesh(craft,sphere,0x9ed8e0,-1,16,14,40,38,22);
  for(const x of [-37,22,46])mesh(craft,sphere,0x5cb6c8,x,-19,23,7,7,4);
  propeller=new T.Group();craft.add(propeller);propeller.position.x=-69;
  for(const y of [-12,12])mesh(propeller,sphere,0xe1703d,0,y,0,7,16,5);
 }
 const markers=Array.from({length:18},()=>mesh(scene,star,0xffd36b,0,0,50,16,16,16));
 const hazards=Array.from({length:9},()=>{
  const group=new T.Group();scene.add(group);
  const forms=[];
  for(let kind=0;kind<4;kind++){
   const style=new T.Group();group.add(style);forms.push(style);
   const palette=ocean?[0x477885,0x487083,0x676287,0x6b7c70]:[0xb97942,0x3c8e96,0x7c659b,0xd38e47];
   for(let cap=0;cap<(ocean?2:1);cap++){
    const half=new T.Group();style.add(half);
    if(!ocean){
     const direction=kind>=2?-1:1;
     for(const side of [-1,1]){
      const chevron=mesh(half,cube,0xfff0ba,side*.095,direction*.06,.49,.24,.075,.036);
      chevron.rotation.z=side*direction*-.47;
     }
    }
    if(!ocean&&kind===1){
     for(const side of [-1,1])mesh(half,strut,0x2d6973,side*.38,-.32,.34,.18,.32,.18).rotation.z=Math.PI/2;
    }
    if(ocean&&kind===2){
     for(const side of [-1,1]){
      mesh(half,sphere,0xd38dbd,side*.28,cap?.34:-.34,.43,.18,.11,.11);
      mesh(half,strut,0xb688ad,side*.30,cap?.29:-.29,.45,.024,.16,.022).rotation.z=side*.27;
     }
    }
    mesh(half,(ocean&&kind!==3)?rock:cube,palette[kind],0,0,0,ocean&&kind!==3?.58:1,ocean&&kind!==3?.58:1,.72);
    for(const sign of [-1,1]){
     const trim=mesh(half,cube,kind%2?0xffcd7a:0x92c6bd,sign*.30,0,.34,.084,.90,.11);
     trim.rotation.z=sign*(kind===3?.21:.05);
    }
    for(const sign of [-1,1])mesh(half,ocean?rock:sphere,kind===2?0xd399d2:0xffc076,sign*.33,cap? .45:-.44,.38,.13,.15,.17);
   }
  }
  return {group,forms};
 });
 const viewSize=new T.Vector2();
 return {render(obstacles,stars,travel,time,plane){
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  renderer.getSize(viewSize);
  if(viewSize.x!==rect.width||viewSize.y!==rect.height)renderer.setSize(rect.width,rect.height,false);
  for(const {object,phase,depth,y} of ornaments){
   object.position.x=((phase-travel*(.27/(depth+1))%1040+1040)%1040)-510;
   object.position.y=y+(ocean&&depth>0?Math.sin(time*1.6+phase)*3:0);
  }
  for(const {mark,i} of stripes)mark.position.x=((i*93-travel%1116+1116)%1116)-530;
  markers.forEach((mesh,i)=>{
   const item=stars[i];mesh.visible=Boolean(item&&!item.collected);
   if(!mesh.visible)return;
   mesh.position.set(item.x-450,250-item.y,45);
   mesh.rotation.y=Math.sin(time*3+i)*.54;
  });
  hazards.forEach(({group,forms},i)=>{
   const o=obstacles[i];group.visible=Boolean(o);
   if(!o)return;
   const kind=o.kind??0;
   group.position.x=o.x-450+(o.width??o.w)/2;
   for(const [index,form] of forms.entries())form.visible=index===kind;
   const form=forms[kind];
   const spans=ocean?[[0,o.top],[o.bottom,500]]:[[o.y,o.y+o.h]];
   form.children.forEach((half,j)=>{
    const [a,b]=spans[j],h=b-a;
    half.position.set(0,250-(a+b)/2,42);
    half.scale.set(o.width??o.w,h,39);
    half.rotation.y=-.2;
   });
  });
  if(plane){
   craft.position.set(plane.x-450,250-plane.y,68);
   craft.rotation.z=-Math.max(-.17,Math.min(.17,plane.vy/1500));
   propeller.rotation.z=time*12;
  }
  renderer.render(scene,camera);
 }};
}

export function installArcade(mode){
 const stage=document.getElementById('arcade-stage');
 const label=document.getElementById('full-game');
 const leave=document.getElementById('leave-full');
 label.onclick=async()=>{
  stage.classList.remove('arcade-inline');
  stage.classList.add('arcade-expanded');
  try{
   if(stage.requestFullscreen)await stage.requestFullscreen();
   if(document.fullscreenElement===stage)await screen.orientation?.lock?.('landscape');
  }catch{}
 };
 leave.onclick=async()=>{
  stage.classList.remove('arcade-expanded');
  stage.classList.add('arcade-inline');
  if(document.fullscreenElement===stage)await document.exitFullscreen().catch(()=>{});
  screen.orientation?.unlock?.();
 };
 document.addEventListener('fullscreenchange',()=>{
  if(!document.fullscreenElement)stage.classList.remove('arcade-expanded');
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&stage.classList.contains('arcade-expanded'))leave.click();});
 try{
  const player=createArcadeScene(document.getElementById('scene-3d'),mode==='ocean');
  stage.classList.add('arcade-webgl');return player;
 }catch{
  document.getElementById('scene-3d').hidden=true;
  return null;
 }
}
