import { createLearningDataProvider } from './data-provider.js?v=3d7dadf';
import { publishLearningPlatformConfig, readLearningWriteStatus } from './learning-studio/config-client.js?v=3d7dadf';

const DRAFT_KEY = 'learning-platform.admin-draft.v1';
const WRITE_KEY = 'learning-platform.admin-key';
const root = document.getElementById('admin');
const published = JSON.parse(document.getElementById('learning-platform-config')?.textContent || '{"version":0,"courses":[]}');
const RECORD_FIELDS = Object.freeze([
  ['stableId', '穩定 ID'],
  ['learningScope', '學習範圍'],
  ['completedSummary', '完成內容'],
  ['reviewSummary', '複習摘要'],
  ['learnerPerformance', '學習者表現'],
  ['nextStart', '下次開始'],
]);
let draft = loadDraft() || structuredClone(published);
let dataState = { snapshot: null, status: { source: 'shell', attempts: {} } };
let writeState = { state: 'loading', capabilities: null, message: '正在確認 production 寫入設定…', publication: null };

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function loadDraft() {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    return Number(stored?.version || 0) === Number(published.version || 0) ? stored : null;
  } catch {
    return null;
  }
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
  publish.dataset.tone = isDirty() ? 'attention' : 'ready';
  const label = publish.querySelector('strong');
  if (label) label.textContent = isDirty() ? '有未發布草稿' : '設定已同步';
}

function formatDate(value, includeTime = false) {
  if (!value) return '尚無時間';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return String(value);
  return new Intl.DateTimeFormat('zh-TW', includeTime
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
    : { year: 'numeric', month: '2-digit', day: '2-digit' }).format(parsed);
}

function attemptLabel(attempt) {
  if (!attempt || attempt.state === 'pending') return '尚未開始';
  if (attempt.state === 'ready') return `完成 · ${formatDate(attempt.generatedAt, true)}`;
  if (attempt.state === 'failed') return `失敗 · ${attempt.message === 'timeout' ? '逾時，保留舊資料' : attempt.message || '未知原因'}`;
  if (attempt.state === 'loading') return '背景更新中';
  return '沒有可用資料';
}

function sourceLabel(source) {
  return ({ shell: '網站外殼', cache: '瀏覽器舊資料', published: '已發布快照', live: 'GAS 背景更新' })[source] || source || '網站外殼';
}

function courseRuntime(course) {
  const payload = dataState.snapshot?.learning?.courses?.[course.id] || null;
  const publication = dataState.snapshot?.publication?.courses?.[course.id] || null;
  const operations = payload?.operations || null;
  return { payload, publication, operations, health: operations?.recordHealth || null };
}

function recordTone(runtime) {
  if (!runtime.payload) return ['waiting', '等待課程資料'];
  if (!runtime.health) return ['waiting', '等待新版診斷'];
  if (!runtime.health.latestSession) return ['attention', '尚無學習紀錄'];
  return runtime.health.latestSession.complete ? ['ready', '最近紀錄完整'] : ['attention', '最近紀錄待補'];
}

function renderRecordFields(runtime) {
  const latest = runtime.health?.latestSession;
  if (!latest) return '<p class="admin-empty">新版 projection 上線後，這裡會檢查每一筆複習紀錄是否真的可用。</p>';
  return `<ul class="admin-checks">${RECORD_FIELDS.map(([key, label]) => `<li data-ok="${latest.fields?.[key] === true}"><span aria-hidden="true"></span>${esc(label)}</li>`).join('')}</ul>`;
}

function renderPublication(course, runtime) {
  if (!runtime.publication) return '<p class="admin-empty">尚未收到這門課的發布分層診斷。</p>';
  return `<div class="admin-section-health">${(course.sections || []).map((section) => {
    const metric = runtime.publication.sections?.[section.id] || {};
    const available = Number(metric.available || 0);
    const visible = runtime.publication.visible === true && metric.visible === true;
    const publishedCount = Number(metric.published || 0);
    const tone = !visible ? 'hidden' : available > publishedCount ? 'attention' : 'ready';
    return `<div data-tone="${tone}"><span>${esc(section.label)}</span><strong>${publishedCount}<small> / ${available}</small></strong><em>${!visible ? '設定隱藏' : available > publishedCount ? '部分未公開' : '已到前台'}</em></div>`;
  }).join('')}</div>`;
}

