import { useState, useEffect } from 'react';
import {
  Modal, Stack, TextInput, Button, Text, Group,
  Anchor, Code, CopyButton, Loader,
} from '@mantine/core';
import {
  requestDeviceCode, pollForToken, findSkillTreeGists, createGist,
} from '../utils/gist';
import { defaultData, GITHUB_CLIENT_ID } from '../data/defaultData';

const DEFAULT_FILENAME = 'my_skill_tree.json';

/**
 * Auth-only modal for GitHub Device Flow.
 *
 * After successful auth:
 * - If guest has local data and chooses "save" → creates a gist, calls onConfigure with full config.
 * - If guest discards or has no data:
 *   - 0 existing trees → auto-creates one with defaultData, calls onConfigure with full config.
 *   - 1 existing tree  → auto-selects it, calls onConfigure with full config + data.
 *   - 2+ existing trees → calls onAuthOnly(token) so TreeManagerModal can open for picking.
 *
 * Props:
 *  opened, onClose,
 *  onConfigure(config, data) – full config ready (gistId, token, etc.)
 *  onAuthOnly(token)         – token obtained but user needs to pick a tree
 *  guestData                 – current local skill tree data
 */
export function GistSetupModal({ opened, onConfigure, onAuthOnly, onClose, guestData }) {
  // Phases: 'guestPrompt' | 'auth' | 'resolving' | 'naming' | 'creating' | 'error'
  const [phase, setPhase] = useState(null);
  const [treeName, setTreeName] = useState('');
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);
  const [deviceCodeInfo, setDeviceCodeInfo] = useState(null);
  const [authPolling, setAuthPolling] = useState(false);
  // Whether the user chose to save guest data (used during resolve)
  const [saveGuestData, setSaveGuestData] = useState(false);

  // Auto-open GitHub verification page when deviceCodeInfo is set
  useEffect(() => {
    if (phase === 'auth' && deviceCodeInfo?.verification_uri_complete) {
      window.open(deviceCodeInfo.verification_uri_complete, '_blank');
    }
  }, [phase, deviceCodeInfo]);

  const hasGuestData = guestData?.nodes?.length > 0;

  // Reset state and auto-advance when modal opens
  useEffect(() => {
    if (opened) {
      setTreeName('');
      setError('');
      setToken(null);
      setDeviceCodeInfo(null);
      setAuthPolling(false);
      setSaveGuestData(false);
      // Skip straight to the relevant phase
      if (hasGuestData) {
        setPhase('guestPrompt');
      } else {
        setPhase('auth');
      }
    } else {
      setPhase(null);
    }
  }, [opened, hasGuestData]);

  // Auto-kick-off device code request when entering auth phase
  useEffect(() => {
    if (phase !== 'auth' || deviceCodeInfo || authPolling) return;
    setAuthPolling(true);
    requestDeviceCode(GITHUB_CLIENT_ID)
      .then((info) => {
        setDeviceCodeInfo(info);
        return pollForToken(GITHUB_CLIENT_ID, info.device_code, info.interval);
      })
      .then((tok) => {
        setToken(tok);
        setAuthPolling(false);
        if (saveGuestData) {
          setPhase('naming');
        } else {
          resolveAfterAuth(tok);
        }
      })
      .catch((err) => {
        setError(err.message);
        setAuthPolling(false);
        setPhase('error');
      });
  }, [phase, deviceCodeInfo, authPolling, saveGuestData]);

  // Guest chose to save → go to naming phase (needs auth first if not done)
  const handleGuestSave = () => {
    setSaveGuestData(true);
    setPhase('auth');
  };

  // Guest chose to discard → authenticate, then auto-resolve
  const handleGuestDiscard = () => {
    setSaveGuestData(false);
    setPhase('auth');
  };

  // After auth (no guest data to save): discover trees and auto-resolve
  const resolveAfterAuth = async (tok) => {
    setPhase('resolving');
    try {
      const trees = await findSkillTreeGists(tok);
      if (trees.length === 0) {
        // First login, no trees → create one with default data
        const created = await createGist(DEFAULT_FILENAME, defaultData, tok, 'My Skill Tree');
        onConfigure({ ...created, token: tok }, defaultData);
      } else if (trees.length === 1) {
        // Exactly one tree → auto-select it
        const t = trees[0];
        onConfigure({ gistId: t.gistId, gistUrl: t.gistUrl, filename: t.filename, token: tok }, t.data);
      } else {
        // Multiple trees → let TreeManagerModal handle picking
        onAuthOnly(tok);
      }
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  // Create tree from naming phase (token is always available at this point)
  const handleCreate = async () => {
    const name = treeName.trim();
    if (!name) { setError('Please enter a tree name.'); return; }
    setPhase('creating');
    try {
      const data = saveGuestData ? guestData : defaultData;
      const created = await createGist(DEFAULT_FILENAME, data, token, name);
      onConfigure({ ...created, token }, data);
    } catch (err) {
      setError(err.message);
      setPhase('error');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose ?? (() => {})}
      withCloseButton={!!onClose}
      closeOnClickOutside={!!onClose}
      closeOnEscape={!!onClose}
      title="Connect to GitHub"
      centered
    >
      <Stack gap="md">
        {phase === 'guestPrompt' && (
          <>
            <Text size="sm">
              You have an unsaved skill tree in this session. What would you like to do?
            </Text>
            <Group gap="sm">
              <Button onClick={handleGuestSave}>Save as New Tree on GitHub</Button>
              <Button variant="default" onClick={handleGuestDiscard}>Discard and Load from GitHub</Button>
            </Group>
          </>
        )}

        {phase === 'auth' && deviceCodeInfo && (
          <Stack gap={4}>
            <Text size="sm" fw={500}>1. Open this link in your browser:</Text>
            <Anchor
              href={deviceCodeInfo.verification_uri_complete || deviceCodeInfo.verification_uri || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 16, fontWeight: 600, wordBreak: 'break-all' }}
              underline
            >
              {deviceCodeInfo.verification_uri_complete || deviceCodeInfo.verification_uri || 'GitHub Device Login'}
            </Anchor>
            <Text size="sm" fw={500} mt={8}>2. Enter this code:</Text>
            <CopyButton value={deviceCodeInfo.user_code || ''} timeout={2000}>
              {({ copied, copy }) => (
                <Code
                  onClick={copy}
                  style={{
                    fontSize: 28, fontWeight: 700, letterSpacing: 2,
                    padding: '12px 24px', cursor: 'pointer',
                    background: copied ? '#d1fae5' : undefined,
                    color: copied ? '#059669' : undefined,
                    border: copied ? '2px solid #059669' : undefined,
                    borderRadius: 8, display: 'inline-block', marginBottom: 4,
                  }}
                  title={copied ? 'Copied!' : 'Click to copy'}
                >
                  {deviceCodeInfo.user_code || <i>unknown</i>}
                </Code>
              )}
            </CopyButton>
            <Text size="xs" c="dimmed" mt={2}>(Click the code to copy. Paste it into the GitHub page.)</Text>
            <Text size="sm" mt={8}>Waiting for authorization…</Text>
            {authPolling && <Loader size="sm" />}
          </Stack>
        )}

        {phase === 'resolving' && (
          <Group justify="center" gap="sm"><Loader size="sm" /><Text size="sm">Loading your trees…</Text></Group>
        )}

        {phase === 'naming' && (
          <>
            <TextInput
              label="Tree Name"
              placeholder="e.g. Left Hand Practice"
              value={treeName}
              onChange={(e) => setTreeName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape' && onClose) onClose();
              }}
            />
            {error && <Text c="red" size="sm">{error}</Text>}
            <Group gap="sm">
              <Button onClick={handleCreate} disabled={!treeName.trim()}>Create Tree</Button>
              {onClose && <Button variant="default" onClick={onClose}>Cancel</Button>}
            </Group>
          </>
        )}

        {phase === 'creating' && (
          <Group justify="center" gap="sm"><Loader size="sm" /><Text size="sm">Creating tree…</Text></Group>
        )}

        {phase === 'error' && (
          <>
            <Text c="red" size="sm">{error}</Text>
            <Button variant="default" size="xs" onClick={() => {
              setError('');
              setDeviceCodeInfo(null);
              setAuthPolling(false);
              setPhase('auth');
            }}>Try again</Button>
          </>
        )}
      </Stack>
    </Modal>
  );
}
