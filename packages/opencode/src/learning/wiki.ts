export type WikiPage = { id: string; title: string; body: string; tags: string[] }

export function links(body: string) {
  return [...body.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1]?.trim()).filter((value): value is string => !!value)
}

export function index(pages: readonly WikiPage[]) {
  const byTitle = new Map(pages.map((page) => [page.title.toLowerCase(), page]))
  const backlinks = new Map<string, string[]>()
  for (const page of pages) {
    for (const target of links(page.body)) {
      const id = byTitle.get(target.toLowerCase())?.id
      if (!id) continue
      backlinks.set(id, [...(backlinks.get(id) ?? []), page.id])
    }
  }
  return { byTitle, backlinks }
}

export function rename(pages: readonly WikiPage[], id: string, title: string) {
  const current = pages.find((page) => page.id === id)
  if (!current) return [...pages]
  const reference = new RegExp(`\\[\\[${escapeRegex(current.title)}\\]\\]`, "gi")
  return pages.map((page) => page.id === id ? { ...page, title } : { ...page, body: page.body.replace(reference, `[[${title}]]`) })
}

export function remove(pages: readonly WikiPage[], id: string) {
  return pages.filter((page) => page.id !== id)
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
