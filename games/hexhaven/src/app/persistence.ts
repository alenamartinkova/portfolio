import { isAction } from '../core/actions';
import type { Action } from '../core/actions';
import { replay } from '../core/log';
import type { Difficulty, GameOptions, GameState, PlayerConfig } from '../core/state';

export interface ReplayData {
  readonly version: 1;
  readonly options: GameOptions;
  readonly actions: readonly Action[];
}

const DATABASE = 'hexhaven';
const STORE = 'games';
const CURRENT_GAME = 'current';
let storageQueue: Promise<void> = Promise.resolve();

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function difficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'normal' || value === 'hard';
}

function optionsFrom(input: unknown): GameOptions {
  if (!record(input) || typeof input.seed !== 'number' || !Number.isSafeInteger(input.seed)) {
    throw new Error('The replay must contain an integer seed.');
  }
  if (input.layout !== 'beginner' && input.layout !== 'random') {
    throw new Error('The replay layout must be beginner or random.');
  }
  if (!Array.isArray(input.players) || input.players.length < 2 || input.players.length > 4) {
    throw new Error('The replay must contain two to four players.');
  }
  const players: PlayerConfig[] = Array.from(input.players, (player: unknown, index: number) => {
    if (
      !record(player) ||
      typeof player.name !== 'string' ||
      player.name.trim().length === 0 ||
      (player.kind !== 'human' && player.kind !== 'bot') ||
      (player.difficulty !== undefined && !difficulty(player.difficulty))
    ) {
      throw new Error(`Replay player ${index + 1} has invalid settings.`);
    }
    const base: PlayerConfig = { name: player.name, kind: player.kind };
    return player.difficulty === undefined ? base : { ...base, difficulty: player.difficulty };
  });
  if (
    input.setupOrder !== undefined &&
    input.setupOrder !== 'forward' &&
    input.setupOrder !== 'snake'
  ) {
    throw new Error('The replay setup order must be forward or snake.');
  }
  return {
    seed: input.seed,
    layout: input.layout,
    players,
    // Saves created before setup order was explicit used reverse order in round two.
    setupOrder: input.setupOrder ?? 'snake',
  };
}

/** Validate the envelope and action shapes; replay() separately enforces game rules. */
export function parseReplay(input: unknown): ReplayData {
  let value = input;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      throw new Error('The replay is not valid JSON.');
    }
  }
  if (!record(value) || value.version !== 1) {
    throw new Error('This replay format is unsupported. Expected version 1.');
  }
  const options = optionsFrom(value.options);
  if (!Array.isArray(value.actions)) throw new Error('The replay action list is missing.');
  const actions = Array.from(value.actions, (action: unknown, index: number): Action => {
    if (
      !record(action) ||
      (action.type === 'respondTrade' && typeof action.response !== 'string') ||
      !isAction(action) ||
      action.player < 0 ||
      action.player >= options.players.length
    ) {
      throw new Error(`Replay action ${index + 1} is malformed.`);
    }
    return structuredClone(action);
  });
  return { version: 1, options, actions };
}

function envelope(state: GameState): ReplayData {
  return structuredClone({ version: 1, options: state.options, actions: state.actions });
}

export function exportReplay(state: GameState): string {
  return JSON.stringify(envelope(state), null, 2);
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const pending = storageQueue.then(operation);
  // A failed write must not prevent a later save, load, or clear from running.
  storageQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not provide local game storage.'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Another Hexhaven tab is blocking local storage. Close it and try again.'));
    };
    request.onerror = () =>
      reject(new Error('Local game storage could not open.', { cause: request.error }));
    request.onsuccess = () => {
      const database = request.result;
      if (blocked) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const current = database.transaction(STORE, mode);
      let request: IDBRequest<T> | null = null;
      let operationError: unknown;
      current.oncomplete = () => {
        if (request === null) reject(new Error('The local storage operation did not start.'));
        else resolve(request.result);
      };
      current.onabort = () =>
        reject(
          new Error('The local storage transaction failed.', {
            cause: operationError ?? current.error ?? request?.error,
          }),
        );
      try {
        request = operation(current.objectStore(STORE));
      } catch (error) {
        operationError = error;
        current.abort();
      }
    });
  } finally {
    database.close();
  }
}

/** Saves are snapshotted on call and committed in call order. */
export async function saveGame(state: GameState): Promise<void> {
  const data = envelope(state);
  return serialize(async () => {
    await transaction('readwrite', (store) => store.put(data, CURRENT_GAME));
  });
}

export function loadGame(): Promise<GameState | null> {
  return serialize(async () => {
    const stored = await transaction<unknown>('readonly', (store) => store.get(CURRENT_GAME));
    if (stored === undefined) return null;
    try {
      const data = parseReplay(stored);
      return replay(data.options, data.actions);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The saved data is invalid.';
      throw new Error(`The saved game could not be restored. ${detail}`, { cause: error });
    }
  });
}
