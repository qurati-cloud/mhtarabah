export const laneWidth = 2.85;
const gravity = 27;
const jumpSpeed = 13.2;
const diveSpeed = 26;
const slideSeconds = 0.78;
const kinds = ['car', 'bus', 'bar'];
export const obstacles = {
  car: {height: 1.12, length: 2.8, halfWidth: 0.88},
  bus: {height: 2.15, length: 3.65, halfWidth: 0.98},
  bar: {height: 1.72, opening: 1.04, length: 0.5, halfWidth: 1.15}
};

export function makeRun(avatars, random = Math.random) {
  return {
    distance: 0, time: 0, players: avatars.map((avatar, index) => {
      const lane = avatars.length === 1 ? 0 : index * 2 - 1;
      return {avatar, lane, x: lane * laneWidth, y: 0, vy: 0, slide: 0,
        diving: false, stars: 0, distance: 0, out: false};
    }),
    objects: [], nextWave: 26, wave: 0, random
  };
}

export function move(player, command) {
  if (!player || player.out) return;
  if (command === 'left' || command === 'right') {
    player.lane = Math.max(-1, Math.min(1, player.lane + (command === 'left' ? -1 : 1)));
  } else if (command === 'jump' && player.y === 0) {
    player.slide = 0;
    player.vy = jumpSpeed;
    player.y = 0.001;
  } else if (command === 'down') {
    if (player.y > 0) {
      player.vy = -diveSpeed;
      player.diving = true;
    } else player.slide = slideSeconds;
  }
}

function spawn(run) {
  const first = Math.floor(run.random() * 3) - 1;
  const other = [-1, 0, 1].filter(lane => lane !== first);
  const kind = kinds[run.wave < 3 ? run.wave : Math.floor(run.random() * kinds.length)];
  run.objects.push({kind, lane: first, distance: run.nextWave, taken: 0});
  if (run.wave > 4 && run.random() > 0.38) {
    const second = other.splice(Math.floor(run.random() * 2), 1)[0];
    run.objects.push({kind: kinds[Math.floor(run.random() * 3)], lane: second, distance: run.nextWave, taken: 0});
  }
  const route = other[Math.floor(run.random() * other.length)];
  for (const offset of [-5, -2.5, 0, 2.5, 5]) {
    run.objects.push({kind: 'star', lane: route, distance: run.nextWave + offset, y: 1.05, taken: 0});
  }
  if (kind !== 'bar' && run.wave > 0) {
    run.objects.push({kind: 'star', lane: first, distance: run.nextWave, y: obstacles[kind].height + 1, taken: 0});
  }
  run.wave++;
  run.nextWave += 17 + Math.min(10, run.time / 10) + run.random() * 5;
}

export function step(run, dt) {
  run.time += dt;
  run.distance += dt * (13 + Math.min(13, run.time * 0.12));
  while (run.nextWave < run.distance + 105) spawn(run);
  for (let index = 0; index < run.players.length; index++) {
    const player = run.players[index];
    if (player.out) continue;
    player.distance = run.distance;
    player.x += (player.lane * laneWidth - player.x) * (1 - Math.exp(-15 * dt));
    player.slide = Math.max(0, player.slide - dt);
    if (player.y > 0) {
      player.vy -= gravity * dt;
      player.y += player.vy * dt;
      if (player.y <= 0) {
        player.y = 0;
        player.vy = 0;
        if (player.diving) player.slide = slideSeconds;
        player.diving = false;
      }
    }
    const height = player.slide > 0 ? 0.72 : 1.65;
    for (const object of run.objects) {
      const depth = Math.abs(run.distance - object.distance);
      const side = Math.abs(player.x - object.lane * laneWidth);
      if (object.kind === 'star') {
        if (!(object.taken & (1 << index)) && depth < 1.1 && side < 0.85 &&
            object.y >= player.y - 0.25 && object.y <= player.y + height + 0.45) {
          object.taken |= 1 << index;
          player.stars++;
        }
        continue;
      }
      const hazard = obstacles[object.kind];
      if (depth > hazard.length / 2 + 0.31 || side > hazard.halfWidth + 0.23) continue;
      const clears = player.y > hazard.height + 0.05 ||
        (hazard.opening && player.y + height < hazard.opening);
      if (!clears) {
        player.out = true;
        break;
      }
    }
  }
  run.objects = run.objects.filter(object => object.distance > run.distance - 16);
}
