import { evaluate } from "./policy"
import { scan } from "./secret"

export function inspect(value: string, path?: string) {
  return { ...scan(value, path), alerts: evaluate(value) }
}

export * as Policy from "./policy"
export * as Secret from "./secret"
export * as Store from "./store"
