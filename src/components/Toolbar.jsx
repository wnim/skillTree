import { Group, Button, Title, Text, Tooltip, Badge } from '@mantine/core';

const SYNC_LABELS = {
  loading: { text: 'Loading from Gist…', color: 'dimmed' },
  saving: { text: 'Saving…', color: 'dimmed' },
  error: { text: 'Sync error — check Gist settings', color: 'red' },
};

export function Toolbar({ syncStatus, onToggleSidebar, sidebarOpen, guestMode, onOpenTreeManager }) {
  const statusLabel = SYNC_LABELS[syncStatus] ?? null;
  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Group gap="md" align="center" style={{ minWidth: 0 }}>
        <Title order={4} style={{ whiteSpace: 'nowrap' }}>Pen Spinning Skill Tree</Title>
        {guestMode && (
          <Badge
            color="yellow"
            variant="filled"
            size="lg"
            style={{ cursor: 'pointer' }}
            onClick={onOpenTreeManager}
          >
            Guest — data saved locally only
          </Badge>
        )}
      </Group>
      <Group gap="xs">
        {statusLabel && <Text size="sm" c={statusLabel.color}>{statusLabel.text}</Text>}
        <Tooltip label="Manage skill trees, import/export, GitHub sync" openDelay={400}>
          <Button size="xs" variant="default" onClick={onOpenTreeManager}>Trees</Button>
        </Tooltip>
        <Tooltip label="Toggle the inspector / JSON side panel" openDelay={400}>
          <Button size="xs" variant={sidebarOpen ? 'filled' : 'default'} onClick={onToggleSidebar}>Panel</Button>
        </Tooltip>
      </Group>
    </Group>
  );
}
