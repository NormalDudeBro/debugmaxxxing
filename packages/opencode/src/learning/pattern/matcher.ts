import type { Pattern } from "../schema"
import type { RankedMatch } from "./types"

const scopeRank: Record<Pattern["scope"], number> = {
  project: 4,
  global: 3,
  community: 2,
  bundled: 1,
}

export function isSafeRegex(source: string) {
  if (!source || source.length > 500 || source === ".*" || source === "^.*$") return false
  if (/\([^)]*[+*][^)]*\)[+*{]/.test(source)) return false
  if (/(?:\.\*|\.\+)\s*(?:\.\*|\.\+)/.test(source)) return false
  try {
    new RegExp(source, "i")
    return true
  } catch {
    return false
  }
}

export function findMatches(patterns: readonly Pattern[], output: string): RankedMatch[] {
  return patterns
    .flatMap((pattern): RankedMatch[] => {
      if (!isSafeRegex(pattern.regex)) return []
      const result = new RegExp(pattern.regex, "i").exec(output)
      if (!result) return []
      const attempts = pattern.success + pattern.failures
      const successRate = attempts ? pattern.success / attempts : 0
      const trusted = pattern.fixes.some((fix) => fix.trusted === true) ? 1 : 0
      return [{ pattern, captures: result.slice(1), score: [scopeRank[pattern.scope], trusted, successRate, specificity(pattern.regex), pattern.id] }]
    })
    .sort(compare)
}

export function bestMatch(patterns: readonly Pattern[], output: string) {
  return findMatches(patterns, output)[0]
}

export function substituteCaptures(command: string, captures: readonly string[]) {
  return command.replace(/\$(\d+)|\{\{(\d+)\}\}/g, (token, dollar: string | undefined, braces: string | undefined) => {
    const index = Number(dollar ?? braces) - 1
    const value = captures[index]
    if (value === undefined) return token
    return shellQuote(value)
  })
}

function compare(a: RankedMatch, b: RankedMatch) {
  for (let index = 0; index < 4; index++) {
    const difference = (b.score[index] as number) - (a.score[index] as number)
    if (difference) return difference
  }
  return a.pattern.id.localeCompare(b.pattern.id)
}

function specificity(source: string) {
  return source.replace(/\\.|[\^$()[\]{}?*+|.]/g, "").length
}

function shellQuote(value: string) {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) return value
  return `'${value.replace(/'/g, `'"'"'`)}'`
}
