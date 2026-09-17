#!/usr/bin/env bun

import path from "path"

const root = path.resolve(import.meta.dir, "../vendor/mattpocock-skills")
const skillsRoot = path.join(root, "skills")
const output = path.resolve(import.meta.dir, "../src/plugin/mattpocock.generated.ts")
const source = await Bun.file(path.join(root, "SOURCE.md")).text()
const revision = source.match(/Revision:\s+([0-9a-f]{40})/)?.[1]
if (!revision) throw new Error("vendor SOURCE.md is missing a 40-character revision")

const files = (await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: skillsRoot, onlyFiles: true, dot: true }))).toSorted()
if (files.length === 0) throw new Error("no vendored Matt Pocock skill files found")

const contents: Record<string, string> = {}
const skills: Array<{ name: string; description: string; file: string }> = []
for (const file of files) {
  const relative = file.replaceAll("\\", "/")
  const text = await Bun.file(path.join(skillsRoot, file)).text()
  if (text.includes("\0")) throw new Error(`binary content is not supported: ${file}`)
  contents[relative] = text
  if (!relative.endsWith("/SKILL.md")) continue
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/)
  const name = match?.[1].match(/^name:\s*(.+)$/m)?.[1].trim()
  const description = match?.[1].match(/^description:\s*(.+)$/m)?.[1].trim()
  if (!name || !description) throw new Error(`skill frontmatter is incomplete: ${file}`)
  skills.push({ name, description, file: relative })
}

skills.sort((a, b) => a.name.localeCompare(b.name))
const generated = [
  `export const revision = ${JSON.stringify(revision)}`,
  `export const skills = ${JSON.stringify(skills, null, 2)} as const`,
  `export const files: Readonly<Record<string, string>> = ${JSON.stringify(contents, null, 2)}`,
  "",
].join("\n")
if (process.argv.includes("--check")) {
  const current = await Bun.file(output).text().catch(() => "")
  if (current !== generated) throw new Error(`generated manifest is stale: ${output}`)
  console.log(`manifest is current: ${output}`)
} else {
  await Bun.write(output, generated)
  console.log(`generated ${skills.length} skills and ${files.length} files at ${output}`)
}
