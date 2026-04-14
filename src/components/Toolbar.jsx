import { Group, Button, Title, Text, Tooltip } from '@mantine/core';

const SYNC_LABELS = {
  loading: { text: 'Loading from Gist…', color: 'dimmed' },
  saving: { text: 'Saving…', color: 'dimmed' },
  error: { text: 'Sync error — check Gist settings', color: 'red' },
};

const TOOLTIPS = {
  exportJson:      'Download the skill tree as a JSON file',
  importJson:      'Load a skill tree from a JSON file',
  gist:            'Configure GitHub Gist sync settings',
  panel:           'Toggle the inspector / JSON side panel',
};

export function Toolbar({ onExport, onImport, syncStatus, onGistSettings, onToggleSidebar, sidebarOpen }) {
  const statusLabel = SYNC_LABELS[syncStatus] ?? null;
  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Title order={4}>Pen Spinning Skill Tree</Title>
      <Group gap="xs">
        {statusLabel && <Text size="sm" c={statusLabel.color}>{statusLabel.text}</Text>}
        <Tooltip label={TOOLTIPS.exportJson} openDelay={400}><Button size="xs" variant="default" onClick={onExport}>Export JSON</Button></Tooltip>
        <Tooltip label={TOOLTIPS.importJson} openDelay={400}><Button size="xs" variant="default" onClick={onImport}>Import JSON</Button></Tooltip>
        <Tooltip label={TOOLTIPS.gist} openDelay={400}><Button size="xs" variant="default" onClick={onGistSettings}>Gist</Button></Tooltip>
        <Tooltip label={TOOLTIPS.panel} openDelay={400}><Button size="xs" variant={sidebarOpen ? 'filled' : 'default'} onClick={onToggleSidebar}>Panel</Button></Tooltip>
      </Group>
    </Group>
  );
}
