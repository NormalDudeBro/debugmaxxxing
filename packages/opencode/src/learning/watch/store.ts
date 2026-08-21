import { LearningStore } from "../store"
import { projectLearningDir } from "../paths"
import path from "node:path"

export type Alert = { id: string; policyID: string; severity: string; message: string; timestamp: number }

export async function add(store: LearningStore, worktree: string, alert: Alert) {
  const file = path.join(projectLearningDir(worktree), "alerts.json")
  const alerts = await store.read(file, [] as Alert[])
  if (!alerts.some((item) => item.id === alert.id)) alerts.push(alert)
  await store.write(file, alerts.slice(-500))
}
