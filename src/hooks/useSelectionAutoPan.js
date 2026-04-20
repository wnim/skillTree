import { useEffect, useRef, useCallback } from 'react';
import { useStoreApi } from '@xyflow/react';
import { calcAutoPan } from '@xyflow/system';

const EDGE_DISTANCE = 40;

/**
 * Auto-pans the viewport when the pointer approaches container edges during selection drag.
 * Requires the @xyflow/system patch that removes the `!userSelectionActive` guard in XYPanZoom,
 * which otherwise disconnects d3-zoom handlers and makes `panBy` a no-op during selection.
 *
 * Must be called inside a ReactFlowProvider (uses useStoreApi).
 *
 * @param {React.RefObject<HTMLDivElement>} containerRef - ref to the ReactFlow wrapper div
 */
export function useSelectionAutoPan(containerRef) {
  const store = useStoreApi();
  const rafId = useRef(0);
  const pointerPos = useRef({ x: 0, y: 0 });
  const active = useRef(false);

  const stopAutoPan = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = 0;
    active.current = false;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let containerBounds = null;

    function tick() {
      if (!active.current) return;
      if (!containerBounds) {
        rafId.current = requestAnimationFrame(tick);
        return;
      }

      const { panBy, autoPanSpeed, userSelectionRect } = store.getState();
      const [dx, dy] = calcAutoPan(pointerPos.current, containerBounds, autoPanSpeed, EDGE_DISTANCE);

      if ((dx !== 0 || dy !== 0) && userSelectionRect) {
        panBy({ x: dx, y: dy });

        // Anchor the selection origin to the same flow-space point.
        // panBy shifts the viewport by (dx, dy) in screen pixels, so the flow
        // point that was at (startX, startY) is now at (startX + dx, startY + dy).
        const startX = userSelectionRect.startX + dx;
        const startY = userSelectionRect.startY + dy;
        const mouseX = pointerPos.current.x;
        const mouseY = pointerPos.current.y;

        store.setState({
          userSelectionRect: {
            startX,
            startY,
            x: Math.min(mouseX, startX),
            y: Math.min(mouseY, startY),
            width: Math.abs(mouseX - startX),
            height: Math.abs(mouseY - startY),
          },
        });
      }

      rafId.current = requestAnimationFrame(tick);
    }

    function onPointerDown(e) {
      // Only respond to primary button inside the pane (not on nodes/controls)
      if (e.button !== 0) return;
      containerBounds = container.getBoundingClientRect();
      pointerPos.current = { x: e.clientX - containerBounds.left, y: e.clientY - containerBounds.top };
    }

    function onPointerMove(e) {
      if (!(e.buttons & 1)) {
        // Primary button released
        stopAutoPan();
        return;
      }

      if (!containerBounds) {
        containerBounds = container.getBoundingClientRect();
      }

      pointerPos.current = { x: e.clientX - containerBounds.left, y: e.clientY - containerBounds.top };

      // Start the auto-pan loop once a selection drag is underway
      const { userSelectionActive } = store.getState();
      if (userSelectionActive && !active.current) {
        active.current = true;
        rafId.current = requestAnimationFrame(tick);
      }
    }

    function onPointerUp() {
      stopAutoPan();
      containerBounds = null;
    }

    // Capture phase so we see events before ReactFlow's internal handlers
    container.addEventListener('pointerdown', onPointerDown, true);
    container.addEventListener('pointermove', onPointerMove, true);
    container.addEventListener('pointerup', onPointerUp, true);
    container.addEventListener('pointercancel', onPointerUp, true);

    return () => {
      stopAutoPan();
      container.removeEventListener('pointerdown', onPointerDown, true);
      container.removeEventListener('pointermove', onPointerMove, true);
      container.removeEventListener('pointerup', onPointerUp, true);
      container.removeEventListener('pointercancel', onPointerUp, true);
    };
  }, [containerRef, store, stopAutoPan]);
}

/**
 * Renderless component that enables auto-pan during selection drag.
 * Must be placed inside a ReactFlowProvider.
 */
export function SelectionAutoPan({ containerRef }) {
  useSelectionAutoPan(containerRef);
  return null;
}
