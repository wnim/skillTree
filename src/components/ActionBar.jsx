import { Tooltip } from '@mantine/core';
import {
  LayoutGrid,
  Magnet,
  Wand2,
  CirclePlus,
  EyeOff,
} from 'lucide-react';

const ACTIONS = [
  { key: 'addNode',       Icon: CirclePlus,  label: 'Add node',                         toggle: false },
  { key: 'showGrid',      Icon: LayoutGrid,  label: 'Show grid',                        toggle: true  },
  { key: 'snap',          Icon: Magnet,      label: 'Snap to grid',                     toggle: true  },
  { key: 'tidy',          Icon: Wand2,       label: 'Auto-layout (tidy)',               toggle: false },
  { key: 'hideMastered',  Icon: EyeOff,      label: 'Hide mastered (max score) nodes',  toggle: true  },
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

function ActionButton({ Icon, label, onClick, active = false }) {
  return (
    <Tooltip label={label} position="right" openDelay={300} withArrow>
      <button
        onClick={onClick}
        aria-label={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 6,
          border: 'none',
          cursor: 'pointer',
          background: active
            ? 'var(--mantine-color-blue-7)'
            : 'transparent',
          color: active
            ? 'var(--mantine-color-white)'
            : 'var(--mantine-color-dark-2)',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'var(--mantine-color-dark-6)';
            e.currentTarget.style.color = 'var(--mantine-color-white)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
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

export function ActionBar({ onAddNode, showGrid, onToggleShowGrid, snapMode, onToggleSnapMode, onAutoLayout, hideMaxScore, onToggleHideMaxScore }) {
  const handlers = {
    addNode:      { onClick: onAddNode,              active: false         },
    showGrid:     { onClick: onToggleShowGrid,       active: showGrid      },
    snap:         { onClick: onToggleSnapMode,       active: snapMode      },
    tidy:         { onClick: onAutoLayout,           active: false         },
    hideMastered: { onClick: onToggleHideMaxScore,   active: hideMaxScore  },
  };

  return (
    <div style={styles.bar}>
      {ACTIONS.map(({ key, Icon, label }) => (
        <ActionButton
          key={key}
          Icon={Icon}
          label={label}
          onClick={handlers[key].onClick}
          active={handlers[key].active}
        />
      ))}
    </div>
  );
}
