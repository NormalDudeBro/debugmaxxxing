// Embedded so packaged TUI builds do not need to locate a companion Python file.
export const voiceScript = String.raw`
import json
import os
import sys
import threading

def emit(kind, text=""):
    print(json.dumps({"type": kind, "text": text}), flush=True)

try:
    import numpy as np
    import sounddevice as sd
    from faster_whisper import WhisperModel
except ImportError:
    sys.stderr.write("Install voice dependencies: python -m pip install faster-whisper sounddevice\n")
    sys.exit(1)

try:
    stopped = threading.Event()
    frames = []
    def stop():
        sys.stdin.readline()
        stopped.set()
    threading.Thread(target=stop, daemon=True).start()
    def record(data, count, timing, status):
        if status:
            sys.stderr.write(str(status) + "\n")
        frames.append(data.copy())
    with sd.InputStream(samplerate=16000, channels=1, dtype="float32", callback=record):
        emit("listening")
        stopped.wait(120)
    if not frames:
        emit("text")
        sys.exit(0)
    emit("transcribing")
    model = WhisperModel(sys.argv[1], device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        np.concatenate(frames).reshape(-1),
        language=sys.argv[2] or None,
        vad_filter=True,
    )
    emit("text", " ".join(segment.text.strip() for segment in segments).strip())
except Exception as error:
    sys.stderr.write(str(error) + "\n")
    sys.exit(1)
`

export type VoiceStatus = "starting" | "listening" | "transcribing"

export function startVoiceInput(onStatus: (status: VoiceStatus) => void, env: NodeJS.ProcessEnv = process.env) {
  const child = Bun.spawn(
    [
      env.OPENCODE_VOICE_PYTHON || (process.platform === "win32" ? "python" : "python3"),
      "-u",
      "-c",
      voiceScript,
      env.OPENCODE_VOICE_MODEL || "base",
      env.OPENCODE_VOICE_LANGUAGE || "",
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  )
  const errors = new Response(child.stderr).text()
  const result = (async () => {
    const reader = child.stdout.getReader()
    const decoder = new TextDecoder()
    let pending = ""
    let text = ""
    try {
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        pending += decoder.decode(chunk.value, { stream: true })
        const lines = pending.split("\n")
        pending = lines.pop() ?? ""
        for (const line of lines) {
          const event: unknown = JSON.parse(line)
          if (!event || typeof event !== "object" || !("type" in event)) continue
          if (event.type === "listening" || event.type === "transcribing") onStatus(event.type)
          if (event.type === "text" && "text" in event && typeof event.text === "string") text = event.text
        }
      }
      const code = await child.exited
      const error = (await errors).trim()
      if (code !== 0) throw new Error(error || `Voice input exited with code ${code}`)
      return text
    } finally {
      reader.releaseLock()
      child.kill()
    }
  })()
  return {
    result,
    stop: () => {
      child.stdin.write("\n")
      child.stdin.end()
    },
    cancel: () => child.kill(),
  }
}
