import { createRenderLoop } from '../../../shared/render-loop.js';
import {
  initializeAppearance,
  readPreference,
  storePreference,
  siteLinks,
} from '../../../shared/appearance.js';
import { mountGameAppearance } from '../../../shared/game-appearance.js';
import { browserStorage } from '../../../shared/CampaignProgress';
import '../../../shared/styles/fonts.css';
import '../../../shared/styles/tokens.css';
import '../../../shared/styles/appearance-controls.css';
import '../../../shared/styles/game-nav.css';
import './style.css';
import {
  crossings,
  generateCables,
  stepCables,
  straighten,
  type Cable,
  type Grip,
  type Point,
} from './core/cables';
import {
  assist,
  drawerComplete,
  generateDrawer,
  place,
  transform,
  type Cell,
  type Drawer,
  type Piece,
} from './core/drawer';
import { dateKey, levelSpec } from './core/random';
import { colors, DeskScene } from './scene';
import { copy, type Locale } from './i18n';
import { DeskProgress } from './progress';
import { DeskAudio } from './audio';

export function start() {
const lifetime = new AbortController();
function listen<T extends keyof DocumentEventMap>(target: Document, type: T, listener: (event: DocumentEventMap[T]) => void): void;
function listen<T extends keyof WindowEventMap>(target: Window, type: T, listener: (event: WindowEventMap[T]) => void): void;
function listen<T extends keyof HTMLElementEventMap>(target: HTMLElement, type: T, listener: (event: HTMLElementEventMap[T]) => void): void;
function listen(target: EventTarget, type: string, listener: EventListener) {
  target.addEventListener(type, listener, { signal: lifetime.signal });
}
initializeAppearance();
let locale: Locale = readPreference('locale', 'en') === 'sk' ? 'sk' : 'en';
let t = copy[locale];
const progress = new DeskProgress(browserStorage()),
  audio = new DeskAudio();
let index = progress.next,
  dailyDate: string | undefined,
  spec = levelSpec(index);
let cables: Cable[] = [],
  drawer: Drawer = generateDrawer(spec.seed, spec.width, spec.depth);
let selected: number | undefined,
  grip: Grip | null = null,
  hover: Cell | null = null,
  complete = false,
  moves = 0,
  calm = 0;
let crossingCount = 0,
  accumulator = 0;
let snapshot: string | null = null,
  pointerId: number | null = null,
  pointerStart: Point | null = null,
  dragged = false,
  grabOffset: Cell = [0, 0, 0];
const undo: string[] = [];
let disposeAppearance: (() => void) | undefined;
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="game-nav cm-header"><div class="game-nav__inner">
    <div class="game-nav__trail"><a class="game-nav__mark" id="home" href="${siteLinks(locale).home}" aria-label="Alena Martinková">am<span class="game-nav__dot">.</span></a>
    <span class="game-nav__separator">/</span><a class="game-nav__crumb" id="back" href="${siteLinks(locale).games}">${t.back}</a><span class="game-nav__separator">/</span><span class="game-nav__current">Cable Management</span></div>
    <div class="game-nav__actions"><div id="appearance" data-game-appearance></div></div>
  </div></header>
  <main class="cm-main">
    <section class="cm-intro"><div><p class="cm-eyebrow" id="eyebrow"></p><h1>Cable Management<span>.</span></h1><p class="cm-tagline">untangle, unplug, unwind.</p></div><p class="cm-intro-copy" id="intro"></p></section>
    <div class="cm-layout">
      <section class="cm-play" aria-labelledby="puzzle-title">
        <div class="cm-stage-head"><div><p class="cm-kicker" id="level-label"></p><h2 id="puzzle-title"></h2></div><div class="cm-modes" id="modes"></div></div>
        <div class="cm-stage" id="stage"><canvas id="desk" tabindex="0"></canvas><div id="crossing-markers" aria-hidden="true"></div><div class="cm-scene-note" aria-hidden="true"><span class="cm-live-dot"></span> FRIDAY, 18:42</div><div class="cm-success" id="success" hidden role="region" aria-labelledby="success-title"></div></div>
        <div class="cm-under"><p id="help"></p><div class="cm-stats"><span id="status" role="status"></span><span id="moves"></span></div></div>
        <div class="cm-tools" id="tools"></div><p class="cm-message" id="message" role="status" aria-live="polite"></p>
      </section>
      <aside class="cm-sidebar"><section class="cm-journey"><p class="cm-eyebrow" id="evenings-label"></p><div id="evenings"></div><div class="cm-levels" id="levels"></div><button class="cm-daily" id="daily" data-action="daily"></button><p class="cm-save" id="save"></p></section>
      <section class="cm-tray" id="tray-section"><div class="cm-tray-heading"><h2 id="tray-title"></h2><span id="tray-count"></span></div><div class="cm-inventory" id="inventory"></div><div class="cm-transforms" id="transforms"></div></section>
      <div class="cm-quiet"><span class="cm-coil" aria-hidden="true">◎</span><p id="quiet"></p><button class="cm-sound" data-action="sound" id="sound"></button></div></aside>
    </div>
  </main><footer class="cm-footer"><span>© ${new Date().getFullYear()} Alena Martinková</span><span>06 / desk zen</span></footer>`;

function el<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}
const canvas = el<HTMLCanvasElement>('desk');
let settledFor = 0, crossingElapsed = 0;
const renderLoop = createRenderLoop(frame);
function wake() { settledFor = 0; renderLoop.request(); }
let scene: DeskScene;
try {
  scene = new DeskScene(canvas);
  scene.onInvalidate = wake;
} catch {
  el('stage').innerHTML =
    `<div class="cm-fallback"><p>${t.webgl}</p><button id="retry">${t.retry}</button></div>`;
  el('retry').onclick = () => location.reload();
  el('back').textContent = t.back;
  el<HTMLAnchorElement>('back').href = `/games/?lang=${locale}`;
  throw new Error('WebGL unavailable; recovery instructions are displayed.');
}

function button(action: string, label: string, disabled = false, title = '') {
  return `<button type="button" data-action="${action}" ${disabled ? 'disabled' : ''} ${title ? `title="${title}"` : ''}>${label}</button>`;
}
function shapeIcon(piece: Piece) {
  const w = Math.max(...piece.cells.map((c) => c[0])) + 1,
    h = Math.max(...piece.cells.map((c) => c[1])) + 1;
  return `<svg viewBox="-0.1 -0.1 ${w + 0.2} ${h + 0.2}" aria-hidden="true">${piece.cells.map(([x, y]) => `<rect x="${x + 0.05}" y="${y + 0.05}" width=".9" height=".9" rx=".12" fill="${colors[piece.id % colors.length]}"/>`).join('')}</svg>`;
}
function current() {
  return drawer.pieces.find((p) => p.id === selected);
}
function capture() {
  return JSON.stringify({ cables, drawer, moves, selected });
}
function pushSnapshot(value = capture()) {
  undo.push(value);
  if (undo.length > 40) undo.shift();
}
function restore(value: string) {
  wake();
  const state = JSON.parse(value);
  cables = state.cables;
  drawer = state.drawer;
  moves = state.moves;
  selected = state.selected;
  calm = 0;
  hover = null;
  refreshScene();
}
function message(text = '') {
  el('message').textContent = text;
}

function language() {
  t = copy[locale];
  document.documentElement.lang = locale;
  storePreference('locale', locale);
  el('back').textContent = t.back;
  el<HTMLAnchorElement>('back').href = siteLinks(locale).games;
  el<HTMLAnchorElement>('home').href = siteLinks(locale).home;
  el('eyebrow').textContent = t.eyebrow;
  el('intro').textContent = t.intro;
  el('evenings-label').textContent = t.evenings;
  el('quiet').textContent = t.noRush;
  canvas.setAttribute('aria-label', t.canvas);
  canvas.setAttribute('aria-describedby', 'help');
  disposeAppearance?.();
  disposeAppearance = mountGameAppearance(el('appearance'), {
    locale,
    onLocaleChange: (next: Locale) => {
      locale = next;
      language();
    },
  });
  renderUI();
}
function renderUI() {
  const isDrawer = spec.mode === 'drawer';
  el('level-label').textContent = dailyDate
    ? `${t.daily} / ${dailyDate}`
    : `${t.evening} 0${Math.floor(index / 4) + 1} / ${t.level} 0${(index % 4) + 1}`;
  el('puzzle-title').textContent = isDrawer ? t.drawerTitle : t.untangleTitle;
  el('help').textContent = isDrawer ? t.drawerHelp : t.untangleHelp;
  el('modes').innerHTML = ['untangle', 'drawer']
    .map(
      (mode) =>
        `<button data-action="${mode}" aria-pressed="${spec.mode === mode}" ${dailyDate ? 'disabled' : ''}>${t[mode as 'drawer' | 'untangle']}</button>`,
    )
    .join('');
  el('evenings').innerHTML = [0, 1, 2]
    .map((e) => {
      const count = progress.completed.filter(
        (n) => Math.floor(n / 4) === e,
      ).length;
      return `<button class="cm-evening" data-evening="${e}" aria-current="${!dailyDate && Math.floor(index / 4) === e ? 'step' : 'false'}"><span class="cm-evening-number">0${e + 1}</span><span>${t.evening} ${e + 1}<small>${[0, 1, 2, 3].map((n) => `<i class="${progress.completed.includes(e * 4 + n) ? 'done' : ''}"></i>`).join('')}</small></span><span class="cm-evening-count">${count === 4 ? '✓' : `${count}/4`}</span></button>`;
    })
    .join('');
  el('levels').innerHTML = Array.from({ length: 4 }, (_, n) => {
    const level = Math.floor(index / 4) * 4 + n;
    return `<button data-level="${level}" aria-label="${t.level} ${n + 1} · ${n < 2 ? t.untangle : t.drawer}${progress.completed.includes(level) ? ` · ${t.done}` : ''}" aria-current="${!dailyDate && index === level ? 'step' : 'false'}">${n + 1}${progress.completed.includes(level) ? ' ✓' : ''}</button>`;
  }).join('');
  el<HTMLButtonElement>('daily').disabled = progress.evenings !== 3;
  el('daily').textContent =
    `◌  ${t.daily} ${progress.daily.includes(dateKey()) ? '✓' : progress.evenings === 3 ? '↗' : '· 3/3'}`;
  el('daily').title = progress.evenings === 3 ? t.daily : t.dailyLocked;
  el('daily').setAttribute('aria-pressed', String(!!dailyDate));
  el('save').textContent = progress.persistent ? t.saved : t.session;
  el('tools').innerHTML =
    button('undo', `↶ ${t.undo}`, !undo.length || complete) +
    button('reset', t.reset) +
    button('hint', `✧ ${t.hint}`, complete, isDrawer ? t.helpDetail : '');
  el('tray-section').hidden = !isDrawer;
  el('tray-title').textContent = t.objects;
  el('tray-count').textContent = String(
    drawer.pieces.filter((p) => !p.position).length,
  );
  el('inventory').innerHTML = isDrawer
    ? drawer.pieces
        .map(
          (p) =>
            `<button class="cm-item ${p.position ? 'is-placed' : ''}" data-piece="${p.id}" aria-pressed="${selected === p.id}" aria-label="${t.names[p.kind]} ${p.id + 1}${p.position ? ` · ${t.done}` : ''}" ${complete ? 'disabled' : ''}>${shapeIcon(p)}<span>${t.names[p.kind]}<small>${p.position ? '✓' : `${p.cells.length} · ${String(p.id + 1).padStart(2, '0')}`}</small></span></button>`,
        )
        .join('')
    : '';
  el('transforms').innerHTML =
    button('rotate', `${t.rotate} <kbd>R</kbd>`, !current() || complete) +
    button('flip', `${t.flip} <kbd>F</kbd>`, !current() || complete) +
    button('return', t.return, !current()?.position || complete);
  el('sound').textContent =
    `${audio.enabled ? '◖' : '◌'} ${audio.enabled ? t.soundOn : t.soundOff}`;
  el('sound').setAttribute('aria-pressed', String(audio.enabled));
  updateStatus();
  renderSuccess();
}
function updateStatus() {
  el('moves').textContent = `${moves} ${t.moves}`;
  const text = complete
    ? t.done
    : spec.mode === 'untangle'
      ? crossingCount === 0
        ? t.calm
        : `${crossingCount} ${t.crossings}`
      : `${drawer.pieces.filter((p) => p.position).length} / ${drawer.pieces.length} ${t.placed}`;
  if (el('status').textContent !== text) el('status').textContent = text;
}
function renderSuccess() {
  const box = el('success');
  box.hidden = !complete;
  if (!complete) return;
  const last = index === 11,
    eveningEnd = index % 4 === 3;
  const title = dailyDate
    ? t.dailyComplete
    : last
      ? t.campaignComplete
      : eveningEnd
        ? t.eveningComplete
        : t.complete;
  const text = dailyDate ? t.dailyCopy : last ? t.campaignCopy : t.completeCopy;
  box.innerHTML = `<span class="cm-success-icon" aria-hidden="true">✓</span><p class="cm-eyebrow">${t.done}</p><h3 id="success-title">${title}</h3><p>${text}</p>${button(dailyDate ? 'reset' : last ? 'daily' : 'next', dailyDate ? t.replay : last ? t.daily : eveningEnd ? t.nextEvening : t.next)}`;
}
function refreshScene() {
  wake();
  if (spec.mode === 'untangle') scene.showCables(cables);
  else scene.showDrawer(drawer);
  scene.setProgress(progress.evenings);
  renderUI();
}
function load(level: number, date?: string) {
  wake();
  cancelPointer();
  index = level;
  dailyDate = date;
  spec = levelSpec(index, date);
  complete = false;
  moves = 0;
  calm = 0;
  selected = undefined;
  hover = null;
  undo.length = 0;
  cables = generateCables(spec.seed, spec.cableCount);
  drawer = generateDrawer(spec.seed, spec.width, spec.depth);
  crossingCount = crossings(cables.map((c) => c.nodes)).length;
  el('crossing-markers').innerHTML = '';
  el('stage').classList.remove('is-complete');
  message(date && progress.daily.includes(date) ? t.dailyDone : '');
  refreshScene();
}
function finish() {
  wake();
  if (complete) return;
  complete = true;
  grip = null;
  progress.complete(index, dailyDate);
  scene.preview(drawer);
  scene.setProgress(progress.evenings);
  if (spec.mode === 'untangle') {
    cables.forEach(straighten);
    scene.updateCables(cables);
  }
  el('crossing-markers').innerHTML = '';
  el('stage').classList.add('is-complete');
  message('');
  audio.click(630, 0.32);
  renderUI();
  el('success').querySelector('button')?.focus({ preventScroll: true });
}
function commit() {
  wake();
  moves++;
  calm = 0;
  scene.updateItems(drawer, selected);
  renderUI();
  if (spec.mode === 'drawer' && drawerComplete(drawer)) finish();
}
function turn(flip = false) {
  wake();
  const piece = current();
  if (!piece || complete) return;
  pushSnapshot();
  piece.cells = transform(piece.cells, flip);
  piece.position = null;
  hover = null;
  scene.preview(drawer);
  commit();
  message();
}
function action(name: string) {
  wake();
  if (pointerId !== null) cancelPointer();
  switch (name) {
    case 'sound':
      void audio
        .toggle()
        .then(() => renderUI())
        .catch(() =>
          message(
            locale === 'sk'
              ? 'Zvuk sa nepodarilo zapnúť.'
              : 'Sound could not be started.',
          ),
        );
      return;
    case 'reset':
      load(index, dailyDate);
      return;
    case 'untangle':
      load(Math.floor(index / 4) * 4);
      return;
    case 'drawer':
      load(Math.floor(index / 4) * 4 + 2);
      return;
    case 'daily':
      if (progress.evenings === 3) load(0, dateKey());
      return;
    case 'next':
      load(Math.min(11, index + 1));
      return;
  }
  if (complete) return;
  switch (name) {
    case 'undo': {
      const value = undo.pop();
      if (value) restore(value);
      message();
      break;
    }
    case 'rotate':
      turn();
      break;
    case 'flip':
      turn(true);
      break;
    case 'return': {
      const piece = current();
      if (piece?.position) {
        pushSnapshot();
        piece.position = null;
        scene.preview(drawer);
        commit();
      }
      break;
    }
    case 'hint':
      pushSnapshot();
      if (spec.mode === 'untangle') {
        const cable = [...cables].sort(
          (a, b) =>
            b.nodes.reduce((s, p) => s + Math.abs(p.x - b.start.x), 0) -
            a.nodes.reduce((s, p) => s + Math.abs(p.x - a.start.x), 0),
        )[0];
        straighten(cable);
        scene.updateCables(cables);
        moves++;
        renderUI();
        message(t.hintCable);
      } else {
        const piece = current() ?? drawer.pieces.find((p) => !p.position);
        if (piece) {
          assist(drawer, piece);
          selected = undefined;
          commit();
          if (!complete) message(t.hintDrawer);
        }
      }
      break;
  }
}
listen(app, 'click', (event) => {
  const target = (event.target as Element).closest<HTMLButtonElement>('button');
  if (!target || target.disabled) return;
  if (target.dataset.action) action(target.dataset.action);
  else if (target.dataset.evening) {
    const e = Number(target.dataset.evening);
    load(
      [0, 1, 2, 3]
        .map((n) => e * 4 + n)
        .find((n) => !progress.completed.includes(n)) ?? e * 4,
    );
  } else if (target.dataset.level) load(Number(target.dataset.level));
});

function select(id: number) {
  wake();
  selected = id;
  hover = null;
  scene.preview(drawer);
  scene.updateItems(drawer, selected);
  renderUI();
  const p = current();
  if (p) message(`${t.selected}: ${t.names[p.kind]}`);
}
function startPointer(event: PointerEvent) {
  wake();
  if (complete || pointerId !== null || event.button !== 0) return;
  const target = event.target as Element,
    tray = target.closest<HTMLElement>('[data-piece]');
  if (tray) {
    select(Number(tray.dataset.piece));
  } else if (target !== canvas) return;
  pointerId = event.pointerId;
  pointerStart = { x: event.clientX, y: event.clientY };
  dragged = false;
  grabOffset = [0, 0, 0];
  snapshot = capture();
  if (spec.mode === 'untangle') {
    const rect = canvas.getBoundingClientRect();
    let distance = 28;
    cables.forEach((cable, c) =>
      cable.nodes.forEach((node, n) => {
        if (n === 0 || n === cable.nodes.length - 1) return;
        const p = scene.screen(node),
          d = Math.hypot(
            p.x + rect.left - event.clientX,
            p.y + rect.top - event.clientY,
          );
        if (d < distance) {
          distance = d;
          grip = { cable: c, node: n, target: { x: node.x, y: node.y } };
        }
      }),
    );
    if (!grip) {
      pointerId = null;
      snapshot = null;
      return;
    }
  } else if (!tray) {
    const id = scene.hitPiece(event.clientX, event.clientY);
    if (id !== undefined) {
      select(id);
      const cell = scene.cell(drawer, event.clientX, event.clientY),
        piece = current();
      if (cell && piece?.position)
        grabOffset = [
          cell[0] - piece.position[0],
          cell[1] - piece.position[1],
          0,
        ];
    }
  }
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}
function movePointer(event: PointerEvent) {
  if (pointerId !== event.pointerId || !pointerStart) return;
  dragged ||=
    Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) >
    4;
  if (!dragged) return;
  if (grip) {
    const p = scene.world(event.clientX, event.clientY);
    if (p) {
      wake();
      grip.target = {
        x: Math.max(-4.6, Math.min(4.6, p.x)),
        y: Math.max(-2.6, Math.min(2.6, p.y)),
      };
      audio.rustle();
    }
  } else if (spec.mode === 'drawer' && current()) {
    const cell = scene.cell(drawer, event.clientX, event.clientY);
    hover = cell ? [cell[0] - grabOffset[0], cell[1] - grabOffset[1], 0] : null;
    if (scene.preview(drawer, current(), hover ?? undefined)) wake();
  }
}
function endPointer(event: PointerEvent) {
  if (pointerId !== event.pointerId) return;
  wake();
  const rect = canvas.getBoundingClientRect(),
    inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
  if (grip) {
    if (dragged) {
      pushSnapshot(snapshot!);
      moves++;
      calm = 0;
    }
    grip = null;
    renderUI();
  } else if (spec.mode === 'drawer' && inside && current()) {
    const cell = scene.cell(drawer, event.clientX, event.clientY),
      origin = cell
        ? ([cell[0] - grabOffset[0], cell[1] - grabOffset[1], 0] as Cell)
        : null;
    const p = current()!;
    // Clicking an already placed item selects it; only a drag moves it.
    if (origin && (!p.position || dragged)) {
      if (place(drawer, p, origin)) {
        pushSnapshot(snapshot!);
        selected = undefined;
        audio.click();
        message();
        commit();
      } else {
        message(t.invalid);
        el('stage').classList.remove('is-bump');
        void el('stage').offsetWidth;
        el('stage').classList.add('is-bump');
        audio.click(160, 0.08);
      }
    }
  }
  releasePointer();
}
function releasePointer() {
  const id = pointerId;
  pointerId = null;
  pointerStart = null;
  snapshot = null;
  grip = null;
  hover = null;
  scene?.preview(drawer);
  if (id !== null && canvas.hasPointerCapture(id))
    canvas.releasePointerCapture(id);
}
function cancelPointer() {
  wake();
  if (pointerId !== null && snapshot) {
    const saved = snapshot;
    releasePointer();
    restore(saved);
  } else releasePointer();
}
listen(app, 'pointerdown', startPointer);
listen(canvas, 'pointermove', movePointer);
listen(canvas, 'pointerup', endPointer);
listen(canvas, 'pointercancel', cancelPointer);
listen(canvas, 'lostpointercapture', cancelPointer);
// Keyboard selection for tray buttons, plus cell navigation for placement.
listen(app, 'keydown', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('#appearance')) return;
  if (event.key === 'Escape') {
    cancelPointer();
    return;
  }
  if (complete || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() === 'r' || event.key.toLowerCase() === 'f') {
    event.preventDefault();
    action(event.key.toLowerCase() === 'r' ? 'rotate' : 'flip');
    return;
  }
  if (target.dataset.piece && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    select(Number(target.dataset.piece));
    canvas.focus({ preventScroll: true });
    return;
  }
  if (target === canvas && spec.mode === 'drawer' && current()) {
    if (event.key.startsWith('Arrow')) {
      wake();
      event.preventDefault();
      hover ??= [0, 0, 0];
      const axis =
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 0 : 1;
      hover[axis] +=
        event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      hover[0] = Math.max(0, Math.min(drawer.width - 1, hover[0]));
      hover[1] = Math.max(0, Math.min(drawer.depth - 1, hover[1]));
      scene.preview(drawer, current(), hover);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const saved = capture();
      if (place(drawer, current()!, hover ?? [0, 0, 0])) {
        pushSnapshot(saved);
        selected = undefined;
        scene.preview(drawer);
        audio.click();
        commit();
      } else message(t.invalid);
    }
  }
});
function visibility() {
  cancelPointer();
  audio.pause(document.hidden);
  accumulator = 0;
}
listen(document, 'visibilitychange', visibility);
listen(window, 'blur', cancelPointer);
function frame(_time: number, delta: number) {
  const dt = Math.min(delta, 0.066);
  let closing = false;
  if (!document.hidden) {
    if (spec.mode === 'untangle' && !complete) {
      accumulator += dt;
      let movement = 0;
      while (accumulator >= 1 / 60) {
        movement = Math.max(movement, stepCables(cables, grip));
        accumulator -= 1 / 60;
      }
      scene.updateCables(cables);
      crossingElapsed += dt;
      if (crossingElapsed >= .1) {
        crossingElapsed %= .1;
        const points = crossings(
          cables.map((c) => c.nodes.map((n) => scene.screen(n))),
        );
        crossingCount = points.length;
        const markers = el('crossing-markers');
        while (markers.children.length < 28) markers.append(document.createElement('i'));
        Array.from(markers.children).forEach((element, i) => {
          const marker = element as HTMLElement, point = points[i];
          marker.hidden = !point;
          if (point) { marker.style.left = `${point.x}px`; marker.style.top = `${point.y}px`; }
        });
        updateStatus();
      }
      calm =
        crossingCount === 0 && !grip && moves > 0 && movement < 0.001
          ? calm + dt
          : 0;
      if (calm > 1.1) finish();
      settledFor = !grip && movement < .001 ? settledFor + dt : 0;
    }
    closing = scene.render(dt, complete);
  }
  return closing || (spec.mode === 'untangle' && !complete && (Boolean(grip) || settledFor < 1.5));
}
language();
load(index);
renderLoop.request();
return () => {
    lifetime.abort();
    renderLoop.dispose();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', cancelPointer);
    disposeAppearance?.();
    audio.dispose();
    scene.dispose();
  };
}
