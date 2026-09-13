import "./style.css";
import { createRenderLoop } from "../../../shared/render-loop.js";
import {
  readPreference,
  storePreference,
  siteLinks,
} from "../../../shared/appearance.js";
import { mountGameAppearance } from "../../../shared/game-appearance.js";
import { AirportWorld } from "./world";
import { RampAudio } from "./audio";
import { Progress, browserStorage } from "./progress";
import { tr, type Locale } from "./i18n";
import {
  VEHICLES,
  createFlight,
  tasksFor,
  taskFor,
  available,
  dockQuality,
  distance,
  done,
  interactTask,
  release,
  serviceComplete,
  tickTasks,
  stepPlane,
  say,
  score,
  formatTime,
  type Task,
  type VehicleId,
  type RecordEntry,
} from "./core/operations";

const planeIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 2 2 7 7 5v2l-7-2v5l2 2-4-1-4 1 2-2v-5l-7 2v-2l7-5 2-7Z"/></svg>';
const truckIcon =
  '<svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 5h16v13H3ZM19 10h6l4 5v3H19M22 10v5h7"/><circle cx="8" cy="19" r="3"/><circle cx="24" cy="19" r="3"/></svg>';
const icons: Partial<Record<VehicleId, string>> = {
  crew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="m8 10 4-3 4 4 4 1M12 7v8l-5 6m5-6 4 6M8 10l-4 4"/></svg>',
  stairs:
    '<svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 19v-4h6v-4h6V7h6V3h7v16ZM3 10 24 1"/><circle cx="8" cy="21" r="2"/><circle cx="24" cy="21" r="2"/></svg>',
  belt: '<svg viewBox="0 0 32 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m3 17 23-13 3 4L6 21ZM15 12l5 8H8"/><circle cx="11" cy="21" r="2"/><circle cx="23" cy="21" r="2"/></svg>',
};
const $ = <T extends HTMLElement>(root: ParentNode, selector: string) =>
  root.querySelector<T>(selector)!;
const setText = (element: HTMLElement, text: string) => {
  if (element.textContent !== text) element.textContent = text;
};
const setAttribute = (element: Element, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};
const setHidden = (element: HTMLElement, hidden: boolean) => {
  if (element.hidden !== hidden) element.hidden = hidden;
};

