import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { SkillNode } from './SkillNode';
import { EditableNode } from './EditableNode';
import { ContextMenu } from './ContextMenu';
import { loadViewport, saveViewport } from '../utils/viewport';

export const Canvas = forwardRef(function Canvas({ flowNodes, flowEdges, skillTree, onOpenInspector }, ref) {
  const { addNode, deleteNode, addEdge, updateNodePosition, updateNodePositions, updateNodeById,
    setSelectedId, setSelectedIds, setEditingId,
    selectedId, selectedIds } = skillTree;
  const isEditing = skillTree.editingId != null;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [lastPaneClick, setLastPaneClick] = useState({ x: 200, y: 120 });
  const [isPanMode, setIsPanMode] = useState(false);
  const isShiftHeld = useRef(false);
  const selectedIdRef = useRef(selectedId);
  const selectedIdsRef = useRef(selectedIds);
  const savedViewport = useRef(loadViewport());
  const containerRef = useRef(null);
  const reactFlowRef = useRef(null);

  const nodeTypes = useMemo(() => ({ skillNode: SkillNode, editableNode: EditableNode }), []);

  // Enhance editing nodes with the type switch and update callbacks
  const enhancedNodes = useMemo(() => {
    return flowNodes.map((n) => {
      if (!n.data.isEditing) return n;
      return {
        ...n,
        type: 'editableNode',
        data: {
          ...n.data,
          onUpdate: updateNodeById,
          onClose: () => setEditingId(null),
        },
      };
    });
  }, [flowNodes, updateNodeById, setEditingId]);

  // Sync flow state from parent data
  useEffect(() => {
    setNodes(enhancedNodes);
    setEdges(flowEdges);
  }, [enhancedNodes, flowEdges, setNodes, setEdges]);

  // Keep refs in sync so handleSelectionChange always sees fresh values
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Shift') { isShiftHeld.current = true; return; }
      if (e.code !== 'Space' || e.repeat) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      setIsPanMode(true);
    };
    const onKeyUp = (e) => {
      if (e.key === 'Shift') { isShiftHeld.current = false; return; }
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

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    setSelectedIds(new Set());
    setEditingId(null);
    setContextMenu(null);
  }, [setSelectedId, setSelectedIds, setEditingId]);

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

  const handleCanvasDoubleClick = useCallback((event) => {
    if (!event.target.classList.contains('react-flow__pane')) return;
    const position = projectToFlow({ x: event.clientX, y: event.clientY });
    addNode(position);
    onOpenInspector();
  }, [addNode, onOpenInspector, projectToFlow]);

  const handleNodeClick = useCallback((_event, node) => {
    setSelectedId(node.id);
    // Don't exit editing if the user clicked inside the already-editing node
    if (skillTree.editingId !== node.id) setEditingId(null);
  }, [setSelectedId, setEditingId, skillTree.editingId]);

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
      onNodesChange(changes);
      const settled = changes.filter((c) => c.type === 'position' && c.position && !c.dragging);
      if (settled.length === 1) {
        updateNodePosition(settled[0].id, settled[0].position);
      } else if (settled.length > 1) {
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

  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setLastPaneClick({ x: event.clientX, y: event.clientY });
    setContextMenu({ x: event.clientX, y: event.clientY, type: 'pane' });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextAddNode = useCallback(() => {
    const position = projectToFlow(lastPaneClick);
    addNode(position);
    onOpenInspector();
    setContextMenu(null);
  }, [addNode, lastPaneClick, onOpenInspector, projectToFlow]);

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

  useImperativeHandle(ref, () => ({ fitView }), [fitView]);

  return (
    <div ref={containerRef} style={{ position: 'relative', height: '100%' }} onDoubleClick={handleCanvasDoubleClick}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={handleInit}
          onMoveEnd={handleMoveEnd}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onPaneClick={handlePaneClick}
          onConnect={handleConnect}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={handleSelectionChange}
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          panOnDrag={isPanMode && !isEditing}
          panOnScroll={!isEditing}
          panOnScrollMode="free"
          zoomOnScroll={false}
          zoomActivationKeyCode="Control"
          zoomOnPinch={!isEditing}
          selectionOnDrag={!isPanMode && !isEditing}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode="Shift"
          zoomOnDoubleClick={false}
          fitView={!savedViewport.current}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#222" />
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
    </div>
  );
});
