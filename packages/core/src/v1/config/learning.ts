import { Schema } from "effect"

const Scope = Schema.Literals(["project", "global"])
const Privacy = Schema.Literals(["balanced", "strict", "public"])
const PositiveInt = Schema.Int.check(Schema.isGreaterThan(0))
const Probability = Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 }))

export const Info = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  automatic: Schema.optional(Schema.Boolean),
  autoFix: Schema.optional(Schema.Boolean),
  retryOriginal: Schema.optional(Schema.Boolean),
  scope: Schema.optional(Scope),
  globalPromotionThreshold: Schema.optional(PositiveInt),
  privacy: Schema.optional(Privacy),
  recall: Schema.optional(Schema.Boolean),
  recallModel: Schema.optional(Schema.String),
  recallThreshold: Schema.optional(Probability),
  recallTopK: Schema.optional(PositiveInt),
  captureLimit: Schema.optional(PositiveInt),
  patternLimit: Schema.optional(PositiveInt),
  memoryLimit: Schema.optional(PositiveInt),
  stateCommitLimit: Schema.optional(PositiveInt),
  auditLimit: Schema.optional(PositiveInt),
  autoPromote: Schema.optional(Schema.Boolean),
  promotionThreshold: Schema.optional(PositiveInt),
  communityPacks: Schema.optional(Schema.Boolean),
  dream: Schema.optional(Schema.Boolean),
  audit: Schema.optional(Schema.Boolean),
  watch: Schema.optional(Schema.Boolean),
  wiki: Schema.optional(Schema.Boolean),
  graph: Schema.optional(Schema.Boolean),
  retentionDays: Schema.optional(PositiveInt),
})

export type Info = Schema.Schema.Type<typeof Info>
