import fs from "node:fs/promises"
import { modelCacheDir } from "../paths"

export const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2"

type Extractor = (text: string, options: { pooling: "mean"; normalize: true }) => Promise<{ data: Float32Array }>
const loaded = new Map<string, Promise<Extractor>>()

export async function embed(text: string, model = DEFAULT_MODEL) {
  const extractor = await get(model)
  const result = await extractor(text.slice(0, 8000), { pooling: "mean", normalize: true })
  return Array.from(result.data)
}

export async function status(model = DEFAULT_MODEL) {
  const cache = modelCacheDir()
  const entries = await fs.readdir(cache, { recursive: true }).catch(() => [])
  const ready = entries.length > 0
  return { ready, mode: ready ? "semantic" as const : "lexical" as const, model: ready ? model : null, cache }
}

export async function removeModel() {
  loaded.clear()
  await fs.rm(modelCacheDir(), { recursive: true, force: true })
}

export async function downloadModel(model = DEFAULT_MODEL) {
  await embed("local learning model readiness", model)
  return status(model)
}

async function get(model: string) {
  const existing = loaded.get(model)
  if (existing) return existing
  const loading = import("@xenova/transformers").then(async ({ env, pipeline }) => {
    env.cacheDir = modelCacheDir()
    return await pipeline("feature-extraction", model, { quantized: true }) as unknown as Extractor
  })
  loaded.set(model, loading)
  loading.catch(() => loaded.delete(model))
  return loading
}