function renderSettings(course) {
  return `<details class="admin-settings"><summary>公開設定與區塊順序</summary>
    <div class="admin-course-fields">
      <label class="admin-toggle"><input type="checkbox" data-field="visible" ${course.visible ? 'checked' : ''}><span>前台顯示這門課</span></label>
      <label><span>前台名稱</span><input data-field="courseLabel" value="${esc(course.courseLabel)}"></label>
      <label><span>課程順序</span><input type="number" data-field="order" value="${Number(course.order || 0)}"></label>
      <p>課程結構：<code>${esc(course.shape)}</code></p>
    </div>
    <div class="admin-section-list">${(course.sections || []).map((section, sectionIndex) => `<div data-section-index="${sectionIndex}">
      <label class="admin-toggle"><input type="checkbox" data-section-field="visible" ${section.visible ? 'checked' : ''}><span>顯示區塊</span></label>
      <label><span>區塊名稱</span><input data-section-field="label" value="${esc(section.label)}"></label>
      <label><span>順序</span><input type="number" data-section-field="order" value="${Number(section.order || 0)}"></label>
      <code>${esc(section.id)}</code>
    </div>`).join('')}</div>
    <p class="admin-settings__note">後台有資料不會自動公開。只有課程與區塊都開啟，而且資料本身通過公開條件時，前台數量才會增加。</p>
  </details>`;
}

function renderCourse(course, courseIndex) {
  const runtime = courseRuntime(course);
  const [tone, status] = recordTone(runtime);
  const latest = runtime.health?.latestSession;
  return `<article class="admin-course" data-course-index="${courseIndex}">
    <header class="admin-course__head">
      <div><h2>${esc(course.courseLabel)}</h2><p>${latest ? `${esc(formatDate(latest.date))} · ${esc(latest.title)}` : '尚無可顯示的最近一課'}</p></div>
      <span class="admin-status" data-tone="${tone}"><i aria-hidden="true"></i>${esc(status)}</span>
    </header>
    <div class="admin-course__body">
      <section><h3>複習紀錄</h3>${renderRecordFields(runtime)}</section>
    </div>
    <section class="admin-course__publication"><h3>後台 / 前台數量</h3>${renderPublication(course, runtime)}</section>
    ${renderSettings(course)}
  </article>`;
}

