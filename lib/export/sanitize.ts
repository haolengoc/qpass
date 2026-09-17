const DANGEROUS_PREFIXES = ["=", "+", "-", "@"];

export function sanitizeSpreadsheetCell(value: unknown) {
  if (typeof value !== "string") return value;
  if (DANGEROUS_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return `'${value}`;
  }
  return value;
}
