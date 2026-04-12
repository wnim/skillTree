import { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { GistSetupModal } from './components/GistSetupModal';
import { useSkillTree } from './hooks/useSkillTree';
import { useGistConfig } from './hooks/useGistConfig';

function App() {
  const { config, setConfig } = useGistConfig();
  const skillTree = useSkillTree(config);
  const [activeTab, setActiveTab] = useState('inspector');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gistModalOpen, setGistModalOpen] = useState(false);
  const canvasRef = useRef(null);

  const handleAddNode = useCallback(() => {
    skillTree.addNode({ x: 200, y: 120 });
    setActiveTab('inspector');
  }, [skillTree]);

  const handleFitView = useCallback(() => {
    canvasRef.current?.fitView();
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        skillTree.importData(JSON.parse(text));
      } catch {
        // invalid file — ignored
      }
    };
    input.click();
  }, [skillTree]);

  const openInspector = useCallback(() => {
    setActiveTab('inspector');
    setSidebarOpen(true);
  }, []);

  const handleGistConfigure = useCallback((newConfig, data) => {
    setConfig(newConfig);
    skillTree.importData(data);
    setGistModalOpen(false);
  }, [setConfig, skillTree]);

  const isFirstTime = !config;

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        skillTree.undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        skillTree.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        skillTree.copyNode();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        skillTree.pasteNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skillTree]);

  return (
    <>
      <GistSetupModal
        opened={isFirstTime || gistModalOpen}
        onClose={isFirstTime ? undefined : () => setGistModalOpen(false)}
        onConfigure={handleGistConfigure}
        initialUrl={config?.gistUrl ?? ''}
        initialToken={config?.token ?? ''}
      />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Toolbar
          onAddNode={handleAddNode}
          onFitView={handleFitView}
          onAutoLayout={skillTree.autoLayout}
          onExport={skillTree.exportData}
          onImport={handleImport}
          syncStatus={skillTree.syncStatus}
          onGistSettings={() => setGistModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          sidebarOpen={sidebarOpen}
        />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <Canvas
              ref={canvasRef}
              flowNodes={skillTree.flowNodes}
              flowEdges={skillTree.flowEdges}
              skillTree={skillTree}
              onOpenInspector={openInspector}
            />
          </div>
          <div style={{
            width: sidebarOpen ? 320 : 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            borderLeft: sidebarOpen ? '1px solid var(--mantine-color-dark-5)' : 'none',
            background: 'var(--mantine-color-dark-8)',
            flexShrink: 0,
          }}>
            <div style={{ width: 320, height: '100%' }}>
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} skillTree={skillTree} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
