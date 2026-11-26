import * as THREE from './vendor/three.module.min.js';
import { laneWidth, obstacles, powerups, attractedPlayer } from './simulation.js';
import {trackFeatures, nextSigns, roadSignOpacity, adLines, railwayScene} from './track.js';

import {districtCount, districtModel, roadsidePhrases, makeTextPanel, roadsideBoard, advertisingBoard, advertisingHeight} from './district.js';

const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(1, 18, 12);
const wheel = new THREE.CylinderGeometry(1, 1, 1, 12);
const disk = new THREE.CircleGeometry(1, 20);
const materials = new Map();
const material = color => {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({color, roughness: 0.78}));
  return materials.get(color);
};
function part(parent, geometry, color, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(geometry, typeof color === 'number' ? material(color) : color);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}
const block = (parent, color, x,y,z,w,h,d) => part(parent, box, color, x,y,z,w,h,d);
const oval = (parent, color, x,y,z,w,h,d) => part(parent, sphere, color, x,y,z,w,h,d);
const shadowMat = new THREE.MeshBasicMaterial({color: 0x102229, transparent: true, opacity: 0.23, depthWrite: false});
const starMat = new THREE.MeshStandardMaterial({
  color: 0xffc335, metalness: 0.35, roughness: 0.34, emissive: 0x9c5503, emissiveIntensity: 0.35
});
const goldenMat = new THREE.MeshStandardMaterial({
  color:0xfff2ac, emissive:0xffc432, emissiveIntensity:1.25, metalness:.18, roughness:.24
});
const goldenSpark = new THREE.MeshBasicMaterial({color:0xfff6cf,fog:false});
const starShape = new THREE.Shape();
for (let i = 0; i < 10; i++) {
  const angle = Math.PI / 2 + i * Math.PI / 5;
  const radius = i % 2 ? 0.19 : 0.42;
  const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
  if (i) starShape.lineTo(x, y); else starShape.moveTo(x, y);
}
starShape.closePath();
const starGeo = new THREE.ExtrudeGeometry(starShape, {depth: 0.12, bevelEnabled: true,
  bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, steps: 1});
const ringGeo = new THREE.TorusGeometry(0.47, 0.012, 6, 24);
const ringMat = new THREE.MeshBasicMaterial({color: 0xffd479});

function shadow(parent, width, length) {
  const mark = part(parent, disk, shadowMat, 0, 0.018, 0, width, length, 1);
  mark.rotation.x = -Math.PI / 2;
  return mark;
}

function tree(group, x, z, variant) {
  block(group, 0x8c6349, x, .7, z, .23, 1.4, .23);
  oval(group, variant ? 0x548d62 : 0x447d55, x, 1.74, z, .78, .92, .69);
  oval(group, 0x70a46c, x-.31, 1.87, z, .51, .62, .53);
}

function waterfrontSegment(index) {
  const segment = new THREE.Group();
  block(segment, 0x515967, 0, -.13, 0, 9.4, .24, 24);
  for (const side of [-1, 1]) {
    block(segment, 0xf0e0ba, side * 5.77, -.04, 0, 2.14, .29, 24);
    block(segment, 0xcfd5ce, side * 4.75, .09, 0, .19, .17, 24);
    block(segment, 0xeddfbf, side * 1.43, .002, -6, .045, .015, 4.5);
    block(segment, 0xeddfbf, side * 1.43, .002, 6, .045, .015, 4.5);
    for (const z of [-7.2, 5.5]) {
      block(segment, 0x355a64, side * 5.2, 1.05, z, .12, 2.1, .12);
      block(segment, 0xffecb4, side * 5.2, 2.12, z, .36, .16, .31);
    }
  }
  block(segment, 0x25859e, -12.25, -.29, 0, 11.1, .12, 24);
  block(segment, 0x9ed5d6, -7.2, .36, 0, .15, .1, 24);
  for (const z of [-9,-3,3,9]) {
    block(segment, 0xd2dfd9, -7.2, .19, z, .15, .42, .14);
    block(segment, index % 2 ? 0x75b4bf : 0x5faab9, -10.6, -.221, z, 2.2, .018, .21);
  }
  tree(segment, -6.37, -3.7, index % 2);
  tree(segment, 6.2, 6, index % 2);
  return segment;
}

