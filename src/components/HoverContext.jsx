import { createContext, useState } from 'react';

// Edges subscribe to this to know which node is hovered.
// Splitting read/write into two contexts is intentional: nodes only consume
// the stable setter (HoverSetContext), so they never re-render from hover
// state changes that aren't their own.
export const HoverIdContext = createContext(null);

// Stable setter — value never changes so consumers never re-render from it.
export const HoverSetContext = createContext(() => {});

// Edges also glow when their source or target node is selected.
const EMPTY_SET = new Set();
export const SelectedIdsContext = createContext(EMPTY_SET);

export function HoverProvider({ selectedIds = EMPTY_SET, children }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  return (
    <HoverSetContext.Provider value={setHoveredNodeId}>
      <HoverIdContext.Provider value={hoveredNodeId}>
        <SelectedIdsContext.Provider value={selectedIds}>
          {children}
        </SelectedIdsContext.Provider>
      </HoverIdContext.Provider>
    </HoverSetContext.Provider>
  );
}
