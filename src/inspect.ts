// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClass = abstract new (...args: any[]) => any;

export function inspector<T extends AnyClass>(
  Class: T,
  inspect: (instance: InstanceType<T>) => object,
): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Class.prototype[Symbol.for("nodejs.util.inspect.custom")] = function (
      this: InstanceType<T>,
    ) {
      return inspect(this);
    };
  }
}
