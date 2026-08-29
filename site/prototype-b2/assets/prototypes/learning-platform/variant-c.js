import { esc } from '../../lib/html.js';

function currentContent(unit) {
  const items = unit?.content || [];
  const vocabulary = unit?.vocabulary || [];
  return `<div class="c-content">
    <div class="c-content__meta"><span>${unit ? `UNIT ${String(unit.number).padStart(2, '0')}` : '未選擇'}</span><span>${esc(unit?.sourceRange || 'Prototype 示意資料')}</span></div>
    <h2>${esc(unit?.name || '選擇一個單元')}</h2>
    ${(unit?.outline || []).length ? `<ul class="c-outline">${unit.outline.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}
    <div class="c-content__items">${items.length ? items.map((item) => `<article><span>${esc(item.type || '內容')}</span><h3>${esc(item.label)}</h3><p>${esc(item.explanation)}</p></article>`).join('') : '<p class="proto-empty">這個單元目前只有課綱。</p>'}</div>
    ${vocabulary.length ? `<section class="c-vocabulary"><h3>單字與記憶</h3>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>${esc(item.memoryStatus)}</small></div>`).join('')}</section>` : ''}
  </div>`;
}

export function variantC({ subjects, courseMap, selectedSubject, selectedCourse, selectedUnit }) {
  const courses = [...(selectedSubject?.currentCourseIds || []), ...(selectedSubject?.historyCourseIds || [])].map((id) => courseMap[id]).filter(Boolean);
  const course = courses.find((item) => item.id === selectedCourse?.id) || courses[0];
  const unit = (course?.units || []).find((item) => item.id === selectedUnit?.id) || course?.units?.[0];
  return `<div class="variant-c">
    <header class="c-nav">
      <div class="c-wordmark">學習工作台 <span>Prototype C</span></div>
      <button type="button" class="c-search" data-proto-command aria-label="快速開啟學科或課程"><span>快速開啟…</span><kbd>Ctrl K</kbd></button>
      <span class="c-status">● READ ONLY</span>
    </header>
    <main class="c-workbench">
      <aside class="c-pane c-pane--subjects"><div class="c-pane__label">學科</div>${subjects.map((subject) => `<button type="button" data-proto-subject="${esc(subject.id)}" class="${subject.id === selectedSubject?.id ? 'is-active' : ''}"><span>${esc(subject.name)}</span><small>${(subject.currentCourseIds || []).length}</small></button>`).join('')}</aside>
      <section class="c-pane c-pane--course">
        <div class="c-pane__label">課程 / 單元</div>
        <div class="c-course-head"><span>ACTIVE COURSE</span><h1>${esc(course?.name || '尚未選擇課程')}</h1></div>
        <div class="c-unit-list">${(course?.units || []).map((item) => `<button type="button" data-proto-unit="${esc(item.id)}" data-proto-course="${esc(course.id)}" class="${item.id === unit?.id ? 'is-active' : ''}">
          <span>${String(item.number).padStart(2, '0')}</span><strong>${esc(item.name)}</strong><small>${item.status === 'done' ? '完成' : item.status === 'current' ? '目前' : '待學'}</small>
        </button>`).join('')}</div>
      </section>
      <section class="c-pane c-pane--content">${currentContent(unit)}</section>
    </main>
    <footer class="c-footer"><span>Subject → Course → Unit → Content</span><span>sanitized snapshot schema v3</span></footer>
    <dialog class="c-command" id="prototypeCommand">
      <form method="dialog" class="c-command__panel">
        <label for="prototypeCommandSearch">快速開啟</label>
        <input id="prototypeCommandSearch" type="search" placeholder="搜尋學科或課程" autocomplete="off">
        <div class="c-command__results">${subjects.map((subject) => {
          const subjectCourses = [...(subject.currentCourseIds || []), ...(subject.historyCourseIds || [])].map((id) => courseMap[id]).filter(Boolean);
          return `<button type="button" data-proto-subject="${esc(subject.id)}"><span>${esc(subject.name)}</span><small>${esc(subjectCourses[0]?.name || '尚無課程')}</small></button>`;
        }).join('')}</div>
        <button class="c-command__close" value="close">關閉</button>
      </form>
    </dialog>
  </div>`;
}
