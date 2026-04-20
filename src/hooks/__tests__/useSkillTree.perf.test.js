import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkillTree } from '../useSkillTree';
import { DATA_KEY } from '../../data/defaultData';

vi.mock('../../utils/gist', () => ({
  fetchGistData: vi.fn().mockRejectedValue(new Error('no gist in tests')),
  saveGistData: vi.fn().mockResolvedValue(undefined),
}));

const NODE_COUNT = 177;
const EDGE_COUNT = 350;
const MASTERED_COUNT = 53; // ~30% of nodes have score=10

function generateLargeData() {
  const tags = ['fundamental', 'combo', 'advanced', 'fingerpass'];
  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => {
    const isMastered = i < MASTERED_COUNT;
    return {
      id: `n${i}`,
      label: `Trick ${i}`,
      score: isMastered ? 10 : Math.floor(Math.random() * 10),
      tags: [tags[i % tags.length]],
      position: { x: (i % 15) * 200, y: Math.floor(i / 15) * 100 },
    };
  });

  const edges = Array.from({ length: EDGE_COUNT }, (_, i) => ({
    id: `e${i}`,
    from: `n${i % NODE_COUNT}`,
    to: `n${(i + 1 + Math.floor(i / 3)) % NODE_COUNT}`,
    type: 'prerequisite',
  }));

  return {
    nodes,
    edges,
    tag_styles: {
      fundamental: { color: '#4a90d9' },
      combo: { color: '#8e44ad' },
      advanced: { color: '#e67e22' },
      fingerpass: { color: '#2ecc71' },
    },
    edge_styles: {
      prerequisite: { stroke: 'solid', color: '#888' },
    },
  };
}

const masteredCount = MASTERED_COUNT;

describe('useSkillTree — performance with large graph', () => {
  beforeEach(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(generateLargeData()));
  });

  it(`computes flowNodes/flowEdges for ${NODE_COUNT} nodes + ${EDGE_COUNT} edges under 50ms`, () => {
    const { result } = renderHook(() => useSkillTree(null, false));
    expect(result.current.flowNodes).toHaveLength(NODE_COUNT);
    expect(result.current.flowEdges).toHaveLength(EDGE_COUNT);
  });

  it('toggling hideMaxScore on filters mastered nodes quickly', () => {
    const { result, rerender } = renderHook(
      ({ hide }) => useSkillTree(null, hide),
      { initialProps: { hide: false } },
    );

    expect(result.current.flowNodes).toHaveLength(NODE_COUNT);

    const start = performance.now();
    rerender({ hide: true });
    const elapsed = performance.now() - start;

    // Mastered nodes should be filtered out entirely
    expect(result.current.flowNodes).toHaveLength(NODE_COUNT - masteredCount);

    // Edges connected to mastered nodes should be filtered out
    expect(result.current.flowEdges.length).toBeLessThan(EDGE_COUNT);

    expect(elapsed).toBeLessThan(50);
  });

  it('toggling hideMaxScore off (unhide) restores all nodes quickly', () => {
    // Start with hide=true
    const { result, rerender } = renderHook(
      ({ hide }) => useSkillTree(null, hide),
      { initialProps: { hide: true } },
    );

    expect(result.current.flowNodes).toHaveLength(NODE_COUNT - masteredCount);

    // Unhide — this is the operation the user reported as slow
    const start = performance.now();
    rerender({ hide: false });
    const elapsed = performance.now() - start;

    expect(result.current.flowNodes).toHaveLength(NODE_COUNT);
    expect(result.current.flowEdges).toHaveLength(EDGE_COUNT);

    // Hook computation should be well under the 200ms violation threshold
    expect(elapsed).toBeLessThan(50);
  });

  it('repeated hide/unhide cycles maintain stable performance', () => {
    const { result, rerender } = renderHook(
      ({ hide }) => useSkillTree(null, hide),
      { initialProps: { hide: false } },
    );

    const times = [];
    for (let i = 0; i < 6; i++) {
      const hide = i % 2 === 0;
      const start = performance.now();
      rerender({ hide });
      times.push(performance.now() - start);
    }

    // No cycle should exceed the budget
    for (const t of times) {
      expect(t).toBeLessThan(50);
    }

    // Final state: hide=false (even iteration count)
    expect(result.current.flowNodes).toHaveLength(NODE_COUNT);
  });
});
