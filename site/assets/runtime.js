(() => {
  const LIVE_DATA_URL = 'https://script.google.com/macros/s/AKfycbxefSrx96-xt03xzwi_pZIjeOBwKSsspyeg7nK64TN9MZRQMJfYGLi12h-pCdP1P1SDTw/exec?action=pages-snapshot';
  const FALLBACK_DATA_URL = './data/snapshot.json';
  const LIVE_TIMEOUT_MS = 5000;
  let snapshotPromise = null;

  function isValidSnapshot(snapshot) {
    return Boolean(snapshot && snapshot.schemaVersion === 3 && snapshot.learning && snapshot.monthly);
  }

  async function fetchJson(url, timeoutMs) {
    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
      const payload = await response.json();
      if (!isValidSnapshot(payload)) throw new Error('Learning data response is invalid.');
      return payload;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = fetchJson(LIVE_DATA_URL, LIVE_TIMEOUT_MS).catch((liveError) => {
        console.warn('Live learning data unavailable; using the latest published copy.', liveError);
        return fetchJson(FALLBACK_DATA_URL, 0);
      });
    }
    return snapshotPromise;
  }

  class ScriptRunner {
    constructor(success, failure) {
      this.success = success || (() => {});
      this.failure = failure || (() => {});
    }

    withSuccessHandler(handler) {
      return new ScriptRunner(handler, this.failure);
    }

    withFailureHandler(handler) {
      return new ScriptRunner(this.success, handler);
    }

    getLearningWorkspaceData() {
      loadSnapshot().then((snapshot) => this.success(snapshot.learning)).catch(this.failure);
    }

    getMonthlyLearningStatus() {
      loadSnapshot().then((snapshot) => this.success(snapshot.monthly)).catch(this.failure);
    }

    changeLearningQuotaCount() { this.readOnlyError_(); }
    setLearningQuotaDone() { this.readOnlyError_(); }
    updateLearningTrackerItem() { this.readOnlyError_(); }

    readOnlyError_() {
      this.failure(new Error('GitHub Pages is read-only.'));
    }
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', {
    configurable: false,
    enumerable: true,
    get() { return new ScriptRunner(); },
  });
})();
