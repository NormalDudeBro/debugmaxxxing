import { expect, test } from "bun:test"
import { startVoiceInput, voiceScript } from "../../src/prompt/voice"

test("missing Python reports a setup failure without modifying the environment", () => {
  expect(() => startVoiceInput(() => {}, { OPENCODE_VOICE_PYTHON: "opencode-nonexistent-voice-python" })).toThrow()
})

test("a failed recorder process rejects instead of returning an empty transcript", async () => {
  const voice = startVoiceInput(() => {}, { OPENCODE_VOICE_PYTHON: process.execPath })
  await expect(voice.result).rejects.toThrow()
})

const python = Bun.which(process.platform === "win32" ? "python" : "python3")

test.skipIf(!python)("embedded recorder is valid Python without importing audio dependencies", async () => {
  const child = Bun.spawn([python!, "-c", "import ast, sys; ast.parse(sys.argv[1])", voiceScript], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const error = await new Response(child.stderr).text()
  expect(error).toBe("")
  expect(await child.exited).toBe(0)
})
