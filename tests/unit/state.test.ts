import { describe, expect, it } from 'vitest';
import { advance, applyClick, initialState, toSnapshot, type Balance } from '../../src/systems/state';

const balance: Balance = { startValue: 5, gainPerClick: 2, driftPerSecond: 0.5 };

describe('state', () => {
  it('starts from the balance table, not from hardcoded numbers', () => {
    expect(initialState(balance).value).toBe(balance.startValue);
  });

  it('adds the table gain per click', () => {
    const after = applyClick(initialState(balance), balance);
    expect(after.value).toBe(balance.startValue + balance.gainPerClick);
    expect(after.clicks).toBe(1);
  });

  it('never mutates the state it was given', () => {
    const before = initialState(balance);
    const frozen = Object.freeze({ ...before });
    expect(() => applyClick(frozen, balance)).not.toThrow();
    expect(before.clicks).toBe(0);
  });

  it('advances value and time by the given delta', () => {
    const after = advance(initialState(balance), balance, 2);
    expect(after.value).toBeCloseTo(balance.startValue + balance.driftPerSecond * 2);
    expect(after.seconds).toBeCloseTo(2);
  });

  it('ignores a zero, negative or non-finite delta', () => {
    const state = initialState(balance);
    expect(advance(state, balance, 0)).toBe(state);
    expect(advance(state, balance, -1)).toBe(state);
    expect(advance(state, balance, Number.NaN)).toBe(state);
  });

  it('projects a snapshot with only saved fields', () => {
    expect(Object.keys(toSnapshot(initialState(balance))).sort()).toEqual(['clicks', 'seconds', 'value']);
  });
});
