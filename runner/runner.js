import { progress, updateProgress } from '../auth/progress.js';
import { connect, connectRunnerGuest } from '../auth/firebase.js';
import { makeRun, move, step } from './simulation.js';
import { createWorld } from './world.js';
import { createCanvasWorld } from './fallback.js';

const el = id => document.getElementById(id);
const track = el('track');
const modes = [...document.querySelectorAll('[data-mode]')];
const avatars = [...document.querySelectorAll('[data-avatar]')];
const number = new Intl.NumberFormat('ar', {maximumFractionDigits: 0});
const recordKey = 'mh_runner_record_v1';
const blank = {distance: 0, stars: 0};
let mode = 'solo';
let avatar = 'mohammad';
let state = 'menu';
let run, graphics;
let last = 0, lastSave = 0, saving = Promise.resolve();
let records = {};
const globalRecords = {};
let leaderboard;
try { records = JSON.parse(progress.getItem(recordKey) || '{}') || {}; } catch {}
const saved = {};
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const selection = () => mode === 'solo' ? [avatar] : ['mohammad','habiba'];

function syncMenu() {
  modes.forEach(button => button.setAttribute('aria-pressed', button.dataset.mode === mode));
  avatars.forEach(button => {
    button.setAttribute('aria-pressed', mode === 'duo' || button.dataset.avatar === avatar);
    button.disabled = mode === 'duo';
  });
  el('soloHelp').hidden = mode !== 'solo';
  el('duoHelp').hidden = mode !== 'duo';
  showBest();
  if (graphics) {
    run = makeRun(selection());
    graphics.reset(run);
    graphics.draw(run, 0);
  }
}

function showBest() {
  const best = records[mode] || blank;
  el('bestDistance').textContent = number.format(best.distance);
  el('bestStars').textContent = number.format(best.stars);
  const global = globalRecords[mode];
  el('worldDistance').textContent = global ? number.format(global.distance) : '—';
  el('worldStars').textContent = global ? number.format(global.stars) : '—';
}

function scores() {
  return {distance: Math.floor(Math.max(...run.players.map(player => player.distance))),
    stars: run.players.reduce((total, player) => total + player.stars, 0)};
}
function maximum(a = blank, b = blank) {
  return {distance: Math.max(a.distance, b.distance), stars: Math.max(a.stars, b.stars)};
}
async function publishGlobal(currentMode, score) {
  const connection = leaderboard;
  if (!connection) return;
  const known = globalRecords[currentMode];
  if (known && known.distance >= score.distance && known.stars >= score.stars) return;
  if (!score.distance && !score.stars) return;
  const {data, db} = connection.auth.currentUser?.emailVerified
    ? connection : await connectRunnerGuest();
  await data.runTransaction(db, async transaction => {
    const ref = data.doc(db, 'runnerWorldRecords', currentMode);
    const current = (await transaction.get(ref)).data() || blank;
    const best = maximum(current, score);
    if (best.distance !== current.distance || best.stars !== current.stars) transaction.set(ref, best);
  });
}

connect().then(connection => {
  if (!connection) return;
  leaderboard = connection;
  const {data, db, auth, authApi} = connection;
  for (const category of ['solo','duo']) {
    data.onSnapshot(data.doc(db, 'runnerWorldRecords', category), snapshot => {
      if (!snapshot.metadata.fromCache || snapshot.exists()) {
        globalRecords[category] = snapshot.data() || blank;
        showBest();
      }
    }, error => console.warn('Runner leaderboard unavailable', error));
  }
  authApi.onAuthStateChanged(auth, user => {
    if (!user?.emailVerified) return;
    for (const category of ['solo','duo']) {
      if (records[category]) publishGlobal(category, records[category]).catch(error => console.warn(error));
    }
  });
}).catch(error => console.warn(error));

function saveRecord() {
  if (!run || state === 'menu') return;
  const currentMode = mode;
  const next = maximum(records[currentMode], scores());
  records[currentMode] = next;
  saving = saving.then(async () => {
    const previous = saved[currentMode];
    if (previous && next.distance <= previous.distance && next.stars <= previous.stars) {
      await publishGlobal(currentMode, next).catch(error => console.warn(error));
      return;
    }
    if (!next.distance && !next.stars) return;
    try {
      const remote = await updateProgress(recordKey, current => {
        const entries = current || {};
        return {...entries, [currentMode]: maximum(entries[currentMode], next)};
      });
      const best = remote[currentMode];
      saved[currentMode] = best;
      records[currentMode] = maximum(records[currentMode], best);
      el('recordStatus').hidden = true;
      showBest();
      await publishGlobal(currentMode, best);
    } catch { el('recordStatus').hidden = false; }
  });
}

