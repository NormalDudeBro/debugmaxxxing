import { describe, expect, test } from "bun:test"
import { LearningStore } from "@/learning/store"
import { add, decay, load, promptContext } from "@/learning/versioning/corrections"
import { detect } from "@/learning/versioning/drift"
import { commit, history } from "@/learning/versioning/commit"
import { context } from "@/learning/versioning/resume"
import { tmpdir } from "../fixture/fixture"

describe("learning corrections", () => {
  test("reinforces duplicate rules and bounds prompt context", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await add(store, tmp.path, "Use bun, not npm")
    await add(store, tmp.path, "Use bun, not npm")
    const values = await load(store, tmp.path)
    expect(values).toHaveLength(1)
    expect(values[0]?.strength).toBe(2)
    expect(promptContext(values, 40)).toContain("Use bun")
    expect(decay(values)[0]?.strength).toBe(1)
    expect(detect(values, "", ["npm install"])).toHaveLength(1)
    expect(detect(values, "bun install", ["npm install"])).toHaveLength(0)
  })

  test("does not persist secret-bearing corrections", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    expect(await add(store, tmp.path, "Use token=abcdefghijklmnopqrstuvwxyz")).toBeUndefined()
    expect(await load(store, tmp.path)).toEqual([])
  })
})

describe("learning state history", () => {
  test("writes a content-addressed HEAD chain and bounded resume context", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const first = await commit(store, tmp.path, { summary: "Set up the project", sessionID: "one" })
    const second = await commit(store, tmp.path, { summary: "Fixed the build", sessionID: "two" })
    expect(second.parent).toBe(first.id)
    expect(second.id).toHaveLength(64)
    const values = await history(store, tmp.path)
    expect(values.map((value) => value.id)).toEqual([second.id, first.id])
    expect(context(values, 30)).toContain("Fixed the build")
    expect(context(values, 5)).toBe("")
  })
})
