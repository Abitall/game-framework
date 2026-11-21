/**
 * Game state and the rules that change it.
 *
 * Engine-agnostic by rule: no DOM, no Phaser, no canvas. Everything here is a
 * pure function of (state, input, time), so it can be unit-tested in Node and
 * replayed headlessly. Views and input adapters live outside this folder.
 */

/** Tunable numbers. Loaded from `src/data/balance.json`, never hardcoded here. */
export interface Balance {
  readonly startValue: number;
  readonly gainPerClick: number;
  readonly driftPerSecond: number;
}

export interface GameState {
  readonly value: number;
  readonly clicks: number;
  readonly seconds: number;
}

export function initialState(balance: Balance): GameState {
  return { value: balance.startValue, clicks: 0, seconds: 0 };
}

/** One player action. Returns new state; never mutates the input. */
export function applyClick(state: GameState, balance: Balance): GameState {
  return {
    ...state,
    value: state.value + balance.gainPerClick,
    clicks: state.clicks + 1,
  };
}

/** Advance time. `dt` is seconds since the previous tick. */
export function advance(state: GameState, balance: Balance, dt: number): GameState {
  if (!Number.isFinite(dt) || dt <= 0) return state;
  return { ...state, value: state.value + balance.driftPerSecond * dt, seconds: state.seconds + dt };
}

/** Serialisable projection: what a save file needs, without view-only fields. */
export function toSnapshot(state: GameState): GameState {
  return { value: state.value, clicks: state.clicks, seconds: state.seconds };
}
