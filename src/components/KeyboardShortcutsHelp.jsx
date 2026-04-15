import { useEffect } from 'react';
import { Paper, Text, Stack, Group, Kbd, Divider } from '@mantine/core';

const KEYBOARD_SHORTCUTS = [
  { keys: ['?'], description: 'Show this help' },
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'C'], description: 'Copy selected node' },
  { keys: ['Ctrl', 'V'], description: 'Paste node' },
  { keys: ['Delete'], description: 'Delete selected node' },
  { keys: ['Ctrl', 'Alt', 'T'], description: 'Auto layout' },
  { keys: ['Ctrl', 'Alt', 'H'], description: 'Toggle hide mastered nodes' },
  { keys: ['Space'], description: 'Hold to enter pan mode (then drag)' },
  { keys: ['↑', '↓', '←', '→'], description: 'Pan canvas' },
  { keys: ['Shift', '↑↓←→'], description: 'Pan canvas (faster)' },
];

const MOUSE_ACTIONS = [
  { gesture: 'Scroll', description: 'Pan canvas (any direction)' },
  { gesture: 'Ctrl + Scroll', description: 'Zoom in / out' },
  { gesture: 'Drag (empty area)', description: 'Select area' },
  { gesture: 'Space + Drag', description: 'Pan canvas' },
];

function ShortcutRow({ keys, description }) {
  return (
    <Group justify="space-between" gap="xl" wrap="nowrap">
      <Text size="sm">{description}</Text>
      <Group gap={4} wrap="nowrap">
        {keys.map((k) => (
          <Kbd key={k} size="xs">{k}</Kbd>
        ))}
      </Group>
    </Group>
  );
}

function MouseRow({ gesture, description }) {
  return (
    <Group justify="space-between" gap="xl" wrap="nowrap">
      <Text size="sm">{description}</Text>
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{gesture}</Text>
    </Group>
  );
}

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
        minWidth: 300,
        pointerEvents: 'none',
      }}
    >
      <Stack gap="xs">
        <Text size="sm" fw={600} c="dimmed">Keyboard Shortcuts</Text>
        {KEYBOARD_SHORTCUTS.map((s) => (
          <ShortcutRow key={s.description} {...s} />
        ))}
        <Divider mt={4} />
        <Text size="sm" fw={600} c="dimmed">Mouse</Text>
        {MOUSE_ACTIONS.map((a) => (
          <MouseRow key={a.description} {...a} />
        ))}
      </Stack>
    </Paper>
  );
}
