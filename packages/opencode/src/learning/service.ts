import { Context, Effect, Layer } from "effect"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { InstanceState } from "@/effect/instance-state"
import { Config } from "@/config/config"
import { LearningStore } from "./store"
import { globalPatterns, projectPatterns, projectMemories, projectAudit } from "./paths"
import { redactSecrets, isSensitivePath } from "./privacy"
import type { Pattern, StateCommit } from "./schema"
import { migrateLegacy } from "./migrate"
import { PatternRegistry } from "./pattern/registry"
import { generatePattern } from "./pattern/learned"
import * as Memory from "./memory"
import * as Corrections from "./versioning/corrections"
import * as Recall from "./recall"
import * as RecallIndexer from "./recall/indexer"
import { DEFAULT_MODEL } from "./recall/embedder"
import { consolidate as runDream } from "./dream"
import * as State from "./versioning/commit"
import * as Resume from "./versioning/resume"
import { report as buildReport } from "./report"
import { globalLearningDir, projectCaptures, projectLearningDir, resolveProjectRoot } from "./paths"
import * as Audit from "./audit"
import { installed as installedPacks, manifests as packManifests } from "./pattern/packs"
import { observe as observePromotion } from "./pattern/promotion"
import * as Community from "./pattern/community"
import * as Knowledge from "./knowledge"

export type ShellResult = {
  sessionID?: string
  messageID?: string
  callID?: string
  command: string
  cwd: string
  exitCode: number | null
  output: string
  truncated?: boolean
  aborted?: boolean
  timedOut?: boolean
}

export type LearningResult = {
  status: "disabled" | "none" | "matched"
  patternID?: string
  description?: string
  fixes?: Pattern["fixes"]
  trusted?: boolean
  source?: Pattern["scope"]
  captures?: string[]
  autoFix?: boolean
  retryOriginal?: boolean
}

