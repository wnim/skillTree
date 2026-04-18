import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkillTree } from '../useSkillTree';
import { DATA_KEY } from '../../data/defaultData';

// Suppress Gist fetch during tests
vi.mock('../../utils/gist', () => ({
  fetchGistData: vi.fn().mockRejectedValue(new Error('no gist in tests')),
  saveGistData: vi.fn().mockResolvedValue(undefined),
}));

const SEED_DATA = {
  nodes: [
    { id: 'n1', label: 'Node 1', score: 5, tags: ['fundamental'], notes: '', position: { x: 0, y: 0 } },
    { id: 'n2', label: 'Node 2', score: null, tags: [], notes: '', position: { x: 200, y: 0 } },
    { id: 'n3', label: 'Node 3', score: 10, tags: ['combo'], notes: '', position: { x: 400, y: 0 } },
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2', type: 'prerequisite' },
    { id: 'e2', from: 'n2', to: 'n3', type: 'prerequisite' },
  ],
  tag_styles: {
    fundamental: { color: '#4a90d9' },
    combo: { color: '#8e44ad' },
  },
  edge_styles: {
    prerequisite: { stroke: 'solid', color: '#888' },
  },
};

function seedAndRender(hideMaxScore = false) {
  localStorage.setItem(DATA_KEY, JSON.stringify(SEED_DATA));
  return renderHook(() => useSkillTree(null, hideMaxScore));
}

// ---------------------------------------------------------------------------
// Node CRUD
// ---------------------------------------------------------------------------
describe('useSkillTree — node CRUD', () => {
  it('addNode creates a node and sets editingId', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.addNode({ x: 100, y: 100 });
    });
    expect(result.current.data.nodes).toHaveLength(4);
    const added = result.current.data.nodes[3];
    expect(added.label).toBe('New Trick');
    expect(added.score).toBeNull();
    expect(added.position).toEqual({ x: 100, y: 100 });
    expect(result.current.editingId).toBe(added.id);
  });

  it('deleteNode removes node and connected edges', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.deleteNode('n2');
    });
    expect(result.current.data.nodes.map((n) => n.id)).toEqual(['n1', 'n3']);
    // Both e1 (n1→n2) and e2 (n2→n3) should be removed
    expect(result.current.data.edges).toHaveLength(0);
  });

  it('deleteNode with array of IDs', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.deleteNode(['n1', 'n3']);
    });
    expect(result.current.data.nodes.map((n) => n.id)).toEqual(['n2']);
  });

  it('updateNode updates a field on the selected node', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.setSelectedIds(new Set(['n1']));
    });
    act(() => {
      result.current.updateNode('notes', 'Updated!');
    });
    expect(result.current.data.nodes.find((n) => n.id === 'n1').notes).toBe('Updated!');
  });

  it('updateNode on tags auto-creates missing tag styles', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.setSelectedIds(new Set(['n1']));
    });
    act(() => {
      result.current.updateNode('tags', ['fundamental', 'new_tag']);
    });
    expect(result.current.data.tag_styles).toHaveProperty('new_tag');
  });

  it('updateNodeById bypasses undo', () => {
    const { result } = seedAndRender();
    // First do a normal update to have undo history
    act(() => {
      result.current.setSelectedIds(new Set(['n1']));
    });
    act(() => {
      result.current.updateNode('label', 'Changed');
    });
    // Now use updateNodeById (should NOT add to undo)
    act(() => {
      result.current.updateNodeById('n1', 'label', 'BypassUndo');
    });
    expect(result.current.data.nodes.find((n) => n.id === 'n1').label).toBe('BypassUndo');
    // Undo should go back to before the updateNode call, not before updateNodeById
    act(() => {
      result.current.undo();
    });
    expect(result.current.data.nodes.find((n) => n.id === 'n1').label).toBe('Node 1');
  });
});

