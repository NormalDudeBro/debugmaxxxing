import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { LearningStore } from "@/learning/store"
import { promote } from "@/learning/versioning/promotion"
import { consolidate } from "@/learning/dream"
import { projectCorrections, projectMemories, projectPatterns } from "@/learning/paths"
import type { Correction, Memory, Pattern } from "@/learning/schema"
import { tmpdir } from "../fixture/fixture"

describe("learning Dream", () => {
  test("promotes eligible corrections into one deterministic AGENTS section", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const correction: Correction = { id: "use-bun", rule: "Use bun, not npm", scope: "project", strength: 3, createdAt: "now", updatedAt: "now" }
    await fs.writeFile(path.join(tmp.path, "AGENTS.md"), "# Instructions\n\n## Existing\nKeep this.\n")
    expect(await promote(store, tmp.path, [correction])).toEqual(["use-bun"])
    expect(await promote(store, tmp.path, [correction])).toEqual([])
    const content = await fs.readFile(path.join(tmp.path, "AGENTS.md"), "utf8")
    expect(content.match(/## Learned Corrections/g)).toHaveLength(1)
    expect(content.match(/Use bun, not npm/g)).toHaveLength(1)
    expect(content).toContain("## Existing")
  })

  test("deduplicates and prunes state while promoting strong corrections", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const pattern: Pattern = { id: "one", regex: "Error: missing", category: "test", description: "missing", fixes: [], scope: "project", success: 0, failures: 0 }
    const memory: Memory = { id: "one", summary: "old", content: "old", scope: "project", privacy: "public", createdAt: "2020-01-01T00:00:00.000Z" }
    const correction: Correction = { id: "rule", rule: "Use bun, not npm", scope: "project", strength: 3, createdAt: "now", updatedAt: "now" }
    await store.write(projectPatterns(tmp.path), [pattern, { ...pattern, id: "two" }, { ...pattern, id: "bad", regex: ".*" }])
    await store.write(projectMemories(tmp.path), [memory, { ...memory, id: "two" }])
    await store.write(projectCorrections(tmp.path), [correction])
    const result = await consolidate(store, tmp.path, { retentionDays: 1 })
    expect(result.removedPatterns).toBe(2)
    expect(result.removedMemories).toBe(2)
    expect(result.promoted).toEqual(["rule"])
    expect((await store.read(projectCorrections(tmp.path), [] as Correction[]))[0]).toMatchObject({ strength: 2 })
  })
})
