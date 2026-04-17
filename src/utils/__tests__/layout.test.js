import { describe, it, expect } from 'vitest';
import { rowOriginX, tidyLayout, snapToGrid, GRID_X, GRID_Y, STAGGER } from '../layout';

describe('rowOriginX', () => {
  it('returns base X for even rows (no stagger)', () => {
    expect(rowOriginX(100, 0)).toBe(100);
    expect(rowOriginX(100, 2)).toBe(100);
    expect(rowOriginX(100, 4)).toBe(100);
  });

  it('returns base X + STAGGER for odd rows', () => {
    expect(rowOriginX(100, 1)).toBe(100 + STAGGER);
    expect(rowOriginX(100, 3)).toBe(100 + STAGGER);
  });

  it('handles negative rows', () => {
    expect(rowOriginX(0, -1)).toBe(STAGGER);
    expect(rowOriginX(0, -2)).toBe(0);
  });
});

describe('tidyLayout', () => {
  it('returns empty array for empty input', () => {
    expect(tidyLayout([])).toEqual([]);
  });

  it('preserves node count', () => {
    const nodes = [
      { id: 'a', position: { x: 10, y: 10 } },
      { id: 'b', position: { x: 300, y: 200 } },
      { id: 'c', position: { x: 600, y: 400 } },
    ];
    const result = tidyLayout(nodes);
    expect(result).toHaveLength(3);
  });

  it('snaps a single node to grid', () => {
    const nodes = [{ id: 'a', position: { x: 13, y: 17 } }];
    const result = tidyLayout(nodes);
    const pos = result[0].position;
    // Position should be grid-aligned (multiples of GRID_X / GRID_Y from origin)
    expect(pos.x % GRID_X).toBe(0);
    expect(pos.y % GRID_Y).toBe(0);
  });

  it('resolves collisions — no two nodes share the same cell', () => {
    const nodes = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: 1, y: 1 } },
      { id: 'c', position: { x: 2, y: 2 } },
    ];
    const result = tidyLayout(nodes);
    const positions = result.map((n) => `${n.position.x},${n.position.y}`);
    const unique = new Set(positions);
    expect(unique.size).toBe(result.length);
  });

  it('preserves all node IDs and other properties', () => {
    const nodes = [
      { id: 'x', label: 'X', position: { x: 50, y: 50 } },
      { id: 'y', label: 'Y', position: { x: 250, y: 150 } },
    ];
    const result = tidyLayout(nodes);
    expect(result.find((n) => n.id === 'x').label).toBe('X');
    expect(result.find((n) => n.id === 'y').label).toBe('Y');
  });
});

describe('snapToGrid', () => {
  it('snaps position to nearest grid cell with no other nodes', () => {
    const pos = snapToGrid({ x: 13, y: 17 }, [], 'dragged');
    expect(pos.x % GRID_X).toBe(0);
    expect(pos.y % GRID_Y).toBe(0);
  });

  it('avoids occupied cells', () => {
    // Place one node right at origin
    const allNodes = [{ id: 'existing', position: { x: 0, y: 0 } }];
    const pos = snapToGrid({ x: 5, y: 5 }, allNodes, 'dragged');
    // Should not land on (0,0) since that's occupied
    expect(`${pos.x},${pos.y}`).not.toBe('0,0');
  });

  it('excludes the dragged node from occupancy', () => {
    const allNodes = [{ id: 'self', position: { x: 0, y: 0 } }];
    // Snapping "self" to near origin should land on origin since self is excluded
    const pos = snapToGrid({ x: 5, y: 5 }, allNodes, 'self');
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });

  it('handles multiple occupied cells and finds free one', () => {
    const origin = { x: 0, y: 0 };
    const allNodes = [
      { id: 'a', position: { x: 0, y: 0 } },
      { id: 'b', position: { x: GRID_X, y: 0 } },
    ];
    const pos = snapToGrid({ x: 5, y: 5 }, allNodes, 'dragged');
    // Should not overlap with either occupied cell
    const occupiedPositions = allNodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(occupiedPositions).not.toContain(`${pos.x},${pos.y}`);
  });
});
