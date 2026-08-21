export function valid(validUntil: string | undefined, now = Date.now()) {
  return !validUntil || Date.parse(validUntil) > now
}
