import { Schema } from "effect"

export const Scope = Schema.Literals(["project", "global", "community", "bundled"])
export const Privacy = Schema.Literals(["public", "private", "sensitive", "never_send"])

export const Fix = Schema.Struct({
  id: Schema.String,
  description: Schema.String,
  command: Schema.optional(Schema.String),
  instructions: Schema.optional(Schema.String),
  priority: Schema.Number,
  trusted: Schema.optional(Schema.Boolean),
  shouldRetry: Schema.optional(Schema.Boolean),
  observedCommandHash: Schema.optional(Schema.String),
})

export const Pattern = Schema.Struct({
  id: Schema.String,
  regex: Schema.String,
  category: Schema.String,
  description: Schema.String,
  fixes: Schema.Array(Fix),
  scope: Scope,
  success: Schema.Number,
  failures: Schema.Number,
  version: Schema.optional(Schema.Number),
  provenance: Schema.optional(Schema.String),
  projectID: Schema.optional(Schema.String),
  confidence: Schema.optional(Schema.Number),
  createdAt: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String),
})

export const Capture = Schema.Struct({
  id: Schema.String,
  sessionID: Schema.optional(Schema.String),
  messageID: Schema.optional(Schema.String),
  callID: Schema.optional(Schema.String),
  command: Schema.String,
  cwd: Schema.String,
  output: Schema.String,
  exitCode: Schema.Number,
  createdAt: Schema.String,
  version: Schema.optional(Schema.Number),
})

export const Memory = Schema.Struct({
  id: Schema.String,
  summary: Schema.String,
  content: Schema.String,
  scope: Schema.Literals(["project", "global"]),
  privacy: Privacy,
  tags: Schema.optional(Schema.Array(Schema.String)),
  accessCount: Schema.optional(Schema.Number),
  createdAt: Schema.String,
  updatedAt: Schema.optional(Schema.String),
  version: Schema.optional(Schema.Number),
})

export const Correction = Schema.Struct({
  id: Schema.String,
  rule: Schema.String,
  scope: Schema.Literals(["project", "global"]),
  strength: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  promotedAt: Schema.optional(Schema.String),
  version: Schema.optional(Schema.Number),
})

export const StateCommit = Schema.Struct({
  id: Schema.String,
  parent: Schema.optional(Schema.String),
  sessionID: Schema.optional(Schema.String),
  summary: Schema.String,
  createdAt: Schema.String,
  version: Schema.optional(Schema.Number),
})

export const StateHead = Schema.Struct({
  commit: Schema.optional(Schema.String),
  updatedAt: Schema.String,
  version: Schema.optional(Schema.Number),
})

export const AuditEvent = Schema.Struct({
  id: Schema.optional(Schema.String),
  type: Schema.String,
  timestamp: Schema.Number,
  sessionID: Schema.optional(Schema.String),
  patternID: Schema.optional(Schema.String),
  command: Schema.optional(Schema.String),
  detail: Schema.optional(Schema.String),
  version: Schema.optional(Schema.Number),
})

export const Migration = Schema.Struct({
  version: Schema.Number,
  migratedAt: Schema.String,
  sources: Schema.Array(Schema.String),
})

export type Fix = Schema.Schema.Type<typeof Fix>
export type Pattern = Schema.Schema.Type<typeof Pattern>
export type Capture = Schema.Schema.Type<typeof Capture>
export type Memory = Schema.Schema.Type<typeof Memory>
export type Correction = Schema.Schema.Type<typeof Correction>
export type StateCommit = Schema.Schema.Type<typeof StateCommit>
export type StateHead = Schema.Schema.Type<typeof StateHead>
export type AuditEvent = Schema.Schema.Type<typeof AuditEvent>

export type PatternMatch = { pattern: Pattern; captures: string[] }
