import { setText } from '../../../../shared/dom.js';
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
import { isLightTheme, siteLinks, toggleSiteTheme } from "./SiteAppearance";
const icon = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const audioIcon = (muted: boolean) =>
  icon(
    `<path d="M11 5 6 9H3v6h3l5 4Z"/>${muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}`,
  );
const key = (k: string) => `<kbd>${k}</kbd>`;
export class UI {
  private mode: "loading" | "playing" | "paused" | "results" | "error" =
    "loading";
  private muted = false;
  private resultStats?: RunStats;
  private errorKey: TextKey = "loadError";
  private lastFrame?: Parameters<UI["update"]>;
  private unsubscribe: () => void;
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
  constructor(
    private root: HTMLElement,
    private actions: {
      retry: () => void;
      level: () => MissionDefinition;
      selectLevel: (id: string) => void;
      nextLevel: () => void;
      pause: () => void;
      mute: () => boolean;
    },
  ) {
    this.render();
    this.unsubscribe = onLocaleChange(() => {
      this.render();
      if (this.lastFrame) this.update(...this.lastFrame);
      if (this.mode === "playing") this.ready();
      else if (this.mode === "paused") this.paused();
      else if (this.mode === "results" && this.resultStats)
        this.results(this.resultStats);
      else if (this.mode === "error") this.error(this.errorKey);
      this.root
        .querySelector<HTMLButtonElement>(`[data-locale="${getLocale()}"]`)
        ?.focus();
    });
  }
  private render() {
    const root = this.root;
    const actions = this.actions;
    const links = siteLinks();
    const mission = actions.level();
    const index = levels.indexOf(mission);
    root.innerHTML = `<header class="game-nav"><nav class="game-nav__inner" aria-label="${t("navigation")}"><div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková — ${t("portfolio")}"><span class="game-nav__bracket">[</span>AM<span class="game-nav__bracket">]</span></a><span class="game-nav__separator" aria-hidden="true">/</span><a class="game-nav__crumb" href="${links.games}">${t("games")}</a><span class="game-nav__separator" aria-hidden="true">/</span><span class="game-nav__current" aria-current="page">Forklift Certified</span></div><div class="game-nav__actions"><div class="locale" role="group" aria-label="${t("language")}">${(["en", "sk"] as const).map((locale) => `<button class="locale__option ${getLocale() === locale ? "is-active" : ""}" data-locale="${locale}" aria-pressed="${getLocale() === locale}" aria-label="${locale === "sk" ? "Slovenčina" : "English"}">${locale.toUpperCase()}</button>`).join("")}</div><label class="level-picker"><span>${t("levels")}</span><select id="level" aria-label="${t("levels")}" ${this.mode === "loading" ? "disabled" : ""}>${levels.map((level, i) => `<option value="${level.id}" ${level.id === mission.id ? "selected" : ""}>${i + 1} · ${t(({ piano: "levelPiano", ceramics: "levelCeramics", generator: "levelGenerator" } as const)[level.cargo])}</option>`).join("")}</select></label><button class="game-nav__icon" id="audio" aria-label="${t(this.muted ? "unmute" : "mute")}" title="${t("audio")}">${audioIcon(this.muted)}</button><button class="game-nav__icon" id="theme" aria-label="${t("theme")}"></button><button class="game-nav__button" id="pause" aria-label="${t("pauseGame")}" title="${t("pauseTitle")}">${icon('<path d="M9 5v14M15 5v14"/>')}<span class="game-nav__button-label">${t("pause")}</span></button></div></nav></header>
    <main class="hud"><section class="mission panel"><div class="eyebrow"><span class="accent-square"></span> ${t("handling")} <span class="mission-number">${String(index + 1).padStart(2, "0")} / ${String(levels.length).padStart(2, "0")}</span></div><h1>${t(mission.heading)}</h1><p>${t(mission.objective)}</p><p class="mission-brief">${t(mission.briefing)}</p><div class="mission-steps"><span class="step active"><i>1</i> ${t("pickup")}</span><b>→</b><span class="step"><i>2</i> ${t("transport")}</span><b>→</b><span class="step"><i>3</i> ${t("deliver")}</span></div></section>
    <section class="stats panel"><div class="time-row"><span class="eyebrow">${t("shiftTime")}</span><strong id="timer">00:00</strong></div><div class="integrity-label"><span>${t("integrity")}</span><strong id="integrity">100<span>%</span></strong></div><div class="meter"><div id="integrity-bar"></div></div><div class="property-row"><span>${t("property")}</span><strong id="property">$0</strong></div></section>
    <div class="location-label"><span class="live-dot"></span> ${t("depot")} <span>·</span> ${t(({ piano: "levelPiano", ceramics: "levelCeramics", generator: "levelGenerator" } as const)[mission.cargo]).toUpperCase()}</div>
    <section class="map-panel panel"><div class="eyebrow">${t("map")} <span>${t("north")}</span></div><canvas id="map" width="280" height="260" aria-label="${t("mapDescription")}"></canvas><div class="map-legend"><span><i class="you-dot"></i> ${t("you")}</span><span><i class="cargo-dot"></i> ${t("cargo")}</span><span><i class="bay-dot"></i> ${mission.bay}</span></div></section>
    <div class="context-hint"><span class="hint-icon">↳</span><span id="hint">${t("hintDrive")}</span></div>
    <section class="dashboard panel"><div class="speed-block"><span class="eyebrow">${t("speed")}</span><div><strong id="speed">0</strong><span>km/h</span><b id="gear">N</b></div></div><div class="fork-status"><div><span>${t("forkHeight")}</span><strong id="forks">0.16 m</strong></div><div><span>${t("mastTilt")}</span><strong id="tilt">0°</strong></div></div></section></main>
    <footer class="controls"><span>${key("W")}${key("A")}${key("S")}${key("D")} ${t("drive")}</span><span>${key("Q")}${key("E")} ${t("lift")}</span><span>${key("T")}${key("G")} ${t("tilt")}</span><span>${key("SPACE")} ${t("brake")}</span><span>${key("↔")} ${t("look")}</span><span>${key("R")} ${t("retry")}</span><span>${key("ESC")} ${t("pause")}</span></footer><div id="overlay" class="overlay"><div class="modal loading"><div class="eyebrow">NORTHLINE LOGISTICS</div><h2>${t("loading")}<span class="loading-dots">…</span></h2><p>${t("loadingNote")}</p></div></div><div class="desktop-note">${t("desktop")}</div>`;
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
    root
      .querySelectorAll<HTMLButtonElement>("[data-locale]")
      .forEach((button) => {
        button.onclick = () =>
          setLocale(button.dataset.locale === "sk" ? "sk" : "en");
      });
    const themeButton = get("theme");
    const refreshTheme = () => {
      const label = isLightTheme() ? t("darkTheme") : t("lightTheme");
      themeButton.setAttribute("aria-label", label);
      themeButton.title = label;
      themeButton.innerHTML = isLightTheme()
        ? icon('<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/>')
        : icon(
            '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
          );
    };
    refreshTheme();
    themeButton.onclick = () => {
      toggleSiteTheme();
      refreshTheme();
    };
    (get("level") as HTMLSelectElement).onchange = () =>
      actions.selectLevel((get("level") as HTMLSelectElement).value);
    get("pause").onclick = () => actions.pause();
    get("audio").onclick = () => {
      const muted = (this.muted = actions.mute());
      get("audio").innerHTML = audioIcon(muted);
      get("audio").setAttribute("aria-label", muted ? t("unmute") : t("mute"));
    };
  }
  resetLevel() {
    this.lastFrame = undefined;
    this.resultStats = undefined;
    this.mode = "loading";
    this.render();
  }
  dispose() {
    this.unsubscribe();
  }
  ready() {
    this.mode = "playing";
    this.overlay.hidden = true;
    this.root.querySelector<HTMLSelectElement>("#level")!.disabled = false;
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
  ) {
    this.lastFrame = [s, hint, stage, speed, lift, tilt, truck, cargo];
    setText(this.timer, formatTime(s.seconds));
    setText(this.integrity.firstChild!, String(Math.round(s.integrity)));
    this.bar.style.width = s.integrity + "%";
    this.bar.style.background =
      s.integrity < 40 ? "var(--damage)" : "var(--ok)";
    setText(this.property, "$" + number(s.propertyDamage));
    setText(this.hint, t(hint));
    setText(this.speed, Math.round(Math.abs(speed) * 3.6).toString());
    setText(this.gear, speed > 0.15 ? "D" : speed < -0.15 ? "R" : "N");
    setText(this.forks, number(lift, 2) + " m");
    setText(this.tilt, Math.round((-tilt * 180) / Math.PI) + "°");
    this.steps.forEach((e, i) => e.classList.toggle("active", i === stage));
    this.drawMap(truck, cargo);
  }
  private drawMap(
    truck: { x: number; z: number; yaw: number },
    cargo: { x: number; z: number },
  ) {
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
    const target = mission.target;
    c.fillStyle = "#367a71";
    c.fillRect(
      x(target.x - target.width / 2),
      z(target.z + target.depth / 2),
      target.width * 6.6,
      target.depth * 5.6,
    );
    c.font = "bold 16px monospace";
    c.fillStyle = "#a5ebd4";
    c.fillText(mission.bay, x(target.x) - 5, z(target.z) + 5);
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
  paused() {
    this.mode = "paused";
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="modal"><div class="eyebrow">${t("breather")}</div><h2>${t("pausedHeading")}</h2><p>${t("pausedNote")}</p><button class="primary" id="resume">${t("resume")} <span>↵</span></button><button class="secondary" id="retry">${t("fresh")}</button></div>`;
    this.overlay.querySelector<HTMLButtonElement>("#resume")!.onclick = () =>
      this.actions.pause();
    this.overlay.querySelector<HTMLButtonElement>("#retry")!.onclick = () =>
      this.actions.retry();
    this.overlay.querySelector<HTMLButtonElement>("#resume")!.focus();
  }
  results(stats: RunStats) {
    this.mode = "results";
    this.resultStats = stats;
    const s = scoreRun(stats);
    const mission = this.actions.level();
    const last = levels.indexOf(mission) === levels.length - 1;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="modal results"><div class="eyebrow"><span class="live-dot"></span> ${t("receivedPrefix")} / ${mission.bay}</div><div class="result-heading"><h2>${t("certified")}</h2><span class="grade">${s.grade}</span></div><p>${t(last ? "finalFinished" : "runFinished")}</p><div class="score-list"><div><span>${t("time")} <small>${formatTime(stats.seconds)}</small></span><strong>+${number(s.time)}</strong></div><div><span>${t("cargoDamage")} <small>${cargoCondition(stats.integrity)}</small></span><strong>−${number(s.cargo)}</strong></div><div><span>${t("propertyDamage")}</span><strong>−${number(s.property)}</strong></div><div><span>${t("bonus")}</span><strong>+${number(s.style)}</strong></div></div><div class="total"><span>${t("total")}</span><strong>${number(s.total)}</strong></div><p class="result-note">${t("collisions")}: ${number(stats.collisions)} · ${t("resultTip")}</p><button class="primary" id="next">${t(last ? "firstLevel" : "nextLevel")} <span>→</span></button><button class="secondary" id="retry">${t("another")} <span>R ↻</span></button></div>`;
    this.overlay.querySelector<HTMLButtonElement>("#retry")!.onclick = () =>
      this.actions.retry();
    this.overlay.querySelector<HTMLButtonElement>("#next")!.onclick = () =>
      this.actions.nextLevel();
    this.overlay.querySelector<HTMLButtonElement>("#next")!.focus();
  }
  error(message: TextKey) {
    this.mode = "error";
    this.errorKey = message;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="modal"><h2>${t("errorHeading")}</h2><p></p><button class="primary">${t("tryAgain")}</button></div>`;
    this.overlay.querySelector("p")!.textContent = t(message);
    this.overlay.querySelector("button")!.onclick = () => location.reload();
  }
}
