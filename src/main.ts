/**
 * SKELETON SLICE — the working seam every later mechanic is added to.
 *
 * Order matters and is the contract of this file:
 *   boot guard -> renderer probe -> load tables -> restore save -> loop
 *     -> input -> systems -> view -> autosave
 *
 * To add a mechanic: add a pure rule in `src/systems/`, a table in `src/data/`,
 * one input binding, one draw call here. Do not rewrite the boot path.
 */
import { loadBalance } from './data/load';
import { markBooted, markStarted, showFatal } from './fatal';
import { detectRenderer, rendererHelp } from './platform/webgl';
import { createSaveStore } from './save';
import { advance, applyClick, initialState, type GameState } from './systems/state';
import { createCanvasView } from './view/canvas-view';

const AUTOSAVE_SECONDS = 5;

function boot(): void {
  // Proves the module ran, before anything can fail silently.
  markStarted();

  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) {
    showFatal('The game canvas is missing.', 'index.html must contain <canvas id="game">.');
    return;
  }

  // Probe before touching the real canvas: a missing renderer is reported, not silent.
  const renderer = detectRenderer();
  if (renderer === 'none') {
    showFatal('Cannot start: no renderer.', rendererHelp(renderer));
    return;
  }

  // Tables are validated once, here. A typo fails the boot, not the frame loop.
  let balance;
  try {
    balance = loadBalance();
  } catch (error) {
    showFatal('Cannot start: a data table is invalid.', error instanceof Error ? error.message : String(error));
    return;
  }

  let view;
  try {
    view = createCanvasView(canvas);
  } catch (error) {
    showFatal('Cannot start: the view failed to initialise.', error instanceof Error ? error.message : String(error));
    return;
  }
  view.resize();
  window.addEventListener('resize', () => view.resize());

  const store = createSaveStore(window.localStorage);
  let state: GameState = store.read() ?? initialState(balance);
  let savedAt: string | null = null;
  let sinceSave = 0;
  let firstFrame = true;

  const save = (): void => {
    store.write(state);
    savedAt = new Date().toLocaleTimeString();
  };

  canvas.addEventListener('pointerdown', () => {
    state = applyClick(state, balance);
  });

  // Save on the way out as well as on the timer: a tab can close between ticks.
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });

  let previous = performance.now();
  const frame = (now: number): void => {
    const dt = (now - previous) / 1000;
    previous = now;

    state = advance(state, balance, dt);
    sinceSave += dt;
    if (sinceSave >= AUTOSAVE_SECONDS) {
      sinceSave = 0;
      save();
    }

    view.draw({ state, renderer, savedAt });

    if (firstFrame) {
      firstFrame = false;
      markBooted();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
