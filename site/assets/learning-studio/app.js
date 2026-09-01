import { createLearningDataProvider } from '../data-provider.js';
import { groupFootprintsByDate, notesForContext, sessionsForUnit, unitIdForSession } from './course-context.js';
import { writeLearningNote } from './note-client.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

const params = new URLSearchParams(location.search);
const publishedPlatformConfig = JSON.parse(document.getElementById('learning-platform-config')?.textContent || '{"version":0,"courses":[]}');
let platformConfig = publishedPlatformConfig;
if (params.get('preview') === 'draft') {
  try {
    const draft = JSON.parse(localStorage.getItem('learning-platform.admin-draft.v1') || 'null');
    if (draft?.courses) platformConfig = draft;
  } catch {}
}
const visibleCourseConfigs = (platformConfig.courses || [])
  .filter((course) => course.visible)
  .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
const courseConfigMap = Object.fromEntries(visibleCourseConfigs.map((course) => [course.id, course]));

function visibleSection(courseId, sectionId) {
  return (courseConfigMap[courseId]?.sections || []).some((section) => section.id === sectionId && section.visible);
}

function configuredLearning(learning) {
  const hierarchy = learning?.hierarchy || {};
  const sourceCourses = Object.fromEntries((hierarchy.courses || []).map((course) => [course.id, course]));
  const sourcePayloads = learning?.courses || {};
  const courses = visibleCourseConfigs.map((config) => ({
    ...(sourceCourses[config.id] || {
      id: config.id,
      subjectId: config.subjectId,
      status: 'active',
      progress: { completed: 0, total: 0, currentUnitId: null },
      units: [],
      vocabulary: null,
      courseContent: [],
      courseVocabulary: [],
    }),
    name: config.courseLabel,
    short: config.shortLabel,
    courseType: config.shape,
  }));
  const subjectMap = new Map();
  visibleCourseConfigs.forEach((config) => {
    if (!subjectMap.has(config.subjectId)) {
      subjectMap.set(config.subjectId, {
        id: config.subjectId,
        name: config.subjectLabel,
        order: config.order,
        currentCourseIds: [],
        historyCourseIds: [],
      });
    }
    subjectMap.get(config.subjectId).currentCourseIds.push(config.id);
  });
  const subjects = [...subjectMap.values()];
  return {
    ...(learning || {}),
    courses: Object.fromEntries(visibleCourseConfigs.filter((config) => sourcePayloads[config.id]).map((config) => [config.id, sourcePayloads[config.id]])),
    courseOrder: visibleCourseConfigs.map((config) => config.id),
    hierarchy: { subjects, courses },
  };
}

const state = {
  learning: configuredLearning(null),
  monthly: null,
  dataStatus: { source: 'shell', hasData: false, refreshing: true, attempts: {} },
};

function allCourseIds(subject) {
  return [...(subject?.currentCourseIds || []), ...(subject?.historyCourseIds || [])];
}

function context() {
  const subjects = state.learning?.hierarchy?.subjects || [];
  const courses = state.learning?.hierarchy?.courses || [];
  const courseMap = Object.fromEntries(courses.map((course) => [course.id, course]));
  const selectedSubject = subjects.find((item) => item.id === params.get('psubject')) || subjects[0];
  const subjectCourseIds = allCourseIds(selectedSubject);
  const selectedCourse = courseMap[params.get('pcourse')] && subjectCourseIds.includes(params.get('pcourse'))
    ? courseMap[params.get('pcourse')]
    : courseMap[subjectCourseIds[0]];
  const selectedUnit = (selectedCourse?.units || []).find((item) => item.id === params.get('punit'))
    || (selectedCourse?.units || []).find((item) => item.status === 'current')
    || selectedCourse?.units?.[0];
  const selectedCoursePayload = state.learning?.courses?.[selectedCourse?.id] || null;
  return { subjects, courseMap, selectedSubject, selectedCourse, selectedUnit, selectedCoursePayload };
}

function setParams(changes) {
  Object.entries(changes).forEach(([key, value]) => {
    if (value) params.set(key, value); else params.delete(key);
  });
  const url = new URL(location.href);
  url.search = params.toString();
  history.replaceState({}, '', url);
  render();
}

function freshnessLabel() {
  if (state.dataStatus.source === 'live') return '學習資料已更新';
  if (state.dataStatus.source === 'published') return state.dataStatus.refreshing ? '已載入發布資料 · 背景更新中' : '目前使用發布資料';
  if (state.dataStatus.source === 'cache') return state.dataStatus.refreshing ? '已載入最近資料 · 背景更新中' : '目前使用最近資料';
  return state.dataStatus.refreshing ? '學習資料背景更新中' : '學習內容暫時無法更新';
}

function topbar(section) {
  return `<header class="b2-topbar">
    <button type="button" class="b2-brand" data-proto-home aria-label="回到學習首頁"><span class="b-character" aria-hidden="true"><i></i></span><strong>我的學習</strong></button>
    <nav aria-label="全域頁面">
      <button type="button" data-proto-home class="${!section ? 'is-active' : ''}">首頁</button>
      <button type="button" data-proto-section="month" class="${section === 'month' ? 'is-active' : ''}">本月學習狀況</button>
    </nav>
    <span class="b2-data-freshness" data-data-source="${esc(state.dataStatus.source)}">${esc(freshnessLabel())}</span>
    <a class="b2-admin-link" href="./admin.html">管理</a>
  </header>`;
}

