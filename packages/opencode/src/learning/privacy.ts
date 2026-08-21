const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /(?:api[_-]?key|token|secret|password)\s*[=:]\s*["']?[^\s"']+/gi,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /:\/\/[^\s/:]+:[^\s/@]+@/g,
]

export function redactSecrets(value: string) {
  return SECRET_PATTERNS.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), value)
}

export function isSensitivePath(value: string) {
  return /(^|[\\/])(?:\.env(?:[._-].*)?|\.ssh(?:[\\/].*)?|credentials?|secrets?|id_(?:rsa|ed25519|ecdsa|dsa))(?:[\\/]|$)/i.test(value)
}

export type PrivacyClass = "public" | "private" | "sensitive" | "never_send"

export function classify(input: { path?: string; content: string; tags?: string[] }): PrivacyClass {
  if (input.path && isSensitivePath(input.path)) return "never_send"
  if (input.tags?.some((tag) => /secret|credential|private[-_ ]?key/i.test(tag))) return "never_send"
  if (redactSecrets(input.content) !== input.content) return "sensitive"
  if (/\b(?:internal|private|confidential)\b/i.test(input.content)) return "private"
  return "public"
}
