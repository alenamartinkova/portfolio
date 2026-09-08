import { actionKey } from '../core/actions';
import type { Action } from '../core/actions';
import type { Resource } from '../core/board';
import { DEV_CARD_NAMES } from '../core/devcards';
import { publicVP, scoreBreakdown } from '../core/scoring';
import { COSTS, emptyTrade, handSize, piecesLeft, RESOURCES } from '../core/state';
import type { GameOptions, GameState, Player, ResourceMap } from '../core/state';
import { missingResources, tradeRatio } from '../core/trade';
import { DEFAULT_SETTINGS, normalizeSettings } from './preferences';
import type { Settings } from './preferences';
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
export interface HUDCallbacks {
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
const names: Readonly<Record<Resource, string>> = {
  lumber: 'Lumber',
  grain: 'Grain',
  wool: 'Wool',
  brick: 'Brick',
  ore: 'Ore',
};
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
    .map((resource) => `${resources[resource]} ${names[resource].toLowerCase()}`)
    .join(', ') || 'nothing';
const selected = (first: unknown, second: unknown): string => (first === second ? ' selected' : '');
const checked = (value: boolean): string => (value ? ' checked' : '');

function phaseCopy(state: GameState, view: ViewState): [string, string] {
  if (view.replayIndex !== null)
    return [
      'A look back',
      `Showing action ${view.replayIndex}. Return to the live game to continue.`,
    ];
  if (view.thinking) return ['Considering the next move', 'The next trader is taking their turn.'];
  if (state.tradeOffer)
    return ['An offer at the table', 'Open Trade to respond or adjust your offer.'];
  switch (state.phase.type) {
    case 'setupVillage':
      return [
        'Place a village',
        state.phase.step < state.players.length
          ? 'Choose a highlighted coastal or inland junction. Your first village is free.'
          : 'Choose your second village. Its surrounding land supplies your starting resources.',
      ];
    case 'setupRoad':
      return [
        'Place a road',
        'Choose a highlighted edge beside your new village. This road is free.',
      ];
    case 'roll':
      return ['A new turn', 'Roll the dice to see what the island provides.'];
    case 'action':
      return ['Make your next move', 'Build, trade, play a development card, or end your turn.'];
    case 'discard':
      return [
        'Return resources',
        `Choose ${state.phase.pending[view.actor] ?? 0} more cards to return to the bank.`,
      ];
    case 'bandit':
      return ['Move the bandit', 'Choose a different land tile. The bandit blocks its production.'];
    case 'steal':
      return ['Choose a neighbour', 'Take one random resource from a neighbouring trader.'];
    case 'freeRoads':
      return [
        'Build a free road',
        `${state.phase.remaining} free ${state.phase.remaining === 1 ? 'road remains' : 'roads remain'}. Choose a highlighted edge.`,
      ];
    case 'plenty':
      return [
        'A year of plenty',
        `Choose ${state.phase.remaining} more ${state.phase.remaining === 1 ? 'resource' : 'resources'} from the bank.`,
      ];
    case 'monopoly':
      return ['Name your resource', 'Collect that resource from the other traders.'];
    case 'gameOver':
      return ['The bay has a winner', 'Review the final scores or begin a new game.'];
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
  let notice = '';
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

  function playerStrip(game: GameState): string {
    return `<ol class="hx-players" aria-label="Players and public scores">${game.players
      .map((player) => {
        const pieces = piecesLeft(game, player.id);
        return `<li class="hx-player ${player.id === game.activePlayer ? 'is-active' : ''}" data-player="${player.id}" data-player-id="${player.id}" ${player.id === game.activePlayer ? 'aria-current="true"' : ''}>
        <span class="hx-player-mark" aria-hidden="true">${playerMarks[player.id]}</span>
        <div class="hx-player-summary"><strong>${escape(player.name)}</strong><span>${handSize(player.hand)} cards · ${player.devCards.length} dev</span>
        <span class="hx-player-pieces" title="Pieces remaining"><span class="hx-pieces-full">${pieces.roads} roads · ${pieces.villages} villages · ${pieces.towns} towns</span><span class="hx-pieces-compact"><span class="hx-sr-only">Pieces left: ${pieces.roads} roads, ${pieces.villages} villages, ${pieces.towns} towns.</span><span aria-hidden="true">${pieces.roads}r · ${pieces.villages}v · ${pieces.towns}t</span></span></span></div>
        <div class="hx-player-score"><b>${publicVP(game, player.id)}</b><span>VP</span></div>
        <div class="hx-player-awards"><span title="Longest continuous route">Route ${game.routeLengths[player.id] ?? 0}${game.longestRouteHolder === player.id ? ' · +2 VP' : ''}</span><span title="Guards played">Guards ${player.guardsPlayed}${game.largestArmyHolder === player.id ? ' · +2 VP' : ''}</span></div>
      </li>`;
      })
      .join('')}</ol>`;
  }

  function phaseActions(game: GameState): string {
    const phase = game.phase.type;
    if (phase === 'roll')
      return actionButton(
        view.legal.find((action) => action.type === 'roll'),
        'Roll dice <kbd>R</kbd>',
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
          `${resourceIcon(resource)} ${names[resource]}`,
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
                `Take from ${escape(game.players[action.victim]?.name ?? 'trader')}`,
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
    const label = view.mode === 'bandit' ? 'Move bandit' : `Build ${view.mode}`;
    return `<div class="hx-selection"><div class="hx-selection-cycle">${button('Previous spot', 'previous-selection', '', !view.legal.length)}${button('Next spot', 'next-selection', '', !view.legal.length)}</div>${button(label, 'confirm-selection', 'data-testid="selected-confirm" class="hx-button hx-primary"', !valid)}<p>Click a marked spot, or use the previous and next controls.</p></div>`;
  }

  function turnPanel(game: GameState): string {
    const [title, instruction] = phaseCopy(game, view);
    const actor = game.players[view.actor];
    return `<section class="hx-turn-panel hx-surface" aria-labelledby="hx-turn-heading"><p class="hx-eyebrow">${game.turn === 0 ? 'Setting the table' : `Turn ${game.turn}`} · ${escape(actor?.name ?? '')}</p><div class="hx-turn-title"><h2 id="hx-turn-heading">${title}</h2>${game.dice ? `<div class="hx-dice" aria-label="Dice: ${game.dice[0]} and ${game.dice[1]}, total ${game.dice[0] + game.dice[1]}"><span>${game.dice[0]}</span><span>${game.dice[1]}</span></div>` : ''}</div><p data-testid="phase-instruction">${instruction}</p>${phaseActions(game)}${selectionControls()}</section>`;
  }

  function buildBar(game: GameState, person: Player): string {
    const pieces = piecesLeft(game, person.id);
    const options = [
      {
        mode: 'road' as const,
        type: 'placeRoad' as const,
        label: 'Road',
        cost: COSTS.road,
        left: pieces.roads,
      },
      {
        mode: 'village' as const,
        type: 'placeVillage' as const,
        label: 'Village',
        cost: COSTS.village,
        left: pieces.villages,
      },
      {
        mode: 'town' as const,
        type: 'buildTown' as const,
        label: 'Town',
        cost: COSTS.town,
        left: pieces.towns,
      },
    ];
    return `<div class="hx-build-bar" data-testid="build-bar">${options
      .map((option) => {
        const available = view.legal.some((action) => action.type === option.type);
        const missing = missingResources(person.hand, option.cost);
        const free =
          (option.mode === 'village' && game.phase.type === 'setupVillage') ||
          (option.mode === 'road' && ['setupRoad', 'freeRoads'].includes(game.phase.type));
        const explanation = free
          ? 'Free placement.'
          : `Cost: ${basket(option.cost)}.${handSize(missing) ? ` Need ${basket(missing)}.` : ''}${!option.left ? ` No ${option.label.toLowerCase()} pieces remain.` : !available && !handSize(missing) ? ' No legal placement is available in this phase.' : ''}`;
        return `<button type="button" data-mode="${option.mode}" data-focus="build-${option.mode}" class="hx-build-tool ${view.mode === option.mode ? 'is-selected' : ''}" aria-pressed="${view.mode === option.mode}" title="${escape(explanation)}" ${!available || !canInteract() ? 'disabled' : ''}><strong>Build ${option.label.toLowerCase()}</strong><span>${free ? 'Free' : basket(option.cost)}</span></button>`;
      })
      .join('')}${actionButton(
      view.legal.find((action) => action.type === 'buyDev'),
      '<strong>Buy card</strong><span>1 grain, 1 wool, 1 ore</span>',
      'buy-development',
      `Cost: ${basket(COSTS.dev)}.${handSize(missingResources(person.hand, COSTS.dev)) ? ` Need ${basket(missingResources(person.hand, COSTS.dev))}.` : ''}`,
    )}${actionButton(
      view.legal.find((action) => action.type === 'endTurn'),
      'End turn',
      'end-turn',
    )}</div>`;
  }

  function hand(game: GameState): string {
    const actor = game.players[view.actor];
    const humans = game.players.filter((player) => player.kind === 'human');
    const person = actor?.kind === 'bot' && humans.length === 1 ? humans[0] : actor;
    if (person === undefined) return '';
    if (person.kind === 'bot')
      return `<section class="hx-dock hx-surface"><p class="hx-bot-wait"><span class="hx-wait-dot" aria-hidden="true"></span>${escape(person.name)} is considering the island.</p></section>`;
    if (!view.handRevealed)
      return `<section class="hx-dock hx-surface hx-privacy" data-testid="privacy-overlay"><div><p class="hx-eyebrow">Pass the device</p><h2>${escape(person.name)}, your turn.</h2><p>Your hand stays private until you are ready.</p></div>${button('Reveal my hand', 'reveal-hand', 'class="hx-button hx-primary"')}</section>`;
    return `<section class="hx-dock hx-surface" aria-label="Your hand and building controls"><div class="hx-hand" data-testid="player-hand"><p><strong>${person.name === 'You' ? 'Your hand' : `${escape(person.name)}’s hand`}</strong><span>${handSize(person.hand)} resource cards</span></p><ul>${RESOURCES.map((resource) => `<li>${resourceIcon(resource)}<span>${names[resource]}</span><b>${person.hand[resource]}</b></li>`).join('')}</ul></div>${buildBar(game, person)}${
      person.devCards.length
        ? `<details class="hx-development" data-detail="cards" ${openDetails.has('cards') ? 'open' : ''}><summary>Development cards <span>${person.devCards.length}</span></summary><div class="hx-card-hand">${person.devCards
            .map((card) =>
              actionButton(
                view.legal.find((action) => action.type === 'playDev' && action.card === card.id),
                escape(DEV_CARD_NAMES[card.kind]),
                `card-${card.id}`,
                card.kind === 'victoryPoint'
                  ? 'This point is kept private until victory.'
                  : card.boughtTurn >= game.turn
                    ? 'This card becomes playable on a later turn.'
                    : 'Play when this card is available during your turn.',
              ),
            )
            .join('')}</div></details>`
        : ''
    }</section>`;
  }

  function tradePanel(game: GameState): string {
    const person = game.players[view.actor];
    if (!person || person.kind !== 'human' || !view.handRevealed)
      return '<p>Trading controls appear when the current trader reveals their hand.</p>';
    const draft = game.tradeDrafts[person.id] ?? emptyTrade();
    const ratio = tradeRatio(game, person.id, bankGive);
    const bankAction = view.legal.find(
      (action) =>
        action.type === 'bankTrade' && action.give === bankGive && action.receive === bankReceive,
    );
    const offer = game.tradeOffer;
    const offerMarkup = offer
      ? `<div class="hx-offer"><h3>${escape(game.players[offer.proposer]?.name ?? 'A trader')}’s offer</h3><p>Gives ${escape(basket(offer.give))}<br>Receives ${escape(basket(offer.want))}</p><div class="hx-inline-actions">${view.legal
          .filter((action) => action.type === 'respondTrade' || action.type === 'cancelTrade')
          .map((action) =>
            action.type === 'respondTrade'
              ? actionButton(
                  action,
                  action.response === 'accept'
                    ? 'Accept offer'
                    : action.response === 'decline'
                      ? 'Decline'
                      : 'Send counteroffer',
                  `offer-${action.response}`,
                )
              : actionButton(action, 'Close offer', 'close-offer'),
          )
          .join('')}</div>${Object.entries(offer.counters)
          .map(
            ([id, counter]) =>
              `<div class="hx-counter"><strong>${escape(game.players[Number(id)]?.name ?? 'Trader')} counters</strong><p>Gives ${escape(basket(counter.give))}; wants ${escape(basket(counter.want))}.</p><div class="hx-inline-actions">${actionButton(
                view.legal.find(
                  (action) => action.type === 'acceptCounter' && action.opponent === Number(id),
                ),
                'Accept counter',
                `accept-counter-${id}`,
              )}${actionButton(
                view.legal.find(
                  (action) => action.type === 'declineCounter' && action.opponent === Number(id),
                ),
                'Decline counter',
                `decline-counter-${id}`,
              )}</div></div>`,
          )
          .join('')}</div>`
      : '';
    return `<div data-testid="trade-panel">${offerMarkup}<details data-detail="bank" ${openDetails.has('bank') ? 'open' : ''}><summary>Bank & harbours</summary><p class="hx-muted">Your harbour access sets the best exchange rate.</p><div class="hx-bank-fields"><label>Give<select data-bank="give" data-focus="bank-give">${RESOURCES.map((resource) => `<option value="${resource}"${selected(bankGive, resource)}>${names[resource]} · ${tradeRatio(game, person.id, resource)}:1</option>`).join('')}</select></label><label>Receive<select data-bank="receive" data-focus="bank-receive">${RESOURCES.map((resource) => `<option value="${resource}"${selected(bankReceive, resource)}>${names[resource]} (${game.bank[resource]} in bank)</option>`).join('')}</select></label></div>${actionButton(bankAction, `Trade ${ratio} ${names[bankGive].toLowerCase()} for 1 ${names[bankReceive].toLowerCase()}`, 'bank-trade', bankGive === bankReceive ? 'Choose two different resources.' : !bankAction ? 'You need enough resources, stock in the bank, and an open action phase.' : '')}</details><details data-detail="player-trade" ${openDetails.has('player-trade') ? 'open' : ''}><summary>${offer && offer.proposer !== person.id ? 'Your counteroffer' : 'Trade with a player'}</summary><label>Trade with<select data-trade-target data-focus="trade-target" ${!view.legal.some((action) => action.type === 'targetTrade') ? 'disabled' : ''}><option value="all"${selected(draft.target, null)}>All other players</option>${game.players
      .filter((player) => player.id !== person.id)
      .map(
        (player) =>
          `<option value="${player.id}"${selected(draft.target, player.id)}>${escape(player.name)}</option>`,
      )
      .join(
        '',
      )}</select></label><div class="hx-trade-grid"><span></span><strong>You give</strong><strong>You want</strong>${RESOURCES.map(
      (resource) =>
        `<span class="hx-trade-resource">${resourceIcon(resource)}${names[resource]}</span>${(
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
                '<span aria-hidden="true">−</span><span class="hx-sr-only">Remove one ' +
                  resource +
                  ' from ' +
                  side +
                  '</span>',
                `trade-${side}-${resource}-minus`,
              )}<output aria-label="${side} ${resource}">${draft[side][resource]}</output>${actionButton(
                view.legal.find(
                  (action) =>
                    action.type === 'editTrade' &&
                    action.side === side &&
                    action.resource === resource &&
                    action.delta === 1,
                ),
                '<span aria-hidden="true">+</span><span class="hx-sr-only">Add one ' +
                  resource +
                  ' to ' +
                  side +
                  '</span>',
                `trade-${side}-${resource}-plus`,
              )}</div>`,
          )
          .join('')}`,
    ).join('')}</div>${
      !offer
        ? actionButton(
            view.legal.find((action) => action.type === 'proposeTrade'),
            'Propose trade',
            'propose-trade',
            'Offer and request at least one resource, without the same resource on both sides.',
          )
        : ''
    }</details></div>`;
  }

  function logPanel(game: GameState): string {
    const entries = game.log
      .filter((entry) => filter === 'all' || entry.category === filter)
      .slice(-100)
      .reverse();
    return `<div data-testid="turn-log"><label>Show<select data-log-filter data-focus="log-filter">${['all', 'build', 'trade', 'roll', 'card', 'turn'].map((value) => `<option value="${value}"${selected(filter, value)}>${value === 'all' ? 'All activity' : value[0]?.toUpperCase()}${value === 'all' ? '' : value.slice(1)}</option>`).join('')}</select></label><div class="hx-replay"><label for="hx-replay-range">Replay · ${view.replayIndex === null ? 'Live game' : `Action ${view.replayIndex}`}</label><input id="hx-replay-range" data-testid="replay-slider" data-replay-range data-focus="replay-range" type="range" min="0" max="${replayMaximum}" value="${view.replayIndex ?? replayMaximum}"><div class="hx-inline-actions">${button('Return to live', 'live-replay', '', view.replayIndex === null)}${button('Export replay', 'export')}${button('Import replay', 'import')}</div></div><ol class="hx-log">${entries.length ? entries.map((entry) => `<li><button type="button" data-log-index="${entry.index + 1}" data-highlight="${escape(entry.location ?? '')}" data-focus="log-${entry.index}"><span>Turn ${entry.turn || 'setup'}</span>${escape(entry.text)}</button></li>`).join('') : '<li class="hx-muted">Your story begins with the first village.</li>'}</ol></div>`;
  }

  function sidePanel(game: GameState): string {
    return `<aside class="hx-sidebar"><div class="hx-panel-tabs">${button('Trade', 'toggle-trade', `aria-expanded="${panel === 'trade'}" aria-controls="hx-side-content"`)}${button('Log & replay', 'toggle-log', `aria-expanded="${panel === 'log'}" aria-controls="hx-side-content"`)}</div>${panel ? `<section class="hx-side-content hx-surface" id="hx-side-content" aria-label="${panel === 'trade' ? 'Trading' : 'Turn log and replay'}" data-scroll="side"><div class="hx-panel-heading"><h2>${panel === 'trade' ? 'At the market' : 'The story so far'}</h2>${button('Close', 'close-panel')}</div>${panel === 'trade' ? tradePanel(game) : logPanel(game)}</section>` : ''}</aside>`;
  }

  function setupDialog(): string {
    return `<div class="hx-modal-backdrop"><section class="hx-modal hx-setup" role="dialog" aria-modal="true" aria-labelledby="hx-setup-title" data-testid="setup-dialog"><p class="hx-eyebrow">Traders of the Long Bay</p><h1 id="hx-setup-title">Welcome to<br><em>Hexhaven.</em></h1><p class="hx-intro">Build routes, trade resources, and make a home on the bay. The first trader to 10 victory points wins.</p><form data-setup-form><div class="hx-form-grid"><label>Island layout<select name="layout" data-focus="setup-layout"><option value="beginner"${selected(setup.layout, 'beginner')}>Beginner island</option><option value="random"${selected(setup.layout, 'random')}>Seeded random island</option></select></label><label>Seed<input name="seed" data-focus="setup-seed" type="number" step="1" required value="${setup.seed}"></label><label>Players<select name="playerCount" data-focus="setup-players">${[2, 3, 4].map((count) => `<option${selected(setup.playerCount, count)}>${count}</option>`).join('')}</select></label><label>Bot opponents<select name="botCount" data-focus="setup-bots">${Array.from({ length: setup.playerCount }, (_, count) => `<option value="${count}"${selected(setup.botCount, count)}>${count === 0 ? 'None · pass and play' : count}</option>`).join('')}</select></label><label class="hx-form-wide">Bot difficulty<select name="difficulty" data-focus="setup-difficulty">${['easy', 'normal', 'hard'].map((difficulty) => `<option value="${difficulty}"${selected(setup.difficulty, difficulty)}>${difficulty[0]?.toUpperCase()}${difficulty.slice(1)}</option>`).join('')}</select></label></div><button class="hx-button hx-primary hx-start" type="submit" data-focus="start-game">Start game</button></form><div class="hx-menu-actions">${view.canResume ? button('Resume saved game', 'resume') : ''}${button('Import replay', 'import')}${state ? button('Return to game', 'close-menu') : '<a class="hx-button" href="/games/">Back to Games</a>'}</div><p class="hx-fine">Saves stay on this device. Sound starts muted.</p>${(!state || notice) && (notice || view.message) ? `<p class="hx-form-message">${escape(notice || view.message)}</p>` : ''}</section></div>`;
  }

  function settingsDialog(): string {
    return `<div class="hx-modal-backdrop"><section class="hx-modal hx-settings" role="dialog" aria-modal="true" aria-labelledby="hx-settings-title"><div class="hx-panel-heading"><h2 id="hx-settings-title">At your table</h2>${button('Close', 'close-settings')}</div><label>Animation speed<select data-setting="animationSpeed" data-focus="animation-speed">${['slow', 'normal', 'fast'].map((speed) => `<option value="${speed}"${selected(view.settings.animationSpeed, speed)}>${speed[0]?.toUpperCase()}${speed.slice(1)}</option>`).join('')}</select></label><label class="hx-check"><input type="checkbox" data-setting="sound" data-focus="sound-setting"${checked(view.settings.sound)}><span>Soft game sounds<small>Dice, building, trades and the bandit.</small></span></label><label class="hx-check"><input type="checkbox" data-setting="colorBlind" data-focus="colorblind-setting"${checked(view.settings.colorBlind)}><span>Colour-blind patterns<small>Extra texture and symbols distinguish players and resources.</small></span></label><div class="hx-keyboard-help"><h3>Make yourself comfortable</h3><p>Drag to orbit. Scroll or pinch to zoom. Tab moves between controls. With the board focused, Tab and Shift + Tab cycle legal spots, Enter confirms, and Escape cancels the selection and returns to the controls.</p><p>Press 1 to select a road, 2 for a village, 3 for a town, 4 to buy a development card, and R to roll. Each shortcut works when that action is available.</p><p>Reduced motion follows your device preference.</p></div><p class="hx-fine">${escape(view.saveStatus)}</p></section></div>`;
  }

  function winDialog(game: GameState): string {
    if (game.phase.type !== 'gameOver') return '';
    return `<div class="hx-modal-backdrop"><section class="hx-modal hx-win" role="dialog" aria-modal="true" aria-labelledby="hx-win-title"><p class="hx-eyebrow">A new chapter for the bay</p><h2 id="hx-win-title">${escape(game.players[game.phase.winner]?.name ?? 'A trader')} wins Hexhaven.</h2><p>Every route, village and trade brought you here. The final scores are revealed.</p><div class="hx-score-table"><table><thead><tr><th>Trader</th><th>Buildings</th><th>Route</th><th>Guards</th><th>Cards</th><th>Total</th></tr></thead><tbody>${game.players
      .map((player) => {
        const score = scoreBreakdown(game, player.id);
        return `<tr><th>${escape(player.name)}</th><td>${score.buildings}</td><td>${score.longestRoute}</td><td>${score.largestArmy}</td><td>${score.victoryCards}</td><td><strong>${score.total}</strong></td></tr>`;
      })
      .join(
        '',
      )}</tbody></table></div><div class="hx-inline-actions">${button('Play again', 'new-game', 'class="hx-button hx-primary"')}${button('Review the island', 'close-win')}${button('Export replay', 'export')}</div></section></div>`;
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
    content.innerHTML = `<header class="hx-masthead"><a class="hx-games-link" href="/games/">Games</a><a class="hx-brand" href="#" data-command="new-game"><strong>Hexhaven</strong><span>Traders of the Long Bay</span></a><nav aria-label="Game menu">${button('New game', 'new-game')}${button('Settings', 'settings')}</nav></header>${state ? playerStrip(state) + turnPanel(state) + sidePanel(state) + hand(state) : ''}${!state || menuOpen ? setupDialog() : settingsOpen ? settingsDialog() : state.phase.type === 'gameOver' && !winDismissed && view.replayIndex === null ? winDialog(state) : ''}`;
    statusMessage.textContent = notice || view.message;
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
    notice = '';
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
      notice = '';
      replayMaximum = 0;
      callbacks.importReplay(text);
    } catch (error) {
      notice = error instanceof Error ? error.message : 'That replay could not be read.';
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
