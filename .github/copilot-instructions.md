# Copilot Instructions — Pen Spinning Skill Tree

## Project Purpose
A single-page React app for tracking personal progress on pen spinning tricks. Nodes represent tricks; edges represent prerequisites/inspiration links. Data persists to localStorage and optionally syncs to a GitHub Gist.

## Tech Stack
- **React 19** + **Vite 5** (ESM, JSX)
- **@xyflow/react 12** (ReactFlow) — canvas, nodes, edges
- **@mantine/core v9** — all UI components (dark theme)
- **@dagrejs/dagre** — auto-layout (not used directly; layout is custom staggered grid via `tidyLayout`)
- **lucide-react** — icons in ActionBar and Toolbar
- **vitest** + **@testing-library/react** — unit tests

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

**Critical naming convention:** edges store `from`/`to` in data. ReactFlow requires `source`/`target`. The `flowEdges` memo in `useSkillTree.js` translates between them. Never use `source`/`target` when reading/writing the data model.

---


## Authentication (Device Flow OAuth)

**Gist sync uses GitHub Device Flow OAuth, NOT PATs.**

- On first run, user authenticates via Device Flow (browser + code).
- The app stores the resulting access token in localStorage (`psskill_gist_config`).
- All Gist API calls use this token as a Bearer token.
- The Netlify function `/netlify/functions/github-auth.js` proxies Device Flow endpoints for CORS.

**If you see a 401 error:**
- The token is missing, expired, or invalid (user revoked access, or device flow not completed).
- User must re-authenticate via the Gist setup modal.

**localStorage Keys**

| Key | Content |
|-----|---------|
| `psskill_data` | Full data object (nodes + edges + styles) |
| `psskill_viewport` | ReactFlow viewport `{ x, y, zoom }` |
| `psskill_gist_config` | `{ gistId, gistUrl, filename, token }` (token is Device Flow OAuth, not PAT) |
| `psskill_save_pending` | Transient flag — set before keepalive save, cleared on next mount |
| `psskill_ui_sidebar` | boolean — sidebar panel open |
| `psskill_ui_hidemaxscore` | boolean — hide score=10 nodes |
| `psskill_ui_showgrid` | boolean — show staggered grid background |
| `psskill_ui_snapmode` | boolean — snap-to-grid on drag |
| `psskill_ui_taglegend` | boolean — show tag legend overlay |

---

## Persistence Strategy

1. **localStorage** — written on every `data` state change (sync, always-on fallback).
2. **Gist** — loaded on mount if `gistConfig` exists; auto-saved with a **60-second debounce** on every data change (avoids API rate limits). `syncStatus`: `'idle' | 'loading' | 'saving' | 'error'`.
3. **Keepalive save** — on `visibilitychange` (hidden) and `beforeunload`, any pending debounced save is flushed immediately via `fetch({ keepalive: true })`. A `psskill_save_pending` flag is set in localStorage so the next mount knows a keepalive PATCH is in-flight and skips the initial Gist fetch (avoids reading stale data).
4. **Manual save** — `saveNow()` flushes the pending save immediately on user request (toolbar save button).
5. **Viewport** — saved via `saveViewport()` on ReactFlow `onMoveEnd`; restored on `onInit`.
6. **UI prefs** (sidebar, grid, snap, hideMaxScore, tagLegend) — each persisted individually via `useLocalStorage`.

---

## Hook Responsibilities

### `useSkillTree(gistConfig, hideMaxScore)` — `src/hooks/useSkillTree.js`
Single source of truth for all data and mutations. Returns the `skillTree` object used everywhere.
- Loads data from localStorage on init; fetches from Gist on mount if configured.
- Derives `flowNodes` and `flowEdges` (memoized, identity-cached via `prevFlowNodesRef` / `prevFlowEdgesRef`).
- Manages `editingId` (which node shows `EditableNode`) and `selectedIds` (a `Set<string>`).
- **Undo/redo**: in-memory stacks `pastRef`/`futureRef` (max 50), updated by `updateData()`.
  - `updateData(partialOrFn)` — the standard mutation path; always records undo.
  - `updateNodeById` — bypasses undo (used by `EditableNode` for live label/score updates).
  - `updateNodePosition` / `updateNodePositions` — record undo.
- **Copy/paste**: clipboard stores `{ nodes: [], edges: [] }` — supports multi-node copy with internal edges preserved.
- Exposes: `addNode`, `deleteNode`, `updateNode`, `updateNodeById`, `updateNodePosition`, `updateNodePositions`, `addEdge`, `deleteEdge`, `updateEdgeType`, `bulkUpdateTags`, `addTagStyle`, `updateTagStyle`, `removeTagStyle`, `addEdgeStyle`, `updateEdgeStyle`, `removeEdgeStyle`, `autoLayout`, `importData`, `exportData`, `saveNow`, `pendingSave`, `copyNode`, `pasteNode`, `undo`, `redo`.

