export type Value = string | number | bigint | Uint8Array | null

export interface RecallDatabase {
  exec(sql: string): void
  all(sql: string, params?: readonly Value[]): Array<Record<string, unknown>>
  run(sql: string, params?: readonly Value[]): void
  close(): void
}
