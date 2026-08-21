import fs from "node:fs/promises"
import path from "node:path"
import { open } from "#learning-sqlite"
import { projectRecall } from "../paths"
import type { RecallRow } from "./types"

type Database = { version: 1; model: string; rows: RecallRow[] }

export async function read(_store: unknown, worktree: string, model: string) {
  const db = await connect(projectRecall(worktree))
  try {
    migrate(db)
    const current = db.all("SELECT value FROM recall_meta WHERE key = ?", ["model"])[0]?.value
    if (current !== model) {
      db.exec("BEGIN IMMEDIATE")
      try {
        db.run("DELETE FROM recall_rows")
        db.run("INSERT OR REPLACE INTO recall_meta(key, value) VALUES(?, ?)", ["model", model])
        db.exec("COMMIT")
      } catch (error) {
        db.exec("ROLLBACK")
        throw error
      }
      return { version: 1, model, rows: [] } satisfies Database
    }
    const rows = db.all("SELECT id, source, text, hash, embedding, model, updated_at, valid_until FROM recall_rows ORDER BY id").map(decode)
    return { version: 1, model, rows } satisfies Database
  } finally {
    db.close()
  }
}

export async function write(_store: unknown, worktree: string, value: Database) {
  const db = await connect(projectRecall(worktree))
  try {
    migrate(db)
    db.exec("BEGIN IMMEDIATE")
    try {
      db.run("DELETE FROM recall_rows")
      db.run("INSERT OR REPLACE INTO recall_meta(key, value) VALUES(?, ?)", ["model", value.model])
      for (const row of value.rows) {
        db.run(
          "INSERT INTO recall_rows(id, source, text, hash, embedding, model, updated_at, valid_until) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
          [row.id, row.source, row.text, row.hash, row.embedding ? JSON.stringify(row.embedding) : null, row.model, row.updatedAt, row.validUntil ?? null],
        )
      }
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  } finally {
    db.close()
  }
}

async function connect(file: string) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const legacy = await fs.readFile(file, "utf8").catch(() => "")
  if (legacy.trimStart().startsWith("{")) await fs.rm(file, { force: true })
  return open(file)
}

function migrate(db: ReturnType<typeof open>) {
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;")
  db.exec("CREATE TABLE IF NOT EXISTS recall_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
  db.exec("CREATE TABLE IF NOT EXISTS recall_rows (id TEXT PRIMARY KEY, source TEXT NOT NULL, text TEXT NOT NULL, hash TEXT NOT NULL, embedding TEXT, model TEXT NOT NULL, updated_at TEXT NOT NULL, valid_until TEXT)")
}

function decode(row: Record<string, unknown>): RecallRow {
  return {
    id: String(row.id),
    source: String(row.source),
    text: String(row.text),
    hash: String(row.hash),
    embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) as number[] : undefined,
    model: String(row.model),
    updatedAt: String(row.updated_at),
    validUntil: typeof row.valid_until === "string" ? row.valid_until : undefined,
  }
}
