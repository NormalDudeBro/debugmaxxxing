import { projectCorrections, projectMemories, projectPatterns } from "./paths"
import { LearningStore } from "./store"
import { dedupePatterns } from "./pattern/learned"
import { isSafeRegex } from "./pattern/matcher"
import { prune as pruneMemories, type MemoryEntry } from "./memory"
import { decay } from "./versioning/corrections"
import { promote } from "./versioning/promotion"
import { prune as pruneAudit } from "./audit"
import type { Correction, Pattern } from "./schema"

export async function consolidate(
  store: LearningStore,
  worktree: string,
  options: { patternLimit?: number; memoryLimit?: number; auditLimit?: number; retentionDays?: number; promotionThreshold?: number; autoPromote?: boolean } = {},
) {
  const patterns = await store.read(projectPatterns(worktree), [] as Pattern[])
  const nextPatterns = dedupePatterns(patterns.filter((pattern) => isSafeRegex(pattern.regex))).slice(-(options.patternLimit ?? 500))
  if (JSON.stringify(nextPatterns) !== JSON.stringify(patterns)) await store.write(projectPatterns(worktree), nextPatterns)

  const memories = await store.read(projectMemories(worktree), [] as MemoryEntry[])
  const staleBefore = Date.now() - (options.retentionDays ?? 90) * 86_400_000
  const nextMemories = pruneMemories(memories, { max: options.memoryLimit ?? 200, staleBefore })
  if (JSON.stringify(nextMemories) !== JSON.stringify(memories)) await store.write(projectMemories(worktree), nextMemories)

  const corrections = await store.read(projectCorrections(worktree), [] as Correction[])
  const promoted = options.autoPromote === false ? [] : await promote(store, worktree, corrections, options.promotionThreshold ?? 3)
  const nextCorrections = decay(corrections).map((entry) => promoted.includes(entry.id) ? { ...entry, promotedAt: new Date().toISOString() } : entry)
  if (nextCorrections.length) await store.write(projectCorrections(worktree), nextCorrections)

  const auditEvents = await pruneAudit(store, worktree, { before: staleBefore, max: options.auditLimit ?? 5000 })
  return {
    removedPatterns: patterns.length - nextPatterns.length,
    removedMemories: memories.length - nextMemories.length,
    promoted,
    auditEvents,
  }
}
