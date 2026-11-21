/**
 * Table loading. One place where a file becomes typed game data.
 *
 * Add one loader per table. Validation failures throw with the file name and
 * the zod issue list, which the boot guard then shows instead of a black screen.
 */
import rawBalance from './balance.json';
import { BalanceSchema, type BalanceTable } from './schema';

export function loadBalance(): BalanceTable {
  const parsed = BalanceSchema.safeParse(rawBalance);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`src/data/balance.json is invalid — ${issues}`);
  }
  return parsed.data;
}
