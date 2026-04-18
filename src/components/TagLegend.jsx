import { Paper, Text, Group, Stack } from '@mantine/core';

const styles = {
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    flexShrink: 0,
  },
};

export function TagLegend({ tagStyles, visible }) {
  const entries = Object.entries(tagStyles ?? {});
  const hasEntries = entries.length > 0;
  const show = visible && hasEntries;

  return (
    <div style={{
      maxWidth: show ? 200 : 0,
      opacity: show ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-width 0.25s ease, opacity 0.2s ease',
      pointerEvents: show ? 'auto' : 'none',
    }}>
      <Paper shadow="md" p="xs" radius="md" withBorder style={{ minWidth: 120 }}>
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed">Tags</Text>
          {entries.map(([name, { color }]) => (
            <Group key={name} gap={8} wrap="nowrap">
              <div style={{ ...styles.swatch, background: color }} />
              <Text size="xs" lineClamp={1}>{name}</Text>
            </Group>
          ))}
        </Stack>
      </Paper>
    </div>
  );
}