export interface Interface {
  readonly onShellResult: (input: ShellResult) => Effect.Effect<LearningResult>
  readonly context: (input: { command?: string; output?: string }) => Effect.Effect<string>
  readonly status: () => Effect.Effect<Record<string, unknown>>
  readonly remember: (input: { summary: string; content: string; scope?: "project" | "global" }) => Effect.Effect<void>
  readonly correct: (input: { rule: string; scope?: "project" | "global" }) => Effect.Effect<void>
  readonly recall: (input: { terms: readonly string[]; limit?: number }) => Effect.Effect<Memory.MemoryEntry[]>
  readonly consolidate: () => Effect.Effect<Record<string, unknown>>
  readonly history: (limit?: number) => Effect.Effect<StateCommit[]>
  readonly report: () => Effect.Effect<Record<string, unknown>>
  readonly reindex: () => Effect.Effect<{ rows: number }>
  readonly modelStatus: () => Effect.Effect<Record<string, unknown>>
  readonly deleteModel: () => Effect.Effect<void>
  readonly downloadModel: () => Effect.Effect<Record<string, unknown>>
  readonly export: () => Effect.Effect<Record<string, unknown>>
  readonly clear: (scope?: "project" | "global") => Effect.Effect<void>
  readonly sessionEnded: (input: { sessionID?: string; summary: string }) => Effect.Effect<void>
  readonly completeTurn: (input: { sessionID: string; messageID?: string; assistantText?: string }) => Effect.Effect<void>
  readonly recordToolError: (input: { sessionID: string; messageID?: string; callID?: string; tool: string; error: string }) => Effect.Effect<void>
  readonly snapshotCompaction: (input: { sessionID: string; summary: string }) => Effect.Effect<void>
  readonly compacted: (input: { sessionID: string; summary: string }) => Effect.Effect<void>
  readonly installPack: (input: { url: string }) => Effect.Effect<Record<string, unknown>>
  readonly knowledge: (input: { terms: readonly string[]; target?: "wiki" | "codegraph" | "graph"; limit?: number }) => Effect.Effect<unknown>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Learning") {}

const builtins: Pattern[] = [
  {
    id: "node-module-not-found",
    regex: "Cannot find module ['\\\"]([^'\\\"]+)",
    category: "node",
    description: "A Node module is missing.",
    fixes: [{ id: "npm-install", description: "Install project dependencies", command: "npm install", priority: 1, trusted: false }],
    scope: "bundled",
    success: 0,
    failures: 0,
  },
  {
    id: "git-conflict",
    regex: "CONFLICT \\(content\\): Merge conflict",
    category: "git",
    description: "Git reported a merge conflict.",
    fixes: [{ id: "git-status", description: "Inspect conflicted files", command: "git status", priority: 1, trusted: true }],
    scope: "bundled",
    success: 0,
    failures: 0,
  },
  {
    id: "python-module-not-found",
    regex: "ModuleNotFoundError: No module named ['\\\"]([^'\\\"]+)",
    category: "python",
    description: "Python reported a missing module.",
    fixes: [{ id: "python-install", description: "Install the missing Python package", command: "python -m pip install", priority: 1, trusted: false }],
    scope: "bundled",
    success: 0,
    failures: 0,
  },
  {
    id: "npm-registry-404",
    regex: "npm ERR! code E404",
    category: "node",
    description: "The npm registry could not find the requested package.",
    fixes: [{ id: "npm-registry", description: "Inspect the configured npm registry", command: "npm config get registry", priority: 1, trusted: true }],
    scope: "bundled",
    success: 0,
    failures: 0,
  },
  {
    id: "permission-denied",
    regex: "(?:permission denied|access is denied|EACCES)",
    category: "system",
    description: "The command was denied by filesystem permissions.",
    fixes: [{ id: "inspect-permissions", description: "Inspect the target path and permissions", command: "whoami", priority: 1, trusted: true }],
    scope: "bundled",
    success: 0,
    failures: 0,
  },
]

const layer = Layer.effect(Service, Effect.gen(function* () {
  const store = new LearningStore()
  const config = yield* Config.Service
  const pending = new Map<string, ShellResult[]>()
  const migrations = new Map<string, Promise<unknown>>()
  const migrate = (worktree: string) => {
    const existing = migrations.get(worktree)
    if (existing) return existing
    const running = migrateLegacy(worktree, store).catch(() => undefined)
    migrations.set(worktree, running)
    return running
  }
  const onShellResult = Effect.fn("Learning.onShellResult")(function* (input: ShellResult) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false || settings.learning?.automatic === false) return { status: "disabled" as const }
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(async () => {
      await migrate(resolveProjectRoot(ctx))
      const key = captureKey(input.sessionID, input.messageID)
      if (input.exitCode === 0) {
        const captures = pending.get(key) ?? []
        if (captures.length) {
          const learned = await learnCapturedFailures(store, resolveProjectRoot(ctx), captures, input.command, String(ctx.project.id))
          const projectID = String(ctx.project.id) === "global" ? resolveProjectRoot(ctx) : String(ctx.project.id)
          await observePromotion(store, learned, projectID, settings.learning?.globalPromotionThreshold ?? 3)
          pending.delete(key)
          await persistCaptures(store, resolveProjectRoot(ctx), pending)
        }
        return { status: "none" as const }
      }
      const community = settings.learning?.communityPacks === false ? [] : [...installedPacks(), ...await Community.load(store, resolveProjectRoot(ctx))]
      const result = await handleShellResult(store, resolveProjectRoot(ctx), input, community)
      if (result.status === "none" && !input.aborted && !input.timedOut && !input.truncated) {
        pending.set(key, [...(pending.get(key) ?? []), { ...input, output: redactSecrets(input.output).slice(-2000) }].slice(-50))
        await persistCaptures(store, resolveProjectRoot(ctx), pending)
      }
      return result.status === "matched"
        ? { ...result, autoFix: settings.learning?.autoFix !== false, retryOriginal: settings.learning?.retryOriginal !== false }
        : result
    })
  })
  const context = Effect.fn("Learning.context")(function* (input: { command?: string; output?: string }) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false) return ""
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(async () => {
      await migrate(resolveProjectRoot(ctx))
      const patterns = await store.read(projectPatterns(resolveProjectRoot(ctx)), [] as Pattern[])
      const global = await store.read(globalPatterns(), [] as Pattern[])
      const memories = await Memory.load(store, resolveProjectRoot(ctx))
      const corrections = await Corrections.load(store, resolveProjectRoot(ctx))
      const terms = `${input.command ?? ""} ${input.output ?? ""}`.split(/\W+/).filter((term) => term.length > 2)
      const relevant = terms.length ? Memory.query(memories, terms, 12, 1800) : memories.filter((entry) => entry.privacy !== "never_send").slice(-12)
      const resume = Resume.context(await State.history(store, resolveProjectRoot(ctx), 4), 900)
      const graph = terms.length ? await Knowledge.query(store, resolveProjectRoot(ctx), { terms, target: "graph", limit: 6 }) as { nodes?: Array<{ label?: string }> } : undefined
      const links = graph?.nodes?.map((node) => node.label).filter((label): label is string => !!label) ?? []
      const text = [
        Corrections.promptContext(corrections),
        resume,
        ...patterns.concat(global).slice(0, 12).map((item) => `- ${item.description}`),
        ...relevant.map((item) => `- ${item.summary}`),
        ...(links.length ? [`Related project knowledge:\n${links.map((link) => `- ${link}`).join("\n")}`] : []),
      ].filter(Boolean).join("\n")
      return text ? `\nLearned local context (verify before acting):\n${text.slice(0, 3000)}\n` : ""
    })
  })
  const status = Effect.fn("Learning.status")(function* () {
    const settings = yield* config.get()
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(async () => {
      await migrate(resolveProjectRoot(ctx))
      const patterns = await store.read(projectPatterns(resolveProjectRoot(ctx)), [] as Pattern[])
      const memories = await store.read(projectMemories(resolveProjectRoot(ctx)), [] as unknown[])
      const corrections = await Corrections.load(store, resolveProjectRoot(ctx))
      return { enabled: settings.learning?.enabled !== false, projectPatterns: patterns.length, projectMemories: memories.length, corrections: corrections.length, builtins: builtins.length, packs: packManifests() }
    })
  })
  const remember = Effect.fn("Learning.remember")(function* (input: { summary: string; content: string; scope?: "project" | "global" }) {
    const ctx = yield* InstanceState.context
    yield* Effect.promise(async () => {
      await migrate(resolveProjectRoot(ctx))
      await Memory.save(store, resolveProjectRoot(ctx), input)
    })
  })
  const correct = Effect.fn("Learning.correct")(function* (input: { rule: string; scope?: "project" | "global" }) {
    const ctx = yield* InstanceState.context
    yield* Effect.promise(async () => {
      await migrate(resolveProjectRoot(ctx))
      await Corrections.add(store, resolveProjectRoot(ctx), input.rule, input.scope)
    })
  })
  const recall = Effect.fn("Learning.recall")(function* (input: { terms: readonly string[]; limit?: number }) {
    const ctx = yield* InstanceState.context
    const settings = yield* config.get()
    return yield* Effect.promise(() => Recall.similar(store, resolveProjectRoot(ctx), input.terms, input.limit, {
      semantic: settings.learning?.recall !== false,
      model: settings.learning?.recallModel,
      threshold: settings.learning?.recallThreshold,
    }))
  })
  const consolidate = Effect.fn("Learning.consolidate")(function* () {
    const ctx = yield* InstanceState.context
    const settings = yield* config.get()
    return yield* Effect.promise(() => runDream(store, resolveProjectRoot(ctx), {
      patternLimit: settings.learning?.patternLimit,
      memoryLimit: settings.learning?.memoryLimit,
      auditLimit: settings.learning?.auditLimit,
      retentionDays: settings.learning?.retentionDays,
      promotionThreshold: settings.learning?.promotionThreshold,
      autoPromote: settings.learning?.autoPromote,
    }))
  })
  const history = Effect.fn("Learning.history")(function* (limit?: number) {
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(() => State.history(store, resolveProjectRoot(ctx), limit))
  })
  const report = Effect.fn("Learning.report")(function* () {
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(() => buildReport(store, resolveProjectRoot(ctx)))
  })
  const reindex = Effect.fn("Learning.reindex")(function* () {
    const ctx = yield* InstanceState.context
    const settings = yield* config.get()
    const memories = yield* awaitPromise(Memory.load(store, resolveProjectRoot(ctx)))
    const model = settings.learning?.recallModel ?? DEFAULT_MODEL
    const rows = yield* Effect.promise(() => RecallIndexer.index(store, resolveProjectRoot(ctx), memories.filter((entry) => entry.privacy !== "never_send").map((entry) => ({ id: entry.id, source: "memory", text: `${entry.summary}\n${entry.content}` })), model).catch(() => []))
    const files = yield* Effect.promise(() => Knowledge.indexCode(store, resolveProjectRoot(ctx)))
    return { rows: rows.length, files }
  })
  const modelStatus = Effect.fn("Learning.modelStatus")(function* () {
    const settings = yield* config.get()
    return yield* Effect.promise(() => Recall.status(settings.learning?.recallModel))
  })
  const deleteModel = Effect.fn("Learning.deleteModel")(function* () {
    yield* Effect.promise(() => Recall.deleteModel())
  })
  const downloadModel = Effect.fn("Learning.downloadModel")(function* () {
    const settings = yield* config.get()
    return yield* Effect.promise(() => Recall.downloadModel(settings.learning?.recallModel))
  })
  const exportData = Effect.fn("Learning.export")(function* () {
    const ctx = yield* InstanceState.context
    const [patterns, memories, corrections, audit] = yield* Effect.promise(async () => Promise.all([
      store.read(projectPatterns(resolveProjectRoot(ctx)), [] as Pattern[]),
      Memory.load(store, resolveProjectRoot(ctx)),
      Corrections.load(store, resolveProjectRoot(ctx)),
      buildReport(store, resolveProjectRoot(ctx)),
    ]))
    return { patterns, memories: memories.filter((entry) => entry.privacy !== "never_send"), corrections, audit }
  })
  const clear = Effect.fn("Learning.clear")(function* (scope: "project" | "global" = "project") {
    const ctx = yield* InstanceState.context
    yield* Effect.promise(() => store.remove(scope === "global" ? globalLearningDir() : projectLearningDir(resolveProjectRoot(ctx))))
  })
  const sessionEnded = Effect.fn("Learning.sessionEnded")(function* (input: { sessionID?: string; summary: string }) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false) return
    const ctx = yield* InstanceState.context
    yield* Effect.promise(async () => {
      await State.commit(store, resolveProjectRoot(ctx), input)
      void runDream(store, resolveProjectRoot(ctx)).catch(() => undefined)
    })
  })
  const completeTurn = Effect.fn("Learning.completeTurn")(function* (input: { sessionID: string; messageID?: string; assistantText?: string }) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false) return
    const ctx = yield* InstanceState.context
    yield* Effect.promise(async () => {
      const keys = [...pending.keys()].filter((key) => key.startsWith(`${input.sessionID}:`) && (!input.messageID || key === captureKey(input.sessionID, input.messageID)))
      for (const key of keys) {
        const captures = pending.get(key) ?? []
        await learnCapturedFailures(store, resolveProjectRoot(ctx), captures)
        pending.delete(key)
      }
      await persistCaptures(store, resolveProjectRoot(ctx), pending)
    })
  })
  const recordToolError = Effect.fn("Learning.recordToolError")(function* (input: { sessionID: string; messageID?: string; callID?: string; tool: string; error: string }) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false) return
    const ctx = yield* InstanceState.context
    yield* Effect.promise(async () => {
      const error = redactSecrets(input.error).slice(0, 2000)
      await Memory.save(store, resolveProjectRoot(ctx), {
        summary: `${input.tool} tool error: ${error.slice(0, 300)}`,
        content: error,
        tags: ["tool-error", input.tool],
      })
      await Audit.record(store, resolveProjectRoot(ctx), {
        type: "tool.error",
        sessionID: input.sessionID,
        detail: error,
        data: { messageID: input.messageID, callID: input.callID, tool: input.tool },
      })
    })
  })
  const snapshotCompaction = Effect.fn("Learning.snapshotCompaction")(function* (input: { sessionID: string; summary: string }) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false) return
    const ctx = yield* InstanceState.context
    yield* Effect.promise(() => State.commit(store, resolveProjectRoot(ctx), { sessionID: input.sessionID, summary: redactSecrets(input.summary).slice(0, 5000) }))
  })
  const compacted = Effect.fn("Learning.compacted")(function* (input: { sessionID: string; summary: string }) {
    const settings = yield* config.get()
    if (settings.learning?.enabled === false) return
    const ctx = yield* InstanceState.context
    yield* Effect.promise(async () => {
      await Memory.save(store, resolveProjectRoot(ctx), {
        summary: `Session ${input.sessionID} compaction`,
        content: redactSecrets(input.summary).slice(0, 5000),
        tags: ["compaction", "session-summary"],
      })
      await Knowledge.indexSummary(store, resolveProjectRoot(ctx), input)
      void runDream(store, resolveProjectRoot(ctx)).catch(() => undefined)
    })
  })
  const installPack = Effect.fn("Learning.installPack")(function* (input: { url: string }) {
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(() => Community.install(store, resolveProjectRoot(ctx), input.url))
  })
  const knowledge = Effect.fn("Learning.knowledge")(function* (input: { terms: readonly string[]; target?: "wiki" | "codegraph" | "graph"; limit?: number }) {
    const ctx = yield* InstanceState.context
    return yield* Effect.promise(() => Knowledge.query(store, resolveProjectRoot(ctx), input))
  })
  return Service.of({ onShellResult, context, status, remember, correct, recall, consolidate, history, report, reindex, modelStatus, deleteModel, downloadModel, export: exportData, clear, sessionEnded, completeTurn, recordToolError, snapshotCompaction, compacted, installPack, knowledge })
}))

