// Simple generator for a 12-character hex correlation id
function generateCorrelationId() {
  return (Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-4)).slice(0,12);
}

const corrEl = document.getElementById('corr');
const genBtn = document.getElementById('gen');
const runBtn = document.getElementById('run');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const traceEl = document.getElementById('trace');

genBtn.addEventListener('click', () => {
  corrEl.value = generateCorrelationId();
});

function logTrace(...args) {
  const now = new Date().toISOString();
  traceEl.textContent = now + '  ' + args.map(a => {
    try { return typeof a === 'string' ? a : JSON.stringify(a, null, 2); } catch (e) { return String(a); }
  }).join(' ') + '\n' + traceEl.textContent;
}

runBtn.addEventListener('click', async () => {
  resultEl.textContent = 'Running...';
  traceEl.textContent = '';
  statusEl.textContent = 'Sending';

  const correlationId = corrEl.value || generateCorrelationId();
  corrEl.value = correlationId;

  if (!window.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
    const msg = 'chrome.runtime not available. Open this page from the extension bundle (chrome-extension://...) or run as an extension page.';
    resultEl.textContent = msg;
    statusEl.textContent = 'Failed';
    logTrace(msg);
    return;
  }

  try {
    logTrace('Sending CLEAR_CACHES', { correlationId });
    statusEl.textContent = 'Awaiting response';

    chrome.runtime.sendMessage({ type: 'CLEAR_CACHES', correlationId }, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        statusEl.textContent = 'Error';
        const em = 'chrome.runtime.lastError: ' + err.message;
        resultEl.textContent = em;
        logTrace(em);
        return;
      }

      statusEl.textContent = 'Received';
      resultEl.textContent = JSON.stringify(resp, null, 2);
      logTrace('Received response', resp);

      // If the response contains `results`, pretty-print per-frame ACKs
      if (resp && resp.results && Array.isArray(resp.results)) {
        for (const r of resp.results) {
          logTrace('ACK', r);
        }
      }
    });
  } catch (e) {
    statusEl.textContent = 'Exception';
    resultEl.textContent = String(e);
    logTrace('Exception sending message', e);
  }
});

// Pre-populate correlation id
corrEl.value = generateCorrelationId();
