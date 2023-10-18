export type JSONValue =
  | JSONPrimitive
  | JSONValue[]
  | { [key: string]: JSONValue };

export type JSONPrimitive = string | number | boolean | null;
