import { useEffect, useState } from 'react';
import { Modal, Stack, Group, Loader, Text, Card, Button, Divider, TextInput } from '@mantine/core';
import { findSkillTreeGists, createGist } from '../utils/gist';
import { defaultData, GITHUB_CLIENT_ID } from '../data/defaultData';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Delete Gist helper
async function deleteGistById(gistId, token) {
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'DELETE',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
}

export function TreePickerModal({ opened, token, onPick, onCreate, onClose }) {
  const [phase, setPhase] = useState('loading');
  const [gists, setGists] = useState([]);
  const [error, setError] = useState('');
  const [newTreeName, setNewTreeName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { gistId, description, nodeCount }
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setPhase('loading');
    setError('');
    setNewTreeName('');
    findSkillTreeGists(token)
      .then((results) => {
        setGists(results);
        setPhase('pick');
      })
      .catch((err) => {
        setError(err.message);
        setPhase('error');
      });
  }, [opened, token]);


  const handleShowCreate = () => {
    setNewTreeName('');
    setPhase('naming');
  };

  const handleCreate = async () => {
    if (!newTreeName.trim()) return;
    setPhase('creating');
    try {
      const created = await createGist('my_skill_tree.json', defaultData, token, newTreeName.trim());
      onCreate(created);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Switch Skill Tree" centered>
      <Stack gap="md">
        {phase === 'loading' && (
          <Group justify="center" gap="sm"><Loader size="sm" /><Text size="sm">Loading…</Text></Group>
        )}
        {phase === 'pick' && (
          <>
            <Text size="sm" c="dimmed">Pick a skill tree to load:</Text>
            {gists.map((g) => (
              <Card key={g.gistId} withBorder padding="sm" radius="sm">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate>{g.description}</Text>
                    <Text size="xs" c="dimmed">{g.filename} · updated {formatDate(g.updatedAt)}</Text>
                    <Text size="xs" c="dimmed">{g.data.nodes.length} nodes</Text>
                  </Stack>
                  <Stack gap={4} align="flex-end">
                    <Button size="xs" onClick={() => onPick(g)}>Select</Button>
                    <Button size="xs" color="red" variant="subtle" onClick={() => setDeleteTarget({ gistId: g.gistId, description: g.description, nodeCount: g.data.nodes.length, filename: g.filename })}>Delete</Button>
                  </Stack>
                </Group>
              </Card>
            ))}
                    {deleteTarget && (
                      <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Skill Tree" centered>
                        <Stack gap="md">
                          <Text>Are you sure you want to delete <b>{deleteTarget.description}</b>?</Text>
                          <Text size="sm" c="dimmed">This will permanently delete the skill tree Gist <b>{deleteTarget.gistId}</b> ({deleteTarget.filename}) containing <b>{deleteTarget.nodeCount}</b> nodes. This cannot be undone.</Text>
                          <Group gap="sm">
                            <Button color="red" loading={deleting} onClick={async () => {
                              setDeleting(true);
                              try {
                                await deleteGistById(deleteTarget.gistId, token);
                                // Optimistically remove from UI
                                setGists(prev => prev.filter(g => g.gistId !== deleteTarget.gistId));
                                setDeleteTarget(null);
                                setDeleting(false);
                                // Optionally, re-fetch after a short delay to ensure consistency
                                setTimeout(() => {
                                  setPhase('loading');
                                  setError('');
                                  findSkillTreeGists(token)
                                    .then((results) => {
                                      setGists(results);
                                      setPhase('pick');
                                    })
                                    .catch((err) => {
                                      setError(err.message);
                                      setPhase('error');
                                    });
                                }, 1500);
                              } catch (err) {
                                setError(err.message);
                                setDeleting(false);
                              }
                            }}>Delete</Button>
                            <Button variant="default" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
                          </Group>
                        </Stack>
                      </Modal>
                    )}
            <Divider label="or" labelPosition="center" />
            <Button variant="default" onClick={handleShowCreate}>Create new skill tree</Button>
          </>
        )}
        {phase === 'naming' && (
          <Stack gap="sm">
            <TextInput
              label="New skill tree name"
              placeholder="e.g. Left Hand Practice"
              value={newTreeName}
              onChange={e => setNewTreeName(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setPhase('pick');
              }}
            />
            <Group gap="sm">
              <Button onClick={handleCreate} disabled={!newTreeName.trim()}>Create</Button>
              <Button variant="default" onClick={() => setPhase('pick')}>Cancel</Button>
            </Group>
          </Stack>
        )}
        {phase === 'creating' && (
          <Group justify="center" gap="sm"><Loader size="sm" /><Text size="sm">Creating…</Text></Group>
        )}
        {phase === 'error' && (
          <Text c="red" size="sm">{error}</Text>
        )}
      </Stack>
    </Modal>
  );
}
