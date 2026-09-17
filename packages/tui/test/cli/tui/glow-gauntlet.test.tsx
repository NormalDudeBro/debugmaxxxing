import { describe, expect, test } from "bun:test"
import fs from "node:fs"
import path from "node:path"
describe("glow source", () => {
  test("uses no hex color literals", () => {
    const src = fs.readFileSync(path.resolve(import.meta.dir, "../../../src/ui/glow.tsx"), "utf8")
    expect(src.match(/#[0-9a-fA-F]{6}/g) ?? []).toEqual([])
  })
})
