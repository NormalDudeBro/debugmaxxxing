import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { InstanceRef } from "@/effect/instance-ref"
import * as Learning from "@/learning/service"

export const LearningCommand = effectCmd({
  command: "learning <action>",
  describe: "inspect or update local error learning",
  builder: (yargs) =>
    yargs
      .positional("action", {
        describe: "learning action",
        choices: ["status", "remember", "correct", "recall", "dream", "history", "report", "export", "clear", "reindex", "model-status", "model-download", "model-delete", "pack-install", "wiki-query", "codegraph-query", "graph-query"] as const,
      })
      .option("summary", { type: "string", describe: "memory summary" })
      .option("content", { type: "string", describe: "memory content" })
      .option("rule", { type: "string", describe: "correction rule" })
      .option("scope", { type: "string", choices: ["project", "global"] as const })
      .option("query", { type: "string", describe: "recall query" })
      .option("limit", { type: "number", describe: "maximum results" })
      .option("url", { type: "string", describe: "HTTPS community pack URL" }),
  handler: Effect.fn("Cli.learning")(function* (args) {
    if (!(yield* InstanceRef)) return
    const learning = yield* Learning.Service
    if (args.action === "status") return print(yield* learning.status())
    if (args.action === "remember") {
      if (!args.summary || !args.content) throw new Error("remember requires --summary and --content")
      yield* learning.remember({ summary: args.summary, content: args.content, scope: args.scope })
      console.log("Memory saved.")
      return
    }
    if (args.action === "correct") {
      if (!args.rule) throw new Error("correct requires --rule")
      yield* learning.correct({ rule: args.rule, scope: args.scope })
      console.log("Correction saved.")
      return
    }
    if (args.action === "recall") {
      if (!args.query) throw new Error("recall requires --query")
      return print(yield* learning.recall({ terms: args.query.split(/\W+/).filter(Boolean), limit: args.limit }))
    }
    if (args.action === "dream") return print(yield* learning.consolidate())
    if (args.action === "history") return print(yield* learning.history(args.limit))
    if (args.action === "report") return print(yield* learning.report())
    if (args.action === "export") return print(yield* learning.export())
    if (args.action === "reindex") return print(yield* learning.reindex())
    if (args.action === "model-status") return print(yield* learning.modelStatus())
    if (args.action === "model-download") return print(yield* learning.downloadModel())
    if (args.action === "pack-install") {
      if (!args.url) throw new Error("pack-install requires --url")
      return print(yield* learning.installPack({ url: args.url }))
    }
    if (["wiki-query", "codegraph-query", "graph-query"].includes(args.action)) {
      if (!args.query) throw new Error(`${args.action} requires --query`)
      const target = args.action === "wiki-query" ? "wiki" as const : args.action === "codegraph-query" ? "codegraph" as const : "graph" as const
      return print(yield* learning.knowledge({ terms: args.query.split(/\W+/).filter(Boolean), target, limit: args.limit }))
    }
    if (args.action === "model-delete") yield* learning.deleteModel()
    else yield* learning.clear(args.scope)
    console.log(args.action === "model-delete" ? "Local learning model deleted." : "Learning data cleared.")
  }),
})

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2))
}
