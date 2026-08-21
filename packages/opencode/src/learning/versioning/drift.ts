import type { Correction } from "../schema"

export function detect(corrections: readonly Correction[], text: string, commands: readonly string[] = []) {
  const haystack = `${text}\n${commands.join("\n")}`.toLowerCase()
  return corrections.filter((correction) => {
    const contrast = /\buse\s+(.+?)(?:,\s*|\s+)(?:not|instead of)\s+(.+)/i.exec(correction.rule)
    if (!contrast) return false
    const preferred = contrast[1]?.trim().toLowerCase()
    const forbidden = contrast[2]?.trim().toLowerCase()
    return !!preferred && !!forbidden && haystack.includes(forbidden) && !haystack.includes(preferred)
  })
}
