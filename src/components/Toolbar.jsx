import { Group, ActionIcon, Button, Title, Text, Tooltip, Badge } from '@mantine/core';
import { Save, Check, CloudUpload } from 'lucide-react';

const SYNC_LABELS = {
  loading: { text: 'Loading from Gist…', color: 'dimmed' },
  saving: { text: 'Saving…', color: 'dimmed' },
  error: { text: 'Sync error — check Gist settings', color: 'red' },
};

export function Toolbar({ syncStatus, onToggleSidebar, sidebarOpen, guestMode, onOpenTreeManager, onSaveNow, pendingSave }) {
  const statusLabel = SYNC_LABELS[syncStatus] ?? null;
  const isSaving = syncStatus === 'saving';
  const showSaveButton = !guestMode;

  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Group gap="md" align="center" style={{ minWidth: 0 }}>
        <Title order={4} style={{ whiteSpace: 'nowrap' }}>Pen Spinning Skill Tree</Title>
        {showSaveButton && (
          <Tooltip label={pendingSave ? 'Save now (unsaved changes)' : isSaving ? 'Saving…' : 'Saved to Gist'} openDelay={200}>
            <ActionIcon
              variant={pendingSave ? 'filled' : 'subtle'}
              color={pendingSave ? 'orange' : isSaving ? 'blue' : 'teal'}
              size="md"
              onClick={onSaveNow}
              disabled={isSaving || !pendingSave}
              aria-label="Save to Gist"
            >
              {isSaving ? <CloudUpload size={16} /> : pendingSave ? <Save size={16} /> : <Check size={16} />}
            </ActionIcon>
          </Tooltip>
        )}
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
