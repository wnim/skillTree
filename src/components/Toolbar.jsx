import { Group, Button, Title, Text, Tooltip } from '@mantine/core';

const SYNC_LABELS = {
  loading: { text: 'Loading from Gist…', color: 'dimmed' },
  saving: { text: 'Saving…', color: 'dimmed' },
  error: { text: 'Sync error — check Gist settings', color: 'red' },
};

const TOOLTIPS = {
  addNode:         'Add a new skill node at the centre of the viewport',
  fitView:         'Zoom and pan to fit all nodes in view',
  autoLayout:      'Snap all nodes to the nearest grid tile (tidy layout)',
  exportJson:      'Download the skill tree as a JSON file',
  importJson:      'Load a skill tree from a JSON file',
  gist:            'Configure GitHub Gist sync settings',
  hideMastered:    'Hide nodes where your score equals the maximum',
  showGrid:        'Show the staggered tile grid in the background',
  snap:            'Auto-snap nodes to the nearest tile when you drop them',
  panel:           'Toggle the inspector / JSON side panel',
};

export function Toolbar({ onAddNode, onFitView, onAutoLayout, onExport, onImport, syncStatus, onGistSettings, onToggleSidebar, sidebarOpen, hideMaxScore, onToggleHideMaxScore, showGrid, onToggleShowGrid, snapMode, onToggleSnapMode }) {
  const statusLabel = SYNC_LABELS[syncStatus] ?? null;
  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Title order={4}>Pen Spinning Skill Tree</Title>
      <Group gap="xs">
        {statusLabel && <Text size="sm" c={statusLabel.color}>{statusLabel.text}</Text>}
        <Tooltip label={TOOLTIPS.addNode} openDelay={400}><Button size="xs" onClick={onAddNode}>Add Node</Button></Tooltip>
        <Tooltip label={TOOLTIPS.fitView} openDelay={400}><Button size="xs" variant="default" onClick={onFitView}>Fit view</Button></Tooltip>
        <Tooltip label={TOOLTIPS.autoLayout} openDelay={400}><Button size="xs" variant="default" onClick={onAutoLayout}>Tidy</Button></Tooltip>
        <Tooltip label={TOOLTIPS.exportJson} openDelay={400}><Button size="xs" variant="default" onClick={onExport}>Export JSON</Button></Tooltip>
        <Tooltip label={TOOLTIPS.importJson} openDelay={400}><Button size="xs" variant="default" onClick={onImport}>Import JSON</Button></Tooltip>
        <Tooltip label={TOOLTIPS.gist} openDelay={400}><Button size="xs" variant="default" onClick={onGistSettings}>Gist</Button></Tooltip>
        <Tooltip label={TOOLTIPS.hideMastered} openDelay={400}><Button size="xs" variant={hideMaxScore ? 'filled' : 'default'} onClick={onToggleHideMaxScore}>Hide mastered</Button></Tooltip>
        <Tooltip label={TOOLTIPS.showGrid} openDelay={400}><Button size="xs" variant={showGrid ? 'filled' : 'default'} onClick={onToggleShowGrid}>Show grid</Button></Tooltip>
        <Tooltip label={TOOLTIPS.snap} openDelay={400}><Button size="xs" variant={snapMode ? 'filled' : 'default'} onClick={onToggleSnapMode}>Snap</Button></Tooltip>
        <Tooltip label={TOOLTIPS.panel} openDelay={400}><Button size="xs" variant={sidebarOpen ? 'filled' : 'default'} onClick={onToggleSidebar}>Panel</Button></Tooltip>
      </Group>
    </Group>
  );
}
