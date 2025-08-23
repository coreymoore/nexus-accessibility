(function () {
  "use strict";

  // Ensure namespace
  window.ContentExtension = window.ContentExtension || {};
  const CE = window.ContentExtension;

  // Dispatcher state
  const inflight = new WeakMap(); // Element -> Promise
  const debounceTimers = new WeakMap(); // Element -> timer id
  const pendingResolvers = new WeakMap(); // Element -> {resolve, reject, source}

  // Diagnostics / metrics
  let totalRequests = 0;
  let executedRequests = 0; // number of times we actually invoked CE.accessibility
  let dedupedRequests = 0; // number of times we returned an existing in-flight promise
  const elementIds = new WeakMap(); // Element -> numeric id for readable logs
  let nextElementId = 1;

  // Configuration
  const DEFAULT_DEBOUNCE_MS =
    (window.NexusConstants && window.NexusConstants.DEBOUNCE_MS) || 60;

  function request(target, forceUpdate = false, source = "unknown") {
    if (!target || !(target instanceof Element)) {
      return Promise.resolve(null);
    }

    totalRequests += 1;

    // assign a stable, readable id for this element for logging
    if (!elementIds.has(target)) {
      elementIds.set(target, nextElementId++);
    }
    const readableId = elementIds.get(target);

    // Return existing in-flight promise if present (coalescing)
    const existing = inflight.get(target);
    if (existing) {
      dedupedRequests += 1;
      console.log(`[ContentExtension.retrievalDispatcher] DEDUP id=${readableId} source=${source} totalRequests=${totalRequests} deduped=${dedupedRequests}`);
      return existing;
    }

    // Create a promise and store it as in-flight immediately so duplicates use it
    let resolveFn, rejectFn;
    const p = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    inflight.set(target, p);

    // Clear any existing timer and set a new debounce timer
    const existingTimer = debounceTimers.get(target);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    pendingResolvers.set(target, { resolve: resolveFn, reject: rejectFn, source, forceUpdate });

    const timer = setTimeout(async () => {
      try {
        executedRequests += 1;
        console.log(`[ContentExtension.retrievalDispatcher] EXECUTE id=${readableId} source=${source} executed=${executedRequests}`);
        // If content-side cache exists and has in-flight, prefer that
        let info = null;
        try {
          if (CE.cache && typeof CE.cache.getInflightRequest === "function") {
            const cachedPromise = CE.cache.getInflightRequest(target);
            if (cachedPromise) {
              info = await cachedPromise;
            }
          }
        } catch (e) {
          // ignore
        }

        if (info == null) {
          // Use CE.accessibility to fetch data
          if (CE.accessibility && typeof CE.accessibility.getAccessibleInfo === "function") {
            info = await CE.accessibility.getAccessibleInfo(target, forceUpdate);
          } else {
            info = null;
          }
        }

        const pr = pendingResolvers.get(target);
        if (pr) {
          pr.resolve(info);
          console.log(`[ContentExtension.retrievalDispatcher] RESOLVE id=${readableId} source=${pr.source}`);
        }
      } catch (error) {
        const pr = pendingResolvers.get(target);
        if (pr) pr.reject(error);
      } finally {
        // Clean up
        inflight.delete(target);
        debounceTimers.delete(target);
        pendingResolvers.delete(target);
      }
    }, DEFAULT_DEBOUNCE_MS);

    debounceTimers.set(target, timer);

    return p;
  }

  // Expose simple API
  CE.retrievalDispatcher = {
    request,
    // For tests and diagnostics
    _internals: {
      inflight,
      debounceTimers,
      pendingResolvers,
      DEFAULT_DEBOUNCE_MS,
      // metrics (export copies so callers can snapshot them)
      _metrics: {
        get totalRequests() {
          return totalRequests;
        },
        get executedRequests() {
          return executedRequests;
        },
        get dedupedRequests() {
          return dedupedRequests;
        },
        get nextElementId() {
          return nextElementId;
        },
      },
    },
    // runtime helpers
    getStats() {
      return {
        totalRequests,
        executedRequests,
        dedupedRequests,
        inflightCount: (function () {
          // WeakMap size cannot be read directly; approximate by iterating known element ids is not possible.
          // Return -1 to indicate unknown/unsupported in this context.
          return -1;
        })(),
        DEFAULT_DEBOUNCE_MS,
      };
    },
    resetStats() {
      totalRequests = 0;
      executedRequests = 0;
      dedupedRequests = 0;
    },
  };

  console.log("[ContentExtension.retrievalDispatcher] loaded");
})();
