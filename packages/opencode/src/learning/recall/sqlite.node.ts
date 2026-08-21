import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import type { RecallDatabase, Value } from "./sqlite"

export function open(filename: string): RecallDatabase {
  const db = new DatabaseSync(filename)
  return {
    exec: (sql) => db.exec(sql),
    all: (sql, params = []) => db.prepare(sql).all(...params as SQLInputValue[]) as Array<Record<string, unknown>>,
    run: (sql, params = []) => { db.prepare(sql).run(...params as SQLInputValue[]) },
    close: () => db.close(),
  }
}

export type { Value }