function awaitPromise<A>(promise: Promise<A>) {
  return Effect.promise(() => promise)
}

function captureKey(sessionID?: string, messageID?: string) {
  return `${sessionID ?? "unknown"}:${messageID ?? "unknown"}`
}

async function persistCaptures(store: LearningStore, worktree: string, pending: Map<string, ShellResult[]>) {
  await store.ensureProject(worktree)
  await store.write(projectCaptures(worktree), [...pending.entries()].flatMap(([key, captures]) => captures.map((capture) => ({ ...capture, key }))).slice(-50))
}

export async function learnCapturedFailures(store: LearningStore, worktree: string, captures: readonly ShellResult[], successfulCommand?: string, projectID?: string) {
  if (!captures.length) return []
  const file = projectPatterns(worktree)
  const patterns = await store.read(file, [] as Pattern[])
  const added: Pattern[] = []
  for (const capture of captures) {
    const generated = generatePattern({ output: capture.output, failedCommand: capture.command, successfulCommand, projectID })
    if (generated && !patterns.some((pattern) => pattern.id === generated.id)) {
      patterns.push(generated)
      added.push(generated)
    }
    await Memory.save(store, worktree, {
      summary: redactSecrets(capture.output).slice(0, 300),
      content: `Failed command: ${redactSecrets(capture.command)}`,
    })
  }
  await store.write(file, patterns.slice(-500))
  return added
}

