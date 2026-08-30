import { createLearningDataProvider } from './data-provider.js';

const DRAFT_KEY = 'learning-platform.admin-draft.v1';
const root = document.getElementById('admin');
const published = JSON.parse(document.getElementById('learning-platform-config')?.textContent || '{"version":0,"courses":[]}');
let draft = loadDraft() || structuredClone(published);
let dataState = { snapshot: null, status: { source: 'shell', attempts: {} } };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function isDirty() {
  return JSON.stringify(draft) !== JSON.stringify(published);
}

function updateDraftStatus() {
  const publish = root.querySelector('.admin-publish');
  if (!publish) return;
  publish.classList.toggle('is-draft', isDirty());
  publish.classList.toggle('is-published', !isDirty());
  const label = publish.querySelector('strong');
  if (label) label.textContent = isDirty() ? '有未發布草稿' : '與已發布設定一致';
}

function attemptLabel(attempt) {
  if (!attempt) return '尚未開始';
  if (attempt.state === 'ready') return `成功${attempt.generatedAt ? ` · ${attempt.generatedAt}` : ''}`;
  if (attempt.state === 'failed') return `失敗 · ${attempt.message || 'unknown'}`;
  if (attempt.state === 'loading') return '更新中';
  return '無可用資料';
}

function courseDiagnostics(course) {
  const diagnostic = dataState.snapshot?.publication?.courses?.[course.id];
  if (!diagnostic) return '<span class="admin-muted">目前 payload 沒有分層診斷；需等待新版 projection。</span>';
  return (course.sections || []).map((section) => {
    const item = diagnostic.sections?.[section.id] || {};
    return `<span>${esc(section.label)}：來源 ${Number(item.available || 0)}／前台 ${Number(item.published || 0)}</span>`;
  }).join('');
}

function render() {
  const status = dataState.status || {};
  root.innerHTML = `<div class="admin-shell">
    <header class="admin-header"><div><a href="./">← 回學習網站</a><h1>Learning Platform 管理</h1><p>課程與區塊的公開設定、預覽，以及資料鏈診斷。</p></div><div class="admin-publish ${isDirty() ? 'is-draft' : 'is-published'}"><strong>${isDirty() ? '有未發布草稿' : '與已發布設定一致'}</strong><span>設定版本 ${Number(published.version || 0)}</span></div></header>
    <section class="admin-actions"><button type="button" data-admin-preview>預覽草稿</button><button type="button" data-admin-download>下載可發布設定</button><button type="button" data-admin-reset>捨棄草稿</button><p>正式發布：以下載內容更新 canonical repo 的 <code>pages/platform-config.json</code>，經驗證、commit 與部署後生效。</p></section>
    <section class="admin-diagnostics"><h2>資料鏈狀態</h2><div class="admin-chain"><article><b>Learning Data → Projection</b><span>${esc(dataState.snapshot?.publication?.projectedAt || dataState.snapshot?.generatedAt || '等待資料')}</span></article><article><b>發布資料</b><span>${esc(attemptLabel(status.attempts?.published))}</span></article><article><b>背景更新</b><span>${esc(attemptLabel(status.attempts?.live))}</span></article><article><b>目前前台 runtime</b><span>${esc(status.source || 'shell')}</span></article></div></section>
    <section class="admin-courses"><h2>課程與區塊</h2>${(draft.courses || []).map((course, courseIndex) => `<article class="admin-course" data-course-index="${courseIndex}">
      <div class="admin-course__head"><label><input type="checkbox" data-field="visible" ${course.visible ? 'checked' : ''}> 顯示課程</label><label>前台名稱<input data-field="courseLabel" value="${esc(course.courseLabel)}"></label><label>順序<input type="number" data-field="order" value="${Number(course.order || 0)}"></label><span class="admin-shape">${esc(course.shape)}</span></div>
      <div class="admin-section-list">${(course.sections || []).map((section, sectionIndex) => `<div data-section-index="${sectionIndex}"><label><input type="checkbox" data-section-field="visible" ${section.visible ? 'checked' : ''}> 顯示</label><label>區塊名稱<input data-section-field="label" value="${esc(section.label)}"></label><label>順序<input type="number" data-section-field="order" value="${Number(section.order || 0)}"></label><code>${esc(section.id)}</code></div>`).join('')}</div>
      <div class="admin-course__diagnostic">${courseDiagnostics(course)}</div>
    </article>`).join('')}</section>
  </div>`;
}

root.addEventListener('input', (event) => {
  const courseElement = event.target.closest('[data-course-index]');
  if (!courseElement) return;
  const course = draft.courses[Number(courseElement.dataset.courseIndex)];
  const sectionElement = event.target.closest('[data-section-index]');
  const field = sectionElement ? event.target.dataset.sectionField : event.target.dataset.field;
  const target = sectionElement ? course.sections[Number(sectionElement.dataset.sectionIndex)] : course;
  if (!field || !target) return;
  target[field] = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
  saveDraft();
  updateDraftStatus();
});

root.addEventListener('click', (event) => {
  if (event.target.closest('[data-admin-preview]')) window.open('./?preview=draft', '_blank', 'noopener');
  if (event.target.closest('[data-admin-reset]')) { localStorage.removeItem(DRAFT_KEY); draft = structuredClone(published); render(); }
  if (event.target.closest('[data-admin-download]')) {
    const blob = new Blob([`${JSON.stringify(draft, null, 2)}\n`], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'platform-config.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }
});

render();
const provider = createLearningDataProvider();
provider.subscribe((next) => { dataState = next; render(); });
provider.start();
