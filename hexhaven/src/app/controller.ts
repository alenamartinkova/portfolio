import { chooseAction } from '../bots/heuristic';
import type { Action } from '../core/actions';
import { isAction, RuleViolation } from '../core/actions';
import { TERRAIN_RESOURCE } from '../core/board';
import { getActor, legalActions } from '../core/legal';
import { replay } from '../core/log';
import { reduce } from '../core/reducer';
import { createGame, getPlayer, RESOURCES } from '../core/state';
import type { GameOptions, GameState } from '../core/state';
import { localize, logText, resourceName, translateMessage } from '../i18n';
import { createBoardScene } from '../render/scene';
import type { BoardScene, SceneTarget } from '../render/scene';
import { createHUD } from '../ui/hud';
import type { BuildMode, ViewState } from '../ui/hud';
import { readSiteAppearance } from '../ui/siteAppearance';
import { exportReplay, loadGame, parseReplay, saveGame } from './persistence';
import { loadSettings, saveSettings } from './settings';
import type { Settings } from './settings';
import { SoundPlayer } from './sound';

export interface HexhavenDevAPI {
  readonly state: GameState | null;
  dispatch(action: unknown): void;
  legalActions: typeof legalActions;
  loadReplay(input: unknown): void;
}

declare global {
  interface Window {
    __hexhaven?: HexhavenDevAPI;
    __hexhavenMetrics?: () => ReturnType<BoardScene['metrics']> | null;
  }
}

function placement(action: Action): SceneTarget | null {
  switch (action.type) {
    case 'placeVillage':
      return { kind: 'village', id: action.vertex };
    case 'placeRoad':
      return { kind: 'road', id: action.edge };
    case 'buildTown':
      return { kind: 'town', id: action.vertex };
    case 'moveBandit':
      return { kind: 'bandit', id: action.tile };
    default:
      return null;
  }
}

function phaseMode(state: GameState): BuildMode {
  switch (state.phase.type) {
    case 'setupVillage':
      return 'village';
    case 'setupRoad':
    case 'freeRoads':
      return 'road';
    case 'bandit':
      return 'bandit';
    default:
      return null;
  }
}

function speedOf(settings: Settings): number {
  return settings.animationSpeed === 'fast' ? 1.65 : settings.animationSpeed === 'slow' ? 0.7 : 1;
}

