import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"

const root = "/learning"

const Scope = Schema.optional(Schema.Literals(["project", "global"]))
const RememberPayload = Schema.Struct({
  summary: Schema.String,
  content: Schema.String,
  scope: Scope,
})
const CorrectPayload = Schema.Struct({
  rule: Schema.String,
  scope: Scope,
})
const Status = Schema.Record(Schema.String, Schema.Unknown)
const RecallPayload = Schema.Struct({ terms: Schema.Array(Schema.String), limit: Schema.optional(Schema.Number) })
const ClearPayload = Schema.Struct({ scope: Scope })
const ModelDownloadPayload = Schema.Struct({ download: Schema.optional(Schema.Boolean) })
const PackInstallPayload = Schema.Struct({ url: Schema.String })
const KnowledgePayload = Schema.Struct({ terms: Schema.Array(Schema.String), target: Schema.optional(Schema.Literals(["wiki", "codegraph", "graph"])), limit: Schema.optional(Schema.Number) })

export const LearningApi = HttpApi.make("learning")
  .add(
    HttpApiGroup.make("learning")
      .add(
        HttpApiEndpoint.get("status", `${root}/status`, {
          query: WorkspaceRoutingQuery,
          success: Status,
        }),
        HttpApiEndpoint.post("remember", `${root}/remember`, {
          query: WorkspaceRoutingQuery,
          payload: RememberPayload,
          success: Schema.Boolean,
        }),
        HttpApiEndpoint.post("correct", `${root}/correct`, {
          query: WorkspaceRoutingQuery,
          payload: CorrectPayload,
          success: Schema.Boolean,
        }),
        HttpApiEndpoint.post("recall", `${root}/recall`, { query: WorkspaceRoutingQuery, payload: RecallPayload, success: Schema.Array(Schema.Unknown) }),
        HttpApiEndpoint.post("dream", `${root}/dream`, { query: WorkspaceRoutingQuery, success: Status }),
        HttpApiEndpoint.get("history", `${root}/history`, { query: WorkspaceRoutingQuery, success: Schema.Array(Schema.Unknown) }),
        HttpApiEndpoint.get("report", `${root}/report`, { query: WorkspaceRoutingQuery, success: Status }),
        HttpApiEndpoint.get("export", `${root}/export`, { query: WorkspaceRoutingQuery, success: Status }),
        HttpApiEndpoint.post("reindex", `${root}/reindex`, { query: WorkspaceRoutingQuery, success: Status }),
        HttpApiEndpoint.get("modelStatus", `${root}/model`, { query: WorkspaceRoutingQuery, success: Status }),
        HttpApiEndpoint.post("modelDownload", `${root}/model`, { query: WorkspaceRoutingQuery, payload: ModelDownloadPayload, success: Status }),
        HttpApiEndpoint.delete("modelDelete", `${root}/model`, { query: WorkspaceRoutingQuery, success: Schema.Boolean }),
        HttpApiEndpoint.post("clear", `${root}/clear`, { query: WorkspaceRoutingQuery, payload: ClearPayload, success: Schema.Boolean }),
        HttpApiEndpoint.post("packInstall", `${root}/packs`, { query: WorkspaceRoutingQuery, payload: PackInstallPayload, success: Status }),
        HttpApiEndpoint.post("knowledge", `${root}/knowledge`, { query: WorkspaceRoutingQuery, payload: KnowledgePayload, success: Schema.Unknown }),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "learning",
          description: "Inspect and update local error-learning state.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
