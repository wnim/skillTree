import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultData, DEFAULT_EDGE_TYPE, DATA_KEY, SAVE_PENDING_KEY } from '../data/defaultData';
import { tidyLayout } from '../utils/layout';
import { fetchGistData, saveGistData, saveGistDataKeepalive } from '../utils/gist';

function loadData() {
  try {
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // corrupted storage — fall back to defaults
  }
  return defaultData;
}

// Stable sentinels so initial state never leaks into comparisons
const EMPTY_MAP = new Map();
const EMPTY_SET = new Set();
const FALLBACK_EDGE_STYLE = { stroke: 'solid', color: '#888' };

export function useSkillTree(gistConfig = null, hideMaxScore = false) {
  const [data, setData] = useState(loadData);
  const [syncStatus, setSyncStatus] = useState(gistConfig?.gistId ? 'loading' : 'idle');
  const [clipboard, setClipboard] = useState({ nodes: [], edges: [] });
  const [pendingSave, setPendingSave] = useState(false);
  const saveTimeoutRef = useRef(null);
  const lastSyncedDataRef = useRef(data);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const MAX_HISTORY = 50;

  // Read and consume the pending-save flag synchronously (before effects).
  // Stored in a ref so it survives React strict-mode double-mount.
  const pendingSaveOnMount = useRef(undefined);
  if (pendingSaveOnMount.current === undefined) {
    pendingSaveOnMount.current = !!localStorage.getItem(SAVE_PENDING_KEY);
    localStorage.removeItem(SAVE_PENDING_KEY);
  }

  // (1) Always mirror to localStorage for offline fallback
  useEffect(() => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }, [data]);

  // (2) Load from Gist on mount (if already configured)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gistConfig?.gistId) return;
    let ignore = false;

    if (pendingSaveOnMount.current) {
      // A keepalive PATCH is already in-flight from before refresh.
      // Don't fetch (would return stale data) or PATCH (would 409 conflict).
      // Trust localStorage (always correct) and the keepalive (handles Gist sync).
      setSyncStatus('idle');
    } else {
      fetchGistData(gistConfig.gistId, gistConfig.token)
        .then(({ data: gistData }) => {
          if (ignore) return;
          lastSyncedDataRef.current = gistData;
          setData(gistData);
          setSyncStatus('idle');
        })
        .catch(() => { if (!ignore) setSyncStatus('error'); });
    }

    return () => { ignore = true; };
  }, []);

  // (3) Debounced auto-save to Gist on every data change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (data === lastSyncedDataRef.current) return;
    if (!gistConfig?.gistId) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      lastSyncedDataRef.current = data;
      setPendingSave(false);
      setSyncStatus('saving');
      saveGistData(gistConfig.gistId, gistConfig.filename, data, gistConfig.token)
        .then(() => setSyncStatus('idle'))
        .catch(() => setSyncStatus('error'));
    }, 60000);
    setPendingSave(true);
    return () => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      setPendingSave(false);
    };
  }, [data, gistConfig]);

  // Ref mirror of gistConfig for use in visibilitychange handler (avoids stale closures)
  const gistConfigRef = useRef(gistConfig);
  useEffect(() => { gistConfigRef.current = gistConfig; }, [gistConfig]);

  // (4) Flush pending Gist save when page becomes hidden (tab close/switch/minimize/refresh)
  useEffect(() => {
    const flushPendingSave = () => {
      if (!saveTimeoutRef.current) return;
      const cfg = gistConfigRef.current;
      if (!cfg?.gistId) return;
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      setPendingSave(false);
      lastSyncedDataRef.current = dataRef.current;
      localStorage.setItem(SAVE_PENDING_KEY, '1');
      saveGistDataKeepalive(cfg.gistId, cfg.filename, dataRef.current, cfg.token);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };
    const handleBeforeUnload = () => flushPendingSave();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Cache for toReactFlowNodes: preserves wrapper object identity when source node is unchanged.
  // Keyed by node id → { source (data node ref), tagColor, wrapper (ReactFlow node object) }
  const prevFlowNodesRef = useRef(EMPTY_MAP);

  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Refs for reading current values inside stable callbacks without capturing them as deps.
  // Assigned during render (not in useEffect) so they are always current before the next event fires.
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const clipboardRef = useRef(clipboard);
  clipboardRef.current = clipboard;
  const dataRef = useRef(data);
  dataRef.current = data;

  const updateData = useCallback((partialOrFn) => {
    setData((prev) => {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
      futureRef.current = [];
      const partial = typeof partialOrFn === 'function' ? partialOrFn(prev) : partialOrFn;
      return { ...prev, ...partial };
    });
  }, []);

  const selectedNode = useMemo(
    () => selectedIds.size === 1 ? (data.nodes.find((n) => n.id === [...selectedIds][0]) ?? null) : null,
    [data.nodes, selectedIds],
  );

  const hiddenNodeIds = useMemo(
    () =>
      hideMaxScore
        ? new Set(data.nodes.filter((n) => n.score === 10).map((n) => n.id))
        : EMPTY_SET,
    [data.nodes, hideMaxScore],
  );

  const flowNodes = useMemo(() => {
    const prev = prevFlowNodesRef.current;
    const nextPrev = new Map();
    const result = [];
    for (const node of data.nodes) {
      if (hiddenNodeIds.has(node.id)) continue;
      const tagColors = node.tags?.map((t) => data.tag_styles[t]?.color ?? '#555') ?? [];
      const tagColor = tagColors[0] ?? '#555';
      const tagColorKey = tagColors.join('\0');
      const cached = prev.get(node.id);
      if (cached && cached.source === node && cached.tagColorKey === tagColorKey) {
        nextPrev.set(node.id, cached);
        result.push(cached.wrapper);
        continue;
      }
      const wrapper = {
        id: node.id,
        type: 'skillNode',
        position: node.position,
        data: { ...node, tagColor, tagColors },
      };
      nextPrev.set(node.id, { source: node, tagColorKey, wrapper });
      result.push(wrapper);
    }
    prevFlowNodesRef.current = nextPrev;
    return result;
  }, [data.nodes, data.tag_styles, hiddenNodeIds]);

  const prevFlowEdgesRef = useRef(EMPTY_MAP);

  const flowEdges = useMemo(() => {
    const prev = prevFlowEdgesRef.current;
    const nextPrev = new Map();
    const hasHidden = hiddenNodeIds.size > 0;
    const result = [];
    for (const edge of data.edges) {
      if (hasHidden && (hiddenNodeIds.has(edge.from) || hiddenNodeIds.has(edge.to))) continue;
      const style = data.edge_styles[edge.type || DEFAULT_EDGE_TYPE] ?? FALLBACK_EDGE_STYLE;
      const cached = prev.get(edge.id);
      if (cached && cached.source === edge && cached.styleRef === style) {
        nextPrev.set(edge.id, cached);
        result.push(cached.wrapper);
        continue;
      }
      const wrapper = {
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
      nextPrev.set(edge.id, { source: edge, styleRef: style, wrapper });
      result.push(wrapper);
    }
    prevFlowEdgesRef.current = nextPrev;
    return result;
  }, [data.edges, data.edge_styles, hiddenNodeIds]);

  // --- Node actions ---

  const addNode = useCallback(
    (position) => {
      const id = `node_${Date.now()}`;
      const newNode = { id, label: 'New Trick', score: null, tags: [], position };
      updateData((prev) => ({ nodes: [...prev.nodes, newNode] }));
      setSelectedIds(new Set([id]));
      setEditingId(id);
      return id;
    },
    [updateData],
  );

  const deleteNode = useCallback(
    (nodeIdOrIds) => {
      const ids = Array.isArray(nodeIdOrIds) ? new Set(nodeIdOrIds) : new Set([nodeIdOrIds]);
      updateData((prev) => ({
        nodes: prev.nodes.filter((n) => !ids.has(n.id)),
        edges: prev.edges.filter((e) => !ids.has(e.from) && !ids.has(e.to)),
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next.size === prev.size ? prev : next;
      });
    },
    [updateData],
  );

  const updateNode = useCallback(
    (field, value) => {
      const selId = selectedIdsRef.current.size === 1 ? [...selectedIdsRef.current][0] : null;
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
    if (selIds.size === 0) return;
    const currentData = dataRef.current;
    const nodes = currentData.nodes.filter((n) => selIds.has(n.id));
    const edges = currentData.edges.filter((e) => selIds.has(e.from) && selIds.has(e.to));
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
    setSelectedIds(new Set(newIds));
    setClipboard({ nodes: newNodes, edges: newEdges });
  }, [updateData, setSelectedIds]);

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
    setData((prev) => {
      const newNodes = tidyLayout(prev.nodes);
      const changed = newNodes.some((n, i) =>
        n.position.x !== prev.nodes[i].position.x ||
        n.position.y !== prev.nodes[i].position.y,
      );
      if (!changed) return prev;
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), prev];
      futureRef.current = [];
      return { ...prev, nodes: newNodes };
    });
  }, []);

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

  const saveNow = useCallback(() => {
    const cfg = gistConfigRef.current;
    if (!cfg?.gistId) return;
    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
    lastSyncedDataRef.current = dataRef.current;
    setPendingSave(false);
    setSyncStatus('saving');
    saveGistData(cfg.gistId, cfg.filename, dataRef.current, cfg.token)
      .then(() => setSyncStatus('idle'))
      .catch(() => setSyncStatus('error'));
  }, []);

  return {
    data,
    syncStatus,
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
    saveNow,
    pendingSave,
  };
}
