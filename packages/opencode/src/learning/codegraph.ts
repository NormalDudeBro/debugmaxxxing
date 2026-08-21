export type CodeFile = { path: string; title: string; symbols?: string[]; imports?: string[]; hash?: string }

export function update(files: readonly CodeFile[], changes: readonly CodeFile[], deleted: readonly string[] = []) {
  const next = new Map(files.map((file) => [file.path, file]))
  for (const path of deleted) next.delete(path)
  for (const file of changes) next.set(file.path, file)
  return [...next.values()].sort((a, b) => a.path.localeCompare(b.path))
}

export function query(files: readonly CodeFile[], terms: readonly string[], limit = 10) {
  const lower = terms.map((term) => term.toLowerCase()).filter(Boolean)
  return files
    .map((file) => ({ file, score: lower.reduce((score, term) => score + (`${file.path} ${file.title} ${(file.symbols ?? []).join(" ")}`.toLowerCase().includes(term) ? 1 : 0), 0) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path))
    .slice(0, limit)
    .map((item) => item.file)
}
