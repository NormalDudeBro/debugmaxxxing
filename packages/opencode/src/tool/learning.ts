import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import * as Learning from "@/learning/service"

const Parameters = Schema.Struct({
  action: Schema.Literals(["status", "remember", "correct", "recall", "dream", "history", "report", "export", "clear", "reindex", "model-status", "model-download", "model-delete", "pack-install", "wiki-query", "codegraph-query", "graph-query"]),
  summary: Schema.optional(Schema.String),
  content: Schema.optional(Schema.String),
  rule: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.Literals(["project", "global"])),
  terms: Schema.optional(Schema.Array(Schema.String)),
  limit: Schema.optional(Schema.Number),
  url: Schema.optional(Schema.String),
})

export const LearningTool = Tool.define("learning", Effect.gen(function* () {
  const learning = yield* Learning.Service
  return {
    description: "Inspect and update local error patterns, project memory, and behavioral corrections.",
    parameters: Parameters,
    execute: (input: Schema.Schema.Type<typeof Parameters>, _ctx: Tool.Context) => Effect.gen(function* () {
      if (input.action === "status") {
        const status = yield* learning.status()
        return { title: "Learning status", metadata: status, output: JSON.stringify(status, null, 2) }
      }
      if (input.action === "remember") {
        if (!input.summary || !input.content) throw new Error("remember requires summary and content")
        yield* learning.remember({ summary: input.summary, content: input.content, scope: input.scope })
        return { title: "Memory saved", metadata: { scope: input.scope ?? "project" }, output: "Memory saved." }
      }
      if (input.action === "correct") {
        if (!input.rule) throw new Error("correct requires rule")
        yield* learning.correct({ rule: input.rule, scope: input.scope })
        return { title: "Correction saved", metadata: { scope: input.scope ?? "project" }, output: "Correction saved." }
      }
      if (input.action === "recall") {
        if (!input.terms?.length) throw new Error("recall requires terms")
        const result = yield* learning.recall({ terms: [...input.terms], limit: input.limit })
        return json("Learning recall", result)
      }
      if (input.action === "dream") return json("Learning consolidation", yield* learning.consolidate())
      if (input.action === "history") return json("Learning history", yield* learning.history(input.limit))
      if (input.action === "report") return json("Learning report", yield* learning.report())
      if (input.action === "export") return json("Learning export", yield* learning.export())
      if (input.action === "reindex") return json("Learning reindex", yield* learning.reindex())
      if (input.action === "model-status") return json("Learning model", yield* learning.modelStatus())
      if (input.action === "model-download") return json("Learning model downloaded", yield* learning.downloadModel())
      if (input.action === "pack-install") {
        if (!input.url) throw new Error("pack-install requires url")
        return json("Community pack installed", yield* learning.installPack({ url: input.url }))
      }
      if (["wiki-query", "codegraph-query", "graph-query"].includes(input.action)) {
        if (!input.terms?.length) throw new Error(`${input.action} requires terms`)
        const target = input.action === "wiki-query" ? "wiki" as const : input.action === "codegraph-query" ? "codegraph" as const : "graph" as const
        return json("Learning knowledge", yield* learning.knowledge({ terms: input.terms, target, limit: input.limit }))
      }
      if (input.action === "model-delete") {
        yield* learning.deleteModel()
        return { title: "Learning model deleted", metadata: {}, output: "Local learning model deleted." }
      }
      yield* learning.clear(input.scope)
      return { title: "Learning data cleared", metadata: { scope: input.scope ?? "project" }, output: "Learning data cleared." }
    }),
  }
}))

function json(title: string, value: unknown) {
  return { title, metadata: {}, output: JSON.stringify(value, null, 2).slice(0, 30_000) }
}
