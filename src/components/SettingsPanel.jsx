import { Stack, Group, Text, Button, ColorInput, Select, Paper, Title } from '@mantine/core';

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
                  <ColorInput
                    size="xs"
                    value={style.color}
                    onChange={(color) => onUpdateTagStyle(tag, color)}
                    w={120}
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
