export function pluralizeWithNumber(
  n: number,
  s: string,
  plural: string = "",
): string {
  return n + " " + (n == 1 ? s : plural === "" ? s + "s" : plural);
}

export function pluralize(n: number, s: string, plural: string = ""): string {
  return n == 1 ? s : plural === "" ? s + "s" : plural;
}

export function grammaticalList(
  s: string[],
  defaultValue: string = "",
): string {
  if (s.length === 0) return defaultValue;
  if (s.length === 1) return s[0];
  if (s.length === 2) return s[0] + " and " + s[1];
  return `${s.slice(0, s.length - 1).join(", ")} and ${s[s.length - 1]}`;
}

export function snakeCaseToTitleCase(snakeCaseString: string): string {
  return snakeCaseString
    .split("_")
    .map((it) => it.slice(0, 1).toUpperCase() + it.slice(1).toLowerCase())
    .join(" ");
}
