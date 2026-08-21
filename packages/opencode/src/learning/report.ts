import { LearningStore } from "./store"
import { list } from "./audit"

export async function report(store: LearningStore, worktree: string) {
  const entries = await list(store, worktree, { limit: 5000 })
  const counts: Record<string, number> = {}
  for (const event of entries) counts[event.type] = (counts[event.type] ?? 0) + 1
  return {
    events: entries.length,
    matches: counts["pattern.match"] ?? 0,
    misses: counts["pattern.miss"] ?? 0,
    recoveries: counts["recovery.success"] ?? 0,
    counts,
  }
}
