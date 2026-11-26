import {overTunnel, trackFeatures} from './track.js';
export const laneWidth = 2.85;
const gravity = 27;
const jumpSpeed = 14.6;
const diveSpeed = 26;
const slideSeconds = 0.78;
const kinds = ['car', 'bus', 'longBus', 'bar', 'roadworks'];
export const obstacles = {
  roadworks: {height: .92, length: 1.4, halfWidth: 1.14},
  car: {height: 1.12, length: 2.8, halfWidth: 0.88},
  bus: {height: 2.15, length: 5.2, halfWidth: 0.98, roof: true},
  longBus: {height: 2.35, length: 11.5, halfWidth: 0.98, roof: true},
  bar: {height: 1.72, opening: 1.04, length: 0.5, halfWidth: 1.15}
};

export const powerDuration = 15;
export const flightHeight = 9;
export const powerups = {
  flight: {color: 0x5bdaef, symbol: '✈'},
  magnet: {color: 0xf57183, symbol: '🧲'},
  shield: {color: 0x84e8af, symbol: '⬡'}
};
const powerKinds = Object.keys(powerups);
export function attractedPlayer(run, star) {
  if (star.kind !== 'star') return null;
  return run.players.find((player, index) => !player.out && player.magnet > 0 &&
    !(star.taken & (1 << index)) &&
    Math.abs(star.distance - run.distance) < 11 &&
    Math.abs(star.y - (player.y + 1)) < 3.8);
}
export const runningSpeed = time => 12 + 24 * -Math.expm1(-time / 85);

export function makeRun(avatars, random = Math.random) {
  const firstLane = Math.floor(random()*3)-1;
  const firstDistance = 13 + random()*10;
  const firstPower = powerKinds[Math.floor(random()*powerKinds.length)];
  return {
    distance: 0, time: 0, players: avatars.map((avatar, index) => {
      const lane = avatars.length === 1 ? 0 : index * 2 - 1;
      return {avatar, lane, x: lane * laneWidth, y: 0, vy: 0, slide: 0,
        support: null, flight: 0, magnet: 0, shield: false, glide: false, protection: 0, ignored: null, diving: false, stars: 0, distance: 0, out: false};
    }),
    objects: [{kind:firstPower, lane:firstLane,
      distance:firstDistance, y:1.05, taken:0}], nextWave: 33, wave: 0,
    nextReward: 2 + Math.floor(random()*2),
    rewardBag: powerKinds.filter(kind=>kind!==firstPower), random
  };
}

export function move(player, command) {
  if (!player || player.out) return;
  if (command === 'left' || command === 'right') {
    player.lane = Math.max(-1, Math.min(1, player.lane + (command === 'left' ? -1 : 1)));
  } else if (player.flight || player.glide) {
    return;
  } else if (command === 'jump' && (player.y === 0 || player.support)) {
    player.slide = 0;
    player.vy = jumpSpeed;
    player.support = null;
    player.y += 0.001;
  } else if (command === 'down') {
    if (player.y > 0 && !player.support) {
      player.vy = -diveSpeed;
      player.diving = true;
    } else player.slide = slideSeconds;
  }
}

function spawn(run) {
  const feature = trackFeatures(run.nextWave)[0];
  const onBridge = feature.kind === 'bridge' && run.nextWave >= feature.start &&
    run.nextWave < feature.start + feature.length;
  const first = Math.floor(run.random() * 3) - 1;
  const other = [-1, 0, 1].filter(lane => lane !== first);
  const choices = onBridge ? ['roadworks','bar','bus'] : kinds;
  const kind = choices[Math.floor(run.random() * choices.length)];
  run.objects.push({kind, lane: first, distance: run.nextWave, taken: 0});
  if (run.wave > 1 && run.random() > (onBridge ? .22 : .48)) {
    const second = other.splice(Math.floor(run.random() * 2), 1)[0];
    run.objects.push({kind: kinds[Math.floor(run.random() * kinds.length)], lane: second, distance: run.nextWave, taken: 0});
  }
  const route = other[Math.floor(run.random() * other.length)];
  for (const offset of [-5, -2.5, 0, 2.5, 5]) {
    run.objects.push({kind: 'star', lane: route, distance: run.nextWave + offset, y: 1.05, taken: 0});
  }
  if (obstacles[kind].roof) {
    const roof = obstacles[kind];
    for (let offset = -roof.length / 2 + 1; offset < roof.length / 2; offset += 1.8) {
      run.objects.push({kind: 'star', lane: first, distance: run.nextWave + offset, y: roof.height + .9, taken: 0});
    }
  } else if (kind === 'car') {
    run.objects.push({kind: 'star', lane: first, distance: run.nextWave, y: obstacles.car.height + 1, taken: 0});
  }
  if (run.wave >= run.nextReward) {
    if (!run.rewardBag.length) run.rewardBag = [...powerKinds];
    const [power] = run.rewardBag.splice(Math.floor(run.random()*run.rewardBag.length),1);
    run.objects.push({kind: power, lane: route, distance: run.nextWave - 9 + run.random()*3,
      y: 1.05, taken: 0});
    run.nextReward = run.wave + 2 + Math.floor(run.random()*3);
  }
  const airLane = Math.floor(run.random()*3)-1;
  for (const offset of [-5,-2,1,4]) {
    run.objects.push({kind: 'star', lane: airLane, distance: run.nextWave + offset,
      y: flightHeight + .85, taken: 0});
  }
  run.wave++;
  run.nextWave += 17 + Math.min(10, run.time / 10) + run.random() * 5;
}

