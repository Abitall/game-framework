import { describe, expect, it } from 'vitest';
import { loadBalance } from '../../src/data/load';
import { BalanceSchema } from '../../src/data/schema';

describe('balance table', () => {
  it('loads the shipped file', () => {
    const balance = loadBalance();
    expect(Number.isFinite(balance.startValue)).toBe(true);
    expect(Number.isFinite(balance.gainPerClick)).toBe(true);
  });

  it('rejects a missing field', () => {
    expect(BalanceSchema.safeParse({ startValue: 1, gainPerClick: 1 }).success).toBe(false);
  });

  it('rejects a wrong type', () => {
    expect(BalanceSchema.safeParse({ startValue: '1', gainPerClick: 1, driftPerSecond: 0 }).success).toBe(false);
  });

  it('rejects an unknown key, so a typo cannot be silently ignored', () => {
    expect(BalanceSchema.safeParse({ startValue: 1, gainPerClick: 1, driftPerSecond: 0, drfit: 2 }).success).toBe(
      false,
    );
  });

  it('allows the documented _note field', () => {
    expect(BalanceSchema.safeParse({ _note: 'x', startValue: 1, gainPerClick: 1, driftPerSecond: 0 }).success).toBe(
      true,
    );
  });
});
