const NODE_WIDTH = 180;
const NODE_HEIGHT = 180;
const COL_GAP = 80;
const ROW_GAP = 80;

/**
 * Tidies up nodes by grouping them into rows based on their current Y
 * positions, then redistributing with uniform spacing. The overall centroid
 * of all nodes is preserved so the layout stays roughly where the user
 * placed it on the canvas.
 *
 * Row membership: nodes whose Y falls within NODE_HEIGHT * 0.75 of the
 * row's first node are considered in the same row. Within each row, nodes
 * are sorted left-to-right by their original X.
 */
export function tidyLayout(nodes) {
  if (nodes.length === 0) return nodes;

  const ROW_THRESHOLD = NODE_HEIGHT * 0.75;

  // Sort a copy by Y ascending
  const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);

  // Cluster into rows
  const rows = [];
  for (const node of sorted) {
    const lastRow = rows[rows.length - 1];
    if (!lastRow || node.position.y - lastRow.minY > ROW_THRESHOLD) {
      rows.push({ minY: node.position.y, nodes: [node] });
    } else {
      lastRow.nodes.push(node);
    }
  }

  // Sort each row left-to-right
  rows.forEach((row) => row.nodes.sort((a, b) => a.position.x - b.position.x));

  // Compute centroid of original positions (node centres)
  const centerX = nodes.reduce((s, n) => s + n.position.x + NODE_WIDTH / 2, 0) / nodes.length;
  const centerY = nodes.reduce((s, n) => s + n.position.y + NODE_HEIGHT / 2, 0) / nodes.length;

  const totalHeight = rows.length * NODE_HEIGHT + (rows.length - 1) * ROW_GAP;
  const originY = centerY - totalHeight / 2;

  // Build a map from id → new position
  const newPositions = new Map();
  rows.forEach((row, rowIdx) => {
    const rowWidth = row.nodes.length * NODE_WIDTH + (row.nodes.length - 1) * COL_GAP;
    const rowOriginX = centerX - rowWidth / 2;
    const y = originY + rowIdx * (NODE_HEIGHT + ROW_GAP);
    row.nodes.forEach((node, colIdx) => {
      newPositions.set(node.id, {
        x: rowOriginX + colIdx * (NODE_WIDTH + COL_GAP),
        y,
      });
    });
  });

  return nodes.map((node) => ({ ...node, position: newPositions.get(node.id) }));
}
