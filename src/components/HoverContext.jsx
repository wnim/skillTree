import { createContext, useState } from 'react';

// Edges subscribe to this to know which node is hovered.
// Splitting read/write into two contexts is intentional: nodes only consume
// the stable setter (HoverSetContext), so they never re-render from hover
// state changes that aren't their own.
export const HoverIdContext = createContext(null);

// Stable setter — value never changes so consumers never re-render from it.
export const HoverSetContext = createContext(() => {});

export function HoverProvider({ children }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  return (
    <HoverSetContext.Provider value={setHoveredNodeId}>
      <HoverIdContext.Provider value={hoveredNodeId}>
        {children}
      </HoverIdContext.Provider>
    </HoverSetContext.Provider>
  );
}