export async function start(signal: AbortSignal) {
  const app = new TurnaroundApp(
    document.querySelector<HTMLElement>("#app")!,
    signal,
  );
  try {
    await app.start();
    return () => app.dispose();
  } catch (error) {
    app.dispose();
    throw error;
  }
}
class TurnaroundApp {
  private locale: Locale =
    readPreference("locale", "en") === "sk" ? "sk" : "en";
  private state = createFlight(
    new URLSearchParams(location.search).get("flight") === "2" ? 2 : 1,
  );
  private world?: AirportWorld;
  private progress = new Progress(browserStorage());
  private audio = new RampAudio();
  private ghost?: RecordEntry;
  private selected: VehicleId = "crew";
  private focusTask?: string;
  private keys = new Set<string>();
  private mode: "menu" | "playing" | "pause" | "results" | "loading" = "menu";
  private canvas!: HTMLCanvasElement;
  private dialog!: HTMLDialogElement;
  private hud!: HTMLElement;
  private sceneAbort?: AbortController;
  private lifetime = new AbortController();
  private loop = createRenderLoop((now, dt) => this.frame(now, dt));
  private lastWall = performance.now();
  private lastHUD = 0;
  private accumulator = 0;
  private taskAccumulator = 0;
  private lastTaskWall = performance.now();
  private timer = 0;
  private removeAppearance = () => {};
  private disposed = false;
  private recordBroken = false;
  private qa =
    import.meta.env.DEV && new URLSearchParams(location.search).has("qa");
  private get t() {
    return (key: string) => tr(this.locale, key);
  }
  constructor(
    private root: HTMLElement,
    private signal: AbortSignal,
  ) {
    signal.addEventListener("abort", this.abort, { once: true });
  }
  private abort = () => this.dispose();
  async start() {
    const touch =
      matchMedia("(pointer: coarse)").matches &&
      !matchMedia("(any-pointer: fine)").matches;
    if (touch) {
      this.root.innerHTML = `<main class="ta-desktop"><div>${planeIcon}<p class="ta-eyebrow">07 / TURNAROUND</p><h1>${this.t("desktop")}</h1><p>${this.t("desktopBody")}</p><a href="/games/?lang=${this.locale}">← ${this.t("back")}</a></div></main>`;
      return;
    }
    this.root.innerHTML = `<main class="ta-game"><header class="ta-header game-nav"><div class="game-nav__inner">${this.navigationTrail()}<div class="game-nav__actions"><button data-action="sound" class="game-nav__button">${this.t("soundOff")}</button><button data-action="pause" class="game-nav__button">Ⅱ <span>${this.t("pause")}</span></button><div id="appearance-slot"><div id="appearance" data-game-appearance></div></div></div></div></header>
      <div class="ta-stage"><canvas id="airport" tabindex="0" aria-label="Turnaround airport; WASD to drive, F to interact"></canvas>
      <div class="ta-hud" hidden><div class="ta-flight-strip"><span id="phase"></span><div class="ta-phase-dots" aria-hidden="true">● ─ ● ─ ● ─ ● ─ ●</div><span id="weather"></span></div>
      <section class="ta-flight-info"><p class="ta-eyebrow">REGIONAL <span id="flight-number">107</span></p><h1>Gate <b>02</b><span>→ BRNO</span></h1><div class="ta-radio"><span class="ta-live-dot"></span><span id="radio" role="status"></span></div></section>
      <div class="ta-clock"><span id="clock-label">${this.t("clock")}</span><strong id="clock">00:00</strong><small id="penalties"></small></div>
      <section class="ta-checklist" aria-label="${this.t("checklist")}"><div class="ta-checklist-top"><div><span class="ta-eyebrow">${this.t("ops")}</span><h2>${this.t("checklist")} <small id="task-count"></small></h2></div><button data-action="checklist" title="C" aria-label="${this.t("checklist")}">−</button></div><div id="task-list"></div></section>
      <div class="ta-mini-map"><svg viewBox="-85 -38 140 120" role="img" aria-label="Airport map"><rect x="-76" y="-36" width="24" height="114" fill="#27343a"/><rect x="-44" y="-34" width="90" height="10" fill="#b0bcb8"/><path d="M-64-35V75M-64 40H0V-8" fill="none" stroke="#e3bc62" stroke-width="1"/><text x="-35" y="-15">G1</text><text x="-4" y="-15">G2</text><text x="27" y="-15">G3</text><circle id="map-target" r="3.5" fill="none" stroke="#c7a5ff" stroke-width="1.5"/><circle id="map-player" r="2.5" fill="#d9f4e2"/><path id="map-plane" d="m0-5 1 4 4 2-4-1v4H-1V0L-5 1l4-2Z" fill="#fff"/></svg><span>RAMP / 27</span></div>
      <section class="ta-instruments" hidden><div><span>IAS</span><strong id="speed">58</strong><small>KT</small></div><div><span>ALT</span><strong id="altitude">78</strong><small>M</small></div><div class="ta-papi"><span>PAPI</span><div id="papi"><i></i><i></i><i></i><i></i></div><small id="flight-cue"></small></div></section>
      <section class="ta-context"><div class="ta-context-icon" id="context-icon">${icons.crew}</div><div><p class="ta-eyebrow" id="context-label"></p><h2 id="context-title"></h2><p id="context-detail"></p><div class="ta-dock-stats" id="dock-stats"></div></div><button class="ta-interact" data-action="interact">F <span>${this.t("connect")}</span></button></section>
      <nav class="ta-fleet" aria-label="${this.t("dispatch")}"></nav><div class="ta-key-help" id="key-help"></div>
      <button class="ta-reopen" data-action="checklist" hidden>C · ${this.t("checklist")}</button></div></div><dialog class="ta-dialog"></dialog><div class="ta-loading" hidden role="status">${this.t("loading")}</div></main>`;
    this.canvas = $(this.root, "#airport");
    this.dialog = $(this.root, "dialog");
    this.hud = $(this.root, ".ta-hud");
    this.appearance();
    const options = { signal: this.lifetime.signal };
    this.root.addEventListener("click", this.click, options);
    this.root.addEventListener("change", this.change, options);
    window.addEventListener("keydown", this.keydown, options);
    window.addEventListener("keyup", this.keyup, options);
    window.addEventListener("blur", () => this.pause(), options);
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) this.pause();
      },
      options,
    );
    this.dialog.addEventListener(
      "cancel",
      (e) => {
        e.preventDefault();
        if (this.mode === "pause") this.resume();
      },
      options,
    );
    await this.buildWorld();
    if (this.disposed) return;
    this.menu();
  }
  private navigationTrail() {
    const links = siteLinks(this.locale);
    return `<div class="game-nav__trail"><a class="game-nav__mark" data-site-home href="${links.home}" aria-label="Alena Martinková">am<span class="game-nav__dot">.</span></a><span class="game-nav__separator">/</span><a class="game-nav__crumb" data-site-games href="${links.games}">${this.t("back")}</a><span class="game-nav__separator ta-current-divider">/</span><span class="game-nav__current ta-current">${planeIcon}Turnaround</span></div>`;
  }
  private dockAppearance(inDialog: boolean) {
    const controls = $(this.root, "#appearance");
    const slot = $(this.root, inDialog ? "#dialog-appearance-slot" : "#appearance-slot");
    slot.append(controls);
  }
  private appearance() {
    document.documentElement.lang = this.locale;
    this.removeAppearance();
    this.removeAppearance = mountGameAppearance($(this.root, "#appearance"), {
      locale: this.locale,
      onLocaleChange: (locale: Locale) => {
        this.locale = locale;
        storePreference("locale", locale);
        this.appearance();
        if (this.mode === "menu") this.menu();
        else if (this.mode === "pause") this.pauseDialog();
        else if (this.mode === "results") this.resultsDialog();
        this.populateHUD();
        this.updateHUD();
      },
    });
  }
  private async buildWorld() {
    this.sceneAbort?.abort();
    this.sceneAbort = new AbortController();
    const controller = this.sceneAbort;
    this.world?.dispose();
    this.world = undefined;
    this.loop.stop();
    const nextCanvas = this.canvas.cloneNode() as HTMLCanvasElement;
    // Keep a single renderer/context alive after every retry. Canvas listeners are delegated below.
    this.canvas.replaceWith(nextCanvas);
    this.canvas = nextCanvas;
    this.canvas.addEventListener(
      "pointerdown",
      (e) => {
        this.canvas.focus();
        const id = this.world?.pick(e.clientX, e.clientY);
        if (this.mode === "playing" && id) this.select(id);
      },
      { signal: controller.signal },
    );
    const world = await AirportWorld.create(
      this.canvas,
      this.state,
      controller.signal,
    );
    if (this.disposed || controller.signal.aborted) {
      world.dispose();
      return;
    }
    this.world = world;
    world.onInvalidate = () => this.loop.request();
    this.loop.request();
  }
  private showDialog(html: string) {
    // Move the one shared control group; keep its listeners, picker state and IDs unique.
    this.dockAppearance(false);
    this.dialog.innerHTML = `<div class="ta-dialog-tools game-nav">${this.navigationTrail()}<div id="dialog-appearance-slot" class="game-nav__actions"></div></div>${html}`;
    this.dockAppearance(true);
    if (!this.dialog.open) this.dialog.showModal();
  }
  private menu() {
    this.mode = "menu";
    this.stopTimer();
    this.hud.hidden = true;
    this.audio.pause(true);
    const t = this.t;
    this
      .showDialog(`<div class="ta-briefing"><div class="ta-briefing-copy"><span class="ta-badge"><i></i>${t("early")}</span><p class="ta-eyebrow">07 / 3D PHYSICS · AIRPORT OPS</p><h1>turn<br>around<span>.</span></h1><p class="ta-tagline">${t("tagline")}</p><p class="ta-intro">${t("intro")}</p><p class="ta-summary">${t("briefing")}</p><div class="ta-briefing-route">${planeIcon}<span>LAND</span><b>→</b>${truckIcon}<span>TURN</span><b>→</b>${planeIcon}<span>FLY</span></div></div>
      <div class="ta-dispatch-desk"><p class="ta-eyebrow">${t("menu")} / 01—02</p><div class="ta-flight-cards">${([1, 2] as const).map((f) => `<button data-action="flight" data-flight="${f}" class="ta-flight-card ${f === this.state.flight ? "selected" : ""}" aria-pressed="${f === this.state.flight}"><span class="ta-flight-card-number">0${f}</span><span><strong>${t(`flight${f}`)}</strong><small>${t(`flight${f}desc`).replace("\n", "<br>")}</small></span><b>${f === this.state.flight ? "↗" : "+"}</b></button>`).join("")}</div>
      <div class="ta-assists"><label><input id="auto-land" type="checkbox" ${this.state.assistedLand ? "checked" : ""}>${t("autoLand")}</label><label><input id="auto-takeoff" type="checkbox" ${this.state.assistedTakeoff ? "checked" : ""}>${t("autoTakeoff")}</label></div><p class="ta-assist-note">${t("assistInfo")}</p>
      <div class="ta-personal"><span>${t("best")}</span><strong>${this.progress.get(this.state) ? formatTime(this.progress.get(this.state)!.seconds) : "— : —"}</strong></div>
      <button data-action="start" class="ta-primary">${t("start")} <span>↗</span></button><p class="ta-help">${t("help")}</p><p class="ta-coming">${t("coming")}</p></div></div>`);
    this.loop.request();
  }
  private pauseDialog() {
    this.showDialog(
      `<div class="ta-simple-dialog"><p class="ta-eyebrow">GROUND / HOLD POSITION</p><h1>${this.t("paused")}</h1><p>${this.t("pauseBody")}</p><p class="ta-help">${this.t("help")}</p><button class="ta-primary" data-action="resume">${this.t("resume")} →</button><button data-action="restart">${this.t("restart")}</button><button data-action="menu">${this.t("menu")}</button></div>`,
    );
  }
  private resultsDialog() {
    const s = score(this.state);
    this.showDialog(
      `<div class="ta-simple-dialog ta-results"><p class="ta-eyebrow">REGIONAL ${this.state.flight === 1 ? "107" : "208"} / AIRBORNE</p><h1>${this.t("results")}</h1><div class="ta-result-time">${formatTime(s.seconds)}</div><p>${this.t("rawTime")} ${formatTime(this.state.time)} <span>·</span> ${this.t("penalty")} +${this.state.penalties}s</p><div class="ta-stars">${s.stars.map((star, i) => `<div class="${star ? "earned" : ""}"><b>${star ? "★" : "☆"}</b><span>${this.t("stars").split("|")[i]}</span></div>`).join("")}</div><p class="ta-record">${this.recordBroken ? this.t("newBest") : `${this.t("best")} ${formatTime(this.progress.get(this.state)?.seconds ?? s.seconds)}`}</p><button class="ta-primary" data-action="restart">${this.t("restart")} ↗</button><button data-action="menu">${this.t("menu")}</button></div>`,
    );
  }
  private async begin() {
    if (this.mode === "loading" || this.disposed) return;
    this.mode = "loading";
    this.stopTimer();
    this.keys.clear();
    this.dialog.close();
    this.dockAppearance(false);
    this.hud.hidden = true;
    $(this.root, ".ta-loading").hidden = false;
    this.state = createFlight(
      this.state.flight,
      this.state.assistedLand,
      this.state.assistedTakeoff,
    );
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).get("qa") === "service"
    ) {
      this.state.phase = "service";
      Object.assign(this.state.plane, {
        x: 0,
        z: 0,
        y: 0,
        speed: 0,
        heading: 0,
        pitch: 0,
      });
    }
    this.selected = "crew";
    this.focusTask = undefined;
    this.ghost = this.progress.get(this.state);
    this.accumulator = 0;
    this.taskAccumulator = 0;
    try {
      await this.buildWorld();
      if (this.disposed) return;
      this.mode = "playing";
      this.lastWall = performance.now();
      this.lastTaskWall = this.lastWall;
      this.startTimer();
      this.hud.hidden = false;
      this.populateHUD();
      this.updateHUD();
      this.canvas.focus();
      this.audio.pause(false);
      this.loop.request();
      const url = new URL(location.href);
      url.searchParams.set("flight", String(this.state.flight));
      history.replaceState(null, "", url);
    } catch {
      if (!this.disposed) {
        this.mode = "menu";
        this.showDialog(
          `<div class="ta-simple-dialog"><h1>${this.t("retryError")}</h1><button data-action="start">${this.t("restart")}</button></div>`,
        );
      }
    } finally {
      if (!this.disposed) $(this.root, ".ta-loading").hidden = true;
    }
  }
  private fleet() {
    return VEHICLES.filter(
      (v) =>
        this.state.flight === 2 ||
        !["fuel", "catering", "water"].includes(v.id),
    );
  }
  private populateHUD() {
    if (!this.hud) return;
    const t = this.t;
    this.root.querySelectorAll("[data-site-home]").forEach(link => link.setAttribute("href", siteLinks(this.locale).home));
    this.root.querySelectorAll<HTMLElement>("[data-site-games]").forEach(link => {
      link.setAttribute("href", siteLinks(this.locale).games);
      setText(link, t("back"));
    });
    setText($(this.root, "#clock-label"), t("clock"));
    setText(
      $(this.root, '[data-action="sound"]'),
      t(this.audio.enabled ? "soundOn" : "soundOff"),
    );
    setText($(this.root, '[data-action="pause"] span'), t("pause"));
    setText($(this.root, ".ta-interact span"), t("connect"));
    setText($(this.root, ".ta-loading"), t("loading"));
    setAttribute($(this.root, ".ta-fleet"), "aria-label", t("dispatch"));
    setText($(this.root, ".ta-checklist-top .ta-eyebrow"), t("ops"));
    $(this.root, ".ta-fleet").innerHTML = this.fleet()
      .map(
        (v, i) =>
          `<button class="ta-vehicle" data-action="vehicle" data-vehicle="${v.id}" aria-pressed="${v.id === this.selected}"><kbd>${i + 1}</kbd>${icons[v.id] ?? truckIcon}<span>${t(`v:${v.id}`)}</span><i data-connected="${v.id}"></i></button>`,
      )
      .join("");
    let group = "";
    $(this.root, "#task-list").innerHTML = tasksFor(this.state.flight)
      .map((task) => {
        const header =
          group !== task.group ? `<h3>${t(`g:${task.group}`)}</h3>` : "";
        group = task.group;
        return `${header}<button class="ta-task" data-action="task" data-task="${task.id}"><span class="ta-task-status">○</span><span><strong>${t(task.id)}</strong><small class="ta-task-meta"></small></span><span class="ta-task-progress"></span></button>`;
      })
      .join("");
  }
  private activeTask(): Task | undefined {
    const s = this.state;
    if (s.phase === "pushback")
      return {
        id: "pushReady",
        vehicle: "push",
        at: [s.plane.x, s.plane.z - 11.5],
        heading: Math.PI,
        duration: 0,
        requires: [],
        group: "clear",
      };
    if (s.phase === "taxi" || s.phase === "taxiout") {
      const route =
        s.phase === "taxi"
          ? [
              [-38, 40],
              [0, 34],
              [0, 0],
            ]
          : [
              [0, 34],
              [-38, 40],
              [-64, 40],
            ];
      return {
        id: s.phase,
        vehicle: "crew",
        at: route[Math.min(2, s.checkpoints.length)],
        duration: 0,
        requires: [],
        group: "",
      };
    }
    if (s.phase !== "service") return undefined;
    const focused =
      this.focusTask &&
      tasksFor(s.flight).find(
        (t) =>
          t.id === this.focusTask &&
          t.vehicle === this.selected &&
          !done(s, t.id),
      );
    return (
      focused ||
      taskFor(s, this.selected) || {
        id: "park",
        vehicle: this.selected,
        at: VEHICLES.find((v) => v.id === this.selected)!.at,
        duration: 0,
        requires: [],
        group: "",
      }
    );
  }
  private updateHUD() {
    if (!this.world || this.hud.hidden || this.disposed) return;
    const s = this.state,
      t = this.t,
      p = s.plane,
      task = this.activeTask(),
      pose = this.world.poses[this.selected];
    const activeTaskId = task?.id;
    setText($(this.root, "#phase"), t(s.phase));
    setText($(this.root, "#weather"), t(`flight${s.flight}short`));
    setText($(this.root, "#flight-number"), s.flight === 1 ? "107" : "208");
    setText($(this.root, "#clock"), formatTime(s.time + s.penalties));
    setText(
      $(this.root, "#penalties"),
      s.penalties ? `+${s.penalties}s ${t("penalty").toLowerCase()}` : "",
    );
    const message = s.message.startsWith("done:")
      ? `✓ ${t(s.message.slice(5))}`
      : t(s.message).replace("107", s.flight === 1 ? "107" : "208");
    setText(
      $(this.root, "#radio"),
      s.time < s.messageUntil
        ? message
        : s.phase === "service"
          ? t("briefing")
          : t(s.phase),
    );
    let completed = 0;
    for (const task of tasksFor(s.flight)) {
      const row = $<HTMLButtonElement>(this.root, `[data-task="${task.id}"]`),
        state = s.tasks[task.id],
        ready = available(s, task);
      const status =
        state.status === "done"
          ? "done"
          : state.status === "running"
            ? "running"
            : ready
              ? "ready"
              : "waiting";
      if (row.dataset.status !== status) row.dataset.status = status;
      const selected = activeTaskId === task.id;
      row.classList.toggle("selected", selected);
      setText(
        $(row, ".ta-task-status"),
        state.status === "done"
          ? "✓"
          : state.status === "running"
            ? "◷"
            : ready
              ? "○"
              : "·",
      );
      const ghost = this.ghost?.tasks[task.id];
      const meta =
        state.status === "done"
          ? `${formatTime(state.finished ?? 0)}${ghost !== undefined ? ` / ${ghost > (state.finished ?? 0) ? "−" : "+"}${Math.abs(Math.round((state.finished ?? 0) - ghost))}s` : ""}`
          : state.status === "running"
            ? `${t("working")} · ${Math.ceil(task.duration - state.elapsed)}s`
            : ready
              ? `${t("ready")}${ghost !== undefined ? ` · ${t("ghost")} ${formatTime(ghost)}` : ""}`
              : task.requires
                  .filter((id) => !done(s, id))
                  .map((id) => t(id))
                  .join(" + ");
      setText($(row, ".ta-task-meta"), meta);
      const percent = `${Math.floor((state.elapsed / task.duration) * 100)}%`;
      const bar = $(row, ".ta-task-progress");
      if (bar.style.width !== percent) bar.style.width = percent;
      if (state.status === "done") completed++;
    }
    setText(
      $(this.root, "#task-count"),
      `${completed}/${Object.keys(s.tasks).length}`,
    );
    const service = s.phase === "service" || s.phase === "pushback";
    setHidden($(this.root, ".ta-fleet"), !service);
    $(this.root, ".ta-checklist").classList.toggle("inactive", !service);
    const isFlight = ["approach", "rollout", "takeoff"].includes(s.phase);
    setHidden($(this.root, ".ta-instruments"), !isFlight);
    setHidden($(this.root, ".ta-mini-map"), isFlight);
    $(this.root, ".ta-context").classList.toggle("flying", !service);
    const ctxIcon = service ? (icons[this.selected] ?? truckIcon) : planeIcon;
    const ctxEl = $(this.root, "#context-icon");
    if (ctxEl.dataset.icon !== (service ? this.selected : "plane")) {
      ctxEl.innerHTML = ctxIcon;
      ctxEl.dataset.icon = service ? this.selected : "plane";
    }
    setText(
      $(this.root, "#context-label"),
      service
        ? t(`v:${this.selected}`)
        : isFlight
          ? `${s.phase === "takeoff" ? (s.assistedTakeoff ? "AUTO" : "MANUAL") : s.assistedLand ? "AUTO" : "MANUAL"} / REGIONAL ${s.flight === 1 ? "107" : "208"}`
          : "WASD / TAXI",
    );
    const current = task && s.tasks[task.id];
    setText($(this.root, "#context-title"), task ? t(task.id) : t(s.phase));
    const noOps = completed === Object.keys(s.tasks).length;
    setText(
      $(this.root, "#context-detail"),
      s.phase === "service"
        ? noOps
          ? t("clearApron")
          : current?.status === "running"
            ? `${t("working")} · ${Math.ceil(task!.duration - current.elapsed)}s`
            : task?.id === "park"
              ? t("park")
              : task && !available(s, task)
                ? t("dependencies")
                : t(dockQuality(task!, pose))
        : s.phase === "pushback"
          ? t(s.pushConnected ? "pushAttached" : "pushReady")
          : isFlight
            ? t("flightControls")
            : t("taxiControls"),
    );
    const stats = $(this.root, "#dock-stats");
    const html = task
      ? `<span>↗ ${distance(service ? pose : p, task.at).toFixed(1)} m</span>${task.heading !== undefined ? `<span>↻ ${Math.round(((((pose.heading * 180) / Math.PI) % 360) + 360) % 360)}° / ${Math.round(((task.heading * 180) / Math.PI + 360) % 360)}°</span>` : ""}${task.height !== undefined ? `<span>↕ ${pose.height.toFixed(1)} / ${task.height.toFixed(1)} m · Q/E</span>` : ""}`
      : "";
    if (stats.innerHTML !== html) stats.innerHTML = html;
    setHidden($(this.root, ".ta-interact"), !service);
    setText(
      $(this.root, "#key-help"),
      isFlight
        ? t("flightControls")
        : s.phase === "pushback"
          ? t("pushControls")
          : service
            ? `WASD ${t(this.selected === "crew" ? "walk" : "drive")}  ·  ${this.selected === "crew" ? "F " + t("connect") : "Q/E " + t("height")}  ·  Space ${t("brake")}  ·  Tab ${t("change")}  ·  C ${t("checklist")}`
            : t("taxiControls"),
    );
    for (const v of this.fleet()) {
      const button = $(this.root, `[data-vehicle="${v.id}"]`);
      setAttribute(button, "aria-pressed", String(this.selected === v.id));
      $(button, "i").classList.toggle("connected", Boolean(s.attached[v.id]));
    }
    setText($(this.root, "#speed"), Math.round(p.speed).toString());
    setText($(this.root, "#altitude"), Math.max(0, Math.round(p.y)).toString());
    const deviation = p.y - Math.max(0, (p.z - 80) * 0.052),
      whites =
        deviation > 8
          ? 4
          : deviation > 3
            ? 3
            : deviation < -8
              ? 0
              : deviation < -3
                ? 1
                : 2;
    this.root
      .querySelectorAll("#papi i")
      .forEach((lamp, index) => lamp.classList.toggle("white", index < whites));
    setText(
      $(this.root, "#flight-cue"),
      s.phase === "takeoff"
        ? p.speed >= 52
          ? "VR · ROTATE ↓"
          : p.speed >= 45
            ? "V1 · COMMITTED"
            : "V1 45 / VR 52"
        : p.speed < 40
          ? "STALL · W"
          : "2 WHITE / 2 RED",
    );
    const mapPlayer = this.root.querySelector("#map-player")!,
      mapTarget = this.root.querySelector("#map-target")!;
    setAttribute(mapPlayer, "cx", String(pose.x));
    setAttribute(mapPlayer, "cy", String(pose.z));
    setAttribute(mapTarget, "cx", String(task?.at[0] ?? 0));
    setAttribute(mapTarget, "cy", String(task?.at[1] ?? 0));
    setAttribute(
      this.root.querySelector("#map-plane")!,
      "transform",
      `translate(${p.x} ${p.z}) rotate(${(p.heading * 180) / Math.PI})`,
    );
  }
  private select(id: VehicleId) {
    if (!this.fleet().some((v) => v.id === id)) return;
    this.selected = id;
    this.focusTask = undefined;
    this.keys.clear();
    this.updateHUD();
    this.loop.request();
  }
  private interact() {
    if (this.mode !== "playing" || !this.world) return;
    const now = performance.now();
    this.accountClock(now);
    this.advanceServices(now);
    const s = this.state,
      task = this.activeTask();
    if (s.phase === "pushback") {
      if (
        !s.pushConnected &&
        this.selected === "push" &&
        task &&
        dockQuality(task, this.world.poses.push) === "perfect"
      ) {
        s.pushConnected = true;
        say(s, "pushAttached");
      } else if (
        s.pushConnected &&
        s.plane.z >= 24 &&
        Math.abs(s.plane.speed) < 0.4
      ) {
        s.pushConnected = false;
        s.phase = "taxiout";
        s.checkpoints = [];
        say(s, "pushed");
      } else say(s, s.pushConnected ? "pushWait" : "align");
    } else if (s.phase === "service") {
      if (task && s.tasks[task.id]?.status === "waiting")
        interactTask(s, task, this.world.poses[this.selected]);
      else if (s.attached[this.selected]) release(s, this.selected);
      else say(s, task?.id === "park" ? "park" : "noTask");
    }
    this.audio.beep();
    this.startTimer();
    this.updateHUD();
    this.loop.request();
  }
  private pause() {
    this.keys.clear();
    if (this.mode !== "playing") return;
    const now = performance.now();
    this.accountClock(now);
    this.advanceServices(now);
    this.mode = "pause";
    this.stopTimer();
    this.audio.pause(true);
    this.pauseDialog();
    this.loop.request();
  }
  private resume() {
    if (this.mode !== "pause") return;
    this.mode = "playing";
    this.lastWall = performance.now();
    this.lastTaskWall = this.lastWall;
    this.startTimer();
    this.dialog.close();
    this.dockAppearance(false);
    this.canvas.focus();
    this.audio.pause(false);
    this.loop.request();
  }
  private click = (event: MouseEvent) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-action]",
    );
    if (!button) return;
    const action = button.dataset.action;
    if (action === "start" || action === "restart") void this.begin();
    else if (action === "flight") {
      this.state.flight = Number(button.dataset.flight) as 1 | 2;
      this.menu();
    } else if (action === "pause") {
      if (this.mode === "pause") this.resume();
      else this.pause();
    } else if (action === "resume") this.resume();
    else if (action === "menu") {
      this.keys.clear();
      this.menu();
    } else if (action === "sound")
      void this.audio.toggle().then(() => {
        this.audio.pause(this.mode !== "playing");
        setText(button, this.t(this.audio.enabled ? "soundOn" : "soundOff"));
      });
    else if (action === "checklist") {
      const list = $(this.root, ".ta-checklist");
      list.hidden = !list.hidden;
      $(this.root, ".ta-reopen").hidden = !list.hidden;
    } else if (this.mode === "playing" && action === "vehicle") {
      this.select(button.dataset.vehicle as VehicleId);
      this.canvas.focus();
    } else if (this.mode === "playing" && action === "task") {
      const task = tasksFor(this.state.flight).find(
        (t) => t.id === button.dataset.task,
      );
      if (task && task.vehicle !== "auto") {
        this.select(task.vehicle);
        this.focusTask = task.id;
        this.updateHUD();
        this.canvas.focus();
      }
    } else if (action === "interact") {
      this.interact();
      this.canvas.focus();
    }
  };
  private change = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (input.id === "auto-land") this.state.assistedLand = input.checked;
    if (input.id === "auto-takeoff") this.state.assistedTakeoff = input.checked;
    if (this.mode === "menu") {
      const focus = input.id;
      this.menu();
      this.root.querySelector<HTMLElement>(`#${focus}`)?.focus();
    }
  };
  private keydown = (event: KeyboardEvent) => {
    if (event.code === "Escape") {
      event.preventDefault();
      if (this.mode === "playing") this.pause();
      else if (this.mode === "pause") this.resume();
      return;
    }
    if (
      this.mode !== "playing" ||
      event.target !== this.canvas ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    if (/^(Key[WASDQEFCR]|Space|Tab|Arrow|Digit)/.test(event.code))
      event.preventDefault();
    if (!event.repeat && event.code === "KeyF") this.interact();
    else if (!event.repeat && event.code === "KeyC")
      $(this.root, '[data-action="checklist"]').click();
    else if (!event.repeat && event.code === "Tab") {
      const fleet = this.fleet();
      this.select(
        fleet[
          (fleet.findIndex((v) => v.id === this.selected) +
            (event.shiftKey ? fleet.length - 1 : 1)) %
            fleet.length
        ].id,
      );
    } else if (!event.repeat && event.code.startsWith("Digit")) {
      const v = this.fleet()[Number(event.code.slice(5)) - 1];
      if (v) this.select(v.id);
    }
    this.keys.add(event.code);
    this.loop.request();
  };
  private keyup = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (this.mode === "playing") this.loop.request();
  };
  private accountClock(now = performance.now()) {
    if (this.mode === "playing")
      this.state.time += Math.max(0, (now - this.lastWall) / 1000);
    this.lastWall = now;
  }
  private stopTimer() {
    clearTimeout(this.timer);
    this.timer = 0;
  }
  private startTimer() {
    this.stopTimer();
    if (this.mode !== "playing") return;
    let delay = 1000;
    if (this.state.phase === "service" && this.world) {
      const pending =
        this.taskAccumulator +
        Math.max(0, performance.now() - this.lastTaskWall) / 1000;
      for (const task of tasksFor(this.state.flight)) {
        const state = this.state.tasks[task.id];
        if (state.status === "running" && this.serviceCanProgress(task)) {
          delay = Math.min(
            delay,
            Math.max(1, (task.duration - state.elapsed - pending) * 1000),
          );
        }
      }
    }
    // Wake early for an exact completion deadline, so sleeping does not add time to the player's score.
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      const now = performance.now();
      this.accountClock(now);
      if (!this.loop.active && this.advanceServices(now)) this.loop.request();
      this.updateHUD();
      this.startTimer();
    }, delay);
  }
  private serviceCanProgress(task: Task) {
    return (
      task.vehicle === "auto" ||
      (this.world &&
        dockQuality(task, this.world.poses[task.vehicle]) === "perfect")
    );
  }
  private advanceServices(now: number) {
    const elapsed = Math.max(0, (now - this.lastTaskWall) / 1000);
    this.lastTaskWall = now;
    const s = this.state;
    if (s.phase !== "service" || !this.world) {
      this.taskAccumulator = 0;
      return false;
    }
    // Preserve the 120 Hz task order while sleeping between invisible service updates.
    let changed = false;
    const active = tasksFor(s.flight).some(
      (task) =>
        s.tasks[task.id].status === "running" ||
        (task.vehicle === "auto" && available(s, task)),
    );
    if (active) {
      this.taskAccumulator += elapsed;
      while (this.taskAccumulator >= 1 / 120) {
        this.taskAccumulator -= 1 / 120;
        changed =
          tickTasks(
            s,
            1 / 120,
            this.world.poses,
            s.time - this.taskAccumulator,
          ) || changed;
      }
    } else {
      this.taskAccumulator = 0;
    }
    if (serviceComplete(s, this.world.poses)) {
      s.phase = "pushback";
      this.selected = "push";
      this.focusTask = undefined;
      say(s, "pushReady");
      changed = true;
    }
    return changed;
  }
  private frame(now: number, dt: number) {
    if (!this.world || this.disposed) return false;
    if (this.mode !== "playing") {
      this.world.render(0, this.selected, undefined, this.mode === "menu");
      return false;
    }
    this.accountClock(now);
    this.accumulator += dt;
    const s = this.state,
      axis = (a: string, b: string) =>
        Number(this.keys.has(a)) - Number(this.keys.has(b));
    while (this.accumulator >= 1 / 120) {
      const step = 1 / 120;
      const before = s.phase;
      stepPlane(s, step, {
        throttle: axis("KeyW", "KeyS"),
        // The operations model measures headings toward +X; screen-right is -X
        // in Babylon's left-handed chase/ramp view of the -Z-facing aircraft.
        steer: ["approach", "takeoff"].includes(s.phase)
          ? axis("ArrowLeft", "ArrowRight")
          : axis("KeyA", "KeyD"),
        pitch: axis("ArrowDown", "ArrowUp"),
        brake: this.keys.has("Space"),
        reverse: this.keys.has("KeyR"),
      });
      this.world.step(step, this.selected, this.keys);
      if (before !== s.phase) {
        this.keys.clear();
        this.focusTask = undefined;
        this.selected = s.phase === "pushback" ? "push" : "crew";
      }
      this.accumulator -= step;
      if (s.phase === "complete") {
        this.recordBroken = !this.qa && this.progress.save(s);
        this.mode = "results";
        this.stopTimer();
        this.keys.clear();
        this.audio.pause(true);
        this.resultsDialog();
        break;
      }
    }
    this.advanceServices(now);
    if (this.world.poses[this.selected].speed < -0.3)
      this.audio.reverse(s.time);
    this.world.render(dt, this.selected, this.activeTask(), false);
    if (now - this.lastHUD > 100) {
      this.updateHUD();
      this.lastHUD = now;
    }
    const animated =
      s.phase !== "service" ||
      this.world.physicsActive ||
      this.world.hasDriveInput(this.selected, this.keys) ||
      tasksFor(s.flight).some(
        (task) =>
          ["deplane", "board", "unload", "load"].includes(task.id) &&
          s.tasks[task.id]?.status === "running" &&
          this.serviceCanProgress(task),
      );
    return this.mode === "playing" && animated;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.signal.removeEventListener("abort", this.abort);
    this.sceneAbort?.abort();
    this.lifetime.abort();
    this.loop.dispose();
    this.stopTimer();
    this.removeAppearance();
    this.world?.dispose();
    this.audio.dispose();
    this.dialog?.close();
    this.root.replaceChildren();
  }
}
