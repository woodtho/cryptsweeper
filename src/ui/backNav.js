/* Back-intent registry.
   Coordinates the Android hardware back button and the Escape key with
   dismissable UI whose state lives inside components (title sub-panels, the
   in-game menu's tab) rather than the engine `ui` store.

   A component registers a handler while it has something to step back through;
   the dispatcher in App.jsx consults them (most-recently-registered first) and
   the first handler to return true consumes the back press. */

const handlers = [];

/** Register a back handler. Returns an unregister function (use as a useEffect cleanup).
 *  fn() should dismiss/step-back and return true if it consumed the intent, else false. */
export function registerBackHandler(fn) {
  const entry = { fn };
  handlers.push(entry);
  return () => {
    const i = handlers.indexOf(entry);
    if (i >= 0) handlers.splice(i, 1);
  };
}

/** Run registered handlers newest-first; returns true once one consumes the intent. */
export function runBackHandlers() {
  for (let i = handlers.length - 1; i >= 0; i--) {
    try {
      if (handlers[i].fn()) return true;
    } catch { /* a broken handler must not swallow the back press */ }
  }
  return false;
}
