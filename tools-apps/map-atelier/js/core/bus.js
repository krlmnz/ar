// ═══════════════════════════════════════════════════════════════
// EVENT BUS — the seam between features. Features never import
// each other's UI; they announce what happened and react to what
// they care about. This is what keeps a feature editable (or
// removable) without touching its neighbors.
//
// Event contract (payload):
//   state:replaced   —            full state doc swapped in; re-render yourself
//   state:saved      —            debounced persist completed (save dot)
//   color:changed    (layerId)    a map layer color changed
//   palette:applied  —            whole palette swapped
//   pattern:apply    (layerId)    (re)composite this layer's pattern onto the map
//   places:changed   —            place added/removed/renamed
//   place:select     ({id, fly})  request to open a place in the editor panel
//   place:panel-opened —          the place panel took the map's right slot
//   library:opened   —            the color library took the map's right slot
//   pane:switch      (name)       request to show a rail pane
//   addmode:set      (on)         arm/disarm click-the-map-to-drop-a-pin
//   palette:open     —            request to open the palette template modal
//   share:open       —            request to open the share modal
//   start:open       —            request to open the new-map overlay
//   ui:dismiss-transient —        a modal opened; close popovers/panels behind it
//   ui:escape        (ctx)        Escape pressed. `ctx` is {handled:false} —
//                                 a handler that acts MUST set ctx.handled and
//                                 every handler must bail when it is already
//                                 true, so one press peels exactly one layer.
// ═══════════════════════════════════════════════════════════════
const listeners = new Map();

export const bus = {
  // `priority` decides the order handlers run in; higher goes first, default 0.
  // Only ui:escape needs it — dismissal has to follow the visual stack, and
  // leaving that to the order features happen to be listed in editor.js made
  // Escape disarm add-mode while a modal sat open on top of it.
  on(event, fn, { priority = 0 } = {}) {
    if (!listeners.has(event)) listeners.set(event, []);
    const list = listeners.get(event);
    list.push({ fn, priority });
    list.sort((a, b) => b.priority - a.priority);
    return () => {
      const i = list.findIndex(l => l.fn === fn);
      if (i >= 0) list.splice(i, 1);
    };
  },
  emit(event, payload) {
    // iterate a copy: a handler may unsubscribe itself or a sibling
    [...(listeners.get(event) || [])].forEach(({ fn }) => {
      try { fn(payload); }
      catch (e) { console.warn(`bus handler for "${event}" failed`, e); }
    });
  },
};

// Dismissal order for ui:escape, top of the visual stack downwards.
export const ESC = { SHARE: 40, MODAL: 30, FLYOUT: 20, MODE: 10 };
