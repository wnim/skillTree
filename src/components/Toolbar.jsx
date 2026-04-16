import { Group, Button, Title, Text, Tooltip, ThemeIcon } from '@mantine/core';

const SYNC_LABELS = {
  loading: { text: 'Loading from Gist…', color: 'dimmed' },
  saving: { text: 'Saving…', color: 'dimmed' },
  error: { text: 'Sync error — check Gist settings', color: 'red' },
};

const TOOLTIPS = {
  exportJson:      'Download the skill tree as a JSON file',
  importJson:      'Load a skill tree from a JSON file',
  createTree:      'Add a new skill tree',
  panel:           'Toggle the inspector / JSON side panel',
};


export function Toolbar({ onExport, onImport, syncStatus, onGistSettings, onToggleSidebar, sidebarOpen, onSwitchTree, guestMode, onConnectGuestMode }) {
  const statusLabel = SYNC_LABELS[syncStatus] ?? null;
  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Group gap="md" align="center" style={{ minWidth: 0 }}>
        <Title order={4} style={{ whiteSpace: 'nowrap' }}>Pen Spinning Skill Tree</Title>
        {guestMode && (
          <Group gap={6} align="center" style={{ background: '#664400', borderRadius: 6, padding: '2px 12px', marginLeft: 8 }}>
            <Text size="sm" c="yellow.2" fw={600} style={{ whiteSpace: 'nowrap' }}>
              Guest mode: your skill tree is only saved in your browser.
            </Text>
            <Button size="xs" variant="filled" color="blue" onClick={onConnectGuestMode}>
              Connect to GitHub
            </Button>
          </Group>
        )}
      </Group>
      <Group gap="xs">
        {statusLabel && <Text size="sm" c={statusLabel.color}>{statusLabel.text}</Text>}
        <Tooltip label={TOOLTIPS.exportJson} openDelay={400}><Button size="xs" variant="default" onClick={onExport}>Export JSON</Button></Tooltip>
        <Tooltip label={TOOLTIPS.importJson} openDelay={400}><Button size="xs" variant="default" onClick={onImport}>Import JSON</Button></Tooltip>
        <Tooltip label="Switch skill tree" openDelay={400}><Button size="xs" variant="default" onClick={onSwitchTree}>Switch Tree</Button></Tooltip>
        <Tooltip label={TOOLTIPS.createTree} openDelay={400}><Button size="xs" variant="default" onClick={onGistSettings}>Add Tree</Button></Tooltip>
        <Tooltip label={TOOLTIPS.panel} openDelay={400}><Button size="xs" variant={sidebarOpen ? 'filled' : 'default'} onClick={onToggleSidebar}>Panel</Button></Tooltip>
      </Group>
    </Group>
  );
}
