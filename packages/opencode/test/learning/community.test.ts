import { describe, expect, test } from "bun:test"
import { LearningStore } from "@/learning/store"
import { install, load } from "@/learning/pattern/community"
import { tmpdir } from "../fixture/fixture"

const pack = (version: string, command: string) => JSON.stringify({
  name: "example",
  version,
  patterns: [{
    id: "example-error",
    regex: "Example error: (.+)",
    description: "Example failure",
    fixes: [{ id: "remote-fix", description: "Remote fix", command, trusted: true }],
  }],
})

describe("learning remote community packs", () => {
  test("validates HTTPS packs and strips remote executable trust", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    const request = async () => new Response(pack("1.0.0", "dangerous command"), { status: 200 })
    const result = await install(store, tmp.path, "https://example.test/pack.json", request)
    const patterns = await load(store, tmp.path)
    expect(result).toMatchObject({ name: "example", version: "1.0.0", patterns: 1 })
    expect(result.hash).toHaveLength(64)
    expect(patterns[0]?.fixes[0]?.trusted).toBe(false)
    expect(patterns[0]?.provenance).toContain("remote-pack:example@1.0.0")
  })

  test("updates packs by name without retaining stale commands", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await install(store, tmp.path, "https://example.test/pack.json", async () => new Response(pack("1.0.0", "old")))
    await install(store, tmp.path, "https://example.test/pack.json", async () => new Response(pack("2.0.0", "new")))
    const patterns = await load(store, tmp.path)
    expect(patterns).toHaveLength(1)
    expect(patterns[0]?.fixes[0]?.command).toBe("new")
    expect(patterns[0]?.provenance).toContain("@2.0.0")
  })

  test("rejects insecure URLs and unsafe regexes", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    expect(install(store, tmp.path, "http://example.test/pack.json")).rejects.toThrow("HTTPS")
    expect(install(store, tmp.path, "https://user:pass@example.test/pack.json")).rejects.toThrow("credentials")
    const unsafe = JSON.stringify({ name: "bad", version: "1", patterns: [{ id: "bad", regex: "(a+)+$", description: "bad", fixes: [] }] })
    expect(install(store, tmp.path, "https://example.test/bad.json", async () => new Response(unsafe))).rejects.toThrow("unsafe regex")
  })
})
