import { describe, expect, test } from "bun:test"
import { bestMatch, isSafeRegex, substituteCaptures } from "@/learning/pattern/matcher"
import { dedupePatterns, generatePattern, generalizeError } from "@/learning/pattern/learned"
import { PatternRegistry } from "@/learning/pattern/registry"
import type { Pattern } from "@/learning/schema"

function pattern(input: Partial<Pattern> & Pick<Pattern, "id" | "scope">): Pattern {
  return {
    regex: "missing (.+)",
    category: "test",
    description: input.id,
    fixes: [],
    success: 0,
    failures: 0,
    ...input,
  }
}

describe("learning pattern matcher", () => {
  test("ranks scope before trust and history", () => {
    const project = pattern({ id: "project", scope: "project" })
    const global = pattern({
      id: "global",
      scope: "global",
      success: 10,
      fixes: [{ id: "fix", description: "fix", command: "fix", priority: 1, trusted: true }],
    })
    expect(bestMatch([global, project], "missing package")?.pattern.id).toBe("project")
  })

  test("ranks trust, success rate, specificity, and stable ID within a scope", () => {
    const weak = pattern({ id: "weak", scope: "project", regex: "missing", success: 10 })
    const trusted = pattern({
      id: "trusted",
      scope: "project",
      regex: "missing package",
      success: 1,
      failures: 1,
      fixes: [{ id: "fix", description: "fix", command: "fix", priority: 1, trusted: true }],
    })
    expect(bestMatch([weak, trusted], "missing package")?.pattern.id).toBe("trusted")
  })

  test("rejects broad, invalid, and nested-quantifier patterns", () => {
    expect(isSafeRegex(".*")).toBe(false)
    expect(isSafeRegex("(a+)+$")).toBe(false)
    expect(isSafeRegex("[")).toBe(false)
    expect(isSafeRegex("Cannot find module (.+)")).toBe(true)
  })

  test("quotes capture substitution for shell safety", () => {
    expect(substituteCaptures("install $1 {{2}}", ["safe", "a; rm -rf /"])).toBe("install safe 'a; rm -rf /'")
  })
})

describe("learned patterns", () => {
  test("generalizes volatile versions and hashes", () => {
    const regex = generalizeError("Error: package version 1.2.3 failed at abcdef123456")
    expect(regex).toBeDefined()
    expect(new RegExp(regex!, "i").test("Error: package version 9.8.7 failed at deadbeef0123")).toBe(true)
  })

  test("keeps text-only suggestions untrusted and observed successes trusted", () => {
    const suggestion = generatePattern({ output: "Error: package not found", failedCommand: "build" })
    const observed = generatePattern({
      output: "Error: package not found",
      failedCommand: "build",
      successfulCommand: "bun install",
    })
    expect(suggestion?.fixes).toEqual([])
    expect(observed?.fixes[0]).toMatchObject({ command: "bun install", trusted: true })
    expect(observed?.fixes[0]?.observedCommandHash).toHaveLength(64)
  })

  test("deduplicates normalized regex and fix command", () => {
    const first = generatePattern({ output: "Error: package not found", failedCommand: "build", successfulCommand: "bun install" })!
    expect(dedupePatterns([first, { ...first, id: "duplicate" }])).toHaveLength(1)
  })

  test("registry enforces source tiers instead of insertion order", () => {
    const registry = new PatternRegistry({
      bundled: [pattern({ id: "bundled", scope: "bundled" })],
      project: [pattern({ id: "project", scope: "project" })],
    })
    expect(registry.match("missing dependency")?.pattern.id).toBe("project")
  })
})