function homeView(subjects, courseMap) {
  return `<main class="b2-home">
    <section class="b2-opening">
      <div><h1>今天想打開哪一門？</h1></div>
    </section>
    <nav class="b2-subject-grid" aria-label="選擇學科">${subjects.map((subject, index) => {
      const courses = allCourseIds(subject).map((id) => courseMap[id]).filter(Boolean);
      return `<button type="button" data-proto-subject="${esc(subject.id)}" class="b2-subject b2-subject--${(index % 4) + 1}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <strong>${esc(subject.name)}</strong>
        <small>${courses.length} 門課程 · ${esc(courses[0]?.name || '目前沒有課程')}</small>
        <b>打開 →</b>
      </button>`;
    }).join('')}</nav>
  </main>`;
}

function monthCalendar(monthly) {
  const year = Number(monthly?.month?.year || 0);
  const month = Number(monthly?.month?.month || 0);
  if (!year || !month) return '<div class="b2-chart-empty">目前沒有可顯示的月份資料。</div>';
  const eventMap = Object.fromEntries((monthly.days || []).map((day) => [day.date, day.sessions || []]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) { cells.push('<div class="b2-calendar__cell is-empty"></div>'); continue; }
    const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const events = (eventMap[date] || []).map((item) => `<span>${esc(item.name)}${Number(item.count || 0) > 1 ? ` ×${Number(item.count)}` : ''}</span>`).join('');
    cells.push(`<div class="b2-calendar__cell"><b>${dayNumber}</b><div>${events}</div></div>`);
  }
  return `<div class="b2-calendar"><div class="b2-calendar__week">${['日','一','二','三','四','五','六'].map((day) => `<span>週${day}</span>`).join('')}</div><div class="b2-calendar__grid">${cells.join('')}</div></div>`;
}

function monthCourseChart(monthly) {
  const courses = monthly?.courses || [];
  if (!courses.length) return '<div class="b2-chart-empty">目前沒有課程統計。</div>';
  const maxSessions = Math.max(1, ...courses.map((course) => Number(course.sessions || 0)));
  return `<div class="b2-course-bars" aria-label="各課程本月學習次數">${courses.map((course) => {
    const sessions = Number(course.sessions || 0);
    const width = Math.round((sessions / maxSessions) * 100);
    return `<div class="b2-course-bar"><strong>${esc(course.short || course.name)}</strong><div class="b2-course-bar__track"><div class="b2-course-bar__fill" style="--bar:${width}%"></div></div><span>${sessions}</span></div>`;
  }).join('')}</div>`;
}

function monthRhythmChart(monthly) {
  const year = Number(monthly?.month?.year || 0);
  const month = Number(monthly?.month?.month || 0);
  if (!year || !month) return '<div class="b2-chart-empty">目前沒有學習節奏資料。</div>';
  const counts = Object.fromEntries((monthly.days || []).map((day) => [day.date, (day.sessions || []).reduce((sum, item) => sum + Number(item.count || 1), 0)]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const series = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, count: Number(counts[date] || 0) };
  });
  const maxCount = Math.max(1, ...series.map((item) => item.count));
  return `<div class="b2-daily-rhythm"><p>每天實際打開課程的次數，空白日也保留。</p><div class="b2-daily-bars" style="--days:${daysInMonth}" aria-label="每日學習次數">${series.map((item) => {
    const height = Math.round((item.count / maxCount) * 100);
    const showLabel = item.day === 1 || item.day === daysInMonth || item.day % 5 === 0;
    return `<div class="b2-daily-bar ${item.count ? '' : 'is-zero'}" title="${item.day} 日：${item.count} 次"><i style="--bar:${height}%"></i><span>${showLabel ? item.day : ''}</span></div>`;
  }).join('')}</div></div>`;
}

function monthFootprints(groups) {
  if (!groups.length) return '<div class="b2-chart-empty">目前沒有已記錄的學習足跡。</div>';
  return `<div class="b2-month-footprints">${groups.map((group) => `<section><time>${esc(group.date)}</time><div>${group.entries.map((entry) => `<article><strong>${esc(entry.courseName || '')}</strong><h2>${esc(entry.title || '未命名學習回合')}</h2><p>${esc(entry.learningScope || entry.completedSummary || '')}</p></article>`).join('')}</div></section>`).join('')}</div>`;
}

function monthPanel(monthly, view, footprints) {
  if (view === 'history') return monthFootprints(footprints);
  if (view === 'courses') return monthCourseChart(monthly);
  if (view === 'rhythm') return monthRhythmChart(monthly);
  return monthCalendar(monthly);
}

function monthView(monthly, footprints) {
  const view = params.get('pmonthview') || 'calendar';
  return `<main class="b2-month-screen">
    <div class="b2-month-head"><div><span>全部科目</span><h1>本月學習狀況</h1></div><strong>${esc(monthly?.month?.label || '本月')}</strong></div>
    <div class="b2-month-layout">
      <section class="b2-month-visual">
        <div class="b2-month-switch" aria-label="切換本月圖表">
          <button type="button" data-month-view="calendar" class="${view === 'calendar' ? 'is-active' : ''}">月曆</button>
          <button type="button" data-month-view="history" class="${view === 'history' ? 'is-active' : ''}">學習足跡</button>
          <button type="button" data-month-view="courses" class="${view === 'courses' ? 'is-active' : ''}">課程分布</button>
          <button type="button" data-month-view="rhythm" class="${view === 'rhythm' ? 'is-active' : ''}">每日節奏</button>
        </div>
        <div class="b2-month-panel">${monthPanel(monthly, view, footprints)}</div>
      </section>
      <aside class="b2-month-summary" aria-label="本月摘要">
        <h2>本月摘要</h2>
        <section class="b2-month-stats"><article><span>學習次數</span><b>${Number(monthly?.totalSessions || 0)}</b></article><article><span>有學習的天數</span><b>${Number(monthly?.activeDays || 0)}</b></article><article><span>有紀錄的課程</span><b>${Number(monthly?.activeCourses || 0)} / ${Number(monthly?.totalCourses || 0)}</b></article></section>
        <section class="b2-course-tally">${(monthly?.courses || []).map((course) => `<article><strong>${esc(course.short || course.name)}</strong><span>${Number(course.sessions || 0)} 次</span><small>最近 ${esc(course.lastDate || '—')}</small></article>`).join('')}</section>
      </aside>
    </div>
  </main>`;
}