export const node = LayerNode.make({ service: Service, layer, deps: [Config.node] })

async function handleShellResult(store: LearningStore, worktree: string, input: ShellResult, community: Pattern[] = []): Promise<LearningResult> {
  if (input.exitCode === 0 || input.exitCode === null || input.aborted || input.timedOut || input.truncated || !input.output.trim()) return { status: "disabled" }
  const output = redactSecrets(input.output.slice(-4000))
  const patterns = await store.read(projectPatterns(worktree), [] as Pattern[])
  const global = await store.read(globalPatterns(), [] as Pattern[])
  const hit = new PatternRegistry({ project: patterns, global, community, bundled: builtins }).match(output)
  await store.append(projectAudit(worktree), { type: hit ? "pattern.match" : "pattern.miss", timestamp: Date.now(), command: redactSecrets(input.command), exitCode: input.exitCode, patternID: hit?.pattern.id })
  if (!hit) {
    if (isSensitivePath(input.cwd)) return { status: "disabled" }
    return { status: "none" }
  }
  return { status: "matched", patternID: hit.pattern.id, description: hit.pattern.description, fixes: hit.pattern.fixes, trusted: hit.pattern.fixes.some((fix) => fix.trusted === true), source: hit.pattern.scope, captures: hit.captures }
}
