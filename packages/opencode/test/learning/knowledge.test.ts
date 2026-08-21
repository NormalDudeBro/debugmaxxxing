import { describe, expect, test } from "bun:test"
import { LearningStore } from "@/learning/store"
import * as Audit from "@/learning/audit"
import { report } from "@/learning/report"
import { inspect } from "@/learning/watch"
import * as Wiki from "@/learning/wiki"
import * as Codegraph from "@/learning/codegraph"
import * as Graph from "@/learning/graph"
import { tmpdir } from "../fixture/fixture"

describe("learning audit and watch", () => {
  test("redacts, queries, reports, and prunes audit events", async () => {
    await using tmp = await tmpdir()
    const store = new LearningStore()
    await Audit.record(store, tmp.path, { type: "pattern.match", timestamp: 1, data: { token: "token=abcdefghijklmnopqrstuvwxyz" } })
    await Audit.record(store, tmp.path, { type: "pattern.miss", timestamp: 2 })
    const events = await Audit.list(store, tmp.path)
    expect(JSON.stringify(events)).not.toContain("abcdefghijklmnopqrstuvwxyz")
    expect((await report(store, tmp.path))).toMatchObject({ events: 2, matches: 1, misses: 1 })
    expect(await Audit.prune(store, tmp.path, { before: 2, max: 10 })).toBe(1)
  })

  test("combines secret classification with safety policies", () => {
    const result = inspect("git reset --hard\ntoken=abcdefghijklmnopqrstuvwxyz", ".env")
    expect(result.blocked).toBe(true)
    expect(result.redacted).not.toContain("abcdefghijklmnopqrstuvwxyz")
    expect(result.alerts[0]?.id).toBe("destructive-git")
  })
})

describe("learning knowledge indexes", () => {
  test("tracks wiki backlinks and preserves links across rename", () => {
    const pages: Wiki.WikiPage[] = [
      { id: "a", title: "Build", body: "See [[Deploy]]", tags: [] },
      { id: "b", title: "Deploy", body: "Deployment notes", tags: [] },
    ]
    expect(Wiki.index(pages).backlinks.get("b")).toEqual(["a"])
    const renamed = Wiki.rename(pages, "b", "Release")
    expect(renamed[0]?.body).toContain("[[Release]]")
    expect(Wiki.remove(renamed, "b")).toHaveLength(1)
  })

  test("updates and queries code files deterministically", () => {
    const files = Codegraph.update(
      [{ path: "old.ts", title: "Old" }, { path: "keep.ts", title: "Keep" }],
      [{ path: "new.ts", title: "Session runtime", symbols: ["runSession"] }],
      ["old.ts"],
    )
    expect(files.map((file) => file.path)).toEqual(["keep.ts", "new.ts"])
    expect(Codegraph.query(files, ["session"])[0]?.path).toBe("new.ts")
  })

  test("deduplicates graph data and returns connected edges", () => {
    const graph = Graph.build(
      [{ id: "a", type: "file", label: "Session" }, { id: "a", type: "file", label: "Session" }, { id: "b", type: "memory", label: "Build" }],
      [{ from: "a", to: "b", type: "mentions" }, { from: "a", to: "missing", type: "invalid" }],
    )
    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(1)
    expect(Graph.query(graph, ["session"]).edges).toHaveLength(1)
  })
})
