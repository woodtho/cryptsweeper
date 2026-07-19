import { useSyncExternalStore } from 'react';
import { subscribe, getVersion } from '../engine/engine.js';

/* Re-renders the subscriber whenever the engine notify()s. State itself is read
   directly from the engine's exported (mutable) `run` / `ui` bindings. */
export function useGame() {
  return useSyncExternalStore(subscribe, getVersion);
}
