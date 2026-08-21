import { Database } from "bun:sqlite"
import type { RecallDatabase, Value } from "./sqlite"

export function open(filename: string): RecallDatabase {
  const db = new Database(filename, { create: true, strict: true })
  return {
    exec: (sql) => db.exec(sql),
    all: (sql, params = []) => db.query(sql).all(...params) as Array<Record<string, unknown>>,
    run: (sql, params = []) => { db.query(sql).run(...params) },
    close: () => db.close(),
  }
}

export type { Value }
