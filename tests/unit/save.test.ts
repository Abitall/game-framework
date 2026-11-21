import { describe, expect, it } from 'vitest';
import { createSaveStore, SAVE_VERSION, type StorageLike } from '../../src/save';
import { initialState } from '../../src/systems/state';

function memoryStorage(): StorageLike & { readonly raw: Map<string, string> } {
  const raw = new Map<string, string>();
  return {
    raw,
    getItem: (key) => raw.get(key) ?? null,
    setItem: (key, value) => void raw.set(key, value),
    removeItem: (key) => void raw.delete(key),
  };
}

const balance = { startValue: 0, gainPerClick: 1, driftPerSecond: 0 };
const now = (): Date => new Date('2026-01-01T00:00:00.000Z');

describe('save store', () => {
  it('returns null when nothing was saved', () => {
    expect(createSaveStore(memoryStorage()).read()).toBeNull();
  });

  it('round-trips state', () => {
    const storage = memoryStorage();
    const store = createSaveStore(storage, { now });
    store.write({ value: 12.5, clicks: 3, seconds: 4 });
    expect(store.read()).toEqual({ value: 12.5, clicks: 3, seconds: 4 });
    expect(JSON.parse(storage.raw.get('skeleton.save') ?? '{}')).toMatchObject({
      version: SAVE_VERSION,
      savedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('starts fresh instead of throwing on corrupt JSON', () => {
    const storage = memoryStorage();
    storage.setItem('skeleton.save', '{not json');
    expect(createSaveStore(storage).read()).toBeNull();
  });

  it('starts fresh on an unknown version', () => {
    const storage = memoryStorage();
    storage.setItem('skeleton.save', JSON.stringify({ version: 99, savedAt: '', state: initialState(balance) }));
    expect(createSaveStore(storage).read()).toBeNull();
  });

  it('starts fresh when the saved shape is wrong', () => {
    const storage = memoryStorage();
    storage.setItem('skeleton.save', JSON.stringify({ version: SAVE_VERSION, savedAt: '', state: { value: 'x' } }));
    expect(createSaveStore(storage).read()).toBeNull();
  });

  it('clears the slot', () => {
    const storage = memoryStorage();
    const store = createSaveStore(storage);
    store.write(initialState(balance));
    store.clear();
    expect(store.read()).toBeNull();
  });
});
