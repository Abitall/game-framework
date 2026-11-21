/**
 * Runtime shape of the balance table.
 *
 * The table is a file the owner edits (a spreadsheet export in a real project).
 * A typo there must fail loudly at startup, not produce NaN deep in a system,
 * so the table is validated once on load.
 */
import { z } from 'zod';

export const BalanceSchema = z
  .object({
    // `_note` is the documented escape hatch for a short explanation inside a
    // table file; anything else unknown is a typo and must fail.
    _note: z.string().optional(),
    startValue: z.number(),
    gainPerClick: z.number(),
    driftPerSecond: z.number(),
  })
  .strict();

export type BalanceTable = z.infer<typeof BalanceSchema>;
