import { paints, rimColors, finishes, frameColors, seatColors, roofs, type TruckStyle } from "../player/Customization";
import { mountGameAppearance } from '../../../../shared/game-appearance.js';
import type { CampaignRecord } from "../../../../shared/CampaignProgress";
import { setText, setStyle } from '../../../../shared/dom.js';
import { levels, type MissionDefinition } from "../missions/levels";
import {
  t,
  number,
  cargoCondition,
  getLocale,
  setLocale,
  onLocaleChange,
  type TextKey,
} from "../i18n";
import { formatTime, RunStats, scoreRun } from "../systems/ScoringSystem";
import { isLightTheme, siteLinks } from "./SiteAppearance";
const icon = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const audioIcon = (muted: boolean) =>
  icon(
    `<path d="M11 5 6 9H3v6h3l5 4Z"/>${muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}`,
  );
const key = (k: string) => `<kbd>${k}</kbd>`;
export class UI {
  private mode: "loading" | "playing" | "paused" | "settings" | "garage" | "results" | "error" =
    "loading";
  private muted = false;
  private settingsPage: 'general' | 'levels' = 'general';
  private settings!: HTMLElement;
  private settingsHome!: HTMLElement;
  private arrangeSettings = () => {
    const toggle = this.root.querySelector<HTMLButtonElement>('#settings-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(this.mode === 'settings'));
      toggle.disabled = ['loading', 'results', 'error'].includes(this.mode);
    }
    const slot = this.mode === 'settings'
      ? this.root.querySelector<HTMLElement>('[data-settings-slot]') : undefined;
    const target = slot ?? this.settingsHome;
    if (this.settings && target && this.settings.parentElement !== target) target.prepend(this.settings);
  };
  private resultStats?: RunStats;
  private errorKey: TextKey = "loadError";
  private lastFrame?: Parameters<UI["update"]>;
  private unsubscribe: () => void;
  private cleanupAppearance?: () => void;
  private timer!: HTMLElement;
  private integrity!: HTMLElement;
  private bar!: HTMLElement;
  private property!: HTMLElement;
  private hint!: HTMLElement;
  private speed!: HTMLElement;
  private gear!: HTMLElement;
  private forks!: HTMLElement;
  private tilt!: HTMLElement;
  private steps!: NodeListOf<HTMLElement>;
  private overlay!: HTMLElement;
  private map!: HTMLCanvasElement;
  private mapKey = "";
  private inspectionProgress!: HTMLElement;
  constructor(
    private root: HTMLElement,
    private actions: {
      record: (id: string) => CampaignRecord | undefined;
      retry: () => void;
      level: () => MissionDefinition;
      selectLevel: (id: string) => void;
      nextLevel: () => void;
      pause: () => void;
      mute: () => boolean;
      garage: () => void;
      settings: () => void;
      style: () => TruckStyle;
      customize: (style: TruckStyle) => void;
      rotatePreview: (direction: number) => void;
      light: () => boolean;
      toggleLight: () => void;
    },
  ) {
    this.render();
    this.unsubscribe = onLocaleChange(() => {
      this.render();
      if (this.lastFrame) this.update(...this.lastFrame);
      if (this.mode === "playing") this.ready();
      else if (this.mode === "paused") this.paused();
      else if (this.mode === "settings") this.settingsMenu();
      else if (this.mode === "garage") this.garage();
      else if (this.mode === "results" && this.resultStats)
        this.results(this.resultStats);
      else if (this.mode === "error") this.error(this.errorKey);
      if (this.mode === 'settings' && this.settingsPage === 'general')
        this.root.querySelector<HTMLAnchorElement>('[data-focus="site-language"]')?.focus();
    });
  }
  private render() {
    this.cleanupAppearance?.();
    const root = this.root;
    const actions = this.actions;
    const links = siteLinks();
    const mission = actions.level();
    const index = levels.indexOf(mission);
    root.innerHTML = `<header class="game-nav"><nav class="game-nav__inner" aria-label="${t("navigation")}"><div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková — ${t("portfolio")}">am<span class="game-nav__dot">.</span></a><span class="game-nav__separator" aria-hidden="true">/</span><a class="game-nav__crumb" href="${links.games}">${t("games")}</a><span class="game-nav__separator" aria-hidden="true">/</span><span class="game-nav__current" aria-current="page">Forklift Certified</span></div><div class="game-nav__actions"><button class="game-nav__button" id="settings-toggle" aria-label="${t("settings")}" aria-haspopup="dialog" aria-expanded="${this.mode === 'settings'}" ${this.mode === 'loading' ? 'disabled' : ''}>${icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>')}<span class="game-nav__button-label">${t("settings")}</span></button><button class="game-nav__button" id="pause" aria-label="${t("pauseGame")}" title="${t("pauseTitle")}">${icon('<path d="M9 5v14M15 5v14"/>')}<span class="game-nav__button-label">${t("pause")}</span></button></div></nav></header>
    <main class="hud"><section class="mission panel"><div class="eyebrow"><span class="accent-square"></span> ${t("handling")} <span class="mission-number">${String(index + 1).padStart(2, "0")} / ${String(levels.length).padStart(2, "0")}</span></div><h1>${t(mission.name)}</h1><p>${mission.target.rack || mission.atmosphere ? t(mission.objective) : `${t("destination")} ${mission.bay}.`}</p><p class="mission-brief">${mission.mass} kg · ${t(({ piano: "levelPiano", ceramics: "levelCeramics", generator: "levelGenerator", parcels: "levelParcels" } as const)[mission.cargo])} · ${t("campaignGoal").replace("{time}", formatTime(mission.par))}</p>${mission.target.rack || mission.atmosphere ? `<p class="mission-brief shift-brief">${t(mission.briefing)}</p>` : ""}${mission.target.rack ? `<p class="shelf-height">${t("targetHeight")} <strong>${number(mission.target.height ?? 0, 2)} m</strong></p>` : ""}<p class="mission-brief" id="inspection-progress">${t("inspection")}: 0 / ${mission.inspections.length}</p><div class="mission-steps"><span class="step active"><i>1</i> ${t("pickup")}</span><b>→</b><span class="step"><i>2</i> ${t("transport")}</span><b>→</b><span class="step"><i>3</i> ${t("deliver")}</span></div><div class="location-label"><span class="live-dot"></span> ${t(({ day: "dayTag", night: "nightTag", cold: "coldTag", sunset: "sunsetTag" } as const)[mission.atmosphere ?? "day"])} <span>·</span> ${t(({ piano: "levelPiano", ceramics: "levelCeramics", generator: "levelGenerator", parcels: "levelParcels" } as const)[mission.cargo]).toUpperCase()}</div></section>
    <section class="stats panel"><div class="time-row"><span class="eyebrow">${t("shiftTime")}</span><strong id="timer">00:00</strong></div><div class="integrity-label"><span>${t("integrity")}</span><strong id="integrity">100<span>%</span></strong></div><div class="meter"><div id="integrity-bar"></div></div><div class="property-row"><span>${t("property")}</span><strong id="property">$0</strong></div></section>

    <section class="map-panel panel"><div class="eyebrow">${t("map")} <span>${t("north")}</span></div><canvas id="map" width="280" height="260" aria-label="${t("mapDescription")}"></canvas><div class="map-legend"><span><i class="you-dot"></i> ${t("you")}</span><span><i class="cargo-dot"></i> ${t("cargo")}</span><span><i class="bay-dot"></i> ${mission.target.rack ?? mission.bay}</span></div></section>
    <div class="context-hint"><span class="hint-icon">↳</span><span id="hint">${t("hintDrive")}</span></div>
    <section class="dashboard panel"><div class="speed-block"><span class="eyebrow">${t("speed")}</span><div><strong id="speed">0</strong><span>km/h</span><b id="gear">N</b></div></div><div class="fork-status"><div><span>${t("forkHeight")}</span><strong id="forks">0.16 m</strong></div><div><span>${t("mastTilt")}</span><strong id="tilt">0°</strong></div></div></section></main>
    <footer class="controls"><span>${key("W")}${key("A")}${key("S")}${key("D")} ${t("drive")}</span><span>${key("Q")}${key("E")} ${t("lift")}</span><span>${key("T")}${key("G")} ${t("tilt")}</span><span>${key("SPACE")} ${t("brake")}</span><span>${key("↔")} ${t("look")}</span><span>${key("F")} ${t("workLight")}</span><span>${key("R")} ${t("retry")}</span><span>${key("ESC")} ${t("pause")}</span></footer><div id="overlay" class="overlay"><div class="modal loading"><div class="eyebrow">NORTHLINE LOGISTICS</div><h2>${t("loading")}<span class="loading-dots">…</span></h2><p>${t("loadingNote")}</p></div></div><div class="desktop-note">${t("desktop")}</div>`;
    this.settingsHome = document.createElement('div');
    this.settingsHome.hidden = true;
    root.append(this.settingsHome);
    this.settings = document.createElement('div');
    this.settings.className = 'settings-controls';
    this.settings.innerHTML = `<div class="settings-toggle-grid">
      <button class="setting-tile" id="work-light" aria-pressed="${actions.light()}" aria-label="${t(actions.light() ? 'lightOn' : 'lightOff')}">${icon('<path d="M10 6a6 6 0 0 0 0 12V6ZM14 7h7m-7 5h7m-7 5h7"/>')}<span><strong>${t('workLight')}</strong><small id="light-state">${t(actions.light() ? 'settingOn' : 'settingOff')}</small></span></button>
      <button class="setting-tile" id="audio" aria-pressed="${this.muted}" aria-label="${t(this.muted ? 'unmute' : 'mute')}"><span id="audio-icon">${audioIcon(this.muted)}</span><span><strong>${t('settingsSound')}</strong><small id="audio-state">${t(this.muted ? 'settingOff' : 'settingOn')}</small></span></button></div>
      <button class="setting-tile setting-garage" id="garage" ${this.mode === 'loading' ? 'disabled' : ''}>${icon('<path d="m3 10 9-7 9 7v11H3Zm4 11V11h10v10M7 15h10M7 18h10"/>')}<span><strong>${t('garage')}</strong><small>${t('settingsGarageNote')}</small></span><b aria-hidden="true">↗</b></button>
      <div class="settings-appearance"><span>${t('settingsAppearance')}</span><div data-game-appearance></div></div>`;
    this.settingsHome.append(this.settings);
    const goal = document.createElement('div');
    goal.className = 'mobile-goal';
    goal.innerHTML = `<span>${t(mission.name)}</span><strong>${t('mobileTarget').replace('{target}', mission.target.rack ?? mission.bay)}</strong>`;
    root.querySelector('.game-nav__actions')!.before(goal);
    const get = (id: string) => root.querySelector<HTMLElement>("#" + id)!;
    this.timer = get("timer");
    this.integrity = get("integrity");
    this.bar = get("integrity-bar");
    this.property = get("property");
    this.hint = get("hint");
    this.speed = get("speed");
    this.gear = get("gear");
    this.forks = get("forks");
    this.tilt = get("tilt");
    this.steps = root.querySelectorAll(".step");
    this.overlay = get("overlay");
    this.map = get("map") as HTMLCanvasElement;
    this.mapKey = "";
    this.inspectionProgress = get("inspection-progress");
    this.cleanupAppearance = mountGameAppearance(root.querySelector<HTMLElement>('[data-game-appearance]')!, { locale: getLocale(), onLocaleChange: setLocale });
    get('settings-toggle').onclick = () => {
      if (this.mode === 'settings') actions.pause();
      else { this.settingsPage = 'general'; actions.settings(); }
    };
    get("pause").onclick = () => actions.pause();
    get("garage").onclick = () => actions.garage();
    get("work-light").onclick = () => actions.toggleLight();
    get("audio").onclick = () => {
      const muted = (this.muted = actions.mute());
      get("audio-icon").innerHTML = audioIcon(muted);
      get("audio-state").textContent = t(muted ? "settingOff" : "settingOn");
      get("audio").setAttribute("aria-pressed", String(muted));
      get("audio").setAttribute("aria-label", muted ? t("unmute") : t("mute"));
    };
  }
  resetLevel() {
    this.lastFrame = undefined;
    this.resultStats = undefined;
    this.mode = "loading";
    delete this.root.dataset.garage;
    this.render();
  }
  dispose() {
    this.cleanupAppearance?.();
    this.unsubscribe();
  }
  ready() {
    this.mode = "playing";
    this.arrangeSettings();
    delete this.root.dataset.garage;
    this.overlay.className = "overlay";
    this.overlay.hidden = true;
    this.root.querySelector<HTMLButtonElement>("#settings-toggle")!.disabled = false;
    this.root.querySelector("#settings-toggle")!.setAttribute("aria-expanded", "false");
    this.root.querySelector<HTMLButtonElement>("#garage")!.disabled = false;
  }
  update(
    s: RunStats,
    hint: TextKey,
    stage: number,
    speed: number,
    lift: number,
    tilt: number,
    truck: { x: number; z: number; yaw: number },
    cargo: { x: number; z: number },
    inspected = 0,
    inspectionHold = 0,
  ) {
    this.lastFrame = [s, hint, stage, speed, lift, tilt, truck, cargo, inspected, inspectionHold];
    setText(this.timer, formatTime(s.seconds));
    setText(this.integrity.firstChild!, String(Math.round(s.integrity)));
    setStyle(this.bar, "width", s.integrity.toFixed(1) + "%");
    setStyle(this.bar, "background", s.integrity < 40 ? "var(--damage)" : "var(--ok)");
    setText(this.property, "$" + number(s.propertyDamage));
    setText(this.hint, t(hint));
    setText(this.speed, Math.round(Math.abs(speed) * 3.6).toString());
    setText(this.gear, speed > 0.15 ? "D" : speed < -0.15 ? "R" : "N");
    setText(this.forks, number(lift, 2) + " m");
    setText(this.tilt, Math.round((-tilt * 180) / Math.PI) + "°");
    this.steps.forEach((e, i) => e.classList.toggle("active", i === stage));
    const count = this.actions.level().inspections.length;
    setText(this.inspectionProgress, count ? `${t("inspection")}: ${inspected} / ${count}${inspected < count ? ` · ${Math.round(inspectionHold / 2 * 100)}%` : " ✓"}` : "");
    this.drawMap(truck, cargo, inspected);
  }
  private drawMap(
    truck: { x: number; z: number; yaw: number },
    cargo: { x: number; z: number },
    inspected: number,
  ) {
    // Ignore movement below a quarter of a minimap pixel, including idle
    // physics jitter. Theme/level changes still redraw the complete map.
    const key = [this.actions.level().id, isLightTheme(), inspected,
      Math.round(truck.x * 26.4), Math.round(truck.z * 22.4), Math.round(truck.yaw * 100),
      Math.round(cargo.x * 26.4), Math.round(cargo.z * 22.4)].join(':');
    if (key === this.mapKey) return;
    this.mapKey = key;
    const c = this.map.getContext("2d")!;
    c.clearRect(0, 0, 280, 260);
    const x = (v: number) => 140 + v * 6.6,
      z = (v: number) => 130 - v * 5.6;
    c.strokeStyle = isLightTheme() ? "#8f90a1" : "#606477";
    c.lineWidth = 1;
    c.strokeRect(x(-18), z(21), 36 * 6.6, 42 * 5.6);
    c.fillStyle = isLightTheme() ? "#c2c3d0" : "#393b4d";
    const mission = this.actions.level();
    for (const [rx, rz] of mission.racks)
      c.fillRect(x(rx - 2.2), z(rz + 1), 4.4 * 6.6, 2 * 5.6);
    c.fillStyle = "#8b754d";
    for (const [bx, bz] of mission.barriers)
      c.fillRect(x(bx - 1.3), z(bz), 2.6 * 6.6, 2);
    mission.inspections.forEach(([ix, iz], i) => {
      c.strokeStyle = i < inspected ? "#77d9bc" : i === inspected ? "#ffe49a" : "#ac956b";
      c.lineWidth = i === inspected ? 3 : 1;
      c.strokeRect(x(ix - 2.5), z(iz + 2.5), 5 * 6.6, 5 * 5.6);
      c.fillStyle = c.strokeStyle;
      c.font = "bold 14px sans-serif";
      c.fillText(i < inspected ? "✓" : String(i + 1), x(ix) - 4, z(iz) + 5);
    });
    const target = mission.target;
    c.fillStyle = "#367a71";
    c.fillRect(
      x(target.x - target.width / 2),
      z(target.z + target.depth / 2),
      target.width * 6.6,
      target.depth * 5.6,
    );
    c.font = '600 16px "JetBrains Mono", monospace';
    c.fillStyle = "#a5ebd4";
    c.font = target.rack ? 'bold 11px sans-serif' : 'bold 16px sans-serif';
    c.fillText(target.rack ?? mission.bay, x(target.x) - (target.rack ? 15 : 5), z(target.z) + 5);
    c.fillStyle = "#70b7e0";
    c.fillRect(x(cargo.x) - 4, z(cargo.z) - 4, 8, 8);
    c.strokeStyle = "#365166";
    c.strokeRect(x(cargo.x) - 4, z(cargo.z) - 4, 8, 8);
    c.save();
    c.translate(x(truck.x), z(truck.z));
    c.rotate(truck.yaw);
    c.beginPath();
    c.moveTo(0, -7);
    c.lineTo(5, 5);
    c.lineTo(0, 3);
    c.lineTo(-5, 5);
    c.closePath();
    c.fillStyle = "#f3c85f";
    c.fill();
    c.strokeStyle = "#796020";
    c.stroke();
    c.restore();
  }
  refreshLight() {
    const button = this.root.querySelector<HTMLButtonElement>("#work-light");
    if (!button) return;
    button.setAttribute("aria-pressed", String(this.actions.light()));
    button.setAttribute("aria-label", t(this.actions.light() ? "lightOn" : "lightOff"));
    button.title = t(this.actions.light() ? "lightOn" : "lightOff");
    this.root.querySelector("#light-state")!.textContent = t(this.actions.light() ? "settingOn" : "settingOff");
  }
  garage() {
    this.mode = "garage";
    this.arrangeSettings();
    this.root.dataset.garage = "true";
    this.overlay.hidden = false;
    this.overlay.className = "overlay garage-overlay";
    const style = this.actions.style();
    const select = (field: 'finish' | 'frame' | 'seat' | 'roof', options: readonly { value: string; name: TextKey }[]) =>
      `<label class="garage-equipment">${t(field)}<select data-style="${field}">${options.map(option => `<option value="${option.value}" ${style[field] === option.value ? 'selected' : ''}>${t(option.name)}</option>`).join('')}</select></label>`;
    this.overlay.innerHTML = `<div class="garage-preview-caption"><div class="eyebrow">NORTHLINE / 07</div><strong>${t("garageTitle")}</strong><div class="preview-orbit"><button id="preview-left" aria-label="${t("look")} ←">↶</button><span>360°</span><button id="preview-right" aria-label="${t("look")} →">↷</button></div></div>
      <section class="modal garage-modal" role="dialog" aria-labelledby="garage-heading"><div class="eyebrow">NORTHLINE CUSTOMS</div><h2 id="garage-heading">${t("garage")}</h2><p>${t("garageNote")}</p>
      <details class="garage-section" open><summary>${t("customBody")}</summary><fieldset><legend>${t("paint")}</legend><div class="paint-options">${paints.map(p => `<button class="paint-swatch" data-paint="${p.color}" style="--swatch:${p.color}" aria-label="${t(p.name)}" title="${t(p.name)}" aria-pressed="${style.paint === p.color}"><span>✓</span></button>`).join("")}</div><div class="paint-name" id="paint-name">${t(paints.find(p => p.color === style.paint)!.name)}</div></fieldset>
      ${select("finish", finishes)}</details>
      <details class="garage-section"><summary>${t("customCab")}</summary>${select("frame", frameColors)}${select("seat", seatColors)}${select("roof", roofs)}</details>
      <details class="garage-section"><summary>${t("customEquipment")}</summary><fieldset><legend>${t("rims")}</legend><div class="rim-options">${rimColors.map((color, i) => `<button data-rim="${color}" aria-pressed="${style.rims === color}"><i style="background:${color}"></i>${t((["rimSteel", "rimBrass", "rimDark"] as const)[i])}</button>`).join("")}</div></fieldset>
      <label class="garage-check"><span>${t("stripes")}</span><input id="safety-stripes" type="checkbox" ${style.stripes ? "checked" : ""}></label>
      <label class="garage-equipment">${t("equipment")}<select id="equipment"><option value="standard" ${style.kit === "standard" ? "selected" : ""}>${t("kitStandard")}</option><option value="utility" ${style.kit === "utility" ? "selected" : ""}>${t("kitUtility")}</option></select></label>
      </details><button class="primary" id="garage-done">${t("garageDone")} <span>→</span></button></section>`;
    const update = (patch: Partial<TruckStyle>) => {
      this.actions.customize({ ...this.actions.style(), ...patch });
      const current = this.actions.style();
      this.overlay.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.paint === current.paint)));
      this.overlay.querySelectorAll<HTMLButtonElement>('[data-rim]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rim === current.rims)));
      this.overlay.querySelector('#paint-name')!.textContent = t(paints.find(p => p.color === current.paint)!.name);
    };
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-paint]').forEach(b => { b.onclick = () => update({ paint: b.dataset.paint! }); });
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-rim]').forEach(b => { b.onclick = () => update({ rims: b.dataset.rim! }); });
    this.overlay.querySelectorAll<HTMLSelectElement>('[data-style]').forEach(select => {
      select.onchange = () => update({ [select.dataset.style!]: select.value });
    });
    const stripes = this.overlay.querySelector<HTMLInputElement>('#safety-stripes')!;
    stripes.onchange = () => update({ stripes: stripes.checked });
    const kit = this.overlay.querySelector<HTMLSelectElement>('#equipment')!;
    kit.onchange = () => update({ kit: kit.value === 'utility' ? 'utility' : 'standard' });
    this.overlay.querySelector<HTMLButtonElement>('#preview-left')!.onclick = () => this.actions.rotatePreview(-1);
    this.overlay.querySelector<HTMLButtonElement>('#preview-right')!.onclick = () => this.actions.rotatePreview(1);
    this.overlay.querySelector<HTMLButtonElement>('#garage-done')!.onclick = () => this.actions.pause();
    this.overlay.querySelector<HTMLButtonElement>('[data-paint][aria-pressed="true"]')!.focus();
  }
  settingsMenu() {
    // Keep the appearance controls mounted while switching pages or other overlays.
    this.settingsHome.append(this.settings);
    this.mode = 'settings';
    delete this.root.dataset.garage;
    this.overlay.className = 'overlay settings-overlay';
    this.overlay.hidden = false;
    this.root.querySelector('#settings-toggle')!.setAttribute('aria-expanded', 'true');
    const mission = this.actions.level();
    const levelPage = this.settingsPage === 'levels';
    this.overlay.innerHTML = `<section class="modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-heading">
      <header class="settings-heading"><div><div class="eyebrow">NORTHLINE / ${t('pause')}</div><h2 id="settings-heading">${t(levelPage ? 'chooseLevel' : 'settings')}</h2></div><button class="settings-close" aria-label="${t('settingsResume')}">×</button></header>
      <div class="settings-body">${levelPage ? `<button class="settings-back">← ${t('settingsBack')}</button><p class="settings-note">${t('chooseLevelNote')}</p><div class="level-grid">${levels.map((level, i) => `<button class="level-card" data-level="${level.id}" aria-pressed="${level.id === mission.id}"><span class="level-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${t(level.name)}</strong><small>${t(({piano:'levelPiano',ceramics:'levelCeramics',generator:'levelGenerator',parcels:'levelParcels'} as const)[level.cargo])} · ${formatTime(level.par)}${this.actions.record(level.id)?.stars ? ' · ' + '★'.repeat(this.actions.record(level.id)!.stars) : ''}</small></span>${level.id === mission.id ? '<b aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div>` : `<button class="settings-mission" id="choose-level"><span class="level-number">${String(levels.indexOf(mission) + 1).padStart(2, '0')}</span><span><small>${t('settingsCurrentLevel')}</small><strong>${t(mission.name)}</strong></span><span class="settings-change">${t('settingsChange')} →</span></button><div data-settings-slot></div>`}</div>
      <footer class="settings-footer"><button class="primary" id="settings-resume">${t('settingsResume')} <span>↵</span></button></footer></section>`;
    this.arrangeSettings();
    const close = () => this.actions.pause();
    this.overlay.querySelector<HTMLButtonElement>('.settings-close')!.onclick = close;
    this.overlay.querySelector<HTMLButtonElement>('#settings-resume')!.onclick = close;
    if (levelPage) {
      this.overlay.querySelector<HTMLButtonElement>('.settings-back')!.onclick = () => { this.settingsPage = 'general'; this.settingsMenu(); };
      this.overlay.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button => {
        button.onclick = () => this.actions.selectLevel(button.dataset.level!);
      });
    } else {
      this.overlay.querySelector<HTMLButtonElement>('#choose-level')!.onclick = () => { this.settingsPage = 'levels'; this.settingsMenu(); };
    }
    const handleSettingsKey = (event: KeyboardEvent) => {
      if (this.mode !== 'settings') return;
      if (event.key === 'Escape') {
        if (this.overlay.querySelector('.m-color-panel:not([hidden])')) return;
        event.preventDefault(); event.stopPropagation(); close();
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(this.overlay.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select, input')).filter(el => el.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    this.overlay.querySelector('section')!.addEventListener('keydown', handleSettingsKey, true);
    this.overlay.onkeydown = event => { if (this.mode === 'settings') event.stopPropagation(); };
    this.overlay.onkeyup = event => { if (this.mode === 'settings') event.stopPropagation(); };
    this.overlay.querySelector<HTMLButtonElement>(levelPage ? '.settings-back' : '#choose-level')!.focus();
  }
  private mobileMenu() {
    const mission = this.actions.level();
    const frame = this.lastFrame;
    if (!frame) return '';
    const [stats, hint, , , lift, tilt] = frame;
    const rows: [string, string][] = [
      [t('shiftTime'), formatTime(stats.seconds)],
      [t('integrity'), `${number(stats.integrity, 0)} %`],
      [t('property'), `$${number(stats.propertyDamage)}`],
      [t('forkHeight'), `${number(lift, 2)} m`],
      [t('mastTilt'), `${number(Math.round(-tilt * 180 / Math.PI) || 0, 0)}°`],
    ];
    if (mission.target.rack) rows.push([t('targetHeight'), `${number(mission.target.height ?? 0, 2)} m`]);
    if (mission.inspections.length) rows.push([t('inspection'), `${frame[8] ?? 0} / ${mission.inspections.length}`]);
    return `<div class="mobile-menu-content"><h3>${t(mission.name)}</h3><p>${t(mission.objective)}</p><p>${t(mission.briefing)}</p><p>${t(hint)}</p>
      <dl>${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>
      <p class="mobile-instructions">${t('mobileInstructions')}</p></div>`;
  }
  paused() {
    // Restore controls before replacing a previous pause menu (for example after a locale change).
    this.settingsHome.prepend(this.settings);
    this.mode = "paused";
    delete this.root.dataset.garage;
    this.overlay.className = "overlay";
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="modal"><div class="eyebrow">${t("breather")}</div><h2>${t("pausedHeading")}</h2><p>${t("pausedNote")}</p><button class="primary" id="resume">${t("resume")} <span>↵</span></button><button class="secondary" id="retry">${t("fresh")}</button><button class="secondary" id="pause-settings">${t("settings")}</button>${this.mobileMenu()}</div>`;
    this.arrangeSettings();
    this.overlay.querySelector<HTMLButtonElement>("#resume")!.onclick = () =>
      this.actions.pause();
    this.overlay.querySelector<HTMLButtonElement>("#retry")!.onclick = () =>
      this.actions.retry();
    this.overlay.querySelector<HTMLButtonElement>("#pause-settings")!.onclick = () => { this.settingsPage = "general"; this.actions.settings(); };
    this.overlay.querySelector<HTMLButtonElement>("#resume")!.focus();
  }
  results(stats: RunStats) {
    this.mode = "results";
    this.arrangeSettings();
    this.resultStats = stats;
    const s = scoreRun(stats);
    const mission = this.actions.level();
    const last = levels.indexOf(mission) === levels.length - 1;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="modal results"><div class="eyebrow"><span class="live-dot"></span> ${t(mission.target.rack ? "shelfReceived" : "receivedPrefix")} / ${mission.target.rack ?? mission.bay}</div><div class="result-heading"><h2>${t("certified")}</h2><span class="grade">${s.grade}</span></div><p>${t(last ? "finalFinished" : "runFinished")}</p><p class="campaign-stars">${"★".repeat(stats.stars ?? 1)}${"☆".repeat(3 - (stats.stars ?? 1))} · ${t("bestLevel")}: ${formatTime(this.actions.record(mission.id)?.bestSeconds ?? stats.seconds)}</p><div class="score-list"><div><span>${t("time")} <small>${formatTime(stats.seconds)}</small></span><strong>+${number(s.time)}</strong></div><div><span>${t("cargoDamage")} <small>${cargoCondition(stats.integrity)}</small></span><strong>−${number(s.cargo)}</strong></div><div><span>${t("propertyDamage")}</span><strong>−${number(s.property)}</strong></div><div><span>${t("bonus")}</span><strong>+${number(s.style)}</strong></div></div><div class="total"><span>${t("total")}</span><strong>${number(s.total)}</strong></div><p class="result-note">${t("collisions")}: ${number(stats.collisions)} · ${t("resultTip")}</p><button class="primary" id="next">${t(last ? "firstLevel" : "nextLevel")} <span>→</span></button><button class="secondary" id="retry">${t("another")} <span>R ↻</span></button></div>`;
    this.overlay.querySelector<HTMLButtonElement>("#retry")!.onclick = () =>
      this.actions.retry();
    this.overlay.querySelector<HTMLButtonElement>("#next")!.onclick = () =>
      this.actions.nextLevel();
    this.overlay.querySelector<HTMLButtonElement>("#next")!.focus();
  }
  error(message: TextKey) {
    this.mode = "error";
    this.arrangeSettings();
    this.errorKey = message;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="modal"><h2>${t("errorHeading")}</h2><p></p><button class="primary">${t("tryAgain")}</button></div>`;
    this.overlay.querySelector("p")!.textContent = t(message);
    this.overlay.querySelector("button")!.onclick = () => location.reload();
  }
}
