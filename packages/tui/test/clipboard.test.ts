import { expect, test } from "bun:test"
import { copyCommand, pasteText } from "../src/clipboard"

test("prefers Wayland clipboard when available", () => {
  expect(copyCommand("linux", true, (name) => name === "wl-copy")).toEqual(["wl-copy"])
})

test("uses osascript on macOS", () => {
  expect(copyCommand("darwin", false, (name) => name === "osascript")).toEqual(["osascript"])
})

test("falls back through X11 clipboard commands", () => {
  expect(copyCommand("linux", true, (name) => name === "xclip")).toEqual(["xclip", "-selection", "clipboard"])
  expect(copyCommand("linux", false, (name) => name === "xsel")).toEqual(["xsel", "--clipboard", "--input"])
})

test("returns undefined when native clipboard is unavailable", () => {
  expect(copyCommand("linux", false, () => false)).toBeUndefined()
})

test("pastes text with normalized line endings", async () => {
  let value = ""
  const pasted = await pasteText(
    { insertText: (text) => (value = text) },
    async () => ({ data: "one\r\ntwo\rthree", mime: "text/plain" }),
  )
  expect(pasted).toBe(true)
  expect(value).toBe("one\ntwo\nthree")
})

test("does not insert non-text clipboard content", async () => {
  let inserted = false
  const pasted = await pasteText(
    { insertText: () => (inserted = true) },
    async () => ({ data: "image", mime: "image/png" }),
  )
  expect(pasted).toBe(false)
  expect(inserted).toBe(false)
})
