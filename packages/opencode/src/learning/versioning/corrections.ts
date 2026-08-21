import { createHash } from "node:crypto"
import { globalCorrections, projectCorrections } from "../paths"
import { LearningStore } from "../store"
import { classify, redactSecrets } from "../privacy"
import type { Correction } from "../schema"

export async function add(store: LearningStore, worktree: string, rule: string, scope: "project" | "global" = "project") {
  const clean = redactSecrets(rule).trim().slice(0, 1000)
  if (!clean || classify({ content: rule }) === "sensitive") return
  const file = scope === "global" ? globalCorrections() : projectCorrections(worktree)
  const entries = await store.read(file, [] as Correction[])
  const id = correctionID(clean)
  const now = new Date().toISOString()
  const existing = entries.find((entry) => entry.id === id)
  if (existing) {
    const index = entries.indexOf(existing)
    entries[index] = { ...existing, strength: existing.strength + 1, updatedAt: now }
  } else {
    entries.push({ id, rule: clean, scope, strength: 1, createdAt: now, updatedAt: now, version: 1 })
  }
  await store.write(file, entries.slice(-200))
  return id
}

export async function load(store: LearningStore, worktree: string) {
  const [global, project] = await Promise.all([
    store.read(globalCorrections(), [] as Correction[]),
    store.read(projectCorrections(worktree), [] as Correction[]),
  ])
  const merged = new Map(global.map((entry) => [entry.id, entry]))
  for (const entry of project) merged.set(entry.id, entry)
  return [...merged.values()].sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))
}

export function promptContext(corrections: readonly Correction[], maxChars = 1100) {
  let total = 0
  const lines: string[] = []
  for (const correction of corrections) {
    const line = `- ${correction.rule}`
    if (total + line.length > maxChars) continue
    lines.push(line)
    total += line.length
  }
  return lines.length ? `User corrections and learned behavior:\n${lines.join("\n")}` : ""
}

export function decay(corrections: readonly Correction[]) {
  return corrections.map((entry) => ({ ...entry, strength: Math.max(1, entry.strength - 1) }))
}

export function correctionID(rule: string) {
  return `correction-${createHash("sha256").update(rule.trim().toLowerCase()).digest("hex").slice(0, 16)}`
}
