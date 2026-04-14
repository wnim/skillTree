import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Controls,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { SkillNode } from './SkillNode';
import { EditableNode } from './EditableNode';
import { CustomBezierEdge } from './CustomBezierEdge';
import { HoverProvider } from './HoverContext';
import { ContextMenu } from './ContextMenu';
import { StaggeredBackground } from './StaggeredBackground';
import { loadViewport, saveViewport } from '../utils/viewport';
import { snapToGrid } from '../utils/layout';

export const Canvas = forwardRef(function Canvas({ flowNodes, flowEdges, skillTree, onOpenInspector, showGrid, snapMode }, ref) {
  const { addNode, deleteNode, addEdge, deleteEdge, updateNodePosition, updateNodePositions, updateNodeById,
    setSelectedId, setSelectedIds, setEditingId,
    selectedId, selectedIds, editingId } = skillTree;
  const isEditing = editingId != null;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [lastPaneClick, setLastPaneClick] = useState({ x: 200, y: 120 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [edgePopupPos, setEdgePopupPos] = useState(null);
  const isShiftHeld = useRef(false);
  const snapModeRef = useRef(snapMode);
  useEffect(() => { snapModeRef.current = snapMode; }, [snapMode]);
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const selectedIdRef = useRef(selectedId);
  const selectedIdsRef = useRef(selectedIds);
  const savedViewport = useRef(loadViewport());
  const containerRef = useRef(null);
  const reactFlowRef = useRef(null);
  // Tracks the source node from enhancedNodes that corresponds to each committed ReactFlow node.
  // Lets Effect A reuse existing node objects when nothing in that node changed.
  const nodeSourceRef = useRef(new Map());

  const nodeTypes = useMemo(() => ({ skillNode: SkillNode, editableNode: EditableNode }), []);
  const edgeTypes = useMemo(() => ({ customBezier: CustomBezierEdge }), []);

  const closeEditingNode = useCallback(() => setEditingId(null), [setEditingId]);

  // Enhance the editing node with the type switch, update callbacks, and disabled drag.
  // Fast path: if nothing is being edited, return the same array reference unchanged.
  const enhancedNodes = useMemo(() => {
    if (editingId == null) return flowNodes;
    return flowNodes.map((n) => {
      if (n.id !== editingId) return n;
      return {
        ...n,
        type: 'editableNode',
        draggable: false,
        data: {
          ...n.data,
          isEditing: true,
          onUpdate: updateNodeById,
          onClose: closeEditingNode,
        },
      };
    });
  }, [flowNodes, editingId, updateNodeById, closeEditingNode]);

  // Structural node sync: fires when the node graph or editing state changes.
  // Only recreates ReactFlow node objects for nodes whose source actually changed.
  useEffect(() => {
    const prevSources = nodeSourceRef.current;
    nodeSourceRef.current = new Map(enhancedNodes.map((n) => [n.id, n]));
    setNodes((current) => {
      const currentById = new Map(current.map((n) => [n.id, n]));
      const selectedSet = new Set([
        ...(selectedIdRef.current ? [selectedIdRef.current] : []),
        ...selectedIdsRef.current,
      ]);
      let anyChanged = current.length !== enhancedNodes.length;
      const next = enhancedNodes.map((n) => {
        const existing = currentById.get(n.id);
        const shouldBeSelected = selectedSet.has(n.id);
        if (existing && prevSources.get(n.id) === n && existing.selected === shouldBeSelected) {
          return existing;
        }
        anyChanged = true;
        return { ...n, selected: shouldBeSelected };
      });
      return anyChanged ? next : current;
    });
  }, [enhancedNodes]);

  // Selection-only sync: fires when selection changes but the graph is unchanged.
  // Creates new objects only for the 1-2 nodes whose `selected` flag actually flipped.
  useEffect(() => {
    const selectedSet = new Set([
      ...(selectedId ? [selectedId] : []),
      ...selectedIds,
    ]);
    setNodes((current) => {
      let changed = false;
      const next = current.map((n) => {
        const shouldBe = selectedSet.has(n.id);
        if (n.selected === shouldBe) return n;
        changed = true;
        return { ...n, selected: shouldBe };
      });
      return changed ? next : current;
    });
  }, [selectedId, selectedIds]);

  // Edge sync: fires when edge data or the selected edge changes.
  useEffect(() => {
    setEdges(flowEdges.map((e) =>
      e.id === selectedEdgeId
        ? { ...e, style: { ...e.style, stroke: 'orange' } }
        : e
    ));
  }, [flowEdges, selectedEdgeId]);

  // Keep refs in sync so handleSelectionChange always sees fresh values
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Shift' || e.key === 'Control') { isShiftHeld.current = true; return; }
      if (e.code !== 'Space' || e.repeat) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      setIsPanMode(true);
    };
    const onKeyUp = (e) => {
      if (e.key === 'Shift' || e.key === 'Control') { isShiftHeld.current = false; return; }
      if (e.code !== 'Space') return;
      setIsPanMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleInit = useCallback((flow) => {
    setReactFlowInstance(flow);
    reactFlowRef.current = flow;
    if (savedViewport.current) {
      flow.setViewport(savedViewport.current);
    }
  }, []);



  const handleMoveEnd = useCallback((_event, viewport) => {
    saveViewport(viewport);
  }, []);

  const projectToFlow = useCallback(
    (pos) => reactFlowInstance ? reactFlowInstance.screenToFlowPosition(pos) : pos,
    [reactFlowInstance],
  );

  const clearSelectedEdge = useCallback(() => {
    setSelectedEdgeId(null);
    setEdgePopupPos(null);
  }, []);

  const deleteEdgeRef = useRef(deleteEdge);
  useEffect(() => { deleteEdgeRef.current = deleteEdge; }, [deleteEdge]);

  useEffect(() => {
    if (!selectedEdgeId) return;
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteEdgeRef.current(selectedEdgeId);
        clearSelectedEdge();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedEdgeId, clearSelectedEdge]);

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    // Only create a new Set if the current one is non-empty — avoids spurious Effect B runs
    // (and the associated phantom setNodes calls) on every click.
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
    setEditingId(null);
    setContextMenu(null);
    clearSelectedEdge();
  }, [setSelectedId, setSelectedIds, setEditingId, clearSelectedEdge]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }) => {
      const incomingIds = new Set(selectedNodes.map((n) => n.id));
      const currentSingle = selectedIdRef.current;
      const currentMulti = selectedIdsRef.current;
      const currentAll = new Set([...(currentSingle ? [currentSingle] : []), ...currentMulti]);

      let nextAll;
      if (isShiftHeld.current) {
        if (incomingIds.size === 0) return; // ignore empty during shift-drag
        nextAll = new Set([...currentAll, ...incomingIds]);
      } else {
        nextAll = incomingIds;
      }

      // Content equality check — avoid triggering re-renders for identical selections
      if (nextAll.size === currentAll.size && [...nextAll].every((id) => currentAll.has(id))) return;

      if (nextAll.size === 0) {
        setSelectedIds(new Set());
      } else if (nextAll.size === 1) {
        setSelectedId([...nextAll][0]);
        setSelectedIds(new Set());
      } else {
        setSelectedId(null);
        setSelectedIds(nextAll);
      }
    },
    [setSelectedId, setSelectedIds],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onDblClick = (event) => {
      if (event.target.closest('.react-flow__node, .react-flow__edge, .react-flow__controls, .react-flow__minimap')) return;
      const rf = reactFlowRef.current;
      if (!rf) return;
      const position = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(position);
    };
    container.addEventListener('dblclick', onDblClick);
    return () => container.removeEventListener('dblclick', onDblClick);
  }, [addNode]);

  const handleNodeClick = useCallback((_event, node) => {
    setSelectedId(node.id);
    clearSelectedEdge();
    // Don't exit editing if the user clicked inside the already-editing node
    if (editingId !== node.id) setEditingId(null);
  }, [setSelectedId, setEditingId, clearSelectedEdge, editingId]);

  const handleNodeDoubleClick = useCallback((_event, node) => {
    setSelectedId(node.id);
    setEditingId(node.id);
  }, [setSelectedId, setEditingId]);

  const handleConnect = useCallback(
    (params) => addEdge(params.source, params.target),
    [addEdge],
  );

  const handleNodesChange = useCallback(
    (changes) => {
      // When Shift is held, prevent ReactFlow from visually deselecting already-selected nodes
      // as a new drag-selection starts. Without this, the select:false events emitted at drag
      // start would strip the visual selection before handleSelectionChange can union them back.
      if (isShiftHeld.current) {
        const currentAll = new Set([
          ...(selectedIdRef.current ? [selectedIdRef.current] : []),
          ...selectedIdsRef.current,
        ]);
        changes = changes.map((c) =>
          c.type === 'select' && !c.selected && currentAll.has(c.id)
            ? { ...c, selected: true }
            : c,
        );
      }
      onNodesChange(changes);
      const settled = changes.filter((c) => c.type === 'position' && c.position && !c.dragging);
      if (settled.length === 0) return;

      if (snapModeRef.current) {
        // Snap each settled node to the nearest free staggered-grid cell.
        // nodesRef.current holds the latest ReactFlow nodes (other nodes haven't moved).
        const snappedUpdates = new Map(
          settled.map((c) => [c.id, snapToGrid(c.position, nodesRef.current, c.id)])
        );
        setNodes((current) =>
          current.map((n) => {
            const pos = snappedUpdates.get(n.id);
            return pos ? { ...n, position: pos } : n;
          })
        );
        if (settled.length === 1) {
          updateNodePosition(settled[0].id, snappedUpdates.get(settled[0].id));
        } else {
          updateNodePositions([...snappedUpdates.entries()].map(([id, position]) => ({ id, position })));
        }
      } else if (settled.length === 1) {
        updateNodePosition(settled[0].id, settled[0].position);
      } else {
        updateNodePositions(settled.map((c) => ({ id: c.id, position: c.position })));
      }
    },
    [onNodesChange, updateNodePosition, updateNodePositions],
  );

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedId(node.id);
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', nodeId: node.id });
  }, [setSelectedId]);

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setSelectedEdgeId(edge.id);
    setEdgePopupPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleEdgeClick = useCallback((event, edge) => {
    setSelectedEdgeId(edge.id);
    setEdgePopupPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setLastPaneClick({ x: event.clientX, y: event.clientY });
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'pane' });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextAddNode = useCallback(() => {
    const position = projectToFlow(lastPaneClick);
    addNode(position);
    setContextMenu(null);
  }, [addNode, lastPaneClick, projectToFlow]);

  const handleContextEdit = useCallback(() => {
    if (contextMenu?.nodeId) {
      setSelectedId(contextMenu.nodeId);
      setEditingId(contextMenu.nodeId);
      onOpenInspector();
    }
    setContextMenu(null);
  }, [contextMenu, setSelectedId, setEditingId, onOpenInspector]);

  const handleContextDelete = useCallback(() => {
    if (contextMenu?.nodeId) deleteNode(contextMenu.nodeId);
    setContextMenu(null);
  }, [contextMenu, deleteNode]);

  const fitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.15 });
  }, [reactFlowInstance]);

  const getViewportCenter = useCallback(() => {
    if (!reactFlowInstance || !containerRef.current) return { x: 200, y: 120 };
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    return reactFlowInstance.screenToFlowPosition({ x: left + width / 2, y: top + height / 2 });
  }, [reactFlowInstance]);

  const zoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  const zoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  useImperativeHandle(ref, () => ({ fitView, getViewportCenter, zoomIn, zoomOut }), [fitView, getViewportCenter, zoomIn, zoomOut]);

  return (
    <HoverProvider>
    <div ref={containerRef} style={{ position: 'relative', height: '100%' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={handleInit}
          onMoveEnd={handleMoveEnd}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={handlePaneClick}
          onConnect={handleConnect}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={handleSelectionChange}
          onEdgeClick={handleEdgeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onEdgeContextMenu={handleEdgeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          panOnDrag={isPanMode && !isEditing}
          panOnScroll={!isEditing}
          panOnScrollMode="free"
          zoomOnScroll={false}
          zoomActivationKeyCode="Control"
          zoomOnPinch={!isEditing}
          selectionOnDrag={!isPanMode && !isEditing}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode={['Shift', 'Control']}
          zoomOnDoubleClick={false}
          fitView={!savedViewport.current}
          proOptions={{ hideAttribution: true }}
        >
          {showGrid && <StaggeredBackground />}
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>

      <ContextMenu
        contextMenu={contextMenu}
        onAddNode={handleContextAddNode}
        onEdit={handleContextEdit}
        onDelete={handleContextDelete}
        onClose={closeContextMenu}
      />
      {selectedEdgeId && edgePopupPos && (
        <div
          style={{
            position: 'fixed',
            left: edgePopupPos.x + 6,
            top: edgePopupPos.y - 22,
            background: 'rgba(20,20,20,0.7)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)',
            borderRadius: 3,
            padding: '1px 6px',
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: '18px',
            userSelect: 'none',
            zIndex: 1000,
          }}
          onClick={() => { deleteEdge(selectedEdgeId); clearSelectedEdge(); }}
        >
          ×
        </div>
      )}
    </div>
    </HoverProvider>
  );
});
