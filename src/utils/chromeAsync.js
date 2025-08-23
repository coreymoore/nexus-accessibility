/**
 * Chrome API Promise Wrappers
 *
 * Wraps Chrome extension APIs to return native promises instead of using callbacks.
 * This helps with race conditions and makes async/await usage more reliable.
 */

export const chromeAsync = {
  debugger: {
    attach: (target, version) =>
      new Promise((resolve, reject) => {
        chrome.debugger.attach(target, version, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      }),

    detach: (target) =>
      new Promise((resolve, reject) => {
        chrome.debugger.detach(target, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      }),

    sendCommand: (target, method, params = {}) =>
      new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(target, method, params, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      }),
  },

  tabs: {
    query: (queryInfo) =>
      new Promise((resolve, reject) => {
        chrome.tabs.query(queryInfo, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tabs);
          }
        });
      }),

    sendMessage: (tabId, message, options = {}) =>
      new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, options, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      }),
  },

  scripting: {
    executeScript: (injection) =>
      new Promise((resolve, reject) => {
        chrome.scripting.executeScript(injection, (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(results);
          }
        });
      }),
  },

  storage: {
    sync: {
      get: (keys) =>
        new Promise((resolve, reject) => {
          chrome.storage.sync.get(keys, (items) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(items);
            }
          });
        }),

      set: (items) =>
        new Promise((resolve, reject) => {
          chrome.storage.sync.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),
    },
    local: {
      get: (keys) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.get(keys, (items) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(items);
            }
          });
        }),

      set: (items) =>
        new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        }),
    },
  },

  webNavigation: {
    getAllFrames: (details) =>
      new Promise((resolve, reject) => {
        chrome.webNavigation.getAllFrames(details, (frames) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(frames);
          }
        });
      }),
  },
};
