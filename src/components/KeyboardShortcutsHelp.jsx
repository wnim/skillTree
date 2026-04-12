import { useEffect } from 'react';
import { Paper, Text, Stack, Group, Kbd } from '@mantine/core';

const SHORTCUTS = [
  { keys: ['?'], description: 'Show this help' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'C'], description: 'Copy selected node' },
  { keys: ['Ctrl', 'V'], description: 'Paste node' },
  { keys: ['Delete'], description: 'Delete selected node' },
  { keys: ['Ctrl', 'Alt', 'T'], description: 'Auto layout' },
];

export function KeyboardShortcutsHelp({ onClose }) {
  useEffect(() => {
    const handleKey = () => onClose();
    const handleClick = () => onClose();
    window.addEventListener('keydown', handleKey, { capture: true });
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey, { capture: true });
      window.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <Paper
      shadow="lg"
      p="md"
      radius="md"
      withBorder
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        minWidth: 280,
        pointerEvents: 'none',
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={600} c="dimmed">Keyboard Shortcuts</Text>
        {SHORTCUTS.map(({ keys, description }) => (
          <Group key={description} justify="space-between" gap="xl">
            <Text size="sm">{description}</Text>
            <Group gap={4}>
              {keys.map((k) => (
                <Kbd key={k} size="xs">{k}</Kbd>
              ))}
            </Group>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