function makeAvatar(avatar) {
  const skin = 0xb97853, girl = avatar === 'habiba';
  const cloth = girl ? 0x9857a7 : 0x193a6b;
  const trim = girl ? 0xd998d4 : 0xecb752;
  const group = new THREE.Group();
  const ground = shadow(group, .43, .56);
  const body = new THREE.Group();
  group.add(body);
  const torso = new THREE.Group();
  body.add(torso);
  const robe = new THREE.CylinderGeometry(.27, girl ? .45 : .41, 1.36, 18);
  part(torso, robe, cloth, 0, .695, 0, 1, 1, .72);
  oval(torso, girl ? trim : 0x352825, 0, 1.63, .02, .255, .274, .225);
  oval(torso, skin, 0, 1.61, -.1, .202, .21, .13);
  if (girl) {
    oval(torso, trim, 0, 1.39, .028, .265, .17, .21);
    oval(torso, cloth, .04, 1.24, .159, .175, .16, .076);
  } else {
    part(torso,new THREE.CylinderGeometry(.218,.245,.17,24),0xf2eee0,0,1.81,.008,1,1,.95);
    oval(torso,0xf2eee0,0,1.89,.008,.218,.052,.207);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * .29, 1.31, .02);
    torso.add(arm);
    oval(arm, cloth, 0, -.19, 0, .128, .26, .125);
    oval(arm, skin, 0, -.408, 0, .075, .084, .075);
    arms.push(arm);
  }
  const trail = oval(body, 0x56d9f5, 0, .33, .33, .22, .32, .16);
  const aura = part(body, ringGeo, new THREE.MeshBasicMaterial({color:0x84e8af}), 0, .84, 0, 1.62, 1.96, 1);
  return {group, body, torso, arms, ground, trail, aura};
}

