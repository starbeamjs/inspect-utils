import type {
  inspect as NodeInspectImport,
  InspectOptionsStylized,
} from "node:util";

import type { JSONPrimitive } from "./json-value.js";
import { STYLE_NAME_MAP } from "./style-name.js";
import {
  Braced,
  Fragment,
  Inspect,
  type SpecifiedStyle,
  type StringifyOptions,
  Stylize,
  Stylized,
  withNested,
} from "./stylized.js";
import { EMPTY_SIZE, NESTED } from "./stylized.js";
import { fragment, type StylizedResult, stylizeResult } from "./utils.js";

type NodeInspect = typeof NodeInspectImport;

export interface DisplayStructOptions {
  /**
   * The description appears right after the label.
   *
   * For example, if you call `DisplayStruct("Stringy", { name: "hello" }, {
   * description: "short" }), the struct will display as:
   *
   * ```
   * Stringy[short] {
   *   name: "hello"
   * }
   * ```
   *
   * The brackets are automatically inserted for descriptions and cannot be
   * omitted.
   *
   * This differs from `annotation`, which appears after the structure and is
   * inserted as-is (without any additional decorations).
   */
  readonly description?: Description | undefined;

  /**
   * The annotation appears after the structure.
   *
   * For example, if you call `DisplayStruct("Stringy", { name: "hello" }, {
   * annotation: "short" }), the struct will display as:
   *
   * ```
   * Stringy {
   *   name: "hello"
   * } short
   * ```
   *
   * Annotations appear inside the `()` for `DisplayNewtype`.
   *
   * For example, if you call `DisplayStruct("Stringy", "hello", {
   * annotation: "short" })`, the struct will display as:
   *
   * ```
   * Stringy("hello" short)
   * ```
   */
  readonly annotation?: Annotation | undefined;
}

export type Fields = Record<PropertyKey, unknown>;

class StylizedBuffer {
  readonly #stylized: Stylized[] = [];

  add(...items: StylizedResult[]): this {
    for (const item of items) {
      this.#stylized.push(fragment(item));
    }
    return this;
  }

  get isEmpty(): boolean {
    return this.#stylized.length === EMPTY_SIZE;
  }

