(() => {
  let snapshotPromise = null;

  function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = fetch('./data/snapshot.json', { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
        return response.json();
      });
    }
    return snapshotPromise;
  }

  class ScriptRunner {
    constructor(success, failure) {
      this.success = success || (() => {});
      this.failure = failure || (() => {});
    }

    withSuccessHandler(handler) { return new ScriptRunner(handler, this.failure); }
    withFailureHandler(handler) { return new ScriptRunner(this.success, handler); }
    getLearningWorkspaceData() { loadSnapshot().then((snapshot) => this.success(snapshot.learning)).catch(this.failure); }
    getMonthlyLearningStatus() { loadSnapshot().then((snapshot) => this.success(snapshot.monthly)).catch(this.failure); }
    changeLearningQuotaCount() { this.readOnlyError_(); }
    setLearningQuotaDone() { this.readOnlyError_(); }
    updateLearningTrackerItem() { this.readOnlyError_(); }
    readOnlyError_() { this.failure(new Error('GitHub Pages is read-only.')); }
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  Object.defineProperty(window.google.script, 'run', {
    configurable: false,
    enumerable: true,
    get() { return new ScriptRunner(); },
  });
})();
