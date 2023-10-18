/* eslint-disable @typescript-eslint/no-magic-numbers */
import { inspect as nodeInspect, type InspectOptions } from "node:util";

import { DisplayTuple, DisplayUnit } from "inspect-utils";
import { describe, expect, test } from "vitest";

describe("DisplayUnit", () => {
  test("simple", () => {
    assert(DisplayUnit("Hello"), `Hello`);
  });

  test("descriptions", () => {
    assert(DisplayUnit("Hello", { description: "short" }), `Hello[short]`);
  });

  test("annotations", () => {
    assert(
      // @ts-expect-error intentionally passing a disallowed annotation
      DisplayUnit("Hello", { annotation: "short" }),
      `Hello`,
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
        return DisplayUnit("Point", { description: `${this.#x},${this.#y}` });
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
        "  Line(Point[1,2], Point[3,4]),",
        "  Line(Point[5,6], Point[7,8]),",
        "  Line(Point[9,10], Point[11,12]),",
        "  Line(Point[11,12], Point[1,2])",
        ")",
      ].join("\n"),
      { breakLength: 80 },
    );

    assert(
      polygon,
      [
        "Polygon(",
        "  Line(",
        "    Point[1,2],",
        "    Point[3,4]",
        "  ),",
        "  Line(",
        "    Point[5,6],",
        "    Point[7,8]",
        "  ),",
        "  Line(",
        "    Point[9,10],",
        "    Point[11,12]",
        "  ),",
        "  Line(",
        "    Point[11,12],",
        "    Point[1,2]",
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
