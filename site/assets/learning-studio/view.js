import { esc } from '../lib/html.js';
import { renderProjectProgress } from '../progress-models/index.js';
import { progressView } from '../views/progress.js';
import { monthView } from '../views/month.js';

function statusLabel(status) {
  if (status === 'done') return '完成';
  if (status === 'current') return '目前';
  return '待學';
}

function allCourseIds(subject) {
  return [...(subject?.currentCourseIds || []), ...(subject?.historyCourseIds || [])];
}

function unitContent(unit) {
  if (!unit) return '';
  const content = unit.content || [];
  const vocabulary = unit.vocabulary || [];
  return `<div class="ls-content">
    <div class="ls-content__meta"><span>UNIT ${String(unit.number || '').padStart(2, '0')}</span><span>${esc(unit.sourceRange || '目前未標示教材範圍')}</span></div>
    <h1>${esc(unit.name || '未命名單元')}</h1>
    ${(unit.outline || []).length ? `<ul class="ls-outline">${unit.outline.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    <div class="ls-content__items">${content.length ? content.map((item) => `<article>
      <span>${esc(item.type || '教材內容')}</span>
      <h2>${esc(item.label || '本課重點')}</h2>
      <p>${esc(item.explanation || '')}</p>
      ${item.sourceRange ? `<small>來源：${esc(item.sourceRange)}</small>` : ''}
    </article>`).join('') : '<div class="ls-empty"><strong>本單元目前只有課綱。</strong><span>教材內容整理完成後會在這裡出現。</span></div>'}</div>
    ${vocabulary.length ? `<section class="ls-vocabulary"><h2>單字與記憶</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}
  </div>`;
}

function courseOverview(course, hierarchyCourse) {
  const sessions = course?.sessions || [];
  const queue = course?.reviewQueue || [];
  return `<div class="ls-content ls-course-overview">
    <div class="ls-content__meta"><span>COURSE</span><span>${hierarchyCourse?.status === 'active' ? '進行中' : '歷史課程'}</span></div>
    <h1>${esc(hierarchyCourse?.name || course?.name || '課程')}</h1>
    ${course?.resume ? `<p class="ls-resume"><b>${esc(course.resume)}</b>${course.next ? `<span>${esc(course.next)}</span>` : ''}</p>` : ''}
    ${course?.progress ? `<section class="ls-progress"><h2>目前進度</h2>${renderProjectProgress(course.progress)}</section>` : ''}
    <div class="ls-evidence">
      <section><h2>最近學習</h2>${sessions.length ? sessions.slice(0, 3).map((session) => `<p><b>${esc(session.date || '')}</b><span>${esc(session.title || '')}</span></p>`).join('') : '<div class="ls-empty"><strong>尚無學習紀錄。</strong><span>正式記錄後會顯示在這裡。</span></div>'}</section>
      <section><h2>待複習</h2>${queue.length ? `<ul>${queue.slice(0, 5).map((item) => `<li>${esc(item.text || '')}</li>`).join('')}</ul>` : '<div class="ls-empty"><strong>目前沒有待複習項目。</strong><span>可以直接繼續目前課程。</span></div>'}</section>
    </div>
  </div>`;
}

function utilityContent(view, course, monthly) {
  if (view === 'rhythm') return `<div class="ls-legacy">${monthView({ monthly })}</div>`;
  if (view === 'progress') return `<div class="ls-legacy">${progressView({ course, monthly })}</div>`;
  return '';
}

export function learningStudioView({ view, learning, monthly, course: coursePayload, courseId, unitId, subjectId }) {
  const hierarchy = learning?.hierarchy || {};
  const subjects = hierarchy.subjects || [];
  const courses = hierarchy.courses || [];
  const courseMap = Object.fromEntries(courses.map((item) => [item.id, item]));
  const selectedSubject = subjects.find((item) => item.id === subjectId) || subjects[0];
  const subjectCourses = allCourseIds(selectedSubject).map((id) => courseMap[id]).filter(Boolean);
  const selectedCourse = subjectCourses.find((item) => item.id === courseId) || subjectCourses[0] || courses[0];
  const selectedUnit = (selectedCourse?.units || []).find((item) => item.id === unitId)
    || (selectedCourse?.units || []).find((item) => item.status === 'current')
    || selectedCourse?.units?.[0];
  const selectedCoursePayload = learning?.courses?.[selectedCourse?.id] || coursePayload;
  const utility = utilityContent(view, selectedCoursePayload, monthly);
  const mainContent = utility || (selectedUnit ? unitContent(selectedUnit) : courseOverview(selectedCoursePayload, selectedCourse));

  return `<div class="ls-studio">
    <header class="ls-nav">
      <div class="ls-wordmark"><span class="ls-character" aria-hidden="true"><i></i></span><span>我的學習<small>Learning Studio</small></span></div>
      <button type="button" class="ls-search" data-ls-command aria-label="快速開啟學科或課程"><span>搜尋學科或課程…</span><kbd>Ctrl K</kbd></button>
      <nav class="ls-modes" aria-label="學習檢視">
        <button data-view="home" class="${!['progress', 'rhythm'].includes(view) ? 'is-active' : ''}">學習</button>
        <button data-view="progress" class="${view === 'progress' ? 'is-active' : ''}">紀錄</button>
        <button data-view="rhythm" class="${view === 'rhythm' ? 'is-active' : ''}">本月</button>
      </nav>
    </header>
    <main class="ls-workbench">
      <aside class="ls-pane ls-pane--subjects"><div class="ls-pane__label">學科</div>${subjects.map((subject, index) => `<button type="button" data-ls-subject="${esc(subject.id)}" class="ls-subject ls-subject--${(index % 4) + 1} ${subject.id === selectedSubject?.id ? 'is-active' : ''}"><span>${esc(subject.name)}</span><small class="ls-count">${allCourseIds(subject).length}</small></button>`).join('')}</aside>
      <section class="ls-pane ls-pane--course">
        <div class="ls-pane__label">課程與單元</div>
        <div class="ls-course-head"><span>${selectedCourse?.status === 'active' ? '進行中' : '歷史課程'}</span><h2>${esc(selectedCourse?.name || '尚未選擇課程')}</h2></div>
        ${subjectCourses.length > 1 ? `<div class="ls-course-tabs">${subjectCourses.map((item) => `<button data-ls-course="${esc(item.id)}" class="${item.id === selectedCourse?.id ? 'is-active' : ''}">${esc(item.name)}</button>`).join('')}</div>` : ''}
        ${(selectedCourse?.units || []).length ? `<div class="ls-unit-list">${selectedCourse.units.map((item) => `<button type="button" data-ls-unit="${esc(item.id)}" data-ls-course="${esc(selectedCourse.id)}" class="${item.id === selectedUnit?.id && !utility ? 'is-active' : ''}">
          <span>${String(item.number || '').padStart(2, '0')}</span><strong>${esc(item.name)}</strong><small>${statusLabel(item.status)}</small>
        </button>`).join('')}</div>` : `<button class="ls-topic-course ${!utility ? 'is-active' : ''}" data-ls-course="${esc(selectedCourse?.id || '')}"><strong>主題型課程</strong><span>直接查看目前進度與學習紀錄</span></button>`}
      </section>
      <section class="ls-pane ls-pane--content">${mainContent}</section>
    </main>
    <footer class="ls-footer"><span>Subject → Course → Unit → Content</span><span>唯讀公開資料 · schema v3</span></footer>
    <dialog class="ls-command" id="learningStudioCommand">
      <form method="dialog" class="ls-command__panel">
        <label for="learningStudioSearch">快速開啟</label>
        <input id="learningStudioSearch" type="search" placeholder="搜尋學科或課程" autocomplete="off">
        <div class="ls-command__results" role="listbox">${subjects.flatMap((subject) => allCourseIds(subject).map((id) => courseMap[id]).filter(Boolean).map((item) => `<button type="button" role="option" aria-selected="false" data-ls-subject="${esc(subject.id)}" data-ls-course="${esc(item.id)}"><span>${esc(subject.name)}</span><small>${esc(item.name)}</small></button>`)).join('')}</div>
        <p class="ls-command__status" aria-live="polite"></p>
        <button class="ls-command__close" value="close">關閉</button>
      </form>
    </dialog>
  </div>`;
}
