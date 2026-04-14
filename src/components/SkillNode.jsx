import { memo, useContext, useState } from 'react';
import { Handle } from '@xyflow/react';
import { Paper, Text, Progress } from '@mantine/core';
import { scoreColor } from '../utils/score';
import { HoverSetContext } from './HoverContext';


function buildGradientBorder(tagColors) {
  const n = tagColors.length;
  const segmentAngle = 360 / n;
  const stops = tagColors.map((color, i) =>
    `${color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
  );
  return `conic-gradient(${stops.join(', ')})`;
}

export const SkillNode = memo(function SkillNode({ id, data, selected }) {
  const { score, label, isEditing, tagColor, tagColors } = data;
  const setHoveredNodeId = useContext(HoverSetContext);
  const [hovered, setHovered] = useState(false);
  const percent = score == null ? 0 : (score / 10) * 100;

  const multiTag = Array.isArray(tagColors) && tagColors.length >= 2;
  const gradientBorder = multiTag ? buildGradientBorder(tagColors) : null;

  const borderColor = isEditing
    ? 'var(--mantine-color-blue-5)'
    : selected
    ? 'var(--mantine-color-blue-8)'
    : tagColor || 'var(--mantine-color-dark-4)';

  const boxShadow = isEditing
    ? '0 0 0 3px var(--mantine-color-blue-5), 0 0 18px 2px rgba(91, 156, 246, 0.35)'
    : selected
    ? '0 0 0 2px var(--mantine-color-blue-8)'
    : hovered
    ? '0 0 0 2px #00d4ff, 0 0 18px 6px rgba(0, 212, 255, 0.55), 0 0 40px 12px rgba(0, 212, 255, 0.25)'
    : undefined;

  return (
    <div style={{ position: 'relative', display: 'inline-block', borderRadius: 10, boxShadow: gradientBorder ? boxShadow : undefined }}>
      {gradientBorder && (
        <div style={{ position: 'absolute', inset: -2, background: gradientBorder, borderRadius: 10 }} />
      )}
      <Paper
        p={6}
        onMouseEnter={() => { setHovered(true); setHoveredNodeId(id); }}
        onMouseLeave={() => { setHovered(false); setHoveredNodeId(null); }}
        style={{
          position: 'relative',
          zIndex: gradientBorder ? 1 : undefined,
          width: 180,
          border: gradientBorder ? 'none' : `2px solid ${borderColor}`,
          boxShadow: gradientBorder ? undefined : boxShadow,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
        bg={selected || isEditing ? 'dark.7' : 'dark.8'}
        radius="md"
      >
        <Handle type="target" position="top" className="handle" />
        <Text size="xs" fw={600} c="gray.1" lh={1.2}>{label}</Text>
        <Progress
          value={percent}
          size={4}
          radius="xl"
          color={score == null ? 'dark.5' : scoreColor(score)}
        />
        <Handle type="source" position="bottom" className="handle" />
      </Paper>
    </div>
  );
});
