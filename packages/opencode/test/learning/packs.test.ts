import { describe, expect, test } from "bun:test"
import { installed, manifests } from "@/learning/pattern/packs"
import { PatternRegistry } from "@/learning/pattern/registry"

describe("learning community packs", () => {
  test("loads versioned hash provenance for each bundled pack", () => {
    const list = manifests()
    expect(list.map((pack) => pack.name)).toEqual(["bun", "go", "rust", "ruby", "security-devops"])
    expect(list.every((pack) => pack.hash.length === 64 && pack.patterns > 0)).toBe(true)
    expect(installed().every((pattern) => pattern.provenance?.startsWith("bundled-pack:") && pattern.scope === "community")).toBe(true)
  })

  test("keeps mutating fixes untrusted and allows inspection-only fixes", () => {
    const patterns = installed()
    expect(patterns.find((pattern) => pattern.id === "bun-lockfile")?.fixes[0]?.trusted).toBe(false)
    expect(patterns.find((pattern) => pattern.id === "docker-daemon")?.fixes[0]?.trusted).toBe(true)
  })

  test("matches pack diagnoses through the community tier", () => {
    const match = new PatternRegistry({ community: installed() }).match("go: updates to go.mod needed; to update it: go mod tidy")
    expect(match?.pattern.id).toBe("go-test-cache")
    expect(match?.pattern.scope).toBe("community")
  })
})
