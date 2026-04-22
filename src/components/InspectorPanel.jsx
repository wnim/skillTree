import { useMemo } from 'react';
import { Stack, Text, Group, Badge } from '@mantine/core';
import { DEFAULT_EDGE_TYPE } from '../data/defaultData';

export function InspectorPanel({ selectedNode, edges }) {
  const connectedEdges = useMemo(
    () => edges.filter((e) => e.from === selectedNode?.id || e.to === selectedNode?.id),
    [edges, selectedNode?.id],
  );

  if (!selectedNode) {
    return <Text c="dimmed">Select a node to inspect its details.</Text>;
  }

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={2}>Label</Text>
        <Text>{selectedNode.label}</Text>
      </div>

      <div>
        <Text size="sm" fw={500} mb={2}>Proficiency</Text>
        <Text>{selectedNode.proficiency ?? '—'}</Text>
      </div>

      <div>
        <Text size="sm" fw={500} mb={2}>Tags</Text>
        {selectedNode.tags.length === 0
          ? <Text c="dimmed" size="sm">No tags</Text>
          : <Group gap="xs">{selectedNode.tags.map((t) => <Badge key={t} variant="light">{t}</Badge>)}</Group>
        }
      </div>

      <div>
        <Text size="sm" fw={500} mb={4}>Connected edges</Text>
        {connectedEdges.length === 0 ? (
          <Text size="sm" c="dimmed">No connected edges yet. Draw an edge from another node to create a prerequisite.</Text>
        ) : (
          <Stack gap="xs">
            {connectedEdges.map((edge) => (
              <Group key={edge.id} gap="sm">
                <Text size="sm">{edge.from === selectedNode.id ? '→' : '←'} {edge.id}</Text>
                <Text size="sm" c="dimmed">{edge.type || DEFAULT_EDGE_TYPE}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </div>
    </Stack>
  );
}
