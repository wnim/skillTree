/**
 * Compute basic node statistics: mastered, inProgress, notAttempted counts.
 *
 * A node is "not attempted" when its score is null or 0 (no progress).
 * A node is "mastered" when score === 10.
 * Everything else is "in progress" (score 1–9).
 */
export function computeBasicStats(nodes) {
  let mastered = 0;
  let notAttempted = 0;
  for (const n of nodes) {
    if (n.score === 10) mastered++;
    else if (n.score == null || n.score === 0) notAttempted++;
  }
  const inProgress = nodes.length - mastered - notAttempted;
  return { mastered, inProgress, notAttempted };
}

/**
 * Practice Investment Value (PIV) — ranks partially-learned nodes by how
 * much downstream potential they unlock via prerequisite edges.
 *
 * PIV(n) = (score(n) / 10) × Σ  potential(d) / depth(n, d)
 *                              d∈descendants
 *
 * Only prerequisite edges are traversed. Nodes with score null or 10
 * are excluded from ranking.
 */

export function computeInvestmentValue(nodes, edges) {
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency list from prerequisite edges only (from → [to])
  const children = new Map();
  for (const n of nodes) children.set(n.id, []);
  for (const e of edges) {
    if (e.type !== 'prerequisite') continue;
    if (!children.has(e.from) || !nodeMap.has(e.to)) continue;
    children.get(e.from).push(e.to);
  }

  const results = [];

  for (const node of nodes) {
    const { score } = node;
    // Only nodes with score 1–9 qualify
    if (score == null || score < 1 || score > 9) continue;

    // BFS to collect all descendants with shortest depths
    const visited = new Set([node.id]);
    const queue = []; // [nodeId, depth]
    for (const child of children.get(node.id)) {
      if (!visited.has(child)) {
        visited.add(child);
        queue.push([child, 1]);
      }
    }

    let sum = 0;
    let idx = 0;
    while (idx < queue.length) {
      const [id, depth] = queue[idx++];
      const desc = nodeMap.get(id);
      const potential = desc.score == null ? 10 : 10 - desc.score;
      sum += potential / depth;

      for (const child of children.get(id) ?? []) {
        if (!visited.has(child)) {
          visited.add(child);
          queue.push([child, depth + 1]);
        }
      }
    }

    if (sum === 0) continue;

    const piv = (score / 10) * sum;
    results.push({ id: node.id, label: node.label, piv });
  }

  results.sort((a, b) => b.piv - a.piv);
  return results.slice(0, 3);
}
