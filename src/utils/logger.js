const DEBUG = true;

window.axLogger = {
  log(context, ...args) {
    if (DEBUG) {
      console.log(`[${context}]`, ...args);
    }
  },

  error(context, ...args) {
    if (DEBUG) {
      console.error(`[${context}]`, ...args);
    }
  },
};
