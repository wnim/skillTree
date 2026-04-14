# Copilot Instructions — Pen Spinning Skill Tree

## Project Purpose
A single-page React app for tracking personal progress on pen spinning tricks. Nodes represent tricks; edges represent prerequisites/inspiration links. Data persists to localStorage and optionally syncs to a GitHub Gist.

## Tech Stack
- **React 19** + **Vite 5** (ESM, JSX)
- **@xyflow/react 12** (ReactFlow) — canvas, nodes, edges
- **@mantine/core v9** — all UI components (dark theme)
- **@dagrejs/dagre** — auto-layout (not used directly; layout is custom staggered grid via `tidyLayout`)
- **lucide-react** — icons in ActionBar

---

## Data Model

All persistent state lives in a single `data` object:

```js
{
  nodes: [
    {
      id: string,           // e.g. "thumb_around"
      label: string,        // display name
      score: number | null, // 0–10; null = not attempted; 10 = mastered
      tags: string[],       // references keys in tag_styles
      notes: string,
      position: { x: number, y: number }, // canvas position
    }
  ],
  edges: [
    {
      id: string,
      from: string,   // source node id  ← canonical field name (NOT "source")
      to: string,     // target node id  ← canonical field name (NOT "target")
      type: string,   // key into edge_styles; default "prerequisite"
    }
  ],
  tag_styles: {
    [tagName: string]: { color: string } // hex color
  },
  edge_styles: {
    [typeName: string]: { stroke: "solid" | "dashed", color: string }
  }
}
```

**Critical naming convention:** edges store `from`/`to` in data. ReactFlow requires `source`/`target`. `toReactFlowEdges()` in `useSkillTree.js` translates between them. Never use `source`/`target` when reading/writing the data model.

---

## localStorage Keys

| Key | Content |
|-----|---------|
| `psskill_data` | Full data object (nodes + edges + styles) |
| `psskill_viewport` | ReactFlow viewport `{ x, y, zoom }` |
| `psskill_gist_config` | `{ gistId, gistUrl, filename, token }` or absent if unconfigured |
| `psskill_ui_sidebar` | boolean — sidebar panel open |
| `psskill_ui_hidemaxscore` | boolean — hide score=10 nodes |
| `psskill_ui_showgrid` | boolean — show staggered grid background |
| `psskill_ui_snapmode` | boolean — snap-to-grid on drag |

---

## Persistence Strategy

1. **localStorage** — written on every `data` state change (sync, always-on fallback).
2. **Gist** — loaded on mount if `gistConfig` exists; auto-saved with a **60-second debounce** on every data change (avoids API rate limits). `syncStatus`: `'idle' | 'loading' | 'saving' | 'error'`.
3. **Viewport** — saved via `saveViewport()` on ReactFlow `onMoveEnd`; restored on `onInit`.
4. **UI prefs** (sidebar, grid, snap, hideMaxScore) — each persisted individually via `useLocalStorage`.

---

## Hook Responsibilities

### `useSkillTree(gistConfig, hideMaxScore)` — `src/hooks/useSkillTree.js`
Single source of truth for all data and mutations. Returns the `skillTree` object used everywhere.
- Loads data from localStorage on init; fetches from Gist on mount if configured.
- Derives `flowNodes` and `flowEdges` (memoized, identity-cached via `prevFlowNodesRef`).
- Manages `editingId` (which node shows `EditableNode`) and `selectedIds` (a `Set<string>`).
- **Undo/redo**: in-memory stacks `pastRef`/`futureRef` (max 50), updated by `updateData()`.
  - `updateData(partialOrFn)` — the standard mutation path; always records undo.
  - `updateNodeById` — bypasses undo (used by `EditableNode` for live label/score updates).
  - `updateNodePosition` / `updateNodePositions` — record undo.
- Exposes: `addNode`, `deleteNode`, `updateNode`, `updateNodeById`, `updateNodePosition`, `updateNodePositions`, `addEdge`, `deleteEdge`, `updateEdgeType`, `bulkUpdateTags`, `addTagStyle`, `updateTagStyle`, `removeTagStyle`, `addEdgeStyle`, `updateEdgeStyle`, `removeEdgeStyle`, `autoLayout`, `importData`, `exportData`, `copyNode`, `pasteNode`, `undo`, `redo`.

