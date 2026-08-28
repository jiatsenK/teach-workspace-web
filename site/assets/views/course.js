import { esc } from '../lib/html.js';
import { pageHeader } from '../components/header.js';
import { renderProjectProgress } from '../progress-models/index.js';

function evidenceSummary(course) {
  const items = course?.evidence || [];
  if (!items.length) return '<div class="empty">目前沒有 evidence summary。</div>';
  return `<div class="evidence">${items.map((item) => `<div class="evidence-item"><span class="${item.status === 'ok' ? 'status-ok' : 'status-warn'}">${item.status === 'ok' ? '✓' : '△'}</span><span>${esc(item.text)}</span></div>`).join('')}</div>`;
}

export function courseView({ course }) {
  return `${pageHeader(course.name, `Active Project Workspace · ${course.progressModel}`)}
    <div class="course-shell">
      <section class="stack">
        <div class="card purple resume">
          <span class="chip">RESUME POINT</span>
          <h2>${esc(course.resume)}</h2>
          <p>${esc(course.next)}</p>
          <button class="btn secondary" data-go-home="1">回首頁</button>
        </div>
        <div>${renderProjectProgress(course.progress)}</div>
      </section>
      <aside class="stack">
        <div class="card"><h3 class="section-title">Current priority</h3><b style="font-size:13px">${esc(course.priority)}</b><p class="side-note" style="margin-top:8px">這裡只呈現目前 Project 的行動焦點。</p></div>
        <div class="card"><h3 class="section-title">Learning evidence</h3>${evidenceSummary(course)}</div>
      </aside>
    </div>`;
}