export function step(run, dt) {
  run.time += dt;
  run.distance += dt * runningSpeed(run.time);
  while (run.nextWave < run.distance + 105) spawn(run);
  for (let index = 0; index < run.players.length; index++) {
    const player = run.players[index];
    if (player.out) continue;
    player.distance = run.distance;
    player.x += (player.lane * laneWidth - player.x) * (1 - Math.exp(-15 * dt));
    player.slide = Math.max(0, player.slide - dt);
    player.flight = Math.max(0, player.flight - dt);
    player.magnet = Math.max(0, player.magnet - dt);
    player.protection = Math.max(0, player.protection - dt);
    if (player.flight > 0 || (player.glide && overTunnel(run.distance + 3) && player.y > 6.9)) {
      player.y = Math.min(flightHeight, player.y + 22 * dt);
      player.vy = 0;
    } else if (player.glide) {
      player.y = Math.max(0, player.y - 9 * dt);
      if (!player.y) {
        player.glide = false;
        player.protection = .8;
      }
    }
    const onRoof = object => Math.abs(run.distance - object.distance) <= obstacles[object.kind].length / 2 + .31 &&
      Math.abs(player.x - object.lane * laneWidth) <= obstacles[object.kind].halfWidth + .23;
    if (player.support && !onRoof(player.support)) player.support = null;
    const previousY = player.y;
    if (!player.glide && !player.support && player.y > 0) {
      player.vy -= gravity * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        if (player.diving) player.slide = slideSeconds;
        player.diving = false;
      }
    }
    if (!player.glide && !player.support && player.vy <= 0) {
      const roof = run.objects.find(object => obstacles[object.kind]?.roof && onRoof(object) &&
        previousY >= obstacles[object.kind].height && player.y <= obstacles[object.kind].height);
      if (roof) {
        player.support = roof;
        player.y = obstacles[roof.kind].height;
        player.vy = 0;
        if (player.diving) player.slide = slideSeconds;
        player.diving = false;
      }
    }
    const height = player.slide > 0 ? 0.72 : 1.65;
    for (const object of run.objects) {
      const depth = Math.abs(run.distance - object.distance);
      const side = Math.abs(player.x - object.lane * laneWidth);
      if (object.kind === 'star' || Object.hasOwn(powerups, object.kind)) {
        const touch = depth < 1.1 && side < .85 &&
          object.y >= player.y - .25 && object.y <= player.y + height + .45;
        const pull = object.kind === 'star' && player.magnet > 0 && depth < 2.4 &&
          Math.abs(object.y - (player.y + 1)) < 3.8;
        if (!(object.taken & (1 << index)) && (touch || pull)) {
          object.taken |= 1 << index;
          if (object.kind === 'star') player.stars++;
          if (object.kind === 'magnet') player.magnet = powerDuration;
          if (object.kind === 'shield') player.shield = true;
          if (object.kind === 'flight') {
            player.flight = powerDuration;
            player.glide = true;
            player.support = null;
            player.diving = false;
            player.slide = 0;
            player.vy = 0;
          }
        }
        continue;
      }
      if (player.glide || player.protection || player.ignored === object) continue;
      const hazard = obstacles[object.kind];
      if (depth > hazard.length / 2 + 0.31 || side > hazard.halfWidth + 0.23) continue;
      const clears = player.y >= hazard.height ||
        (hazard.opening && player.y + height < hazard.opening);
      if (!clears && player.shield) {
        player.shield = false;
        player.ignored = object;
        player.protection = .65;
        continue;
      }
      if (!clears) {
        player.out = true;
        break;
      }
    }
  }
  run.objects = run.objects.filter(object => object.distance > run.distance - 19);
}