function makeHazard(kind) {
  const group = new THREE.Group();
  if (Object.hasOwn(powerups, kind)) {
    const {color} = powerups[kind];
    const rim = new THREE.MeshBasicMaterial({color});
    part(group, ringGeo, rim, 0, 0, 0, 1.45, 1.45, 1.45);
    if (kind === 'flight') {
      for (const side of [-1,1]) {
        const fin = block(group, color, side*.21, -.05, 0, .44, .13, .18);
        fin.rotation.z = side*.52;
      }
      oval(group, 0xf7fcff, 0, .08, 0, .12, .33, .13);
    } else if (kind === 'magnet') {
      for (const side of [-1,1]) {
        block(group, color, side*.18, .035, 0, .14, .41, .15);
        block(group, 0xf7fcff, side*.18, .26, 0, .14, .11, .15);
      }
      block(group, color, 0, -.20, 0, .43, .14, .15);
    } else if (kind === 'golden') {
      part(group,starGeo,goldenMat,0,.04,-.09,1.28,1.28,1);
      const badge = part(group,new THREE.PlaneGeometry(.59,.20),panelMaterial('×2',false),
        0,-.59,.13,1,1,1);
      badge.material.side = THREE.DoubleSide;
      group.userData.sparkles = [[-.51,.47],[.56,.26],[.44,-.40]].map(([x,y]) =>
        part(group,ringGeo,goldenSpark,x,y,.04,.19,.19,1));
    } else if (kind === 'shoes') {
      for (const side of [-1,1]) {
        oval(group,0xf5eaff,side*.18,0,0,.13,.2,.075);
        block(group,color,side*.18,-.15,.04,.24,.07,.08);
      }
    } else {
      const emblem = block(group, color, 0, 0, 0, .47, .47, .12);
      emblem.rotation.z = Math.PI/4;
    }
    return {group};
  }
  if (kind === 'roadworks') {
    block(group, 0xef823d, 0, .43, 0, 2.25, .86, .85);
    block(group, 0xf4dca0, 0, .64, .438, 2.02, .13, .03);
    block(group, 0x3c414c, 0, .1, 0, 2.27, .17, 1.25);
    for (const side of [-1,1]) oval(group, 0xffc15f, side*.85, .84, 0, .14, .12, .14);
    return {group};
  }
  if (kind === 'star') {
    part(group, starGeo, starMat, 0, 0, -.06, 1, 1, 1);
    part(group, ringGeo, ringMat, 0, 0, 0, 1, 1, 1);
    return {group};
  }
  if (kind === 'bar') {
    for (const side of [-1, 1]) block(group, 0xecb350, side * 1.1, .79, 0, .14, 1.58, .25);
    block(group, 0xfdc85e, 0, 1.35, 0, 2.46, .58, .28);
    for (const i of [-2,-1,0,1,2]) {
      const stripe = block(group, 0x4a3d35, i*.43, 1.35, .152, .15, .46, .03);
      stripe.rotation.z = -.43;
    }
    return {group};
  }
  const bus = obstacles[kind].roof;
  const {height, length} = obstacles[kind];
  const width = bus ? 1.96 : 1.76;
  const paint = kind === 'longBus' ? 0xcf7659 : bus ? 0xeac158 : 0x24a897;
  shadow(group, width * .58, length * .57);
  block(group, paint, 0, .52, 0, width, .73, length);
  block(group, paint, 0, (height + .77)/2, bus ? -.04 : -.20, width-.10, height-.77, length-(bus ? .11 : 1.0));
  block(group, 0x3c5c6c, 0, bus ? 1.43 : .94, bus ? length / 2 - .08 : .72, width-.27, bus ? .63 : .23, .055);
  block(group, 0x293d4b, 0, .34, length/2, width*.94, .13, .09);
  for (const side of [-1, 1]) {
    for (const z of [-length*.34, length*.34]) {
      const tire = part(group, wheel, 0x26323c, side*(width/2-.01), .28, z, .26, .22, .26);
      tire.rotation.z = Math.PI/2;
    }
    block(group, 0xe67367, side*width*.34, .64, length/2+.02, .26, .125, .055);
    for (const z of bus ? Array.from({length: Math.floor(length)}, (_,i) => i - (Math.floor(length)-1)/2) : [-.35, .5]) {
      block(group, 0x466c7b, side*(width/2-.04), bus ? 1.46 : .94, z,
        .03, bus ? .58 : .18, bus ? .84 : .63);
    }
  }
  return {group};
}

function roadFeature({kind,style,length,wall,trim}) {
  const group = new THREE.Group();
  const color = new THREE.Color(wall).getHex();
  const accent = new THREE.Color(trim).getHex();
  if (kind === 'bridge') {
    block(group, style === 'harbor' ? 0x247e9e : 0x925b46, 0, -.39, -length/2, 40, .6, length);
    block(group, 0x546474, 0, .02, -length/2, 9.65, .14, length);
    for (const side of [-1,1]) {
      for (let z=2; z<length-2; z+=6) block(group,0xffe7a9,side*1.43,.1,-z,.05,.02,2.9);
      block(group, accent, side*4.93, .97, -length/2, .1, .15, length);
      for (let z=1; z<length; z+=4) block(group, color, side*4.93, .56, -z, .18, 1.12, .17);
      for (const z of [8,length-8]) block(group, color, side*5.15, 3.15, -z, .52, 6.3, .53);
      for (let z=9; z<length-8; z+=4) {
        const height = 2 + Math.abs(z-length/2)/length*7;
        block(group, accent, side*5.1, height/2, -z, .055, height, .055);
      }
    }
    for (const z of [8,length-8]) block(group, accent, 0, 6.1, -z, 10.7, .23, .42);
    return group;
  }
  const roof = new THREE.Group();
  group.add(roof);
  const transparent = new THREE.MeshStandardMaterial({color:0x8fcfe8,transparent:true,opacity:.29,depthWrite:false});
  for (const side of [-1,1]) {
    block(group, color, side*5.28, 2.1, -length/2, .55, 4.2, length);
    block(group, accent, side*4.97, 1.25, -length/2, .06, .13, length);
  }
  if (style === 'arch') {
    const canopy = new THREE.CylinderGeometry(5.3,5.3,length,20,1,true,0,Math.PI);
    const ceiling = new THREE.Mesh(canopy,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide}));
    canopy.rotateZ(Math.PI/2).rotateY(Math.PI/2);
    ceiling.position.set(0,2,-length/2);
    roof.add(ceiling);
  } else {
    block(roof, style === 'glass' ? transparent : color, 0, 6.95, -length/2, 11.2, .35, length);
  }
  for (let z=0; z<=length; z+= style === 'metro' ? 6 : 9) {
    if (style === 'arch') {
      const arch = new THREE.TorusGeometry(5.15,.16,8,26,Math.PI);
      part(roof,arch,accent,0,2,-z,1,1,1);
    } else {
      block(roof,accent,0,6.62,-z,10.8,.2,.28);
      for (const side of [-1,1]) block(group,accent,side*5.15,4,-z,.23,5,.28);
    }
    for (const side of [-1,1]) block(roof,0xfff0b5,side*3.26,5.9,-z,1.12,.07,.25);
  }
  group.userData.roof = roof;
  return group;
}

function billboardMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.scale(2,2);
  ctx.fillStyle = '#122b48';
  ctx.fillRect(0,0,1024,256);
  ctx.strokeStyle = '#ffd37e';
  ctx.lineWidth = 12;
  ctx.strokeRect(9,9,1006,238);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 78px Arial';
  ctx.fillText(adLines[0],512,109);
  ctx.fillStyle = '#ffd37e';
  ctx.font = 'bold 67px Arial';
  ctx.fillText(adLines[1],512,199);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshBasicMaterial({map,fog:false,depthTest:false,depthWrite:false});
}
function fadeSign(group, opacity) {
  group.traverse(node=>{
    if (!node.isMesh) return;
    node.material.opacity = opacity;
    const transparent = opacity < 1 || !node.material.depthTest;
    if (node.material.transparent !== transparent) {
      node.material.transparent = transparent;
      node.material.depthWrite = node.material.depthTest && !transparent;
      node.material.needsUpdate = true;
    }
  });
}
function makeBillboard(face) {
  const group = new THREE.Group();
  const {width,height,centerY} = advertisingBoard;
  const postHeight = centerY-height/2;
  const posts = [-1,1].map(side=>block(group,0x315063,side*5.16,postHeight/2,0,.25,postHeight,.36));
  const board = part(group,new THREE.PlaneGeometry(width,height),face.clone(),0,centerY,.05,1,1,1);
  board.renderOrder = 20;
  posts.forEach(post=>{post.material = post.material.clone();});
  group.userData = {posts,board};
  return group;
}

function railway() {
  const track = new THREE.Group();
  block(track,0x6a706b,-12,-.01,0,3.4,.16,168);
  for(const side of [-1,1]) block(track,0xc9d4d7,-12+side*.74,.14,0,.075,.085,168);
  for(let z=-81;z<84;z+=2.5) block(track,0x544b48,-12,.075,z,2.28,.13,.23);
  const station = new THREE.Group();
  block(station,0xd3ba8d,-9.25,.2,0,2.25,.45,34);
  block(station,0xffd46e,-10.25,.45,0,.12,.025,34);
  block(station,0x326770,-8.8,3.1,0,2.4,.19,24);
  for(const z of [-10,0,10]) block(station,0x51828b,-8.1,1.75,z,.19,2.65,.19);
  const train = new THREE.Group();
  for (const z of [-12,0,12]) {
    block(train,0xc9dce1,-12,1.3,z,2.35,2.43,11.6);
    block(train,0x2b7083,-12,2.48,z,2.22,.26,11.25);
    block(train,0x1c576d,-10.81,.67,z,.045,.30,11.4);
    for (const offset of [-4,-2,2,4]) block(train,0x376576,-10.81,1.76,z+offset,.048,.74,1.33);
    block(train,0x2a4f5a,-10.8,1.12,z,.058,1.62,1.3);
  }
  const riders = [0x9d5860,0xffc68c,0x2f6b76,0xb088c6,0x687e63].map((color,i)=>{
    const group = new THREE.Group();
    const x = -10.6;
    oval(group,0xbe8464,0,1.48,0,.14,.17,.14);
    const coat = new THREE.CylinderGeometry(.16,.24,1.02,8);
    part(group,coat,color,0,.83,0,1,1,1);
    const legs = [-1,1].map(side=>block(group,0x405263,side*.09,.24,0,.095,.36,.13));
    station.add(group);
    return {group,x,z:-9+i*4.5,legs};
  });
  return {track,station,train,riders};
}

