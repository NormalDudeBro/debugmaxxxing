import path from "node:path"
import { LearningStore } from "../store"
import { classify, redactSecrets } from "../privacy"
import type { Correction } from "../schema"

const heading = "## Learned Corrections"

export async function promote(store: LearningStore, worktree: string, corrections: readonly Correction[], threshold = 3) {
  const eligible = corrections.filter((entry) => entry.strength >= threshold && classify({ content: entry.rule }) !== "sensitive" && classify({ content: entry.rule }) !== "never_send")
  if (!eligible.length) return []
  const file = path.join(worktree, "AGENTS.md")
  const original = await store.readText(file)
  const start = original.indexOf(heading)
  const tail = start >= 0 ? original.slice(start + heading.length) : ""
  const nextHeading = tail.search(/\n##\s+/)
  const before = start >= 0 ? original.slice(0, start).trimEnd() : original.trimEnd()
  const existingSection = nextHeading >= 0 ? tail.slice(0, nextHeading) : tail
  const after = nextHeading >= 0 ? tail.slice(nextHeading).trimStart() : ""
  const lines = existingSection.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const added: string[] = []
  for (const correction of eligible) {
    const marker = `<!-- learning:${correction.id} -->`
    if (lines.some((line) => line.includes(marker))) continue
    lines.push(`${marker} - ${redactSecrets(correction.rule)}`)
    added.push(correction.id)
  }
  if (!added.length) return []
  const content = `${before}${before ? "\n\n" : ""}${heading}\n${lines.join("\n")}\n${after ? `\n${after}\n` : ""}`
  await store.writeText(file, content)
  return added
}
