import { describe, expect, test } from "bun:test"
import { classify, isSensitivePath, redactSecrets } from "@/learning/privacy"

describe("learning privacy", () => {
  test("redacts common credential formats", () => {
    const value = redactSecrets("token=abc123 sk-test_abcdefghijklmnopqrstuvwxyz eyJaaa.bbb.ccc")
    expect(value).not.toContain("abc123")
    expect(value).not.toContain("sk-test")
    expect(value).not.toContain("eyJaaa")
    expect(value).toContain("[REDACTED]")
  })

  test("blocks sensitive project paths", () => {
    expect(isSensitivePath(".env.local")).toBe(true)
    expect(isSensitivePath("src/main.ts")).toBe(false)
    expect(isSensitivePath(".ssh/id_ed25519")).toBe(true)
  })

  test("classifies secret content and paths", () => {
    expect(classify({ path: ".env", content: "safe" })).toBe("never_send")
    expect(classify({ content: "token=abcdefghijklmnopqrstuvwxyz" })).toBe("sensitive")
    expect(classify({ content: "internal architecture" })).toBe("private")
    expect(classify({ content: "public build command" })).toBe("public")
  })
})
