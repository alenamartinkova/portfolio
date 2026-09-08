import { actionKey } from '../core/actions';
import type { Action } from '../core/actions';
import type { Resource } from '../core/board';
import { publicVP, scoreBreakdown } from '../core/scoring';
import { COSTS, emptyTrade, handSize, piecesLeft, RESOURCES } from '../core/state';
import type { GameOptions, GameState, Player, ResourceMap } from '../core/state';
import { missingResources, tradeRatio } from '../core/trade';
import { devCardName, getLocale, localize as t, logText, playerName, resourceName } from '../i18n';
import { DEFAULT_SETTINGS, normalizeSettings } from './preferences';
import type { Settings } from './preferences';
import {
  isLightTheme,
  setSiteAccent,
  setSiteLocale,
  siteAccent,
  siteGames,
  siteHome,
  SITE_ACCENTS,
  toggleSiteTheme,
} from './siteAppearance';
import './styles.css';

export type BuildMode = 'village' | 'road' | 'town' | 'bandit' | null;
export interface ViewState {
  legal: readonly Action[];
  actor: number;
  thinking: boolean;
  mode: BuildMode;
  selectedAction: Action | null;
  message: string;
  saveStatus: string;
  settings: Settings;
  canResume: boolean;
  replayIndex: number | null;
  handRevealed: boolean;
}
interface HUDCallbacks {
  action(action: Action): void;
  mode(mode: BuildMode): void;
  newGame(options: GameOptions): void;
  resume(): void;
  settings(settings: Settings): void;
  exportReplay(): void;
  importReplay(text: string): void;
  highlight(id: string | null): void;
  replayTo(index: number | null): void;
  confirmSelected(): void;
  stepSelection(direction: -1 | 1): void;
  revealHand(): void;
}

const escape = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );
const symbols: Readonly<Record<Resource, string>> = {
  lumber: '♠',
  grain: '≋',
  wool: '◌',
  brick: '▰',
  ore: '◆',
};
const playerMarks = ['✦', '◆', '●', '≋'] as const;
const resourceIcon = (resource: Resource): string =>
  `<span class="hx-resource-icon hx-resource-${resource}" aria-hidden="true">${symbols[resource]}</span>`;
const basket = (resources: ResourceMap): string =>
  RESOURCES.filter((resource) => resources[resource] > 0)
    .map(
      (resource) => `${resources[resource]}${t(' ', ' × ')}${resourceName(resource).toLowerCase()}`,
    )
    .join(', ') || t('nothing', 'nič');
const selected = (first: unknown, second: unknown): string => (first === second ? ' selected' : '');
const checked = (value: boolean): string => (value ? ' checked' : '');

const buildLabel = (mode: Exclude<BuildMode, null>): string => {
  switch (mode) {
    case 'road':
      return t('Build road', 'Postaviť cestu');
    case 'village':
      return t('Build village', 'Postaviť dedinu');
    case 'town':
      return t('Build town', 'Postaviť mesto');
    case 'bandit':
      return t('Move bandit', 'Presunúť zbojníka');
  }
};
const displayPlayer = (player: Player | undefined): string =>
  player ? playerName(player) : t('Trader', 'Obchodník');
const tradeSide = (side: 'give' | 'want'): string =>
  side === 'give' ? t('give', 'ponuka') : t('want', 'požiadavka');

const importFailureText = (): string =>
  t(
    'That replay could not be read. Choose a readable JSON replay file.',
    'Záznam sa nepodarilo prečítať. Vyber čitateľný súbor záznamu vo formáte JSON.',
  );

function phaseCopy(state: GameState, view: ViewState): [string, string] {
  if (view.replayIndex !== null)
    return [
      t('A look back', 'Pohľad späť'),
      t(
        `Showing action ${view.replayIndex}. Return to the live game to continue.`,
        `Zobrazuje sa akcia ${view.replayIndex}. Ak chceš pokračovať, vráť sa do aktuálnej hry.`,
      ),
    ];
  if (view.thinking)
    return [
      t('Considering the next move', 'Premýšľa nad ďalším ťahom'),
      t('The next trader is taking their turn.', 'Na ťahu je ďalší obchodník.'),
    ];
  if (state.tradeOffer)
    return [
      t('An offer at the table', 'Ponuka na stole'),
      t(
        'Open Trade to respond or adjust your offer.',
        'Otvor Obchod a odpovedz alebo uprav svoju ponuku.',
      ),
    ];
  switch (state.phase.type) {
    case 'setupVillage':
      return [
        t('Place a village', 'Umiestni dedinu'),
        state.phase.step < state.players.length
          ? t(
              'Choose a highlighted coastal or inland junction. Your first village is free.',
              'Vyber zvýraznenú križovatku pri pobreží alebo vo vnútrozemí. Prvá dedina je zadarmo.',
            )
          : t(
              'Choose your second village. Its surrounding land supplies your starting resources.',
              'Vyber miesto pre druhú dedinu. Okolité územia ti dajú počiatočné suroviny.',
            ),
      ];
    case 'setupRoad':
      return [
        t('Place a road', 'Umiestni cestu'),
        t(
          'Choose a highlighted edge beside your new village. This road is free.',
          'Vyber zvýraznenú hranu vedľa novej dediny. Táto cesta je zadarmo.',
        ),
      ];
    case 'roll':
      return [
        t('A new turn', 'Nový ťah'),
        t(
          'Roll the dice to see what the island provides.',
          'Hoď kockami a zisti, aké suroviny ostrov poskytne.',
        ),
      ];
    case 'action':
      return [
        t('Make your next move', 'Vyber ďalší krok'),
        t(
          'Build, trade, play a development card, or end your turn.',
          'Stavaj, obchoduj, zahraj rozvojovú kartu alebo ukonči ťah.',
        ),
      ];
    case 'discard':
      return [
        t('Return resources', 'Vráť suroviny'),
        t(
          `Choose ${state.phase.pending[view.actor] ?? 0} more cards to return to the bank.`,
          `Vyber ďalšie karty na vrátenie do banky. Zostáva: ${state.phase.pending[view.actor] ?? 0}.`,
        ),
      ];
    case 'bandit':
      return [
        t('Move the bandit', 'Presuň zbojníka'),
        t(
          'Choose a different land tile. The bandit blocks its production.',
          'Vyber iné políčko pevniny. Zbojník na ňom zablokuje produkciu.',
        ),
      ];
    case 'steal':
      return [
        t('Choose a neighbour', 'Vyber suseda'),
        t(
          'Take one random resource from a neighbouring trader.',
          'Vezmi jednu náhodnú surovinu susednému obchodníkovi.',
        ),
      ];
    case 'freeRoads':
      return [
        t('Build a free road', 'Postav cestu zadarmo'),
        t(
          `${state.phase.remaining} free ${state.phase.remaining === 1 ? 'road remains' : 'roads remain'}. Choose a highlighted edge.`,
          `Cesty zadarmo: ${state.phase.remaining}. Vyber zvýraznenú hranu.`,
        ),
      ];
    case 'plenty':
      return [
        t('A year of plenty', 'Rok hojnosti'),
        t(
          `Choose ${state.phase.remaining} more ${state.phase.remaining === 1 ? 'resource' : 'resources'} from the bank.`,
          `Vyber ďalšie suroviny z banky. Zostáva: ${state.phase.remaining}.`,
        ),
      ];
    case 'monopoly':
      return [
        t('Name your resource', 'Vyber surovinu'),
        t(
          'Collect that resource from the other traders.',
          'Získaj všetky karty tejto suroviny od ostatných obchodníkov.',
        ),
      ];
    case 'gameOver':
      return [
        t('The bay has a winner', 'Záliv má víťaza'),
        t(
          'Review the final scores or begin a new game.',
          'Pozri si konečné skóre alebo začni novú hru.',
        ),
      ];
  }
}

