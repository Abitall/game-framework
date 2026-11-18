import type Phaser from "phaser";

/**
 * Dev-only UI editor overlay.
 *
 * Lets you pick any top-level display object in the running scene, move it with
 * the mouse or arrow keys, adjust scale/alpha/depth, and export the layout as
 * JSON. Edits persist in localStorage per scene, so a reload keeps them.
 *
 * Mounted only when DEVELOPER_TOOLS is true. The panel is plain DOM, so it never
 * interferes with the Phaser canvas or the camera transform.
 */

type Transformable = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  depth: number;
  visible: boolean;
};

export interface LayoutEntry {
  key: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  depth: number;
  visible: boolean;
}

interface Editable {
  key: string;
  object: Transformable;
  label: string;
}

const PANEL_ID = "gf-ui-editor";
const STORAGE_PREFIX = "ui-editor:";

function isTransformable(object: Phaser.GameObjects.GameObject): object is Transformable {
  const candidate = object as Partial<Transformable>;
  return (
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.scaleX === "number" &&
    typeof candidate.alpha === "number"
  );
}

function isTopLevel(object: Phaser.GameObjects.GameObject): boolean {
  const parent = (object as { parentContainer?: unknown }).parentContainer;
  return parent === null || parent === undefined;
}

function labelOf(object: Transformable): string {
  const text = (object as { text?: unknown }).text;
  if (typeof text === "string" && text.trim()) {
    return text.trim().slice(0, 28);
  }
  return object.type;
}

export function collect(scene: Phaser.Scene): Editable[] {
  const seen = new Map<string, number>();
  const result: Editable[] = [];

  for (const object of scene.children.list) {
    if (!isTransformable(object) || !isTopLevel(object)) continue;
    const base = object.name && object.name.length > 0 ? object.name : object.type;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    const key = count === 1 ? base : `${base}#${count}`;
    result.push({ key, object, label: `${key}  ·  ${labelOf(object)}` });
  }

  return result;
}

