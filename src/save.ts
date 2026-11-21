/**
 * Persistence boundary.
 *
 * The store takes an injected storage so it runs in Node tests without a DOM.
 * A missing, corrupt or older save never throws: it returns null and the game
 * starts fresh. A save that cannot be read must not brick the game.
 */
import { z } from 'zod';
import type { GameState } from './systems/state';

export const SAVE_KEY = 'skeleton.save';
export const SAVE_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SavedStateSchema = z.object({
  value: z.number().finite(),
  clicks: z.number().int().nonnegative(),
  seconds: z.number().finite().nonnegative(),
});

const SaveFileSchema = z.object({
  version: z.number().int(),
  savedAt: z.string(),
  state: SavedStateSchema,
});

export interface SaveStore {
  write(state: GameState): void;
  read(): GameState | null;
  clear(): void;
}

export interface SaveStoreOptions {
  readonly key?: string;
  readonly now?: () => Date;
}

export function createSaveStore(storage: StorageLike, options: SaveStoreOptions = {}): SaveStore {
  const key = options.key ?? SAVE_KEY;
  const now = options.now ?? ((): Date => new Date());

  return {
    write(state: GameState): void {
      const file = {
        version: SAVE_VERSION,
        savedAt: now().toISOString(),
        state: { value: state.value, clicks: state.clicks, seconds: state.seconds },
      };
      try {
        storage.setItem(key, JSON.stringify(file));
      } catch (error) {
        // Quota or a disabled storage: keep playing, tell the console.
        console.warn('[save] could not write', error);
      }
    },

    read(): GameState | null {
      const text = storage.getItem(key);
      if (text === null) return null;

      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        console.warn('[save] unreadable JSON, starting fresh');
        return null;
      }

      const parsed = SaveFileSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn('[save] unexpected save shape, starting fresh');
        return null;
      }
      if (parsed.data.version !== SAVE_VERSION) {
        console.warn(`[save] version ${parsed.data.version} is not ${SAVE_VERSION}, starting fresh`);
        return null;
      }
      return parsed.data.state;
    },

    clear(): void {
      storage.removeItem(key);
    },
  };
}
