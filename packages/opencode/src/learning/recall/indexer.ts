import { createHash } from "node:crypto"
import { LearningStore } from "../store"
import { read, write } from "./db"
import { embed } from "./embedder"
import type { RecallRow } from "./types"

export async function index(
  store: LearningStore,
  worktree: string,
  input: readonly Pick<RecallRow, "id" | "source" | "text" | "validUntil">[],
  model: string,
  encode: (text: string, model: string) => Promise<number[]> = embed,
) {
  const db = await read(store, worktree, model)
  const previous = new Map(db.rows.map((row) => [row.id, row]))
  const rows: RecallRow[] = []
  for (const item of input.slice(0, 1000)) {
    const hash = createHash("sha256").update(item.text).digest("hex")
    const existing = previous.get(item.id)
    if (existing?.hash === hash && existing.embedding) {
      rows.push(existing)
      continue
    }
    rows.push({ ...item, hash, embedding: await encode(item.text, model), model, updatedAt: new Date().toISOString() })
  }
  await write(store, worktree, { version: 1, model, rows })
  return rows
}
