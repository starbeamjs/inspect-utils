import type { InspectOptionsStylized, Style as NodeStyleName } from "node:util";

import { STYLE_NAME_MAP, type StyleName } from "./style-name.js";
import { fragment, type StylizedResult } from "./utils.js";

export type SpecifiedStyle = `node:${NodeStyleName}` | StyleName;

export function toNodeStyle(style: SpecifiedStyle): NodeStyleName {
  if (style.startsWith("node:")) {
    return style.slice("node:".length) as NodeStyleName;
  } else {
    return STYLE_NAME_MAP[style as keyof typeof STYLE_NAME_MAP];
  }
}

export interface StringifyOptions {
  stylize: StylizeFn;
  inspect: (value: unknown) => string;
}

export type StylizeFn = InspectOptionsStylized["stylize"];

export abstract class Stylized {
  abstract stringify(options: StringifyOptions): string;
  abstract readonly isEmpty: boolean;
}

export function isStylized(value: unknown): value is Stylized {
  return !!(
    value &&
    (value instanceof StylizedString ||
      value instanceof StylizedFragment ||
      value instanceof StylizedInspect)
  );
}

export function Stylize(
  string: string,
  style?: SpecifiedStyle | undefined,
): Stylized {
  return new StylizedString(string, style && toNodeStyle(style));
}

export function Fragment(...items: Stylized[]): Stylized {
  return new StylizedFragment(items);
}

export function Inspect(
  value: unknown,
  { nested }: { nested: boolean },
): Stylized {
  return new StylizedInspect(value, nested);
}

export function Braced(
  child: Stylized,
  braces?: [start: StylizedResult, end: StylizedResult],
): Stylized {
  if (braces) {
    const [start, end] = braces;
    return new StylizedBraces(child, fragment(start), fragment(end));
  } else {
    return new StylizedBraces(child, fragment(), fragment());
  }
}

class StylizedString extends Stylized {
  readonly #string: string;
  readonly #style: NodeStyleName | undefined;

  constructor(string: string, style: NodeStyleName | undefined) {
    super();
    this.#string = string;
    this.#style = style;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      type: "string",
      value: this.#string,
      style: this.#style,
    };
  }

  get isEmpty(): boolean {
    return this.#string.length === EMPTY_SIZE;
  }

  stringify({ stylize }: StringifyOptions) {
    if (this.#style) {
      return stylize(this.#string, this.#style);
    } else {
      return this.#string;
    }
  }
}

class StylizedFragment extends Stylized {
  readonly #children: Stylized[];

  constructor(children: Stylized[]) {
    super();
    this.#children = children;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      type: "fragment",
      children: this.#children,
    };
  }

  get isEmpty(): boolean {
    return this.#children.every((child) => child.isEmpty);
  }

  stringify(options: StringifyOptions) {
    return this.#children.map((child) => child.stringify(options)).join("");
  }
}

class StylizedBraces extends Stylized {
  readonly #child: Stylized;
  readonly #start: Stylized;
  readonly #end: Stylized;

  constructor(child: Stylized, start: Stylized, end: Stylized) {
    super();
    this.#child = child;
    this.#start = start;
    this.#end = end;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      type: "braces",
      child: this.#child,
      braces: [this.#start, this.#end],
    };
  }

  get isEmpty(): boolean {
    return this.#child.isEmpty;
  }

  stringify(options: StringifyOptions) {
    const string = this.#child.stringify(options);

    const start = /^(\{|\[|\}) */u.exec(string);
    const end = / *(\}|\]|\))$/u.exec(string);

    const startIndex = start
      ? start.index + start[WHOLE_MATCH].length
      : undefined;
    const endIndex = end ? end.index : undefined;

    return (
      this.#start.stringify(options) +
      string.slice(startIndex, endIndex) +
      this.#end.stringify(options)
    );
  }
}

const WHOLE_MATCH = 0;

class StylizedInspect extends Stylized {
  readonly #value: unknown;
  readonly #nested: boolean;

  constructor(value: unknown, nested: boolean) {
    super();
    this.#value = value;
    this.#nested = nested;
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return {
      type: "inspect",
      value: this.#value,
      nested: this.#nested,
    };
  }

  get isEmpty(): boolean {
    return false;
  }

  stringify({ inspect }: StringifyOptions): string {
    return withNested(() => inspect(this.#value), this.#nested);
  }
}
export const EMPTY_SIZE = 0;
export let NESTED = false;

export function withNested<T>(callback: () => T, nested = true): T {
  const prev = NESTED;
  NESTED = nested;

  try {
    return callback();
  } finally {
    NESTED = prev;
  }
}
