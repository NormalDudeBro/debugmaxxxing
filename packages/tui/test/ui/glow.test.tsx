/** @jsxImportSource @opentui/solid */
import { describe, expect, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { bleed, clampRule, contextWords, fadeRule, grad, idColor, sinkColor, type GlowTokens } from "../../src/ui/glow"
const color = RGBA.fromInts(10, 20, 30, 255)
const t: GlowTokens = {
  background: color,
  text: color,
  textMuted: color,
  primary: color,
  secondary: color,
  accent: color,
  success: color,
  warning: color,
  error: color,
  info: color,
}
const flat = (s: { text: string }[]) => s.map((x) => x.text).join("")
describe("glow", () => {
  test("grad preserves text and chunks", () => { const s = grad("abcdef", t.primary, t.accent); expect(s).toHaveLength(3); expect(flat(s)).toBe("abcdef") })
  test("rules clamp and preserve geometry", () => { expect(fadeRule(t, t.warning, 4)).toHaveLength(2); expect(clampRule(8, 3)).toBe(3); expect(flat(bleed(t, "x", t.text, t.success, 3))).toHaveLength(3) })
  test("semantic helpers", () => { expect(sinkColor(t, 1)).toBeDefined(); expect(contextWords(t, 84)?.text).toContain("compact soon"); expect(idColor(t, "x")).toBeDefined() })
})
