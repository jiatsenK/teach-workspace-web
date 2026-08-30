export const LIVE_DATA_URL = 'https://script.google.com/macros/s/AKfycbxefSrx96-xt03xzwi_pZIjeOBwKSsspyeg7nK64TN9MZRQMJfYGLi12h-pCdP1P1SDTw/exec?action=pages-snapshot';
export const PUBLISHED_DATA_URL = './data/snapshot.json';
export const CACHE_KEY = 'learning-platform.snapshot.v1';

export function isValidSnapshot(snapshot) {
  return Boolean(snapshot && snapshot.schemaVersion === 3 && snapshot.learning && snapshot.monthly);
}

function timestamp(snapshot) {
  const value = Date.parse(snapshot?.generatedAt || snapshot?.learning?.updatedAt || '');
  return Number.isFinite(value) ? value : 0;
}

export function createLearningDataProvider(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  const storage = options.storage || globalThis.localStorage;
  const liveUrl = options.liveUrl || LIVE_DATA_URL;
  const publishedUrl = options.publishedUrl || PUBLISHED_DATA_URL;
  const liveTimeoutMs = options.liveTimeoutMs ?? 20000;
  const listeners = new Set();
  const attempts = {
    cache: { state: 'pending' },
    published: { state: 'pending' },
    live: { state: 'pending' },
  };
  let current = null;
  let currentSource = 'shell';
  let started = false;
  let startPromise = null;

  function status() {
    return {
      source: currentSource,
      generatedAt: current?.generatedAt || null,
      hasData: Boolean(current),
      refreshing: attempts.published.state === 'loading' || attempts.live.state === 'loading',
      attempts: JSON.parse(JSON.stringify(attempts)),
    };
  }

  function emit() {
    const detail = { snapshot: current, status: status() };
    listeners.forEach((listener) => listener(detail));
  }

  function readCache() {
    try {
      const payload = JSON.parse(storage?.getItem(CACHE_KEY) || 'null');
      if (!isValidSnapshot(payload)) throw new Error('cache-invalid');
      attempts.cache = { state: 'ready', generatedAt: payload.generatedAt || null };
      return payload;
    } catch (error) {
      attempts.cache = { state: 'unavailable', message: String(error?.message || error) };
      return null;
    }
  }

  function writeCache(snapshot) {
    try {
      storage?.setItem(CACHE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      attempts.cache = { ...attempts.cache, writeState: 'failed', writeMessage: String(error?.message || error) };
    }
  }

  function adopt(snapshot, source) {
    if (!isValidSnapshot(snapshot)) throw new Error(`${source}-snapshot-invalid`);
    if (current && timestamp(snapshot) < timestamp(current)) return false;
    current = snapshot;
    currentSource = source;
    writeCache(snapshot);
    emit();
    return true;
  }

  async function request(source, url, timeoutMs) {
    if (!fetchImpl) throw new Error('fetch-unavailable');
    attempts[source] = { state: 'loading', startedAt: new Date().toISOString() };
    emit();
    const controller = new AbortController();
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetchImpl(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`request-${response.status}`);
      const snapshot = await response.json();
      if (!isValidSnapshot(snapshot)) throw new Error('snapshot-invalid');
      attempts[source] = { state: 'ready', generatedAt: snapshot.generatedAt || null };
      adopt(snapshot, source);
      return snapshot;
    } catch (error) {
      attempts[source] = { state: 'failed', message: String(error?.name === 'AbortError' ? 'timeout' : error?.message || error) };
      emit();
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function start() {
    if (started) return startPromise;
    started = true;
    const cached = readCache();
    if (cached) adopt(cached, 'cache');
    else emit();
    startPromise = Promise.allSettled([
      request('published', publishedUrl, 8000),
      request('live', liveUrl, liveTimeoutMs),
    ]).then(() => ({ snapshot: current, status: status() }));
    return startPromise;
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener({ snapshot: current, status: status() });
    return () => listeners.delete(listener);
  }

  return { start, subscribe, getSnapshot: () => current, getStatus: status };
}
