import { Group, Button, Title } from '@mantine/core';

export function Toolbar({ onAddNode, onFitView, onAutoLayout, onExport, onImport }) {
  return (
    <Group justify="space-between" p="md" bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
      <Title order={4}>Pen Spinning Skill Tree</Title>
      <Group gap="sm">
        <Button onClick={onAddNode}>Add Node</Button>
        <Button variant="default" onClick={onFitView}>Fit view</Button>
        <Button variant="default" onClick={onAutoLayout}>Auto-layout</Button>
        <Button variant="default" onClick={onExport}>Export JSON</Button>
        <Button variant="default" onClick={onImport}>Import JSON</Button>
      </Group>
    </Group>
  );
}
