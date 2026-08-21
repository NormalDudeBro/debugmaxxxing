import { describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import path from "node:path"
import { loadOrCreateKey, open, seal } from "@/learning/crypto"
import { tmpdir } from "../fixture/fixture"

describe("learning crypto", () => {
  test("seals and opens content with a persisted local key", async () => {
    await using tmp = await tmpdir()
    const file = path.join(tmp.path, "learning.key")
    const key = await loadOrCreateKey(file)
    const encrypted = seal("private memory", key)
    expect(encrypted.data).not.toContain("private memory")
    expect(open(encrypted, await loadOrCreateKey(file))).toBe("private memory")
    expect((await fs.stat(file)).isFile()).toBe(true)
  })

  test("refuses a record after key loss", async () => {
    const encrypted = seal("private memory", crypto.getRandomValues(new Uint8Array(32)))
    expect(() => open(encrypted, crypto.getRandomValues(new Uint8Array(32)))).toThrow()
  })
})
