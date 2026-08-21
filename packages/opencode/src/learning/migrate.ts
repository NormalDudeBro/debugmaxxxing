import fs from "node:fs/promises"
import path from "node:path"
import { LearningStore } from "./store"
import { migrationMarker, projectLearningDir, projectMemories, projectPatterns } from "./paths"
import type { Pattern } from "./schema"

const VERSION = 1

type LegacyLearned = {
  approved?: Array<Record<string, unknown>>
  patterns?: Array<Record<string, unknown>>
}

export async function migrateLegacy(worktree: string, store = new LearningStore()) {
  const marker = migrationMarker(worktree)
  const completed = await store.read(marker, { version: 0, sources: [] as string[] })
  if (completed.version >= VERSION) return completed

  const sources: string[] = []
  const patternFiles = [
    path.join(worktree, ".cyxcode", "patterns", "learned.json"),
    path.join(worktree, ".opencode", "cyxcode-learned.json"),
  ]
  const patterns = await store.read(projectPatterns(worktree), [] as Pattern[])
  for (const file of patternFiles) {
    const legacy = await readLegacy(file)
    if (!legacy) continue
    sources.push(file)
    for (const item of [...(legacy.approved ?? []), ...(legacy.patterns ?? [])]) {
      const regex = string(item.regex ?? item.pattern)
      if (!regex || patterns.some((entry) => entry.regex === regex)) continue
      patterns.push({
        id: string(item.id ?? item.name) ?? `migrated-${patterns.length + 1}`,
        regex,
        category: string(item.category) ?? "migrated",
        description: string(item.description ?? item.error) ?? "Migrated learned pattern",
        fixes: toFixes(item),
        scope: "project",
        success: number(item.success),
        failures: number(item.failures),
        version: 1,
        provenance: file,
      })
    }
  }

  const memoryDirs = [path.join(worktree, ".opencode", "memory"), path.join(worktree, ".cyxcode", "memory")]
  const memories = await store.read(projectMemories(worktree), [] as unknown[])
  for (const dir of memoryDirs) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue
      const file = path.join(dir, entry.name)
      const value = await readLegacy(file)
      if (!value) continue
      sources.push(file)
      memories.push(value)
    }
  }

  await store.ensureProject(worktree)
  if (patterns.length) await store.write(projectPatterns(worktree), patterns.slice(-500))
  if (memories.length) await store.write(projectMemories(worktree), memories.slice(-200))
  const result = { version: VERSION, migratedAt: new Date().toISOString(), sources: [...new Set(sources)] }
  await store.write(marker, result)
  return result
}

async function readLegacy(file: string): Promise<LegacyLearned | undefined> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as LegacyLearned
  } catch {
    return
  }
}

function string(value: unknown) {
  return typeof value === "string" && value ? value : undefined
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function toFixes(item: Record<string, unknown>): Pattern["fixes"] {
  const command = string(item.fix ?? item.command)
  if (!command) return []
  return [{ id: "migrated-fix", description: "Migrated suggested fix", command, priority: 1, trusted: false }]
}

export function learningDirectory(worktree: string) {
  return projectLearningDir(worktree)
}