function render() {
  const status = dataState.status || {};
  const courses = draft.courses || [];
  const runtimes = courses.map(courseRuntime);
  const hasOperations = runtimes.some((runtime) => Boolean(runtime.operations));
  const completeCount = runtimes.filter((runtime) => runtime.health?.latestSession?.complete === true).length;
  const projectedVersion = Number(dataState.snapshot?.publication?.configVersion || 0);
  const publishing = writeState.state === 'publishing';
  const publishDisabled = !isDirty() || publishing;
  const capabilityLabel = writeState.capabilities
    ? `${writeState.capabilities.adminKeyConfigured ? '管理金鑰已設定' : '管理金鑰未設定'} · ${writeState.capabilities.configPublishEnabled ? 'GitHub 發布已設定' : 'GitHub 發布未設定'}`
    : writeState.message;
  root.innerHTML = `<div class="admin-shell">
    <nav class="admin-nav" aria-label="管理頁導航"><a class="admin-wordmark" href="./admin.html">Learning Platform</a><a class="admin-back" href="./">回前台</a></nav>
    <header class="admin-overview">
      <div class="admin-overview__copy"><h1>上完課，這裡要看得到。</h1><p>先確認複習紀錄與發布鏈，再決定哪些課程內容要公開。慢速 GAS 只在背景更新，不會阻塞這個管理頁。</p></div>
      <div class="admin-overview__figure" aria-live="polite"><strong>${hasOperations ? completeCount : '—'}</strong><span>${hasOperations ? ` / ${courses.length} 門課的最近紀錄完整` : '等待新版紀錄診斷'}</span></div>
    </header>
    <section class="admin-chain" aria-label="資料鏈狀態">
      <article><span>目前使用</span><strong>${esc(sourceLabel(status.source))}</strong><small>${esc(formatDate(status.generatedAt, true))}</small></article>
      <article><span>已發布快照</span><strong>${esc(attemptLabel(status.attempts?.published))}</strong><small>失敗時仍使用舊資料</small></article>
      <article><span>GAS 背景更新</span><strong>${esc(attemptLabel(status.attempts?.live))}</strong><small>不阻塞首頁與導航</small></article>
      <article><span>設定版本</span><strong>${projectedVersion || '—'} / ${Number(published.version || 0)}</strong><small>${projectedVersion && projectedVersion !== Number(published.version || 0) ? 'projection 與前端不一致' : 'projection / 前端'}</small></article>
    </section>
    <section class="admin-toolbar">
      <div class="admin-publish" data-tone="${isDirty() ? 'attention' : 'ready'}"><i aria-hidden="true"></i><div><strong>${isDirty() ? '有未發布草稿' : '設定已同步'}</strong><span>正式設定版本 ${Number(published.version || 0)}</span></div></div>
      <div class="admin-actions"><button class="admin-button admin-button--secondary" type="button" data-admin-preview>預覽草稿</button><button class="admin-button admin-button--secondary" type="button" data-admin-download>下載設定</button><button class="admin-button admin-button--quiet" type="button" data-admin-reset>捨棄草稿</button></div>
      <div class="admin-release-config">
        <label><span>管理金鑰</span><input type="password" data-admin-key autocomplete="current-password" placeholder="${sessionStorage.getItem(WRITE_KEY) ? '已保留於本分頁' : '至少 4 個字元'}"></label>
        <button class="admin-button admin-button--primary" type="button" data-admin-publish ${publishDisabled ? 'disabled' : ''} data-state="${esc(writeState.state)}">${publishing ? '提交中…' : '發布正式設定'}</button>
        <p data-tone="${writeState.state === 'error' ? 'error' : writeState.state === 'success' ? 'ready' : 'waiting'}">${esc(capabilityLabel)}${writeState.publication ? ` · commit ${esc(String(writeState.publication.commitSha || '').slice(0, 7))}，Actions 正在部署版本 ${Number(writeState.publication.configVersion || 0)}` : ''}</p>
      </div>
      <p>發布會把允許的顯示設定提交到 canonical repo，再由既有 Actions 更新 GAS 與 Pages。金鑰只保留於本次分頁，不會寫入公開檔案。</p>
    </section>
    <main class="admin-courses">${courses.map(renderCourse).join('')}</main>
    <footer class="admin-footer"><span>Learning Platform 管理</span><span>canonical：teach-workspace</span><span>learner-facing mirror：teach-workspace-web</span></footer>
  </div>`;
}

root.addEventListener('input', (event) => {
  if (event.target.matches('[data-admin-key]')) {
    if (event.target.value) sessionStorage.setItem(WRITE_KEY, event.target.value);
    else sessionStorage.removeItem(WRITE_KEY);
    return;
  }
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

root.addEventListener('click', async (event) => {
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
  if (event.target.closest('[data-admin-publish]')) {
    const writeKey = root.querySelector('[data-admin-key]')?.value || sessionStorage.getItem(WRITE_KEY) || '';
    writeState = { ...writeState, state: 'publishing', message: '正在提交 canonical 設定…', publication: null };
    render();
    try {
      const publication = await publishLearningPlatformConfig({ writeKey, config: draft });
      sessionStorage.setItem(WRITE_KEY, writeKey);
      writeState = { ...writeState, state: 'success', message: 'canonical 已提交，等待自動部署。', publication };
    } catch (error) {
      writeState = { ...writeState, state: 'error', message: String(error?.message || error), publication: null };
    }
    render();
  }
});

render();
const provider = createLearningDataProvider();
provider.subscribe((next) => { dataState = next; render(); });
provider.start();
readLearningWriteStatus()
  .then((capabilities) => { writeState = { ...writeState, state: 'ready', capabilities, message: '' }; render(); })
  .catch((error) => { writeState = { ...writeState, state: 'error', message: String(error?.message || error) }; render(); });
