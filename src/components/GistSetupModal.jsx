import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal, Stack, TextInput, PasswordInput, Button, Text, Group,
  Anchor, Divider, Code, CopyButton, Collapse, Loader, Tooltip, Card,
} from '@mantine/core';
import {
  requestDeviceCode, pollForToken, findSkillTreeGists,
  createGist, fetchGistData, extractGistId,
} from '../utils/gist';
import { defaultData, GITHUB_CLIENT_ID } from '../data/defaultData';

const DEFAULT_FILENAME = 'my_skill_tree.json';
// Phases: 'idle' | 'requesting' | 'polling' | 'discovering' | 'picking' | 'creating' | 'error'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function GistSetupModal({ opened, onConfigure, onClose }) {
  const [treeName, setTreeName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (opened) {
      setTreeName("");
      setError("");
    }
  }, [opened]);

  const handleCreate = () => {
    if (!treeName.trim()) {
      setError("Please enter a tree name.");
      return;
    }
    onConfigure({ treeName: treeName.trim() });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose ?? (() => {})}
      withCloseButton={!!onClose}
      closeOnClickOutside={!!onClose}
      closeOnEscape={!!onClose}
      title="Add New Skill Tree"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          <b>Skill Tree is a BYOB (Bring Your Own Backend) app.</b><br />
          There is no central database and no sign-in required. <b>Your data is never stored on our servers.</b><br /><br />
          To save and sync your skill trees, you will need a GitHub account. When you add a new tree, the app will create a <b>private GitHub Gist</b> in your account to store your data. Only you can access it unless you share the Gist URL. You will be asked to authorize access to your GitHub account (using GitHub's official Device Flow), but your credentials are never seen or stored by this app.<br /><br />
          <b>Why GitHub?</b> Using your own GitHub account means you control your data, can sync across devices, and don't need to trust a random server. You can delete your Gists from your GitHub account at any time.
        </Text>
        <TextInput
          label="Tree Name"
          placeholder="e.g. Left Hand Practice"
          value={treeName}
          onChange={e => setTreeName(e.target.value)}
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape' && onClose) onClose();
          }}
        />
        {error && <Text c="red" size="sm">{error}</Text>}
        <Group gap="sm">
          <Button onClick={handleCreate} disabled={!treeName.trim()}>Create Tree</Button>
          {onClose && <Button variant="default" onClick={onClose}>Cancel</Button>}
        </Group>
      </Stack>
    </Modal>
  );
}
