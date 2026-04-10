import { useState, useCallback } from 'react';
import { Modal, Stack, TextInput, PasswordInput, Button, Text, Group, Anchor, Divider } from '@mantine/core';
import { fetchGistData, extractGistId, createGist } from '../utils/gist';
import { defaultData } from '../data/defaultData';

const DEFAULT_FILENAME = 'my_skill_tree.json';

export function GistSetupModal({ opened, onConfigure, onClose, initialUrl = '', initialToken = '' }) {
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | string (error msg)

  const handleConnect = useCallback(async () => {
    setStatus('loading');
    try {
      const gistId = extractGistId(url);
      const { data, filename } = await fetchGistData(gistId, token);
      if (!data.nodes || !data.edges) {
        throw new Error('Gist JSON is missing required fields (nodes, edges).');
      }
      setStatus('success');
      onConfigure({ gistId, gistUrl: url.trim(), filename, token }, data);
    } catch (err) {
      setStatus(err.message);
    }
  }, [url, token, onConfigure]);

  const handleCreate = useCallback(async () => {
    setStatus('loading');
    try {
      const config = await createGist(DEFAULT_FILENAME, defaultData, token);
      setStatus('success');
      onConfigure({ ...config, token }, defaultData);
    } catch (err) {
      setStatus(err.message);
    }
  }, [token, onConfigure]);

  const isError = typeof status === 'string' && status !== 'loading' && status !== 'success';
  const isForced = !onClose;
  const isLoading = status === 'loading';

  return (
    <Modal
      opened={opened}
      onClose={onClose ?? (() => {})}
      withCloseButton={!isForced}
      closeOnClickOutside={!isForced}
      closeOnEscape={!isForced}
      title="Connect your Gist"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Your skill tree is stored in a GitHub Gist. You'll need a{' '}
          <Anchor
            href="https://github.com/settings/tokens/new?scopes=gist"
            target="_blank"
            rel="noopener noreferrer"
          >
            Personal Access Token
          </Anchor>{' '}
          with <code>gist</code> scope.
        </Text>

        <PasswordInput
          label="GitHub Personal Access Token"
          placeholder="github_pat_…"
          value={token}
          onChange={(e) => setToken(e.currentTarget.value)}
        />

        <Divider label="Use existing Gist" labelPosition="left" />

        <TextInput
          label="Gist URL"
          placeholder="https://gist.github.com/username/abc123…"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url && token) handleConnect();
          }}
        />
        <Group justify="flex-end">
          <Button onClick={handleConnect} loading={isLoading} disabled={!url || !token}>
            Connect
          </Button>
        </Group>

        <Divider label="Or start fresh" labelPosition="left" />

        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">Create a new secret Gist with empty data.</Text>
          <Button variant="default" onClick={handleCreate} loading={isLoading} disabled={!token}>
            Create Gist
          </Button>
        </Group>

        {isError && <Text c="red" size="sm">{status}</Text>}
        {status === 'success' && <Text c="green" size="sm">Connected!</Text>}
      </Stack>
    </Modal>
  );
}
