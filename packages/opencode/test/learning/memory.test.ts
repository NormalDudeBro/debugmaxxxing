import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import { LearningStore } from "@/learning/store"
import { load, prune, query, save, type MemoryEntry } from "@/learning/memory"
import { projectMemories } from "@/learning/paths"
import { tmpdir } from "../fixture/fixture"

describe("learning memory", () => {
  test("encrypts sensitive records and excludes never-send context", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await save(store, tmp.path, { summary: "deployment token", content: "token=abcdefghijklmnopqrstuvwxyz", path: ".env" })
    const raw = await fs.readFile(projectMemories(tmp.path), "utf8")
    expect(raw).not.toContain("abcdefghijklmnopqrstuvwxyz")
    const entries = await load(store, tmp.path)
    expect(entries[0]?.privacy).toBe("never_send")
    expect(query(entries, ["deployment"])).toEqual([])
  })

  test("deduplicates, ranks tags, and observes the character budget", () => {
    const base = { scope: "project", privacy: "public", accessCount: 0, version: 1 } as const
    const entries: MemoryEntry[] = [
      { ...base, id: "old", summary: "build", content: "old", tags: ["bun"], accessCount: 2, createdAt: "2024-01-01T00:00:00.000Z" },
      { ...base, id: "new", summary: "build", content: "new", tags: ["bun"], createdAt: "2025-01-01T00:00:00.000Z" },
      { ...base, id: "other", summary: "other", content: "bun details", createdAt: "2025-01-02T00:00:00.000Z" },
    ]
    expect(prune(entries)).toHaveLength(2)
    expect(query(entries, ["bun"], 5, 20)[0]?.id).toBe("old")
    expect(query(entries, ["bun"], 5, 5)).toEqual([])
  })
})
