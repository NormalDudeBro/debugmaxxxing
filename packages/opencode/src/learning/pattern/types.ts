export type { Fix, Pattern, PatternMatch } from "../schema"

export type RankedMatch = {
  pattern: import("../schema").Pattern
  captures: string[]
  score: readonly [number, number, number, number, string]
}
