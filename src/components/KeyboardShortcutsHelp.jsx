import { useEffect, useRef } from 'react';
import { Paper, Text, Stack, Group, Kbd, Divider, ActionIcon } from '@mantine/core';
import { CircleHelp } from 'lucide-react';

const SHORTCUT_TOPICS = [
  {
    topic: 'Navigation',
    items: [
      { keys: ['Space', 'Drag'], description: 'Pan canvas (drag)' },
      { keys: ['Scroll'], description: 'Pan canvas (scroll)' },
      { keys: ['Shift', 'Scroll'], description: 'Pan canvas (faster)' },
      { keys: ['Ctrl', 'Scroll'], description: 'Zoom in / out' },
      { keys: ['↑', '↓', '←', '→'], description: 'Pan canvas (keys)' },
      { keys: ['Shift', '↑↓←→'], description: 'Pan canvas (faster, keys)' },
    ],
  },
  {
    topic: 'Selection & Editing',
    items: [
      { keys: ['Drag (empty)'], description: 'Select area' },
      { keys: ['Ctrl', 'C'], description: 'Copy selected node' },
      { keys: ['Ctrl', 'V'], description: 'Paste node' },
      { keys: ['Delete'], description: 'Delete selected node' },
    ],
  },
  {
    topic: 'View & Layout',
    items: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
      { keys: ['Ctrl', 'Alt', 'T'], description: 'Auto layout' },
      { keys: ['Ctrl', 'Alt', 'H'], description: 'Toggle hide mastered' },
      { keys: ['?'], description: 'Show / hide this help' },
    ],
  },
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

export function KeyboardShortcutsHelp({ open, onToggle }) {
  const panelRef = useRef(null);

  // Close on click outside or any keydown (except ?)
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key !== '?') onToggle();
    };
    const handleClick = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      onToggle();
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleKey, { capture: true });
      window.removeEventListener('mousedown', handleClick);
    };
  }, [open, onToggle]);

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, pointerEvents: 'none' }}>
      {/* ? icon — always visible when panel is closed */}
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={onToggle}
        aria-label="Keyboard shortcuts"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          transition: 'opacity 0.15s ease',
        }}
      >
        <CircleHelp size={20} />
      </ActionIcon>

      {/* Shortcuts panel — pops from the icon */}
      <Paper
        ref={panelRef}
        shadow="lg"
        p="md"
        radius="md"
        withBorder
        style={{
          minWidth: 520,
          transformOrigin: 'top right',
          transform: open ? 'scale(1)' : 'scale(0)',
          opacity: open ? 1 : 0,
          transition: 'transform 0.2s ease, opacity 0.15s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--mantine-spacing-md)', alignItems: 'start' }}>
          {SHORTCUT_TOPICS.map((section) => (
            <Stack key={section.topic} gap="xs">
              <Text size="sm" fw={600} c="dimmed">{section.topic}</Text>
              {section.items.map((s) => (
                <ShortcutRow key={s.description} {...s} />
              ))}
            </Stack>
          ))}
        </div>
      </Paper>
    </div>
  );
}
