# 🌺 inspect-utils 🌸

[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

🌅🌸 Gorgeous inspect output for your custom classes. 🌺🌄

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```sh
$ pnpm i inspect-utils
```

## Motivation

Let's say you write a class that uses getters to define its main public interface:

```ts
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
```

Since `x` and `y` are not data properties, the default Node inspect output is:

```ts
console.log(new Point(1, 2));
```

![`Point {}`](./demos/screenshots/without-inspect-utils.png)

This is not very useful. Let's fix that:

```ts
import { DisplayStruct } from "inspect-utils";

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
```

Now you get the inspect output you were expecting:

```ts
console.log(new Point(1, 2));
```

![`Point { x: 1, y: 2 }`](./demos/screenshots/DisplayStruct.png)

## Features

In addition to `DisplayStruct`, which creates inspect output with labelled values, there are multiple other styles of inspect output.

### Tuples: Unlabeled Instances

If you have a class that represents a single internal value, representing the value as `{ label: value }` is too noisy.

In this case, you can use `DisplayTuple` to create less verbose inspect output:

```ts
class SafeString {
  #value: string;

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return DisplayTuple("SafeString", this.#value);
  }
}
```

Now, the inspect output is:

![`SafeString('hello')`](./demos/screenshots/DisplayTuple.png)

You can pass multiple values to `DisplayTuple` as an array, and they will be comma-separated in the output.

```ts
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
```

![`SafeString('hello', 'checked')`](./demos/screenshots/DisplayTupleMulti.png)

### Units: Valueless Instances

If you have an instance that represents a singleton value, you can use `DisplayUnit` to create even less verbose inspect output.

You can use descriptions with unit-style inspect output. You can also use unit-style inspect output for certain instances and more verbose inspect output for others.

```ts
import { DisplayStruct } from "inspect-utils";

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
```

![`CheckedString[unsafe]` and `CheckedString('hello')`](./demos/screenshots/DisplayUnit.png)

### Descriptions

If you have a single class with multiple logical sub-types, you can add a description to the inspect output:

```ts
import { DisplayStruct } from "inspect-utils";

class Async<T> {
  #value:
    | { status: "pending" }
    | { status: "fulfilled"; value: T }
    | { status: "rejected"; reason: Error };

  constructor(value: Promise<T>) {
    this.#value = { status: "pending" };

    value
      .then((value) => {
        this.#value = { status: "fulfilled", value };
      })
      .catch((reason) => {
        this.#value = { status: "rejected", reason };
      });
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    switch (this.#value.status) {
      case "pending":
        return DisplayUnit("Async", { description: "pending" });
      case "fulfilled":
        return DisplayTuple("Async", this.#value.value, {
          description: "fulfilled",
        });
      case "rejected":
        return DisplayTuple("Async", this.#value.reason, {
          description: "rejected",
        });
    }
  }
}
```

![`SafeString('hello', 'checked')`](./demos/screenshots/descriptions.png)

</details>

### Annotations

Descriptions are useful to communicate that the different sub-types are almost like different classes, so they appear as labels alongside the class name itself.

Annotations, on the other hand, provide additional context for the value.

Let's see what would happen if we used annotations instead of descriptions for the async example.

```diff
import { DisplayStruct } from "inspect-utils";

class Async<T> {
  #value:
    | { status: "pending" }
    | { status: "fulfilled"; value: T }
    | { status: "rejected"; reason: Error };

  constructor(value: Promise<T>) {
    this.#value = { status: "pending" };

    value
      .then((value) => {
        this.#value = { status: "fulfilled", value };
      })
      .catch((reason) => {
        this.#value = { status: "rejected", reason };
      });
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    switch (this.#value.status) {
      case "pending":
        return DisplayUnit("Async", { description: "pending" });
      case "fulfilled":
        return DisplayTuple("Async", this.#value.value, {
-         description: "fulfilled",
+         annotation: "@fulfilled",
        });
      case "rejected":
        return DisplayTuple("Async", this.#value.reason, {
-         description: "rejected",
+         annotation: "@rejected",
        });
    }
  }
}
```

In this case, the inspect output would be

![`SafeString('hello', 'checked')`](./demos/screenshots/annotations.png)

> 📒 The unit style does not support annotations because annotations appear alongside the structure's _value_ and the unit style doesn't have a value.

</details>

The decision to use descriptions or annotations is stylistic. Descriptions are presented as important information alongside the class name, while annotations are presented in a dimmer font alongside the value.

### Display: Custom Formatting

You can also use the `Display` function to control the output format even more directly.

```ts

```

### Declarative Use (The Whole Enchilada)

```ts
import { inspect } from "inspect-utils";

class Point {
  static {
    inspect(this, (point) =>
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
```

This does two things:

- Automatically installs the `Symbol.for("nodejs.util.inspect.custom")` on instances of `Point`.
- Sets `Symbol.toStringTag` to `Point` on instances of `Point`.

### Production-Friendly Builds by Default (Using Conditional Exports)

If you are using a tool that understands [conditional exports](https://nodejs.org/api/packages.html#conditional-exports), using the [declarative API](#declarative-use-the-whole-enchilada) above will automatically strip out the custom display logic when the "production" condition is defined.

> Vite [directly supports](https://vitejs.dev/config/shared-options.html#resolve-conditions) the `"production"` condition, and enables it whenever the Vite mode is `"production"`

The default condition includes `import.meta.env.DEV` checks, and is suitable for builds that know how to replace `import.meta.env.DEV` but don't resolve conditional exports properly.

#### Why Stripping Works: A Bit of a Deep Dive

This strategy assumes that you are using a minifier like [terser](https://terser.org/) in a mode that strips out no-op functions.

When the `production` export is resolved, the `inspect` function looks like this:

```ts
export function inspect(Class, inspect) {}
```

When using a function like that in standard minifiers with default compression settings, the call to the function, **including callback parameters**, is eliminated.

Check out [this example in the swc playground](https://play.swc.rs/?version=1.3.92&code=H4sIAAAAAAAAAz2OQQqDMBBF94J3%2BOjGQOgBKnbTHqDQE0iwNCBJMCNkEO%2FeJBpXM%2FNm5vG%2Fq1GkrYE23k2Kuuc8ei%2FLKLDtdVVXU3B2Iai0xNtqQ9jqCvA0klZHj8tBPx0VnUt3AsMDL%2B3dPPKHljWumyxoZHkDwh35%2BNYGWRhfjE%2B2C5GaHAhoQ58L98esrPHZb5cuSLAo%2BpQmijHg%2BCiEI%2BH%2BNO5%2FgzlWzQkBAAA%3D&config=H4sIAAAAAAAAA32UO3LjMAyG%2B5zCozrFjostcoDtcgYOTYIyvXxoCNCxJuO7L0TJj40hdRI%2B%2FAAJgPh%2B2%2B26E5ruY%2FfNn%2Fwz6IJQ7v9swTGRvrClAxM1muIH6t5v9IQTcjogNNN1Jh3p0gM1Fe5%2F7feLogs5I9wUiy365N34nNPkOBRAfLKxlUPWCInwf%2F3CSv6aAJX6bD%2FkHECnDaI0Kp8IeihSYJND0AOCOusiRJlOqovHLKWYYCWwaih5EHmynnxOnPOVWtBWmWxBQL6AIX8GSca5WJaQryfcp2ELh9r3rc8%2F1HDWoWoScsKltYRPK0Q9Zo%2BkXE1SCWe4UoMZLsX9qfROFaBa0qvulH1a6clfAK5A0IhJR5DiNg%2FH87SmdptKnxyPLI0C5%2FmWbpmg56Iq751Q2akyUMhL3Sxgq4GpskY6zoJXyofeggLneFaE0PjlyRylpDQOkJ0AuL%2FaSVM1A3V%2FhSt8ehAb%2BA%2FfkuQBWzyipuM6xTEecthIEIGO2W44cCsor%2BPCW%2BIyrPOaLPBogBVdKjbwugT4AVBWoe3Ll9ng58ERVR%2Fy4bEmFofrfQ9HnfrHe59X8dvi0MVsa4PLkp%2F6O6%2Fm393D6baF7wfvPH7elC3p9R%2BoYzQdMAYAAA%3D%3D).

Pasting the same code into the [terser playground] with default settings yields this output:

```js
export class Point {
  static {}
  #t;
  #s;
  constructor(t, s) {
    (this.#t = t), (this.#s = s);
  }
}
```

Unfortunately, both terser and swc leave in empty static blocks at the moment. Hopefully this will be fixed in the future. In the meantime, the default behavior of this library with a minifier is to completely remove all custom inspect logic, which is the meat of the matter.

A reasonable bundler (such as rollup) should also avoid including any of `inspect-utils`'s display logic in production, since you only use the `inspect` function directly, and the inspect function doesn't use any of the rest of `inspect-utils`'s code in the production export.

#### The `debug` Condition

`inspect-utils` also provides an export for the `debug-symbols` condition, which does _not_ strip out the custom display logic and is intended to be compatible with the `production` condition.

To use this, you will need to configure your environment with a `"debug-symbols"` condition that is higher priority than the `"production"` condition.

## Maintainers

[The Starbeam team](https://github.com/starbeamjs/.github/blob/main/TEAM.md).

## Contributing

See [the contributing file](CONTRIBUTING.md)!

## License

MIT © 2023 Yehuda Katz
