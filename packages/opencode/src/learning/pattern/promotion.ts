import { dedupeKey } from "./learned"
import { globalPatternObservations, globalPatterns } from "../paths"
import { LearningStore } from "../store"
import type { Pattern } from "../schema"

type Observation = { key: string; projects: string[]; pattern: Pattern; updatedAt: string }

export async function observe(
  store: LearningStore,
  patterns: readonly Pattern[],
  projectID: string,
  threshold = 3,
  files = { observations: globalPatternObservations(), patterns: globalPatterns() },
) {
  if (!patterns.length || threshold < 1) return []
  const observations = await store.read(files.observations, [] as Observation[])
  const promoted = await store.read(files.patterns, [] as Pattern[])
  const added: Pattern[] = []
  for (const pattern of patterns) {
    const command = pattern.fixes.find((fix) => fix.trusted)?.command
    if (!command) continue
    const key = dedupeKey(pattern.regex, command)
    const index = observations.findIndex((entry) => entry.key === key)
    const current = index >= 0 ? observations[index]! : { key, projects: [], pattern, updatedAt: "" }
    const next = { ...current, projects: [...new Set([...current.projects, projectID])], pattern, updatedAt: new Date().toISOString() }
    if (index >= 0) observations[index] = next
    else observations.push(next)
    if (next.projects.length < threshold || promoted.some((entry) => dedupeKey(entry.regex, entry.fixes[0]?.command) === key)) continue
    const global: Pattern = { ...pattern, scope: "global", projectID: undefined, provenance: `cross-project:${next.projects.length}`, updatedAt: next.updatedAt }
    promoted.push(global)
    added.push(global)
  }
  await store.write(files.observations, observations.slice(-1000))
  if (added.length) await store.write(files.patterns, promoted.slice(-500))
  return added
}
