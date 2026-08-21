import { describe, expect, test } from "bun:test"
import { LearningStore } from "@/learning/store"
import { save } from "@/learning/memory"
import { cosine } from "@/learning/recall/vector"
import { index } from "@/learning/recall/indexer"
import { read } from "@/learning/recall/db"
import { similar } from "@/learning/recall"
import { reconcile } from "@/learning/recall/reconcile"
import { tmpdir } from "../fixture/fixture"
import fs from "node:fs/promises"
import path from "node:path"
import { projectRecall } from "@/learning/paths"

describe("learning recall", () => {
  test("computes cosine similarity safely", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine([], [])).toBe(0)
  })

  test("indexes changed rows and resets on model version changes", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    let calls = 0
    const encode = async () => {
      calls++
      return [1, 0]
    }
    const rows = [{ id: "one", source: "memory", text: "build with bun" }]
    await index(store, tmp.path, rows, "model-a", encode)
    await index(store, tmp.path, rows, "model-a", encode)
    expect(calls).toBe(1)
    expect((await read(store, tmp.path, "model-a")).rows).toHaveLength(1)
    expect((await read(store, tmp.path, "model-b")).rows).toEqual([])
    expect((await fs.readFile(projectRecall(tmp.path))).subarray(0, 15).toString()).toBe("SQLite format 3")
  })

  test("migrates the temporary JSON recall format to SQLite", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await fs.mkdir(path.dirname(projectRecall(tmp.path)), { recursive: true })
    await fs.writeFile(projectRecall(tmp.path), JSON.stringify({ version: 1, model: "old", rows: [] }))
    expect((await read(store, tmp.path, "new")).rows).toEqual([])
    expect((await fs.readFile(projectRecall(tmp.path))).subarray(0, 15).toString()).toBe("SQLite format 3")
  })

  test("uses semantic ranking and falls back to lexical on model failure", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const bunID = await save(store, tmp.path, { summary: "Bun build", content: "Use bun for builds" })
    await save(store, tmp.path, { summary: "Deploy", content: "Release process" })
    await index(store, tmp.path, [{ id: bunID, source: "memory", text: "Bun build Use bun for builds" }], "test", async () => [1, 0])
    const semantic = await similar(store, tmp.path, ["unrelated"], 5, { model: "test", encode: async () => [1, 0] })
    expect(semantic[0]?.id).toBe(bunID)
    const lexical = await similar(store, tmp.path, ["deploy"], 5, { encode: async () => { throw new Error("offline") } })
    expect(lexical[0]?.summary).toBe("Deploy")
  })

  test("reconciles deleted and expired facts", () => {
    const rows = [
      { id: "active", source: "memory", text: "a", hash: "a", model: "m", updatedAt: "now" },
      { id: "expired", source: "memory", text: "b", hash: "b", model: "m", updatedAt: "now", validUntil: "2020-01-01T00:00:00.000Z" },
    ]
    expect(reconcile(rows, ["active", "expired"], Date.now()).map((row) => row.id)).toEqual(["active"])
  })
})
