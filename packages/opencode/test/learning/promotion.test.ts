import { describe, expect, test } from "bun:test"
import { LearningStore } from "@/learning/store"
import { observe } from "@/learning/pattern/promotion"
import type { Pattern } from "@/learning/schema"
import { tmpdir } from "../fixture/fixture"
import path from "node:path"

const pattern: Pattern = {
  id: "verified",
  regex: "Error: dependency missing",
  category: "learned",
  description: "Dependency missing",
  fixes: [{ id: "fix", description: "install", command: "bun install", priority: 1, trusted: true }],
  scope: "project",
  success: 1,
  failures: 0,
}

describe("learning cross-project promotion", () => {
  test("promotes only after distinct project threshold and deduplicates repeats", async () => {
    const store = new LearningStore()
    await using tmp = await tmpdir()
    const files = { observations: path.join(tmp.path, "observations.json"), patterns: path.join(tmp.path, "patterns.json") }
    expect(await observe(store, [pattern], "project-a", 2, files)).toEqual([])
    expect(await observe(store, [pattern], "project-a", 2, files)).toEqual([])
    expect(await observe(store, [pattern], "project-b", 2, files)).toHaveLength(1)
    expect(await observe(store, [pattern], "project-c", 2, files)).toEqual([])
    const global = await store.read(files.patterns, [] as Pattern[])
    expect(global.filter((entry) => entry.id === "verified")).toHaveLength(1)
    expect(global[0]).toMatchObject({ scope: "global", provenance: "cross-project:2" })
  })
})
