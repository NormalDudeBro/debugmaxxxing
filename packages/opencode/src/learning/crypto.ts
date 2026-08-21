import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

export type Sealed = {
  version: 1
  algorithm: "aes-256-gcm"
  iv: string
  tag: string
  data: string
}

export async function loadOrCreateKey(file: string) {
  try {
    return await loadKey(file)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    const key = randomBytes(32)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, key.toString("base64"), { encoding: "utf8", mode: 0o600, flag: "wx" })
    return key
  }
}

export async function loadKey(file: string) {
  const key = Buffer.from((await fs.readFile(file, "utf8")).trim(), "base64")
  if (key.length !== 32) throw new Error("invalid learning encryption key")
  return key
}

export function seal(value: string, key: Uint8Array): Sealed {
  if (key.length !== 32) throw new Error("learning encryption key must be 32 bytes")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return { version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") }
}

export function open(value: Sealed, key: Uint8Array) {
  if (value.version !== 1 || value.algorithm !== "aes-256-gcm") throw new Error("unsupported encrypted learning record")
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"))
  decipher.setAuthTag(Buffer.from(value.tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString("utf8")
}
