import { useCallback, useRef, useState } from 'react';
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

  const openInspector = useCallback(() => setActiveTab('inspector'), []);

  const handleGistConfigure = useCallback((newConfig, data) => {
    setConfig(newConfig);
    skillTree.importData(data);
    setGistModalOpen(false);
  }, [setConfig, skillTree]);

  const isFirstTime = !config;

  return (
    <>
      <GistSetupModal
        opened={isFirstTime || gistModalOpen}
        onClose={isFirstTime ? undefined : () => setGistModalOpen(false)}
        onConfigure={handleGistConfigure}
        initialUrl={config?.gistUrl ?? ''}
        initialToken={config?.token ?? ''}
      />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Toolbar
          onAddNode={handleAddNode}
          onFitView={handleFitView}
          onAutoLayout={skillTree.autoLayout}
          onExport={skillTree.exportData}
          onImport={handleImport}
          syncStatus={skillTree.syncStatus}
          onGistSettings={() => setGistModalOpen(true)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', flex: 1, minHeight: 0 }}>
          <Canvas
            ref={canvasRef}
            flowNodes={skillTree.flowNodes}
            flowEdges={skillTree.flowEdges}
            skillTree={skillTree}
            onOpenInspector={openInspector}
          />
          <div style={{ background: 'var(--mantine-color-dark-8)', borderLeft: '1px solid var(--mantine-color-dark-5)' }}>
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} skillTree={skillTree} />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
