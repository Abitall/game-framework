/**
 * Renderer capability probe.
 *
 * Runs before the engine starts, on a throwaway canvas, so a machine without
 * WebGL gets a readable message instead of a black screen. Never call this on
 * the game canvas: acquiring a WebGL context there would block a 2D context.
 */
export type RendererKind = 'webgl2' | 'webgl' | 'none';

export function detectRenderer(): RendererKind {
  const probe = document.createElement('canvas');
  try {
    if (probe.getContext('webgl2')) return 'webgl2';
    if (probe.getContext('webgl')) return 'webgl';
    return 'none';
  } catch {
    return 'none';
  }
}

/** Human-readable reason, for the fatal panel. */
export function rendererHelp(kind: RendererKind): string {
  if (kind !== 'none') return `Renderer: ${kind}`;
  return [
    'WebGL is not available in this browser.',
    'Try: enable hardware acceleration in the browser settings, update the GPU driver,',
    'or open the game in another browser. A software-only (SwiftShader) context may also work.',
  ].join(' ');
}
