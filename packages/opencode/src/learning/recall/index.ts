import { LearningStore } from "../store"
import { load, query, type MemoryEntry } from "../memory"
import { cosine } from "./vector"
import { read } from "./db"
import { DEFAULT_MODEL, downloadModel as download, embed, removeModel, status as modelStatus } from "./embedder"

export async function similar(
  store: LearningStore,
  worktree: string,
  terms: readonly string[],
  limit = 8,
  options: { semantic?: boolean; model?: string; threshold?: number; encode?: typeof embed } = {},
) {
  const memories = await load(store, worktree)
  if (options.semantic !== false) {
    try {
      const model = options.model ?? DEFAULT_MODEL
      const vector = await (options.encode ?? embed)(terms.join(" "), model)
      const db = await read(store, worktree, model)
      const byID = new Map(memories.map((memory) => [memory.id, memory]))
      const semantic = db.rows
        .filter((row) => row.embedding && byID.has(row.id))
        .map((row) => ({ memory: byID.get(row.id)!, score: cosine(vector, row.embedding!) }))
        .filter((item) => item.score >= (options.threshold ?? 0.35))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((item) => item.memory)
      if (semantic.length) return semantic
    } catch {
      // Offline, model, and vector-store failures fall back to lexical recall.
    }
  }
  return query(memories, terms, limit)
}

export async function status(model = DEFAULT_MODEL) {
  return modelStatus(model)
}

export async function deleteModel() {
  await removeModel()
}

export async function downloadModel(model = DEFAULT_MODEL) {
  return download(model)
}

export type { MemoryEntry }
