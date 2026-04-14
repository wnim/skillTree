import { useState } from 'react';
import { Stack, Group, Text, Button, ColorInput, ColorSwatch, Select, Paper, Title, Popover, Anchor, Divider } from '@mantine/core';

// Curated palette: one swatch per hue family, tuned for contrast on dark backgrounds
const THEME_SWATCHES = [
  '#4A90D9', // blue
  '#20C997', // teal
  '#51CF66', // green
  '#94D82D', // lime
  '#FAB005', // amber
  '#FF922B', // orange
  '#FF6B6B', // red
  '#F06595', // pink
  '#CC5DE8', // purple
  '#868E96', // neutral gray
];

function TagColorPicker({ value, onChange }) {
  const [opened, setOpened] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const isCustom = Boolean(value) && !THEME_SWATCHES.some(
    (s) => s.toLowerCase() === value.toLowerCase(),
  );

  const handleOpen = () => {
    setShowCustom(isCustom);
    setOpened(true);
  };

  return (
    <Popover
      opened={opened}
      onClose={() => setOpened(false)}
      width={186}
      position="bottom-end"
      withArrow
      shadow="md"
    >
      <Popover.Target>
        <ColorSwatch
          color={value || '#888888'}
          size={24}
          style={{ cursor: 'pointer', flexShrink: 0 }}
          onClick={handleOpen}
        />
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="xs" c="dimmed" fw={500}>Theme colors</Text>
          <Group gap={6} wrap="wrap">
            {THEME_SWATCHES.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                size={22}
                style={{
                  cursor: 'pointer',
                  outline: isCustom ? 'none' : value?.toLowerCase() === color.toLowerCase()
                    ? '2px solid var(--mantine-color-white)'
                    : 'none',
                  outlineOffset: 2,
                  borderRadius: 4,
                }}
                onClick={() => {
                  onChange(color);
                  setOpened(false);
                }}
              />
            ))}
          </Group>
          <Divider />
          {showCustom ? (
            <ColorInput
              size="xs"
              value={value}
              onChange={onChange}
            />
          ) : (
            <Anchor
              size="xs"
              c="dimmed"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowCustom(true)}
            >
              Custom color…
            </Anchor>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export function SettingsPanel({
  tagStyles,
  edgeStyles,
  onAddTag,
  onUpdateTagStyle,
  onRemoveTagStyle,
  onAddEdgeType,
  onUpdateEdgeStyle,
  onRemoveEdgeStyle,
}) {
  const handleAddTag = () => {
    const tag = prompt('Tag name');
    if (tag) onAddTag(tag);
  };

  const handleAddEdgeType = () => {
    const type = prompt('Edge type name');
    if (type) onAddEdgeType(type);
  };

  return (
    <Stack gap="lg">
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={5}>Tag styles</Title>
          <Button size="xs" variant="default" onClick={handleAddTag}>Add tag</Button>
        </Group>
        {Object.keys(tagStyles).length === 0 ? (
          <Text size="sm" c="dimmed">Create a tag to style node borders and categorize tricks.</Text>
        ) : (
          <Stack gap="xs">
            {Object.entries(tagStyles).map(([tag, style]) => (
              <Group key={tag} justify="space-between">
                <Text size="sm">{tag}</Text>
                <Group gap="xs">
                  <TagColorPicker
                    value={style.color}
                    onChange={(color) => onUpdateTagStyle(tag, color)}
                  />
                  <Button size="xs" variant="default" onClick={() => onRemoveTagStyle(tag)}>Remove</Button>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between" mb="sm">
          <Title order={5}>Edge styles</Title>
          <Button size="xs" variant="default" onClick={handleAddEdgeType}>Add edge type</Button>
        </Group>
        {Object.keys(edgeStyles).length === 0 ? (
          <Text size="sm" c="dimmed">Create an edge type to control line style and color.</Text>
        ) : (
          <Stack gap="xs">
            {Object.entries(edgeStyles).map(([type, style]) => (
              <Group key={type} justify="space-between">
                <Text size="sm">{type}</Text>
                <Group gap="xs">
                  <ColorInput
                    size="xs"
                    value={style.color}
                    onChange={(color) => onUpdateEdgeStyle(type, 'color', color)}
                    w={120}
                  />
                  <Select
                    size="xs"
                    value={style.stroke}
                    onChange={(val) => onUpdateEdgeStyle(type, 'stroke', val)}
                    data={['solid', 'dashed']}
                    w={100}
                  />
                  <Button size="xs" variant="default" onClick={() => onRemoveEdgeStyle(type)}>Remove</Button>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
