/**
 * Canvas view. The only file that knows how state looks on screen.
 *
 * Swap this folder to change renderer (Phaser, WebGL, DOM) without touching
 * `src/systems/`: the view receives a snapshot and draws it.
 */
import type { GameState } from '../systems/state';
import type { RendererKind } from '../platform/webgl';

export interface ViewModel {
  readonly state: GameState;
  readonly renderer: RendererKind;
  readonly savedAt: string | null;
}

export interface CanvasView {
  resize(): void;
  draw(model: ViewModel): void;
  width(): number;
  height(): number;
}

const UNIT = 48;

export function createCanvasView(canvas: HTMLCanvasElement): CanvasView {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D context unavailable on #game');
  const ctx: CanvasRenderingContext2D = context;

  const resize = (): void => {
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
  };

  return {
    resize,
    width: (): number => canvas.clientWidth,
    height: (): number => canvas.clientHeight,

    draw(model: ViewModel): void {
      const dpr = devicePixelRatio;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#0b0b0f';
      ctx.fillRect(0, 0, w, h);

      // The play field: a bar that grows with state.value, so one number is visible.
      const barWidth = Math.min(w - 48 * dpr, 24 * dpr + model.state.value * 4 * dpr);
      ctx.fillStyle = '#6ee7b7';
      ctx.fillRect(24 * dpr, h / 2 - (UNIT / 2) * dpr, Math.max(24 * dpr, barWidth), UNIT * dpr);

      ctx.fillStyle = '#8b93a7';
      ctx.font = `${14 * dpr}px system-ui, sans-serif`;
      const line = [
        `${model.renderer}`,
        `value: ${model.state.value.toFixed(1)}`,
        `clicks: ${model.state.clicks}`,
        `time: ${model.state.seconds.toFixed(0)}s`,
        model.savedAt ? `saved: ${model.savedAt}` : 'not saved yet',
        'click to add',
      ].join(' · ');
      ctx.fillText(line, 24 * dpr, 32 * dpr);
    },
  };
}
