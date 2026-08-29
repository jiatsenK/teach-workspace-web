import { esc } from '../lib/html.js';
import { buildLearnerSummary } from '../lib/learner-summary.js';
import { pageHeader, studioNav } from '../components/header.js';

function weeklyCourseSessions(learning, course) {
  return (learning?.weekDays || []).reduce((total, day) => total + (day.sessions || []).filter((session) => session.key === course.key).length, 0);
}

function previewList(items, emptyText) {
  if (!(items || []).length) return `<p class="subtle" style="margin:8px 0 0">${esc(emptyText)}</p>`;
  return `<ul style="margin:10px 0 0;padding-left:20px">${items.map((value) => `<li>${esc(value)}</li>`).join('')}</ul>`;
}

function summaryCard(summary) {
  if (summary.summaryMode === 'list') {
    return `<div class="card"><div class="eyebrow">${esc(summary.summaryTitle)}</div>${previewList(summary.summaryItems, '目前沒有需要特別練習的內容。')}</div>`;
  }
  return `<div class="card"><div class="eyebrow">${esc(summary.summaryTitle)}</div><div class="metric" style="margin-top:6px">${esc(summary.progressValue)}</div>${summary.progressDetail ? `<p class="subtle" style="margin:8px 0 0">${esc(summary.progressDetail)}</p>` : ''}</div>`;
}

export function homeView({ learning, course, courseId }) {
  const weekCount = weeklyCourseSessions(learning, course);
  const summary = buildLearnerSummary(course);
  return `${pageHeader('學習首頁', '看目前學到哪裡，以及接下來要做什麼。')}
    <div class="studio">
      ${studioNav(learning.courses || {}, learning.courseOrder || [], courseId)}
      <section class="studio-main">
        <div class="studio-hero">
          <div class="card purple resume">
            <span class="chip">${esc(summary.focusLabel)}</span>
            <h2>${esc(summary.focus)}</h2>
            <p><b>下一步：</b>${esc(summary.next)}</p>
            <button class="btn" data-open-course="${esc(course.id)}">查看學習內容</button>
          </div>
          <div class="card"><div class="eyebrow">本週學習</div><div class="metric">${weekCount} <small>次</small></div></div>
        </div>
        ${summaryCard(summary)}
      </section>
    </div>`;
}
