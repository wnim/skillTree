import { useEffect, useState, useCallback } from 'react';
import {
  Modal, Stack, Group, Loader, Text, Card, Button,
  Divider, TextInput, Anchor, Badge, ActionIcon, Tooltip,
} from '@mantine/core';
import { findSkillTreeGists, createGist, deleteGistById } from '../utils/gist';
import { defaultData } from '../data/defaultData';

const DEFAULT_FILENAME = 'my_skill_tree.json';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/**
 * Unified tree management modal.
 *
 * Guest mode:  shows local tree info, import/export, and "Connect to GitHub".
 * Authed mode: shows tree list (switch/create/delete/GitHub links), import/export, disconnect.
 *
 * Props:
 *  opened, onClose,
 *  config            – current gist config (null = guest)
 *  onImport          – () => void  (opens file dialog)
 *  onExport          – () => void  (downloads JSON)
 *  onConnectGitHub   – () => void  (opens GistSetupModal)
 *  onDisconnect      – () => void  (clears config → guest mode)
 *  onSwitchTree      – (gistResult) => void  (set config + import data)
 *  onCreateTree      – (gistResult) => void  (set config + import default)
 *  nodeCount         – number (current tree node count)
 */
export function TreeManagerModal({
  opened, onClose,
  config,
  onImport, onExport,
  onConnectGitHub, onDisconnect,
  onSwitchTree, onCreateTree,
  nodeCount,
}) {
  // Phases: 'idle' | 'loading' | 'list' | 'naming' | 'creating' | 'error'
  const [phase, setPhase] = useState('idle');
  const [gists, setGists] = useState([]);
  const [error, setError] = useState('');
  const [newTreeName, setNewTreeName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isGuest = !config;
  const token = config?.token ?? '';

  // Fetch tree list when modal opens in authenticated mode
  useEffect(() => {
    if (!opened) return;
    setError('');
    setNewTreeName('');
    setDeleteTarget(null);
    setDeleting(false);
    if (isGuest) {
      setPhase('idle');
      setGists([]);
    } else {
      setPhase('loading');
      findSkillTreeGists(token)
        .then((results) => { setGists(results); setPhase('list'); })
        .catch((err) => { setError(err.message); setPhase('error'); });
    }
  }, [opened, isGuest, token]);

  const handleCreate = useCallback(async () => {
    if (!newTreeName.trim()) return;
    setPhase('creating');
    try {
      const created = await createGist(DEFAULT_FILENAME, defaultData, token, newTreeName.trim());
      onCreateTree(created);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  }, [newTreeName, token, onCreateTree]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteGistById(deleteTarget.gistId, token);
      setGists((prev) => prev.filter((g) => g.gistId !== deleteTarget.gistId));
      setDeleteTarget(null);
      setDeleting(false);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }, [deleteTarget, token]);

  const handleImportAndClose = useCallback(() => {
    onImport();
    onClose();
  }, [onImport, onClose]);

  const handleExportAndClose = useCallback(() => {
    onExport();
    onClose();
  }, [onExport, onClose]);

  // -- Render helpers -------------------------------------------------------

  const renderImportExport = () => (
    <Group gap="xs">
      <Button size="xs" variant="default" onClick={handleExportAndClose}>Export JSON</Button>
      <Button size="xs" variant="default" onClick={handleImportAndClose}>Import JSON</Button>
    </Group>
  );

  const renderGuestContent = () => (
    <Stack gap="md">
      <Group gap="xs" align="center">
        <Badge color="yellow" variant="filled" size="lg">Guest Mode</Badge>
      </Group>
      <Text size="sm">
        Your skill tree ({nodeCount} node{nodeCount !== 1 ? 's' : ''}) is only saved in this browser.
        Connect to GitHub to sync across devices and keep backups.
      </Text>
      {renderImportExport()}
      <Divider />
      <Button onClick={() => { onClose(); onConnectGitHub(); }}>
        Connect to GitHub
      </Button>
    </Stack>
  );

  const renderTreeCard = (g) => {
    const isCurrent = g.gistId === config?.gistId;
    return (
      <Card
        key={g.gistId}
        withBorder
        padding="sm"
        radius="sm"
        style={isCurrent ? { borderColor: 'var(--mantine-color-blue-6)', borderWidth: 2 } : undefined}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} align="center">
              <Text size="sm" fw={500} truncate>{g.description}</Text>
              {isCurrent && <Badge size="xs" color="blue">Current</Badge>}
            </Group>
            <Text size="xs" c="dimmed">
              {g.filename} · {g.data.nodes.length} nodes · updated {formatDate(g.updatedAt)}
            </Text>
          </Stack>
          <Group gap={4} wrap="nowrap">
            <Tooltip label="View on GitHub" openDelay={300}>
              <Anchor href={g.gistUrl} target="_blank" rel="noopener noreferrer" underline="never">
                <ActionIcon variant="subtle" size="sm" color="gray">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </ActionIcon>
              </Anchor>
            </Tooltip>
            {!isCurrent && (
              <Button size="xs" onClick={() => { onSwitchTree(g); }}>
                Switch
              </Button>
            )}
            {!isCurrent && (
              <Button
                size="xs"
                color="red"
                variant="subtle"
                onClick={() => setDeleteTarget({
                  gistId: g.gistId,
                  description: g.description,
                  nodeCount: g.data.nodes.length,
                  filename: g.filename,
                })}
              >
                Delete
              </Button>
            )}
          </Group>
        </Group>
      </Card>
    );
  };

  const renderAuthedContent = () => (
    <Stack gap="md">
      {renderImportExport()}
      <Divider label="Your skill trees" labelPosition="center" />

      {phase === 'loading' && (
        <Group justify="center" gap="sm"><Loader size="sm" /><Text size="sm">Loading trees…</Text></Group>
      )}

      {phase === 'list' && (
        <>
          {gists.length === 0 && <Text size="sm" c="dimmed">No skill trees found on your GitHub.</Text>}
          {gists.map(renderTreeCard)}
          <Button variant="default" onClick={() => { setNewTreeName(''); setPhase('naming'); }}>
            Create new skill tree
          </Button>
        </>
      )}

      {phase === 'naming' && (
        <Stack gap="sm">
          <TextInput
            label="New skill tree name"
            placeholder="e.g. Left Hand Practice"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setPhase('list');
            }}
          />
          <Group gap="sm">
            <Button onClick={handleCreate} disabled={!newTreeName.trim()}>Create</Button>
            <Button variant="default" onClick={() => setPhase('list')}>Cancel</Button>
          </Group>
        </Stack>
      )}

      {phase === 'creating' && (
        <Group justify="center" gap="sm"><Loader size="sm" /><Text size="sm">Creating…</Text></Group>
      )}

      {phase === 'error' && <Text c="red" size="sm">{error}</Text>}

      <Divider />
      <Button variant="subtle" color="red" size="xs" onClick={() => { onDisconnect(); }}>
        Disconnect from GitHub
      </Button>
    </Stack>
  );

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title="Manage Trees"
        centered
        closeOnEscape
      >
        {isGuest ? renderGuestContent() : renderAuthedContent()}
      </Modal>

      {/* Delete confirmation nested modal */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Skill Tree"
        centered
        size="sm"
      >
        {deleteTarget && (
          <Stack gap="md">
            <Text>Are you sure you want to delete <b>{deleteTarget.description}</b>?</Text>
            <Text size="sm" c="dimmed">
              This will permanently delete the Gist ({deleteTarget.filename}) containing{' '}
              <b>{deleteTarget.nodeCount}</b> nodes. This cannot be undone.
            </Text>
            <Group gap="sm">
              <Button color="red" loading={deleting} onClick={handleDelete}>Delete</Button>
              <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
}
