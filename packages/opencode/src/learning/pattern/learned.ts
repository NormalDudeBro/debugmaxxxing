import { createHash } from "node:crypto"
import type { Fix, Pattern } from "../schema"
import { isSafeRegex } from "./matcher"

const ERROR_LINE = /error|failed|fatal|exception|denied|unable|not found|cannot find/i

export function keyErrorLine(output: string) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 500 && ERROR_LINE.test(line))
}

export function generalizeError(line: string) {
  const escaped = escapeRegex(line.slice(0, 500))
    .replace(/(?:[A-Za-z]:)?(?:\\\\[^\\\s]+|\/[^/\s]+){2,}/g, "[^\\s]+")
    .replace(/\b\d+\\\.\d+(?:\\\.\d+)*\b/g, "[0-9][0-9.]*")
    .replace(/\b[0-9a-f]{8,}\b/gi, "[0-9a-f]+")
    .replace(/(["'])[^"']+\1/g, "[\\\"'][^\\\"']+[\\\"']")
  return isSafeRegex(escaped) ? escaped : undefined
}

export function generatePattern(input: {
  output: string
  failedCommand: string
  successfulCommand?: string
  projectID?: string
  now?: Date
}): Pattern | undefined {
  const line = keyErrorLine(input.output)
  if (!line) return
  const regex = generalizeError(line)
  if (!regex) return
  const now = (input.now ?? new Date()).toISOString()
  const fix = input.successfulCommand ? observedFix(input.successfulCommand) : undefined
  const key = dedupeKey(regex, fix?.command)
  return {
    id: `learned-${key.slice(0, 16)}`,
    regex,
    category: "learned",
    description: line.slice(0, 300),
    fixes: fix ? [fix] : [],
    scope: "project",
    success: 0,
    failures: 0,
    version: 1,
    provenance: "observed-shell",
    projectID: input.projectID,
    confidence: fix ? 0.7 : 0.3,
    createdAt: now,
    updatedAt: now,
  }
}

export function dedupePatterns(patterns: readonly Pattern[]) {
  const seen = new Set<string>()
  return patterns.filter((pattern) => {
    const key = dedupeKey(pattern.regex, pattern.fixes[0]?.command)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function dedupeKey(regex: string, command?: string) {
  return createHash("sha256").update(regex.trim().toLowerCase()).update("\0").update(command?.trim() ?? "").digest("hex")
}

function observedFix(command: string): Fix {
  return {
    id: `observed-${createHash("sha256").update(command).digest("hex").slice(0, 12)}`,
    description: "Previously observed successful command",
    command,
    priority: 1,
    trusted: true,
    observedCommandHash: createHash("sha256").update(command).digest("hex"),
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
