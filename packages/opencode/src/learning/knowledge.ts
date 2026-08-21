import fs from "node:fs/promises"
import { createHash } from "node:crypto"
import { glob } from "glob"
import { LearningStore } from "./store"
import { projectCodegraph, projectGraph, projectWiki } from "./paths"
import * as Wiki from "./wiki"
import * as Codegraph from "./codegraph"
import * as Graph from "./graph"
import { redactSecrets } from "./privacy"

export async function indexSummary(store: LearningStore, worktree: string, input: { sessionID: string; summary: string }) {
  const pages = await store.read(projectWiki(worktree), [] as Wiki.WikiPage[])
  const id = `session-${createHash("sha256").update(input.sessionID).digest("hex").slice(0, 16)}`
  const page: Wiki.WikiPage = { id, title: `Session ${input.sessionID}`, body: redactSecrets(input.summary).slice(0, 10_000), tags: ["session", "compaction"] }
  const index = pages.findIndex((item) => item.id === id)
  if (index >= 0) pages[index] = page
  else pages.push(page)
  await store.write(projectWiki(worktree), pages.slice(-500))
  await rebuildGraph(store, worktree)
  return page
}

export async function indexCode(store: LearningStore, worktree: string) {
  const paths = (await glob("**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,rb}", {
    cwd: worktree,
    nodir: true,
    ignore: ["node_modules/**", ".git/**", ".opencode/**", "dist/**", "build/**"],
  })).sort().slice(0, 1000)
  const files: Codegraph.CodeFile[] = []
  for (const relative of paths) {
    const text = await fs.readFile(`${worktree}/${relative}`, "utf8").catch(() => "")
    if (!text || text.length > 500_000) continue
    const symbols = [...text.matchAll(/\b(?:function|class|interface|type|def|func|struct|module)\s+([A-Za-z_$][\w$]*)/g)]
      .map((match) => match[1]!)
      .slice(0, 100)
    const imports = [...text.matchAll(/(?:from\s+|require\s*\(|import\s+[^"']*?["'])([A-Za-z0-9_./@-]+)/g)]
      .map((match) => match[1]!)
      .slice(0, 100)
    files.push({ path: relative.replaceAll("\\", "/"), title: relative.split(/[\\/]/).at(-1) ?? relative, symbols, imports, hash: createHash("sha256").update(text).digest("hex") })
  }
  await store.write(projectCodegraph(worktree), files)
  await rebuildGraph(store, worktree)
  return files.length
}

export async function query(store: LearningStore, worktree: string, input: { terms: readonly string[]; target?: "wiki" | "codegraph" | "graph"; limit?: number }) {
  const target = input.target ?? "graph"
  const limit = input.limit ?? 20
  if (target === "wiki") {
    const pages = await store.read(projectWiki(worktree), [] as Wiki.WikiPage[])
    const terms = input.terms.map((term) => term.toLowerCase())
    return pages.filter((page) => terms.some((term) => `${page.title} ${page.body} ${page.tags.join(" ")}`.toLowerCase().includes(term))).slice(0, limit)
  }
  if (target === "codegraph") return Codegraph.query(await store.read(projectCodegraph(worktree), [] as Codegraph.CodeFile[]), input.terms, limit)
  return Graph.query(await store.read(projectGraph(worktree), Graph.build([], [])), input.terms, limit)
}

async function rebuildGraph(store: LearningStore, worktree: string) {
  const pages = await store.read(projectWiki(worktree), [] as Wiki.WikiPage[])
  const files = await store.read(projectCodegraph(worktree), [] as Codegraph.CodeFile[])
  const pageIndex = Wiki.index(pages)
  const nodes: Graph.GraphNode[] = [
    ...pages.map((page) => ({ id: `wiki:${page.id}`, type: "wiki", label: page.title, text: page.body })),
    ...files.map((file) => ({ id: `file:${file.path}`, type: "file", label: file.path, text: file.symbols?.join(" ") })),
  ]
  const edges: Graph.GraphEdge[] = []
  for (const [target, sources] of pageIndex.backlinks) for (const source of sources) edges.push({ from: `wiki:${source}`, to: `wiki:${target}`, type: "links" })
  const filePaths = new Set(files.map((file) => file.path))
  for (const file of files) for (const imported of file.imports ?? []) if (filePaths.has(imported)) edges.push({ from: `file:${file.path}`, to: `file:${imported}`, type: "imports" })
  await store.write(projectGraph(worktree), Graph.build(nodes, edges))
}
