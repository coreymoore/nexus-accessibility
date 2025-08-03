export function debugLog(context, data) {
  console.log(`[${context}]`, data);
}

export function debugError(context, error) {
  console.error(`[${context}]`, error);
}
