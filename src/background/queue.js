import { sessionQueues } from "./state.js";

export function queueDebuggerSession(tabId, task) {
  const prev = sessionQueues.get(tabId) || Promise.resolve();
  const run = () => Promise.resolve().then(task);
  const next = prev.then(run, run);
  sessionQueues.set(
    tabId,
    next.finally(() => {
      if (sessionQueues.get(tabId) === next) sessionQueues.delete(tabId);
    })
  );
  return next;
}
