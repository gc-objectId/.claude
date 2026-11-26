import { Static, String, Symbol } from "runtypes";

const LOADING = Symbol.withBrand("LOADING");
type LOADING = Static<typeof LOADING>;

export type Loadable<T> = LOADING | T;

export function loading<T>(): Loadable<T> {
  return LOADING as Loadable<T>;
}

export function isLoaded<U>(loadable: Loadable<U>): loadable is U {
  return !isLoading(loadable);
}

export function isLoading<U>(loadable: Loadable<U>): loadable is LOADING {
  return loadable === LOADING;
}
