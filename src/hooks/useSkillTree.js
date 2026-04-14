import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultData, DEFAULT_EDGE_TYPE, DATA_KEY } from '../data/defaultData';
import { tidyLayout } from '../utils/layout';
import { fetchGistData, saveGistData } from '../utils/gist';

function loadData() {
  try {
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // corrupted storage — fall back to defaults
  }
  return defaultData;
}

// Stable sentinel so the empty-Map initial state never leaks into comparisons
const EMPTY_MAP = new Map();

function toReactFlowEdges(edges, edgeStyles) {
  return edges.map((edge) => {
    const style = edgeStyles[edge.type || DEFAULT_EDGE_TYPE] ?? { stroke: 'solid', color: '#888' };
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'customBezier',
      interactionWidth: 20,
      style: {
        stroke: style.color,
        strokeDasharray: style.stroke === 'dashed' ? '6 6' : '0',
      },
    };
  });
}

export function useSkillTree(gistConfig = null, hideMaxScore = false) {
  const [data, setData] = useState(loadData);
  const [syncStatus, setSyncStatus] = useState(gistConfig?.gistId ? 'loading' : 'idle');
  const [clipboard, setClipboard] = useState({ nodes: [], edges: [] });
  const saveTimeoutRef = useRef(null);
  const isFirstRender = useRef(true);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const MAX_HISTORY = 50;

  // (1) Always mirror to localStorage for offline fallback
  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data]);

  // (2) Load from Gist on mount (if already configured)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gistConfig?.gistId) return;
    fetchGistData(gistConfig.gistId, gistConfig.token)
      .then(({ data: gistData }) => {
        setData(gistData);
        setSyncStatus('idle');
      })
      .catch(() => setSyncStatus('error'));
  }, []);

  // (3) Debounced auto-save to Gist on every data change (skip initial render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!gistConfig?.gistId) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSyncStatus('saving');
      saveGistData(gistConfig.gistId, gistConfig.filename, data, gistConfig.token)
        .then(() => setSyncStatus('idle'))
        .catch(() => setSyncStatus('error'));
    }, 60000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [data, gistConfig]);

  // Cache for toReactFlowNodes: preserves wrapper object identity when source node is unchanged.
  // Keyed by node id → { source (data node ref), tagColor, wrapper (ReactFlow node object) }
  const prevFlowNodesRef = useRef(EMPTY_MAP);

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Refs for reading current values inside stable callbacks without capturing them as deps
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const selectedIdsRef = useRef(selectedIds);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  const clipboardRef = useRef(clipboard);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const updateData = useCallback((partialOrFn) => {
    setData((prev) => {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
      futureRef.current = [];
      const partial = typeof partialOrFn === 'function' ? partialOrFn(prev) : partialOrFn;
      return { ...prev, ...partial };
    });
  }, []);

  const selectedNode = useMemo(
    () => data.nodes.find((n) => n.id === selectedId) ?? null,
    [data.nodes, selectedId],
  );

  const hiddenNodeIds = useMemo(
    () =>
      hideMaxScore
        ? new Set(data.nodes.filter((n) => n.score === 10).map((n) => n.id))
        : new Set(),
    [data.nodes, hideMaxScore],
  );

  const flowNodes = useMemo(() => {
    const prev = prevFlowNodesRef.current;
    const nextPrev = new Map();
    const nodes = hideMaxScore ? data.nodes.filter((n) => !hiddenNodeIds.has(n.id)) : data.nodes;
    const result = nodes.map((node) => {
      const tagColors = node.tags?.map((t) => data.tag_styles[t]?.color ?? '#555') ?? [];
      const tagColor = tagColors[0] ?? '#555';
      const tagColorKey = tagColors.join('\0');
      const cached = prev.get(node.id);
      if (cached && cached.source === node && cached.tagColorKey === tagColorKey) {
        nextPrev.set(node.id, cached);
        return cached.wrapper;
      }
      const wrapper = {
        id: node.id,
        type: 'skillNode',
        position: node.position,
        data: { ...node, tagColor, tagColors },
      };
      nextPrev.set(node.id, { source: node, tagColorKey, wrapper });
      return wrapper;
    });
    prevFlowNodesRef.current = nextPrev;
    return result;
  }, [data.nodes, data.tag_styles, hiddenNodeIds]);

  const flowEdges = useMemo(
    () => toReactFlowEdges(
      hideMaxScore
        ? data.edges.filter((e) => !hiddenNodeIds.has(e.from) && !hiddenNodeIds.has(e.to))
        : data.edges,
      data.edge_styles,
    ),
    [data.edges, data.edge_styles, hiddenNodeIds],
  );

  // --- Node actions ---

  const addNode = useCallback(
    (position) => {
      const id = `node_${Date.now()}`;
      const newNode = { id, label: 'New Trick', score: null, tags: [], notes: '', position };
      updateData((prev) => ({ nodes: [...prev.nodes, newNode] }));
      setEditingId(id);
      return id;
    },
    [updateData],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      updateData((prev) => ({
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      }));
      if (selectedIdRef.current === nodeId) setSelectedId(null);
    },
    [updateData],
  );

  const updateNode = useCallback(
    (field, value) => {
      const selId = selectedIdRef.current;
      if (!selId) return;
      if (field === 'tags') {
        updateData((prev) => {
          const newStyles = { ...prev.tag_styles };
          value.forEach((tag) => {
            if (!newStyles[tag]) newStyles[tag] = { color: '#888' };
          });
          return {
            nodes: prev.nodes.map((n) => (n.id === selId ? { ...n, tags: value } : n)),
            tag_styles: newStyles,
          };
        });
        return;
      }
      updateData((prev) => ({
        nodes: prev.nodes.map((n) => (n.id === selId ? { ...n, [field]: value } : n)),
      }));
    },
    [updateData],
  );

  const bulkUpdateTags = useCallback(
    (nodeIds, toRemove, toAdd) => {
      updateData((prev) => {
        const idSet = new Set(nodeIds);
        const newStyles = { ...prev.tag_styles };
        toAdd.forEach((tag) => {
          if (!newStyles[tag]) newStyles[tag] = { color: '#888' };
        });
        return {
          nodes: prev.nodes.map((n) => {
            if (!idSet.has(n.id)) return n;
            const filtered = n.tags.filter((t) => !toRemove.has(t));
            const added = toAdd.filter((t) => !filtered.includes(t));
            return { ...n, tags: [...filtered, ...added] };
          }),
          tag_styles: newStyles,
        };
      });
    },
    [updateData],
  );

  const updateNodeById = useCallback(
    (nodeId, field, value) => {
      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, [field]: value } : n)),
      }));
    },
    [],
  );

  const updateNodePosition = useCallback(
    (nodeId, position) => {
      setData((prev) => {
        pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
        futureRef.current = [];
        return {
          ...prev,
          nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
        };
      });
    },
    [],
  );

  const updateNodePositions = useCallback(
    (positionUpdates) => {
      setData((prev) => {
        pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
        futureRef.current = [];
        const updateMap = new Map(positionUpdates.map((u) => [u.id, u.position]));
        return {
          ...prev,
          nodes: prev.nodes.map((n) => (updateMap.has(n.id) ? { ...n, position: updateMap.get(n.id) } : n)),
        };
      });
    },
    [],
  );

  // --- Copy / Paste ---

  const copyNode = useCallback(() => {
    const selIds = selectedIdsRef.current;
    const selId = selectedIdRef.current;
    let idsToCopy;
    if (selIds.size > 1) {
      idsToCopy = selIds;
    } else if (selId) {
      idsToCopy = new Set([selId]);
    } else {
      return;
    }
    const currentData = dataRef.current;
    const nodes = currentData.nodes.filter((n) => idsToCopy.has(n.id));
    const edges = currentData.edges.filter((e) => idsToCopy.has(e.from) && idsToCopy.has(e.to));
    setClipboard({ nodes, edges });
  }, []);

  const pasteNode = useCallback(() => {
    const clip = clipboardRef.current;
    if (clip.nodes.length === 0) return;
    const now = Date.now();
    const idMap = new Map(clip.nodes.map((n, i) => [n.id, `node_${now}_${i}`]));
    const newNodes = clip.nodes.map((n) => ({
      ...n,
      id: idMap.get(n.id),
      position: { x: n.position.x + 40, y: n.position.y + 40 },
    }));
    const newEdges = clip.edges.map((e, i) => ({
      ...e,
      id: `e_${now}_${i}`,
      from: idMap.get(e.from),
      to: idMap.get(e.to),
    }));
    updateData((prev) => ({
      nodes: [...prev.nodes, ...newNodes],
      edges: [...prev.edges, ...newEdges],
    }));
    const newIds = newNodes.map((n) => n.id);
    if (newIds.length === 1) {
      setSelectedId(newIds[0]);
      setSelectedIds(new Set());
    } else {
      setSelectedId(null);
      setSelectedIds(new Set(newIds));
    }
    setClipboard({ nodes: newNodes, edges: newEdges });
  }, [updateData, setSelectedId, setSelectedIds]);

  // --- Edge actions ---

  const addEdge = useCallback(
    (source, target) => {
      const newEdge = { id: `e-${Date.now()}`, from: source, to: target, type: DEFAULT_EDGE_TYPE };
      updateData((prev) => ({ edges: [...prev.edges, newEdge] }));
    },
    [updateData],
  );

  const deleteEdge = useCallback(
    (edgeId) => {
      updateData((prev) => ({ edges: prev.edges.filter((e) => e.id !== edgeId) }));
    },
    [updateData],
  );

  const updateEdgeType = useCallback(
    (edgeId, type) => {
      updateData((prev) => ({
        edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, type } : e)),
      }));
    },
    [updateData],
  );

  // --- Tag style actions ---

  const addTagStyle = useCallback(
    (tag) => {
      if (!tag) return;
      updateData((prev) => ({ tag_styles: { ...prev.tag_styles, [tag]: { color: '#888' } } }));
    },
    [updateData],
  );

  const updateTagStyle = useCallback(
    (tag, color) => {
      updateData((prev) => ({ tag_styles: { ...prev.tag_styles, [tag]: { ...prev.tag_styles[tag], color } } }));
    },
    [updateData],
  );

  const removeTagStyle = useCallback(
    (tag) => {
      updateData((prev) => {
        const next = { ...prev.tag_styles };
        delete next[tag];
        return { tag_styles: next };
      });
    },
    [updateData],
  );

  // --- Edge style actions ---

  const addEdgeStyle = useCallback(
    (type) => {
      if (!type) return;
      updateData((prev) => ({ edge_styles: { ...prev.edge_styles, [type]: { color: '#aaa', stroke: 'solid' } } }));
    },
    [updateData],
  );

  const updateEdgeStyle = useCallback(
    (type, field, value) => {
      updateData((prev) => ({
        edge_styles: { ...prev.edge_styles, [type]: { ...prev.edge_styles[type], [field]: value } },
      }));
    },
    [updateData],
  );

  const removeEdgeStyle = useCallback(
    (type) => {
      updateData((prev) => {
        const next = { ...prev.edge_styles };
        delete next[type];
        return { edge_styles: next };
      });
    },
    [updateData],
  );

  // --- Layout ---

  const autoLayout = useCallback(() => {
    updateData((prev) => ({ nodes: tidyLayout(prev.nodes) }));
  }, [updateData]);

  // --- Undo / Redo ---

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    setData((current) => {
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [current, ...futureRef.current.slice(0, MAX_HISTORY - 1)];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    setData((current) => {
      const next = futureRef.current[0];
      futureRef.current = futureRef.current.slice(1);
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), current];
      return next;
    });
  }, []);

  // --- Import / Export ---

  const importData = useCallback((parsed) => {
    setData(parsed);
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(dataRef.current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pen-spinning-skill-tree.json';
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    data,
    syncStatus,
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    editingId,
    setEditingId,
    selectedNode,
    flowNodes,
    flowEdges,
    undo,
    redo,
    copyNode,
    pasteNode,
    addNode,
    deleteNode,
    updateNode,
    updateNodeById,
    updateNodePosition,
    updateNodePositions,
    addEdge,
    deleteEdge,
    updateEdgeType,
    bulkUpdateTags,
    addTagStyle,
    updateTagStyle,
    removeTagStyle,
    addEdgeStyle,
    updateEdgeStyle,
    removeEdgeStyle,
    autoLayout,
    importData,
    exportData,
  };
}
