import { createHash } from "node:crypto"
import { globalKey, globalMemories, projectKey, projectMemories } from "./paths"
import { LearningStore } from "./store"
import { classify, redactSecrets, type PrivacyClass } from "./privacy"
import { loadKey, loadOrCreateKey, open, seal, type Sealed } from "./crypto"

export type MemoryEntry = {
  id: string
  summary: string
  content: string
  scope: "project" | "global"
  privacy: PrivacyClass
  tags?: string[]
  createdAt: string
  updatedAt?: string
  accessedAt?: string
  accessCount?: number
  version?: number
}

const ENCRYPTED = "encrypted:v1:"

export async function save(
  store: LearningStore,
  worktree: string,
  input: { summary: string; content: string; scope?: "project" | "global"; tags?: string[]; path?: string },
) {
  const scope = input.scope ?? "project"
  const file = scope === "global" ? globalMemories() : projectMemories(worktree)
  const entries = await store.read(file, [] as MemoryEntry[])
  const summary = redactSecrets(input.summary).slice(0, 500)
  const privacy = classify({ path: input.path, content: input.content, tags: input.tags })
  const id = `memory-${createHash("sha256").update(summary.toLowerCase()).digest("hex").slice(0, 16)}`
  const now = new Date().toISOString()
  const content = await persistContent(redactSecrets(input.content).slice(0, 10_000), privacy, scope === "global" ? globalKey() : projectKey(worktree))
  const existing = entries.find((item) => item.id === id)
  if (existing) {
    Object.assign(existing, { summary, content, privacy, tags: input.tags, updatedAt: now })
  } else {
    entries.push({ id, summary, content, scope, privacy, tags: input.tags, createdAt: now, accessCount: 0, version: 1 })
  }
  await store.write(file, entries.slice(-200))
  return id
}

export async function load(store: LearningStore, worktree: string) {
  const [global, project] = await Promise.all([
    decodeEntries(await store.read(globalMemories(), [] as MemoryEntry[]), globalKey()),
    decodeEntries(await store.read(projectMemories(worktree), [] as MemoryEntry[]), projectKey(worktree)),
  ])
  const merged = new Map(global.map((entry) => [entry.id, entry]))
  for (const entry of project) merged.set(entry.id, entry)
  return [...merged.values()]
}

export function query(entries: readonly MemoryEntry[], terms: readonly string[], limit = 8, maxChars = 2000) {
  const normalized = terms.map((term) => term.toLowerCase()).filter(Boolean)
  let chars = 0
  return entries
    .filter((entry) => entry.privacy !== "never_send")
    .map((entry) => {
      const text = `${entry.summary} ${entry.content}`.toLowerCase()
      const tagSet = new Set(entry.tags?.map((tag) => tag.toLowerCase()))
      const score = normalized.reduce((total, term) => total + (text.includes(term) ? 1 : 0) + (tagSet.has(term) ? 2 : 0), 0)
      return { entry, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.entry.accessCount ?? 0) - (a.entry.accessCount ?? 0) || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit)
    .filter(({ entry }) => {
      const size = entry.summary.length + entry.content.length
      if (chars + size > maxChars) return false
      chars += size
      return true
    })
    .map((item) => item.entry)
}

export function prune(entries: readonly MemoryEntry[], input: { max?: number; staleBefore?: number } = {}) {
  const deduped = new Map<string, MemoryEntry>()
  for (const entry of entries) {
    const key = entry.summary.trim().toLowerCase()
    const previous = deduped.get(key)
    if (!previous || Date.parse(entry.updatedAt ?? entry.createdAt) >= Date.parse(previous.updatedAt ?? previous.createdAt)) deduped.set(key, entry)
  }
  return [...deduped.values()]
    .filter((entry) => !input.staleBefore || (entry.accessCount ?? 0) > 0 || Date.parse(entry.updatedAt ?? entry.createdAt) >= input.staleBefore)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .slice(-(input.max ?? 200))
}

async function persistContent(content: string, privacy: PrivacyClass, keyFile: string) {
  if (privacy !== "sensitive" && privacy !== "never_send") return content
  return ENCRYPTED + JSON.stringify(seal(content, await loadOrCreateKey(keyFile)))
}

async function decodeEntries(entries: MemoryEntry[], keyFile: string) {
  let key: Uint8Array | undefined
  const result: MemoryEntry[] = []
  for (const entry of entries) {
    if (!entry.content.startsWith(ENCRYPTED)) {
      result.push(entry)
      continue
    }
    try {
      key ??= await loadKey(keyFile)
      result.push({ ...entry, content: open(JSON.parse(entry.content.slice(ENCRYPTED.length)) as Sealed, key) })
    } catch {
      // A missing or replaced key makes only that private record unavailable.
    }
  }
  return result
}
