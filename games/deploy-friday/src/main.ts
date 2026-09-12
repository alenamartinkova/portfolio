import './style.css';
import { initializeAppearance, readPreference, siteLinks } from '../../../shared/appearance.js';
import { mountGameAppearance } from '../../../shared/game-appearance.js';
import { ability, build, burnRate, DB, HZ, REQUESTS, sell, SERVICES, Simulation, START, upgrade, upgradeCost, WAVE_TICKS, type Ability, type Service } from './core/simulation';
import { ClusterScene } from './scene';
import { copy, descriptions, type Locale } from './copy';
import { ServerAudio } from './audio';

initializeAppearance();
let locale: Locale = readPreference('locale', 'en') === 'sk' ? 'sk' : 'en';
const parameters = new URLSearchParams(location.search);
const parameterSeed = parameters.get('seed');
const initialSeed = parameterSeed !== null && /^\d{1,10}$/.test(parameterSeed) ? Number(parameterSeed) >>> 0 : 1655;
let sim = new Simulation(initialSeed);
let paused = false, speed = 1, selected: number | null = null, chosen: Service = 'pod', radial = false;
let scene: ClusterScene | null = null, cleanupAppearance: (() => void) | undefined;
let accumulator = 0, previous = performance.now(), lastUI = -1, panelKey = '', finished = false, saved = false;
let lastMessage = '', lastWave = 1, lastPing = 0;
const audio = new ServerAudio();
const app = document.querySelector<HTMLDivElement>('#app')!;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const serviceKinds = Object.keys(SERVICES) as Service[];
const abilityKeys: Ability[] = ['restart', 'rollback', 'hotfix', 'mute'];
const symbols: Record<Service, string> = { pod: '▤', cache: '◉', balancer: '⑂', limiter: '⊣', queue: '≋', autoscaler: '↟' };
const money = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
interface RecordEntry { seed: number; wave: number; processed: number; won: boolean; endless: boolean }
function readRecords(): RecordEntry[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem('deploy-friday.records.v1') ?? '[]');
    return Array.isArray(data) ? data.filter((r): r is RecordEntry => r && Number.isFinite(r.seed) && Number.isFinite(r.wave)
      && Number.isFinite(r.processed) && typeof r.won === 'boolean' && typeof r.endless === 'boolean').slice(0, 8) : [];
  } catch { return []; }
}
let records = readRecords();
let unlocked = records.some(r => r.won);
try { unlocked ||= localStorage.getItem('deploy-friday.unlocked.v1') === 'yes'; } catch { /* Session-only is fine. */ }
function saveRecord() {
  if (saved || !['won', 'lost'].includes(sim.state.phase)) return;
  saved = true;
  const s = sim.state;
  records.push({ seed: s.seed, wave: s.wave, processed: s.processed, won: s.phase === 'won', endless: s.endless });
  records.sort((a, b) => Number(b.won) - Number(a.won) || b.wave - a.wave || b.processed - a.processed);
  records = records.slice(0, 8);
  if (s.phase === 'won') unlocked = true;
  try {
    localStorage.setItem('deploy-friday.records.v1', JSON.stringify(records));
    if (unlocked) localStorage.setItem('deploy-friday.unlocked.v1', 'yes');
  } catch { /* Keep records available in this session when storage is blocked. */ }
}
function clockLabel() {
  const minute = Math.min(420, Math.floor(sim.state.tick / (7 * WAVE_TICKS) * 420));
  return sim.state.endless ? `${17 + Math.floor(sim.state.tick / WAVE_TICKS)}:00+` : `${17 + Math.floor(minute / 60)}:${String(minute % 60).padStart(2, '0')}`;
}
function messageText(key: string) {
  const t = copy[locale];
  const aliases: Record<string, keyof typeof t> = { restart: 'restartMessage', rollback: 'rollbackMessage', hotfix: 'hotfixMessage', mute: 'muteMessage' };
  const text = t[aliases[key] ?? key as keyof typeof t];
  return typeof text === 'string' ? text : key;
}
function mount() {
  cleanupAppearance?.(); scene?.dispose(); scene = null;
  const t = copy[locale]; document.documentElement.lang = locale;
  const links = siteLinks(locale);
  app.innerHTML = `
    <header class="game-nav"><div class="game-nav__inner">
      <div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková">am<span class="game-nav__dot">.</span></a>
      <span class="game-nav__separator">/</span><a class="game-nav__crumb" href="${links.games}">${t.back}</a><span class="game-nav__separator">/</span><span class="game-nav__current">Deploy Friday</span></div>
      <div class="game-nav__actions"><button id="help" class="game-nav__button">? <span>${t.help}</span></button><div id="appearance" data-game-appearance></div></div>
    </div></header>
    <main class="dashboard">
      <section class="intro"><div><p class="eyebrow">${t.eyebrow}</p><h1>Deploy Friday<span>.</span></h1><p class="tagline">${t.tagline}</p></div>
        <div class="shift-note"><span class="avatar">a</span><div><span>${t.deploy}</span><p>${t.deployText}</p></div><span class="away-dot"></span></div></section>
      <section class="shift-bar" aria-label="Friday timeline"><div class="live-status"><i></i><span id="live">${t.ready}</span></div><div class="timeline">${Array.from({ length: 8 }, (_, i) => `<span data-hour="${i}">${17 + i === 24 ? '00' : 17 + i}:00</span>`).join('')}<div class="timeline-track"><div id="time-progress"></div></div></div><strong id="clock">17:00</strong><span id="wave"></span></section>
      <section class="stats" aria-label="Production status">
        <div class="stat stat-budget"><span>${t.budget}</span><strong id="budget">€190</strong><small id="burn"></small></div>
        <div class="stat"><span>${t.slo}</span><strong id="slo">100<span>%</span></strong><div class="slo-track"><div id="slo-bar"></div></div></div>
        <div class="stat"><span>${t.served}</span><strong id="processed">0</strong><small id="flight">0 ${t.incoming}</small></div>
        <div class="shift-controls"><button id="sound" aria-pressed="false" title="${t.sound}">♫ <span>${t.sound}</span></button><button id="speed" aria-label="${t.speed}">1×</button><button id="pause" disabled>${t.pause}</button></div>
      </section>
      <div class="workspace"><section class="cluster-panel">
        <div class="panel-heading"><span><i class="status-dot"></i>${t.cluster}</span><span class="region-label">3 AZ / 1 engineer</span></div>
        <div class="viewport" id="viewport"><canvas id="cluster" tabindex="0" aria-label="${t.keyboard}"></canvas>
          <div class="scene-coordinate">CLUSTER TOPOLOGY <span>// ISOMETRIC</span></div>
          <span class="scene-label ingress-label" id="ingress-label">↗ INGRESS</span><span class="scene-label db-label" id="db-label">DB <small>protect this.</small></span>
          <div id="tower-labels"></div><div id="radial" class="radial" role="group" aria-label="${t.services}" hidden></div>
          <div class="effect-badge" id="effect" hidden></div>
          <div class="stage-overlay" id="stage-overlay"><span class="tiny">// BEFORE THE STORM</span><h2>${t.planning}</h2><p>${t.planningHint}</p><button class="primary" id="start">${t.start} <span>↗</span></button></div>
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
      </section><section class="slack-panel"><div class="panel-heading"><span>${t.slack}</span><small><i class="status-dot"></i>${t.online}</small></div><div class="slack-message"><span class="avatar bot-avatar">#</span><div><b>deploy-bot <small>APP</small></b><p id="slack-copy">${t.welcome}</p></div></div></section></aside></div>
      <section class="toolkit"><span class="tiny">${t.abilities}</span><div class="ability-list">${abilityKeys.map((key, i) => `<button data-ability="${key}" title="${t[`${key}Hint`]}" aria-label="${i + 1}: ${t[key]}. ${t[`${key}Hint`]}"><kbd>${i + 1}</kbd><span>${t[key]}<small id="cooldown-${key}">${t.readyAbility}</small></span><span class="ability-icon">${['↻', '↶', 'ϟ', '♧'][i]}</span></button>`).join('')}</div></section>
      <section class="metrics"><div class="metric-title"><span class="tiny">${t.monitoring}</span><span class="status-dot"></span><small>live · 60 s</small></div>
        ${(['latency', 'errors', 'throughput'] as const).map((key, i) => `<div class="metric" title="${key === 'throughput' ? 'Processed requests / second' : t[`${key}Hint`]}"><span>${t[key]}</span><strong id="metric-${key}">0<small>${i === 0 ? 's' : i === 1 ? '%' : 'req/s'}</small></strong><svg viewBox="0 0 240 48" preserveAspectRatio="none" aria-label="${t[key]}"><path id="chart-${key}" d="M0 46H240" fill="none" stroke="${['#9b7bff', '#ee8ebe', '#50dec0'][i]}" stroke-width="2" /></svg></div>`).join('')}</section>
      <footer class="game-footer"><span>Deploy Friday <span>·</span> ${t.tagline}</span><button id="records">${t.leaderboard} ↗</button></footer>
    </main>
    <dialog id="runbook"><button class="dialog-close" id="close-help" aria-label="${t.close}">×</button><p class="eyebrow">READ THIS BEFORE YOU MERGE</p><h2>${t.runbookTitle}</h2><p>${t.intro}</p><ol>${t.rules.map(rule => `<li>${rule}</li>`).join('')}</ol><button class="primary" id="close-runbook">${t.close}</button></dialog>
    <dialog id="records-dialog"><button class="dialog-close" id="close-records" aria-label="${t.close}">×</button><p class="eyebrow">ON THIS DEVICE</p><h2>${t.leaderboard}</h2><div id="record-list"></div><button id="endless-start" class="primary">${t.endless}</button></dialog>`;
  cleanupAppearance = mountGameAppearance($('appearance'), { locale, onLocaleChange: (next: Locale) => { locale = next; panelKey = ''; mount(); } });
  try {
    scene = new ClusterScene($('viewport'), $('cluster'));
    scene.onSelect = cell => {
      if (['won', 'lost'].includes(sim.state.phase)) return;
      selected = cell; radial = !sim.state.towers.some(t => t.cell === cell) && ![START, DB, 16, 60].includes(cell);
      panelKey = ''; update();
    };
    scene.onHover = cell => { $('tile-hint').textContent = cell === null ? t.clusterHint : `${t.tile} ${cell % 11 + 1}, ${Math.floor(cell / 11) + 1}`; };
    scene.selected = selected;
  } catch { renderFailure(); }
  $('viewport').addEventListener('renderlost', renderFailure);
  app.querySelectorAll<HTMLButtonElement>('[data-service]').forEach(button => button.onclick = () => {
    chosen = button.dataset.service as Service;
    if (selected !== null && !sim.state.towers.some(t => t.cell === selected)) deploy(chosen);
    else { panelKey = ''; update(); }
  });
  app.querySelectorAll<HTMLButtonElement>('[data-ability]').forEach(button => button.onclick = () => useAbility(button.dataset.ability as Ability));
  $('start').onclick = () => { if (scene) { sim.start(); accumulator = 0; update(); } };
  $('pause').onclick = togglePause; $('resume').onclick = togglePause;
  $('speed').onclick = () => { speed = speed === 1 ? 2 : 1; update(); };
  $('sound').onclick = async () => { await audio.toggle(); audio.suspend(paused); update(); };
  $('help').onclick = () => openDialog('runbook');
  $('records').onclick = () => {
    $('record-list').innerHTML = records.length ? `<ol class="records-list">${records.map(r => `<li><span>${r.won ? '✓' : '↗'} ${r.endless ? '∞' : 'Friday'} · ${t.wave} ${r.wave}<small>${t.seed} ${r.seed}</small></span><strong>${r.processed}<small>${t.served}</small></strong></li>`).join('')}</ol>` : `<p>${t.noRecords}</p>`;
    $('endless-start').hidden = !unlocked;
    openDialog('records-dialog');
  };
  $('close-help').onclick = $('close-runbook').onclick = () => $<HTMLDialogElement>('runbook').close();
  $('close-records').onclick = () => $<HTMLDialogElement>('records-dialog').close();
  $('endless-start').onclick = () => { if (unlocked) { $<HTMLDialogElement>('records-dialog').close(); newGame(true); } };
  panelKey = ''; lastMessage = ''; lastUI = -1; finished = false; update();
}
function renderFailure() {
  paused = true; scene = null;
  $('stage-overlay').innerHTML = `<h2>WebGL unavailable</h2><p>${copy[locale].unavailable}</p><button class="primary" id="reload">${copy[locale].reload}</button>`;
  $('stage-overlay').hidden = false; $('reload').onclick = () => location.reload();
}
function openDialog(id: string) {
  if (sim.state.phase === 'running' && !paused) { paused = true; accumulator = 0; audio.suspend(true); }
  radial = false; update(); $<HTMLDialogElement>(id).showModal();
}
function togglePause() {
  if (sim.state.phase !== 'running') return;
  paused = !paused; accumulator = 0; audio.suspend(paused); update();
}
function deploy(kind: Service) {
  if (selected === null) return;
  if (build(sim.state, selected, kind)) { radial = false; panelKey = ''; }
  update();
}
function useAbility(key: Ability) {
  if (paused && sim.state.phase === 'running') return;
  if (key === 'rollback') {
    if (sim.rollback()) { finished = false; paused = false; accumulator = 0; lastMessage = ''; panelKey = ''; }
  } else ability(sim.state, key, selected);
  update();
}
function newGame(endless = false, freshSeed = false) {
  saveRecord();
  const seed = freshSeed ? crypto.getRandomValues(new Uint32Array(1))[0] : sim.state.seed;
  sim = new Simulation(seed, endless); selected = null; paused = false; speed = 1; radial = false; saved = false;
  finished = false; accumulator = 0; panelKey = ''; lastMessage = ''; lastWave = 1; lastPing = 0;
  const url = new URL(location.href); url.searchParams.set('seed', String(seed)); history.replaceState(null, '', url);
  if (scene) scene.selected = null;
  audio.suspend(false); update();
}
function inspector() {
  const s = sim.state, t = copy[locale], tower = s.towers.find(t => t.cell === selected);
  const kind = tower?.kind ?? chosen, spec = SERVICES[kind], key = `${locale}:${selected}:${kind}:${tower?.level}:${radial}:${s.phase}`;
  if (panelKey !== key) {
    panelKey = key;
    $('inspector').innerHTML = `<span class="tiny">${selected === null ? t.select : `${t.tile} ${selected % 11 + 1}, ${Math.floor(selected / 11) + 1}`}</span><h3>${spec.label}${tower ? `<small>${t.level} ${tower.level}/3</small>` : ''}</h3><p>${descriptions[locale][kind][0]}</p><p class="upgrade-copy">↗ ${descriptions[locale][kind][1]}</p>
      ${tower ? `<div class="inspector-actions"><button id="upgrade">${tower.level === 3 ? t.max : `${t.upgrade} ${money(upgradeCost(tower))}`}</button><button id="sell">${t.sell} ${money(Math.floor(tower.invested * .65))}</button></div>` : `<small>${spec.upkeep.toFixed(2)} €/s · ${spec.range} tiles</small>`}`;
    if (tower) {
      $('upgrade').onclick = () => { upgrade(s, tower.cell); panelKey = ''; update(); };
      $('sell').onclick = () => { sell(s, tower.cell); panelKey = ''; update(); };
    }
    $('radial').innerHTML = `<button class="radial-close" id="radial-close" aria-label="${t.close}">×</button>${serviceKinds.map((kind, i) => `<button class="radial-item" data-build="${kind}" style="--angle:${i * 60 - 90}deg;--counter:${90 - i * 60}deg;--service:#${SERVICES[kind].color.toString(16)}" title="${descriptions[locale][kind][0]}"><span>${symbols[kind]} <b>${SERVICES[kind].label}</b><small>${money(SERVICES[kind].cost)}</small></span></button>`).join('')}`;
    $('radial-close').onclick = () => { radial = false; update(); $('cluster').focus(); };
    app.querySelectorAll<HTMLButtonElement>('[data-build]').forEach(button => button.onclick = () => { chosen = button.dataset.build as Service; deploy(chosen); });
  }
  const allowed = ['planning', 'running'].includes(s.phase);
  app.querySelectorAll<HTMLButtonElement>('[data-service], [data-build]').forEach(button => {
    const kind = (button.dataset.service ?? button.dataset.build) as Service;
    button.disabled = !allowed || s.budget < SERVICES[kind].cost;
    if (button.dataset.service) button.setAttribute('aria-pressed', String(kind === chosen));
  });
  if (tower) {
    $<HTMLButtonElement>('upgrade').disabled = !allowed || tower.level >= 3 || s.budget < upgradeCost(tower);
    $<HTMLButtonElement>('sell').disabled = !allowed;
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
  const s = sim.state, t = copy[locale], burn = burnRate(s);
  $('budget').textContent = money(s.budget);
  const seconds = burn ? Math.floor(s.budget / burn) : null;
  $('burn').textContent = `${t.burn}: ${burn.toFixed(2)} €/s · ${seconds === null ? '∞' : `${Math.floor(seconds / 60)}m ${seconds % 60}s`} ${t.runway}`;
  $('budget').classList.toggle('danger', seconds !== null && seconds < 60);
  $('slo').innerHTML = `${Math.ceil(s.slo)}<span>%</span>`; $('slo').classList.toggle('danger', s.slo < 30);
  $('slo-bar').style.width = `${s.slo}%`; $('slo-bar').style.background = s.slo < 30 ? '#ff6e83' : '#50dec0';
  $('processed').textContent = s.processed.toLocaleString(locale); $('flight').textContent = `${s.packets.length} ${t.incoming}`;
  $('wave').textContent = `${t.wave} ${s.wave} / ${s.endless ? '∞' : 7}`; $('clock').textContent = clockLabel();
  $('time-progress').style.width = `${Math.min(100, s.tick / (7 * WAVE_TICKS) * 100)}%`;
  app.querySelectorAll<HTMLElement>('[data-hour]').forEach(el => el.classList.toggle('passed', Number(el.dataset.hour) <= s.tick / WAVE_TICKS));
  $('live').textContent = paused && s.phase === 'running' ? t.paused : s.phase === 'planning' ? t.ready : s.phase === 'lost' ? 'INCIDENT' : t.live;
  $('pause').textContent = paused ? t.resume : t.pause; $<HTMLButtonElement>('pause').disabled = s.phase !== 'running';
  $('speed').textContent = `${speed}×`; $('sound').setAttribute('aria-pressed', String(audio.enabled));
  $('seed').textContent = String(s.seed);
  if (scene) $('stage-overlay').hidden = s.phase !== 'planning';
  $('paused-overlay').hidden = !paused || s.phase !== 'running' || !scene;
  $('effect').hidden = s.tick >= s.debtUntil;
  $('effect').textContent = s.tick < s.hotUntil ? t.hot : t.debt;
  $('result').hidden = !['won', 'lost'].includes(s.phase);
  for (const [i, key] of abilityKeys.entries()) {
    const button = app.querySelector<HTMLButtonElement>(`[data-ability="${key}"]`)!;
    const remaining = Math.ceil((s.cooldowns[key] - s.tick) / HZ);
    button.disabled = key === 'rollback' ? s.rollbackUsed || s.tick < 10 * HZ || !['running', 'lost'].includes(s.phase)
      : s.phase !== 'running' || paused || remaining > 0;
    $(`cooldown-${key}`).textContent = key === 'rollback' ? s.rollbackUsed ? t.used : '1× / Friday' : remaining > 0 ? `${remaining}s` : t.readyAbility;
    button.dataset.key = String(i + 1);
  }
  if (lastMessage !== s.message || lastWave !== s.wave) {
    const changedWave = lastWave !== s.wave;
    lastMessage = s.message; lastWave = s.wave;
    if (s.tick >= s.mutedUntil) {
      $('slack-copy').textContent = messageText(s.message);
      if (changedWave || s.message === 'jammed') audio.ping();
    }
  }
  if (s.tick < s.mutedUntil) $('slack-copy').textContent = t.muted;
  else if ($('slack-copy').textContent === t.muted) $('slack-copy').textContent = messageText(s.message);
  if (s.phase === 'running' && s.tick - lastPing >= 24 * HZ) {
    lastPing = s.tick;
    if (s.tick >= s.mutedUntil) {
      const jokes = ['@channel is prod down?', 'works on my machine', 'can we just add more pods?', 'alex has set their status to 🏖️'];
      $('slack-copy').textContent = jokes[Math.floor(s.tick / (24 * HZ)) % jokes.length]; audio.ping(s.slo < 30);
    }
  }
  if (['won', 'lost'].includes(s.phase) && !finished) {
    finished = true; radial = false;
    if (s.phase === 'won') saveRecord();
    audio.ping(s.phase === 'lost');
    $('result').innerHTML = `<p class="eyebrow">${s.phase === 'won' ? '✓ SHIFT COMPLETE' : 'SEV 1 / INCIDENT'}</p><h2>${messageText(s.message)}</h2><p>${s.phase === 'won' ? t.wonCopy : t.lostCopy}</p><div class="result-stats"><span>${s.processed} ${t.served}</span><span>${t.wave} ${s.wave}</span><span>${money(s.budget)}</span></div><button class="primary" id="again">${t.again} ↗</button><div class="result-actions"><button id="fresh">${t.newSeed}</button>${s.phase === 'lost' && !s.rollbackUsed && s.tick >= 200 ? `<button id="rescue">${t.rollback} −10s</button>` : ''}${unlocked ? `<button id="endless">${t.endless} ∞</button>` : ''}</div>`;
    $('again').onclick = () => newGame(s.endless);
    $('fresh').onclick = () => newGame(false, true);
    if ($('rescue')) $('rescue').onclick = () => useAbility('rollback');
    if ($('endless')) $('endless').onclick = () => newGame(true);
  }
  const latest = s.samples.at(-1);
  const values = [latest?.latency ?? 0, latest?.errors ?? 0, latest?.rps ?? 0];
  const keys = ['latency', 'errors', 'throughput'] as const;
  keys.forEach((key, i) => {
    $(`metric-${key}`).innerHTML = `${values[i].toFixed(i === 2 ? 0 : 1)}<small>${['s', '%', 'req/s'][i]}</small>`;
    const points = s.samples.map(sample => i === 0 ? sample.latency : i === 1 ? sample.errors : sample.rps);
    const max = Math.max(i === 1 ? 100 : 1, ...points);
    $(`chart-${key}`).setAttribute('d', points.length > 1 ? points.map((n, j) => `${j ? 'L' : 'M'}${j / 59 * 240},${46 - n / max * 40}`).join(' ') : 'M0 46H240');
  });
  inspector(); updateLabels();
}
function updateLabels() {
  if (!scene) return;
  for (const [id, cell] of [['ingress-label', START], ['db-label', DB]] as const) {
    const point = scene.project(cell, cell === DB ? 1.35 : .9);
    $(id).style.left = `${point.x}px`; $(id).style.top = `${point.y}px`;
  }
  $('radial').hidden = !radial || selected === null || paused;
  if (radial && selected !== null) {
    const point = scene.project(selected);
    const viewport = $('viewport');
    $('radial').style.left = `${Math.max(138, Math.min(viewport.clientWidth - 138, point.x))}px`;
    $('radial').style.top = `${Math.max(135, Math.min(viewport.clientHeight - 135, point.y))}px`;
  }
  $('tower-labels').innerHTML = sim.state.towers.filter(t => t.jammed || t.offline > sim.state.tick || t.active).map(t => {
    const point = scene!.project(t.cell, 1.2);
    return `<span class="tower-status ${t.jammed ? 'jammed' : ''}" style="left:${point.x}px;top:${point.y}px">${t.jammed ? copy[locale].jam : t.offline > sim.state.tick ? copy[locale].offline : copy[locale].scaling}</span>`;
  }).join('');
}
mount();
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest('dialog, .game-nav, input, select, textarea')) return;
  if (event.code === 'Space' && !(event.target as HTMLElement).closest('button, a')) { event.preventDefault(); togglePause(); }
  if (/^[1-4]$/.test(event.key)) { event.preventDefault(); useAbility(abilityKeys[Number(event.key) - 1]); }
  if (event.key === 'Escape') {
    if (radial) { radial = false; update(); }
    else togglePause();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && sim.state.phase === 'running') { paused = true; accumulator = 0; audio.suspend(true); update(); }
});
function frame(now: number) {
  const delta = Math.min(.25, (now - previous) / 1000); previous = now;
  if (!paused && scene && sim.state.phase === 'running') {
    accumulator += delta * speed;
    while (accumulator >= 1 / HZ) { sim.step(); accumulator -= 1 / HZ; }
  }
  if (lastUI !== sim.state.tick || now % 500 < 20) { lastUI = sim.state.tick; update(); }
  scene?.render(sim.state, radial ? SERVICES[chosen].range : 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener('pagehide', () => { audio.suspend(true); });
if (import.meta.hot) import.meta.hot.dispose(() => { cleanupAppearance?.(); scene?.dispose(); audio.dispose(); });
