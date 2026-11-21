/**
 * Boot guard and fatal-error surface.
 *
 * A game that fails to boot must say why. The guard element lives in
 * index.html so it can paint before any module loads; this file only reveals
 * it and hides it once the first frame is on screen.
 */

const GUARD_ID = 'boot-guard';

function guard(): HTMLElement | null {
  return document.getElementById(GUARD_ID);
}

/** Show a readable failure instead of a black screen. */
export function showFatal(message: string, detail?: string): void {
  const el = guard();
  if (!el) {
    // No guard in the HTML: fall back to the console so the reason is not lost.
    console.error(`[fatal] ${message}`, detail ?? '');
    return;
  }
  el.classList.add('failed');
  el.hidden = false;
  const body = detail ? `${message}\n\n${detail}` : message;
  el.textContent = `[fatal] ${body}`;
  console.error(`[fatal] ${message}`, detail ?? '');
}

/** Call at the top of the entry module: proves the script loaded and ran. */
export function markStarted(): void {
  document.documentElement.dataset['bootStarted'] = '1';
}

/** Call after the first rendered frame: cancels the boot watchdog. */
export function markBooted(): void {
  document.documentElement.dataset['booted'] = '1';
  const el = guard();
  if (el) el.hidden = true;
}

/** True when index.html's boot watchdog already reported a stall. */
export function bootFailed(): boolean {
  return guard()?.classList.contains('failed') === true;
}
