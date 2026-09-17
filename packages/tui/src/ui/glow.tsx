import { RGBA } from "@opentui/core"
import { For } from "solid-js"
import type { JSX } from "@opentui/solid"
import { tint } from "../context/theme"

export interface GlowTokens {
  background: RGBA
  text: RGBA
  textMuted: RGBA
  primary: RGBA
  secondary: RGBA
  accent: RGBA
  success: RGBA
  warning: RGBA
  error: RGBA
  info: RGBA
}
export interface GlowSpan { text: string; fg?: RGBA; bg?: RGBA; bold?: boolean }
export const mix = tint
export const hasBg = (t: GlowTokens): boolean => t.background.a > 0
export const fadeTarget = (t: GlowTokens): RGBA => (hasBg(t) ? t.background : t.textMuted)
export function grad(text: string, from: RGBA, to: RGBA, bold?: boolean): GlowSpan[] {
  const chars = [...text], out: GlowSpan[] = []
  for (let i = 0; i < chars.length; i += 2) {
    const k = chars.length <= 2 ? 0 : i / (chars.length - 1)
    out.push({ text: chars.slice(i, i + 2).join(""), fg: mix(from, to, k), bold })
  }
  return out
}
export function fadeRule(t: GlowTokens, color: RGBA, width: number): GlowSpan[] {
  if (width <= 0) return []
  return grad("─".repeat(width), color, mix(color, fadeTarget(t), 0.92))
}
export const sinkColor = (t: GlowTokens, depth: number): RGBA => mix(t.textMuted, fadeTarget(t), depth >= 2 ? 0.6 : 0.32)
export function bleed(t: GlowTokens, text: string, fg: RGBA, tintColor: RGBA, width: number): GlowSpan[] {
  if (!hasBg(t)) return [{ text, fg }]
  const chars = [...text.padEnd(width)], out: GlowSpan[] = []
  for (let i = 0; i < chars.length; i += 3) {
    const k = Math.min(1, i / width)
    out.push({ text: chars.slice(i, i + 3).join(""), fg, bg: mix(mix(t.background, tintColor, 0.16), t.background, k) })
  }
  return out
}
export const kinetic = (t: GlowTokens, text: string, hot: RGBA): GlowSpan[] => grad(text, mix(hot, fadeTarget(t), 0.55), hot, true)
export function kineticLive(t: GlowTokens, text: string, hot: RGBA, phase: number): GlowSpan[] {
  const chars = [...text], cool = mix(hot, fadeTarget(t), 0.55), out: GlowSpan[] = []
  for (let i = 0; i < chars.length; i += 2) {
    const k = chars.length <= 2 ? 0 : i / (chars.length - 1)
    const crest = Math.pow(Math.max(0, Math.cos((k - phase) * Math.PI * 2)), 3) * 0.45
    out.push({ text: chars.slice(i, i + 2).join(""), fg: mix(mix(cool, hot, k), hot, crest), bold: true })
  }
  return out
}
export function idColor(t: GlowTokens, key: string): RGBA {
  const set = [t.primary, t.secondary, t.accent, t.success, t.warning, t.error, t.info]
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) { h = (h ^ key.charCodeAt(i)) >>> 0; h = Math.imul(h, 0x01000193) >>> 0 }
  return set[h % set.length]!
}
export function contextWords(t: GlowTokens, pct: number): { text: string; fg: RGBA } | undefined {
  if (pct > 90) return { text: `${pct}% full · compact now`, fg: t.error }
  if (pct > 70) return { text: `${pct}% full · compact soon`, fg: t.warning }
  return undefined
}
export const modelWord = (id: string): string => id.replace(/^claude-/, "")
export const RULE = { human: 28, thinking: 20, ask: 34, deck: 56 } as const
export const clampRule = (target: number, available: number): number => Math.max(0, Math.min(target, available))
export function Spans(props: { spans: GlowSpan[] }): JSX.Element {
  return <For each={props.spans}>{(s) => <span style={{ fg: s.fg, bg: s.bg, bold: s.bold }}>{s.text}</span>}</For>
}