function districtPrototype(index, labels) {
  const group = new THREE.Group();
  for(const {type,color,x,y,z,w,h,d,text} of districtModel(index)) {
    if (type==='label') {
      if(!labels.has(text)) labels.set(text,panelMaterial(text,false));
      part(group,new THREE.PlaneGeometry(w,h),labels.get(text),x,y,z,1,1,1);
    } else if(type==='box') block(group,color,x,y,z,w,h,d);
    else if(type==='dome') oval(group,color,x,y,z,w,h,d);
    else {
      const sides = type==='roof'?4:12;
      const geometry = new THREE.CylinderGeometry(type==='column'?1:0,1,1,sides);
      if(type==='roof') geometry.rotateY(Math.PI/4);
      const width = type==='roof'?w*1.42:w;
      const depth = type==='roof'?d*1.42:d;
      part(group,geometry,color,x,y,z,width,h,depth);
    }
  }
  return group;
}
function panelMaterial(text, roadside) {
  const map = new THREE.CanvasTexture(makeTextPanel(text,roadside));
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshBasicMaterial({map,fog:!roadside,depthTest:!roadside,depthWrite:!roadside});
}
function roadPanel() {
  const group = new THREE.Group();
  const {width,height,centerY} = roadsideBoard;
  const postHeight = centerY-height/2;
  for(const side of [-1,1]) {
    const post=block(group,0x425658,side*width*.38,postHeight/2,0,.15,postHeight,.19);
    post.material=post.material.clone();
  }
  const face = part(group,new THREE.PlaneGeometry(width,height),
    new THREE.MeshBasicMaterial({color:0x143b42}),0,centerY,.09,1,1,1);
  face.renderOrder = 21;
  return {group,face,text:''};
}

