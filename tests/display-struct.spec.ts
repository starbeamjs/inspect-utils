/* eslint-disable @typescript-eslint/no-magic-numbers */
import { inspect as nodeInspect, type InspectOptions } from "node:util";

import { DisplayStruct } from "inspect-utils";
import { describe, expect, test } from "vitest";

describe("DisplayStruct", () => {
  test("simple", () => {
    assert(
      DisplayStruct("Hello", { world: "world" }),
      `Hello { world: 'world' }`,
    );

    assert(
      DisplayStruct("Hello", { world: `"world"` }),
      `Hello { world: '"world"' }`,
    );

    assert(
      DisplayStruct("Hello", { world: `'world'` }),
      `Hello { world: "'world'" }`,
    );

    assert(
      DisplayStruct("Hello", { world: `'world', "world"` }),
      `Hello { world: \`'world', "world"\` }`,
    );

    assert(
      DisplayStruct("Hello", { world: `'world', "world", \`world\`` }),
      `Hello { world: '\\'world\\', "world", \`world\`' }`,
    );
  });

  test("descriptions", () => {
    assert(
      DisplayStruct("Hello", { world: "world" }, { description: "short" }),
      `Hello[short] { world: 'world' }`,
    );
  });

  test("annotations", () => {
    assert(
      DisplayStruct("Hello", { world: "world" }, { annotation: "short" }),
      `Hello { world: 'world' } short`,
    );

    assert(
      DisplayStruct(
        "Hello",
        { world: "world" },
        {
          annotation: "short",
        },
      ),
      lines("Hello {", "  world: 'world'", "} short"),
      { breakLength: 20 },
    );
  });

  test("nested", () => {
    class Point {
      #x: number;
      #y: number;

      constructor(x: number, y: number) {
        this.#x = x;
        this.#y = y;
      }

      [Symbol.for("nodejs.util.inspect.custom")]() {
        return DisplayStruct("Point", {
          x: this.#x,
          y: this.#y,
        });
      }
    }

    class Line {
      #start: Point;
      #end: Point;

      constructor(start: Point, end: Point) {
        this.#start = start;
        this.#end = end;
      }

      [Symbol.for("nodejs.util.inspect.custom")]() {
        return DisplayStruct("Line", {
          start: this.#start,
          end: this.#end,
        });
      }
    }

    class Polygon {
      #lines: Line[];

      constructor(...lines: Line[]) {
        this.#lines = lines;
      }

      [Symbol.for("nodejs.util.inspect.custom")]() {
        return DisplayStruct("Polygon", {
          lines: this.#lines,
        });
      }
    }

    const polygon = new Polygon(
      new Line(new Point(1, 2), new Point(3, 4)),
      new Line(new Point(5, 6), new Point(7, 8)),
      new Line(new Point(9, 10), new Point(11, 12)),
      new Line(new Point(11, 12), new Point(1, 2)),
    );

    assert(
      polygon,
      lines(
        "Polygon {",
        "  lines: [",
        "    Line { start: Point { x: 1, y: 2 }, end: Point { x: 3, y: 4 } },",
        "    Line { start: Point { x: 5, y: 6 }, end: Point { x: 7, y: 8 } },",
        "    Line { start: Point { x: 9, y: 10 }, end: Point { x: 11, y: 12 } },",
        "    Line { start: Point { x: 11, y: 12 }, end: Point { x: 1, y: 2 } }",
        "  ]",
        "}",
      ),
      {
        breakLength: 80,
      },
    );

    assert(
      polygon,
      lines(
        "Polygon {",
        "  lines: [",
        "    Line {",
        "      start: Point { x: 1, y: 2 },",
        "      end: Point { x: 3, y: 4 }",
        "    },",
        "    Line {",
        "      start: Point { x: 5, y: 6 },",
        "      end: Point { x: 7, y: 8 }",
        "    },",
        "    Line {",
        "      start: Point { x: 9, y: 10 },",
        "      end: Point { x: 11, y: 12 }",
        "    },",
        "    Line {",
        "      start: Point { x: 11, y: 12 },",
        "      end: Point { x: 1, y: 2 }",
        "    }",
        "  ]",
        "}",
      ),
      {
        breakLength: 50,
      },
    );
  });
});

function assert(display: object, expected: string, options?: InspectOptions) {
  expect(inspect(display, options)).toBe(expected);
}

function inspect(display: object, options: InspectOptions = {}) {
  class Inspected {
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return display;
    }
  }

  return nodeInspect(new Inspected(), {
    colors: false,
    customInspect: true,
    ...options,
  });
}

export function lines(...lines: string[]): string {
  return lines.join("\n");
}