  get stylized(): Stylized {
    return Fragment(...this.#stylized);
  }
}

export function DisplayStruct(
  name: NameOption,
  fields: object,
  options?: DisplayStructOptions,
): object {
  return Display((f) => {
    const displayName = computeDisplayName(name, options);
    const annotations = formatAnnotation(options?.annotation);
    return fragment(displayName?.stylized, " ", f.inspect(fields), annotations);
  });
}

type StylizeFn = (string: string, style: SpecifiedStyle) => Stylized;

type Stylizers = {
  [key in SpecifiedStyle]: (string: string) => Stylized;
};

interface FormatFnOptions extends Stylizers {
  label: (label: NameOption, style?: SpecifiedStyle) => Stylized;
  nest: (
    ...nested: StylizedResult[] | [(fn: FormatFnOptions) => StylizedResult]
  ) => Stylized;
  stylize: StylizeFn;
  inspect: (value: unknown) => Stylized;
  isNested: boolean;
}

type FormatFn = (options: FormatFnOptions) => StylizedResult;
type Description = JSONPrimitive | StylizedResult | FormatFn;
type Annotation = StylizedResult | FormatFn;

interface DisplayOptions {
  format?: FormatFn | undefined;
  description?: Description | undefined;
  annotation?: Annotation | undefined;
}

type DisplayArgs =
  | [format: FormatFn]
  | [
      name: NameOption,
      format?: DisplayOptions | FormatFn,
      options?: DisplayOptions,
    ];

/**
 * Define a custom inspect function directly.
 */
export function Display(format: FormatFn): object;
export function Display(
  name: NameOption,
  format?: DisplayOptions | FormatFn,
  options?: DisplayOptions,
): object;
export function Display(...args: DisplayArgs): object {
  const { name, format, options } = normalizeOverload(args);

  return DisplayPrimitive({
    name,
    format,
    ...options,
  });
}

function normalizeOverload([
  formatOrName,
  formatOrOptions,
  options,
]: DisplayArgs): {
  name: NameOption | undefined;
  format: FormatFn | undefined;
  options: DisplayOptions | undefined;
} {
  if (formatOrOptions !== undefined && options !== undefined) {
    /**
     * @overloads
     * function Display(name: NameOption, format: FormatFn, options: DisplayOptions): object;
     */
    return {
      name: formatOrName as NameOption,
      format: formatOrOptions as FormatFn,
      options,
    };
  }

  if (formatOrOptions === undefined && options === undefined) {
    /**
     * @overloads
     * function Display(format: FormatFn): object;
     * function Display(name: NameOption): object;
     */
    return typeof formatOrName === "function"
      ? { name: undefined, format: formatOrName, options: undefined }
      : { name: formatOrName, format: undefined, options: undefined };
  }

  if (formatOrOptions === undefined && options !== undefined) {
    /**
     * @overloads
     * function Display(name: NameOption, format: undefined, options: DisplayOptions): object;
     */

    return {
      name: formatOrName as NameOption,
      format: undefined,
      options,
    };
  }

  if (formatOrOptions !== undefined && options === undefined) {
    /**
     * @overloads
     * function Display(name: NameOption, format: FormatFn): object;
     * function Display(name: NameOption, options: DisplayOptions): object;
     */

    const [format, options] =
      typeof formatOrOptions === "function"
        ? [formatOrOptions, undefined]
        : [undefined, formatOrOptions];

    if (typeof formatOrOptions === "function") {
      return {
        name: formatOrName as NameOption,
        format,
        options,
      };
    } else {
      return {
        name: formatOrName as NameOption,
        format: undefined,
        options: formatOrOptions,
      };
    }
  }

  throw Error(`Invalid arguments to Display.`);
}

function DisplayPrimitive(
  options: {
    name?: NameOption;
  } & DisplayOptions,
): object {
  return new (class {
    [Symbol.for("nodejs.util.inspect.custom")](
      _: unknown,
      { stylize, ...rest }: InspectOptionsStylized,
      inspect: NodeInspect,
    ): string {
      const buffer = new StylizedBuffer();

      const displayName =
        options.name && computeDisplayName(options.name, options);

      if (displayName) {
        buffer.add(displayName.stylized);
      }

      const inner = new StylizedBuffer();
      if (options.format) inner.add(callFormatFn(options.format));

      if (options.annotation) inner.add(formatAnnotation(options.annotation));

      if (!inner.isEmpty) {
        if (buffer.isEmpty) {
          buffer.add(inner.stylized);
        } else {
          buffer.add("(", inner.stylized, ")");
        }
      }

      return buffer.stylized.stringify({
        stylize,
        inspect: (value) => inspect(value, { ...rest }),
      });
    }
  })();
}

/**
 * Display a class as a label without any fields.
 *
 * `DisplayUnit` supports the `description` option, which will appear
 * immediately after the label. It does not support annotations. This is because
 * annotations normally appear inside of the structure (either `{}` for structs
 * or `()` for tuples), but there is no "inside the structure" for unit-type
 * inspect output.
 */
export function DisplayUnit(
  name: string,
  options?: { description?: Description },
): object {
  return DisplayPrimitive({
    name,
    description: options?.description,
  });
}

export function DisplayTuple(
  name: string,
  /* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents --
     Use redundant types here for documentation. */
  inner: unknown | unknown[],
  options?: DisplayStructOptions,
): object {
  return Display((f) => {
    const displayName = computeDisplayName(name, options);

    return fragment(
      displayName?.stylized,
      "(",
      Braced(f.inspect(Array.isArray(inner) ? inner : [inner])),
      formatAnnotation(options?.annotation),
      ")",
    );
  });
}

function formatAnnotation(annotation: Annotation): Stylized {
  if (annotation === undefined) {
    return fragment();
  } else if (typeof annotation === "string") {
    return prefix(Stylize(annotation, "annotation"), " ");
  } else if (typeof annotation === "function") {
    return prefix(fragment(callFormatFn(annotation)), " ");
  } else {
    return prefix(fragment(stylizeResult(annotation)), " ");
  }
}

function prefix(stylized: Stylized, prefix: string) {
  if (stylized.isEmpty) {
    return stylized;
  } else {
    return fragment(prefix, stylized);
  }
}

function callFormatFn(fn: FormatFn): StylizedResult {
  const helper: Omit<FormatFnOptions, Exclude<keyof Stylizers, "label">> &
    Partial<Exclude<Stylizers, "label">> = {
    label: (label: NameOption, style: SpecifiedStyle = "ident") => {
      if (typeof label === "string") {
        return Stylize(label, style);
      } else if (NESTED) {
        return fragment();
      } else {
        return Stylize(label.compact, style);
      }
    },
    nest: (
      ...nested: StylizedResult[] | [(fn: FormatFnOptions) => StylizedResult]
    ) =>
      withNested(() => {
        const [maybeFn, ...rest] = nested;
        if (typeof maybeFn === "function") {
          return fragment(maybeFn(helper as FormatFnOptions));
        } else {
          return fragment(maybeFn, ...(rest as StylizedResult[]));
        }
      }),
    inspect: (value) =>
      fragment(helper.nest(() => Inspect(value, { nested: NESTED }))),
    stylize: (text, style) => Stylize(text, style),
    get isNested() {
      return NESTED;
    },
  };

  for (const key of Object.keys(STYLE_NAME_MAP)) {
    if (key === "label") continue;

    helper[key as Exclude<keyof Stylizers, "label">] = (text) =>
      Stylize(text, key as SpecifiedStyle);
  }

  return fn(helper as FormatFnOptions);
}

class DisplayName extends Stylized {
  static create(label: string, desc: StylizedResult = undefined): DisplayName {
    return new DisplayName(label, fragment(desc));
  }

