import { memo, useContext, useState } from 'react';
import { Handle } from '@xyflow/react';
import { proficiencyColor } from '../utils/score';
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
  const { proficiency, label, isEditing, tagColor, tagColors } = data;
  const setHoveredNodeId = useContext(HoverSetContext);
  const [hovered, setHovered] = useState(false);
  const percent = proficiency == null ? 0 : (proficiency / 10) * 100;

  const multiTag = Array.isArray(tagColors) && tagColors.length >= 2;
  const gradientBorder = multiTag ? buildGradientBorder(tagColors) : null;

  const borderColor = isEditing
    ? 'var(--mantine-color-blue-5)'
    : selected
    ? 'var(--mantine-color-blue-8)'
    : tagColor || 'var(--mantine-color-dark-4)';

  const glowShadow = '0 0 0 2px #00d4ff, 0 0 18px 6px rgba(0, 212, 255, 0.55), 0 0 40px 12px rgba(0, 212, 255, 0.25)';

  const boxShadow = isEditing
    ? '0 0 0 3px var(--mantine-color-blue-5), 0 0 18px 2px rgba(91, 156, 246, 0.35)'
    : selected || hovered
    ? glowShadow
    : undefined;

  const bg = selected || isEditing
    ? 'var(--mantine-color-dark-7)'
    : 'var(--mantine-color-dark-8)';

  return (
    <div style={{ position: 'relative', display: 'inline-block', borderRadius: 10, boxShadow: gradientBorder ? boxShadow : undefined }}>
      {gradientBorder && (
        <div style={{ position: 'absolute', inset: -2, background: gradientBorder, borderRadius: 10 }} />
      )}
      <div
        className="skill-node"
        onMouseEnter={() => { setHovered(true); setHoveredNodeId(id); }}
        onMouseLeave={() => { setHovered(false); setHoveredNodeId(null); }}
        style={{
          position: 'relative',
          zIndex: gradientBorder ? 1 : undefined,
          border: gradientBorder ? 'none' : `2px solid ${borderColor}`,
          boxShadow: gradientBorder ? undefined : boxShadow,
          background: bg,
        }}
      >
        <Handle type="target" position="top" className="handle" />
        <div className="skill-node__label">{label}</div>
        <div className="skill-node__track">
          <div
            className="skill-node__bar"
            style={{
              width: `${percent}%`,
              background: proficiency == null ? 'var(--mantine-color-dark-5)' : proficiencyColor(proficiency),
            }}
          />
        </div>
        <Handle type="source" position="bottom" className="handle" />
      </div>
    </div>
  );
});
