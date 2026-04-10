import { Menu } from '@mantine/core';

export function ContextMenu({ contextMenu, onAddNode, onEdit, onDelete, onClose }) {
  if (!contextMenu) return null;

  return (
    <Menu opened onClose={onClose} position="bottom-start" offset={0}>
      <Menu.Target>
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, width: 0, height: 0 }} />
      </Menu.Target>
      <Menu.Dropdown>
        {contextMenu.type === 'pane' ? (
          <Menu.Item onClick={onAddNode}>Add Node</Menu.Item>
        ) : (
          <>
            <Menu.Item onClick={onEdit}>Edit</Menu.Item>
            <Menu.Item color="red" onClick={onDelete}>Delete</Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
