import type { RecallRow } from "./types"

export function reconcile(rows: readonly RecallRow[], ids: readonly string[], now = Date.now()) {
  const active = new Set(ids)
  return rows.filter((row) => active.has(row.id) && (!row.validUntil || Date.parse(row.validUntil) > now))
}
