import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { ArrowDownRight, Map as MapIcon } from 'lucide-react';
import { SkillNode } from './SkillNode';
import { EditableNode } from './EditableNode';
import { CustomBezierEdge } from './CustomBezierEdge';
import { HoverProvider } from './HoverContext';
import { ContextMenu } from './ContextMenu';
import { StaggeredBackground } from './StaggeredBackground';
import { loadViewport, saveViewport } from '../utils/viewport';
import { snapToGrid } from '../utils/layout';
import { scoreColor } from '../utils/score';

export const Canvas = forwardRef(function Canvas({ flowNodes, flowEdges, skillTree, onOpenInspector, showGrid, snapMode }, ref) {
  const { addNode, deleteNode, addEdge, deleteEdge, updateNodePosition, updateNodePositions, updateNodeById,
    setSelectedIds, setEditingId,
    selectedIds, editingId } = skillTree;
  const isEditing = editingId != null;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [lastPaneClick, setLastPaneClick] = useState({ x: 200, y: 120 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [edgePopupPos, setEdgePopupPos] = useState(null);
  const [minimapOpen, setMinimapOpen] = useState(true);
  const [minimapToggled, setMinimapToggled] = useState(false);
  const minimapRef = useRef(null);
  const isShiftHeld = useRef(false);
  const snapModeRef = useRef(snapMode);
  useEffect(() => { snapModeRef.current = snapMode; }, [snapMode]);
  const nodesRef = useRef([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
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
      const selectedSet = selectedIdsRef.current;
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
  // Creates new objects only for nodes whose `selected` flag actually flipped.
  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((n) => {
        const shouldBe = selectedIds.has(n.id);
        if (n.selected === shouldBe) return n;
        changed = true;
        return { ...n, selected: shouldBe };
      });
      return changed ? next : current;
    });
  }, [selectedIds]);

  // Edge sync: fires when edge data or the selected edge changes.
  useEffect(() => {
    if (!selectedEdgeId) {
      setEdges(flowEdges);
      return;
    }
    setEdges(flowEdges.map((e) =>
      e.id === selectedEdgeId
        ? { ...e, style: { ...e.style, stroke: 'orange' } }
        : e
    ));
  }, [flowEdges, selectedEdgeId]);

  // Keep ref in sync so handleSelectionChange always sees fresh values
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

  // Shift+scroll accelerator: intercept wheel events while Shift is held,
  // prevent ReactFlow's default pan, and apply a faster pan manually.
  // Must use capture phase so we intercept before ReactFlow's own wheel handler.
  const SHIFT_SCROLL_MULTIPLIER = 3;
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e) => {
      if (!e.shiftKey) return;
      const rf = reactFlowRef.current;
      if (!rf) return;
      e.preventDefault();
      e.stopPropagation();
      const { x, y, zoom } = rf.getViewport();
      rf.setViewport({ x: x - e.deltaX * SHIFT_SCROLL_MULTIPLIER, y: y - e.deltaY * SHIFT_SCROLL_MULTIPLIER, zoom });
    };
    container.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => container.removeEventListener('wheel', onWheel, { capture: true });
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
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
    setEditingId(null);
    setContextMenu(null);
    clearSelectedEdge();
  }, [setSelectedIds, setEditingId, clearSelectedEdge]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }) => {
      const incomingIds = new Set(selectedNodes.map((n) => n.id));
      const currentAll = selectedIdsRef.current;

      let nextAll;
      if (isShiftHeld.current) {
        if (incomingIds.size === 0) return; // ignore empty during shift-drag
        nextAll = new Set([...currentAll, ...incomingIds]);
      } else {
        nextAll = incomingIds;
      }

      // Content equality check — avoid triggering re-renders for identical selections
      if (nextAll.size === currentAll.size && [...nextAll].every((id) => currentAll.has(id))) return;

      setSelectedIds(nextAll);
    },
    [setSelectedIds],
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
    setSelectedIds(new Set([node.id]));
    clearSelectedEdge();
    // Don't exit editing if the user clicked inside the already-editing node
    if (editingId !== node.id) setEditingId(null);
  }, [setSelectedIds, setEditingId, clearSelectedEdge, editingId]);

  const handleNodeDoubleClick = useCallback((_event, node) => {
    setSelectedIds(new Set([node.id]));
    setEditingId(node.id);
  }, [setSelectedIds, setEditingId]);

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
        const currentAll = selectedIdsRef.current;
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
    setSelectedIds(new Set([node.id]));
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'node', nodeId: node.id });
  }, [setSelectedIds]);

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
      setSelectedIds(new Set([contextMenu.nodeId]));
      setEditingId(contextMenu.nodeId);
      onOpenInspector();
    }
    setContextMenu(null);
  }, [contextMenu, setSelectedIds, setEditingId, onOpenInspector]);

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

  const panBy = useCallback((dx, dy) => {
    if (!reactFlowInstance) return;
    const { x, y, zoom } = reactFlowInstance.getViewport();
    reactFlowInstance.setViewport({ x: x + dx, y: y + dy, zoom });
  }, [reactFlowInstance]);

  const handleMinimapClick = useCallback((event) => {
    if (!reactFlowInstance) return;
    const svg = minimapRef.current?.querySelector('svg');
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const flowPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    const { zoom } = reactFlowInstance.getViewport();
    reactFlowInstance.setCenter(flowPt.x, flowPt.y, { zoom, duration: 200 });
  }, [reactFlowInstance]);

  useImperativeHandle(ref, () => ({ fitView, getViewportCenter, zoomIn, zoomOut, panBy }), [fitView, getViewportCenter, zoomIn, zoomOut, panBy]);

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
          minZoom={0.1}
          fitView={!savedViewport.current}
          proOptions={{ hideAttribution: true }}
        >
          {showGrid && <StaggeredBackground />}
          <Controls />
          <div ref={minimapRef} onClick={handleMinimapClick}>
          <MiniMap
            nodeColor={(node) => scoreColor(node.data?.score ?? null)}
            nodeStrokeWidth={3}
            pannable
            zoomable
            maskColor="rgba(0,0,0,0.6)"
            className={!minimapToggled ? undefined : (minimapOpen ? 'minimap-map--opening' : 'minimap-map--closing')}
            style={{ width: 240, height: 160 }}
          />
          </div>
        </ReactFlow>
      </ReactFlowProvider>

      {/* minimap toggle buttons — overlaid outside ReactFlow to avoid Panel positioning conflicts */}
      <div className="minimap-overlay">
        <button
          className="minimap-toggle minimap-toggle--collapse"
          style={{ opacity: minimapOpen ? 1 : 0, pointerEvents: minimapOpen ? 'auto' : 'none' }}
          onClick={() => { setMinimapToggled(true); setMinimapOpen(false); }}
          title="Collapse minimap"
        >
          <ArrowDownRight size={12} />
        </button>
        <button
          className="minimap-toggle minimap-toggle--expand"
          style={{ opacity: minimapOpen ? 0 : 1, pointerEvents: minimapOpen ? 'none' : 'auto' }}
          onClick={() => { setMinimapToggled(true); setMinimapOpen(true); }}
          title="Show minimap"
        >
          <MapIcon size={16} />
        </button>
      </div>

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
