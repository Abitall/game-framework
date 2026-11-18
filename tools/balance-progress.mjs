import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir =
  process.argv[2] ??
  "C:\\Users\\Chirv\\AppData\\Local\\Temp\\opencode\\numtris-balance";

let files = [];
try {
  files = readdirSync(dir).filter((name) => name.endsWith(".checkpoint.json"));
} catch {
  console.log(`No checkpoint directory: ${dir}`);
  process.exit(0);
}

if (files.length === 0) {
  console.log(`No checkpoints yet in ${dir}`);
  process.exit(0);
}

const rows = [];
let doneGames = 0;
let totalGames = 0;
const now = Date.now();

for (const file of files.sort()) {
  const checkpoint = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const total = Math.max(1, checkpoint.job.games);
  const done = Math.min(total, checkpoint.nextGame);
  const percent = (done / total) * 100;
  const started = Date.parse(checkpoint.startedAt);
  const elapsedMin = Number.isFinite(started)
    ? Math.max(0.01, (now - started) / 60_000)
    : 0;
  const etaMin =
    percent > 0 && percent < 100
      ? (elapsedMin * (100 - percent)) / percent
      : percent >= 100
        ? 0
        : null;
  rows.push({
    id: checkpoint.job.id,
    done,
    total,
    percent,
    etaMin,
    complete: checkpoint.complete === true,
  });
  doneGames += done;
  totalGames += total;
}

rows.sort((a, b) => a.percent - b.percent);
for (const row of rows) {
  const eta =
    row.etaMin === null
      ? "—"
      : row.etaMin <= 0
        ? "готово"
        : `~${Math.ceil(row.etaMin)} мин`;
  console.log(
    `${row.id.padEnd(28)} ${row.percent.toFixed(1).padStart(6)}%  ${String(row.done).padStart(5)}/${row.total}  ${eta}`,
  );
}
const overall = totalGames > 0 ? (doneGames / totalGames) * 100 : 0;
console.log(
  `\nOverall: ${overall.toFixed(1)}%  (${doneGames}/${totalGames} games)`,
);
