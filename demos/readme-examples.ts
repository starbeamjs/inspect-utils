/* eslint-disable @typescript-eslint/no-magic-numbers, no-console */
import { basename } from "node:path";
import type {
  CustomInspectFunction,
  InspectOptionsStylized,
  Style,
} from "node:util";

import chalk from "chalk";
import {
  Display,
  DisplayStruct,
  DisplayTuple,
  DisplayUnit,
  inspector,
} from "inspect-utils";

const resolved = async () => new Promise((fulfill) => setTimeout(fulfill, 0));

console.log(chalk.cyanBright`=== Examples ===`);
console.log(
  chalk.gray`build:`,
  chalk.yellowBright(`${basename(import.meta.resolve("inspect-utils"))}`),
);
console.log();

example("without inspect-utils", () => {
  class Point {
    #x: number;
    #y: number;

    constructor(x: number, y: number) {
      this.#x = x;
      this.#y = y;
    }

    get x() {
      return this.#x;
    }

    get y() {
      return this.#y;
    }
  }

  console.log(new Point(1, 2));
});

example("DisplayStruct", () => {
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

    get x() {
      return this.#x;
    }

    get y() {
      return this.#y;
    }
  }

  console.log(new Point(1, 2));
});

example("DisplayTuple", () => {
  class SafeString {
    #value: string;

    constructor(value: string) {
      this.#value = value;
    }

    [Symbol.for("nodejs.util.inspect.custom")]() {
      return DisplayTuple("SafeString", this.#value);
    }
  }

  console.log(new SafeString("hello"));
});

example("DisplayTuple (multiple)", () => {
  class SafeString {
    #value: string;
    #verified: "checked" | "unchecked";

    constructor(value: string, verified: "checked" | "unchecked") {
      this.#value = value;
      this.#verified = verified;
    }

    [Symbol.for("nodejs.util.inspect.custom")]() {
      return DisplayTuple("SafeString", [this.#value, this.#verified]);
    }
  }

  console.log(new SafeString("hello", "checked"));
});

example("DisplayUnit", () => {
  type CheckResult =
    | { verification: "unsafe" }
    | { verification: "safe"; value: string };

  class CheckedString {
    static UNSAFE = new CheckedString({ verification: "unsafe" });

    static safe(value: string): CheckedString {
      return new CheckedString({ verification: "safe", value });
    }

    #value: CheckResult;

    constructor(value: CheckResult) {
      this.#value = value;
    }

    [Symbol.for("nodejs.util.inspect.custom")]() {
      switch (this.#value.verification) {
        case "unsafe":
          return DisplayUnit("CheckedString", { description: "unsafe" });
        case "safe":
          return DisplayTuple("CheckedString", this.#value.value);
      }
    }
  }

  console.log(CheckedString.UNSAFE);
  //=> CheckedString[unsafe]

  console.log(CheckedString.safe("hello"));
  //=> CheckedString("hello")
});

class Async<T> {
  #kind: "annotation" | "description";
  #value:
    | { status: "pending" }
    | { status: "fulfilled"; value: T }
    | { status: "rejected"; reason: unknown };

  constructor(value: Promise<T>, kind: "annotation" | "description") {
    this.#value = { status: "pending" };
    this.#kind = kind;

    value
      .then((value) => {
        this.#value = { status: "fulfilled", value };
      })
      .catch((reason: unknown) => {
        this.#value = { status: "rejected", reason };
      });
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    switch (this.#value.status) {
      case "pending":
        return DisplayUnit("Async", { description: "pending" });
      case "fulfilled":
        return DisplayTuple(
          "Async",
          this.#value.value,
          this.#kind === "description"
            ? { description: "fulfilled" }
            : { annotation: "@fulfilled" },
        );
      case "rejected":
        return DisplayTuple(
          "Async",
          this.#value.reason,
          this.#kind === "description"
            ? { description: "rejected" }
            : { annotation: "@rejected" },
        );
    }
  }
}

await example("descriptions", async () => {
  const promise = new Async(Promise.resolve(1), "description");
  console.log(promise); //=> Async[pending]

  // wait for promises to resolve
  await resolved();
  console.log(promise); //=> Async[fulfilled](1)

  const error = new Async(Promise.reject("oh no"), "description");
  await resolved();
  console.log(error); //=> Async[rejected]("oh no")
});

await example("annotations", async () => {
  const promise = new Async(Promise.resolve(1), "annotation");
  console.log(promise); //=> Async[pending]

  // wait for promises to resolve
  await resolved();
  console.log(promise); //=> Async[fulfilled](1)

  const error = new Async(Promise.reject("oh no"), "annotation");
  await resolved();
  console.log(error); //=> Async[rejected]("oh no")
});

example("Display (custom)", () => {
  class Point {
    #x: number;
    #y: number;

    constructor(x: number, y: number) {
      this.#x = x;
      this.#y = y;
    }

    [Symbol.for("nodejs.util.inspect.custom")]() {
      return Display((f) => {
        return [
          f.label({ compact: "Point" }),
          f.nest((f) => [
            "(",
            f.stylize(`${this.#x}`, "primitive"),
            ",",
            f.stylize(`${this.#y}`, "primitive"),
            ")",
          ]),
        ];
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
      return Display(({ ident, nest, inspect }) => [
        ident("Line"),
        nest("[", inspect(this.#start), " -> ", inspect(this.#end), "]"),
      ]);
    }
  }

  console.log(new Point(1, 2));
  console.log(new Line(new Point(1, 2), new Point(3, 4)));
});

example("declarative", () => {
  class Point {
    static {
      inspector(this, (point) =>
        DisplayStruct("Point", {
          x: point.#x,
          y: point.#y,
        }),
      );
    }

    #x: number;
    #y: number;

    constructor(x: number, y: number) {
      this.#x = x;
      this.#y = y;
    }
  }

  console.log(new Point(1, 2));
});

async function example(
  name: string,
  callback: () => Promise<void>,
): Promise<void>;
function example(name: string, callback: () => void): void;
// eslint-disable-next-line @typescript-eslint/promise-function-async
function example(
  name: string,
  callback: () => void | Promise<void>,
): void | Promise<void> {
  /**
   * If screenshotting for the README, add extra space.
   */
  const SCREENSHOTTING = process.argv.includes("--screenshots");

  console.group(stylize(name, "undefined"));
  if (SCREENSHOTTING) console.log();
  const result = callback();

  function end() {
    console.groupEnd();
    console.log();
    if (SCREENSHOTTING) console.log();
  }

  if (result === undefined) return void end();
  return result.then(end);
}

function stylize(text: string, style: Style) {
  return {
    [Symbol.for("nodejs.util.inspect.custom")]: ((
      _depth,
      options: InspectOptionsStylized,
    ) => {
      return options.stylize(text, style);
    }) as CustomInspectFunction,
  };
}
