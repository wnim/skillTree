import { useStore } from '@xyflow/react';
import { GRID_X, GRID_Y, STAGGER, NODE_WIDTH, NODE_HEIGHT } from '../utils/layout';

/**
 * A custom React Flow background that draws faint grid lines matching the
 * staggered brick-wall layout grid (GRID_X × GRID_Y, odd rows offset by STAGGER).
 *
 * The SVG pattern tile covers two rows (height = GRID_Y * 2) so the stagger
 * is encoded in a single repeating unit:
 *   - Even row: vertical border at x = 0
 *   - Odd row:  vertical border at x = STAGGER
 *   - Horizontal borders at y = 0 and y = GRID_Y
 */
export function StaggeredBackground({ color = '#383838' }) {
  const [tx, ty, zoom] = useStore((s) => s.transform);

  const gx = GRID_X * zoom;
  const gy = GRID_Y * zoom;
  const gh = gy * 2;               // pattern height: two rows
  const stagger = STAGGER * zoom;

  // Offset so lines are centred around each node rather than at its top-left
  const padX = ((GRID_X - NODE_WIDTH) / 2) * zoom;
  const padY = ((GRID_Y - NODE_HEIGHT) / 2) * zoom;

  // Align pattern to the viewport so it moves with pan/zoom
  const px = (((tx - padX) % gx) + gx) % gx;
  const py = (((ty - padY) % gh) + gh) % gh;

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        <pattern
          id="staggered-grid"
          x={px}
          y={py}
          width={gx}
          height={gh}
          patternUnits="userSpaceOnUse"
        >
          {/* Horizontal borders (top of each row) */}
          <line x1={0} y1={0}  x2={gx} y2={0}  stroke={color} strokeWidth={0.5} />
          <line x1={0} y1={gy} x2={gx} y2={gy} stroke={color} strokeWidth={0.5} />

          {/* Even-row left border */}
          <line x1={0}       y1={0}  x2={0}       y2={gy} stroke={color} strokeWidth={0.5} />
          {/* Odd-row left border (shifted by STAGGER = GRID_X / 2) */}
          <line x1={stagger} y1={gy} x2={stagger} y2={gh} stroke={color} strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#staggered-grid)" />
    </svg>
  );
}