  readonly #label: string;
  readonly #desc: Stylized;

  constructor(label: string, desc: Stylized) {
    super();
    this.#label = label;
    this.#desc = desc;
  }

  get isEmpty(): boolean {
    return false;
  }

  stringify(options: StringifyOptions): string {
    return this.stylized.stringify(options);
  }

  get stylized(): Stylized {
    const buffer = new StylizedBuffer().add(Stylize(this.label, "ident"));

    if (!this.#desc.isEmpty) {
      buffer.add("[", this.#desc, "]");
    }

    return buffer.stylized;
  }

  get desc(): Stylized {
    return this.#desc;
  }

  get label(): string {
    return this.#label;
  }
}

/**
 * When the name is compact, then it is only displayed in a nested context if it
 * has a description.
 *
 * Conceptually, a compact name is a name whose presence is not required in
 * order for the user to understand the body of the value's "display".
 *
 * For this reason, compact names can be left out in nested contexts to
 * streamline the output.
 *
 * Note that the presence of an annotation does not force a compact name to be
 * displayed.
 *
 * Consider this representation of `Type` with an annotation:
 *
 * ```
 * Type(StringOption default="hello")
 * ```
 *
 * And this representation of `Type` with a description:
 *
 * ```
 * Type[StringOption](default="hello")
 * ```
 *
 * In the case of an annotation, it is just fine to omit `Type` and end up with:
 *
 * ```
 * StringOption default="hello"
 * ```
 *
 * However, if you left out `Type` in the description situation, you'd end up with:
 *
 * ```
 * [StringOption](default="hello")
 * ```
 *
 * And this is not what you want.
 */
type NameOption = string | { compact: string };

/**
 * If the inspection is nested, then:
 * - If the name is compact and there is no description, return undefined.
 */
function computeDisplayName(
  specifiedName: NameOption,
  displayOptions: DisplayStructOptions | undefined,
): DisplayName | undefined {
  function getName(): { name: string; isCompact: boolean } {
    if (typeof specifiedName === "string") {
      return { name: specifiedName, isCompact: false };
    } else {
      return { name: specifiedName.compact, isCompact: true };
    }
  }

  const { name, isCompact } = getName();
  const desc = displayOptions?.description;

  if (typeof desc === "function") {
    // If a desc function was supplied, a name function is required
    return DisplayName.create(name, callFormatFn(desc));
  } else if (desc) {
    // Same thing with a desc string
    return DisplayName.create(name, formatDescription(desc));
  } else if (isCompact && NESTED) {
    // Otherwise, if there's no description, the name is compact, and the
    // the context is nested, return nothing.
    return undefined;
  } else {
    // Otherwise, it's a plain name
    return DisplayName.create(name);
  }
}

function formatDescription(
  description: StylizedResult | JSONPrimitive,
): Stylized {
  switch (typeof description) {
    case "undefined":
      return fragment();
    case "string":
      return Stylize(description, "annotation");
    case "number":
    case "boolean":
      return Stylize(String(description), "annotation");
  }

  if (description === null) {
    return Stylize("null", "annotation");
  }

  return fragment(description);
}
