const NODE_WIDTH = 180;
const NODE_HEIGHT = 42;
const GRID_X = NODE_WIDTH + 8;    // horizontal grid cell size
const GRID_Y = NODE_HEIGHT + 40;  // vertical grid cell size
const STAGGER = GRID_X / 2;       // odd rows are shifted right by this amount

/** Returns the pixel X origin for a given row (staggered grid). */
function rowOriginX(baseX, row) {
  return baseX + (row % 2 !== 0 ? STAGGER : 0);
}

/**
 * Snaps every node to the nearest staggered-grid point without moving it far
 * from its current position. Odd rows are offset by half a cell width so the
 * layout has a brick-wall pattern. Collisions are resolved by searching
 * outward to the nearest free cell.
 */
export function tidyLayout(nodes) {
  if (nodes.length === 0) return nodes;

  // Use the top-left-most node as the grid anchor so the snap is stable.
  const anchor = nodes.reduce((best, n) =>
    n.position.y < best.position.y || (n.position.y === best.position.y && n.position.x < best.position.x)
      ? n : best
  );
  const originX = anchor.position.x;
  const originY = anchor.position.y;

  const occupied = new Map(); // "col,row" → node id

  const snapped = nodes.map((node) => {
    // Snap row first, then snap col relative to that row's staggered origin.
    const row = Math.round((node.position.y - originY) / GRID_Y);
    const col = Math.round((node.position.x - rowOriginX(originX, row)) / GRID_X);
    return { node, col, row };
  });

  // Process nodes closest-to-their-desired-cell first (they have priority).
  snapped.sort((a, b) => {
    const distA = Math.hypot(
      a.node.position.x - (rowOriginX(originX, a.row) + a.col * GRID_X),
      a.node.position.y - (originY + a.row * GRID_Y),
    );
    const distB = Math.hypot(
      b.node.position.x - (rowOriginX(originX, b.row) + b.col * GRID_X),
      b.node.position.y - (originY + b.row * GRID_Y),
    );
    return distA - distB;
  });

  for (const entry of snapped) {
    const { col: wantCol, row: wantRow } = entry;
    let placed = false;
    for (let d = 0; d < 50 && !placed; d++) {
      for (let dc = -d; dc <= d && !placed; dc++) {
        const drAbs = d - Math.abs(dc);
        for (const dr of drAbs === 0 ? [0] : [-drAbs, drAbs]) {
          const key = `${wantCol + dc},${wantRow + dr}`;
          if (!occupied.has(key)) {
            entry.col = wantCol + dc;
            entry.row = wantRow + dr;
            occupied.set(key, entry.node.id);
            placed = true;
            break;
          }
        }
      }
    }
  }

  return nodes.map((node) => {
    const entry = snapped.find((s) => s.node.id === node.id);
    return {
      ...node,
      position: {
        x: rowOriginX(originX, entry.row) + entry.col * GRID_X,
        y: originY + entry.row * GRID_Y,
      },
    };
  });
}
