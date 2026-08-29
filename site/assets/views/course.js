import { esc } from '../lib/html.js';
import { pageHeader } from '../components/header.js';
import { renderProjectProgress } from '../progress-models/index.js';

function unitProgress(course) {
  const units = course?.units || [];
  if (!units.length) return '';
  return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:12px">${units.map((unit) => {
    const label = unit.status === 'current' ? `(${unit.number})` : String(unit.number);
    const weight = unit.status === 'done' ? '700' : unit.status === 'current' ? '800' : '400';
    return `<button data-open-unit="${esc(unit.id)}" data-unit-course="${esc(course.id)}" title="${esc(unit.name)}" style="border:0;background:transparent;padding:2px;cursor:pointer;font:inherit;font-weight:${weight}">${esc(label)}</button>`;
  }).join('<span class="subtle">–</span>')}</div>`;
}

function unitCards(course) {
  const units = course?.units || [];
  if (!units.length) return '';
  return `<section class="stack"><h2 class="section-title">課程大綱</h2>${units.map((unit) => {
    const status = unit.status === 'done' ? '已完成' : unit.status === 'current' ? '目前進行' : '未開始';
    return `<button class="card" data-open-unit="${esc(unit.id)}" data-unit-course="${esc(course.id)}" style="text-align:left;cursor:pointer;width:100%">
      <div class="eyebrow">Unit ${Number(unit.number || 0)} · ${esc(status)}</div>
      <h3 class="section-title" style="margin:6px 0">${esc(unit.name)}</h3>
      ${(unit.outline || []).length ? `<p class="subtle" style="margin:0">${esc(unit.outline[0])}</p>` : ''}
      ${unit.sourceRange ? `<p class="subtle" style="margin:8px 0 0">教材：${esc(unit.sourceRange)}</p>` : ''}
    </button>`;
  }).join('')}</section>`;
}

function vocabularySummary(course) {
  const vocab = course?.vocabulary;
  if (!vocab || !Number(vocab.total || 0)) return '';
  return `<div class="card"><h3 class="section-title">單字記憶</h3><div class="metric">${Number(vocab.total || 0)} <small>個單字</small></div><p class="subtle" style="margin:8px 0 0">已記住 ${Number(vocab.remembered || 0)} · 練習中 ${Number(vocab.practicing || 0)} · 待複習 ${Number(vocab.reviewing || 0)}</p></div>`;
}

function recentLearning(course) {
  const sessions = course?.sessions || [];
  return `<div class="card"><h3 class="section-title">最近學習</h3>${sessions.length ? sessions.slice(0, 3).map((session) => `<p style="margin:8px 0"><b>${esc(session.date)}</b><br><span class="subtle">${esc(session.title)}</span></p>`).join('') : '<div class="empty">目前沒有可顯示的學習紀錄。</div>'}</div>`;
}

function reviewSummary(course) {
  const queue = course?.reviewQueue || [];
  return `<div class="card"><h3 class="section-title">待複習</h3>${queue.length ? `<ul>${queue.slice(0, 5).map((item) => `<li>${esc(item.text)}</li>`).join('')}</ul>` : '<div class="empty">目前沒有待複習項目。</div>'}</div>`;
}

export function courseView({ course, hierarchyCourse }) {
  const displayCourse = hierarchyCourse || course;
  if (!displayCourse) return `${pageHeader('課程', '找不到這門課程。')}<button class="btn secondary" data-go-subject="1">回學科課程列表</button>`;
  const units = displayCourse.units || [];
  const resume = course?.resume || (displayCourse.status === 'active' ? '依目前進度繼續' : '歷史課程');
  const next = course?.next || '';
  const description = displayCourse.kind || course?.kind || (displayCourse.status === 'active' ? '目前進行中的課程' : '歷史課程');
  return `${pageHeader(displayCourse.name, description)}
    <div class="course-shell">
      <section class="stack">
        <div class="card purple resume"><span class="chip">${displayCourse.status === 'active' ? '目前進度' : '歷史課程'}</span><h2>${esc(resume)}</h2>${next ? `<p>${esc(next)}</p>` : ''}${unitProgress(displayCourse)}<button class="btn secondary" data-go-subject="1" style="margin-top:14px">回學科課程列表</button></div>
        ${units.length ? unitCards(displayCourse) : course?.progress ? `<div>${renderProjectProgress(course.progress)}</div>` : '<div class="card"><div class="empty">這門課目前沒有固定單元課綱。</div></div>'}
      </section>
      <aside class="stack">${vocabularySummary(displayCourse)}${recentLearning(course)}${reviewSummary(course)}</aside>
    </div>`;
}
