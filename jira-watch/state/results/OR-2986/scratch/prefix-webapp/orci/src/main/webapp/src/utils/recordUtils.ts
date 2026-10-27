export type ObjectEntry<T> = {
  [K in Exclude<keyof T, undefined>]: [K, T[K]];
}[Exclude<keyof T, undefined>];

export const objectEntries = Object.entries as <T>(
  o: T,
) => Array<ObjectEntry<T>>;
