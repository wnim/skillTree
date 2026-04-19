import { useRef, useMemo, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { TreeManagerModal } from './components/TreeManagerModal';
import { ActionBar } from './components/ActionBar';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { GistSetupModal } from './components/GistSetupModal';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { TagLegend } from './components/TagLegend';
import { StatisticsPanel } from './components/StatisticsPanel';
import { BulkTagModal } from './components/BulkTagModal';
import { useSkillTree } from './hooks/useSkillTree';
import { useGistConfig } from './hooks/useGistConfig';
import { useUIState } from './hooks/useUIState';
import { defaultData } from './data/defaultData';


function App() {
  const { config, setConfig, clearConfig } = useGistConfig();
  const canvasRef = useRef(null);
  const skillTreeRef = useRef(null);

  // useUIState owns hideMaxScore; called first since it only uses skillTreeRef.current in callbacks
  const ui = useUIState({ canvasRef, skillTreeRef });

  const skillTree = useSkillTree(config, ui.hideMaxScore);
  skillTreeRef.current = skillTree;

  const bulkSelectedNodes = useMemo(
    () => skillTree.data.nodes.filter((n) => skillTree.selectedIds.has(n.id)),
    [skillTree.data.nodes, skillTree.selectedIds],
  );

  const handleBulkTagSave = (toRemove, toAdd) => {
    skillTree.bulkUpdateTags([...skillTree.selectedIds], toRemove, toAdd);
  };

  // --- Tree Manager callbacks ---

  const handleSwitchTree = useCallback((g) => {
    setConfig({ gistId: g.gistId, gistUrl: g.gistUrl, filename: g.filename, token: config.token });
    skillTreeRef.current.importData(g.data);
    ui.setTreeManagerOpen(false);
    requestAnimationFrame(() => canvasRef.current?.fitView());
  }, [config, setConfig, skillTreeRef, ui, canvasRef]);

  const handleCreateTree = useCallback((created) => {
    setConfig({ gistId: created.gistId, gistUrl: created.gistUrl, filename: created.filename, token: config.token });
    skillTreeRef.current.importData(defaultData);
    ui.setTreeManagerOpen(false);
    requestAnimationFrame(() => canvasRef.current?.fitView());
  }, [config, setConfig, skillTreeRef, ui, canvasRef]);

  const handleDisconnect = useCallback(() => {
    clearConfig();
    skillTreeRef.current.importData(defaultData);
    requestAnimationFrame(() => canvasRef.current?.fitView());
  }, [clearConfig, skillTreeRef, canvasRef]);

  // After auth resolves with full config (0 or 1 trees auto-resolved)
  const handleGistConfigure = useCallback((newConfig, data) => {
    setConfig(newConfig);
    skillTreeRef.current.importData(data);
    ui.setGistModalOpen(false);
    requestAnimationFrame(() => canvasRef.current?.fitView());
  }, [setConfig, skillTreeRef, ui, canvasRef]);

  // After auth when multiple trees exist — token only, open TreeManager
  const handleAuthOnly = useCallback((token) => {
    // Store token-only config temporarily so TreeManagerModal can fetch trees
    // We need a gistId to make the app "authenticated", so we open tree manager
    // with just the token stored.  Config will be completed when user picks a tree.
    setConfig({ token, gistId: null, gistUrl: null, filename: null });
    ui.setGistModalOpen(false);
    ui.setTreeManagerOpen(true);
  }, [setConfig, ui]);

  return (
    <>
      <GistSetupModal
        opened={ui.gistModalOpen}
        onClose={() => ui.setGistModalOpen(false)}
        onConfigure={handleGistConfigure}
        onAuthOnly={handleAuthOnly}
        guestData={skillTree.data}
      />
      <TreeManagerModal
        opened={ui.treeManagerOpen}
        onClose={() => ui.setTreeManagerOpen(false)}
        config={config}
        onImport={ui.handleImport}
        onExport={skillTree.exportData}
        onConnectGitHub={() => { ui.setTreeManagerOpen(false); ui.setGistModalOpen(true); }}
        onDisconnect={handleDisconnect}
        onSwitchTree={handleSwitchTree}
        onCreateTree={handleCreateTree}
        nodeCount={skillTree.data.nodes.length}
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
          syncStatus={skillTree.syncStatus}
          onToggleSidebar={ui.handleToggleSidebar}
          sidebarOpen={ui.sidebarOpen}
          guestMode={!config || !config.gistId}
          onOpenTreeManager={() => ui.setTreeManagerOpen(true)}
          onSaveNow={skillTree.saveNow}
          pendingSave={skillTree.pendingSave}
          showTagLegend={ui.showTagLegend}
          onToggleTagLegend={ui.handleToggleTagLegend}
          shortcutsHelpOpen={ui.shortcutsHelpOpen}
          onToggleShortcutsHelp={() => ui.setShortcutsHelpOpen(o => !o)}
          statisticsOpen={ui.statisticsOpen}
          onToggleStatistics={ui.handleToggleStatistics}
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
            <KeyboardShortcutsHelp open={ui.shortcutsHelpOpen} onClose={() => ui.setShortcutsHelpOpen(false)} />
            <div style={{
              position: 'absolute', top: 8, right: 12, zIndex: 9,
              display: 'flex', gap: 8, alignItems: 'flex-start',
              transition: 'all 0.25s ease',
            }}>
              <TagLegend tagStyles={skillTree.data.tag_styles} visible={ui.showTagLegend} />
              <StatisticsPanel data={skillTree.data} visible={ui.statisticsOpen} onFocusNode={(id) => { canvasRef.current?.focusNode(id); skillTree.setSelectedIds(new Set([id])); }} />
            </div>
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

