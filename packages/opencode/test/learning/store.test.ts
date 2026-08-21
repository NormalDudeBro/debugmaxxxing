import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { Schema } from "effect"
import { LearningStore } from "@/learning/store"
import { gitignore, projectLearningDir, resolveProjectRoot } from "@/learning/paths"
import { tmpdir } from "../fixture/fixture"

describe("learning store", () => {
  test("uses the active directory for non-VCS projects", () => {
    expect(resolveProjectRoot({ worktree: "/", directory: "C:/project" })).toBe("C:/project")
    expect(resolveProjectRoot({ worktree: "C:/repo", directory: "C:/repo/pkg" })).toBe("C:/repo")
  })

  test("creates the private generated-state ignore file once", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await store.ensureProject(tmp.path)
    await store.ensureProject(tmp.path)
    const contents = await fs.readFile(gitignore(tmp.path), "utf8")
    expect(contents.split("\n").filter((line) => line === "*.json")).toHaveLength(1)
    expect(contents).toContain("history/")
  })

  test("serializes concurrent appends and leaves valid atomic writes", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const log = path.join(projectLearningDir(tmp.path), "audit.jsonl")
    await Promise.all(Array.from({ length: 40 }, (_, index) => store.append(log, { index })))
    const rows = (await fs.readFile(log, "utf8")).trim().split("\n").map((line) => JSON.parse(line))
    expect(rows).toHaveLength(40)

    const state = path.join(projectLearningDir(tmp.path), "state.json")
    await Promise.all(Array.from({ length: 20 }, (_, index) => store.write(state, { index })))
    expect(JSON.parse(await fs.readFile(state, "utf8"))).toHaveProperty("index")
    expect((await fs.readdir(projectLearningDir(tmp.path))).some((file) => file.endsWith(".tmp"))).toBe(false)
  })

  test("validates decoded disk records", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const file = path.join(tmp.path, "record.json")
    await fs.writeFile(file, JSON.stringify({ count: "invalid" }))
    expect(store.readSchema(file, Schema.Struct({ count: Schema.Number }), { count: 0 })).rejects.toThrow()
  })
})