function readStored(sceneKey: string): LayoutEntry[] {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${sceneKey}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LayoutEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStored(sceneKey: string, entries: LayoutEntry[]): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${sceneKey}`, JSON.stringify(entries));
  } catch {
    // Storage can be disabled; the editor still works for the session.
  }
}

export function snapshot(editable: Editable[]): LayoutEntry[] {
  return editable.map(({ key, object }) => ({
    key,
    x: object.x,
    y: object.y,
    scaleX: object.scaleX,
    scaleY: object.scaleY,
    alpha: object.alpha,
    depth: object.depth,
    visible: object.visible,
  }));
}

export function applyLayout(editable: Editable[], layout: LayoutEntry[]): void {
  const byKey = new Map(editable.map((item) => [item.key, item.object]));
  for (const entry of layout) {
    const object = byKey.get(entry.key);
    if (!object) continue;
    object.x = entry.x;
    object.y = entry.y;
    object.scaleX = entry.scaleX;
    object.scaleY = entry.scaleY;
    object.alpha = entry.alpha;
    object.depth = entry.depth;
    object.visible = entry.visible;
  }
}

export function mountUiEditor(scene: Phaser.Scene): () => void {
  const sceneKey = scene.scene.key;
  let editable: Editable[] = [];
  let selected: Editable | null = null;
  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position:fixed",
    "right:10px",
    "top:10px",
    "z-index:99999",
    "width:260px",
    "max-height:92vh",
    "overflow:auto",
    "background:#0f1620ee",
    "color:#dbe4ee",
    "border:1px solid #2b3a4a",
    "border-radius:8px",
    "padding:10px",
    "font:12px/1.45 ui-monospace,Consolas,monospace",
    "box-shadow:0 8px 24px #0008",
  ].join(";");

  const header = document.createElement("div");
  header.textContent = `UI editor · ${sceneKey}`;
  header.style.cssText = "font-weight:700;margin-bottom:6px;color:#8fd0ff";

  const hint = document.createElement("div");
  hint.textContent = "click to select · drag to move · arrows nudge · F2 hide";
  hint.style.cssText = "color:#7d8b9a;margin-bottom:8px";

  const select = document.createElement("select");
  select.style.cssText = "width:100%;margin-bottom:8px;background:#0b1118;color:#dbe4ee;border:1px solid #2b3a4a;border-radius:4px;padding:3px";

  const fields = document.createElement("div");
  fields.style.cssText = "display:grid;grid-template-columns:52px 1fr 52px 1fr;gap:4px 6px;align-items:center;margin-bottom:8px";

  const inputs: Record<string, HTMLInputElement> = {};
  for (const field of ["x", "y", "scaleX", "scaleY", "alpha", "depth"] as const) {
    const label = document.createElement("span");
    label.textContent = field;
    const input = document.createElement("input");
    input.type = "number";
    input.step = field === "alpha" ? "0.05" : field.startsWith("scale") ? "0.05" : "1";
    input.style.cssText = "width:100%;background:#0b1118;color:#dbe4ee;border:1px solid #2b3a4a;border-radius:4px;padding:2px 4px";
    inputs[field] = input;
    fields.append(label, input);
  }

  const buttons = document.createElement("div");
  buttons.style.cssText = "display:flex;flex-wrap:wrap;gap:6px";

  const makeButton = (text: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.cssText = "background:#1b2836;color:#dbe4ee;border:1px solid #2b3a4a;border-radius:4px;padding:4px 8px;cursor:pointer";
    button.addEventListener("click", onClick);
    return button;
  };

  const status = document.createElement("div");
  status.style.cssText = "color:#7d8b9a;margin-top:8px;min-height:16px";

  const refresh = (): void => {
    editable = collect(scene);
    const previous = selected?.key ?? "";

    select.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = `— objects: ${editable.length} —`;
    select.append(placeholder);

    for (const item of editable) {
      const option = document.createElement("option");
      option.value = item.key;
      option.textContent = item.label;
      select.append(option);
    }

    const restored = editable.find((item) => item.key === previous);
    selected = restored ?? null;
    select.value = selected?.key ?? "";
    fillInputs();
  };

  const fillInputs = (): void => {
    if (!selected) {
      for (const input of Object.values(inputs)) input.value = "";
      return;
    }
    const object = selected.object;
    inputs.x!.value = String(Math.round(object.x));
    inputs.y!.value = String(Math.round(object.y));
    inputs.scaleX!.value = String(Number(object.scaleX.toFixed(3)));
    inputs.scaleY!.value = String(Number(object.scaleY.toFixed(3)));
    inputs.alpha!.value = String(Number(object.alpha.toFixed(3)));
    inputs.depth!.value = String(Math.round(object.depth));
  };

  const persist = (): void => {
    if (!editable.length) return;
    writeStored(sceneKey, snapshot(editable));
  };

  const applyInputs = (): void => {
    if (!selected) return;
    const object = selected.object;
    const read = (name: string, fallback: number): number => {
      const value = Number(inputs[name]?.value);
      return Number.isFinite(value) ? value : fallback;
    };
    object.x = read("x", object.x);
    object.y = read("y", object.y);
    object.scaleX = read("scaleX", object.scaleX);
    object.scaleY = read("scaleY", object.scaleY);
    object.alpha = read("alpha", object.alpha);
    object.depth = read("depth", object.depth);
    persist();
  };

  for (const input of Object.values(inputs)) {
    input.addEventListener("input", applyInputs);
  }

  select.addEventListener("change", () => {
    selected = editable.find((item) => item.key === select.value) ?? null;
    fillInputs();
  });

  const exportLayout = (): void => {
    const data = { scene: sceneKey, savedAt: new Date().toISOString(), objects: snapshot(editable) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sceneKey}.ui.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    status.textContent = `exported ${editable.length} objects`;
  };

  const copyLayout = (): void => {
    const data = { scene: sceneKey, objects: snapshot(editable) };
    const text = JSON.stringify(data, null, 2);
    void navigator.clipboard?.writeText(text);
    status.textContent = "copied to clipboard";
  };

  const resetLayout = (): void => {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${sceneKey}`);
    status.textContent = "stored layout cleared (reload to see defaults)";
  };

  buttons.append(
    makeButton("Export JSON", exportLayout),
    makeButton("Copy", copyLayout),
    makeButton("Reset", resetLayout),
  );

  panel.append(header, hint, select, fields, buttons, status);
  document.body.append(panel);

  // Pointer: select and drag.
  const onPointerDown = (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
  ): void => {
    const hit = [...currentlyOver].reverse().find((object) => isTransformable(object) && isTopLevel(object));
    if (!hit) {
      selected = null;
      select.value = "";
      fillInputs();
      return;
    }
    selected = editable.find((item) => item.object === hit) ?? null;
    if (!selected) {
      refresh();
      selected = editable.find((item) => item.object === hit) ?? null;
    }
    select.value = selected?.key ?? "";
    fillInputs();
    if (selected) {
      dragging = true;
      dragOffsetX = pointer.worldX - selected.object.x;
      dragOffsetY = pointer.worldY - selected.object.y;
    }
  };

  const onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (!dragging || !selected || !pointer.isDown) return;
    selected.object.x = Math.round(pointer.worldX - dragOffsetX);
    selected.object.y = Math.round(pointer.worldY - dragOffsetY);
    fillInputs();
  };

  const onPointerUp = (): void => {
    if (!dragging) return;
    dragging = false;
    persist();
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "F2") {
      event.preventDefault();
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      return;
    }
    if (!selected) return;
    const step = event.shiftKey ? 10 : 1;
    const object = selected.object;
    let handled = true;
    if (event.key === "ArrowLeft") object.x -= step;
    else if (event.key === "ArrowRight") object.x += step;
    else if (event.key === "ArrowUp") object.y -= step;
    else if (event.key === "ArrowDown") object.y += step;
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    fillInputs();
    persist();
  };

  scene.input.on("pointerdown", onPointerDown);
  scene.input.on("pointermove", onPointerMove);
  scene.input.on("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);

  // Objects exist only after create() finishes.
  scene.time.delayedCall(0, () => {
    refresh();
    const stored = readStored(sceneKey);
    if (stored.length) {
      applyLayout(editable, stored);
      fillInputs();
      status.textContent = `restored ${stored.length} objects`;
    }
  });

  return () => {
    scene.input.off("pointerdown", onPointerDown);
    scene.input.off("pointermove", onPointerMove);
    scene.input.off("pointerup", onPointerUp);
    window.removeEventListener("keydown", onKeyDown);
    panel.remove();
  };
}