// ---------------------------------------------------------------------------
// Edge CRUD
// ---------------------------------------------------------------------------
describe('useSkillTree — edge CRUD', () => {
  it('addEdge creates edge with from/to fields', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.addEdge('n1', 'n3');
    });
    const added = result.current.data.edges[2];
    expect(added.from).toBe('n1');
    expect(added.to).toBe('n3');
    expect(added).not.toHaveProperty('source');
    expect(added).not.toHaveProperty('target');
  });

  it('deleteEdge removes edge by id', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.deleteEdge('e1');
    });
    expect(result.current.data.edges.map((e) => e.id)).toEqual(['e2']);
  });

  it('updateEdgeType changes edge type', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.updateEdgeType('e1', 'inspired_by');
    });
    expect(result.current.data.edges.find((e) => e.id === 'e1').type).toBe('inspired_by');
  });
});

// ---------------------------------------------------------------------------
// Copy / Paste
// ---------------------------------------------------------------------------
describe('useSkillTree — copy/paste', () => {
  it('copies selected nodes and internal edges, paste creates new IDs', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.setSelectedIds(new Set(['n1', 'n2']));
    });
    act(() => {
      result.current.copyNode();
    });
    act(() => {
      result.current.pasteNode();
    });
    // Should have 3 original + 2 pasted = 5
    expect(result.current.data.nodes).toHaveLength(5);
    // Pasted nodes should have different IDs
    const ids = result.current.data.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(5);
    // Internal edge (e1: n1→n2) should have been duplicated with new endpoints
    const newEdges = result.current.data.edges.filter((e) => e.id !== 'e1' && e.id !== 'e2');
    expect(newEdges).toHaveLength(1);
    expect(newEdges[0].from).not.toBe('n1');
    expect(newEdges[0].to).not.toBe('n2');
  });

  it('paste offsets positions by 40px', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.setSelectedIds(new Set(['n1']));
    });
    act(() => {
      result.current.copyNode();
    });
    act(() => {
      result.current.pasteNode();
    });
    const pasted = result.current.data.nodes[3];
    expect(pasted.position).toEqual({ x: 40, y: 40 });
  });
});

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------
describe('useSkillTree — undo/redo', () => {
  it('undo restores previous state after mutation', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.deleteNode('n1');
    });
    expect(result.current.data.nodes).toHaveLength(2);
    act(() => {
      result.current.undo();
    });
    expect(result.current.data.nodes).toHaveLength(3);
  });

  it('redo re-applies after undo', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.deleteNode('n1');
    });
    act(() => {
      result.current.undo();
    });
    act(() => {
      result.current.redo();
    });
    expect(result.current.data.nodes).toHaveLength(2);
  });

  it('undo at empty stack is a no-op', () => {
    const { result } = seedAndRender();
    const before = result.current.data;
    act(() => {
      result.current.undo();
    });
    expect(result.current.data).toBe(before);
  });

  it('redo at empty stack is a no-op', () => {
    const { result } = seedAndRender();
    const before = result.current.data;
    act(() => {
      result.current.redo();
    });
    expect(result.current.data).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Tag styles
// ---------------------------------------------------------------------------
describe('useSkillTree — tag styles', () => {
  it('addTagStyle creates default style', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.addTagStyle('advanced');
    });
    expect(result.current.data.tag_styles.advanced).toEqual({ color: '#888' });
  });

  it('addTagStyle is a no-op for empty string', () => {
    const { result } = seedAndRender();
    const before = result.current.data.tag_styles;
    act(() => {
      result.current.addTagStyle('');
    });
    expect(result.current.data.tag_styles).toEqual(before);
  });

  it('updateTagStyle changes color', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.updateTagStyle('fundamental', '#ff0000');
    });
    expect(result.current.data.tag_styles.fundamental.color).toBe('#ff0000');
  });

  it('removeTagStyle deletes the style', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.removeTagStyle('combo');
    });
    expect(result.current.data.tag_styles).not.toHaveProperty('combo');
  });

  it('bulkUpdateTags adds and removes tags on multiple nodes', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.bulkUpdateTags(
        ['n1', 'n2'],
        new Set(['fundamental']),
        ['advanced'],
      );
    });
    const n1 = result.current.data.nodes.find((n) => n.id === 'n1');
    const n2 = result.current.data.nodes.find((n) => n.id === 'n2');
    expect(n1.tags).not.toContain('fundamental');
    expect(n1.tags).toContain('advanced');
    expect(n2.tags).toContain('advanced');
    // Auto-created tag style
    expect(result.current.data.tag_styles).toHaveProperty('advanced');
  });
});

