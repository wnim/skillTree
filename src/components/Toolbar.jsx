import { Group, Button, Title, Text } from '@mantine/core';

const SYNC_LABELS = {
  loading: { text: 'Loading from Gist…', color: 'dimmed' },
  saving: { text: 'Saving…', color: 'dimmed' },
  error: { text: 'Sync error — check Gist settings', color: 'red' },
};

export function Toolbar({ onAddNode, onFitView, onAutoLayout, onExport, onImport, syncStatus, onGistSettings, onToggleSidebar, sidebarOpen }) {
  const statusLabel = SYNC_LABELS[syncStatus] ?? null;
  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Title order={4}>Pen Spinning Skill Tree</Title>
      <Group gap="sm">
        {statusLabel && <Text size="sm" c={statusLabel.color}>{statusLabel.text}</Text>}
        <Button onClick={onAddNode}>Add Node</Button>
        <Button variant="default" onClick={onFitView}>Fit view</Button>
        <Button variant="default" onClick={onAutoLayout}>Auto-layout</Button>
        <Button variant="default" onClick={onExport}>Export JSON</Button>
        <Button variant="default" onClick={onImport}>Import JSON</Button>
        <Button variant="default" onClick={onGistSettings}>Gist</Button>
        <Button variant={sidebarOpen ? 'filled' : 'default'} onClick={onToggleSidebar}>Panel</Button>
      </Group>
    </Group>
  );
}