function fixedUnitList(course, selectedUnitId) {
  return (course?.units || []).map((unit) => `<button type="button" data-proto-unit="${esc(unit.id)}" data-proto-course="${esc(course.id)}" class="b2-lesson-link ${unit.id === selectedUnitId ? 'is-active' : ''}"><span>${String(unit.number ?? '').padStart(2, '0')}</span><strong>${esc(unit.name)}</strong><small>${unit.content?.length ? `${unit.content.length} 段課文` : unit.status === 'done' ? '完成' : unit.status === 'current' ? '目前' : '待學'}</small></button>`).join('');
}

function sessionList(coursePayload, hierarchyCourse, selectedLessonId, courseId) {
  const courseMaterials = (hierarchyCourse?.courseContent || []).length + (hierarchyCourse?.courseVocabulary || []).length;
  const materialsLink = courseMaterials && visibleSection(courseId, 'course-materials') ? `<button type="button" data-proto-lesson="course-materials" data-proto-course="${esc(courseId)}" class="b2-lesson-link ${selectedLessonId === 'course-materials' ? 'is-active' : ''}"><span>＋</span><strong>課程整理</strong><small>${courseMaterials} 筆跨回合內容</small></button>` : '';
  return materialsLink + (coursePayload?.historySessions || coursePayload?.sessions || []).map((session) => `<button type="button" data-proto-lesson="${esc(session.sessionId)}" data-proto-course="${esc(courseId)}" class="b2-lesson-link ${session.sessionId === selectedLessonId ? 'is-active' : ''}"><span>${esc((session.date || '').slice(5))}</span><strong>${esc(session.title || '未命名學習回合')}</strong><small>學習回合</small></button>`).join('');
}

function timelineSessionList(sessions, selectedSessionId) {
  return sessions.map((session) => `<button type="button" data-proto-jump="session-${esc(session.sessionId)}" class="b2-lesson-link ${session.sessionId === selectedSessionId ? 'is-active' : ''}"><span>${esc((session.date || '').slice(5))}</span><strong>${esc(session.title || '未命名學習回合')}</strong><small>學習回合</small></button>`).join('');
}

function sortedTimelineSessions(sessions) {
  return sessions.map((session, index) => ({ session, index }))
    .sort((left, right) => String(right.session.date || '').localeCompare(String(left.session.date || '')) || left.index - right.index)
    .map(({ session }) => session);
}

function linkTimelineItems(items, sessions, contentPlacement = 'unit') {
  const bySession = Object.fromEntries(sessions.map((session) => [session.sessionId, []]));
  const sessionIds = new Set(Object.keys(bySession));
  const unbound = [];
  items.forEach((item) => {
    if (item.sessionId && sessionIds.has(item.sessionId)) {
      bySession[item.sessionId].push(item);
      return;
    }
    const itemUnitId = unitIdForSession({ unitId: item.unitId }, { contentPlacement });
    const target = itemUnitId ? sessions.find((session) => unitIdForSession(session, { contentPlacement }) === itemUnitId) : null;
    if (target) bySession[target.sessionId].push(item); else unbound.push(item);
  });
  return { bySession, unbound };
}

function timelineNoteEditor(session, courseId, notes) {
  const editableNote = notes.find((note) => note.sessionId === session.sessionId && !note.unitId);
  return `<section class="b2-note-editor" data-note-form data-course-id="${esc(courseId)}" data-unit-id="" data-session-id="${esc(session.sessionId)}">
    <label>筆記標題<input type="text" data-note-title value="${esc(editableNote?.title || session.title || '我的筆記')}" maxlength="120"></label>
    <label>筆記內容<textarea data-note-text rows="8" maxlength="20000" placeholder="寫下這次學習要記住的內容、自己的理解或補充。">${esc(editableNote?.text || '')}</textarea></label>
    <label>寫入金鑰<input type="password" data-note-key autocomplete="current-password" placeholder="只保留於本次分頁"></label>
    <div><button type="button" data-note-save>儲存到學習筆記</button><span data-note-status aria-live="polite">儲存後會以這個 Session 寫回學習筆記。</span></div>
  </section>`;
}

