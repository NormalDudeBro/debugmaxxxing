import { classify, redactSecrets } from "../privacy"

export function scan(value: string, path?: string) {
  const redacted = redactSecrets(value)
  const privacy = classify({ path, content: value })
  return { redacted, privacy, changed: redacted !== value, blocked: privacy === "never_send" }
}
