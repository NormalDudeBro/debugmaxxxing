import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { LearningStore } from "@/learning/store"
import { indexCode, indexSummary, query } from "@/learning/knowledge"
import { tmpdir } from "../fixture/fixture"

describe("learning knowledge indexing", () => {
  test("indexes compaction summaries into wiki and graph", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await indexSummary(store, tmp.path, { sessionID: "session-1", summary: "Resolved the deployment blocker" })
    const wiki = await query(store, tmp.path, { terms: ["deployment"], target: "wiki" }) as Array<{ body: string }>
    const graph = await query(store, tmp.path, { terms: ["deployment"], target: "graph" }) as { nodes: unknown[] }
    expect(wiki[0]?.body).toContain("deployment blocker")
    expect(graph.nodes).toHaveLength(1)
  })

  test("builds a bounded codegraph and excludes generated/private directories", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await fs.mkdir(path.join(tmp.path, "src"), { recursive: true })
    await fs.mkdir(path.join(tmp.path, "node_modules", "ignored"), { recursive: true })
    await fs.writeFile(path.join(tmp.path, "src", "main.ts"), "export function runSession() {}")
    await fs.writeFile(path.join(tmp.path, "node_modules", "ignored", "index.ts"), "export function hidden() {}")
    expect(await indexCode(store, tmp.path)).toBe(1)
    const results = await query(store, tmp.path, { terms: ["runSession"], target: "codegraph" }) as Array<{ path: string }>
    expect(results.map((item) => item.path)).toEqual(["src/main.ts"])
  })
})