function timelineSessionCard(session, queue = [], notes = [], selected = false, courseId = '') {
  const content = Array.isArray(session.content) ? session.content : [];
  const vocabulary = Array.isArray(session.vocabulary) ? session.vocabulary : [];
  const meta = session.date || session.track ? `<div class="b2-reading-meta">${session.date ? `<span>${esc(session.date)}</span>` : ''}${session.track ? `<span>${esc(session.track)}</span>` : ''}</div>` : '';
  const review = session.reviewNeeded || queue.length ? `<section class="b2-timeline-review"><h3>這次要複習</h3>${session.reviewNeeded ? `<p>${esc(session.reviewNeeded)}</p>` : ''}${queue.length ? `<ul>${queue.map((item) => `<li>${esc(item.text || '')}${item.nextReview ? `<small>建議：${esc(item.nextReview)}</small>` : ''}</li>`).join('')}</ul>` : ''}</section>` : '';
  const linkedContent = content.length ? `<details class="b2-timeline-details"><summary>連結的教材 <span>${content.length}</span></summary><div class="b2-content-blocks">${content.map((item) => `<section data-content-id="${esc(item.id || '')}"><span>${esc(item.type || '學習內容')}</span><h3>${esc(item.label || '本次重點')}</h3>${item.explanation ? `<p>${esc(item.explanation)}</p>` : ''}${item.sourceRange ? `<small>來源：${esc(item.sourceRange)}</small>` : ''}</section>`).join('')}</div></details>` : '';
  const linkedVocabulary = vocabulary.length ? `<details class="b2-timeline-details"><summary>連結的單字 <span>${vocabulary.length}</span></summary><div class="b2-vocab">${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>課程標記：${esc(item.memoryStatus || '未開始')}${item.memoryStatus === '待複習' ? '（不等於 Anki 到期）' : ''}</small></div>`).join('')}</div></details>` : '';
  const noteDocuments = notes.length ? `<div class="b2-note-document">${notes.map((note) => `<section><time>${esc(note.updatedAt || '')}</time><h3>${esc(note.title || '未命名筆記')}</h3><p>${esc(note.text || '')}</p>${note.mnemonic ? `<small>記憶口訣：${esc(note.mnemonic)}</small>` : ''}</section>`).join('')}</div>` : '';
  const noteSection = notes.length || selected ? `<section class="b2-timeline-notes"><h3>我的筆記</h3>${noteDocuments}${selected ? timelineNoteEditor(session, courseId, notes) : ''}</section>` : '';
  return `<article id="session-${esc(session.sessionId)}" class="b2-timeline-card ${selected ? 'is-selected' : ''}">${meta}${session.title ? `<h2>${esc(session.title)}</h2>` : ''}${session.learningScope ? `<section><h3>這次學到的範圍</h3><p>${esc(session.learningScope)}</p></section>` : ''}${session.completedSummary ? `<section><h3>完成了什麼</h3><p>${esc(session.completedSummary)}</p></section>` : ''}${session.learnerPerformance ? `<details class="b2-timeline-details"><summary>我的表現</summary><p>${esc(session.learnerPerformance)}</p></details>` : ''}${session.learningAdjustments ? `<details class="b2-timeline-details"><summary>卡住與調整</summary><p>${esc(session.learningAdjustments)}</p></details>` : ''}${review}${linkedContent}${linkedVocabulary}${session.nextStart ? `<section><h3>下次接續</h3><p>${esc(session.nextStart)}</p></section>` : ''}${noteSection}</article>`;
}

function constructionBranches(mode, coursePayload, hierarchyCourse) {
  const sessionCount = (coursePayload?.historySessions || []).length;
  const topicCount = (hierarchyCourse?.units || []).length;
  const courseId = hierarchyCourse?.id || 'construction';
  const sessions = visibleSection(courseId, 'sessions') ? `<button type="button" data-proto-mode="sessions" class="${mode === 'sessions' ? 'is-active' : ''}"><strong>考古題學習回合</strong><span>${sessionCount} 個學習回合</span></button>` : '';
  const topics = visibleSection(courseId, 'topics') ? `<button type="button" data-proto-mode="topics" class="${mode === 'topics' ? 'is-active' : ''}"><strong>主題學習</strong><span>${topicCount} 個主題</span></button>` : '';
  return `<div class="b2-branches"><p>依目前公開設定選擇學習入口。</p>${sessions}${topics}</div>`;
}

function rail(data) {
  const { subjects, courseMap, selectedSubject, selectedCourse, selectedCoursePayload, selectedUnit, selectedLessonId, mode, closed } = data;
  const courses = allCourseIds(selectedSubject).map((id) => courseMap[id]).filter(Boolean);
  const shape = courseConfigMap[selectedCourse?.id]?.shape;
  const useSessions = shape === 'session-topic' || (shape === 'question-bank-hybrid' && mode === 'sessions');
  const lessonList = useSessions ? sessionList(selectedCoursePayload, selectedCourse, selectedLessonId, selectedCourse?.id) : fixedUnitList(selectedCourse, selectedUnit?.id);
  return `<aside id="course-directory" class="b2-rail ${closed ? 'is-closed' : ''}"><div class="b2-rail__head"><button type="button" data-proto-nav-toggle aria-controls="course-directory" aria-expanded="${!closed}" aria-label="${closed ? '展開課程目錄' : '收起課程目錄'}">${closed ? '展開目錄' : '收起目錄'}</button><div><span>${esc(selectedSubject?.name || '')}</span><strong>${esc(selectedCourse?.name || '')}</strong></div></div><div class="b2-rail__body"><div class="b2-subject-shortcuts">${subjects.map((subject) => `<button type="button" data-proto-subject="${esc(subject.id)}" class="${subject.id === selectedSubject?.id ? 'is-active' : ''}">${esc(subject.name)}</button>`).join('')}</div>${courses.length > 1 ? `<div class="b2-course-list">${courses.map((course) => `<button type="button" data-proto-course="${esc(course.id)}" class="${course.id === selectedCourse?.id ? 'is-active' : ''}">${esc(course.name)}</button>`).join('')}</div>` : ''}${selectedSubject?.id === 'construction' ? constructionBranches(mode, selectedCoursePayload, selectedCourse) : ''}<div class="b2-lesson-list">${lessonList || '<p class="proto-empty">目前沒有可列出的課次。</p>'}</div></div></aside>`;
}

function timelineRail(data, sessions, selectedSessionId) {
  const { subjects, courseMap, selectedSubject, selectedCourse, closed } = data;
  const courses = allCourseIds(selectedSubject).map((id) => courseMap[id]).filter(Boolean);
  const dateIndex = timelineSessionList(sessions, selectedSessionId);
  return `<aside id="course-directory" class="b2-rail ${closed ? 'is-closed' : ''}"><div class="b2-rail__head"><button type="button" data-proto-nav-toggle aria-controls="course-directory" aria-expanded="${!closed}" aria-label="${closed ? '展開課程目錄' : '收起課程目錄'}">${closed ? '展開目錄' : '收起目錄'}</button><div><span>${esc(selectedSubject?.name || '')}</span><strong>${esc(selectedCourse?.name || '')}</strong></div></div><div class="b2-rail__body"><div class="b2-subject-shortcuts">${subjects.map((subject) => `<button type="button" data-proto-subject="${esc(subject.id)}" class="${subject.id === selectedSubject?.id ? 'is-active' : ''}">${esc(subject.name)}</button>`).join('')}</div>${courses.length > 1 ? `<div class="b2-course-list">${courses.map((course) => `<button type="button" data-proto-course="${esc(course.id)}" class="${course.id === selectedCourse?.id ? 'is-active' : ''}">${esc(course.name)}</button>`).join('')}</div>` : ''}<div class="b2-lesson-list">${dateIndex || '<p class="proto-empty">目前沒有可列出的學習日期。</p>'}</div></div></aside>`;
}

function timelineOutline(data) {
  const units = data.selectedCourse?.units || [];
  const next = data.selectedCoursePayload?.next;
  return `<div class="b2-outline-view">${next ? `<section class="b2-outline-next"><h2>接下來</h2><p>${esc(next)}</p></section>` : ''}<nav class="b2-outline-units" aria-label="課程單元">${fixedUnitList(data.selectedCourse, data.selectedUnit?.id)}</nav>${units.length ? unitReader(data.selectedUnit || units[0]) : '<div class="b2-empty-reader"><strong>目前沒有可顯示的課程單元。</strong></div>'}</div>`;
}

function timelineView(data, sessions, closed) {
  const requestedSection = params.get('psection');
  const section = ['timeline', 'outline'].includes(requestedSection) ? requestedSection : 'timeline';
  const requestedSessionId = params.get('plesson');
  const selectedSessionId = sessions.some((session) => session.sessionId === requestedSessionId) ? requestedSessionId : sessions[0]?.sessionId || '';
  const reviewQueue = data.selectedCoursePayload?.review?.queue || data.selectedCoursePayload?.reviewQueue || [];
  const linkedReview = linkTimelineItems(reviewQueue, sessions);
  const linkedNotes = linkTimelineItems(data.selectedCoursePayload?.review?.notes || [], sessions);
  const unboundReview = linkedReview.unbound.length ? `<details class="b2-timeline-unbound"><summary>未綁定複習項目 <span>${linkedReview.unbound.length}</span></summary><ul>${linkedReview.unbound.map((item) => `<li>${esc(item.text || '')}${item.nextReview ? `<small>建議：${esc(item.nextReview)}</small>` : ''}</li>`).join('')}</ul></details>` : '';
  const unboundNotes = linkedNotes.unbound.length ? `<details class="b2-timeline-unbound"><summary>未綁定筆記 <span>${linkedNotes.unbound.length}</span></summary><div class="b2-note-document">${linkedNotes.unbound.map((note) => `<section><time>${esc(note.updatedAt || '')}</time><h3>${esc(note.title || '未命名筆記')}</h3><p>${esc(note.text || '')}</p></section>`).join('')}</div></details>` : '';
  const content = section === 'outline'
    ? timelineOutline(data)
    : `<article class="b2-reading-page"><div class="b2-reading-meta"><span>時間軸</span><span>${sessions.length} 個學習回合</span></div><h1>${esc(data.selectedCourse?.name || '學習時間軸')}</h1>${unboundReview}${unboundNotes}<div class="b2-timeline">${sessions.map((session) => timelineSessionCard(session, linkedReview.bySession[session.sessionId] || [], linkedNotes.bySession[session.sessionId] || [], session.sessionId === selectedSessionId, data.selectedCourse?.id)).join('')}</div></article>`;
  return `<main class="b2-learning-shell ${closed ? 'is-nav-closed' : ''}">${timelineRail(data, sessions, selectedSessionId)}<section class="b2-reader"><div class="b2-reader-tabs"><button type="button" data-proto-section="timeline" class="${section === 'timeline' ? 'is-active' : ''}">時間軸</button><button type="button" data-proto-section="outline" class="${section === 'outline' ? 'is-active' : ''}">課程大綱</button><small>按學習日期回顧</small></div><div class="b2-reader__scroll">${content}</div></section></main>`;
}

function unitReader(unit) {
  if (!unit) return '<div class="b2-empty-reader"><strong>選一課開始閱讀。</strong><span>課文會固定出現在這個區域，不會跑到清單最下面。</span></div>';
  const content = unit.content || [];
  const vocabulary = unit.vocabulary || [];
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>第 ${Number(unit.number || 0)} 課</span><span>${esc(unit.sourceRange || '目前未標示教材範圍')}</span></div><h1>${esc(unit.name || '未命名課次')}</h1>${(unit.outline || []).length ? `<section class="b2-lede"><h2>這一課要學什麼</h2><ul>${unit.outline.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>` : ''}<div class="b2-content-blocks">${content.length ? content.map((item) => `<section data-content-id="${esc(item.id || '')}"><span>${esc(item.type || '教材內容')}</span><h2>${esc(item.label || '本課重點')}</h2><p>${esc(item.explanation || '')}</p>${item.sourceRange ? `<small>來源：${esc(item.sourceRange)}</small>` : ''}</section>`).join('') : '<section class="b2-data-note"><strong>這一課目前尚未發布教材內容。</strong><p>內容更新後會顯示在這裡。</p></section>'}</div>${vocabulary.length ? `<section class="b2-vocab"><h2>單字與表達</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>課程標記：${esc(item.memoryStatus || '未開始')}${item.memoryStatus === '待複習' ? '（不等於 Anki 到期）' : ''}</small></div>`).join('')}</section>` : ''}</article>`;
}

function courseMaterialsReader(course) {
  const content = course?.courseContent || [];
  const vocabulary = course?.courseVocabulary || [];
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>課程整理</span><span>跨回合整理</span></div><h1>跨回合教材與表達</h1><section class="b2-lede"><h2>為什麼放在這裡</h2><p>這些內容沒有可確認的單一學習回合，因此集中顯示在這裡。</p></section><div class="b2-content-blocks">${content.map((item) => `<section><span>${esc(item.type || '教材內容')}</span><h2>${esc(item.label || '課程重點')}</h2><p>${esc(item.explanation || '')}</p></section>`).join('')}</div>${vocabulary.length ? `<section class="b2-vocab"><h2>單字與表達</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>學習狀態：${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}</article>`;
}

function sessionReader(session, coursePayload, courseId) {
  if (!session) return '<div class="b2-empty-reader"><strong>目前沒有可顯示的學習回合。</strong></div>';
  const config = courseConfigMap[courseId] || {};
  const isJapanese = config.subjectId === 'japanese';
  const isConstruction = config.shape === 'question-bank-hybrid';
  const content = Array.isArray(session.content) ? session.content : [];
  const vocabulary = Array.isArray(session.vocabulary) ? session.vocabulary : [];
  const sessionLearningContent = `<div class="b2-content-blocks">${content.length
    ? content.map((item) => `<section data-content-id="${esc(item.id || '')}"><span>${esc(item.type || '學習內容')}</span><h2>${esc(item.label || '本次重點')}</h2><p>${esc(item.explanation || '')}</p></section>`).join('')
    : `<section class="b2-data-note"><strong>這次學習回合目前沒有已整理的學習內容。</strong><p>${isJapanese ? '整理完成的文法、自然表達與搭配會直接顯示在這裡。' : '可先依本次範圍與下次接續繼續學習。'}</p></section>`}</div>
    ${vocabulary.length ? `<section class="b2-vocab"><h2>單字與表達</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>學習狀態：${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}`;
  const summary = session.completedSummary ? `<section class="b2-lede"><h2>本次完成</h2><p>${esc(session.completedSummary)}</p></section>` : '';
  const typeLabel = isJapanese ? '日文學習回合' : isConstruction ? '考古題學習回合' : 'Free Talk 學習回合';
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>${typeLabel}</span><span>${esc(session.date || '')}</span></div><h1>${esc(session.title || '未命名學習回合')}</h1><section class="b2-lede"><h2>本次學習範圍</h2><p>${esc(session.learningScope || session.title || '目前沒有範圍摘要')}</p></section>${summary}${sessionLearningContent}</article>`;
}

function unitSessionsReader(unit, sessions) {
  if (!sessions.length) return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>${esc(unit?.id || '')}</span><span>上課紀錄</span></div><h1>${esc(unit?.name || '本單元')}</h1><div class="b2-data-note"><strong>這個單元目前沒有已連結的上課紀錄。</strong><p>新紀錄需帶有單元 ID；舊紀錄若含 Unit 編號會自動對應。</p></div></article>`;
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>${esc(unit?.id || '')}</span><span>${sessions.length} 次上課</span></div><h1>${esc(unit?.name || '本單元')}的上課紀錄</h1><div class="b2-session-records">${sessions.map((session) => `<section><time>${esc(session.date || '')}</time><h2>${esc(session.title || '未命名學習回合')}</h2>${session.learningScope ? `<p>${esc(session.learningScope)}</p>` : ''}${session.completedSummary ? `<div><strong>完成與練習</strong><p>${esc(session.completedSummary)}</p></div>` : ''}${session.learnerPerformance ? `<div><strong>我的練習表現</strong><p>${esc(session.learnerPerformance)}</p></div>` : ''}</section>`).join('')}</div></article>`;
}

function sessionReviewReader(session, coursePayload) {
  if (!session) return '<div class="b2-empty-reader"><strong>目前沒有可複習的學習回合。</strong></div>';
  const sections = [
    ['我的練習與表現', session.learnerPerformance],
    ['卡住與修正', session.learningAdjustments],
    ['這次要複習', session.reviewNeeded || session.reviewSummary],
    ['下次接續', session.nextStart || coursePayload?.next],
  ].filter(([, value]) => value);
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>回合複習</span><span>${esc(session.date || '')}</span></div><h1>${esc(session.title || '未命名學習回合')}</h1>${sections.length ? `<div class="b2-reading-sections">${sections.map(([title, value]) => `<section><h2>${title}</h2><p>${esc(value)}</p></section>`).join('')}</div>` : '<div class="b2-data-note"><strong>這次還沒有整理複習內容。</strong><p>教材與上課紀錄仍可正常閱讀。</p></div>'}</article>`;
}

