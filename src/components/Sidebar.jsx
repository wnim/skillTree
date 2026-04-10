import { Tabs, ScrollArea } from '@mantine/core';
import { InspectorPanel } from './InspectorPanel';
import { JsonPanel } from './JsonPanel';
import { SettingsPanel } from './SettingsPanel';

export function Sidebar({ activeTab, onTabChange, skillTree }) {
  const {
    data,
    selectedNode,
    selectedId,
    editingId,
    updateNode,
    updateEdgeType,
    deleteNode,
    addTagStyle,
    updateTagStyle,
    removeTagStyle,
    addEdgeStyle,
    updateEdgeStyle,
    removeEdgeStyle,
    importData,
  } = skillTree;

  return (
    <Tabs value={activeTab} onChange={onTabChange} variant="pills" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs.List p="sm" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)', flexShrink: 0 }}>
        <Tabs.Tab value="inspector">Inspector</Tabs.Tab>
        <Tabs.Tab value="json">JSON</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="inspector" style={{ flex: 1, minHeight: 0 }}>
        <ScrollArea style={{ height: '100%' }} p="md" scrollbars="y">
          <InspectorPanel
            selectedNode={selectedNode}
            edges={data.edges}
            edgeStyles={data.edge_styles}
            onUpdateNode={updateNode}
            onUpdateEdgeType={updateEdgeType}
            onDeleteNode={deleteNode}
            readOnly={editingId !== selectedId}
          />
        </ScrollArea>
      </Tabs.Panel>

      <Tabs.Panel value="json" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 'var(--mantine-spacing-md)' }}>
          <JsonPanel data={data} onImport={importData} />
        </div>
      </Tabs.Panel>

      <Tabs.Panel value="settings" style={{ flex: 1, minHeight: 0 }}>
        <ScrollArea style={{ height: '100%' }} p="md">
          <SettingsPanel
            tagStyles={data.tag_styles}
            edgeStyles={data.edge_styles}
            onAddTag={addTagStyle}
            onUpdateTagStyle={updateTagStyle}
            onRemoveTagStyle={removeTagStyle}
            onAddEdgeType={addEdgeStyle}
            onUpdateEdgeStyle={updateEdgeStyle}
            onRemoveEdgeStyle={removeEdgeStyle}
          />
        </ScrollArea>
      </Tabs.Panel>
    </Tabs>
  );
}
