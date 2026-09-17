export function inlineSafe(value: string | undefined, max = 120): string {
  if (!value) return ""
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= max) return normalized
  return normalized.slice(0, max - 1) + "…"
}
