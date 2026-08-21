import { createHash } from "node:crypto"
import { Schema } from "effect"
import { projectCommunityPacks } from "../paths"
import { LearningStore } from "../store"
import type { Pattern } from "../schema"
import { isSafeRegex } from "./matcher"

const RemoteFix = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  command: Schema.optional(Schema.String),
  instructions: Schema.optional(Schema.String),
  priority: Schema.optional(Schema.Number),
  trusted: Schema.optional(Schema.Boolean),
})
const RemotePattern = Schema.Struct({
  id: Schema.String,
  regex: Schema.String,
  category: Schema.optional(Schema.String),
  description: Schema.String,
  fixes: Schema.Array(RemoteFix),
})
const RemotePack = Schema.Struct({ name: Schema.String, version: Schema.String, patterns: Schema.Array(RemotePattern) })
type StoredPack = { name: string; version: string; source: string; hash: string; installedAt: string; patterns: Pattern[] }
type Request = (input: URL) => Promise<Response>

export async function install(
  store: LearningStore,
  worktree: string,
  url: string,
  request: Request = (input) => fetch(input),
) {
  const source = new URL(url)
  if (source.protocol !== "https:") throw new Error("community packs require HTTPS")
  if (source.username || source.password) throw new Error("community pack URLs cannot include credentials")
  const response = await request(source)
  if (!response.ok) throw new Error(`community pack download failed: ${response.status}`)
  if (response.url && new URL(response.url).protocol !== "https:") throw new Error("community pack redirects must remain on HTTPS")
  const declared = Number(response.headers.get("content-length") ?? 0)
  if (declared > 1_000_000) throw new Error("community pack exceeds 1 MB")
  const text = await response.text()
  if (text.length > 1_000_000) throw new Error("community pack exceeds 1 MB")
  const decoded = Schema.decodeUnknownSync(RemotePack)(JSON.parse(text))
  if (!decoded.patterns.length || decoded.patterns.length > 500) throw new Error("community pack must contain 1-500 patterns")
  if (decoded.patterns.some((pattern) => !isSafeRegex(pattern.regex))) throw new Error("community pack contains an unsafe regex")
  const hash = createHash("sha256").update(text).digest("hex")
  const patterns: Pattern[] = decoded.patterns.map((pattern) => ({
    id: pattern.id,
    regex: pattern.regex,
    category: pattern.category ?? "community",
    description: pattern.description,
    fixes: pattern.fixes.map((fix) => ({ ...fix, priority: fix.priority ?? 1, trusted: false })),
    scope: "community",
    success: 0,
    failures: 0,
    version: 1,
    provenance: `remote-pack:${decoded.name}@${decoded.version}:${hash}`,
  }))
  const file = projectCommunityPacks(worktree)
  const packs = await store.read(file, [] as StoredPack[])
  const value: StoredPack = { name: decoded.name, version: decoded.version, source: url, hash, installedAt: new Date().toISOString(), patterns }
  const index = packs.findIndex((pack) => pack.name === value.name)
  if (index >= 0) packs[index] = value
  else packs.push(value)
  await store.write(file, packs.slice(-50))
  return { name: value.name, version: value.version, hash: value.hash, patterns: patterns.length }
}

export async function load(store: LearningStore, worktree: string) {
  const packs = await store.read(projectCommunityPacks(worktree), [] as StoredPack[])
  return packs.flatMap((pack) => pack.patterns).slice(-1000)
}
