import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MarkerType } from '@xyflow/react';
import { defaultData, DEFAULT_EDGE_TYPE, DATA_KEY } from '../data/defaultData';
import { buildLayout } from '../utils/layout';
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

function toReactFlowNodes(nodes, tagStyles, selectedId, editingId) {
  return nodes.map((node) => ({
    id: node.id,
    type: 'skillNode',
    position: node.position,
    draggable: node.id === editingId,
    data: {
      ...node,
      tagColor: node.tags?.[0] ? tagStyles[node.tags[0]]?.color ?? '#555' : '#555',
      isSelected: node.id === selectedId,
      isEditing: node.id === editingId,
    },
  }));
}

function toReactFlowEdges(edges, edgeStyles) {
  return edges.map((edge) => {
    const style = edgeStyles[edge.type || DEFAULT_EDGE_TYPE] ?? { stroke: 'solid', color: '#888' };
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      markerEnd: { type: MarkerType.ArrowClosed, color: style.color },
      style: {
        stroke: style.color,
        strokeDasharray: style.stroke === 'dashed' ? '6 6' : '0',
      },
    };
  });
}

export function useSkillTree(gistConfig = null) {
  const [data, setData] = useState(loadData);
  const [syncStatus, setSyncStatus] = useState(gistConfig?.gistId ? 'loading' : 'idle');
  const saveTimeoutRef = useRef(null);
  const isFirstRender = useRef(true);

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
    }, 2000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [data, gistConfig]);

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const updateData = useCallback((partial) => {
    setData((prev) => ({ ...prev, ...partial }));
  }, []);

  const selectedNode = useMemo(
    () => data.nodes.find((n) => n.id === selectedId) ?? null,
    [data.nodes, selectedId],
  );

  const flowNodes = useMemo(
    () => toReactFlowNodes(data.nodes, data.tag_styles, selectedId, editingId),
    [data.nodes, data.tag_styles, selectedId, editingId],
  );

  const flowEdges = useMemo(
    () => toReactFlowEdges(data.edges, data.edge_styles),
    [data.edges, data.edge_styles],
  );

  // --- Node actions ---

  const addNode = useCallback(
    (position) => {
      const id = `node_${Date.now()}`;
      const newNode = { id, label: 'New Trick', score: null, tags: [], notes: '', position };
      updateData({ nodes: [...data.nodes, newNode] });
      setSelectedId(id);
      setEditingId(id);
      return id;
    },
    [data.nodes, updateData],
  );

  const deleteNode = useCallback(
    (nodeId) => {
      updateData({
        nodes: data.nodes.filter((n) => n.id !== nodeId),
        edges: data.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
      });
      if (selectedId === nodeId) setSelectedId(null);
    },
    [data.nodes, data.edges, selectedId, updateData],
  );

  const updateNode = useCallback(
    (field, value) => {
      if (!selectedId) return;
      if (field === 'tags') {
        const newStyles = { ...data.tag_styles };
        value.forEach((tag) => {
          if (!newStyles[tag]) newStyles[tag] = { color: '#888' };
        });
        updateData({
          nodes: data.nodes.map((n) => (n.id === selectedId ? { ...n, tags: value } : n)),
          tag_styles: newStyles,
        });
        return;
      }
      updateData({
        nodes: data.nodes.map((n) => (n.id === selectedId ? { ...n, [field]: value } : n)),
      });
    },
    [data.nodes, data.tag_styles, selectedId, updateData],
  );

  const updateNodePosition = useCallback(
    (nodeId, position) => {
      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
      }));
    },
    [],
  );

  // --- Edge actions ---

  const addEdge = useCallback(
    (source, target) => {
      const newEdge = { id: `e-${Date.now()}`, from: source, to: target, type: DEFAULT_EDGE_TYPE };
      updateData({ edges: [...data.edges, newEdge] });
    },
    [data.edges, updateData],
  );

  const updateEdgeType = useCallback(
    (edgeId, type) => {
      updateData({
        edges: data.edges.map((e) => (e.id === edgeId ? { ...e, type } : e)),
      });
    },
    [data.edges, updateData],
  );

  // --- Tag style actions ---

  const addTagStyle = useCallback(
    (tag) => {
      if (!tag) return;
      updateData({ tag_styles: { ...data.tag_styles, [tag]: { color: '#888' } } });
    },
    [data.tag_styles, updateData],
  );

  const updateTagStyle = useCallback(
    (tag, color) => {
      updateData({ tag_styles: { ...data.tag_styles, [tag]: { ...data.tag_styles[tag], color } } });
    },
    [data.tag_styles, updateData],
  );

  const removeTagStyle = useCallback(
    (tag) => {
      const next = { ...data.tag_styles };
      delete next[tag];
      updateData({ tag_styles: next });
    },
    [data.tag_styles, updateData],
  );

  // --- Edge style actions ---

  const addEdgeStyle = useCallback(
    (type) => {
      if (!type) return;
      updateData({ edge_styles: { ...data.edge_styles, [type]: { color: '#aaa', stroke: 'solid' } } });
    },
    [data.edge_styles, updateData],
  );

  const updateEdgeStyle = useCallback(
    (type, field, value) => {
      updateData({
        edge_styles: { ...data.edge_styles, [type]: { ...data.edge_styles[type], [field]: value } },
      });
    },
    [data.edge_styles, updateData],
  );

  const removeEdgeStyle = useCallback(
    (type) => {
      const next = { ...data.edge_styles };
      delete next[type];
      updateData({ edge_styles: next });
    },
    [data.edge_styles, updateData],
  );

  // --- Layout ---

  const autoLayout = useCallback(() => {
    updateData({ nodes: buildLayout(data.nodes, data.edges) });
  }, [data.nodes, data.edges, updateData]);

  // --- Import / Export ---

  const importData = useCallback((parsed) => {
    setData(parsed);
  }, []);

  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pen-spinning-skill-tree.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return {
    data,
    syncStatus,
    selectedId,
    setSelectedId,
    editingId,
    setEditingId,
    selectedNode,
    flowNodes,
    flowEdges,
    addNode,
    deleteNode,
    updateNode,
    updateNodePosition,
    addEdge,
    updateEdgeType,
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
