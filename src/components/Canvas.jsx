import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { SkillNode } from './SkillNode';
import { EditableNode } from './EditableNode';
import { ContextMenu } from './ContextMenu';
import { loadViewport, saveViewport } from '../utils/viewport';

export const Canvas = forwardRef(function Canvas({ flowNodes, flowEdges, skillTree, onOpenInspector }, ref) {
  const { addNode, deleteNode, addEdge, updateNodePosition, updateNodeById, setSelectedId, setEditingId } = skillTree;
  const isEditing = skillTree.editingId != null;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [lastPaneClick, setLastPaneClick] = useState({ x: 200, y: 120 });
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
    setEditingId(null);
    setContextMenu(null);
  }, [setSelectedId, setEditingId]);

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
      changes
        .filter((c) => c.type === 'position' && c.position && !c.dragging)
        .forEach((c) => updateNodePosition(c.id, c.position));
    },
    [onNodesChange, updateNodePosition],
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
          onNodeContextMenu={handleNodeContextMenu}
          onPaneContextMenu={handlePaneContextMenu}
          panOnDrag={!isEditing}
          panOnScroll={!isEditing}
          panOnScrollMode="free"
          zoomOnScroll={false}
          zoomActivationKeyCode="Control"
          zoomOnPinch={!isEditing}
          selectionOnDrag={false}
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