### `useUIState({ canvasRef, skillTreeRef, setConfig })` — `src/hooks/useUIState.js`
All UI state not related to data. Uses `skillTreeRef` (a ref to the `skillTree` object) to call mutations without re-renders.
- UI prefs stored via `useLocalStorage`: `sidebarOpen`, `hideMaxScore`, `showGrid`, `snapMode`.
- Modal state: `gistModalOpen`, `shortcutsHelpOpen`, `bulkTagModalOpen`.
- **Global keyboard handler** (added on window in a single `useEffect`): Ctrl+Z/Y, Ctrl+C/V, Delete, Ctrl+Alt+T (auto-layout), Ctrl+Alt+H (toggle hideMaxScore), `?` (shortcuts help), Arrow keys (pan canvas).
- Delegates canvas ops to `canvasRef.current` (imperative Canvas API): `fitView()`, `zoomIn()`, `zoomOut()`, `getViewportCenter()`, `panBy(dx, dy)`.

### `useGistConfig()` — `src/hooks/useGistConfig.js`
- Reads/writes `psskill_gist_config` in localStorage.
- Returns `{ config, setConfig, clearConfig }`.
- `config` is `null` when not configured (triggers first-run modal).

### `useLocalStorage(key, defaultValue)` — `src/hooks/useLocalStorage.js`
- Generic hook; reads on init, writes via `useEffect` on every value change.
- Returns `[value, stableSetValue]`.

---

## Component Responsibilities & Wiring

```
App
├── useGistConfig → config/setConfig
├── useUIState    → ui.*
├── useSkillTree  → skillTree.*
│
├── GistSetupModal   (shown when config=null or ui.gistModalOpen)
├── BulkTagModal     (ui.bulkTagModalOpen)
├── KeyboardShortcutsHelp (ui.shortcutsHelpOpen)
├── Toolbar          (export, import, gist settings, panel toggle, sync status)
├── ActionBar        (add node, grid, snap, auto-layout, hide mastered, edit tags)
├── Canvas (ref)     (ReactFlow; all node/edge interaction)
└── Sidebar          (right panel; tabs: Inspector | JSON | Settings)
    ├── InspectorPanel   (read-only view of selected node + connected edges)
    ├── JsonPanel        (editable raw JSON with apply button)
    └── SettingsPanel    (tag_styles + edge_styles CRUD)
```

**Canvas** (`src/components/Canvas.jsx`, `forwardRef`):
- Exposes imperative handle: `fitView()`, `zoomIn()`, `zoomOut()`, `getViewportCenter()`, `panBy(dx, dy)`.
- **Two-phase node sync**: Effect A (structural) fires when `enhancedNodes` changes — recreates ReactFlow objects only for changed nodes. Effect B (selection-only) fires when `selectedIds` changes — flips `selected` flag without rebuilding everything.
- **Editing node swap**: when `editingId` is set, `enhancedNodes` replaces that node's type from `'skillNode'` to `'editableNode'` and injects `onUpdate`/`onClose` callbacks.
- Space bar → pan mode; Arrow keys handled by `useUIState`.
- Saves viewport on `onMoveEnd`, restores on `onInit`.
- Custom node types: `{ skillNode: SkillNode, editableNode: EditableNode }`.
- Custom edge type: `{ customBezier: CustomBezierEdge }`.

**SkillNode** (`src/components/SkillNode.jsx`, `memo`):
- Displays label + score progress bar.
- Border color = first tag's color; multi-tag = conic-gradient border ring.
- Hover glow via local `hovered` state; sets `hoveredNodeId` via `HoverSetContext` (edges subscribe).
- Score color: 0 = red → 10 = green via `scoreColor(score)` hsl interpolation.

