import { useContext } from 'react';
import { getBezierPath } from '@xyflow/react';
import { HoverIdContext } from './HoverContext';

const ARROW_H = 10;
const ARROW_W = 7;
// Overlap the node border slightly so the line looks visually connected
// rather than just grazing the edge of the box.
const OVERLAP = 5;

export function CustomBezierEdge({
  id,
  source, target,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  style = {},
  interactionWidth = 20,
}) {
  const hoveredNodeId = useContext(HoverIdContext);
  const hovered = source === hoveredNodeId || target === hoveredNodeId;
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY: sourceY - OVERLAP,          // start slightly inside source node (Y up = into node)
    sourcePosition,
    targetX,
    targetY: targetY + OVERLAP - ARROW_H, // end at arrow base (pushed into target node)
    targetPosition,
  });

  const color = style.stroke ?? '#888';

  // Arrow tip pushed slightly into target node so the polygon covers the border gap
  const tipY = targetY + OVERLAP;
  const arrowPoints = [
    `${targetX},${tipY}`,
    `${targetX - ARROW_W},${tipY - ARROW_H}`,
    `${targetX + ARROW_W},${tipY - ARROW_H}`,
  ].join(' ');

  return (
    <>
      {/* Invisible wide path for click/hover interaction */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={interactionWidth}
        className="react-flow__edge-interaction"
      />
      {/* Glow halo on node hover */}
      {hovered && (
        <path
          d={edgePath}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeOpacity={0.22}
          style={{ filter: 'blur(3px)' }}
        />
      )}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        style={style}
      />
      <polygon points={arrowPoints} fill={color} />
    </>
  );
}
