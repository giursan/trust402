// In-memory SSE event streams keyed by taskId
type EventListener = (event: string, data: unknown) => void;

const taskListeners = new Map<string, Set<EventListener>>();

export function subscribe(taskId: string, listener: EventListener): () => void {
  if (!taskListeners.has(taskId)) taskListeners.set(taskId, new Set());
  taskListeners.get(taskId)!.add(listener);
  return () => taskListeners.get(taskId)?.delete(listener);
}

export function emit(taskId: string, event: string, data: unknown) {
  taskListeners.get(taskId)?.forEach((listener) => listener(event, data));
}

export function emitAndForget(taskId: string, event: string, data: unknown) {
  // Small delay to ensure SSE client is connected
  setTimeout(() => emit(taskId, event, data), 50);
}

// Global event channel — for market-wide events (arena, prediction markets, etc.)
const globalListeners = new Set<EventListener>();

export function subscribeGlobal(listener: EventListener): () => void {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}

export function emitGlobal(event: string, data: unknown) {
  globalListeners.forEach((listener) => listener(event, data));
}