### `useUIState({ canvasRef, skillTreeRef })` — `src/hooks/useUIState.js`
All UI state not related to data. Uses `skillTreeRef` (a ref to the `skillTree` object) to call mutations without re-renders.
- UI prefs stored via `useLocalStorage`: `sidebarOpen`, `hideMaxScore`, `showGrid`, `snapMode`, `showTagLegend`.
- Modal state: `gistModalOpen`, `shortcutsHelpOpen`, `bulkTagModalOpen`, `treeManagerOpen`, `statisticsOpen`.
- **Global keyboard handler** (added on window in a single `useEffect`): Ctrl+Z/Y, Ctrl+C/V, Delete/Backspace, Ctrl+Alt+T (auto-layout), Ctrl+Alt+H (toggle hideMaxScore), `?` (shortcuts help), Arrow keys (pan canvas, Shift = fast pan).
- Delegates canvas ops to `canvasRef.current` (imperative Canvas API): `fitView()`, `zoomIn()`, `zoomOut()`, `getViewportCenter()`, `panBy(dx, dy)`.

### `useGistConfig()` — `src/hooks/useGistConfig.js`
- Reads/writes `psskill_gist_config` in localStorage.
- Returns `{ config, setConfig, clearConfig }`.
- `config` is `null` when not configured (triggers first-run modal).

### `useLocalStorage(key, defaultValue)` — `src/hooks/useLocalStorage.js`
- Generic hook; reads on init, writes via `useEffect` on every value change.
- Returns `[value, stableSetValue]`.

### `useSelectionAutoPan(containerRef)` — `src/hooks/useSelectionAutoPan.js`
- Auto-pans the viewport when the pointer approaches container edges during rectangle-selection drag.
- Uses `@xyflow/system`'s `calcAutoPan`. Requires the `@xyflow+system` patch (in `patches/`) that removes the `!userSelectionActive` guard so `panBy` works during selection.
- Exported as `SelectionAutoPan` component (renders nothing, used inside Canvas).

---

## Component Responsibilities & Wiring

```
App
├── useGistConfig → config/setConfig/clearConfig
├── useUIState    → ui.*
├── useSkillTree  → skillTree.*
│
├── GistSetupModal      (Device Flow auth; resolves to config or hands off to TreeManager)
├── TreeManagerModal    (switch/create/delete trees, import/export, connect/disconnect GitHub)
├── BulkTagModal        (ui.bulkTagModalOpen)
├── KeyboardShortcutsHelp (ui.shortcutsHelpOpen)
├── Toolbar             (save button, tag legend, statistics, shortcuts help, tree manager, panel toggle, sync status)
├── ActionBar           (add node, grid, snap, auto-layout, hide mastered, edit tags)
├── Canvas (ref)        (ReactFlow; all node/edge interaction)
│   ├── SelectionAutoPan (auto-pan during rectangle selection)
│   ├── MiniMap          (collapsible, click-to-navigate)
│   └── Controls         (ReactFlow zoom controls)
├── TagLegend           (floating tag color legend overlay)
├── StatisticsPanel     (floating stats overlay: counts, graph metrics, PIV ranking)
└── Sidebar             (right panel; tabs: Inspector | JSON | Settings)
    ├── InspectorPanel   (read-only view of selected node + connected edges)
    ├── JsonPanel        (editable raw JSON with apply button)
    └── SettingsPanel    (tag_styles + edge_styles CRUD)
```

