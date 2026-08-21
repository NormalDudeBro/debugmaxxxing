import { projectAudit } from "./paths"
import { LearningStore } from "./store"
import { redactSecrets } from "./privacy"

export type AuditEvent = { id?: string; type: string; timestamp?: number; sessionID?: string; patternID?: string; command?: string; detail?: string; data?: Record<string, unknown> }

export async function record(store: LearningStore, worktree: string, event: AuditEvent) {
  const clean = JSON.parse(redactSecrets(JSON.stringify({ ...event, timestamp: event.timestamp ?? Date.now(), version: 1 })))
  await store.append(projectAudit(worktree), clean)
}

export async function list(store: LearningStore, worktree: string, input: { type?: string; since?: number; limit?: number } = {}) {
  const rows = (await store.readText(projectAudit(worktree)))
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line): AuditEvent[] => {
      try {
        return [JSON.parse(line) as AuditEvent]
      } catch {
        return []
      }
    })
    .filter((event) => (!input.type || event.type === input.type) && (!input.since || (event.timestamp ?? 0) >= input.since))
  return rows.slice(-(input.limit ?? 500))
}

export async function prune(store: LearningStore, worktree: string, input: { before?: number; max?: number }) {
  const events = await list(store, worktree, { since: input.before, limit: Number.MAX_SAFE_INTEGER })
  const kept = events.slice(-(input.max ?? 5000))
  await store.writeText(projectAudit(worktree), kept.map((event) => JSON.stringify(event)).join("\n") + (kept.length ? "\n" : ""))
  return kept.length
}