/** All application mutation enters the deterministic reducer here. */
export function startApplication(root: HTMLElement): () => void {
  root.replaceChildren();
  const boardHost = document.createElement('div');
  boardHost.className = 'board-host';
  boardHost.dataset.testid = 'board-view';
  boardHost.tabIndex = 0;
  boardHost.setAttribute('role', 'application');
  boardHost.setAttribute(
    'aria-label',
    localize(
      'Hexhaven board. Tab chooses a legal location, Enter confirms, Escape cancels.',
      'Herná doska Hexhaven. Tab vyberie dostupné miesto, Enter potvrdí, Escape zruší výber.',
    ),
  );
  const hudHost = document.createElement('div');
  hudHost.className = 'hud-host';
  root.append(boardHost, hudHost);

  let settings = loadSettings();
  let game: GameState | null = null;
  let storedGame: GameState | null = null;
  let scene: BoardScene | null = null;
  let sceneBoard: GameState['board'] | null = null;
  let mode: BuildMode = null;
  let selected: Action | null = null;
  let thinking = false;
  let botTimer: ReturnType<typeof setTimeout> | null = null;
  let replayTimer: ReturnType<typeof setTimeout> | null = null;
  let replayIndex: number | null = null;
  let replayState: GameState | null = null;
  let message: string | (() => string) = 'Build a home on the Long Bay.';
  let saveStatus = 'Games save on this device.';
  let revealedHuman: number | null = null;
  let disposed = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sound = new SoundPlayer();
  sound.setEnabled(settings.sound);

  const preview = createGame({
    seed: settings.seed,
    layout: settings.layout,
    players: [
      { name: 'You', kind: 'human' },
      { name: 'Mara', kind: 'bot' },
      { name: 'Rook', kind: 'bot' },
      { name: 'Tala', kind: 'bot' },
    ],
  });

  const hud = createHUD(hudHost, {
    action: dispatch,
    mode: arm,
    newGame: begin,
    resume: () => {
      if (storedGame) resume(storedGame);
    },
    settings: applySettings,
    exportReplay: downloadReplay,
    importReplay: importGame,
    highlight: (id) => scene?.highlight(id),
    replayTo: seekReplay,
    confirmSelected: confirm,
    stepSelection: step,
    revealHand: () => {
      if (game) {
        revealedHuman = getActor(game);
        paint();
      }
    },
  });

  function stopBot(): void {
    if (botTimer !== null) clearTimeout(botTimer);
    botTimer = null;
    thinking = false;
  }

  function visibleState(): GameState | null {
    return replayState ?? game;
  }

  function actorLegal(): readonly Action[] {
    if (!game || replayIndex !== null || thinking) return [];
    const actor = getActor(game);
    if (getPlayer(game, actor).kind === 'bot') return [];
    const humans = game.players.filter((p) => p.kind === 'human').length;
    if (humans > 1 && revealedHuman !== actor) return [];
    return legalActions(game, actor);
  }

  function placementActions(): readonly Action[] {
    return actorLegal().filter((action) => placement(action)?.kind === mode);
  }

  function updateScene(state: GameState): void {
    if (sceneBoard !== state.board || scene === null) {
      scene?.dispose();
      boardHost.replaceChildren();
      try {
        scene = createBoardScene(boardHost, state.board);
        sceneBoard = state.board;
      } catch (error: unknown) {
        scene = null;
        sceneBoard = state.board;
        const panel = document.createElement('div');
        panel.className = 'renderer-error';
        const text = document.createElement('p');
        text.textContent = localize(
          'The 3D view could not start. Enable hardware acceleration in your browser and try again. You can still choose locations with the keyboard.',
          '3D zobrazenie sa nespustilo. Zapni hardvérovú akceleráciu prehliadača a skús to znova. Miesta môžeš vyberať aj klávesnicou.',
        );
        const retry = document.createElement('button');
        retry.textContent = localize('Retry 3D view', 'Znova spustiť 3D zobrazenie');
        retry.addEventListener('click', () => {
          updateScene(visibleState() ?? preview);
          paint();
        });
        panel.append(text, retry);
        boardHost.append(panel);
        message =
          error instanceof Error ? `3D view: ${error.message}` : 'The 3D view is unavailable.';
      }
    }
    scene?.setSettings({
      reducedMotion: motion.matches,
      speed: speedOf(settings),
      colorBlind: settings.colorBlind,
    });
    scene?.update(state);
    scene?.setAppearance(readSiteAppearance());
  }

  function paint(): void {
    if (disposed) return;
    const shown = visibleState();
    const actor = shown ? getActor(shown) : 0;
    const humans = shown?.players.filter((p) => p.kind === 'human').length ?? 1;
    const view: ViewState = {
      legal: actorLegal(),
      actor,
      thinking,
      mode,
      selectedAction: selected,
      message: typeof message === 'function' ? message() : translateMessage(message),
      saveStatus: translateMessage(saveStatus),
      settings,
      canResume: storedGame !== null,
      replayIndex,
      handRevealed: humans <= 1 || revealedHuman === actor,
    };
    hud.render(shown, view);
    const targets = placementActions().flatMap((action) => {
      const target = placement(action);
      return target ? [target] : [];
    });
    scene?.setTargets(targets, selectTarget);
    const target = selected ? placement(selected) : null;
    boardHost.dataset.selectedTarget = target?.id ?? '';
    scene?.highlight(target?.id ?? null);
  }

  function selectTarget(target: SceneTarget): void {
    const previousTarget = selected ? placement(selected) : null;
    if (previousTarget?.id === target.id && previousTarget.kind === target.kind) {
      confirm();
      return;
    }
    selected =
      placementActions().find((action) => {
        const candidate = placement(action);
        return candidate?.kind === target.kind && candidate.id === target.id;
      }) ?? null;
    if (selected)
      message = `Location selected. Confirm to ${target.kind === 'bandit' ? 'move the bandit' : `build a ${target.kind}`}.`;
    paint();
  }

  function arm(nextMode: BuildMode): void {
    mode = nextMode;
    selected = null;
    paint();
    if (mode !== null) boardHost.focus({ preventScroll: true });
  }

  function step(direction: -1 | 1): void {
    const actions = placementActions();
    if (actions.length === 0) return;
    const index = selected ? actions.indexOf(selected) : -1;
    const next =
      index < 0
        ? direction > 0
          ? 0
          : actions.length - 1
        : (index + direction + actions.length) % actions.length;
    selected = actions[next] ?? null;
    const target = selected ? placement(selected) : null;
    if (target)
      message = `Location ${next + 1} of ${actions.length}. Press Enter to confirm ${target.kind === 'bandit' ? 'the bandit move' : `a ${target.kind}`}.`;
    paint();
    boardHost.focus({ preventScroll: true });
  }

  function confirm(): void {
    if (selected) dispatch(selected);
  }

  function persist(snapshot: GameState): void {
    saveStatus = 'Saving…';
    void saveGame(snapshot)
      .then(() => {
        if (disposed) return;
        storedGame = snapshot;
        if (game === snapshot) {
          saveStatus = 'Saved on this device';
          paint();
        }
      })
      .catch((error: unknown) => {
        if (disposed) return;
        saveStatus =
          error instanceof Error
            ? `Save failed: ${error.message}. Export a replay to keep your game.`
            : 'Saving is unavailable. Export a replay to keep your game.';
        paint();
      });
  }

  function playFeedback(before: GameState, after: GameState, action: Action): void {
    if (action.type === 'roll')
      sound.play(action.dice[0] + action.dice[1] === 7 ? 'seven' : 'dice');
    else if (placement(action)) sound.play('place');
    else if (
      action.type === 'bankTrade' ||
      (action.type === 'respondTrade' && action.response === 'accept') ||
      action.type === 'acceptCounter'
    )
      sound.play('trade');

    if (action.type !== 'roll') return;
    const diceTotal = action.dice[0] + action.dice[1];
    for (const player of after.players) {
      const previous = getPlayer(before, player.id);
      for (const resource of RESOURCES) {
        const gain = player.hand[resource] - previous.hand[resource];
        if (gain <= 0) continue;
        const producing = after.board.tiles.find(
          (tile) =>
            tile.number === diceTotal &&
            TERRAIN_RESOURCE[tile.terrain] === resource &&
            tile.id !== after.bandit &&
            after.board.vertices.some(
              (vertex) =>
                vertex.hexes.includes(tile.id) && after.buildings[vertex.id]?.owner === player.id,
            ),
        );
        const origin = producing ? scene?.project(producing.id) : null;
        if (!origin) continue;
        const chip = document.createElement('div');
        chip.className = 'resource-flight';
        chip.setAttribute('aria-hidden', 'true');
        chip.textContent = `+${gain} ${resourceName(resource).toLowerCase()}`;
        chip.style.left = `${origin.x}px`;
        chip.style.top = `${origin.y}px`;
        root.append(chip);
        const destination = hudHost
          .querySelector<HTMLElement>(`[data-player-id="${player.id}"]`)
          ?.getBoundingClientRect();
        const dx = destination ? destination.left + destination.width / 2 - origin.x : 0;
        const dy = destination ? destination.top + destination.height / 2 - origin.y : -90;
        const animation = chip.animate(
          [
            { transform: 'translate(-50%, -50%) scale(.9)', opacity: 0 },
            { transform: 'translate(-50%, -90%) scale(1)', opacity: 1, offset: 0.18 },
            {
              transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${Math.min(dy * 0.5, -80)}px))`,
              opacity: 1,
              offset: 0.6,
            },
            {
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.65)`,
              opacity: 0,
            },
          ],
          { duration: motion.matches ? 1 : 1700 / speedOf(settings), easing: 'ease-in-out' },
        );
        animation.onfinish = () => chip.remove();
        animation.oncancel = () => chip.remove();
      }
    }
  }

  function dispatch(input: unknown): void {
    if (!game || replayIndex !== null || disposed) return;
    try {
      if (!isAction(input))
        throw new RuleViolation('That action is malformed. Choose an available control.');
      const before = game;
      const next = reduce(before, input);
      stopBot();
      game = next;
      selected = null;
      mode = phaseMode(next);
      const latest = next.log.at(-1);
      message = latest ? () => logText(next, latest) : 'Choose your next move.';
      if (getActor(next) !== getActor(before)) revealedHuman = null;
      updateScene(next);
      persist(next);
      paint();
      playFeedback(before, next, input);
      if (input.type === 'moveBandit') scene?.focus(input.tile);
      if (getPlayer(before, input.player).kind === 'bot') {
        const target = placement(input);
        if (target) scene?.focus(target.id);
      }
      scheduleBot();
    } catch (error: unknown) {
      message =
        error instanceof Error
          ? error.message
          : 'That move could not be made. Choose an available action.';
      paint();
    }
  }

  function scheduleBot(): void {
    stopBot();
    if (
      !game ||
      replayIndex !== null ||
      game.phase.type === 'gameOver' ||
      document.hidden ||
      disposed
    )
      return;
    const actor = getActor(game);
    if (getPlayer(game, actor).kind !== 'bot') {
      paint();
      return;
    }
    const expected = game;
    thinking = true;
    paint();
    const delay =
      settings.animationSpeed === 'fast' ? 400 : settings.animationSpeed === 'slow' ? 900 : 650;
    botTimer = setTimeout(() => {
      botTimer = null;
      if (game !== expected || disposed || replayIndex !== null) return;
      thinking = false;
      try {
        dispatch(chooseAction(expected, actor));
      } catch (error: unknown) {
        message =
          error instanceof Error ? error.message : 'The computer player could not choose a move.';
        paint();
      }
    }, delay);
  }

  function resume(snapshot: GameState): void {
    stopBot();
    replayIndex = null;
    replayState = null;
    game = snapshot;
    selected = null;
    mode = phaseMode(snapshot);
    revealedHuman = null;
    message =
      snapshot.actions.length === 0
        ? 'Choose a coastal or inland vertex for your first village.'
        : 'Your game has resumed.';
    updateScene(snapshot);
    paint();
    scheduleBot();
  }

  function begin(options: GameOptions): void {
    const snapshot = createGame(options);
    settings = {
      ...settings,
      seed: options.seed,
      layout: options.layout,
      playerCount: options.players.length,
      botCount: options.players.filter((player) => player.kind === 'bot').length,
    };
    saveSettings(settings);
    resume(snapshot);
    revealedHuman = 0;
    paint();
    persist(snapshot);
    void sound.unlock();
  }

  function applySettings(next: Settings): void {
    settings = next;
    const saved = saveSettings(settings);
    sound.setEnabled(settings.sound);
    if (settings.sound) void sound.unlock();
    if (!saved) saveStatus = 'Settings apply for this visit. Browser storage is unavailable.';
    scene?.setSettings({
      reducedMotion: motion.matches,
      speed: speedOf(settings),
      colorBlind: settings.colorBlind,
    });
    paint();
    scheduleBot();
  }

  function downloadReplay(): void {
    if (!game) return;
    const blob = new Blob([exportReplay(game)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hexhaven-${game.options.seed}-turn-${game.turn}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importGame(input: unknown): void {
    try {
      const data = parseReplay(input);
      const snapshot = replay(data.options, data.actions);
      resume(snapshot);
      persist(snapshot);
      message = 'Replay loaded. Continue the game or review the turn log.';
      paint();
    } catch (error: unknown) {
      message =
        error instanceof Error
          ? error.message
          : 'This replay could not be loaded. Choose a Hexhaven replay file.';
      paint();
    }
  }

  function seekReplay(index: number | null): void {
    if (!game) return;
    stopBot();
    if (replayTimer !== null) clearTimeout(replayTimer);
    replayTimer = null;
    selected = null;
    mode = null;
    if (index === null) {
      replayIndex = null;
      replayState = null;
      mode = phaseMode(game);
      updateScene(game);
      paint();
      scheduleBot();
      return;
    }
    replayIndex = Math.max(0, Math.min(game.actions.length, Math.floor(index)));
    // Slider drags coalesce into one replay outside the pointer event.
    replayTimer = setTimeout(() => {
      if (!game || replayIndex === null || disposed) return;
      replayState = replay(game.options, game.actions.slice(0, replayIndex));
      // Replay uses identical topology; keep the existing scene's cached assets.
      replayState = { ...replayState, board: game.board };
      updateScene(replayState);
      const shown = replayState;
      const latest = shown.log.at(-1);
      message = latest ? () => logText(shown, latest) : 'The empty board, before setup.';
      paint();
    }, 60);
  }

  function onKey(event: KeyboardEvent): void {
    const element = event.target;
    if (
      element instanceof HTMLElement &&
      (element.matches('input, select, textarea') || element.isContentEditable)
    )
      return;
    if (event.key === 'Escape') {
      selected = null;
      mode = game ? phaseMode(game) : null;
      message = 'Selection cancelled.';
      paint();
      if (element === boardHost)
        hudHost.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
      return;
    }
    if (element === boardHost && event.key === 'Tab' && placementActions().length > 0) {
      event.preventDefault();
      step(event.shiftKey ? -1 : 1);
      return;
    }
    if (element === boardHost && event.key === 'Enter') {
      event.preventDefault();
      confirm();
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      const roll = actorLegal().find((action) => action.type === 'roll');
      if (roll) {
        event.preventDefault();
        dispatch(roll);
      }
    }
    const shortcuts: Readonly<Record<string, BuildMode>> = {
      '1': 'road',
      '2': 'village',
      '3': 'town',
    };
    const nextMode = shortcuts[event.key];
    if (nextMode && actorLegal().some((action) => placement(action)?.kind === nextMode)) {
      event.preventDefault();
      arm(nextMode);
    }
    if (event.key === '4') {
      const buy = actorLegal().find((action) => action.type === 'buyDev');
      if (buy) {
        event.preventDefault();
        dispatch(buy);
      }
    }
  }

  function onVisibility(): void {
    if (document.hidden) stopBot();
    else scheduleBot();
  }
  function onMotion(): void {
    scene?.setSettings({
      reducedMotion: motion.matches,
      speed: speedOf(settings),
      colorBlind: settings.colorBlind,
    });
  }
  function onAppearance(): void {
    const appearance = readSiteAppearance();
    scene?.setAppearance(appearance);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', appearance.background);
  }
  function onLocale(): void {
    document.title = localize(
      'Hexhaven — Traders of the Long Bay',
      'Hexhaven — Obchodníci z Dlhého zálivu',
    );
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        localize(
          'Build villages, trade resources and chart a route across the Long Bay. A local strategy game for friends and computer rivals.',
          'Stavaj dediny, obchoduj so surovinami a buduj cesty naprieč Dlhým zálivom. Miestna strategická hra s priateľmi aj počítačovými súpermi.',
        ),
      );
    boardHost.setAttribute(
      'aria-label',
      localize(
        'Hexhaven board. Tab chooses a legal location, Enter confirms, Escape cancels.',
        'Herná doska Hexhaven. Tab vyberie dostupné miesto, Enter potvrdí, Escape zruší výber.',
      ),
    );
    scene?.refreshLocale();
    const errorPanel = boardHost.querySelector('.renderer-error');
    const errorText = errorPanel?.querySelector('p');
    const errorRetry = errorPanel?.querySelector('button');
    if (errorText)
      errorText.textContent = localize(
        'The 3D view could not start. Enable hardware acceleration in your browser and try again. You can still choose locations with the keyboard.',
        '3D zobrazenie sa nespustilo. Zapni hardvérovú akceleráciu prehliadača a skús to znova. Miesta môžeš vyberať aj klávesnicou.',
      );
    if (errorRetry)
      errorRetry.textContent = localize('Retry 3D view', 'Znova spustiť 3D zobrazenie');
    paint();
  }
  function onGesture(): void {
    if (settings.sound) void sound.unlock();
  }
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('pointerdown', onGesture);
  motion.addEventListener('change', onMotion);
  const appearanceObserver = new MutationObserver(onAppearance);
  appearanceObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-accent'],
  });
  const localeObserver = new MutationObserver(onLocale);
  localeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  if (import.meta.env.DEV) {
    window.__hexhaven = {
      get state() {
        return game;
      },
      dispatch,
      legalActions,
      loadReplay: importGame,
    };
    window.__hexhavenMetrics = () => scene?.metrics() ?? null;
  }

  updateScene(preview);
  onAppearance();
  onLocale();
  void loadGame()
    .then((snapshot) => {
      if (disposed || game !== null) return;
      storedGame = snapshot;
      if (snapshot) {
        saveStatus = 'Saved on this device';
        resume(snapshot);
      } else {
        saveStatus = 'Your game will save on this device.';
        paint();
      }
    })
    .catch((error: unknown) => {
      if (disposed) return;
      saveStatus =
        error instanceof Error
          ? error.message
          : 'Saved games are unavailable. You can still play and export replays.';
      paint();
    });

  return () => {
    disposed = true;
    stopBot();
    if (replayTimer !== null) clearTimeout(replayTimer);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('pointerdown', onGesture);
    motion.removeEventListener('change', onMotion);
    appearanceObserver.disconnect();
    localeObserver.disconnect();
    scene?.dispose();
    hud.dispose();
    void sound.dispose();
    root.querySelectorAll('.resource-flight').forEach((chip) => chip.remove());
    if (import.meta.env.DEV) {
      delete window.__hexhaven;
      delete window.__hexhavenMetrics;
    }
  };
}