**EditableNode** (`src/components/EditableNode.jsx`):
- Inline edit: TextInput (label) + Slider (score 0–10). `className="nodrag nopan"`.
- Auto-focuses label input on mount. Enter = commit + close; Escape = close (discard pending local state if blur didn't fire).
- Commits label on blur; commits score only on slider drag-end (`onChangeEnd`).
- Calls `onUpdate(id, field, value)` which is `updateNodeById` (no undo entry).

**CustomBezierEdge** (`src/components/CustomBezierEdge.jsx`, `memo`):
- Bezier path with arrowhead polygon. `OVERLAP=5px` tucks endpoints into nodes visually.
- Reads `hoveredNodeId` from `HoverIdContext`; glows cyan when source or target is hovered.
- Invisible wide path (`strokeWidth=interactionWidth=20`) for easy click targeting.

**HoverContext** (`src/components/HoverContext.jsx`):
- Two contexts: `HoverIdContext` (read, string|null) and `HoverSetContext` (write, stable setter).
- Intentionally split so SkillNodes only consume the stable setter and never re-render from other nodes' hover changes.

**StaggeredBackground** (`src/components/StaggeredBackground.jsx`):
- SVG `<pattern>` tile matching the tidy-layout grid (2-row height for stagger encoding).
- Reads `transform` from ReactFlow store to pan/zoom with the canvas.

---

## Utils

| File | Purpose |
|------|---------|
| `utils/layout.js` | `tidyLayout(nodes)` — snaps nodes to staggered brick-wall grid, resolves collisions. Constants: `NODE_WIDTH=180`, `NODE_HEIGHT=42`, `GRID_X=188`, `GRID_Y=82`, `STAGGER=94`. Also exports `snapToGrid`. |
| `utils/gist.js` | `fetchGistData`, `saveGistData`, `createGist`, `extractGistId` — GitHub Gist REST API (PATCH to update). Handles truncated gist content via raw URL fallback. |
| `utils/viewport.js` | `loadViewport()` / `saveViewport()` — read/write `psskill_viewport`. |
| `utils/score.js` | `scoreColor(score)` — returns `hsl(0–120, 90%, 55%)` for 0–10; `'#999'` for null. |

---

## Non-Obvious Patterns & Conventions

- **`from`/`to` vs `source`/`target`**: Data model uses `from`/`to`. ReactFlow API uses `source`/`target`. `toReactFlowEdges()` in `useSkillTree` does the translation. Do not mix them.
- **`updateData` vs `setData`**: Use `updateData(partialOrFn)` for any user-visible change — it records undo history. Use `setData` directly only when bypassing undo is intentional (e.g., `undo`/`redo` themselves, `importData`).
- **`updateNodeById` bypasses undo**: Used exclusively by `EditableNode` for live feedback. Undo after editing snaps back to pre-edit state recorded when edit mode was entered.
- **flowNode identity cache**: `prevFlowNodesRef` (Map of `id → { source, tagColorKey, wrapper }`) prevents object churn. A ReactFlow node object is only recreated when its source data ref or tag colors change.
- **Refs for stale-closure avoidance**: `selectedIdsRef`, `clipboardRef`, `dataRef` are kept in sync via `useEffect` and consumed inside `useCallback`s that have empty or minimal deps arrays.
- **`isFirstRender` in Gist auto-save**: The debounced Gist save effect skips the first render to avoid immediately overwriting Gist data with localStorage content before the Gist fetch completes.
- **`hideMaxScore`**: Nodes with `score === 10` are computed into `hiddenNodeIds` and filtered from both `flowNodes` and `flowEdges`. Edges where either endpoint is hidden are also hidden.
- **First-run gate**: `config === null` (no Gist config in localStorage) forces `GistSetupModal` open with no close button. User must connect or create a Gist to proceed.
- **Staggered grid layout**: Odd rows are offset by `STAGGER = GRID_X / 2` giving a brick-wall pattern. `tidyLayout` snaps to nearest free cell, resolving collisions outward in spiral order.

---

## File/Folder Structure

```
src/
  App.jsx               Root component; wires hooks, renders layout shell
  main.jsx              React entry: MantineProvider + ReactFlowProvider + <App>
  index.css             Global styles (minimal)
  components/
    ActionBar.jsx        Left icon toolbar (add, grid, snap, layout, hide, tags)
    BulkTagModal.jsx     Modal for add/remove tags on multi-select
    Canvas.jsx           ReactFlow canvas (forwardRef, imperative handle)
    ContextMenu.jsx      Right-click menu (pane: add node; node: edit/delete)
    CustomBezierEdge.jsx Custom edge with arrowhead + hover glow
    EditableNode.jsx     Inline edit form node (label + score slider)
    GistSetupModal.jsx   Gist connect/create modal (first-run + settings)
    HoverContext.jsx     Split read/write hover context for edge glow
    InspectorPanel.jsx   Read-only selected-node detail pane
    JsonPanel.jsx        Raw JSON viewer/editor with apply
    KeyboardShortcutsHelp.jsx  Floating shortcut cheatsheet overlay
    SettingsPanel.jsx    Tag/edge style management UI
    Sidebar.jsx          Right panel shell with 3 tabs
    SkillNode.jsx        Read-only node card (label, progress bar, tag border)
    StaggeredBackground.jsx  SVG grid background synced to RF viewport
    Toolbar.jsx          Top bar (title, export, import, gist, panel)
  data/
    defaultData.js       Default nodes/edges, constants (DATA_KEY, VIEWPORT_KEY,
                         GIST_CONFIG_KEY, DEFAULT_EDGE_TYPE), defaultData object
  hooks/
    useGistConfig.js     Gist config localStorage persistence
    useLocalStorage.js   Generic key/value localStorage hook
    useSkillTree.js      All data state, mutations, undo, Gist sync
    useUIState.js        UI preferences, modals, keyboard shortcuts
  utils/
    gist.js              GitHub Gist API (fetch, save, create, extractId)
    layout.js            Staggered grid layout (tidyLayout, snapToGrid, constants)
    score.js             scoreColor(score) — hsl color ramp
    viewport.js          loadViewport / saveViewport for psskill_viewport
```
