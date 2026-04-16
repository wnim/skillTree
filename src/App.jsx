import { useEffect, useRef, useMemo } from 'react';
import { Toolbar } from './components/Toolbar';
import { TreePickerModal } from './components/TreePickerModal';
import { ActionBar } from './components/ActionBar';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { GistSetupModal } from './components/GistSetupModal';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { BulkTagModal } from './components/BulkTagModal';
import { useSkillTree } from './hooks/useSkillTree';
import { useGistConfig } from './hooks/useGistConfig';
import { useUIState } from './hooks/useUIState';
import { useLocalStorage } from './hooks/useLocalStorage';
import { defaultData } from './data/defaultData';


function App() {
  const { config, setConfig } = useGistConfig();
  const canvasRef = useRef(null);
  const skillTreeRef = useRef(null);

  // Persist last-used tree ID for auto-reload
  const lastTreeKey = 'psskill_last_gistid';

  // 1. Call useSkillTree first
  const [hideMaxScore, setHideMaxScore] = useLocalStorage('psskill_ui_hidemaxscore', false);
  const skillTree = useSkillTree(config, hideMaxScore);
  skillTreeRef.current = skillTree;

  // 2. Call useUIState after skillTreeRef is set
  const ui = useUIState({ canvasRef, skillTreeRef, setConfig });

  // Save last-used tree ID
  useEffect(() => {
    if (config?.gistId) {
      localStorage.setItem(lastTreeKey, config.gistId);
    }
  }, [config?.gistId]);

  // Guest mode: do not force modal open on first run
  const isFirstTime = false;

  const bulkSelectedNodes = useMemo(
    () => skillTree.data.nodes.filter((n) => skillTree.selectedIds.has(n.id)),
    [skillTree.data.nodes, skillTree.selectedIds],
  );

  const handleBulkTagSave = (toRemove, toAdd) => {
    skillTree.bulkUpdateTags([...skillTree.selectedIds], toRemove, toAdd);
  };

  return (
    <>
      {ui.shortcutsHelpOpen && <KeyboardShortcutsHelp onClose={() => ui.setShortcutsHelpOpen(false)} />}
      <GistSetupModal
        opened={ui.gistModalOpen}
        onClose={() => ui.setGistModalOpen(false)}
        onConfigure={ui.handleGistConfigure}
        initialUrl={config?.gistUrl ?? ''}
        initialToken={config?.token ?? ''}
      />
      <BulkTagModal
        opened={ui.bulkTagModalOpen}
        onClose={ui.closeBulkTagModal}
        onSave={handleBulkTagSave}
        selectedNodes={bulkSelectedNodes}
        allNodes={skillTree.data.nodes}
        tagStyles={skillTree.data.tag_styles}
      />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Toolbar
          onFitView={ui.handleFitView}
          onExport={skillTree.exportData}
          onImport={ui.handleImport}
          syncStatus={skillTree.syncStatus}
          onGistSettings={ui.handleGistSettings}
          onToggleSidebar={ui.handleToggleSidebar}
          sidebarOpen={ui.sidebarOpen}
          onSwitchTree={ui.handleSwitchTree}
          guestMode={!config}
          onConnectGuestMode={() => ui.setGistModalOpen(true)}
        />
              <TreePickerModal
                opened={ui.switchTreeModalOpen}
                token={config?.token ?? ''}
                onPick={(g) => {
                  setConfig({
                    gistId: g.gistId,
                    gistUrl: g.gistUrl,
                    filename: g.filename,
                    token: config.token,
                  });
                  skillTreeRef.current.importData(g.data);
                  ui.setSwitchTreeModalOpen(false);
                }}
                onCreate={(created) => {
                  setConfig({
                    gistId: created.gistId,
                    gistUrl: created.gistUrl,
                    filename: created.filename,
                    token: config.token,
                  });
                  skillTreeRef.current.importData(defaultData);
                  ui.setSwitchTreeModalOpen(false);
                }}
                onClose={() => ui.setSwitchTreeModalOpen(false)}
              />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ActionBar
            onAddNode={ui.handleAddNode}
            showGrid={ui.showGrid}
            onToggleShowGrid={ui.handleToggleShowGrid}
            snapMode={ui.snapMode}
            onToggleSnapMode={ui.handleToggleSnapMode}
            onAutoLayout={skillTree.autoLayout}
            hideMaxScore={ui.hideMaxScore}
            onToggleHideMaxScore={ui.handleToggleHideMaxScore}
            multiSelectCount={skillTree.selectedIds.size}
            onEditTags={ui.openBulkTagModal}
          />
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

