import { Stack, TextInput, Textarea, Slider, Checkbox, Select, Text, Button, Group } from '@mantine/core';
import { DEFAULT_EDGE_TYPE } from '../data/defaultData';

export function InspectorPanel({ selectedNode, edges, edgeStyles, onUpdateNode, onUpdateEdgeType, onDeleteNode, readOnly }) {
  if (!selectedNode) {
    return <Text c="dimmed">Select a node to inspect and edit its details here.</Text>;
  }

  const connectedEdges = edges.filter((e) => e.from === selectedNode.id || e.to === selectedNode.id);

  return (
    <Stack gap="md" style={readOnly ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
      <TextInput
        label="Label"
        value={selectedNode.label}
        onChange={(e) => onUpdateNode('label', e.currentTarget.value)}
        readOnly={readOnly}
      />

      <div>
        <Text size="sm" fw={500} mb={4}>Score</Text>
        <Slider
          min={0}
          max={10}
          value={selectedNode.score ?? 0}
          onChange={(val) => onUpdateNode('score', val)}
          disabled={readOnly || selectedNode.score == null}
          label={(val) => val}
          marks={[{ value: 0, label: '0' }, { value: 5, label: '5' }, { value: 10, label: '10' }]}
          mb="xs"
        />
        <Checkbox
          label="Not attempted"
          checked={selectedNode.score == null}
          onChange={(e) => onUpdateNode('score', e.currentTarget.checked ? null : 0)}
          disabled={readOnly}
        />
      </div>

      <TextInput
        label="Tags"
        value={selectedNode.tags.join(', ')}
        onChange={(e) =>
          onUpdateNode('tags', e.currentTarget.value.split(',').map((t) => t.trim()).filter(Boolean))
        }
        placeholder="comma-separated"
        readOnly={readOnly}
      />

      <Textarea
        label="Notes"
        rows={2}
        value={selectedNode.notes}
        onChange={(e) => onUpdateNode('notes', e.currentTarget.value)}
        readOnly={readOnly}
      />

      <div>
        <Text size="sm" fw={500} mb={4}>Connected edges</Text>
        {connectedEdges.length === 0 ? (
          <Text size="sm" c="dimmed">No connected edges yet. Draw an edge from another node to create a prerequisite.</Text>
        ) : (
          <Stack gap="xs">
            {connectedEdges.map((edge) => (
              <Group key={edge.id} gap="sm">
                <Text size="sm">{edge.from === selectedNode.id ? '→' : '←'} {edge.id}</Text>
                <Select
                  size="xs"
                  value={edge.type || DEFAULT_EDGE_TYPE}
                  onChange={(val) => onUpdateEdgeType(edge.id, val)}
                  data={Object.keys(edgeStyles)}
                  w={130}
                  disabled={readOnly}
                />
              </Group>
            ))}
          </Stack>
        )}
      </div>

      <Button color="red" variant="light" onClick={() => onDeleteNode(selectedNode.id)} disabled={readOnly}>
        Delete node
      </Button>
    </Stack>
  );
}
