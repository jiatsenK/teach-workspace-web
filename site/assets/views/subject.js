import { esc } from '../lib/html.js';
import { pageHeader } from '../components/header.js';

function courseMap(hierarchy) {
  const output = {};
  (hierarchy?.courses || []).forEach((course) => { output[course.id] = course; });
  return output;
}

function unitLine(course) {
  const units = course?.units || [];
  if (!units.length) return '<div class="subtle">此課程目前不是固定單元型課程。</div>';
  return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:10px">${units.map((unit) => {
    const mark = unit.status === 'current' ? `(${unit.number})` : String(unit.number);
    const weight = unit.status === 'done' ? '700' : unit.status === 'current' ? '800' : '400';
    return `<button data-open-unit="${esc(unit.id)}" data-unit-course="${esc(course.id)}" title="${esc(unit.name)}" style="border:0;background:transparent;padding:2px;cursor:pointer;font:inherit;font-weight:${weight}">${esc(mark)}</button>`;
  }).join('<span class="subtle">–</span>')}</div>`;
}

function vocabularySummary(course) {
  const vocab = course?.vocabulary;
  if (!vocab || !Number(vocab.total || 0)) return '';
  return `<p class="subtle" style="margin:10px 0 0">單字 ${Number(vocab.total || 0)}｜已記住 ${Number(vocab.remembered || 0)}｜待複習 ${Number(vocab.reviewing || 0)}</p>`;
}

function courseCard(course) {
  return `<div class="card">
    <div class="eyebrow">${course.status === 'active' ? '目前進行中' : '歷史課程'}</div>
    <h3 class="section-title" style="margin-top:6px">${esc(course.name)}</h3>
    ${unitLine(course)}
    ${vocabularySummary(course)}
    <button class="btn" style="margin-top:14px" data-open-course="${esc(course.id)}">查看課程</button>
  </div>`;
}

export function subjectView({ learning, subjectId }) {
  const hierarchy = learning?.hierarchy || {};
  const subject = (hierarchy.subjects || []).find((item) => item.id === subjectId) || hierarchy.subjects?.[0];
  if (!subject) return `${pageHeader('學習', '目前尚未建立學科。')}<div class="empty">沒有可顯示的學科。</div>`;

  const courses = courseMap(hierarchy);
  const active = (subject.currentCourseIds || []).map((id) => courses[id]).filter(Boolean);
  const history = (subject.historyCourseIds || []).map((id) => courses[id]).filter(Boolean);

  return `${pageHeader(subject.name, '選擇目前正在進行的課程，或回顧歷史課程。點單元數字可以直接查看內容。')}
    <div class="stack">
      <section>
        <h2 class="section-title">目前進行中</h2>
        <div class="stack">${active.length ? active.map(courseCard).join('') : '<div class="empty">目前沒有進行中的課程。</div>'}</div>
      </section>
      <section>
        <h2 class="section-title">歷史課程</h2>
        <div class="stack">${history.length ? history.map(courseCard).join('') : '<div class="empty">目前沒有歷史課程。</div>'}</div>
      </section>
      <button class="btn secondary" data-go-home="1">回學習首頁</button>
    </div>`;
}
