import { Tooltip } from '@mantine/core';
import {
  LayoutGrid,
  Magnet,
  Wand2,
  CirclePlus,
  EyeOff,
  Tag,
} from 'lucide-react';

const ACTIONS = [
  { key: 'addNode',       Icon: CirclePlus,  label: 'Add node',                         toggle: false },
  { key: 'showGrid',      Icon: LayoutGrid,  label: 'Show grid',                        toggle: true  },
  { key: 'snap',          Icon: Magnet,      label: 'Snap to grid',                     toggle: true  },
  { key: 'tidy',          Icon: Wand2,       label: 'Auto-layout (tidy)',               toggle: false },
  { key: 'hideMastered',  Icon: EyeOff,      label: 'Hide mastered (max score) nodes',  toggle: true  },
  { key: 'sep1',          divider: true                                                              },
  { key: 'editTags',      Icon: Tag,         label: 'Edit tags for selected nodes',     toggle: false },
];

const styles = {
  bar: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 6px',
    background: 'var(--mantine-color-dark-8)',
    borderRight: '1px solid var(--mantine-color-dark-5)',
    zIndex: 10,
    userSelect: 'none',
  },
  divider: {
    width: 24,
    height: 1,
    background: 'var(--mantine-color-dark-5)',
    margin: '2px 0',
  },
};

function ActionButton({ Icon, label, onClick, active = false, disabled = false }) {
  return (
    <Tooltip label={label} position="right" openDelay={300} withArrow>
      <button
        onClick={disabled ? undefined : onClick}
        aria-label={label}
        aria-disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 6,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.35 : 1,
          background: active
            ? 'var(--mantine-color-blue-7)'
            : 'transparent',
          color: active
            ? 'var(--mantine-color-white)'
            : 'var(--mantine-color-dark-2)',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!active && !disabled) {
            e.currentTarget.style.background = 'var(--mantine-color-dark-6)';
            e.currentTarget.style.color = 'var(--mantine-color-white)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active && !disabled) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--mantine-color-dark-2)';
          }
        }}
      >
        <Icon size={18} strokeWidth={1.75} />
      </button>
    </Tooltip>
  );
}

export function ActionBar({ onAddNode, showGrid, onToggleShowGrid, snapMode, onToggleSnapMode, onAutoLayout, hideMaxScore, onToggleHideMaxScore, multiSelectCount, onEditTags }) {
  const handlers = {
    addNode:      { onClick: onAddNode,              active: false,                        disabled: false                  },
    showGrid:     { onClick: onToggleShowGrid,       active: showGrid,                     disabled: false                  },
    snap:         { onClick: onToggleSnapMode,       active: snapMode,                     disabled: false                  },
    tidy:         { onClick: onAutoLayout,           active: false,                        disabled: false                  },
    hideMastered: { onClick: onToggleHideMaxScore,   active: hideMaxScore,                 disabled: false                  },
    editTags:     { onClick: onEditTags,             active: false,                        disabled: multiSelectCount < 1   },
  };

  return (
    <div style={styles.bar}>
      {ACTIONS.map(({ key, Icon, label, divider }) => {
        if (divider) return <div key={key} style={styles.divider} />;
        return (
          <ActionButton
            key={key}
            Icon={Icon}
            label={label}
            onClick={handlers[key].onClick}
            active={handlers[key].active}
            disabled={handlers[key].disabled}
          />
        );
      })}
    </div>
  );
}