function reviewView(coursePayload, context) {
  const review = coursePayload?.review || {};
  const sessionIds = new Set(context.sessionIds || []);
  const queue = (review.queue || coursePayload?.reviewQueue || []).filter((item) => item.unitId === context.unitId || (item.sessionId && sessionIds.has(item.sessionId)));
  return `<article class="b2-reading-page b2-review-center"><div class="b2-reading-meta"><span>單元複習</span><span>${queue.length} 筆可用內容</span></div><h1>複習 ${esc(context.label || '這個單元')}</h1><p class="b2-helper">「待複習」是課程整理標記；若另行輸出 Anki 套件，本機排程仍由 Anki 管理。</p>
    <section class="b2-review-group"><h2>課程待複習</h2>${queue.length ? `<div class="b2-reading-sections">${queue.map((item) => `<section><span>${esc(item.type || item.status || '複習')}</span><p>${esc(item.text || '')}</p>${item.nextReview ? `<small>建議：${esc(item.nextReview)}</small>` : ''}</section>`).join('')}</div>` : '<div class="b2-data-note"><strong>這個單元目前沒有已連結的待複習項目。</strong><p>未帶 Unit／Session ID 的舊資料不會再錯放到每一課。</p></div>'}</section></article>`;
}

function notesView(coursePayload, context, courseId) {
  const allNotes = coursePayload?.review?.notes || [];
  const notes = notesForContext(allNotes, context);
  const targetSessionId = context.unitId ? '' : context.sessionIds?.[0] || '';
  const editableNote = allNotes.find((note) => context.unitId ? note.unitId === context.unitId && !note.sessionId : note.sessionId === targetSessionId && !note.unitId);
  const writeContext = context.unitId || targetSessionId;
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>我的筆記</span><span>${esc(writeContext)}</span></div><h1>${esc(context.label || '這次學習')}的筆記</h1><p class="b2-helper">這裡只顯示目前單元或學習回合的筆記，不會與其他課共用。</p>
    <section class="b2-note-editor" data-note-form data-course-id="${esc(courseId)}" data-unit-id="${esc(context.unitId)}" data-session-id="${esc(targetSessionId)}">
      <label>筆記標題<input type="text" data-note-title value="${esc(editableNote?.title || context.label || '我的筆記')}" maxlength="120"></label>
      <label>筆記內容<textarea data-note-text rows="12" maxlength="20000" placeholder="寫下這一課要記住的內容、自己的理解或補充。">${esc(editableNote?.text || '')}</textarea></label>
      <label>寫入金鑰<input type="password" data-note-key autocomplete="current-password" placeholder="只保留於本次分頁"></label>
      <div><button type="button" data-note-save>儲存到學習筆記</button><span data-note-status aria-live="polite">${writeContext ? '儲存後會寫回這門課的「學習筆記」試算表。' : '目前課程缺少可寫入的 Unit／Session。'}</span></div>
    </section>
    ${notes.length ? `<div class="b2-note-document">${notes.map((note) => `<section><time>${esc(note.updatedAt || '')}</time><h2>${esc(note.title || '未命名筆記')}</h2><p>${esc(note.text || '')}</p>${note.mnemonic ? `<small>記憶口訣：${esc(note.mnemonic)}</small>` : ''}</section>`).join('')}</div>` : '<div class="b2-data-note"><strong>這裡還沒有已同步的筆記。</strong><p>可直接在上方編輯並儲存。</p></div>'}</article>`;
}

function learningView(data) {
  const closed = params.get('pnav') === 'closed';
  const shape = courseConfigMap[data.selectedCourse?.id]?.shape;
  const requestedMode = params.get('pmode');
  const mode = shape === 'question-bank-hybrid' ? (requestedMode === 'topics' || requestedMode === 'topic' ? 'topics' : 'sessions') : '';
  const sessions = data.selectedCoursePayload?.historySessions || data.selectedCoursePayload?.sessions || [];
  const timelineOn = visibleSection(data.selectedCourse?.id, 'timeline');
  if (timelineOn) return timelineView(data, sortedTimelineSessions(sessions), closed);
  const hasCourseMaterials = visibleSection(data.selectedCourse?.id, 'course-materials') && (data.selectedCourse?.courseContent || []).length + (data.selectedCourse?.courseVocabulary || []).length > 0;
  const selectedLessonId = params.get('plesson') || (hasCourseMaterials ? 'course-materials' : sessions[0]?.sessionId) || '';
  const selectedSession = sessions.find((item) => item.sessionId === selectedLessonId) || sessions[0];
  const useSessions = shape === 'session-topic' || (shape === 'question-bank-hybrid' && mode === 'sessions');
  const allowedSections = useSessions ? ['session', 'review', 'notes'] : ['learn', 'session', 'review', 'notes'];
  const requestedSection = params.get('psection');
  const section = allowedSections.includes(requestedSection) ? requestedSection : allowedSections[0];
  const linkedSessions = useSessions ? (selectedSession ? [selectedSession] : []) : sessionsForUnit(sessions, data.selectedUnit, { contentPlacement: 'unit' });
  const selectedContext = {
    unitId: useSessions ? '' : data.selectedUnit?.id || '',
    sessionIds: linkedSessions.map((session) => session.sessionId).filter(Boolean),
    label: useSessions ? selectedSession?.title : data.selectedUnit?.name,
  };
  const waitingForCourseData = !data.selectedCoursePayload && !(data.selectedCourse?.units || []).length;
  const content = waitingForCourseData
    ? '<div class="b2-empty-reader" role="status"><strong>這門課的內容正在背景更新。</strong><span>首頁與課程入口仍可正常使用。</span></div>'
    : section === 'notes'
      ? notesView(data.selectedCoursePayload, selectedContext, data.selectedCourse?.id)
      : section === 'review'
        ? useSessions ? sessionReviewReader(selectedSession, data.selectedCoursePayload) : reviewView(data.selectedCoursePayload, selectedContext)
        : section === 'session'
          ? useSessions ? sessionReader(selectedSession, data.selectedCoursePayload, data.selectedCourse?.id) : unitSessionsReader(data.selectedUnit, linkedSessions)
          : selectedLessonId === 'course-materials' ? courseMaterialsReader(data.selectedCourse) : unitReader(data.selectedUnit);
  const reviewTab = visibleSection(data.selectedCourse?.id, 'review') || visibleSection(data.selectedCourse?.id, 'notes')
    ? `<button type="button" data-proto-section="review" class="${section === 'review' ? 'is-active' : ''}">複習</button>` : '';
  const notesTab = visibleSection(data.selectedCourse?.id, 'notes') ? `<button type="button" data-proto-section="notes" class="${section === 'notes' ? 'is-active' : ''}">筆記</button>` : '';
  const learnTab = useSessions ? '' : `<button type="button" data-proto-section="learn" class="${section === 'learn' ? 'is-active' : ''}">教材</button>`;
  const sessionLabel = useSessions ? '上課紀錄' : `上課紀錄${linkedSessions.length ? ` ${linkedSessions.length}` : ''}`;
  const helper = section === 'review' ? '教材與複習分開閱讀' : section === 'notes' ? '只屬於目前單元或回合' : '一次只讀一個脈絡';
  return `<main class="b2-learning-shell ${closed ? 'is-nav-closed' : ''}">${rail({ ...data, selectedLessonId, mode, closed })}<section class="b2-reader"><div class="b2-reader-tabs">${learnTab}<button type="button" data-proto-section="session" class="${section === 'session' ? 'is-active' : ''}">${sessionLabel}</button>${reviewTab}${notesTab}<small>${helper}</small></div><div class="b2-reader__scroll">${content}</div></section></main>`;
}

function render() {
  const data = context();
  const section = params.get('psection') || '';
  const isHome = !params.get('psubject') && section !== 'month';
  const footprints = groupFootprintsByDate(Object.values(state.learning?.courses || {}).map((course) => ({
    id: course.id,
    name: data.courseMap[course.id]?.name || course.id,
    sessions: course.historySessions || course.sessions || [],
  })));
  document.getElementById('app').innerHTML = `<div class="variant-b2">${topbar(section)}${section === 'month' ? monthView(state.monthly, footprints) : isHome ? homeView(data.subjects, data.courseMap) : learningView(data)}</div>`;
}

document.addEventListener('click', async (event) => {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  if (!target) return;
  if (target.hasAttribute('data-note-save')) {
    const form = target.closest('[data-note-form]');
    const status = form?.querySelector('[data-note-status]');
    const keyInput = form?.querySelector('[data-note-key]');
    const providedKey = keyInput?.value || sessionStorage.getItem('learning-platform.note-write-key') || '';
    target.disabled = true;
    if (status) status.textContent = '正在寫回學習筆記…';
    try {
      const note = await writeLearningNote({
        writeKey: providedKey,
        courseId: form?.dataset.courseId,
        unitId: form?.dataset.unitId,
        sessionId: form?.dataset.sessionId,
        title: form?.querySelector('[data-note-title]')?.value,
        text: form?.querySelector('[data-note-text]')?.value,
      });
      sessionStorage.setItem('learning-platform.note-write-key', providedKey);
      if (keyInput) keyInput.value = '';
      if (status) status.textContent = `已寫回學習筆記（${note.id || '已儲存'}）。重新整理資料後會顯示最新內容。`;
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : '筆記儲存失敗。';
    } finally {
      target.disabled = false;
    }
    return;
  }
  if (target.dataset.monthView) return setParams({ pmonthview: target.dataset.monthView });
  if (target.dataset.protoJump) { const targetId = target.dataset.protoJump; setParams({ plesson:targetId.replace(/^session-/, ''), psection:'timeline' }); requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block:'start' })); return; }
  if (target.hasAttribute('data-proto-home')) return setParams({ psubject:'', pcourse:'', punit:'', plesson:'', pmode:'', psection:'', pnav:'', pmonthview:'' });
  if (target.dataset.protoSubject) return setParams({ psubject:target.dataset.protoSubject, pcourse:'', punit:'', plesson:'', pmode:'', psection:'learn' });
  if (target.dataset.protoSection) return setParams({ psection:target.dataset.protoSection });
  if (target.hasAttribute('data-proto-nav-toggle')) return setParams({ pnav: params.get('pnav') === 'closed' ? '' : 'closed' });
  if (target.dataset.protoMode) return setParams({ pmode:target.dataset.protoMode, punit:'', plesson:'', psection:target.dataset.protoMode === 'sessions' ? 'session' : 'learn' });
  if (target.dataset.protoLesson) { setParams({ pcourse:target.dataset.protoCourse || '', plesson:target.dataset.protoLesson, punit:'', psection:'session' }); requestAnimationFrame(() => document.querySelector('.b2-reader')?.scrollIntoView({ block:'start' })); return; }
  if (target.dataset.protoUnit) { const timelineOn = visibleSection(target.dataset.protoCourse, 'timeline'); setParams({ pcourse:target.dataset.protoCourse || '', punit:target.dataset.protoUnit, plesson:'', psection:timelineOn ? 'outline' : 'learn' }); requestAnimationFrame(() => document.querySelector('.b2-reader')?.scrollIntoView({ block:'start' })); return; }
  if (target.dataset.protoCourse) return setParams({ pcourse:target.dataset.protoCourse, punit:'', plesson:'', pmode:'', psection:'learn' });
});

render();

const provider = createLearningDataProvider();
provider.subscribe(({ snapshot, status }) => {
  state.dataStatus = status;
  if (snapshot) {
    state.learning = configuredLearning(snapshot.learning);
    state.monthly = snapshot.monthly;
  }
  render();
});
provider.start();