export function createHUD(
  root: HTMLElement,
  callbacks: HUDCallbacks,
): {
  render(state: GameState | null, view: ViewState): void;
  dispose(): void;
} {
  root.classList.add('hx-hud');
  const content = document.createElement('div');
  content.className = 'hx-layout';
  const status = document.createElement('div');
  status.className = 'hx-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const statusMessage = document.createTextNode('');
  const statusSave = document.createElement('span');
  status.append(statusMessage, statusSave);
  let state: GameState | null = null;
  let view: ViewState = {
    legal: [],
    actor: 0,
    thinking: false,
    mode: null,
    selectedAction: null,
    message: '',
    saveStatus: '',
    settings: DEFAULT_SETTINGS,
    canResume: false,
    replayIndex: null,
    handRevealed: true,
  };
  let menuOpen = false;
  let settingsOpen = false;
  let winDismissed = false;
  let panel: 'trade' | 'log' | null = null;
  let filter = 'all';
  let bankGive: Resource = 'lumber';
  let bankReceive: Resource = 'grain';
  let replayMaximum = 0;
  let importFailed = false;
  let previousOffer: GameState['tradeOffer'] = null;
  let setup = { ...DEFAULT_SETTINGS };
  let setupInitialized = false;
  let disposed = false;
  let returnFocus: string | null = null;
  const openDetails = new Set(['bank', 'player-trade', 'cards']);
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.json,application/json';
  importInput.hidden = true;
  root.replaceChildren(content, status, importInput);

  function canInteract(): boolean {
    return (
      !view.thinking &&
      view.replayIndex === null &&
      (state?.players[view.actor]?.kind !== 'human' || view.handRevealed)
    );
  }

  function button(label: string, command: string, extra = '', disabled = false): string {
    const classes = extra.match(/class="([^"]*)"/)?.[1] ?? 'hx-button';
    const attributes = extra.replace(/class="[^"]*"/, '');
    return `<button type="button" class="${classes}" data-command="${command}" data-focus="${command}" ${disabled ? 'disabled' : ''} ${attributes}>${label}</button>`;
  }

  function actionButton(
    action: Action | undefined,
    label: string,
    focus: string,
    title = '',
  ): string {
    const index = action === undefined ? -1 : view.legal.indexOf(action);
    return `<button type="button" class="hx-button" data-action="${index}" data-focus="${escape(focus)}" ${index < 0 || !canInteract() ? 'disabled' : ''} title="${escape(title)}">${label}</button>`;
  }

  function localeControls(context: 'header' | 'setup' | 'settings'): string {
    return `<div class="hx-language" role="group" aria-label="${t('Language', 'Jazyk')}">${(['en', 'sk'] as const).map((locale) => `<button type="button" data-command="locale-${locale}" data-focus="${context}-locale-${locale}" lang="${locale}" aria-label="${locale === 'en' ? 'English' : 'Slovenčina'}" aria-pressed="${getLocale() === locale}">${locale.toUpperCase()}</button>`).join('')}</div>`;
  }

  function siteHeader(): string {
    const themeLabel = isLightTheme()
      ? t('Switch to dark mode', 'Prepnúť na tmavý režim')
      : t('Switch to light mode', 'Prepnúť na svetlý režim');
    const sun =
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>';
    const moon = '<path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z"/>';
    const icon = (paths: string): string =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    return `<header class="game-nav"><nav class="game-nav__inner" aria-label="${t('Game navigation', 'Navigácia hry')}"><div class="game-nav__trail"><a class="game-nav__mark" href="${siteHome()}" aria-label="Alena Martinková — ${t('portfolio', 'portfólio')}"><span class="game-nav__bracket">[</span>AM<span class="game-nav__bracket">]</span></a><span class="game-nav__separator" aria-hidden="true">/</span><a class="game-nav__crumb" href="${siteGames()}">Games</a><span class="game-nav__separator" aria-hidden="true">/</span><span class="game-nav__current" aria-current="page">Hexhaven</span></div><div class="game-nav__actions">${localeControls('header')}${button(`${icon('<path d="M12 5v14M5 12h14"/>')}<span class="game-nav__button-label">${t('New game', 'Nová hra')}</span>`, 'new-game', `class="game-nav__button" aria-label="${t('New game', 'Nová hra')}" title="${t('New game', 'Nová hra')}"`)}${button(icon(isLightTheme() ? moon : sun), 'toggle-theme', `class="game-nav__icon" aria-label="${themeLabel}" title="${themeLabel}"`)}${button(icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>'), 'settings', `class="game-nav__icon" aria-label="${t('Settings', 'Nastavenia')}" title="${t('Settings', 'Nastavenia')}"`)}</div></nav></header>`;
  }

  function playerStrip(game: GameState): string {
    return `<ol class="hx-players" aria-label="${t('Players and public scores', 'Hráči a verejné skóre')}">${game.players
      .map((player) => {
        const pieces = piecesLeft(game, player.id);
        const piecesDescription = t(
          `${pieces.roads} roads · ${pieces.villages} villages · ${pieces.towns} towns`,
          `Cesty: ${pieces.roads} · Dediny: ${pieces.villages} · Mestá: ${pieces.towns}`,
        );
        const cards = handSize(player.hand);
        const development = player.devCards.length;
        const cardDescription = t(
          `${cards} resource cards. ${development} development cards.`,
          `Karty surovín: ${cards}. Rozvojové karty: ${development}.`,
        );
        return `<li class="hx-player ${player.id === game.activePlayer ? 'is-active' : ''}" data-player="${player.id}" data-player-id="${player.id}" ${player.id === game.activePlayer ? 'aria-current="true"' : ''}>
        <span class="hx-player-mark" aria-hidden="true">${playerMarks[player.id]}</span>
        <div class="hx-player-summary"><strong>${escape(playerName(player))}</strong><span class="hx-player-cards" title="${cardDescription}"><span class="hx-sr-only">${cardDescription}</span><span class="hx-cards-full" aria-hidden="true">${t(`${cards} cards · ${development} dev`, `Karty: ${cards} · Rozv.: ${development}`)}</span><span class="hx-cards-compact" aria-hidden="true">${t(`${cards} cards · ${development} dev`, `${cards} K · ${development} R`)}</span></span>
        <span class="hx-player-pieces" title="${t('Pieces remaining', 'Zostávajúce figúrky')}"><span class="hx-pieces-full">${piecesDescription}</span><span class="hx-pieces-compact"><span class="hx-sr-only">${t('Pieces left', 'Zostávajúce figúrky')}: ${piecesDescription}.</span><span aria-hidden="true">${pieces.roads}${t('r', 'c')} · ${pieces.villages}${t('v', 'd')} · ${pieces.towns}${t('t', 'm')}</span></span></span></div>
        <div class="hx-player-score"><b>${publicVP(game, player.id)}</b><span>${t('VP', 'VB')}</span></div>
        <div class="hx-player-awards"><span title="${t('Longest continuous route', 'Najdlhšia súvislá cesta')}">${t('Route', 'Trasa')} ${game.routeLengths[player.id] ?? 0}${game.longestRouteHolder === player.id ? t(' · +2 VP', ' · +2 VB') : ''}</span><span title="${t('Guards played', 'Zahraní strážcovia')}">${t('Guards', 'Stráže')} ${player.guardsPlayed}${game.largestArmyHolder === player.id ? t(' · +2 VP', ' · +2 VB') : ''}</span></div>
      </li>`;
      })
      .join('')}</ol>`;
  }

  function phaseActions(game: GameState): string {
    const phase = game.phase.type;
    if (phase === 'roll')
      return actionButton(
        view.legal.find((action) => action.type === 'roll'),
        `${t('Roll dice', 'Hodiť kockami')} <kbd>R</kbd>`,
        'roll',
      );
    if (phase === 'discard' || phase === 'plenty' || phase === 'monopoly') {
      const type = phase === 'discard' ? 'discard' : phase === 'plenty' ? 'takePlenty' : 'monopoly';
      return `<div class="hx-resource-choices">${RESOURCES.map((resource) =>
        actionButton(
          view.legal.find(
            (action) =>
              action.type === type && 'resource' in action && action.resource === resource,
          ),
          `${resourceIcon(resource)} ${resourceName(resource)}`,
          `${type}-${resource}`,
        ),
      ).join('')}</div>`;
    }
    if (phase === 'steal')
      return `<div class="hx-choice-list">${view.legal
        .filter((action) => action.type === 'steal')
        .map((action) =>
          action.type === 'steal'
            ? actionButton(
                action,
                t(
                  `Take from ${escape(displayPlayer(game.players[action.victim]))}`,
                  `Vziať kartu: ${escape(displayPlayer(game.players[action.victim]))}`,
                ),
                `steal-${action.victim}`,
              )
            : '',
        )
        .join('')}</div>`;
    return '';
  }

  function selectionControls(): string {
    if (view.mode === null || !canInteract()) return '';
    const action = view.selectedAction;
    const valid =
      action !== null && view.legal.some((candidate) => actionKey(candidate) === actionKey(action));
    return `<div class="hx-selection"><div class="hx-selection-cycle">${button(t('Previous spot', 'Predošlé miesto'), 'previous-selection', '', !view.legal.length)}${button(t('Next spot', 'Ďalšie miesto'), 'next-selection', '', !view.legal.length)}</div>${button(buildLabel(view.mode), 'confirm-selection', 'data-testid="selected-confirm" class="hx-button hx-primary"', !valid)}<p>${t('Click a marked spot, or use the previous and next controls.', 'Klikni na označené miesto alebo ho vyber tlačidlami Predošlé miesto a Ďalšie miesto.')}</p></div>`;
  }

  function turnPanel(game: GameState): string {
    const [title, instruction] = phaseCopy(game, view);
    const actor = game.players[view.actor];
    const diceLabel = game.dice
      ? t(
          `Dice: ${game.dice[0]} and ${game.dice[1]}, total ${game.dice[0] + game.dice[1]}`,
          `Kocky: ${game.dice[0]} a ${game.dice[1]}, spolu ${game.dice[0] + game.dice[1]}`,
        )
      : '';
    return `<section class="hx-turn-panel hx-surface" aria-labelledby="hx-turn-heading"><p class="hx-eyebrow">${game.turn === 0 ? t('Setting the table', 'Príprava hry') : t(`Turn ${game.turn}`, `Ťah ${game.turn}`)} · ${escape(actor ? playerName(actor) : '')}</p><div class="hx-turn-title"><h2 id="hx-turn-heading">${title}</h2>${game.dice ? `<div class="hx-dice" aria-label="${diceLabel}"><span>${game.dice[0]}</span><span>${game.dice[1]}</span></div>` : ''}</div><p data-testid="phase-instruction">${instruction}</p>${phaseActions(game)}${selectionControls()}</section>`;
  }

  function buildBar(game: GameState, person: Player): string {
    const pieces = piecesLeft(game, person.id);
    const options = [
      { mode: 'road' as const, type: 'placeRoad' as const, cost: COSTS.road, left: pieces.roads },
      {
        mode: 'village' as const,
        type: 'placeVillage' as const,
        cost: COSTS.village,
        left: pieces.villages,
      },
      { mode: 'town' as const, type: 'buildTown' as const, cost: COSTS.town, left: pieces.towns },
    ];
    return `<div class="hx-build-bar" data-testid="build-bar">${options
      .map((option) => {
        const available = view.legal.some((action) => action.type === option.type);
        const missing = missingResources(person.hand, option.cost);
        const free =
          (option.mode === 'village' && game.phase.type === 'setupVillage') ||
          (option.mode === 'road' && ['setupRoad', 'freeRoads'].includes(game.phase.type));
        const cost = t(`Cost: ${basket(option.cost)}.`, `Cena: ${basket(option.cost)}.`);
        const need = handSize(missing)
          ? t(` Need ${basket(missing)}.`, ` Chýba: ${basket(missing)}.`)
          : '';
        const unavailable = !option.left
          ? t(` No ${option.mode} pieces remain.`, ' Už nemáš figúrky tohto typu.')
          : !available && !handSize(missing)
            ? t(
                ' No legal placement is available in this phase.',
                ' V tejto fáze nie je dostupné žiadne povolené miesto.',
              )
            : '';
        const explanation = free
          ? t('Free placement.', 'Umiestnenie zadarmo.')
          : cost + need + unavailable;
        return `<button type="button" data-mode="${option.mode}" data-focus="build-${option.mode}" class="hx-build-tool ${view.mode === option.mode ? 'is-selected' : ''}" aria-pressed="${view.mode === option.mode}" title="${escape(explanation)}" ${!available || !canInteract() ? 'disabled' : ''}><strong>${buildLabel(option.mode)}</strong><span>${free ? t('Free', 'Zadarmo') : basket(option.cost)}</span></button>`;
      })
      .join('')}${actionButton(
      view.legal.find((action) => action.type === 'buyDev'),
      `<strong>${t('Buy card', 'Kúpiť kartu')}</strong><span>${t('1 grain, 1 wool, 1 ore', '1 × obilie, 1 × vlna, 1 × ruda')}</span>`,
      'buy-development',
      t(`Cost: ${basket(COSTS.dev)}.`, `Cena: ${basket(COSTS.dev)}.`) +
        (handSize(missingResources(person.hand, COSTS.dev))
          ? t(
              ` Need ${basket(missingResources(person.hand, COSTS.dev))}.`,
              ` Chýba: ${basket(missingResources(person.hand, COSTS.dev))}.`,
            )
          : ''),
    )}${actionButton(
      view.legal.find((action) => action.type === 'endTurn'),
      t('End turn', 'Ukončiť ťah'),
      'end-turn',
    )}</div>`;
  }

  function hand(game: GameState): string {
    const actor = game.players[view.actor];
    const humans = game.players.filter((player) => player.kind === 'human');
    const person = actor?.kind === 'bot' && humans.length === 1 ? humans[0] : actor;
    if (person === undefined) return '';
    const name = escape(playerName(person));
    if (person.kind === 'bot')
      return `<section class="hx-dock hx-surface"><p class="hx-bot-wait"><span class="hx-wait-dot" aria-hidden="true"></span>${t(`${name} is considering the island.`, `${name} premýšľa nad ďalším ťahom.`)}</p></section>`;
    if (!view.handRevealed)
      return `<section class="hx-dock hx-surface hx-privacy" data-testid="privacy-overlay"><div><p class="hx-eyebrow">${t('Pass the device', 'Podaj zariadenie')}</p><h2>${t(`${name}, your turn.`, `${name}, si na ťahu.`)}</h2><p>${t('Your hand stays private until you are ready.', 'Tvoje karty zostanú skryté, kým nebudeš pripravený hrať.')}</p></div>${button(t('Reveal my hand', 'Ukázať moje karty'), 'reveal-hand', 'class="hx-button hx-primary"')}</section>`;
    return `<section class="hx-dock hx-surface" aria-label="${t('Your hand and building controls', 'Tvoje karty a stavanie')}"><div class="hx-hand" data-testid="player-hand"><p><strong>${person.name === 'You' ? t('Your hand', 'Tvoje karty') : t(`${name}’s hand`, `Karty: ${name}`)}</strong><span>${t(`${handSize(person.hand)} resource cards`, `Karty surovín: ${handSize(person.hand)}`)}</span></p><ul>${RESOURCES.map((resource) => `<li>${resourceIcon(resource)}<span>${resourceName(resource)}</span><b>${person.hand[resource]}</b></li>`).join('')}</ul></div>${buildBar(game, person)}${
      person.devCards.length
        ? `<details class="hx-development" data-detail="cards" ${openDetails.has('cards') ? 'open' : ''}><summary>${t('Development cards', 'Rozvojové karty')} <span>${person.devCards.length}</span></summary><div class="hx-card-hand">${person.devCards
            .map((card) =>
              actionButton(
                view.legal.find((action) => action.type === 'playDev' && action.card === card.id),
                escape(devCardName(card.kind)),
                `card-${card.id}`,
                card.kind === 'victoryPoint'
                  ? t(
                      'This point is kept private until victory.',
                      'Tento bod zostane skrytý až do víťazstva.',
                    )
                  : card.boughtTurn >= game.turn
                    ? t(
                        'This card becomes playable on a later turn.',
                        'Túto kartu môžeš zahrať až v niektorom z ďalších ťahov.',
                      )
                    : t(
                        'Play when this card is available during your turn.',
                        'Zahraj kartu vo svojom ťahu, keď bude dostupná.',
                      ),
              ),
            )
            .join('')}</div></details>`
        : ''
    }</section>`;
  }

  function tradePanel(game: GameState): string {
    const person = game.players[view.actor];
    if (!person || person.kind !== 'human' || !view.handRevealed)
      return `<p>${t('Trading controls appear when the current trader reveals their hand.', 'Obchodovanie sa sprístupní, keď hráč na ťahu odkryje svoje karty.')}</p>`;
    const draft = game.tradeDrafts[person.id] ?? emptyTrade();
    const ratio = tradeRatio(game, person.id, bankGive);
    const bankAction = view.legal.find(
      (action) =>
        action.type === 'bankTrade' && action.give === bankGive && action.receive === bankReceive,
    );
    const offer = game.tradeOffer;
    const offerMarkup = offer
      ? `<div class="hx-offer"><h3>${t(`${escape(displayPlayer(game.players[offer.proposer]))}’s offer`, `Ponuka: ${escape(displayPlayer(game.players[offer.proposer]))}`)}</h3><p>${t('Gives', 'Ponúka')} ${escape(basket(offer.give))}<br>${t('Receives', 'Žiada')} ${escape(basket(offer.want))}</p><div class="hx-inline-actions">${view.legal
          .filter((action) => action.type === 'respondTrade' || action.type === 'cancelTrade')
          .map((action) =>
            action.type === 'respondTrade'
              ? actionButton(
                  action,
                  action.response === 'accept'
                    ? t('Accept offer', 'Prijať ponuku')
                    : action.response === 'decline'
                      ? t('Decline', 'Odmietnuť')
                      : t('Send counteroffer', 'Poslať protiponuku'),
                  `offer-${action.response}`,
                )
              : actionButton(action, t('Close offer', 'Zavrieť ponuku'), 'close-offer'),
          )
          .join('')}</div>${Object.entries(offer.counters)
          .map(
            ([id, counter]) =>
              `<div class="hx-counter"><strong>${t(`${escape(displayPlayer(game.players[Number(id)]))} counters`, `Protiponuka: ${escape(displayPlayer(game.players[Number(id)]))}`)}</strong><p>${t('Gives', 'Ponúka')} ${escape(basket(counter.give))}; ${t('wants', 'žiada')} ${escape(basket(counter.want))}.</p><div class="hx-inline-actions">${actionButton(
                view.legal.find(
                  (action) => action.type === 'acceptCounter' && action.opponent === Number(id),
                ),
                t('Accept counter', 'Prijať protiponuku'),
                `accept-counter-${id}`,
              )}${actionButton(
                view.legal.find(
                  (action) => action.type === 'declineCounter' && action.opponent === Number(id),
                ),
                t('Decline counter', 'Odmietnuť protiponuku'),
                `decline-counter-${id}`,
              )}</div></div>`,
          )
          .join('')}</div>`
      : '';
    return `<div data-testid="trade-panel">${offerMarkup}<details data-detail="bank" ${openDetails.has('bank') ? 'open' : ''}><summary>${t('Bank & harbours', 'Banka a prístavy')}</summary><p class="hx-muted">${t('Your harbour access sets the best exchange rate.', 'Tvoje prístavy určujú najvýhodnejší výmenný kurz.')}</p><div class="hx-bank-fields"><label>${t('Give', 'Ponúkaš')}<select data-bank="give" data-focus="bank-give">${RESOURCES.map((resource) => `<option value="${resource}"${selected(bankGive, resource)}>${resourceName(resource)} · ${tradeRatio(game, person.id, resource)}:1</option>`).join('')}</select></label><label>${t('Receive', 'Dostaneš')}<select data-bank="receive" data-focus="bank-receive">${RESOURCES.map((resource) => `<option value="${resource}"${selected(bankReceive, resource)}>${resourceName(resource)} (${t(`${game.bank[resource]} in bank`, `v banke: ${game.bank[resource]}`)})</option>`).join('')}</select></label></div>${actionButton(bankAction, t(`Trade ${ratio} ${resourceName(bankGive).toLowerCase()} for 1 ${resourceName(bankReceive).toLowerCase()}`, `Vymeniť ${ratio} × ${resourceName(bankGive).toLowerCase()} za 1 × ${resourceName(bankReceive).toLowerCase()}`), 'bank-trade', bankGive === bankReceive ? t('Choose two different resources.', 'Vyber dve rôzne suroviny.') : !bankAction ? t('You need enough resources, stock in the bank, and an open action phase.', 'Potrebuješ dosť surovín, zásoby v banke a fázu stavania a obchodovania.') : '')}</details><details data-detail="player-trade" ${openDetails.has('player-trade') ? 'open' : ''}><summary>${offer && offer.proposer !== person.id ? t('Your counteroffer', 'Tvoja protiponuka') : t('Trade with a player', 'Obchod s hráčom')}</summary><label>${t('Trade with', 'Obchodovať s')}<select data-trade-target data-focus="trade-target" ${!view.legal.some((action) => action.type === 'targetTrade') ? 'disabled' : ''}><option value="all"${selected(draft.target, null)}>${t('All other players', 'Všetci ostatní hráči')}</option>${game.players
      .filter((player) => player.id !== person.id)
      .map(
        (player) =>
          `<option value="${player.id}"${selected(draft.target, player.id)}>${escape(playerName(player))}</option>`,
      )
      .join(
        '',
      )}</select></label><div class="hx-trade-grid"><span></span><strong>${t('You give', 'Ponúkaš')}</strong><strong>${t('You want', 'Žiadaš')}</strong>${RESOURCES.map(
      (resource) =>
        `<span class="hx-trade-resource">${resourceIcon(resource)}${resourceName(resource)}</span>${(
          ['give', 'want'] as const
        )
          .map(
            (side) =>
              `<div class="hx-stepper">${actionButton(
                view.legal.find(
                  (action) =>
                    action.type === 'editTrade' &&
                    action.side === side &&
                    action.resource === resource &&
                    action.delta === -1,
                ),
                `<span aria-hidden="true">−</span><span class="hx-sr-only">${t(`Remove one ${resource} from ${side}`, `Odobrať jednu kartu: ${resourceName(resource)}, ${tradeSide(side)}`)}</span>`,
                `trade-${side}-${resource}-minus`,
              )}<output aria-label="${tradeSide(side)} ${resourceName(resource)}">${draft[side][resource]}</output>${actionButton(
                view.legal.find(
                  (action) =>
                    action.type === 'editTrade' &&
                    action.side === side &&
                    action.resource === resource &&
                    action.delta === 1,
                ),
                `<span aria-hidden="true">+</span><span class="hx-sr-only">${t(`Add one ${resource} to ${side}`, `Pridať jednu kartu: ${resourceName(resource)}, ${tradeSide(side)}`)}</span>`,
                `trade-${side}-${resource}-plus`,
              )}</div>`,
          )
          .join('')}`,
    ).join('')}</div>${
      !offer
        ? actionButton(
            view.legal.find((action) => action.type === 'proposeTrade'),
            t('Propose trade', 'Navrhnúť obchod'),
            'propose-trade',
            t(
              'Offer and request at least one resource, without the same resource on both sides.',
              'Ponúkni aj žiadaj aspoň jednu surovinu. Rovnaká surovina nesmie byť na oboch stranách.',
            ),
          )
        : ''
    }</details></div>`;
  }

  function logPanel(game: GameState): string {
    const entries = game.log
      .filter((entry) => filter === 'all' || entry.category === filter)
      .slice(-100)
      .reverse();
    const categories = [
      ['all', t('All activity', 'Všetky udalosti')],
      ['build', t('Build', 'Stavanie')],
      ['trade', t('Trade', 'Obchod')],
      ['roll', t('Roll', 'Hody kockami')],
      ['card', t('Card', 'Karty')],
      ['turn', t('Turn', 'Ťahy')],
    ] as const;
    return `<div data-testid="turn-log"><label>${t('Show', 'Zobraziť')}<select data-log-filter data-focus="log-filter">${categories.map(([value, label]) => `<option value="${value}"${selected(filter, value)}>${label}</option>`).join('')}</select></label><div class="hx-replay"><label for="hx-replay-range">${t('Replay', 'Záznam')} · ${view.replayIndex === null ? t('Live game', 'Aktuálna hra') : t(`Action ${view.replayIndex}`, `Akcia ${view.replayIndex}`)}</label><input id="hx-replay-range" data-testid="replay-slider" data-replay-range data-focus="replay-range" type="range" min="0" max="${replayMaximum}" value="${view.replayIndex ?? replayMaximum}"><div class="hx-inline-actions">${button(t('Return to live', 'Späť do hry'), 'live-replay', '', view.replayIndex === null)}${button(t('Export replay', 'Stiahnuť záznam'), 'export')}${button(t('Import replay', 'Načítať záznam'), 'import')}</div></div><ol class="hx-log">${entries.length ? entries.map((entry) => `<li><button type="button" data-log-index="${entry.index + 1}" data-highlight="${escape(entry.location ?? '')}" data-focus="log-${entry.index}"><span>${t(`Turn ${entry.turn || 'setup'}`, entry.turn ? `Ťah ${entry.turn}` : 'Príprava hry')}</span>${escape(logText(game, entry))}</button></li>`).join('') : `<li class="hx-muted">${t('Your story begins with the first village.', 'Tvoj príbeh sa začína prvou dedinou.')}</li>`}</ol></div>`;
  }

  function sidePanel(game: GameState): string {
    return `<aside class="hx-sidebar"><div class="hx-panel-tabs">${button(t('Trade', 'Obchod'), 'toggle-trade', `aria-expanded="${panel === 'trade'}" aria-controls="hx-side-content"`)}${button(t('Log & replay', 'Denník a záznam'), 'toggle-log', `aria-expanded="${panel === 'log'}" aria-controls="hx-side-content"`)}</div>${panel ? `<section class="hx-side-content hx-surface" id="hx-side-content" aria-label="${panel === 'trade' ? t('Trading', 'Obchodovanie') : t('Turn log and replay', 'Denník ťahov a záznam')}" data-scroll="side"><div class="hx-panel-heading"><h2>${panel === 'trade' ? t('At the market', 'Na trhu') : t('The story so far', 'Doterajší príbeh')}</h2>${button(t('Close', 'Zavrieť'), 'close-panel')}</div>${panel === 'trade' ? tradePanel(game) : logPanel(game)}</section>` : ''}</aside>`;
  }

  function setupDialog(): string {
    const difficulties = [
      ['easy', t('Easy', 'Ľahká')],
      ['normal', t('Normal', 'Normálna')],
      ['hard', t('Hard', 'Ťažká')],
    ] as const;
    return `<div class="hx-modal-backdrop"><section class="hx-modal hx-setup" role="dialog" aria-modal="true" aria-labelledby="hx-setup-title" data-testid="setup-dialog"><div class="hx-setup-heading"><p class="hx-eyebrow">${t('Traders of the Long Bay', 'Obchodníci z Dlhého zálivu')}</p>${localeControls('setup')}</div><h1 id="hx-setup-title">${t('Welcome to', 'Vitaj v hre')}<br><em>Hexhaven.</em></h1><p class="hx-intro">${t('Build routes, trade resources, and make a home on the bay. The first trader to 10 victory points wins.', 'Buduj cesty, obchoduj so surovinami a nájdi si domov pri zálive. Vyhrá prvý hráč, ktorý získa 10 víťazných bodov.')}</p><form data-setup-form><div class="hx-form-grid"><label>${t('Island layout', 'Rozloženie ostrova')}<select name="layout" data-focus="setup-layout"><option value="beginner"${selected(setup.layout, 'beginner')}>${t('Beginner island', 'Ostrov pre začiatočníkov')}</option><option value="random"${selected(setup.layout, 'random')}>${t('Seeded random island', 'Náhodný ostrov podľa kódu')}</option></select></label><label>${t('Seed', 'Kód ostrova')}<input name="seed" data-focus="setup-seed" type="number" step="1" required value="${setup.seed}"></label><label>${t('Players', 'Hráči')}<select name="playerCount" data-focus="setup-players">${[2, 3, 4].map((count) => `<option${selected(setup.playerCount, count)}>${count}</option>`).join('')}</select></label><label>${t('Bot opponents', 'Počítačoví súperi')}<select name="botCount" data-focus="setup-bots">${Array.from({ length: setup.playerCount }, (_, count) => `<option value="${count}"${selected(setup.botCount, count)}>${count === 0 ? t('None · pass and play', 'Žiadni · spoločné zariadenie') : count}</option>`).join('')}</select></label><label class="hx-form-wide">${t('Bot difficulty', 'Náročnosť súperov')}<select name="difficulty" data-focus="setup-difficulty">${difficulties.map(([difficulty, label]) => `<option value="${difficulty}"${selected(setup.difficulty, difficulty)}>${label}</option>`).join('')}</select></label></div><button class="hx-button hx-primary hx-start" type="submit" data-focus="start-game">${t('Start game', 'Začať hru')}</button></form><div class="hx-menu-actions">${view.canResume ? button(t('Resume saved game', 'Pokračovať v uloženej hre'), 'resume') : ''}${button(t('Import replay', 'Načítať záznam'), 'import')}${state ? button(t('Return to game', 'Vrátiť sa do hry'), 'close-menu') : `<a class="hx-button" href="${siteGames()}">${t('Back to Games', 'Späť na hry')}</a>`}</div><p class="hx-fine">${t('Saves stay on this device. Sound starts muted.', 'Hra sa ukladá na tomto zariadení. Zvuk je na začiatku vypnutý.')}</p>${(!state || importFailed) && (importFailed || view.message) ? `<p class="hx-form-message">${escape(importFailed ? importFailureText() : view.message)}</p>` : ''}</section></div>`;
  }

  function settingsDialog(): string {
    const accentNames = {
      violet: t('Violet', 'Fialová'),
      cyan: t('Cyan', 'Tyrkysová'),
      lime: t('Lime', 'Limetková'),
      amber: t('Amber', 'Jantárová'),
      rose: t('Rose', 'Ružová'),
      blue: t('Blue', 'Modrá'),
    } as const;
    const speeds = [
      ['slow', t('Slow', 'Pomalá')],
      ['normal', t('Normal', 'Normálna')],
      ['fast', t('Fast', 'Rýchla')],
    ] as const;
    return `<div class="hx-modal-backdrop"><section class="hx-modal hx-settings" role="dialog" aria-modal="true" aria-labelledby="hx-settings-title"><div class="hx-panel-heading"><h2 id="hx-settings-title">${t('At your table', 'Pri tvojom stole')}</h2>${button(t('Close', 'Zavrieť'), 'close-settings')}</div><div class="hx-locale-setting"><span>${t('Language', 'Jazyk')}</span>${localeControls('settings')}</div><div class="hx-appearance"><label>${t('Website accent', 'Akcent webu')}<select data-site-accent data-focus="site-accent">${SITE_ACCENTS.map((accent) => `<option value="${accent}"${selected(siteAccent(), accent)}>${accentNames[accent]}</option>`).join('')}</select></label><p class="hx-muted">${t('Uses the same appearance as the portfolio.', 'Používa rovnaký vzhľad ako portfólio.')}</p></div><label>${t('Animation speed', 'Rýchlosť animácií')}<select data-setting="animationSpeed" data-focus="animation-speed">${speeds.map(([speed, label]) => `<option value="${speed}"${selected(view.settings.animationSpeed, speed)}>${label}</option>`).join('')}</select></label><label class="hx-check"><input type="checkbox" data-setting="sound" data-focus="sound-setting"${checked(view.settings.sound)}><span>${t('Soft game sounds', 'Jemné zvuky hry')}<small>${t('Dice, building, trades and the bandit.', 'Kocky, stavanie, obchody a zbojník.')}</small></span></label><label class="hx-check"><input type="checkbox" data-setting="colorBlind" data-focus="colorblind-setting"${checked(view.settings.colorBlind)}><span>${t('Colour-blind patterns', 'Vzory pre farbosleposť')}<small>${t('Extra texture and symbols distinguish players and resources.', 'Dodatočné vzory a symboly odlišujú hráčov aj suroviny.')}</small></span></label><div class="hx-keyboard-help"><h3>${t('Make yourself comfortable', 'Ovládanie hry')}</h3><p>${t('Drag to orbit. Scroll or pinch to zoom. Tab moves between controls. With the board focused, Tab and Shift + Tab cycle legal spots, Enter confirms, and Escape cancels the selection and returns to the controls.', 'Potiahnutím otáčaš pohľad. Kolieskom alebo dvoma prstami približuješ. Tab prepína ovládacie prvky. Keď je vybraná doska, Tab a Shift + Tab prechádzajú povolené miesta, Enter potvrdí výber a Escape ho zruší a vráti ťa k ovládaniu.')}</p><p>${t('Press 1 to select a road, 2 for a village, 3 for a town, 4 to buy a development card, and R to roll. Each shortcut works when that action is available.', 'Stlač 1 pre cestu, 2 pre dedinu, 3 pre mesto, 4 pre nákup rozvojovej karty a R pre hod kockami. Skratka funguje, keď je daná akcia dostupná.')}</p><p>${t('Reduced motion follows your device preference.', 'Obmedzený pohyb sa riadi nastavením tvojho zariadenia.')}</p></div><p class="hx-fine">${escape(view.saveStatus)}</p></section></div>`;
  }

  function winDialog(game: GameState): string {
    if (game.phase.type !== 'gameOver') return '';
    const winner = escape(displayPlayer(game.players[game.phase.winner]));
    return `<div class="hx-modal-backdrop"><section class="hx-modal hx-win" role="dialog" aria-modal="true" aria-labelledby="hx-win-title"><p class="hx-eyebrow">${t('A new chapter for the bay', 'Nová kapitola zálivu')}</p><h2 id="hx-win-title">${t(`${winner} wins Hexhaven.`, `Víťaz hry Hexhaven: ${winner}.`)}</h2><p>${t('Every route, village and trade brought you here. The final scores are revealed.', 'Každá cesta, dedina aj obchod ťa priviedli až sem. Pozri si konečné skóre.')}</p><div class="hx-score-table"><table><thead><tr><th>${t('Trader', 'Hráč')}</th><th>${t('Buildings', 'Stavby')}</th><th>${t('Route', 'Trasa')}</th><th>${t('Guards', 'Stráže')}</th><th>${t('Cards', 'Karty')}</th><th>${t('Total', 'Spolu')}</th></tr></thead><tbody>${game.players
      .map((player) => {
        const score = scoreBreakdown(game, player.id);
        return `<tr><th>${escape(playerName(player))}</th><td>${score.buildings}</td><td>${score.longestRoute}</td><td>${score.largestArmy}</td><td>${score.victoryCards}</td><td><strong>${score.total}</strong></td></tr>`;
      })
      .join(
        '',
      )}</tbody></table></div><div class="hx-inline-actions">${button(t('Play again', 'Hrať znova'), 'new-game', 'class="hx-button hx-primary"')}${button(t('Review the island', 'Prezrieť ostrov'), 'close-win')}${button(t('Export replay', 'Stiahnuť záznam'), 'export')}</div></section></div>`;
  }

  function draw(): void {
    if (disposed) return;
    const focused =
      root.contains(document.activeElement) && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusKey = focused?.dataset.focus;
    const selection =
      focused instanceof HTMLInputElement && ['text', 'number'].includes(focused.type)
        ? ([focused.selectionStart, focused.selectionEnd] as const)
        : null;
    const editingValue = selection && focused instanceof HTMLInputElement ? focused.value : null;
    const scroll = root.querySelector<HTMLElement>('[data-scroll="side"]')?.scrollTop ?? 0;
    const oldModal = root.querySelector('[role="dialog"]') !== null;
    content.innerHTML = `${siteHeader()}${state ? playerStrip(state) + turnPanel(state) + sidePanel(state) + hand(state) : ''}${!state || menuOpen ? setupDialog() : settingsOpen ? settingsDialog() : state.phase.type === 'gameOver' && !winDismissed && view.replayIndex === null ? winDialog(state) : ''}`;
    statusMessage.textContent = importFailed ? importFailureText() : view.message;
    statusSave.textContent = view.saveStatus;
    const scroller = root.querySelector<HTMLElement>('[data-scroll="side"]');
    if (scroller) scroller.scrollTop = scroll;
    const replacement = focusKey
      ? Array.from(root.querySelectorAll<HTMLElement>('[data-focus]')).find(
          (element) => element.dataset.focus === focusKey,
        )
      : undefined;
    if (!oldModal && root.querySelector('[role="dialog"]')) {
      root
        .querySelector<HTMLElement>(
          '[role="dialog"] input, [role="dialog"] select, [role="dialog"] button',
        )
        ?.focus({ preventScroll: true });
    } else if (oldModal && !root.querySelector('[role="dialog"]')) {
      const destination = Array.from(root.querySelectorAll<HTMLElement>('[data-focus]')).find(
        (element) => element.dataset.focus === (returnFocus ?? 'new-game'),
      );
      destination?.focus({ preventScroll: true });
      returnFocus = null;
    } else if (replacement && !replacement.hasAttribute('disabled')) {
      if (editingValue !== null && replacement instanceof HTMLInputElement)
        replacement.value = editingValue;
      replacement.focus({ preventScroll: true });
      if (selection && replacement instanceof HTMLInputElement && replacement.type === 'text')
        replacement.setSelectionRange(selection[0], selection[1]);
    }
  }

  function settingForm(form: HTMLFormElement): Settings {
    const data = new FormData(form);
    return normalizeSettings({
      ...view.settings,
      layout: data.get('layout'),
      seed: Number(data.get('seed')),
      playerCount: Number(data.get('playerCount')),
      botCount: Number(data.get('botCount')),
      difficulty: data.get('difficulty'),
    });
  }

  function onClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>('button, [data-command], [data-log-index]');
    if (!target || !root.contains(target) || target.hasAttribute('disabled')) return;
    if (target.dataset.action !== undefined) {
      const action = view.legal[Number(target.dataset.action)];
      if (action && canInteract()) callbacks.action(action);
      return;
    }
    if (target.dataset.mode !== undefined) {
      const mode = target.dataset.mode;
      if (
        (mode === 'village' || mode === 'road' || mode === 'town' || mode === 'bandit') &&
        canInteract()
      )
        callbacks.mode(view.mode === mode ? null : mode);
      return;
    }
    if (target.dataset.logIndex !== undefined) {
      callbacks.replayTo(Number(target.dataset.logIndex));
      return;
    }
    const command = target.dataset.command;
    if (!command) return;
    event.preventDefault();
    switch (command) {
      case 'new-game':
        returnFocus = 'new-game';
        setup = { ...view.settings };
        menuOpen = true;
        settingsOpen = false;
        break;
      case 'close-menu':
        menuOpen = false;
        break;
      case 'locale-en':
      case 'locale-sk':
        setSiteLocale(command === 'locale-sk' ? 'sk' : 'en');
        break;
      case 'toggle-theme':
        toggleSiteTheme();
        break;
      case 'settings':
        returnFocus = 'settings';
        settingsOpen = true;
        menuOpen = false;
        break;
      case 'close-settings':
        settingsOpen = false;
        break;
      case 'close-win':
        winDismissed = true;
        break;
      case 'toggle-trade':
        panel = panel === 'trade' ? null : 'trade';
        break;
      case 'toggle-log':
        panel = panel === 'log' ? null : 'log';
        break;
      case 'close-panel':
        panel = null;
        callbacks.highlight(null);
        break;
      case 'resume':
        menuOpen = false;
        callbacks.resume();
        return;
      case 'reveal-hand':
        callbacks.revealHand();
        return;
      case 'previous-selection':
        callbacks.stepSelection(-1);
        return;
      case 'next-selection':
        callbacks.stepSelection(1);
        return;
      case 'confirm-selection':
        if (canInteract()) callbacks.confirmSelected();
        return;
      case 'export':
        callbacks.exportReplay();
        return;
      case 'import':
        importInput.click();
        return;
      case 'live-replay':
        callbacks.replayTo(null);
        return;
    }
    draw();
  }

  function onChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target.closest('[data-setup-form]') instanceof HTMLFormElement) {
      const form = target.closest<HTMLFormElement>('[data-setup-form]');
      if (form) setup = settingForm(form);
      if (target.name === 'playerCount') draw();
      return;
    }
    if (target.hasAttribute('data-site-accent')) {
      setSiteAccent(target.value);
      draw();
      return;
    }
    if (target.dataset.setting) {
      const value =
        target instanceof HTMLInputElement && target.type === 'checkbox'
          ? target.checked
          : target.value;
      callbacks.settings(normalizeSettings({ ...view.settings, [target.dataset.setting]: value }));
      return;
    }
    if (target.dataset.bank && RESOURCES.some((resource) => resource === target.value)) {
      const resource = RESOURCES.find((candidate) => candidate === target.value);
      if (resource) {
        if (target.dataset.bank === 'give') bankGive = resource;
        else bankReceive = resource;
      }
      draw();
      return;
    }
    if (target.hasAttribute('data-trade-target')) {
      const targetPlayer = target.value === 'all' ? null : Number(target.value);
      const action = view.legal.find(
        (candidate) => candidate.type === 'targetTrade' && candidate.target === targetPlayer,
      );
      if (action && canInteract()) callbacks.action(action);
      return;
    }
    if (target.hasAttribute('data-log-filter')) {
      filter = target.value;
      draw();
      return;
    }
    if (target.hasAttribute('data-replay-range')) callbacks.replayTo(Number(target.value));
  }

  function onSubmit(event: SubmitEvent): void {
    if (!(event.target instanceof HTMLFormElement) || !event.target.hasAttribute('data-setup-form'))
      return;
    event.preventDefault();
    setup = settingForm(event.target);
    const humans = setup.playerCount - setup.botCount;
    const options: GameOptions = {
      seed: setup.seed,
      layout: setup.layout,
      players: Array.from({ length: setup.playerCount }, (_, index) => ({
        name:
          index < humans
            ? humans === 1
              ? 'You'
              : `Trader ${index + 1}`
            : (['Rowan', 'Mira', 'Jules'][index - humans] ?? `Trader ${index + 1}`),
        kind: index < humans ? 'human' : 'bot',
        difficulty: setup.difficulty,
      })),
    };
    menuOpen = false;
    winDismissed = false;
    replayMaximum = 0;
    importFailed = false;
    panel = null;
    callbacks.settings(setup);
    callbacks.newGame(options);
  }

  function onToggle(event: Event): void {
    if (!(event.target instanceof HTMLDetailsElement)) return;
    const key = event.target.dataset.detail;
    if (key) {
      if (event.target.open) openDetails.add(key);
      else openDetails.delete(key);
    }
  }

  function onHighlight(event: Event): void {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-highlight]')
        : null;
    if (target) callbacks.highlight(target.dataset.highlight || null);
  }
  function clearHighlight(event: Event): void {
    if (event.target instanceof Element && event.target.closest('[data-highlight]'))
      callbacks.highlight(null);
  }
  function onKey(event: KeyboardEvent): void {
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    event.stopPropagation();
    if (event.key === 'Escape') {
      if (settingsOpen) settingsOpen = false;
      else if (menuOpen && state) menuOpen = false;
      else if (state?.phase.type === 'gameOver') winDismissed = true;
      event.preventDefault();
      event.stopPropagation();
      draw();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([hidden]), select, a[href], textarea',
      ),
    );
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  async function onImport(): Promise<void> {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (disposed) return;
      menuOpen = false;
      winDismissed = false;
      importFailed = false;
      replayMaximum = 0;
      callbacks.importReplay(text);
    } catch {
      importFailed = true;
      draw();
    } finally {
      importInput.value = '';
    }
  }

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('submit', onSubmit);
  root.addEventListener('toggle', onToggle, true);
  root.addEventListener('pointerover', onHighlight);
  root.addEventListener('pointerout', clearHighlight);
  root.addEventListener('focusin', onHighlight);
  root.addEventListener('focusout', clearHighlight);
  root.addEventListener('keydown', onKey);
  importInput.addEventListener('change', onImport);

  return {
    render(nextState, nextView) {
      if (!setupInitialized) {
        setup = { ...nextView.settings };
        setupInitialized = true;
      }
      if (
        nextState?.tradeOffer &&
        !previousOffer &&
        nextState.players[nextView.actor]?.kind === 'human'
      )
        panel = 'trade';
      previousOffer = nextState?.tradeOffer ?? null;
      state = nextState;
      view = nextView;
      replayMaximum = Math.max(replayMaximum, state?.actions.length ?? 0);
      root.dataset.colorblind = String(view.settings.colorBlind);
      draw();
    },
    dispose() {
      disposed = true;
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      root.removeEventListener('submit', onSubmit);
      root.removeEventListener('toggle', onToggle, true);
      root.removeEventListener('pointerover', onHighlight);
      root.removeEventListener('pointerout', clearHighlight);
      root.removeEventListener('focusin', onHighlight);
      root.removeEventListener('focusout', clearHighlight);
      root.removeEventListener('keydown', onKey);
      importInput.removeEventListener('change', onImport);
      callbacks.highlight(null);
      root.replaceChildren();
    },
  };
}
