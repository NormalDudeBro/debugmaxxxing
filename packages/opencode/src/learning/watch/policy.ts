export type Policy = { id: string; pattern: RegExp; severity: "info" | "warning" | "error"; message: string }

export const defaults: readonly Policy[] = [
  { id: "destructive-git", pattern: /\bgit\s+(?:reset\s+--hard|push\s+--force)\b/i, severity: "warning", message: "Destructive git command observed" },
  { id: "recursive-delete", pattern: /\b(?:rm\s+-rf|Remove-Item\s+.+-Recurse)\b/i, severity: "warning", message: "Recursive deletion observed" },
]

export function evaluate(value: string, policies: readonly Policy[] = defaults) {
  return policies.filter((policy) => policy.pattern.test(value)).map(({ pattern: _, ...policy }) => policy)
}
