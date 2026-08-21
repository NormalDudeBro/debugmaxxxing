import { describe, expect, test } from "bun:test"
import { LearningStore } from "@/learning/store"
import { learnCapturedFailures } from "@/learning/service"
import { projectPatterns } from "@/learning/paths"
import type { Pattern } from "@/learning/schema"
import { tmpdir } from "../fixture/fixture"

describe("learning capture correlation", () => {
  test("makes observed successful commands executable but text-only completion untrusted", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const capture = { sessionID: "session", messageID: "message", command: "bun test", cwd: tmp.path, exitCode: 1, output: "Error: dependency not found" }
    await learnCapturedFailures(store, tmp.path, [capture], "bun install")
    await learnCapturedFailures(store, tmp.path, [{ ...capture, output: "Error: config not found" }])
    const patterns = await store.read(projectPatterns(tmp.path), [] as Pattern[])
    const observed = patterns.find((pattern) => pattern.description.includes("dependency"))
    const inferred = patterns.find((pattern) => pattern.description.includes("config"))
    expect(observed?.fixes[0]).toMatchObject({ command: "bun install", trusted: true })
    expect(inferred?.fixes).toEqual([])
  })
})
