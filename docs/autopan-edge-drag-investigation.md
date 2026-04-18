# Auto-Pan on Edge-of-Viewport Drag — Investigation Notes

## Goal
When left mouse button is held (during selection drag or node drag), and the cursor approaches the window/container edges, automatically pan the viewport. This enables:
- Starting a selection and panning to extend it beyond the current viewport
- Dragging a node far away without having to release and re-pan

## What Works Already
- **Node drag auto-pan**: ReactFlow has a built-in `autoPanOnNodeDrag` prop (default `true`, speed via `autoPanSpeed`). This handles the node-drag case natively.
- There is **no** built-in prop for auto-pan during selection drag.

## Approach Taken
Custom `useEffect` in `Canvas.jsx` that:
1. Listens for pointer events (capture phase, on `document`)
2. Tracks whether left button is held and cursor is within 50px of container edges
3. Runs a `requestAnimationFrame` loop that pans the viewport while in the edge zone

## Problems Encountered & Root Causes

### 1. Mouse events don't fire during ReactFlow drag
**Symptom**: `mousedown`/`mousemove`/`mouseup` listeners never fire during selection or node drag.  
**Cause**: ReactFlow calls `preventDefault()` on `pointerdown`, which per the W3C spec suppresses all compatibility mouse events.  
**Fix**: Switch to `pointerdown`/`pointermove`/`pointerup`.

### 2. `pointerdown` on the container doesn't fire during selection drag
**Symptom**: Listener attached to `container` element doesn't see the event.  
**Cause**: ReactFlow's internal selection overlay may intercept events.  
**Fix**: Attach all listeners to `document` in capture phase, use `container.contains(e.target)` to scope.

### 3. Spurious `pointerup` fires immediately after `pointerdown`
**Symptom**: `pointerup` fires right after `pointerdown`, killing the auto-pan before it starts.  
**Cause**: ReactFlow calls `setPointerCapture()` on its selection element, which triggers a spurious `pointerup` on `document`.  
**Fix**: Don't deactivate on `pointerup`. Instead, check `e.buttons & 1` in `pointermove` to detect actual release.

### 4. RAF loop starts and immediately stops
**Symptom**: `startLoop` → `stopLoop` on same frame, `tick` never executes.  
**Cause**: ReactFlow fires interleaved `pointermove` events (from its internal selection handling) that momentarily compute `dx=0, dy=0`. If the loop stops on zero, it dies before ever panning.  
**Fix**: Keep RAF loop running continuously while `active` is true. Only update `dx`/`dy` from `pointermove`, never cancel the loop from it.

### 5. `useStoreApi()` crashes — called outside `ReactFlowProvider`
**Symptom**: `Uncaught Error: Seems like you have not used zustand provider as an ancestor`.  
**Cause**: `Canvas` renders `ReactFlowProvider` inside its JSX, but `useStoreApi()` is called at the top level of `Canvas` — which is *outside* the provider.  
**Fix**: Created a `StoreCapture` bridge component rendered inside `ReactFlowProvider` that captures the store ref.

### 6. `rf.panBy()` is not a function
**Symptom**: `TypeError: rf.panBy is not a function` when calling it on the ReactFlow instance.  
**Cause**: The ReactFlow instance returned from `onInit` / `useReactFlow()` does NOT expose `panBy`. It only has viewport helpers (`setViewport`, `getViewport`, `zoomIn`, `zoomOut`, etc.). The `panBy` function lives on the **zustand store**, not the instance.

### 7. Store `panBy()` called successfully but no visual movement (THE BLOCKER)
**Symptom**: `store.getState().panBy({ x, y })` returns a `Promise<pending>`, is called every frame, but viewport doesn't move.  
**Cause**: Store `panBy` internally calls `d3ZoomInstance.transform()`. But during selection drag, ReactFlow's `XYPanZoom.update()` calls `destroy()` which does `d3ZoomInstance.on('zoom', null)`. This removes the d3-zoom event handler that propagates transform changes to the DOM and store. The `transform()` call "succeeds" at the d3 level but the callback that actually updates anything visible is disconnected.

### 8. `setViewport()` also fails during selection drag (same root cause)
**Symptom**: `rf.setViewport()` called, `getViewport()` immediately after returns the OLD value. `changed: false`.  
**Cause**: Same as above — `setViewport` also goes through `d3ZoomInstance.transform()`, and the zoom handler is nulled.

### 9. Direct DOM + store manipulation (final attempt, untested)
**Approach**: Bypass d3-zoom entirely by directly updating:
1. Zustand store `transform` state
2. `.react-flow__viewport` DOM element CSS transform
3. d3-zoom's `__zoom` property on the `.react-flow` element

**Status**: Code was written but not tested before the investigation was paused.  
**Risk**: This is fragile — it fights ReactFlow's internal state management. The selection rectangle coordinates are calculated relative to the viewport, so panning the viewport during selection would likely desync the selection rectangle from the cursor. Would need to also update ReactFlow's internal selection state.

## Recommendations for Future Attempts

### Option A: Fork/patch `XYPanZoom` in `@xyflow/system`
The cleanest fix. In `XYPanZoom.update()`, instead of `destroy()` (which nulls the zoom handler), keep the handler alive but filter out user-initiated zoom events. Or add a dedicated `panBy` path that doesn't go through d3-zoom at all.

### Option B: Monkey-patch d3-zoom's `on('zoom')` handler
Before starting auto-pan, save the current zoom handler. Restore it temporarily for each `panBy` call, then null it again. Hacky but contained.

### Option C: Use `onSelectionChange` + custom selection rectangle
Instead of fighting ReactFlow's selection, implement a custom selection system that supports panning. This is a large effort.

### Option D: Wait for upstream support
File an issue on `@xyflow/react` requesting `autoPanOnSelectionDrag`. The infrastructure for auto-pan already exists (see `calcAutoPan` export from `@xyflow/system`). It's used for node drag and connection drag but not selection drag.

### Option E: Direct DOM + store + selection rect sync
Continue from attempt #9 but also update the selection rectangle's coordinates. Would need to reverse-engineer how ReactFlow tracks the selection box internally (it stores `userSelectionRect` in the store).

## Key Technical Facts
- `@xyflow/react` v12, `@xyflow/system` — uses d3-zoom for viewport control
- ReactFlow store is zustand-based, accessible via `useStoreApi()` (must be inside `ReactFlowProvider`)
- Store state has `transform: [x, y, zoom]` and `panBy: (delta) => Promise`
- `XYPanZoom.destroy()` = `d3ZoomInstance.on('zoom', null)` — does NOT destroy d3-zoom itself, just detaches the event handler
- `userSelectionActive` state in the store controls whether `destroy()` is called
- Built-in auto-pan props: `autoPanOnNodeDrag` (default true), `autoPanOnConnect` (default true), `autoPanSpeed` (default 15)
- There is NO `autoPanOnSelectionDrag` prop
