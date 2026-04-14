import { useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { GistSetupModal } from './components/GistSetupModal';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useSkillTree } from './hooks/useSkillTree';
import { useGistConfig } from './hooks/useGistConfig';
import { useUIState } from './hooks/useUIState';

function App() {
  const { config, setConfig } = useGistConfig();
  const canvasRef = useRef(null);
  const skillTreeRef = useRef(null);

  const ui = useUIState({ canvasRef, skillTreeRef, setConfig });
  const skillTree = useSkillTree(config, ui.hideMaxScore);
  skillTreeRef.current = skillTree;

  const isFirstTime = !config;

  return (
    <>
      {ui.shortcutsHelpOpen && <KeyboardShortcutsHelp onClose={() => ui.setShortcutsHelpOpen(false)} />}
      <GistSetupModal
        opened={isFirstTime || ui.gistModalOpen}
        onClose={isFirstTime ? undefined : () => ui.setGistModalOpen(false)}
        onConfigure={ui.handleGistConfigure}
        initialUrl={config?.gistUrl ?? ''}
        initialToken={config?.token ?? ''}
      />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Toolbar
          onAddNode={ui.handleAddNode}
          onFitView={ui.handleFitView}
          onAutoLayout={skillTree.autoLayout}
          onExport={skillTree.exportData}
          onImport={ui.handleImport}
          syncStatus={skillTree.syncStatus}
          onGistSettings={ui.handleGistSettings}
          onToggleSidebar={ui.handleToggleSidebar}
          sidebarOpen={ui.sidebarOpen}
          hideMaxScore={ui.hideMaxScore}
          onToggleHideMaxScore={ui.handleToggleHideMaxScore}
          showGrid={ui.showGrid}
          onToggleShowGrid={ui.handleToggleShowGrid}
          snapMode={ui.snapMode}
          onToggleSnapMode={ui.handleToggleSnapMode}
        />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <Canvas
              ref={canvasRef}
              flowNodes={skillTree.flowNodes}
              flowEdges={skillTree.flowEdges}
              skillTree={skillTree}
              onOpenInspector={ui.openInspector}
              showGrid={ui.showGrid}
              snapMode={ui.snapMode}
            />
          </div>
          <div style={{
            width: ui.sidebarOpen ? 320 : 0,
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            borderLeft: ui.sidebarOpen ? '1px solid var(--mantine-color-dark-5)' : 'none',
            background: 'var(--mantine-color-dark-8)',
            flexShrink: 0,
          }}>
            <div style={{ width: 320, height: '100%' }}>
              <Sidebar activeTab={ui.activeTab} onTabChange={ui.setActiveTab} skillTree={skillTree} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

