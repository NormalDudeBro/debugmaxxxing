import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import * as Learning from "@/learning/service"
import { InstanceHttpApi } from "../api"

export const learningHandlers = HttpApiBuilder.group(InstanceHttpApi, "learning", (handlers) =>
  Effect.gen(function* () {
    const learning = yield* Learning.Service
    return handlers
      .handle("status", () => learning.status())
      .handle("remember", (ctx) => learning.remember(ctx.payload).pipe(Effect.as(true)))
      .handle("correct", (ctx) => learning.correct(ctx.payload).pipe(Effect.as(true)))
      .handle("recall", (ctx) => learning.recall(ctx.payload))
      .handle("dream", () => learning.consolidate())
      .handle("history", () => learning.history())
      .handle("report", () => learning.report())
      .handle("export", () => learning.export())
      .handle("reindex", () => learning.reindex())
      .handle("modelStatus", () => learning.modelStatus())
      .handle("modelDownload", (ctx) => ctx.payload.download === false ? learning.modelStatus() : learning.downloadModel())
      .handle("modelDelete", () => learning.deleteModel().pipe(Effect.as(true)))
      .handle("clear", (ctx) => learning.clear(ctx.payload.scope).pipe(Effect.as(true)))
      .handle("packInstall", (ctx) => learning.installPack(ctx.payload))
      .handle("knowledge", (ctx) => learning.knowledge(ctx.payload))
  }),
)
