import { describe, expect, it } from "vitest";
import { applyLayout, collect, snapshot } from "../src/dev/UiEditor";
import type { LayoutEntry } from "../src/dev/UiEditor";

interface FakeObject {
  type: string;
  name?: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  depth: number;
  visible: boolean;
  parentContainer?: unknown;
}

function makeObject(overrides: Partial<FakeObject> = {}): FakeObject {
  return {
    type: "Text",
    name: "",
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    depth: 0,
    visible: true,
    ...overrides,
  };
}

function makeScene(objects: unknown[]) {
  return { children: { list: objects } } as unknown as Parameters<typeof collect>[0];
}

describe("UiEditor.collect", () => {
  it("gives duplicate types unique keys", () => {
    const editable = collect(makeScene([makeObject(), makeObject(), makeObject()]));
    expect(editable.map((item) => item.key)).toEqual(["Text", "Text#2", "Text#3"]);
  });

  it("prefers the object name over its type", () => {
    const editable = collect(makeScene([makeObject({ name: "title" })]));
    expect(editable[0]?.key).toBe("title");
  });

  it("skips objects without a position", () => {
    const editable = collect(makeScene([makeObject(), { type: "Graphics" }]));
    expect(editable).toHaveLength(1);
  });

  it("skips objects nested inside a container", () => {
    const editable = collect(makeScene([makeObject(), makeObject({ parentContainer: {} })]));
    expect(editable).toHaveLength(1);
  });

  it("uses the text content in the label when present", () => {
    const editable = collect(makeScene([{ ...makeObject({ name: "play" }), text: "Играть" }]));
    expect(editable[0]?.label).toContain("Играть");
  });
});

describe("UiEditor snapshot and apply", () => {
  it("round-trips every editable property", () => {
    const objects = [makeObject({ x: 10, y: 20, scaleX: 1.5, scaleY: 0.5, alpha: 0.8, depth: 7 })];
    const editable = collect(makeScene(objects));
    const layout = snapshot(editable);

    objects[0]!.x = 0;
    objects[0]!.y = 0;
    objects[0]!.scaleX = 1;
    objects[0]!.scaleY = 1;
    objects[0]!.alpha = 1;
    objects[0]!.depth = 0;

    applyLayout(editable, layout);

    expect(objects[0]).toMatchObject({ x: 10, y: 20, scaleX: 1.5, scaleY: 0.5, alpha: 0.8, depth: 7 });
  });

  it("ignores entries for objects that no longer exist", () => {
    const objects = [makeObject({ x: 5 })];
    const editable = collect(makeScene(objects));
    const layout: LayoutEntry[] = [
      { key: "missing", x: 99, y: 99, scaleX: 2, scaleY: 2, alpha: 0.1, depth: 3, visible: false },
      { key: "Text", x: 7, y: 8, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, visible: true },
    ];

    expect(() => applyLayout(editable, layout)).not.toThrow();
    expect(objects[0]!.x).toBe(7);
    expect(objects[0]!.y).toBe(8);
  });

  it("keeps visibility", () => {
    const objects = [makeObject({ visible: true })];
    const editable = collect(makeScene(objects));
    applyLayout(editable, [
      { key: "Text", x: 0, y: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, visible: false },
    ]);
    expect(objects[0]!.visible).toBe(false);
  });
});
