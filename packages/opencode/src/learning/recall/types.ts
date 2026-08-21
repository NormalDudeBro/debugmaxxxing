export type RecallRow = {
  id: string
  source: string
  text: string
  hash: string
  embedding?: number[]
  model: string
  updatedAt: string
  validUntil?: string
}

export type RecallStatus = {
  ready: boolean
  mode: "semantic" | "lexical"
  model: string | null
  cache: string
}
