export type GraphNode = { id: string; type: string; label: string; text?: string }
export type GraphEdge = { from: string; to: string; type: string }

export function build(nodes: readonly GraphNode[], edges: readonly GraphEdge[]) {
  const uniqueNodes = new Map(nodes.map((node) => [node.id, node]))
  const uniqueEdges = new Map(edges.map((edge) => [`${edge.from}\0${edge.to}\0${edge.type}`, edge]))
  return { nodes: [...uniqueNodes.values()], edges: [...uniqueEdges.values()].filter((edge) => uniqueNodes.has(edge.from) && uniqueNodes.has(edge.to)) }
}

export function query(graph: ReturnType<typeof build>, terms: readonly string[], limit = 20) {
  const normalized = terms.map((term) => term.toLowerCase()).filter(Boolean)
  const nodes = graph.nodes.filter((node) => normalized.some((term) => `${node.label} ${node.text ?? ""}`.toLowerCase().includes(term))).slice(0, limit)
  const ids = new Set(nodes.map((node) => node.id))
  return { nodes, edges: graph.edges.filter((edge) => ids.has(edge.from) || ids.has(edge.to)) }
}
