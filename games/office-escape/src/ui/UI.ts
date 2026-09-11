import { mountGameAppearance } from '../../../../shared/game-appearance.js';
import { campaignStars, type CampaignRecord } from '../../../../shared/CampaignProgress';
import { officeLevels, type OfficeLevel } from '../world/levels';
import { setText } from '../../../../shared/dom.js';
import {
  areaHints,
  areaNames,
  furnitureName,
  getLocale,
  onLocaleChange,
  setLocale,
  t,
  type TextKey,
} from '../i18n';
import { RunManager, formatTime } from '../systems/RunManager';
import { siteLinks } from './SiteAppearance';
const icon = (path: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const audioIcon = (muted: boolean) =>
  icon(
    `<path d="M11 5 6 9H3v6h3l5 4Z"/>${muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}`,
  );
interface Interaction {
  name: string;
  grabbed: boolean;
}
export class UI {
  private panel!: HTMLElement;
  private clock!: HTMLElement;
  private best!: HTMLElement;
  private hint!: HTMLElement;
  private cards!: HTMLElement;
  private falls!: HTMLElement;
  private routeProgress!: HTMLElement;
  private toastElement!: HTMLElement;
  private areas: { element: HTMLElement; marker: HTMLElement }[] = [];
  private toastTimer = 0;
  private toastKey?: TextKey;
  private muted = false;
  private mode: 'loading' | 'intro' | 'playing' | 'paused' | 'finished' | 'error' = 'loading';
  private result?: RunManager;
  private lastFrame?: Parameters<UI['update']>;
  private unsubscribe: () => void;
  private cleanupAppearance?: () => void;
  constructor(
    private root: HTMLElement,
    private actions: {
      level: () => OfficeLevel;
      record: (id: string) => CampaignRecord | undefined;
      cards: () => number;
      selectLevel: (id: string) => void;
      nextLevel: () => void;
      play: () => void;
      restart: () => void;
      pause: () => void;
      mute: () => boolean;
    },
  ) {
    this.render();
    this.unsubscribe = onLocaleChange(() => {
      this.render();
      if (this.lastFrame)
        this.update(
          ...(this.lastFrame.slice(0, 3) as [RunManager, number, Interaction | undefined]),
          0,
        );
      this.root.querySelector<HTMLAnchorElement>('[data-focus="site-language"]')?.focus();
    });
  }
  private render() {
    this.cleanupAppearance?.();
    const links = siteLinks();
    const level = this.actions.level();
    this.root.innerHTML = `<header class="game-nav"><nav class="game-nav__inner" aria-label="${t('navigation')}">
      <div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková — ${t('portfolio')}">am<span class="game-nav__dot">.</span></a><span class="game-nav__separator">/</span><a class="game-nav__crumb" href="${links.games}">${t('games')}</a><span class="game-nav__separator">/</span><span class="game-nav__current" aria-current="page">Office Escape</span></div>
      <div class="game-nav__actions"><label class="level-picker"><span>${t('levels')}</span><select id="level" aria-label="${t('levels')}" ${this.mode === 'loading' ? 'disabled' : ''}>${officeLevels.map((l, i) => `<option value="${l.id}" ${l.id === level.id ? 'selected' : ''}>${i + 1} · ${t(l.name)} ${'★'.repeat(this.actions.record(l.id)?.stars ?? 0)}</option>`).join('')}</select></label><button class="game-nav__icon" id="sound" aria-label="${t(this.muted ? 'unmute' : 'mute')}">${audioIcon(this.muted)}</button><button class="game-nav__button" id="pause" aria-label="${t('pauseGame')}" title="${t('pause')} (Esc)">${icon('<path d="M9 5v14M15 5v14"/>')}<span class="game-nav__button-label">${t('pause')}</span></button><div data-game-appearance></div></div>
    </nav></header>
    <div class="objective panel"><span class="eyebrow"><i class="accent-square"></i>${t('levelLabel').replace('{number}', String(officeLevels.indexOf(level) + 1).padStart(2, '0'))}</span><h2>${t(level.name)}</h2><p>${t('objective')}</p><p class="card-progress" id="cards"></p></div>
    <div class="time-card panel"><span class="eyebrow">${t('clock')}</span><strong id="time">00:00<span>.000</span></strong><div class="best-row"><span>${t('best')}</span><b id="best">— — : — —</b></div></div>
    <section class="route-card panel"><div class="route-title"><span class="live-dot"></span>${t('route')}<span id="progress">01 / 04</span></div><ol>${areaNames.map((name, i) => `<li data-area="${i}"><span>0${i + 1}</span>${t(name)}<b></b></li>`).join('')}</ol><div class="falls"><span>${t('incidents')}</span><b id="falls">00</b></div></section>
    <div class="bottom"><div class="hint panel" id="hint">${t(areaHints[0])}</div><div class="controls"><span><kbd>W A S D</kbd>${t('move')}</span><span><kbd>SPACE</kbd>${t('jump')}</span><span><kbd>SHIFT</kbd>${t('sprint')}</span><span><kbd>E</kbd>${t('drag')}</span><span><kbd>R</kbd>${t('checkpoint')}</span><span class="look">${t('look')}</span></div></div>
    <div class="status-tag"><span class="live-dot"></span>${t('overtime')}</div><div id="toast" role="status" aria-live="polite" class="${this.toastTimer > 0 ? 'show' : ''}">${this.toastKey ? t(this.toastKey) : ''}</div><div id="flash"></div><div class="panel-wrap" id="panel"></div>`;
    this.panel = this.root.querySelector('#panel')!;
    this.clock = this.root.querySelector('#time')!;
    this.best = this.root.querySelector('#best')!;
    this.hint = this.root.querySelector('#hint')!;
    this.cards = this.root.querySelector('#cards')!;
    this.falls = this.root.querySelector('#falls')!;
    this.routeProgress = this.root.querySelector('#progress')!;
    this.toastElement = this.root.querySelector('#toast')!;
    this.areas = Array.from(this.root.querySelectorAll<HTMLElement>('[data-area]'), (element) => ({
      element,
      marker: element.querySelector<HTMLElement>('b')!,
    }));
    this.cleanupAppearance = mountGameAppearance(
      this.root.querySelector<HTMLElement>('[data-game-appearance]')!,
      { locale: getLocale(), onLocaleChange: setLocale },
    );
    this.root.querySelector<HTMLSelectElement>('#level')!.onchange = (event) =>
      this.actions.selectLevel((event.target as HTMLSelectElement).value);
    this.root.querySelector<HTMLButtonElement>('#pause')!.onclick = this.actions.pause;
    this.root.querySelector<HTMLButtonElement>('#sound')!.onclick = () => {
      this.muted = this.actions.mute();
      const button = this.root.querySelector<HTMLButtonElement>('#sound')!;
      button.innerHTML = audioIcon(this.muted);
      button.setAttribute('aria-label', t(this.muted ? 'unmute' : 'mute'));
    };
    this.panel.onclick = (event) => {
      const button = (event.target as HTMLElement).closest('button');
      if (button?.id === 'play' || button?.id === 'resume') this.actions.play();
      if (button?.id === 'restart') this.actions.restart();
      if (button?.id === 'next') this.actions.nextLevel();
      if (button?.id === 'reload') location.reload();
    };
    this.renderPanel();
  }
  private renderPanel() {
    const level = this.actions.level();
    const last = officeLevels.indexOf(level) === officeLevels.length - 1;
    this.panel.hidden = this.mode === 'playing';
    if (this.mode === 'loading' || this.mode === 'intro') {
      this.panel.innerHTML = `<section class="intro-panel panel"><div class="eyebrow"><i class="accent-square"></i>${t('levelLabel').replace('{number}', String(officeLevels.indexOf(level) + 1).padStart(2, '0'))}</div><h1>${t(level.name)}<span class="brand-dot">.</span></h1><p>${t(level.briefing)}</p><p class="star-goal">${t('starGoal').replace('{time}', formatTime(level.par).split('.')[0])}</p><button class="primary" id="play" ${this.mode === 'loading' ? 'disabled' : ''}>${t(this.mode === 'loading' ? 'loading' : 'play')}<span>↗</span></button><div class="intro-meta"><span>${t('oneOffice')}</span><span>${t('fourCheckpoints')}</span><span>${t('zeroOvertime')}</span></div><p class="desktop-note">${t('desktop')}</p></section><div class="floor-note"><span>↖</span>${t('furniturePath')}<small>${t('hr')}</small></div>`;
    } else if (this.mode === 'paused') {
      this.panel.innerHTML = `<section class="modal panel"><span class="eyebrow">${t('breakLabel')}</span><h1>${t('breakHeading')}</h1><p>${t('breakNote')}</p><button class="primary" id="resume">${t('resume')}<span>↗</span></button><button class="secondary" id="restart">${t('fresh')}</button></section>`;
    } else if (this.mode === 'finished' && this.result) {
      const run = this.result;
      const stars = campaignStars(run.seconds, level.par, run.falls === 0);
      this.panel.innerHTML = `<section class="modal panel result"><div class="eyebrow">✓ ${t('success')}</div><h1>${t('escaped')}<span class="brand-dot">.</span></h1><p>${t(last ? 'campaignFinished' : 'resultNote')}</p><p class="campaign-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p><div class="result-time"><span class="eyebrow">${t('yourTime')}</span><strong>${formatTime(run.seconds)}</strong></div><div class="result-stats"><div><span>${t('best')}</span><b>${formatTime(run.best)}</b></div><div><span>${t('falls')}</span><b>${run.falls}</b></div></div><button class="primary" id="next">${t(last ? 'firstLevel' : 'nextLevel')}<span>→</span></button><button class="secondary" id="restart">${t('beat')}<span>↗</span></button><a href="${siteLinks().games}">${t('back')}</a></section>`;
    } else if (this.mode === 'error') {
      this.panel.innerHTML = `<section class="modal panel"><h1>${t('errorHeading')}</h1><p>${t('errorNote')}</p><button class="primary" id="reload">${t('retry')} ↗</button></section>`;
    }
  }
  resetLevel() {
    this.mode = 'loading';
    this.lastFrame = undefined;
    this.result = undefined;
    this.toastTimer = 0;
    this.toastKey = undefined;
    document.body.classList.remove('playing');
    this.render();
  }
  ready() {
    this.mode = 'intro';
    this.root.querySelector<HTMLSelectElement>('#level')!.disabled = false;
    this.renderPanel();
  }
  playing() {
    this.mode = 'playing';
    this.renderPanel();
    document.body.classList.add('playing');
  }
  pause() {
    this.mode = 'paused';
    this.renderPanel();
  }
  update(run: RunManager, area: number, interaction: Interaction | undefined, dt: number) {
    this.lastFrame = [run, area, interaction, 0];
    const parts = formatTime(run.seconds).split('.');
    setText(this.clock.firstChild!, parts[0]);
    setText(this.clock.lastChild!, `.${parts[1]}`);
    setText(
      this.cards,
      `${t('cards')}: ${this.actions.cards()} / ${this.actions.level().cards.length}`,
    );
    setText(this.best, formatTime(run.best));
    setText(this.falls, String(run.falls).padStart(2, '0'));
    setText(this.routeProgress, `0${area + 1} / 04`);
    this.areas.forEach(({ element: el, marker }, i) => {
      const nextClass = i === area ? 'active' : i < area ? 'done' : '';
      if (el.className !== nextClass) el.className = nextClass;
      setText(marker, i === area ? t('you') : i < area ? '✓' : '');
    });
    setText(
      this.hint,
      interaction
        ? t(interaction.grabbed ? 'dragging' : 'nearby').replace(
            '{object}',
            furnitureName(interaction.name),
          )
        : t(areaHints[area]),
    );
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastElement.classList.remove('show');
    }
  }
  toast(key: TextKey, failure = false) {
    this.toastKey = key;
    const el = this.root.querySelector('#toast')!;
    el.textContent = t(key);
    el.classList.add('show');
    this.toastTimer = failure ? 0.8 : 2.4;
    if (failure) {
      const flash = this.root.querySelector<HTMLElement>('#flash')!;
      flash.classList.remove('hit');
      void flash.offsetWidth;
      flash.classList.add('hit');
    }
  }
  finish(run: RunManager) {
    this.mode = 'finished';
    this.result = run;
    this.renderPanel();
  }
  error() {
    this.mode = 'error';
    this.renderPanel();
  }
  dispose() {
    this.cleanupAppearance?.();
    this.unsubscribe();
  }
}
