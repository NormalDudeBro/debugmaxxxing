import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { migrateLegacy } from "@/learning/migrate"
import { migrationMarker, projectPatterns } from "@/learning/paths"
import { tmpdir } from "../fixture/fixture"

describe("learning migrations", () => {
  test("imports approved legacy patterns without deleting the source", async () => {
    await using tmp = await tmpdir()
    const legacy = path.join(tmp.path, ".opencode", "cyxcode-learned.json")
    await fs.mkdir(path.dirname(legacy), { recursive: true })
    await fs.writeFile(
      legacy,
      JSON.stringify({ approved: [{ id: "legacy", regex: "missing thing", description: "Missing thing", fix: "install thing" }] }),
    )

    const result = await migrateLegacy(tmp.path)
    const patterns = JSON.parse(await fs.readFile(projectPatterns(tmp.path), "utf8"))
    expect(result.sources).toContain(legacy)
    expect(patterns[0]).toMatchObject({ id: "legacy", regex: "missing thing", provenance: legacy })
    expect(await fs.readFile(legacy, "utf8")).toContain("approved")
    expect(JSON.parse(await fs.readFile(migrationMarker(tmp.path), "utf8"))).toHaveProperty("version", 1)
  })

  test("records corrupt legacy input as a completed no-op", async () => {
    await using tmp = await tmpdir()
    const legacy = path.join(tmp.path, ".opencode", "cyxcode-learned.json")
    await fs.mkdir(path.dirname(legacy), { recursive: true })
    await fs.writeFile(legacy, "not json")
    const result = await migrateLegacy(tmp.path)
    expect(result.sources).toEqual([])
  })
})
