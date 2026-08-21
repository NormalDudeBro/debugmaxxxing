import type { Pattern } from "../schema"
import { bestMatch, findMatches } from "./matcher"
import { dedupePatterns } from "./learned"

export class PatternRegistry {
  readonly patterns: readonly Pattern[]

  constructor(input: {
    project?: readonly Pattern[]
    global?: readonly Pattern[]
    community?: readonly Pattern[]
    bundled?: readonly Pattern[]
  }) {
    this.patterns = dedupePatterns([
      ...(input.project ?? []).map((pattern) => ({ ...pattern, scope: "project" as const })),
      ...(input.global ?? []).map((pattern) => ({ ...pattern, scope: "global" as const })),
      ...(input.community ?? []).map((pattern) => ({ ...pattern, scope: "community" as const })),
      ...(input.bundled ?? []).map((pattern) => ({ ...pattern, scope: "bundled" as const })),
    ])
  }

  match(output: string) {
    return bestMatch(this.patterns, output)
  }

  matches(output: string) {
    return findMatches(this.patterns, output)
  }
}
