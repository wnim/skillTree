import { useEffect, useRef } from 'react';
import { Paper, Text, Stack, Group, Kbd } from '@mantine/core';

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

export function KeyboardShortcutsHelp({ open, onClose }) {
  const panelRef = useRef(null);

  // Close on click outside or any keydown (except ?)
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key !== '?') onClose();
    };
    const handleMouseDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-shortcuts-trigger]')) return;
      onClose();
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKey, { capture: true });
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [open, onClose]);

  return (
    <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, pointerEvents: 'none' }}>
      {/* Shortcuts panel — pops from the top right */}
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
