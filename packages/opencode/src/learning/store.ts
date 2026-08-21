import fs from "fs/promises"
import path from "path"
import { randomUUID } from "node:crypto"
import { Effect, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { gitignore, globalLearningDir, projectLearningDir, resolveProjectRoot } from "./paths"

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`
  await fs.writeFile(temp, JSON.stringify(value, null, 2), "utf8")
  try {
    await fs.rename(temp, file)
  } catch (error) {
    await fs.rm(temp, { force: true })
    throw error
  }
}

export class LearningStore {
  private readonly writes = new Map<string, Promise<void>>()
  readonly project = Effect.map(InstanceState.context, (ctx) => projectLearningDir(resolveProjectRoot(ctx)))
  readonly global = Effect.succeed(globalLearningDir())

  private serialize(file: string, operation: () => Promise<void>) {
    const previous = this.writes.get(file) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(operation)
    this.writes.set(file, next)
    return next.finally(() => {
      if (this.writes.get(file) === next) this.writes.delete(file)
    })
  }

  async ensureProject(worktree: string) {
    const dir = projectLearningDir(worktree)
    await fs.mkdir(dir, { recursive: true })
    const ignore = "*.json\n*.jsonl\n*.db\n*.db-*\n*.key\nhistory/\n"
    await fs.writeFile(gitignore(worktree), ignore, { flag: "wx" }).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    })
    return dir
  }

  async read<T>(file: string, fallback: T) {
    return readJson(file, fallback)
  }

  async readText(file: string, fallback = "") {
    try {
      return await fs.readFile(file, "utf8")
    } catch {
      return fallback
    }
  }

  async readSchema<S extends Schema.Decoder<unknown, never>>(file: string, schema: S, fallback: S["Type"]) {
    const value = await readJson(file, undefined)
    if (value === undefined) return fallback
    return Schema.decodeUnknownSync(schema)(value)
  }

  async write(file: string, value: unknown) {
    await this.serialize(file, () => writeJson(file, value))
  }

  async append(file: string, value: unknown) {
    await this.serialize(file, async () => {
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.appendFile(file, JSON.stringify(value) + "\n", "utf8")
    })
  }

  async writeText(file: string, value: string) {
    await this.serialize(file, async () => {
      await fs.mkdir(path.dirname(file), { recursive: true })
      const temp = `${file}.${process.pid}.${randomUUID()}.tmp`
      await fs.writeFile(temp, value, "utf8")
      await fs.rename(temp, file)
    })
  }

  async remove(file: string) {
    await this.serialize(file, () => fs.rm(file, { recursive: true, force: true }))
  }
}
