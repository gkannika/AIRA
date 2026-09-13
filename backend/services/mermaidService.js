/**
 * Converts the internal dependency graph { nodes, edges } into Mermaid.js
 * flowchart syntax for the Architecture page.
 */
function toMermaidFlowchart(graph, { maxNodes = 60 } = {}) {
  const { nodes, edges } = graph;
  const limitedNodes = nodes.slice(0, maxNodes);
  const limitedIds = new Set(limitedNodes.map((n) => n.id));
  const limitedEdges = edges.filter((e) => limitedIds.has(e.source) && limitedIds.has(e.target));

  const idMap = new Map();
  limitedNodes.forEach((n, i) => idMap.set(n.id, `n${i}`));

  const lines = ['flowchart LR'];

  for (const node of limitedNodes) {
    const safeLabel = node.label.replace(/"/g, "'");
    const shape = node.type === 'package' ? `([${safeLabel}])` : `["${safeLabel}"]`;
    lines.push(`  ${idMap.get(node.id)}${shape}`);
  }

  for (const edge of limitedEdges) {
    lines.push(`  ${idMap.get(edge.source)} --> ${idMap.get(edge.target)}`);
  }

  if (nodes.length > maxNodes) {
    lines.push(`  %% ${nodes.length - maxNodes} additional nodes omitted for readability`);
  }

  return lines.join('\n');
}

module.exports = { toMermaidFlowchart };
