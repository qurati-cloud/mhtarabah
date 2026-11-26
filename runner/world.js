import * as THREE from './vendor/three.module.min.js';
import { laneWidth } from './simulation.js';

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
  const base = [0xf2bc89, 0xe9ddbc, 0xe8a48b, 0xc7dbca][index % 4];
  const trim = [0x2a7c82, 0x956148, 0x457a76][index % 3];
  const height = 4.5 + index % 3 * 0.85;
  block(segment, base, 10.15, height / 2-.05, -2, 5.2, height, 11);
  block(segment, 0xd5c2a4, 10.15, height-.03, -2, 5.5, .24, 11.25);
  for (const z of [-5.6, -2, 1.6]) {
    block(segment, trim, 7.48, 1.12, z, .14, 2.09, 1.2);
    block(segment, 0x79a5ad, 7.47, height-.95, z, .15, 1.01, 1.06);
    block(segment, trim, 7.45, height-1.43, z, .31, .13, 1.14);
    const awning = block(segment, trim, 7.03, 2.41, z, 1.09, .13, 1.5);
    awning.rotation.z = .15;
  }
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
  oval(torso, cloth, 0, 1.08, 0, .29, .44, .19);
  block(torso, trim, -.13, 1.05, .182, .027, .57, .023);
  block(torso, trim, .13, 1.05, .182, .027, .57, .023);
  oval(torso, girl ? trim : 0x352825, 0, 1.63, .02, .255, .274, .225);
  oval(torso, skin, 0, 1.61, -.1, .202, .21, .13);
  if (girl) {
    oval(torso, trim, 0, 1.39, .028, .265, .17, .21);
    oval(torso, cloth, .04, 1.24, .159, .175, .16, .076);
  } else {
    oval(torso, cloth, 0, 1.77, .02, .248, .13, .222);
    block(torso, trim, 0, .85, .19, .47, .035, .025);
  }
  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * .29, 1.31, .02);
    torso.add(arm);
    oval(arm, cloth, 0, -.19, 0, .101, .24, .1);
    oval(arm, skin, 0, -.408, 0, .075, .084, .075);
    arms.push(arm);
    const leg = new THREE.Group();
    leg.position.set(side * .134, .75, 0);
    body.add(leg);
    oval(leg, girl ? 0x67356f : 0x203554, 0, -.27, 0, .11, .32, .11);
    oval(leg, 0xe9e1d2, 0, -.66, -.07, .115, .084, .18);
    legs.push(leg);
  }
  return {group, body, torso, legs, arms, ground};
}

function makeHazard(kind) {
  const group = new THREE.Group();
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
  const bus = kind === 'bus', height = bus ? 2.15 : 1.12, length = bus ? 3.65 : 2.8;
  const width = bus ? 1.96 : 1.76;
  const paint = bus ? 0xeac158 : 0x24a897;
  shadow(group, width * .58, length * .57);
  block(group, paint, 0, .52, 0, width, .73, length);
  block(group, paint, 0, (height + .77)/2, bus ? -.04 : -.20, width-.10, height-.77, length-(bus ? .11 : 1.0));
  block(group, 0x3c5c6c, 0, bus ? 1.43 : .94, bus ? 1.76 : .72, width-.27, bus ? .63 : .23, .055);
  block(group, 0x293d4b, 0, .34, length/2, width*.94, .13, .09);
  for (const side of [-1, 1]) {
    for (const z of [-length*.34, length*.34]) {
      const tire = part(group, wheel, 0x26323c, side*(width/2-.01), .28, z, .26, .22, .26);
      tire.rotation.z = Math.PI/2;
    }
    block(group, 0xe67367, side*width*.34, .64, length/2+.02, .26, .125, .055);
    for (const z of bus ? [-1.09, 0, 1.09] : [-.35, .5]) {
      block(group, 0x466c7b, side*(width/2-.04), bus ? 1.46 : .94, z,
        .03, bus ? .58 : .18, bus ? .84 : .63);
    }
  }
  return {group};
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
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
  const renderObjects = new Map();
  const pool = new Map();
  let racers = [];
  let cameraX = 0;
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
    cameraX = 0;
  }
  function recycle(object, model) {
    scene.remove(model.group);
    if (!pool.has(object.kind)) pool.set(object.kind, []);
    pool.get(object.kind).push(model);
    renderObjects.delete(object);
  }
  function draw(run, time) {
    const offset = run.distance % 24;
    const segment = Math.floor(run.distance / 24);
    for (let i = 0; i < scenery.length; i++) {
      scenery[(i + segment) % scenery.length].position.z = 11 - i * 24 + offset;
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
      if (object.kind === 'star') {
        group.visible = object.taken !== (1 << racers.length) - 1;
        group.rotation.y = time * 2.9 + object.distance;
        group.position.y += Math.sin(time * 3 + object.distance) * .11;
      }
    }
    const active = run.players.filter(player => !player.out);
    const center = active.length ? active.reduce((sum, p) => sum + p.x, 0) / active.length : cameraX;
    cameraX += (center * .38 - cameraX) * .09;
    camera.position.x = cameraX;
    camera.lookAt(cameraX * .72, 1.78, -10);
    run.players.forEach((player,index) => {
      const model = racers[index];
      model.group.visible = !player.out;
      const offset = racers.length === 1 ? 0 : index === 0 ? -.33 : .33;
      model.group.position.x = player.x + offset;
      model.ground.scale.set(.42/(1 + player.y*.3), .59/(1 + player.y*.3), 1);
      const phase = run.time * (12 + Math.min(9, run.time*.06)) + index * 1.8;
      const gait = Math.sin(phase);
      const slide = player.slide > 0;
      model.body.scale.y = slide ? .43 : 1;
      model.body.position.y = player.y + (!slide && player.y === 0 ? Math.abs(gait) * .062 : 0);
      model.torso.rotation.x = slide ? -0.28 : -.12;
      model.body.rotation.z = (player.x - player.lane * laneWidth) * .16;
      for (let i = 0; i < 2; i++) {
        const swing = gait * (i ? 1 : -1);
        model.legs[i].rotation.x = slide ? -.47 : player.y > 0 ? -.33 + i*.6 : swing*.74;
        model.arms[i].rotation.x = slide ? -.62 : player.y > 0 ? -.81 : -swing*.64;
      }
    });
    renderer.render(scene, camera);
  }
  return {resize, reset, draw};
}
