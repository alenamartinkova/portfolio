import { setText, setHTML, setStyle } from '../../../shared/dom.js';
import { createRenderLoop } from '../../../shared/render-loop.js';
import './style.css';
import { initializeAppearance, readPreference, siteLinks } from '../../../shared/appearance.js';
import { mountGameAppearance } from '../../../shared/game-appearance.js';
import { ability, build, burnRate, DB, HZ, REQUESTS, sell, SERVICES, Simulation, START, upgrade, upgradeCost, type Ability, type Service } from './core/simulation';
import { ClusterScene } from './scene';
import { copy, descriptions, type Locale } from './copy';
import { ServerAudio } from './audio';
import { MISSIONS, mission, canPlay, parseProgress, recordVictory, type MissionId } from './core/campaign';
import { LESSONS, Training } from './core/training';
import { campaignCopy, lessonCopy } from './campaign-copy';

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
const parameters = new URLSearchParams(location.search);
const parameterSeed = parameters.get('seed');
const initialSeed = parameterSeed !== null && /^\d{1,10}$/.test(parameterSeed) ? Number(parameterSeed) >>> 0 : 1655;
let sim = new Simulation(initialSeed, false, 1);
let training: Training | null = null;
let coachKey = '';
let paused = false, speed = 1, selected: number | null = null, chosen: Service = 'pod', radial = false;
let scene: ClusterScene | null = null, cleanupAppearance: (() => void) | undefined;
let accumulator = 0, lastUI = -1, panelKey = '', finished = false, saved = false;
let lastMessage = '', lastWave = 1, lastPing = 0;
let chartSample: unknown = null;
const audio = new ServerAudio();
const renderLoop = createRenderLoop(frame);
const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const serviceKinds = Object.keys(SERVICES) as Service[];
const abilityKeys: Ability[] = ['restart', 'rollback', 'hotfix', 'mute'];
const symbols: Record<Service, string> = { pod: '▤', cache: '◉', balancer: '⑂', limiter: '⊣', queue: '≋', autoscaler: '↟' };
const currency = Object.fromEntries(['en', 'sk'].map(language => [language, new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })]));
const money = (value: number) => currency[locale].format(value);
interface RecordEntry { mission?: MissionId; seed: number; wave: number; processed: number; won: boolean; endless: boolean }
function readRecords(): RecordEntry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('deploy-friday.records.v1') ?? '[]');
    return Array.isArray(data) ? data.filter((r): r is RecordEntry => r && Number.isFinite(r.seed) && Number.isFinite(r.wave)
      && Number.isFinite(r.processed) && typeof r.won === 'boolean' && typeof r.endless === 'boolean' && (r.mission === undefined || Number.isInteger(r.mission) && r.mission >= 1 && r.mission <= 4)).slice(0, 8) : [];
  } catch { return []; }
}
let records = readRecords();
let legacyWin = records.some(r => r.won && (r.mission === undefined || r.mission === 4));
let progressRaw: string | null = null;
try {
  legacyWin ||= localStorage.getItem('deploy-friday.unlocked.v1') === 'yes';
  progressRaw = localStorage.getItem('deploy-friday.campaign.v1');
} catch { /* Session-only campaign progress is fine. */ }
let progress = parseProgress(progressRaw, legacyWin);
let unlocked = progress.completed.includes(4);
function persistProgress() {
  unlocked = progress.completed.includes(4);
  try { localStorage.setItem('deploy-friday.campaign.v1', JSON.stringify(progress)); } catch { /* Retain progress in memory. */ }
}
function saveRecord() {
  if (saved || training || sim.state.mission === 0 || !['won', 'lost'].includes(sim.state.phase)) return;
  saved = true;
  const s = sim.state;
  records.push({ mission: s.mission, seed: s.seed, wave: s.wave, processed: s.processed, won: s.phase === 'won', endless: s.endless });
  records.sort((a, b) => Number(b.won) - Number(a.won) || b.wave - a.wave || b.processed - a.processed);
  records = records.slice(0, 8);
  if (s.phase === 'won') { progress = recordVictory(progress, s); persistProgress(); }
  try {
    localStorage.setItem('deploy-friday.records.v1', JSON.stringify(records));
    if (unlocked) localStorage.setItem('deploy-friday.unlocked.v1', 'yes');
  } catch { /* Keep records available in this session when storage is blocked. */ }
}
function clockLabel() {
  const level = mission(sim.state.mission);
  if (training) return campaignCopy[locale].tutorial;
  if (sim.state.endless) return `${17 + Math.floor(sim.state.tick / (level.waveSeconds * HZ))}:00+`;
  if (level.id !== 4) {
    const elapsed = Math.floor(sim.state.tick / HZ);
    return `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  }
  const minute = Math.min(420, Math.floor(sim.state.tick / (level.waves * level.waveSeconds * HZ) * 420));
  return `${17 + Math.floor(minute / 60)}:${String(minute % 60).padStart(2, '0')}`;
}
function messageText(key: string) {
  const t = copy[locale];
  const aliases: Record<string, keyof typeof t> = { restart: 'restartMessage', rollback: 'rollbackMessage', hotfix: 'hotfixMessage', mute: 'muteMessage' };
  const text = t[aliases[key] ?? key as keyof typeof t];
  return typeof text === 'string' ? text : key;
}
function mount() {
  chartSample = null;
  cleanupAppearance?.(); scene?.dispose(); scene = null;
  const t = copy[locale], c = campaignCopy[locale]; document.documentElement.lang = locale;
  const links = siteLinks(locale);
  app.innerHTML = `
    <header class="game-nav"><div class="game-nav__inner">
      <div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková">am<span class="game-nav__dot">.</span></a>
      <span class="game-nav__separator">/</span><a class="game-nav__crumb" href="${links.games}">${t.back}</a><span class="game-nav__separator">/</span><span class="game-nav__current">Deploy Friday</span></div>
      <div class="game-nav__actions"><button id="levels" class="game-nav__button">▦ <span>${c.menu}</span></button><button id="help" class="game-nav__button">? <span>${t.help}</span></button><div id="appearance" data-game-appearance></div></div>
    </div></header>
    <main class="dashboard">
      <section class="intro"><div><p class="eyebrow">${t.eyebrow}</p><h1>Deploy Friday<span>.</span></h1><p class="tagline">${t.tagline}</p></div>
        <div class="shift-note"><span class="avatar">a</span><div><span>${t.deploy}</span><p>${t.deployText}</p></div><span class="away-dot"></span></div></section>
      <div class="mission-banner"><span id="mission-number" class="tiny"></span><strong id="mission-title"></strong><span id="mission-threat"></span></div>
      <section class="shift-bar" aria-label="Friday timeline"><div class="live-status"><i></i><span id="live">${t.ready}</span></div><div class="timeline">${Array.from({ length: 8 }, (_, i) => `<span data-hour="${i}">${17 + i === 24 ? '00' : 17 + i}:00</span>`).join('')}<div class="timeline-track"><div id="time-progress"></div></div></div><strong id="clock">17:00</strong><span id="wave"></span></section>
      <section class="stats" aria-label="Production status">
        <div class="stat stat-budget"><span>${t.budget}</span><strong id="budget">€190</strong><small id="burn"></small></div>
        <div class="stat"><span>${t.slo}</span><strong id="slo">100<span>%</span></strong><div class="slo-track"><div id="slo-bar"></div></div></div>
        <div class="stat"><span>${t.served}</span><strong id="processed">0</strong><small id="flight">0 ${t.incoming}</small></div>
        <div class="shift-controls"><button id="sound" aria-pressed="false" title="${t.sound}">♫ <span>${t.sound}</span></button><button id="speed" aria-label="${t.speed}">1×</button><button id="pause" disabled>${t.pause}</button></div>
      </section>
      <div class="workspace"><section class="cluster-panel">
        <div class="panel-heading"><span><i class="status-dot"></i>${t.cluster}</span><span class="region-label">3 AZ / 1 engineer</span></div>
        <div id="mission-briefing" class="mission-briefing"></div><section id="training-coach" class="training-coach" aria-label="${c.tutorial}" hidden></section>
        <div class="viewport" id="viewport"><canvas id="cluster" tabindex="0" aria-label="${t.keyboard}"></canvas>
          <div class="scene-coordinate">CLUSTER TOPOLOGY <span>// ISOMETRIC</span></div>
          <span class="scene-label ingress-label" id="ingress-label">↗ INGRESS</span><span class="scene-label db-label" id="db-label">DB <small>protect this.</small></span>
          <button id="training-pin" class="training-pin" hidden aria-label="${c.selectTile}">↓ <span>${c.selectTile}</span></button><div id="tower-labels"></div><div id="radial" class="radial" role="group" aria-label="${t.services}" hidden></div>
          <div class="effect-badge" id="effect" hidden></div>
          <div class="stage-overlay" id="stage-overlay"><span class="tiny">// BEFORE THE STORM</span><h2>${t.planning}</h2><p>${t.planningHint}</p><button class="primary" id="start">${c.startWave} <span>↗</span></button></div>
          <div class="paused-overlay" id="paused-overlay" hidden><span>Ⅱ</span><h2>${t.paused}</h2><button id="resume" class="primary">${t.resume}</button></div>
          <div class="result-overlay" id="result" hidden aria-live="polite"></div>
        </div>
        <div class="cluster-footer"><span id="tile-hint">${t.clusterHint}</span><span>20 Hz <i>●</i> seed <b id="seed">${sim.state.seed}</b></span></div>
        <div class="legend">${Object.entries(REQUESTS).map(([kind, spec]) => `<span><i style="--color:#${spec.color.toString(16)}"></i>${({ get: 'GET', post: 'POST', bot: 'Bot', upload: 'Big upload', retry: 'Retry' })[kind]}</span>`).join('')}</div>
      </section>
      <aside class="sidebar"><section class="catalog-panel"><div class="panel-heading"><span>${t.services}</span><span>06</span></div><p class="panel-copy">${t.servicesHint}</p>
        <div class="service-list">${serviceKinds.map(kind => `<button class="service-card" data-service="${kind}" aria-pressed="${kind === chosen}" style="--service:#${SERVICES[kind].color.toString(16)}"><span class="service-icon">${symbols[kind]}</span><span><strong>${SERVICES[kind].label}</strong><small>${SERVICES[kind].upkeep.toFixed(2)} €/s</small></span><b>${money(SERVICES[kind].cost)}</b></button>`).join('')}</div>
        <div id="inspector" class="inspector"></div>
        <div id="deployed" class="deployed"></div>
      </section><section class="slack-panel"><div class="panel-heading"><span>${t.slack}</span><small><i class="status-dot"></i>${t.online}</small></div><div class="slack-message"><span class="avatar bot-avatar">#</span><div><b>deploy-bot <small>APP</small></b><p id="slack-copy" role="status">${t.welcome}</p></div></div></section></aside></div>
      <section class="toolkit"><span class="tiny">${t.abilities}</span><div class="ability-list">${abilityKeys.map((key, i) => `<button data-ability="${key}" title="${t[`${key}Hint`]}" aria-label="${i + 1}: ${t[key]}. ${t[`${key}Hint`]}"><kbd>${i + 1}</kbd><span>${t[key]}<small id="cooldown-${key}">${t.readyAbility}</small></span><span class="ability-icon">${['↻', '↶', 'ϟ', '♧'][i]}</span></button>`).join('')}</div></section>
      <section class="metrics"><div class="metric-title"><span class="tiny">${t.monitoring}</span><span class="status-dot"></span><small>live · 60 s</small></div>
        ${(['latency', 'errors', 'throughput'] as const).map((key, i) => `<div class="metric" title="${key === 'throughput' ? 'Processed requests / second' : t[`${key}Hint`]}"><span>${t[key]}</span><strong id="metric-${key}">0<small>${i === 0 ? 's' : i === 1 ? '%' : 'req/s'}</small></strong><svg viewBox="0 0 240 48" preserveAspectRatio="none" aria-label="${t[key]}"><path id="chart-${key}" d="M0 46H240" fill="none" stroke="${['#9b7bff', '#ee8ebe', '#50dec0'][i]}" stroke-width="2" /></svg></div>`).join('')}</section>
      <footer class="game-footer"><span>Deploy Friday <span>·</span> ${t.tagline}</span><button id="records">${t.leaderboard} ↗</button></footer>
    </main>
    <dialog id="runbook"><button class="dialog-close" id="close-help" aria-label="${t.close}">×</button><p class="eyebrow">READ THIS BEFORE YOU MERGE</p><h2>${t.runbookTitle}</h2><p>${t.intro}</p><button class="primary" id="help-training">${c.replay}</button><ol>${t.rules.map(rule => `<li>${rule}</li>`).join('')}</ol><button class="primary" id="close-runbook">${t.close}</button></dialog>
    <dialog id="campaign" class="campaign-dialog" aria-labelledby="campaign-title"><button class="dialog-close" id="close-campaign" aria-label="${t.close}">×</button><p class="eyebrow">${c.eyebrow}</p><h2 id="campaign-title">${c.title}</h2><p>${c.intro}</p><div id="mission-list" class="mission-list"></div><button id="campaign-back">${c.backToGame}</button></dialog>
    <dialog id="records-dialog"><button class="dialog-close" id="close-records" aria-label="${t.close}">×</button><p class="eyebrow">ON THIS DEVICE</p><h2>${t.leaderboard}</h2><div id="record-list"></div><button id="endless-start" class="primary">${t.endless}</button></dialog>`;
  cleanupAppearance = mountGameAppearance($('appearance'), { locale, onLocaleChange: (next: Locale) => { const campaignOpen = $<HTMLDialogElement>('campaign').open; locale = next; panelKey = ''; mount(); if (campaignOpen) showCampaign(); } });
  try {
    scene = new ClusterScene($('viewport'), $('cluster'));
    scene.onInvalidate = () => { updateLabels(); renderLoop.request(); };
    scene.onSelect = cell => {
      if (['won', 'lost'].includes(sim.state.phase)) return;
      selected = cell; radial = !sim.state.towers.some(t => t.cell === cell) && ![START, DB, 16, 60].includes(cell);
      panelKey = ''; update();
    };
    scene.onHover = cell => { setText($('tile-hint'), cell === null ? t.clusterHint : `${t.tile} ${cell % 11 + 1}, ${Math.floor(cell / 11) + 1}`); };
    scene.selected = selected;
  } catch { renderFailure(); }
  $('viewport').addEventListener('renderlost', renderFailure);
  app.querySelectorAll<HTMLButtonElement>('[data-service]').forEach(button => button.onclick = () => {
    chosen = button.dataset.service as Service;
    if (selected !== null && !sim.state.towers.some(t => t.cell === selected)) deploy(chosen);
    else { panelKey = ''; update(); }
  });
  app.querySelectorAll<HTMLButtonElement>('[data-ability]').forEach(button => button.onclick = () => useAbility(button.dataset.ability as Ability));
  $('start').onclick = () => { if (scene && !training) { sim.start(); accumulator = 0; update(); } };
  $('pause').onclick = togglePause; $('resume').onclick = togglePause;
  $('speed').onclick = () => { speed = speed === 1 ? 2 : 1; update(); };
  $('sound').onclick = async () => { await audio.toggle(); audio.suspend(paused); update(); };
  $('help').onclick = () => openDialog('runbook');
  $('levels').onclick = () => showCampaign();
  $('close-campaign').onclick = $('campaign-back').onclick = () => $<HTMLDialogElement>('campaign').close();
  $('help-training').onclick = () => { $<HTMLDialogElement>('runbook').close(); newGame(false, false, 0); };
  $('training-pin').onclick = selectTrainingTarget;
  $('records').onclick = () => {
    $('record-list').innerHTML = records.length ? `<ol class="records-list">${records.map(r => `<li><span>${r.won ? '✓' : '↗'} ${r.endless ? '∞' : c.levels[r.mission ?? 4].title} · ${t.wave} ${r.wave}<small>${t.seed} ${r.seed}</small></span><strong>${r.processed}<small>${t.served}</small></strong></li>`).join('')}</ol>` : `<p>${t.noRecords}</p>`;
    $('endless-start').hidden = !unlocked;
    openDialog('records-dialog');
  };
  $('close-help').onclick = $('close-runbook').onclick = () => $<HTMLDialogElement>('runbook').close();
  $('close-records').onclick = () => $<HTMLDialogElement>('records-dialog').close();
  $('endless-start').onclick = () => { if (unlocked) { $<HTMLDialogElement>('records-dialog').close(); newGame(true); } };
  panelKey = ''; coachKey = ''; lastMessage = ''; lastUI = -1; finished = false; update();
}
function renderFailure() {
  paused = true; scene = null;
  $('stage-overlay').innerHTML = `<h2>WebGL unavailable</h2><p>${copy[locale].unavailable}</p><button class="primary" id="reload">${copy[locale].reload}</button>`;
  $('stage-overlay').hidden = false; $('reload').onclick = () => location.reload();
}
function openDialog(id: string) {
  if (sim.state.phase === 'running' && !paused && (!training || training.status === 'watch')) { paused = true; accumulator = 0; audio.suspend(true); }
  radial = false; update(); $<HTMLDialogElement>(id).showModal();
}
function togglePause() {
  if (sim.state.phase !== 'running' || training && training.status !== 'watch') return;
  paused = !paused; accumulator = 0; audio.suspend(paused); update();
}
function deploy(kind: Service) {
  if (selected === null) return;
  if (training ? training.build(selected, kind) : build(sim.state, selected, kind)) { radial = false; panelKey = ''; }
  update();
}
function useAbility(key: Ability) {
  if (paused && sim.state.phase === 'running') return;
  if (training) {
    if (training.useAbility(key)) { sim = training.sim; accumulator = 0; }
    update(); return;
  }
  if (key === 'rollback') {
    if (sim.rollback()) { finished = false; paused = false; accumulator = 0; lastMessage = ''; panelKey = ''; }
  } else ability(sim.state, key, selected);
  update();
}
function newGame(endless = false, freshSeed = false, level: MissionId = sim.state.mission) {
  level = endless ? 4 : level;
  if (!canPlay(progress, level) || endless && !unlocked) return;
  saveRecord();
  const seed = freshSeed ? crypto.getRandomValues(new Uint32Array(1))[0] : sim.state.seed;
  training = level === 0 ? new Training() : null;
  sim = training?.sim ?? new Simulation(seed, endless, level); selected = null; paused = false; speed = 1; radial = false; saved = false;
  finished = false; accumulator = 0; panelKey = ''; coachKey = ''; lastMessage = ''; lastWave = 1; lastPing = 0;
  chosen = training?.targetService ?? 'pod';
  const url = new URL(location.href); url.searchParams.set('seed', String(seed)); history.replaceState(null, '', url);
  if (scene) scene.selected = null;
  audio.suspend(false); update();
  if (training) $('training-coach').scrollIntoView({ block: 'start' });
}
function inspector() {
  const s = sim.state, t = copy[locale], tower = s.towers.find(t => t.cell === selected);
  const kind = tower?.kind ?? chosen, spec = SERVICES[kind], key = `${locale}:${selected}:${kind}:${tower?.level}:${radial}:${s.phase}`;
  if (panelKey !== key) {
    panelKey = key;
    $('inspector').innerHTML = `<span class="tiny">${selected === null ? t.select : `${t.tile} ${selected % 11 + 1}, ${Math.floor(selected / 11) + 1}`}</span><h3>${spec.label}${tower ? `<small>${t.level} ${tower.level}/3</small>` : ''}</h3><p>${descriptions[locale][kind][0]}</p><p class="upgrade-copy">↗ ${descriptions[locale][kind][1]}</p>
      ${tower ? `<div class="inspector-actions"><button id="upgrade">${tower.level === 3 ? t.max : `${t.upgrade} ${money(upgradeCost(tower))}`}</button><button id="sell">${t.sell} ${money(Math.floor(tower.invested * .65))}</button></div>` : `<small>${spec.upkeep.toFixed(2)} €/s · ${spec.range} tiles</small>`}`;
    if (tower) {
      $('upgrade').onclick = () => { if (training) training.upgrade(tower.cell); else upgrade(s, tower.cell); panelKey = ''; update(); };
      $('sell').onclick = () => { if (!training) sell(s, tower.cell); panelKey = ''; update(); };
    }
    $('radial').innerHTML = `<button class="radial-close" id="radial-close" aria-label="${t.close}">×</button>${serviceKinds.map((kind, i) => `<button class="radial-item" data-build="${kind}" style="--angle:${i * 60 - 90}deg;--counter:${90 - i * 60}deg;--service:#${SERVICES[kind].color.toString(16)}" title="${descriptions[locale][kind][0]}"><span>${symbols[kind]} <b>${SERVICES[kind].label}</b><small>${money(SERVICES[kind].cost)}</small></span></button>`).join('')}`;
    $('radial-close').onclick = () => { radial = false; update(); $('cluster').focus(); };
    app.querySelectorAll<HTMLButtonElement>('[data-build]').forEach(button => button.onclick = () => { chosen = button.dataset.build as Service; deploy(chosen); });
  }
  const allowed = ['planning', 'running'].includes(s.phase);
  app.querySelectorAll<HTMLButtonElement>('[data-service], [data-build]').forEach(button => {
    const kind = (button.dataset.service ?? button.dataset.build) as Service;
    button.disabled = !allowed || s.budget < SERVICES[kind].cost || !!training && !training.canBuild(selected, kind);
    if (button.dataset.service) button.setAttribute('aria-pressed', String(kind === chosen));
  });
  if (tower) {
    $<HTMLButtonElement>('upgrade').disabled = !allowed || tower.level >= 3 || s.budget < upgradeCost(tower) || !!training && !training.canUpgrade(tower.cell);
    $<HTMLButtonElement>('sell').disabled = !allowed || !!training;
  }
  // DOM buttons also make existing services selectable without pointer precision.
  const deployedKey = s.towers.map(t => `${t.cell}:${t.level}:${t.jammed}:${t.offline > s.tick}`).join('|');
  if ($('deployed').dataset.key !== deployedKey) {
    $('deployed').dataset.key = deployedKey;
    $('deployed').innerHTML = s.towers.length ? `<span class="tiny">${t.deployed}</span><div>${s.towers.map(tower => `<button data-tower="${tower.cell}" style="--service:#${SERVICES[tower.kind].color.toString(16)}" title="${SERVICES[tower.kind].label} · ${t.tile} ${tower.cell % 11 + 1}, ${Math.floor(tower.cell / 11) + 1}">${symbols[tower.kind]} ${tower.level}${tower.jammed ? ' !' : ''}</button>`).join('')}</div>` : '';
    app.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(button => button.onclick = () => {
      selected = Number(button.dataset.tower); if (scene) scene.selected = selected; radial = false; panelKey = ''; update();
    });
  }
}
function update() {
  scene?.invalidateState();
  renderLoop.request();
  const s = sim.state, t = copy[locale], c = campaignCopy[locale], level = mission(s.mission), burn = burnRate(s);
  setText($('budget'), money(s.budget));
  const seconds = burn ? Math.floor(s.budget / burn) : null;
  setText($('burn'), `${t.burn}: ${burn.toFixed(2)} €/s · ${seconds === null ? '∞' : `${Math.floor(seconds / 60)}m ${seconds % 60}s`} ${t.runway}`);
  $('budget').classList.toggle('danger', seconds !== null && seconds < 60);
  setHTML($('slo'), `${Math.ceil(s.slo)}<span>%</span>`); $('slo').classList.toggle('danger', s.slo < 30);
  setStyle($('slo-bar'), 'width', `${s.slo}%`); setStyle($('slo-bar'), 'background', s.slo < 30 ? '#ff6e83' : '#50dec0');
  setText($('processed'), s.processed.toLocaleString(locale)); setText($('flight'), `${s.packets.length} ${t.incoming}`);
  setText($('wave'), training ? `${c.lesson} ${training.index + 1} / ${LESSONS.length}` : `${t.wave} ${s.wave} / ${s.endless ? '∞' : level.waves}`); setText($('clock'), clockLabel());
  setStyle($('time-progress'), 'width', `${training ? (training.index + Number(training.status === 'done')) / LESSONS.length * 100 : Math.min(100, s.tick / (level.waves * level.waveSeconds * HZ) * 100)}%`);
  app.querySelectorAll<HTMLElement>('[data-hour]').forEach(el => {
    const hour = Number(el.dataset.hour);
    el.hidden = !!training || hour > level.waves;
    el.textContent = level.id === 4 ? `${hour === 7 ? '00' : 17 + hour}:00` : `${hour} / ${level.waves}`;
    el.classList.toggle('passed', hour <= s.tick / (level.waveSeconds * HZ));
  });
  setText($('mission-number'), s.endless ? '∞' : String(s.mission).padStart(2, '0'));
  setText($('mission-title'), s.endless ? t.endless : c.levels[s.mission].title);
  setText($('mission-threat'), c.levels[s.mission].threat);
  $('mission-briefing').hidden = !!training || s.phase !== 'planning';
  const briefing = `${c.briefing}: ${c.victory} ${c.levels[s.mission].tip}`;
  setText($('mission-briefing'), briefing);
  setText($('live'), paused && s.phase === 'running' ? t.paused : s.phase === 'planning' ? t.ready : s.phase === 'lost' ? 'INCIDENT' : t.live);
  setText($('pause'), paused ? t.resume : t.pause); $<HTMLButtonElement>('pause').disabled = s.phase !== 'running' || !!training && training.status !== 'watch';
  setText($('speed'), `${speed}×`); $('sound').setAttribute('aria-pressed', String(audio.enabled));
  setText($('seed'), String(s.seed));
  if (scene) $('stage-overlay').hidden = s.phase !== 'planning' || !!training;
  $('paused-overlay').hidden = !paused || s.phase !== 'running' || !scene || !!training && training.status !== 'watch';
  $('effect').hidden = s.tick >= s.debtUntil;
  setText($('effect'), s.tick < s.hotUntil ? t.hot : t.debt);
  $('result').hidden = !!training || !['won', 'lost'].includes(s.phase);
  for (const [i, key] of abilityKeys.entries()) {
    const button = app.querySelector<HTMLButtonElement>(`[data-ability="${key}"]`)!;
    const remaining = Math.ceil((s.cooldowns[key] - s.tick) / HZ);
    button.disabled = key === 'rollback' ? s.rollbackUsed || s.tick < 10 * HZ || !['running', 'lost'].includes(s.phase)
      : s.phase !== 'running' || paused || remaining > 0;
    setText($(`cooldown-${key}`), key === 'rollback' ? s.rollbackUsed ? t.used : '1× / Friday' : remaining > 0 ? `${remaining}s` : t.readyAbility);
    if (training) button.disabled = !training.canUse(key) || paused;
    button.dataset.key = String(i + 1);
  }
  if (lastMessage !== s.message || lastWave !== s.wave) {
    const changedWave = lastWave !== s.wave;
    lastMessage = s.message; lastWave = s.wave;
    if (s.tick >= s.mutedUntil) {
      setText($('slack-copy'), messageText(s.message));
      if (changedWave || s.message === 'jammed') audio.ping();
    }
  }
  if (s.tick < s.mutedUntil) setText($('slack-copy'), t.muted);
  else if ($('slack-copy').textContent === t.muted) setText($('slack-copy'), messageText(s.message));
  if (s.phase === 'running' && s.tick - lastPing >= 24 * HZ) {
    lastPing = s.tick;
    if (s.tick >= s.mutedUntil) {
      const jokes = ['@channel is prod down?', 'works on my machine', 'can we just add more pods?', 'alex has set their status to 🏖️'];
      setText($('slack-copy'), jokes[Math.floor(s.tick / (24 * HZ)) % jokes.length]); audio.ping(s.slo < 30);
    }
  }
  if (!training && ['won', 'lost'].includes(s.phase) && !finished) {
    finished = true; radial = false;
    if (s.phase === 'won') saveRecord();
    audio.ping(s.phase === 'lost');
    $('result').innerHTML = `<p class="eyebrow">${s.phase === 'won' ? '✓ SHIFT COMPLETE' : 'SEV 1 / INCIDENT'}</p><h2>${s.phase === 'won' ? c.levelWon : messageText(s.message)}</h2><p>${s.phase === 'won' ? level.id === 4 ? c.finalWonCopy : c.levelWonCopy : t.lostCopy}</p><div class="result-stats"><span>${s.processed} ${t.served}</span><span>${t.wave} ${s.wave}</span><span>${money(s.budget)}</span></div>${s.phase === 'won' && level.id < 4 ? `<button class="primary" id="next-level">${c.nextLevel} ↗</button>` : ''}<button class="${s.phase === 'won' && level.id < 4 ? '' : 'primary'}" id="again">${c.again} ↗</button><div class="result-actions"><button id="fresh">${c.newSeed}</button><button id="result-levels">${c.menu}</button>${s.phase === 'lost' && !s.rollbackUsed && s.tick >= 200 ? `<button id="rescue">${t.rollback} −10s</button>` : ''}${unlocked ? `<button id="endless">${t.endless} ∞</button>` : ''}</div>`;
    $('again').onclick = () => newGame(s.endless);
    $('result-levels').onclick = showCampaign;
    if ($('next-level')) $('next-level').onclick = () => newGame(false, false, (s.mission + 1) as MissionId);
    $('fresh').onclick = () => newGame(false, true);
    if ($('rescue')) $('rescue').onclick = () => useAbility('rollback');
    if ($('endless')) $('endless').onclick = () => newGame(true);
  }
  const latest = s.samples.at(-1);
  const values = [latest?.latency ?? 0, latest?.errors ?? 0, latest?.rps ?? 0];
  const keys = ['latency', 'errors', 'throughput'] as const;
  if (latest !== chartSample) {
  chartSample = latest;
  keys.forEach((key, i) => {
    setHTML($(`metric-${key}`), `${values[i].toFixed(i === 2 ? 0 : 1)}<small>${['s', '%', 'req/s'][i]}</small>`);
    const points = s.samples.map(sample => i === 0 ? sample.latency : i === 1 ? sample.errors : sample.rps);
    const max = Math.max(i === 1 ? 100 : 1, ...points);
    $(`chart-${key}`).setAttribute('d', points.length > 1 ? points.map((n, j) => `${j ? 'L' : 'M'}${j / 59 * 240},${46 - n / max * 40}`).join(' ') : 'M0 46H240');
  });
  }
  inspector(); updateTraining(); updateLabels();
}
function updateLabels() {
  if (!scene) return;
  for (const [id, cell] of [['ingress-label', START], ['db-label', DB]] as const) {
    const point = scene.project(cell, cell === DB ? 1.35 : .9);
    setStyle($(id), 'left', `${point.x}px`); setStyle($(id), 'top', `${point.y}px`);
  }
  const pin = $('training-pin');
  pin.hidden = !training || training.status !== 'action' || (!training.isBuild && training.lesson !== 'upgrade') || radial;
  if (training) {
    const point = scene.project(training.targetCell, .2);
    pin.style.left = `${point.x}px`; pin.style.top = `${point.y}px`;
  }
  $('radial').hidden = !radial || selected === null || paused;
  if (radial && selected !== null) {
    const point = scene.project(selected);
    const viewport = $('viewport');
    setStyle($('radial'), 'left', `${Math.max(138, Math.min(viewport.clientWidth - 138, point.x))}px`);
    setStyle($('radial'), 'top', `${Math.max(135, Math.min(viewport.clientHeight - 135, point.y))}px`);
  }
  $('tower-labels').innerHTML = sim.state.towers.filter(t => t.jammed || t.offline > sim.state.tick || t.active).map(t => {
    const point = scene!.project(t.cell, 1.2);
    return `<span class="tower-status ${t.jammed ? 'jammed' : ''}" style="left:${point.x}px;top:${point.y}px">${t.jammed ? copy[locale].jam : t.offline > sim.state.tick ? copy[locale].offline : copy[locale].scaling}</span>`;
  }).join('');
}
function showCampaign() {
  const c = campaignCopy[locale];
  $('mission-list').innerHTML = MISSIONS.map(level => {
    const done = progress.completed.includes(level.id), available = canPlay(progress, level.id), details = c.levels[level.id];
    return `<button class="mission-card ${level.id === 0 ? 'mission-card-training' : ''}" data-mission="${level.id}" ${available ? '' : 'disabled'}>
      <span class="mission-card-number">${String(level.id).padStart(2, '0')}</span><span class="mission-card-body"><strong>${details.title}</strong><span>${details.description}</span><small>${level.id === 0 ? c.practiceDuration : `${level.waves} ${locale === 'sk' && level.waves >= 5 ? 'vĺn' : c.waves} · ~${Math.ceil(level.waves * level.waveSeconds / 60)} ${c.duration}`} · ${details.threat}</small></span>
      <span class="mission-card-status">${done ? `✓ ${c.completed}` : available ? level.id === 0 ? c.startTutorial : c.select : `⌑ ${c.locked} ${String(level.id - 1).padStart(2, '0')}`} ${available ? '↗' : ''}</span></button>`;
  }).join('');
  app.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach(button => button.onclick = () => {
    const id = Number(button.dataset.mission) as MissionId;
    if (!canPlay(progress, id)) return;
    $<HTMLDialogElement>('campaign').close(); newGame(false, false, id);
  });
  openDialog('campaign');
}
function selectTrainingTarget() {
  if (!training || training.status !== 'action') return;
  selected = training.targetCell; chosen = training.targetService ?? 'pod';
  if (scene) scene.selected = selected;
  radial = training.isBuild; panelKey = ''; update();
  const button = training.isBuild ? app.querySelector<HTMLButtonElement>(`[data-build="${training.targetService}"]`) : $('upgrade');
  button?.focus();
}
function updateTraining() {
  const coach = $('training-coach');
  coach.hidden = !training || !scene;
  app.querySelectorAll('.training-target').forEach(el => el.classList.remove('training-target'));
  if (!training) return;
  const c = campaignCopy[locale], lesson = lessonCopy[locale][training.lesson];
  const key = `${locale}:${training.index}:${training.status}`;
  if (coachKey !== key) {
    coachKey = key;
    coach.innerHTML = `<div class="training-topline"><span class="tiny">${c.trainingTag} · ${c.lesson} ${training.index + 1}/${LESSONS.length}</span><span class="training-phase">${c[training.status === 'action' ? 'action' : training.status === 'watch' ? 'watch' : 'done']}</span></div>
      <ol class="lesson-progress" aria-label="${c.progress}">${LESSONS.map((id, i) => `<li class="${i < training!.index || i === training!.index && training!.status === 'done' ? 'complete' : ''}" ${i === training!.index ? 'aria-current="step"' : ''} title="${lessonCopy[locale][id].title}">${i < 6 ? symbols[id as Service] : i === 6 ? '↗' : id === 'restart' ? '1' : id === 'hotfix' ? '3' : id === 'rollback' ? '2' : '4'}</li>`).join('')}</ol>
      <div class="training-content" role="status"><h2>${lesson.title}</h2><p>${lesson[training.status === 'done' ? 'success' : training.status]}</p></div>
      <div class="training-actions"><button class="primary" id="training-action" ${training.status === 'watch' ? 'disabled' : ''}>${training.status === 'watch' ? c.watch : training.status === 'done' ? training.finished ? c.finish : c.next : training.isBuild ? c.selectTile : training.lesson === 'upgrade' ? c.selectPod : training.targetAbility ? copy[locale][training.targetAbility] : c.watch} ↗</button><button id="training-retry">${c.retry}</button><button id="training-exit">${c.exit}</button></div><small class="training-note">${c.trainingHint}</small>`;
    $('training-action').onclick = () => {
      if (!training) return;
      if (training.status === 'done') {
        if (training.finished) {
          progress = { completed: [...new Set<MissionId>([...progress.completed, 0])].sort() };
          persistProgress(); newGame(false, false, 1); return;
        }
        training.next(); sim = training.sim;
        selected = null; radial = false; paused = false; accumulator = 0; panelKey = ''; coachKey = '';
        chosen = training.targetService ?? 'pod'; if (scene) scene.selected = null;
        lastMessage = ''; update(); $('training-coach').scrollIntoView({ block: 'start' });
      } else if (training.targetAbility) useAbility(training.targetAbility);
      else selectTrainingTarget();
    };
    $('training-retry').onclick = () => {
      training?.retry(); if (training) sim = training.sim;
      selected = null; radial = false; paused = false; accumulator = 0; panelKey = ''; coachKey = '';
      if (scene) scene.selected = null; update();
    };
    $('training-exit').onclick = showCampaign;
  }
  if (training.status === 'action') {
    const target = training.isBuild ? `[data-service="${training.targetService}"]`
      : training.targetAbility ? `[data-ability="${training.targetAbility}"]` : '#upgrade';
    app.querySelector(target)?.classList.add('training-target');
  }
}

mount();
showCampaign();
listen(document, 'keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest('dialog, .game-nav, input, select, textarea')) return;
  if (event.code === 'Space' && !(event.target as HTMLElement).closest('button, a')) { event.preventDefault(); togglePause(); }
  if (/^[1-4]$/.test(event.key)) { event.preventDefault(); useAbility(abilityKeys[Number(event.key) - 1]); }
  if (event.key === 'Escape') {
    if (radial) { radial = false; update(); }
    else togglePause();
  }
});
listen(document, 'visibilitychange', () => {
  if (document.hidden && sim.state.phase === 'running' && (!training || training.status === 'watch')) { paused = true; accumulator = 0; audio.suspend(true); update(); }
});
function frame(_now: number, delta: number) {
  if (!paused && scene && sim.state.phase === 'running') {
    accumulator += delta * speed;
    while (accumulator >= 1 / HZ) { if (training) training.step(); else sim.step(); accumulator -= 1 / HZ; }
  }
  if (lastUI !== sim.state.tick) { lastUI = sim.state.tick; update(); }
  scene?.render(sim.state, radial ? SERVICES[chosen].range : 0);
  return !paused && !!scene && sim.state.phase === 'running';
}
renderLoop.request();
listen(window, 'pagehide', () => { audio.suspend(true); });
return () => { lifetime.abort(); renderLoop.dispose(); cleanupAppearance?.(); scene?.dispose(); audio.dispose(); };
}
