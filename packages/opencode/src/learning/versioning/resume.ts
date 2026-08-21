import type { StateCommit } from "../schema"

export function context(commits: readonly StateCommit[], maxChars = 1200) {
  let chars = 0
  const lines: string[] = []
  for (const commit of commits) {
    const line = `- ${commit.summary}`
    if (chars + line.length > maxChars) break
    lines.push(line)
    chars += line.length
  }
  return lines.length ? `Recent project state:\n${lines.join("\n")}` : ""
}