// ---------------------------------------------------------------------------
// Edge styles
// ---------------------------------------------------------------------------
describe('useSkillTree — edge styles', () => {
  it('addEdgeStyle creates default style', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.addEdgeStyle('inspired_by');
    });
    expect(result.current.data.edge_styles.inspired_by).toEqual({ color: '#aaa', stroke: 'solid' });
  });

  it('updateEdgeStyle changes a field', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.updateEdgeStyle('prerequisite', 'color', '#ff0000');
    });
    expect(result.current.data.edge_styles.prerequisite.color).toBe('#ff0000');
  });

  it('removeEdgeStyle deletes the style', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.removeEdgeStyle('prerequisite');
    });
    expect(result.current.data.edge_styles).not.toHaveProperty('prerequisite');
  });
});

// ---------------------------------------------------------------------------
// Derived state: flowNodes, flowEdges, hiddenNodeIds
// ---------------------------------------------------------------------------
describe('useSkillTree — derived state', () => {
  it('flowNodes maps data nodes to ReactFlow format', () => {
    const { result } = seedAndRender();
    expect(result.current.flowNodes).toHaveLength(3);
    const fn = result.current.flowNodes[0];
    expect(fn.id).toBe('n1');
    expect(fn.type).toBe('skillNode');
    expect(fn.position).toEqual({ x: 0, y: 0 });
    expect(fn.data.label).toBe('Node 1');
    expect(fn.data.tagColor).toBe('#4a90d9');
  });

  it('flowEdges translates from/to to source/target', () => {
    const { result } = seedAndRender();
    const fe = result.current.flowEdges[0];
    expect(fe.source).toBe('n1');
    expect(fe.target).toBe('n2');
    expect(fe.type).toBe('customBezier');
  });

  it('filters out score=10 nodes when hideMaxScore is true', () => {
    const { result } = seedAndRender(true);
    expect(result.current.flowNodes.find((n) => n.id === 'n3')).toBeUndefined();
    expect(result.current.flowNodes).toHaveLength(2);
    expect(result.current.flowEdges.find((e) => e.id === 'e2')).toBeUndefined();
  });

  it('selectedNode returns single selected node', () => {
    const { result } = seedAndRender();
    act(() => {
      result.current.setSelectedIds(new Set(['n1']));
    });
    expect(result.current.selectedNode.id).toBe('n1');
  });

  it('selectedNode returns null when multiple or none selected', () => {
    const { result } = seedAndRender();
    expect(result.current.selectedNode).toBeNull();
    act(() => {
      result.current.setSelectedIds(new Set(['n1', 'n2']));
    });
    expect(result.current.selectedNode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Import / Auto-layout
// ---------------------------------------------------------------------------
describe('useSkillTree — import & autoLayout', () => {
  it('importData replaces entire data state', () => {
    const { result } = seedAndRender();
    const newData = { nodes: [], edges: [], tag_styles: {}, edge_styles: {} };
    act(() => {
      result.current.importData(newData);
    });
    expect(result.current.data).toEqual(newData);
  });

  it('autoLayout snaps nodes to grid', () => {
    const { result } = seedAndRender();
    const before = result.current.data.nodes.map((n) => n.position);
    act(() => {
      result.current.autoLayout();
    });
    const after = result.current.data.nodes.map((n) => n.position);
    // Positions should have changed (seed data is not grid-aligned)
    expect(after).not.toEqual(before);
    expect(result.current.data.nodes).toHaveLength(3);
  });
});
