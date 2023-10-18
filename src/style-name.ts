export const STYLE_NAME_MAP = {
  /**
   * Same as `special` in node, defaults to blue/cyan.
   *
   * Represents the name of a structure (i.e. the class name, function name,
   * etc.).
   */
  ident: "special",
  /**
   * Same as `module` in node, defaults to white underlined.
   *
   * Represents the physical location of a value (i.e. a path).
   */
  path: "module",
  /**
   * Same as "number", "bigint", "boolean" in node, defaults to dark orange or
   * brown.
   *
   * Useful for representing an inner value of a structure when it's a simple
   * wrapper and the inner value is a number or boolean.
   */
  primitive: "number",

  /**
   * Same as "undefined" in node, defaults to gray.
   *
   * Represents labels for values (i.e. `default=` in `default=1`)
   */
  label: "undefined",

  /**
   * Same as "undefined" in node, defaults to gray.
   *
   * Represents annotations that are intended to be represented in a more subtle
   * way that the value that the annotation is attached to.
   */
  annotation: "undefined",

  /**
   * Same as "undefined" in node, defaults to gray.
   *
   * Represents punctuation that should be represented in a subtle way to avoid
   * visual noise.
   */
  punctuation: "undefined",

  /**
   * Same as "null" in node, defaults to white.
   */
  plain: "null",
  /**
   * Same as "string", "symbol" in node, defaults to green.
   *
   * Useful for representing an inner value of a structure when it's a simple
   * wrapper and the inner value is a string.
   */
  literal: "string",
  /**
   * Same as "regexp" in node, defaults to red.
   *
   * Represents values that are pattern-like. This includes regular expressions,
   * but can also include other patterns like file globs.
   */
  pattern: "regexp",
  /**
   * Same as "date" in node, defaults to magenta.
   *
   * Useful for representing an inner value of a structure when it's a built-in
   * JavaScript value like a date.
   */
  builtin: "date",

  /**
   * Same as "date" in node, defaults to magenta.
   *
   * Represents TypeScript type names (as distinct from class or function names,
   * which are represented by `id:name` and represent JavaScript values).
   */
  type: "date",
} as const;
export const STYLE_NAMES = Object.keys(STYLE_NAME_MAP) as [
  "ident",
  "path",
  "primitive",
  "label",
  "annotation",
  "punctuation",
  "plain",
  "literal",
  "pattern",
  "builtin",
  "type",
];
export type StyleName = keyof typeof STYLE_NAME_MAP;