export function createWorld(canvas, context) {
  const renderer = new THREE.WebGLRenderer({canvas, context});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa7d9df);
  scene.fog = new THREE.Fog(0xa7d9df, 36, 137);
  const camera = new THREE.PerspectiveCamera(59, 1, .10, 155);
  camera.position.set(0, 4.65, 8.2);
  scene.add(new THREE.HemisphereLight(0xf4fcff, 0xbd9d76, 2.14));
  const sun = new THREE.DirectionalLight(0xffe2ae, 2.65);
  sun.position.set(-12, 23, 3);
  scene.add(sun);
  oval(scene, new THREE.MeshBasicMaterial({color: 0xfff0bd, fog:false}), -27, 22, -112, 5.7, 5.7, 5.7);
  for (const [x,y,z,w,h,d] of [[-24,-1,-110,28,10,12],[-8,-2,-124,22,8,12],[20,-5,-133,28,13,14]]) {
    oval(scene, 0x8cab9a, x,y,z,w,h,d);
  }
  const scenery = Array.from({length: 7}, (_,i) => {
    const group = waterfrontSegment(i);
    scene.add(group);
    return group;
  });
  const labels = new Map();
  const district = Array.from({length:districtCount},(_,i)=>districtPrototype(i, labels));
  const districtSlots = Array.from({length:7},()=>new THREE.Group());
  const phraseBoards = Array.from({length:2},roadPanel);
  scene.add(...districtSlots,...phraseBoards.map(board=>board.group));
  const rail = railway();
  scene.add(rail.track,rail.station,rail.train);
  const features = new Map();
  const face = billboardMaterial();
  const signs = Array.from({length:2},()=>{
    const group = makeBillboard(face);
    scene.add(group);
    return group;
  });
  const renderObjects = new Map();
  const pool = new Map();
  let racers = [];
  let cameraX = 0, lift = 0;
  const resize = () => {
    const {clientWidth: width, clientHeight: height} = canvas;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.92 ? 68 : 57;
    camera.updateProjectionMatrix();
  };
  resize();
  function reset(run) {
    for (const model of racers) scene.remove(model.group);
    for (const [object, model] of renderObjects) recycle(object, model);
    racers = run.players.map(player => {
      const model = makeAvatar(player.avatar);
      scene.add(model.group);
      return model;
    });
    cameraX = lift = 0;
  }
  function recycle(object, model) {
    scene.remove(model.group);
    if (!pool.has(object.kind)) pool.set(object.kind, []);
    pool.get(object.kind).push(model);
    renderObjects.delete(object);
  }
  function draw(run, time) {
    const railway = railwayScene(run.distance);
    rail.track.position.z = -58 + run.distance%2.5;
    rail.station.position.z = run.distance-railway.station;
    rail.train.position.z = run.distance-railway.train;
    for (const [i,rider] of rail.riders.entries()) {
      const walking = Math.max(0,railway.unloading-i*.1);
      rider.group.visible = walking>0;
      rider.group.position.set(rider.x+walking*1.7,.45,rider.z+walking*3);
      rider.legs.forEach((leg,j)=>leg.rotation.x=Math.sin(walking*19+j*Math.PI)*.44);
    }
    const upcoming = trackFeatures(run.distance - 14);
    for (const [start,group] of features) {
      if (!upcoming.some(feature=>feature.start === start)) {
        scene.remove(group);
        group.traverse(node=>{
          if (node.geometry && ![box,sphere,wheel].includes(node.geometry)) node.geometry.dispose();
          if (node.material && ![...materials.values()].includes(node.material)) node.material.dispose();
        });
        features.delete(start);
      }
    }
    const mixedHeight = run.players.some(player=>!player.out && player.glide) &&
      run.players.some(player=>!player.out && !player.glide);
    for (const feature of upcoming) {
      if (!features.has(feature.start)) {
        const group = roadFeature(feature);
        scene.add(group);
        features.set(feature.start,group);
      }
      const group = features.get(feature.start);
      group.position.z = run.distance - feature.start;
      group.visible = group.position.z > -145;
      if (group.userData.roof) group.userData.roof.visible = !mixedHeight;
    }
    const ads = nextSigns(run.distance);
    for (const [i,sign] of signs.entries()) {
      sign.visible = ads[i] !== undefined;
      if (sign.visible) {
        fadeSign(sign,roadSignOpacity(run.distance,ads[i]));
        const distance = ads[i]-run.distance;
        const centerY = advertisingHeight(run.players,distance);
        sign.position.z = -distance;
        sign.userData.board.position.y = centerY;
        const postHeight = centerY-advertisingBoard.height/2;
        for(const post of sign.userData.posts) {
          post.position.y = postHeight/2;
          post.scale.y = postHeight;
        }
      }
    }
    const offset = run.distance % 24;
    const segment = Math.floor(run.distance / 24);
    for (let i = 0; i < scenery.length; i++) {
      const piece = scenery[(i + segment) % scenery.length];
      piece.position.z = 11 - i * 24 + offset;
      const middle = run.distance - piece.position.z;
      piece.visible = !upcoming.some(({kind,start,length})=>kind === 'bridge' &&
        middle > start+12 && middle < start+length-12);
    }
    for (const [i,slot] of districtSlots.entries()) {
      const index = segment+i;
      const prototype = index%district.length;
      if(slot.userData.prototype !== prototype) {
        slot.clear();
        slot.add(district[prototype].clone(true));
        slot.userData.prototype = prototype;
      }
      slot.position.z = 11-i*24+offset;
      const middle = run.distance-slot.position.z;
      slot.visible = !upcoming.some(({kind,start,length})=>kind==='bridge' &&
        middle>start && middle<start+length);
    }
    const phrases = roadsidePhrases(run.distance,run.roadPhrases);
    for(const [i,board] of phraseBoards.entries()) {
      const sign=phrases[i];
      board.group.visible = Boolean(sign);
      if(!board.group.visible) continue;
      if(board.text!==sign.text) {
        board.face.material.map?.dispose();
        board.face.material.dispose();
        board.face.material = panelMaterial(sign.text,true);
        board.text = sign.text;
      }
      fadeSign(board.group,roadSignOpacity(run.distance,sign.at));
      board.group.position.set(sign.x,0,run.distance-sign.at);
    }
    const objects = new Set(run.objects);
    for (const [object, model] of renderObjects) if (!objects.has(object)) recycle(object, model);
    for (const object of run.objects) {
      if (!renderObjects.has(object)) {
        const model = pool.get(object.kind)?.pop() || makeHazard(object.kind);
        scene.add(model.group);
        renderObjects.set(object, model);
      }
      const {group} = renderObjects.get(object);
      group.position.set(object.lane * laneWidth, object.y || 0, run.distance - object.distance);
      if (object.kind === 'star' || Object.hasOwn(powerups, object.kind)) {
        const target = attractedPlayer(run, object);
        if (target) {
          const pull = Math.max(0, 1 - Math.abs(group.position.z) / 11);
          group.position.x += (target.x - group.position.x) * pull;
          group.position.y += (target.y + 1 - group.position.y) * pull;
        }
        group.visible = object.taken !== (1 << racers.length) - 1;
        group.rotation.y = object.kind==='golden' ? Math.sin(time*2.2)*.31 : time*2.9+object.distance;
        if (group.userData.sparkles) {
          group.userData.sparkles.forEach((spark,i)=>{
            const pulse=.1+.16*Math.pow(.5+.5*Math.sin(time*6+i*1.9),2);
            spark.scale.set(pulse,pulse,1);
          });
        }
        group.position.y += Math.sin(time * 3 + object.distance) * .11;
      }
    }
    const active = run.players.filter(player => !player.out);
    const center = active.length ? active.reduce((sum, p) => sum + p.x, 0) / active.length : cameraX;
    cameraX += (center * .38 - cameraX) * .09;
    lift += (Math.max(0, ...active.map(player => player.glide ? player.y : 0)) - lift) * .09;
    camera.position.set(cameraX, 4.65 + lift*.94, 8.2 + lift*.43);
    camera.lookAt(cameraX * .72, 1.78 + lift*.52, -10);
    run.players.forEach((player,index) => {
      const model = racers[index];
      model.group.visible = !player.out;
      const offset = racers.length === 1 ? 0 : index === 0 ? -.33 : .33;
      model.group.position.x = player.x + offset;
      model.ground.scale.set(.42/(1 + player.y*.3), .59/(1 + player.y*.3), 1);
      const phase = run.time * (12 + Math.min(9, run.time*.06)) + index * 1.8;
      const gait = Math.sin(phase);
      const slide = player.slide > 0;
      model.trail.visible = player.glide;
      model.aura.visible = Boolean(player.shield);
      const grounded = player.y === 0 || player.support;
      model.ground.position.y = (player.support ? player.y : 0) + .018;
      model.body.scale.y = slide ? .43 : 1;
      model.body.position.y = player.y + (!slide && grounded ? Math.abs(gait) * .062 : 0);
      model.torso.rotation.x = slide ? -0.28 : -.12;
      model.body.rotation.z = (player.x - player.lane * laneWidth) * .16;
      for (let i = 0; i < 2; i++) {
        const swing = gait * (i ? 1 : -1);
        model.arms[i].rotation.x = slide ? -.62 : !grounded ? -.81 : -swing*.64;
      }
    });
    renderer.render(scene, camera);
  }
  return {resize, reset, draw};
}
