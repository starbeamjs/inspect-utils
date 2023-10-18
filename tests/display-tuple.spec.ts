import { inspect as nodeInspect, type InspectOptions } from "node:util";

import { DisplayTuple } from "inspect-utils";
import { describe, expect, test } from "vitest";

import { lines } from "./display-struct.spec";

describe("DisplayTuple", () => {
  test("simple", () => {
    assert(DisplayTuple("Hello", "world"), `Hello('world')`);

    assert(DisplayTuple("Hello", `"world"`), `Hello('"world"')`);

    assert(DisplayTuple("Hello", `'world'`), `Hello("'world'")`);

    assert(
      DisplayTuple("Hello", `'world', "world"`),
      `Hello(\`'world', "world"\`)`,
    );

    assert(
      DisplayTuple("Hello", `'world', "world", \`world\``),
      `Hello('\\'world\\', "world", \`world\`')`,
    );
  });

  test("descriptions", () => {
    assert(
      DisplayTuple("Hello", "world", { description: "short" }),
      `Hello[short]('world')`,
    );
  });

  test("annotations", () => {
    assert(
      DisplayTuple("Hello", "world", { annotation: "short" }),
      `Hello('world' short)`,
    );

    assert(
      DisplayTuple("Hello", "world", { annotation: "short" }),
      lines("Hello(", "  'world'", " short)"),
      { breakLength: 10 },
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
        return DisplayTuple("Point", [this.#x, this.#y]);
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
        return DisplayTuple("Line", [this.#start, this.#end]);
      }
    }

    class Polygon {
      #lines: Line[];

      constructor(...lines: Line[]) {
        this.#lines = lines;
      }

      [Symbol.for("nodejs.util.inspect.custom")]() {
        return DisplayTuple("Polygon", this.#lines);
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
      [
        "Polygon(",
        "  Line(Point(1, 2), Point(3, 4)),",
        "  Line(Point(5, 6), Point(7, 8)),",
        "  Line(Point(9, 10), Point(11, 12)),",
        "  Line(Point(11, 12), Point(1, 2))",
        ")",
      ].join("\n"),
      { breakLength: 80 },
    );

    assert(
      polygon,
      [
        "Polygon(",
        "  Line(",
        "    Point(1, 2),",
        "    Point(3, 4)",
        "  ),",
        "  Line(",
        "    Point(5, 6),",
        "    Point(7, 8)",
        "  ),",
        "  Line(",
        "    Point(9, 10),",
        "    Point(11, 12)",
        "  ),",
        "  Line(",
        "    Point(11, 12),",
        "    Point(1, 2)",
        "  )",
        ")",
      ].join("\n"),
      { breakLength: 30 },
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
