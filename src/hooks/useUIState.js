import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useUIState({ canvasRef, skillTreeRef, setConfig }) {
  const [sidebarOpen, setSidebarOpen] = useLocalStorage('psskill_ui_sidebar', false);
  const [hideMaxScore, setHideMaxScore] = useLocalStorage('psskill_ui_hidemaxscore', false);
  const [showGrid, setShowGrid] = useLocalStorage('psskill_ui_showgrid', false);
  const [snapMode, setSnapMode] = useLocalStorage('psskill_ui_snapmode', false);
  const [activeTab, setActiveTab] = useState('inspector');
  const [gistModalOpen, setGistModalOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);

  const handleAddNode = useCallback(() => {
    const center = canvasRef.current?.getViewportCenter() ?? { x: 200, y: 120 };
    skillTreeRef.current.addNode(center);
    setActiveTab('inspector');
  }, [canvasRef, skillTreeRef]);

  const handleFitView = useCallback(() => {
    canvasRef.current?.fitView();
  }, [canvasRef]);

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, [canvasRef]);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, [canvasRef]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        skillTreeRef.current.importData(JSON.parse(text));
      } catch {
        // invalid file — ignored
      }
    };
    input.click();
  }, [skillTreeRef]);

  const openInspector = useCallback(() => {
    setActiveTab('inspector');
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  const handleGistConfigure = useCallback((newConfig, data) => {
    setConfig(newConfig);
    skillTreeRef.current.importData(data);
    setGistModalOpen(false);
  }, [setConfig, skillTreeRef]);

  const handleGistSettings = useCallback(() => setGistModalOpen(true), []);
  const openBulkTagModal = useCallback(() => setBulkTagModalOpen(true), []);
  const closeBulkTagModal = useCallback(() => setBulkTagModalOpen(false), []);
  const handleToggleSidebar = useCallback(() => setSidebarOpen((o) => !o), [setSidebarOpen]);
  const handleToggleHideMaxScore = useCallback(() => setHideMaxScore((v) => !v), [setHideMaxScore]);
  const handleToggleShowGrid = useCallback(() => setShowGrid((v) => !v), [setShowGrid]);
  const handleToggleSnapMode = useCallback(() => setSnapMode((v) => !v), [setSnapMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      const st = skillTreeRef.current;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        st.undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        st.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        st.copyNode();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        st.pasteNode();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId) {
        st.deleteNode(st.selectedId);
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        st.autoLayout();
      } else if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setHideMaxScore((v) => !v);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShortcutsHelpOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skillTreeRef, setHideMaxScore]);

  return {
    sidebarOpen,
    hideMaxScore,
    showGrid,
    activeTab,
    setActiveTab,
    gistModalOpen,
    setGistModalOpen,
    shortcutsHelpOpen,
    setShortcutsHelpOpen,
    handleAddNode,
    handleFitView,
    handleZoomIn,
    handleZoomOut,
    handleImport,
    openInspector,
    handleGistConfigure,
    handleGistSettings,
    handleToggleSidebar,
    handleToggleHideMaxScore,
    handleToggleShowGrid,
    snapMode,
    handleToggleSnapMode,
    bulkTagModalOpen,
    openBulkTagModal,
    closeBulkTagModal,
  };
}
