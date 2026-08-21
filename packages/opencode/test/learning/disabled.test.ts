import { existsSync } from "node:fs"
import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Config } from "@/config/config"
import * as Learning from "@/learning/service"
import { LearningStore } from "@/learning/store"
import { projectAudit, projectCaptures, projectMemories, projectPatterns } from "@/learning/paths"
import type { Pattern } from "@/learning/schema"
import { provideInstance, testInstanceStoreLayer, tmpdir } from "../fixture/fixture"

const info = (learning: Record<string, unknown> | undefined) => ({ ...(learning ? { learning } : {}) }) as ConfigV1.Info

const configStub = (learning: Record<string, unknown> | undefined) =>
  LayerNode.make({
    service: Config.Service,
    layer: Layer.succeed(
      Config.Service,
      Config.Service.of({
        get: () => Effect.succeed(info(learning)),
        getGlobal: () => Effect.succeed(info(undefined)),
        getConsoleState: () => Effect.die("unused in learning tests"),
        update: () => Effect.void,
        updateGlobal: () => Effect.succeed({ info: info(undefined), changed: false }),
        invalidate: () => Effect.void,
        directories: () => Effect.succeed([]),
        waitForDependencies: () => Effect.void,
      }),
    ),
    deps: [],
  })

const layerFor = (learning: Record<string, unknown> | undefined) =>
  Layer.merge(testInstanceStoreLayer, LayerNode.compile(Learning.node, [[Config.node, configStub(learning)]]))

const failing = (cwd: string): Learning.ShellResult => ({
  sessionID: "ses_test",
  messageID: "msg_test",
  command: "bun test",
  cwd,
  exitCode: 1,
  output: "Error: Cannot find module 'missing-dep'",
})

describe("learning feature switch", () => {
  test("enabled=false stops automatic detection, context injection, and lifecycle writes", async () => {
    await using tmp = await tmpdir()
    const program = Effect.gen(function* () {
      const learning = yield* Learning.Service
      const result = yield* learning.onShellResult(failing(tmp.path))
      expect(result.status).toBe("disabled")
      expect(yield* learning.context({ command: undefined })).toBe("")
      expect((yield* learning.status()).enabled).toBe(false)
      yield* learning.sessionEnded({ sessionID: "ses_test", summary: "did things" })
      yield* learning.completeTurn({ sessionID: "ses_test", messageID: "msg_test" })
      yield* learning.recordToolError({ sessionID: "ses_test", tool: "bash", error: "boom" })
      yield* learning.snapshotCompaction({ sessionID: "ses_test", summary: "summary" })
      yield* learning.compacted({ sessionID: "ses_test", summary: "summary" })
      expect(yield* learning.history()).toEqual([])
      const store = new LearningStore()
      expect((yield* Effect.promise(() => store.read(projectPatterns(tmp.path), [] as Pattern[]))).length).toBe(0)
      expect((yield* Effect.promise(() => store.read(projectMemories(tmp.path), [] as unknown[]))).length).toBe(0)
      expect(existsSync(projectAudit(tmp.path))).toBe(false)
      expect(existsSync(projectCaptures(tmp.path))).toBe(false)
    })
    await Effect.runPromise(program.pipe(provideInstance(tmp.path), Effect.provide(layerFor({ enabled: false }))))
  })

  test("manual surfaces stay available while disabled", async () => {
    await using tmp = await tmpdir()
    const program = Effect.gen(function* () {
      const learning = yield* Learning.Service
      yield* learning.remember({ summary: "Manual note", content: "Bun prefers bun install" })
      yield* learning.correct({ rule: "Use bun instead of npm" })
      const memories = yield* learning.recall({ terms: ["bun"], limit: 5 })
      expect(memories.length).toBeGreaterThan(0)
      expect((yield* learning.status()).projectPatterns).toBe(0)
    })
    await Effect.runPromise(program.pipe(provideInstance(tmp.path), Effect.provide(layerFor({ enabled: false }))))
  })

  test("default configuration keeps automatic learning on", async () => {
    await using tmp = await tmpdir()
    const program = Effect.gen(function* () {
      const learning = yield* Learning.Service
      const result = yield* learning.onShellResult(failing(tmp.path))
      expect(result.status).toBe("matched")
      expect(result.patternID).toBe("node-module-not-found")
      expect((yield* learning.status()).enabled).toBe(true)
    })
    await Effect.runPromise(program.pipe(provideInstance(tmp.path), Effect.provide(layerFor(undefined))))
  })
})
