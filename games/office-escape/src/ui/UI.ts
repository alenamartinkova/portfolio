import { setText } from '../../../../shared/dom.js';
import { areaHints, areaNames, furnitureName, getLocale, onLocaleChange, setLocale, t, type TextKey } from '../i18n';
import { RunManager, formatTime } from '../systems/RunManager';
import { isLightTheme, siteLinks, toggleSiteTheme } from './SiteAppearance';
const icon = (path: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const audioIcon = (muted: boolean) => icon(`<path d="M11 5 6 9H3v6h3l5 4Z"/>${muted ? '<path d="m16 9 6 6m0-6-6 6"/>' : '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>'}`);
interface Interaction { name: string; grabbed: boolean }
export class UI {
  private panel!: HTMLElement;
  private clock!: HTMLElement;
  private best!: HTMLElement;
  private hint!: HTMLElement;
  private toastTimer = 0;
  private toastKey?: TextKey;
  private muted = false;
  private mode: 'loading' | 'intro' | 'playing' | 'paused' | 'finished' | 'error' = 'loading';
  private result?: RunManager;
  private lastFrame?: Parameters<UI['update']>;
  private unsubscribe: () => void;
  constructor(private root: HTMLElement, private actions: { play: () => void; restart: () => void; pause: () => void; mute: () => boolean }) {
    this.render();
    this.unsubscribe = onLocaleChange(() => {
      this.render();
      if (this.lastFrame) this.update(...this.lastFrame.slice(0, 3) as [RunManager, number, Interaction | undefined], 0);
      this.root.querySelector<HTMLButtonElement>(`[data-locale="${getLocale()}"]`)?.focus();
    });
  }
  private render() {
    const links = siteLinks();
    this.root.innerHTML = `<header class="game-nav"><nav class="game-nav__inner" aria-label="${t('navigation')}">
      <div class="game-nav__trail"><a class="game-nav__mark" href="${links.home}" aria-label="Alena Martinková — ${t('portfolio')}"><span class="game-nav__bracket">[</span>AM<span class="game-nav__bracket">]</span></a><span class="game-nav__separator">/</span><a class="game-nav__crumb" href="${links.games}">${t('games')}</a><span class="game-nav__separator">/</span><span class="game-nav__current" aria-current="page">Office Escape</span></div>
      <div class="game-nav__actions"><div class="locale" role="group" aria-label="${t('language')}">${(['en', 'sk'] as const).map(locale => `<button class="locale__option ${getLocale() === locale ? 'is-active' : ''}" data-locale="${locale}" aria-pressed="${getLocale() === locale}" aria-label="${locale === 'sk' ? 'Slovenčina' : 'English'}">${locale.toUpperCase()}</button>`).join('')}</div><button class="game-nav__icon" id="sound" aria-label="${t(this.muted ? 'unmute' : 'mute')}">${audioIcon(this.muted)}</button><button class="game-nav__icon" id="theme"></button><button class="game-nav__button" id="pause" aria-label="${t('pauseGame')}" title="${t('pause')} (Esc)">${icon('<path d="M9 5v14M15 5v14"/>')}<span class="game-nav__button-label">${t('pause')}</span></button></div>
    </nav></header>
    <div class="objective panel"><span class="eyebrow"><i class="accent-square"></i>${t('rule')}</span><h2>${t('objective')}</h2><p>${t('objectiveNote')}</p></div>
    <div class="time-card panel"><span class="eyebrow">${t('clock')}</span><strong id="time">00:00<span>.000</span></strong><div class="best-row"><span>${t('best')}</span><b id="best">— — : — —</b></div></div>
    <section class="route-card panel"><div class="route-title"><span class="live-dot"></span>${t('route')}<span id="progress">01 / 04</span></div><ol>${areaNames.map((name, i) => `<li data-area="${i}"><span>0${i + 1}</span>${t(name)}<b></b></li>`).join('')}</ol><div class="falls"><span>${t('incidents')}</span><b id="falls">00</b></div></section>
    <div class="bottom"><div class="hint panel" id="hint">${t(areaHints[0])}</div><div class="controls"><span><kbd>W A S D</kbd>${t('move')}</span><span><kbd>SPACE</kbd>${t('jump')}</span><span><kbd>SHIFT</kbd>${t('sprint')}</span><span><kbd>E</kbd>${t('drag')}</span><span><kbd>R</kbd>${t('checkpoint')}</span><span class="look">${t('look')}</span></div></div>
    <div class="status-tag"><span class="live-dot"></span>${t('overtime')}</div><div id="toast" role="status" aria-live="polite" class="${this.toastTimer > 0 ? 'show' : ''}">${this.toastKey ? t(this.toastKey) : ''}</div><div id="flash"></div><div class="panel-wrap" id="panel"></div>`;
    this.panel = this.root.querySelector('#panel')!;
    this.clock = this.root.querySelector('#time')!;
    this.best = this.root.querySelector('#best')!;
    this.hint = this.root.querySelector('#hint')!;
    this.root.querySelectorAll<HTMLButtonElement>('[data-locale]').forEach(button => { button.onclick = () => setLocale(button.dataset.locale === 'sk' ? 'sk' : 'en'); });
    this.root.querySelector<HTMLButtonElement>('#pause')!.onclick = this.actions.pause;
    this.root.querySelector<HTMLButtonElement>('#sound')!.onclick = () => {
      this.muted = this.actions.mute();
      const button = this.root.querySelector<HTMLButtonElement>('#sound')!;
      button.innerHTML = audioIcon(this.muted);
      button.setAttribute('aria-label', t(this.muted ? 'unmute' : 'mute'));
    };
    const theme = this.root.querySelector<HTMLButtonElement>('#theme')!;
    const updateTheme = () => {
      theme.title = t(isLightTheme() ? 'darkTheme' : 'lightTheme');
      theme.setAttribute('aria-label', theme.title);
      theme.innerHTML = isLightTheme() ? icon('<path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/>') : icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>');
    };
    updateTheme(); theme.onclick = () => { toggleSiteTheme(); updateTheme(); };
    this.panel.onclick = event => {
      const button = (event.target as HTMLElement).closest('button');
      if (button?.id === 'play' || button?.id === 'resume') this.actions.play();
      if (button?.id === 'restart') this.actions.restart();
      if (button?.id === 'reload') location.reload();
    };
    this.renderPanel();
  }
  private renderPanel() {
    this.panel.hidden = this.mode === 'playing';
    if (this.mode === 'loading' || this.mode === 'intro') {
      this.panel.innerHTML = `<section class="intro-panel panel"><div class="eyebrow"><i class="accent-square"></i>${t('rebellion')}</div><h1>${t('introHeading')}<br><em>${t('introEmphasis')}</em></h1><p>${t('introNote')}</p><button class="primary" id="play" ${this.mode === 'loading' ? 'disabled' : ''}>${t(this.mode === 'loading' ? 'loading' : 'play')}<span>↗</span></button><div class="intro-meta"><span>${t('oneOffice')}</span><span>${t('fourCheckpoints')}</span><span>${t('zeroOvertime')}</span></div><p class="desktop-note">${t('desktop')}</p></section><div class="floor-note"><span>↖</span>${t('furniturePath')}<small>${t('hr')}</small></div>`;
    } else if (this.mode === 'paused') {
      this.panel.innerHTML = `<section class="modal panel"><span class="eyebrow">${t('breakLabel')}</span><h1>${t('breakHeading')}</h1><p>${t('breakNote')}</p><button class="primary" id="resume">${t('resume')}<span>↗</span></button><button class="secondary" id="restart">${t('fresh')}</button></section>`;
    } else if (this.mode === 'finished' && this.result) {
      const run = this.result;
      this.panel.innerHTML = `<section class="modal panel result"><div class="eyebrow">✓ ${t('success')}</div><h1>${t('escaped')}<span class="brand-dot">.</span></h1><p>${t('resultNote')}</p><div class="result-time"><span class="eyebrow">${t('yourTime')}</span><strong>${formatTime(run.seconds)}</strong></div><div class="result-stats"><div><span>${t('best')}</span><b>${formatTime(run.best)}</b></div><div><span>${t('falls')}</span><b>${run.falls}</b></div></div><button class="primary" id="restart">${t('beat')}<span>↗</span></button><a href="${siteLinks().games}">${t('back')}</a></section>`;
    } else if (this.mode === 'error') {
      this.panel.innerHTML = `<section class="modal panel"><h1>${t('errorHeading')}</h1><p>${t('errorNote')}</p><button class="primary" id="reload">${t('retry')} ↗</button></section>`;
    }
  }
  ready() { this.mode = 'intro'; this.renderPanel(); }
  playing() { this.mode = 'playing'; this.renderPanel(); document.body.classList.add('playing'); }
  pause() { this.mode = 'paused'; this.renderPanel(); }
  update(run: RunManager, area: number, interaction: Interaction | undefined, dt: number) {
    this.lastFrame = [run, area, interaction, 0];
    const parts = formatTime(run.seconds).split('.');
    setText(this.clock.firstChild!, parts[0]);
    setText(this.clock.lastChild!, `.${parts[1]}`);
    setText(this.best, formatTime(run.best));
    setText(this.root.querySelector('#falls')!, String(run.falls).padStart(2, '0'));
    setText(this.root.querySelector('#progress')!, `0${area + 1} / 04`);
    this.root.querySelectorAll<HTMLElement>('[data-area]').forEach((el, i) => {
      const nextClass = i === area ? 'active' : i < area ? 'done' : '';
      if (el.className !== nextClass) el.className = nextClass;
      setText(el.querySelector('b')!, i === area ? t('you') : i < area ? '✓' : '');
    });
    setText(this.hint, interaction ? t(interaction.grabbed ? 'dragging' : 'nearby').replace('{object}', furnitureName(interaction.name)) : t(areaHints[area]));
    this.toastTimer -= dt;
    if (this.toastTimer <= 0) this.root.querySelector('#toast')!.classList.remove('show');
  }
  toast(key: TextKey, failure = false) {
    this.toastKey = key;
    const el = this.root.querySelector('#toast')!; el.textContent = t(key); el.classList.add('show'); this.toastTimer = failure ? .8 : 2.4;
    if (failure) { const flash = this.root.querySelector<HTMLElement>('#flash')!; flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit'); }
  }
  finish(run: RunManager) { this.mode = 'finished'; this.result = run; this.renderPanel(); }
  error() { this.mode = 'error'; this.renderPanel(); }
  dispose() { this.unsubscribe(); }
}
