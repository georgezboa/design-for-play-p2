// Minimal event emitter for the chapter model. Presentation layers subscribe;
// the model never imports Three.js.

export function createEventBus() {
  const listeners = new Map();

  return {
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type)?.delete(fn);
    },
    emit(type, payload) {
      for (const fn of listeners.get(type) ?? []) fn(payload);
      for (const fn of listeners.get('*') ?? []) fn({ type, payload });
    },
    clear() {
      listeners.clear();
    },
  };
}
