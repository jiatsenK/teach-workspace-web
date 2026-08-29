import { esc } from '../../lib/html.js';

function statusLabel(status) {
  return status === 'done' ? '完成' : status === 'current' ? '目前' : '未開始';
}

function unitDetail(unit) {
  const content = unit?.content || [];
  const vocabulary = unit?.vocabulary || [];
  return `<div class="a-unit-detail">
    <div class="a-unit-detail__intro">
      <strong>Unit ${Number(unit.number || 0)} · ${esc(unit.name)}</strong>
      <span>${esc(unit.sourceRange || 'Prototype 示意資料')}</span>
    </div>
    <div class="a-content-list">${content.length ? content.map((item) => `<article>
      <span>${esc(item.type || '教材內容')}</span>
      <h4>${esc(item.label)}</h4>
      <p>${esc(item.explanation)}</p>
    </article>`).join('') : '<p class="proto-empty">這個單元目前只有課綱。</p>'}</div>
    ${vocabulary.length ? `<div class="a-vocab">${vocabulary.map((item) => `<span><b>${esc(item.word)}</b> ${esc(item.meaning)} · ${esc(item.memoryStatus)}</span>`).join('')}</div>` : ''}
  </div>`;
}

function courseRows(course, selectedUnitId) {
  const units = course?.units || [];
  return `<div class="a-course" data-open="true">
    <div class="a-course__head"><strong>${esc(course.name)}</strong><span>${units.length} units</span></div>
    <div class="a-unit-table" role="list">${units.map((unit) => {
      const open = unit.id === selectedUnitId;
      return `<div class="a-unit-row ${open ? 'is-open' : ''}" role="listitem">
        <button type="button" data-proto-unit="${esc(unit.id)}" data-proto-course="${esc(course.id)}" aria-expanded="${open}">
          <span class="a-unit-row__number">${String(unit.number).padStart(2, '0')}</span>
          <span class="a-unit-row__name">${esc(unit.name)}</span>
          <span class="a-unit-row__status">${statusLabel(unit.status)}</span>
          <span class="a-unit-row__mark" aria-hidden="true">${open ? '−' : '+'}</span>
        </button>
        ${open ? unitDetail(unit) : ''}
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function variantA({ subjects, courseMap, selectedSubject, selectedCourse, selectedUnit }) {
  return `<div class="variant-a">
    <div class="a-rails" aria-hidden="true"></div>
    <header class="a-mast">
      <div class="a-mast__issue"><span>Disposable Prototype A</span><span>Snapshot schema v3</span></div>
      <h1>我的學習索引</h1>
      <p>四個學科排在同一張索引上。點一列，課程、單元與內容都在原位置展開。</p>
    </header>
    <main class="a-index">
      <div class="a-index__head"><span>學科</span><span>進行中</span><span>展開</span></div>
      ${subjects.map((subject, index) => {
        const open = subject.id === selectedSubject?.id;
        const courses = [...(subject.currentCourseIds || []), ...(subject.historyCourseIds || [])].map((id) => courseMap[id]).filter(Boolean);
        const currentCourse = courses.find((course) => course.id === selectedCourse?.id) || courses[0];
        return `<section class="a-subject ${open ? 'is-open' : ''}">
          <button type="button" class="a-subject__trigger" data-proto-subject="${esc(subject.id)}" aria-expanded="${open}">
            <span class="a-subject__folio">${String(index + 1).padStart(2, '0')}</span>
            <span class="a-subject__name">${esc(subject.name)}</span>
            <span class="a-subject__count">${courses.length} 門課</span>
            <span class="a-subject__arrow" aria-hidden="true">${open ? '↓' : '→'}</span>
          </button>
          ${open && currentCourse ? courseRows(currentCourse, selectedUnit?.id) : ''}
        </section>`;
      }).join('')}
    </main>
    <footer class="a-colophon">A 測試的是全景感：隨時看見其他學科，用最少畫面切換展開最多層級。</footer>
  </div>`;
}