**Canvas** (`src/components/Canvas.jsx`, `forwardRef`):
- Exposes imperative handle: `fitView()`, `zoomIn()`, `zoomOut()`, `getViewportCenter()`, `panBy(dx, dy)`, `focusNode(nodeId)`.
- **Two-phase node sync**: Effect A (structural) fires when `enhancedNodes` changes — recreates ReactFlow objects only for changed nodes. Effect B (selection-only) fires when `selectedIds` changes — flips `selected` flag without rebuilding everything.
- **Editing node swap**: when `editingId` is set, `enhancedNodes` replaces that node's type from `'skillNode'` to `'editableNode'` and injects `onUpdate`/`onClose` callbacks.
- **Double-click to add**: double-clicking the pane adds a node at the click position.
- Space bar → pan mode; Arrow keys handled by `useUIState`.
- Shift+scroll → accelerated panning (3× multiplier, intercepted in capture phase).
- **Additive multi-select**: Ctrl/Shift + rectangle drag unions with prior selection; `priorSelectionRef` snapshot prevents deselection flicker.
- Saves viewport on `onMoveEnd`, restores on `onInit`.
- Custom node types: `{ skillNode: SkillNode, editableNode: EditableNode }`.
- Custom edge type: `{ customBezier: CustomBezierEdge }`.
- **MiniMap**: collapsible with toggle buttons; click-to-navigate via SVG coordinate transform.
- **Edge popup**: clicking/right-clicking an edge shows a small `×` button to delete it; Delete/Backspace also works while an edge is selected.

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
- Also glows when `data.isEndpointSelected` is true (selected node's edges highlight).
- Invisible wide path (`strokeWidth=interactionWidth=20`) for easy click targeting.

**HoverContext** (`src/components/HoverContext.jsx`):
- Two contexts: `HoverIdContext` (read, string|null) and `HoverSetContext` (write, stable setter).
- Intentionally split so SkillNodes only consume the stable setter and never re-render from other nodes' hover changes.

**StaggeredBackground** (`src/components/StaggeredBackground.jsx`):
- SVG `<pattern>` tile matching the tidy-layout grid (2-row height for stagger encoding).
- Reads `transform` from ReactFlow store to pan/zoom with the canvas.

**TagLegend** (`src/components/TagLegend.jsx`):
- Floating overlay showing tag name + color swatch for all defined tags.
- Animated show/hide via max-width + opacity transition; toggled from Toolbar.

**StatisticsPanel** (`src/components/StatisticsPanel.jsx`):
- Floating overlay with graph stats: node/edge count, graph depth, connected components, mastered/in-progress/not-attempted counts, average score, completion %, most connected hub node, tags used count.
- Score distribution bar (bucketed color progress bar).
- **Practice Investment Value (PIV)** ranking: surfaces partially-learned nodes that unlock the most downstream potential. Clickable to focus+select the node on canvas.

**TreeManagerModal** (`src/components/TreeManagerModal.jsx`):
- Unified modal for tree management. In guest mode: shows local tree info, import/export, connect-to-GitHub button. In authed mode: lists all skill tree gists, switch/create/delete trees, import/export, disconnect from GitHub.

**GistSetupModal** (`src/components/GistSetupModal.jsx`):
- Device Flow auth modal. After auth resolves:
  - If guest has local data → prompts to save or discard, then creates/selects gist.
  - 0 existing trees → prompts for name, creates new gist.
  - 1 existing tree → auto-selects it, calls `onConfigure`.
  - 2+ existing trees → calls `onAuthOnly(token)` so TreeManagerModal can open for picking.

---

## Utils

| File | Purpose |
|------|---------|
| `utils/layout.js` | `tidyLayout(nodes)` — snaps nodes to staggered brick-wall grid, resolves collisions. Constants: `NODE_WIDTH=180`, `NODE_HEIGHT=42`, `GRID_X=188`, `GRID_Y=82`, `STAGGER=94`. Also exports `snapToGrid`. |
| `utils/gist.js` | `fetchGistData`, `saveGistData`, `saveGistDataKeepalive`, `createGist`, `deleteGistById`, `extractGistId` — GitHub Gist REST API. Handles truncated gist content via raw URL fallback. Also: `requestDeviceCode`, `pollForToken`, `findSkillTreeGists` for Device Flow OAuth and gist discovery. |
| `utils/viewport.js` | `loadViewport()` / `saveViewport()` — read/write `psskill_viewport`. |
| `utils/score.js` | `scoreColor(score)` — returns `hsl(0–120, 90%, 55%)` for 0–10; `'#999'` for null. |
| `utils/statistics.js` | `computeBasicStats(nodes)` — mastered/inProgress/notAttempted counts. `computeInvestmentValue(nodes, edges)` — PIV ranking of partially-learned nodes by downstream unlock potential. |

---

## Non-Obvious Patterns & Conventions

- **`from`/`to` vs `source`/`target`**: Data model uses `from`/`to`. ReactFlow API uses `source`/`target`. The `flowEdges` memo in `useSkillTree` does the translation. Do not mix them.
- **`updateData` vs `setData`**: Use `updateData(partialOrFn)` for any user-visible change — it records undo history. Use `setData` directly only when bypassing undo is intentional (e.g., `undo`/`redo` themselves, `importData`).
- **`updateNodeById` bypasses undo**: Used exclusively by `EditableNode` for live feedback. Undo after editing snaps back to pre-edit state recorded when edit mode was entered.
- **flowNode identity cache**: `prevFlowNodesRef` (Map of `id → { source, tagColorKey, wrapper }`) prevents object churn. A ReactFlow node object is only recreated when its source data ref or tag colors change. Same pattern for `prevFlowEdgesRef`.
- **Refs for stale-closure avoidance**: `selectedIdsRef`, `clipboardRef`, `dataRef` are kept in sync and consumed inside `useCallback`s that have empty or minimal deps arrays. `dataRef` is assigned during render (not in useEffect) so it's always current.
- **Keepalive save + SAVE_PENDING_KEY**: On `visibilitychange`/`beforeunload`, pending debounced saves are flushed via `fetch({ keepalive: true })` and a `psskill_save_pending` flag is written to localStorage. On next mount, if this flag is set, the Gist fetch is skipped (trusts localStorage + the in-flight keepalive). This avoids reading stale Gist data that hasn't been updated yet.
- **`hideMaxScore`**: Nodes with `score === 10` are computed into `hiddenNodeIds` and filtered from both `flowNodes` and `flowEdges`. Edges where either endpoint is hidden are also hidden.
- **First-run gate**: `config === null` (no Gist config in localStorage) puts the app in **guest mode** — localStorage-only, with a warning badge in the Toolbar. User can connect to GitHub at any time via the TreeManagerModal → GistSetupModal flow.
- **Staggered grid layout**: Odd rows are offset by `STAGGER = GRID_X / 2` giving a brick-wall pattern. `tidyLayout` snaps to nearest free cell, resolving collisions outward in spiral order.
- **Additive multi-select**: Modifier keys (Ctrl/Shift) during rectangle selection are tracked via pointer events (capture phase), not keydown/keyup, to avoid missed keyup issues. `priorSelectionRef` captures the selection snapshot at drag start; `handleNodesChange` filters out `select:false` changes for prior-selected nodes during the drag.
- **@xyflow/system patch**: `patches/@xyflow+system+0.0.76.patch` removes the `!userSelectionActive` guard in XYPanZoom so `panBy` works during selection drag, enabling `useSelectionAutoPan`.

---

## File/Folder Structure

```
netlify/
  functions/
    github-auth.js          CORS proxy for GitHub Device Flow (device code + token exchange)
patches/
  @xyflow+system+0.0.76.patch  Patch to allow panBy during selection (for auto-pan)
src/
  App.jsx                   Root component; wires hooks, renders layout shell
  main.jsx                  React entry: MantineProvider + ReactFlowProvider + <App>
  index.css                 Global styles (node cards, minimap, animations)
  test-setup.js             Vitest setup (jsdom, testing-library matchers)
  components/
    ActionBar.jsx            Left icon toolbar (add, grid, snap, layout, hide, tags)
    BulkTagModal.jsx         Modal for add/remove tags on multi-select
    Canvas.jsx               ReactFlow canvas (forwardRef, imperative handle, minimap)
    ContextMenu.jsx          Right-click menu (pane: add node; node: edit/delete)
    CustomBezierEdge.jsx     Custom edge with arrowhead + hover/selection glow
    EditableNode.jsx         Inline edit form node (label + score slider)
    GistSetupModal.jsx       Device Flow auth + gist resolution modal
    HoverContext.jsx         Split read/write hover context for edge glow
    InspectorPanel.jsx       Read-only selected-node detail pane
    JsonPanel.jsx            Raw JSON viewer/editor with apply
    KeyboardShortcutsHelp.jsx  Floating shortcut cheatsheet overlay
    SettingsPanel.jsx        Tag/edge style management UI
    Sidebar.jsx              Right panel shell with 3 tabs
    SkillNode.jsx            Read-only node card (label, progress bar, tag border)
    StaggeredBackground.jsx  SVG grid background synced to RF viewport
    StatisticsPanel.jsx      Floating stats overlay (counts, graph metrics, PIV)
    TagLegend.jsx            Floating tag color legend overlay
    TreeManagerModal.jsx     Unified tree management (switch/create/delete, import/export, GitHub connect/disconnect)
    Toolbar.jsx              Top bar (save, tag legend, stats, shortcuts, tree manager, panel toggle)
  data/
    defaultData.js           Default nodes/edges, constants (DATA_KEY, VIEWPORT_KEY,
                             GIST_CONFIG_KEY, SAVE_PENDING_KEY, DEFAULT_EDGE_TYPE,
                             GITHUB_CLIENT_ID), defaultData object
  hooks/
    useGistConfig.js         Gist config localStorage persistence
    useLocalStorage.js       Generic key/value localStorage hook
    useSelectionAutoPan.js   Auto-pan viewport during rectangle selection near edges
    useSkillTree.js          All data state, mutations, undo, Gist sync, keepalive save
    useUIState.js            UI preferences, modals, keyboard shortcuts
    __tests__/               Unit tests for hooks
  utils/
    gist.js                  GitHub Gist API (fetch, save, keepalive, create, delete, Device Flow, findSkillTreeGists)
    layout.js                Staggered grid layout (tidyLayout, snapToGrid, constants)
    score.js                 scoreColor(score) — hsl color ramp
    statistics.js            computeBasicStats, computeInvestmentValue (PIV ranking)
    viewport.js              loadViewport / saveViewport for psskill_viewport
    __tests__/               Unit tests for utils
```
