import path from "path"
import { Effect } from "effect"
import { Global } from "@opencode-ai/core/global"
import { InstanceState } from "@/effect/instance-state"

export function resolveProjectRoot(ctx: { worktree: string; directory: string }) {
  return ctx.worktree === "/" ? ctx.directory : ctx.worktree
}

export const projectRoot = InstanceState.context.pipe(Effect.map(resolveProjectRoot))

export function projectLearningDir(worktree: string) {
  return path.join(worktree, ".opencode", "learning")
}

export function globalLearningDir() {
  return path.join(Global.Path.data, "learning")
}

export function modelCacheDir() {
  return path.join(Global.Path.cache, "learning", "models")
}

export function projectPatterns(worktree: string) {
  return path.join(projectLearningDir(worktree), "patterns.json")
}

export function globalPatterns() {
  return path.join(globalLearningDir(), "patterns.json")
}

export function globalPatternObservations() {
  return path.join(globalLearningDir(), "pattern-observations.json")
}

export function projectMemories(worktree: string) {
  return path.join(projectLearningDir(worktree), "memories.json")
}

export function globalMemories() {
  return path.join(globalLearningDir(), "memories.json")
}

export function projectAudit(worktree: string) {
  return path.join(projectLearningDir(worktree), "audit.jsonl")
}

export function globalAudit() {
  return path.join(globalLearningDir(), "audit.jsonl")
}

export function projectCorrections(worktree: string) {
  return path.join(projectLearningDir(worktree), "corrections.json")
}

export function globalCorrections() {
  return path.join(globalLearningDir(), "corrections.json")
}

export function projectCaptures(worktree: string) {
  return path.join(projectLearningDir(worktree), "captures.json")
}

export function projectHistoryDir(worktree: string) {
  return path.join(projectLearningDir(worktree), "history")
}

export function projectHead(worktree: string) {
  return path.join(projectHistoryDir(worktree), "HEAD.json")
}

export function projectWiki(worktree: string) {
  return path.join(projectLearningDir(worktree), "wiki.json")
}

export function projectCodegraph(worktree: string) {
  return path.join(projectLearningDir(worktree), "codegraph.json")
}

export function projectGraph(worktree: string) {
  return path.join(projectLearningDir(worktree), "graph.json")
}

export function projectRecall(worktree: string) {
  return path.join(projectLearningDir(worktree), "recall.db")
}

export function projectStats(worktree: string) {
  return path.join(projectLearningDir(worktree), "stats.json")
}

export function projectCommunityPacks(worktree: string) {
  return path.join(projectLearningDir(worktree), "community-packs.json")
}

export function projectKey(worktree: string) {
  return path.join(projectLearningDir(worktree), "learning.key")
}

export function globalKey() {
  return path.join(globalLearningDir(), "learning.key")
}

export function projectCommit(worktree: string, id: string) {
  return path.join(projectHistoryDir(worktree), "commits", `${id}.json`)
}

export function migrationMarker(worktree: string) {
  return path.join(projectLearningDir(worktree), "migration.json")
}

export function gitignore(worktree: string) {
  return path.join(projectLearningDir(worktree), ".gitignore")
}