function paintHud() {
  run.players.forEach((player, index) => {
    const id = index + 1;
    el('p' + id + 'Distance').textContent = number.format(Math.floor(player.distance));
    el('p' + id + 'Stars').textContent = number.format(player.stars);
    el('p' + id + 'Out').hidden = !player.out;
  });
}
function begin() {
  if (!graphics) return;
  run = makeRun(selection());
  graphics.reset(run);
  lastSave = 0;
  last = 0;
  state = 'playing';
  el('menu').hidden = true;
  el('overlay').hidden = true;
  el('hud').hidden = false;
  el('p1Portrait').classList.toggle('habiba', run.players[0].avatar === 'habiba');
  el('p2Hud').hidden = mode !== 'duo';
  el('pad2').hidden = mode !== 'duo';
  el('touchControls').hidden = !isTouch;
  paintHud();
  if (isTouch) track.scrollIntoView({block:'nearest'});
  el('pause').focus({preventScroll: true});
}
function overlay(finished) {
  state = finished ? 'finished' : 'paused';
  saveRecord();
  el('overlay').hidden = false;
  el('touchControls').hidden = true;
  el('pausedTitle').hidden = finished;
  el('endTitle').hidden = !finished;
  el('resume').hidden = finished;
  el('again').hidden = !finished;
  el('result').hidden = !finished;
  if (finished) {
    const total = scores();
    el('result').textContent = number.format(total.distance) + ' · ★ ' + number.format(total.stars);
  }
  (finished ? el('again') : el('resume')).focus({preventScroll: true});
}

el('start').onclick = el('again').onclick = begin;
el('pause').onclick = () => { if (state === 'playing') overlay(false); };
el('resume').onclick = () => {
  state = 'playing';
  last = 0;
  el('overlay').hidden = true;
  el('touchControls').hidden = !isTouch;
  el('pause').focus({preventScroll: true});
};
el('change').onclick = () => {
  saveRecord();
  state = 'menu';
  el('overlay').hidden = el('hud').hidden = el('touchControls').hidden = true;
  el('menu').hidden = false;
  syncMenu();
  el('start').focus({preventScroll: true});
};
modes.forEach(button => button.onclick = () => { mode = button.dataset.mode; syncMenu(); });
avatars.forEach(button => button.onclick = () => { avatar = button.dataset.avatar; syncMenu(); });

const arrows = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',ArrowDown:'down'};
const wasd = {KeyA:'left',KeyD:'right',KeyW:'jump',KeyS:'down'};
window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.code === 'Escape' && state === 'paused') { el('resume').click(); return; }
  if (state !== 'playing') return;
  if (event.code === 'Escape' || event.code === 'KeyP') { overlay(false); return; }
  const command = arrows[event.code] || wasd[event.code] || (event.code === 'Space' ? 'jump' : '');
  if (!command) return;
  event.preventDefault();
  if (event.repeat) return;
  const player = mode === 'duo' && arrows[event.code] ? 1 : 0;
  move(run.players[player], command);
});
for (const [index, id] of ['pad1','pad2'].entries()) {
  const pad = el(id);
  pad.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-command]');
    if (state !== 'playing' || !button) return;
    event.preventDefault();
    move(run.players[index], button.dataset.command);
  });
  pad.addEventListener('click', event => {
    const button = event.target.closest('[data-command]');
    if (state === 'playing' && event.detail === 0 && button) move(run.players[index], button.dataset.command);
  });
}
let swipe;
for (const canvas of [el('world'),el('worldFallback')]) {
canvas.addEventListener('pointerdown', event => {
  if (state !== 'playing' || mode !== 'solo') return;
  swipe = {id: event.pointerId, x: event.clientX, y: event.clientY};
  event.currentTarget.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!swipe || event.pointerId !== swipe.id) return;
  const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
  if (Math.max(Math.abs(dx),Math.abs(dy)) < 24) return;
  if (state === 'playing') move(run.players[0], Math.abs(dx) > Math.abs(dy)
    ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'jump' : 'down'));
  swipe = undefined;
});
for (const type of ['pointerup','pointercancel']) {
  canvas.addEventListener(type, () => { swipe = undefined; });
}
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') overlay(false);
});
function frame(time) {
  if (state === 'playing') {
    let delta = last ? Math.min(0.05, (time - last) / 1000) : 0;
    last = time;
    while (delta > 0) {
      const dt = Math.min(delta, 1/90);
      step(run, dt);
      delta -= dt;
    }
    graphics.draw(run, run.time);
    paintHud();
    if (run.players.every(player => player.out)) overlay(true);
    else if (run.time - lastSave > 20) {
      lastSave = run.time;
      saveRecord();
    }
  }
  requestAnimationFrame(frame);
}
try {
  const canvas = el('world');
  let context;
  try { context = canvas.getContext('webgl2', {antialias:true}); } catch {}
  if (context) {
    try { graphics = createWorld(canvas, context); } catch (error) { console.warn(error); }
  }
  if (!graphics) {
    canvas.hidden = true;
    const fallback = el('worldFallback');
    fallback.hidden = false;
    graphics = createCanvasWorld(fallback);
  }
  syncMenu();
  new ResizeObserver(() => {
    graphics.resize();
    graphics.draw(run, run.time);
  }).observe(track);
  requestAnimationFrame(frame);
} catch (error) {
  console.warn('3D graphics unavailable', error);
  el('graphicsError').hidden = false;
  el('start').disabled = true;
}
