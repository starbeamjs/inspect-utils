import { Fragment, Stylize, type Stylized } from "./stylized.js";

export type ToStylized = Stylized | string | undefined;
export type StylizedResult = ToStylized | ToStylized[];

const PUNCTUATION = /^[!"#$%&'()*+,\-./:;<=>?@[\]^`{|}~\s]+$/u;

export function fragment(...items: StylizedResult[]): Stylized {
  return Fragment(...items.flatMap(stylizeResult));
}

const OFFSET_SIZE_DELTA = 1;

export function join(
  items: StylizedResult[],
  separator: StylizedResult,
): Stylized {
  const last = items.length - OFFSET_SIZE_DELTA;

  return fragment(
    ...items.flatMap((item, index) => {
      if (index === last) {
        return [item];
      } else {
        return [item, separator];
      }
    }),
  );
}

export function stylizeResult(result: StylizedResult): Stylized[] {
  return Array.isArray(result)
    ? result.flatMap(toStylized)
    : toStylized(result);
}

export function toStylized(item: ToStylized | undefined): Stylized[] {
  if (typeof item === "string") {
    const test = PUNCTUATION.test(item);
    return [Stylize(item, test ? "annotation" : undefined)];
  } else {
    return item === undefined ? [] : [item];
  }
}
