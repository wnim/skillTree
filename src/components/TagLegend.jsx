import { Paper, Text, Group, Stack } from '@mantine/core';

const styles = {
  container: {
    position: 'absolute',
    top: 44,
    right: 12,
    zIndex: 9,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    flexShrink: 0,
  },
};

export function TagLegend({ tagStyles, visible }) {
  const entries = Object.entries(tagStyles ?? {});
  if (!visible || entries.length === 0) return null;

  return (
    <div style={styles.container}>
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
