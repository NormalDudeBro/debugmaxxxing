import { createHash } from "node:crypto"
import { projectCommit, projectHead } from "../paths"
import { LearningStore } from "../store"
import type { StateCommit, StateHead } from "../schema"

export async function commit(store: LearningStore, worktree: string, input: { summary: string; sessionID?: string }) {
  const head = await store.read(projectHead(worktree), { updatedAt: new Date(0).toISOString() } as StateHead)
  const createdAt = new Date().toISOString()
  const content = { parent: head.commit, sessionID: input.sessionID, summary: input.summary.slice(0, 5000), createdAt, version: 1 }
  const id = createHash("sha256").update(JSON.stringify(content)).digest("hex")
  const value: StateCommit = { id, ...content }
  await store.write(projectCommit(worktree, id), value)
  await store.write(projectHead(worktree), { commit: id, updatedAt: createdAt, version: 1 } satisfies StateHead)
  return value
}

export async function history(store: LearningStore, worktree: string, limit = 50) {
  const values: StateCommit[] = []
  let id = (await store.read(projectHead(worktree), {} as StateHead)).commit
  const seen = new Set<string>()
  while (id && values.length < limit && !seen.has(id)) {
    seen.add(id)
    const value = await store.read(projectCommit(worktree, id), undefined as StateCommit | undefined)
    if (!value || value.id !== id) break
    values.push(value)
    id = value.parent
  }
  return values
}
