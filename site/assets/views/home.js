import { esc } from '../lib/html.js';
import { pageHeader, studioNav } from '../components/header.js';

function weeklyCourseSessions(learning, course) {
  return (learning?.weekDays || []).reduce((total, day) => total + (day.sessions || []).filter((session) => session.key === course.key).length, 0);
}

function summaryCard(course) {
  const progress = course?.progress || {};
  if (course?.progressModel === 'linear-cycle') {
    const current = progress.current || {};
    return `<div class="card"><div class="eyebrow">CURRENT CYCLE</div><div class="metric" style="margin-top:6px">${Number(current.position || 0)} <small>/ ${Number(current.total || 0)}</small></div><p class="subtle" style="margin:8px 0 0">${esc(current.label || '')}</p></div>`;
  }
  if (course?.progressModel === 'dynamic-gaps') {
    const active = (progress.currentFocus || []).length;
    const persistent = (progress.persistentPatterns || []).length;
    return `<div class="card"><div class="eyebrow">ACTIVE GAPS</div><div class="metric" style="margin-top:6px">${active} <small>current</small></div><p class="subtle" style="margin:8px 0 0">另有 ${persistent} 項長期反覆模式</p></div>`;
  }
  if (course?.progressModel === 'expanding-map') {
    const items = progress.items || [];
    const practicing = items.filter((item) => item.status === 'PRACTICING').length;
    return `<div class="card"><div class="eyebrow">ACTIVE MAP</div><div class="metric" style="margin-top:6px">${items.length} <small>gaps</small></div><p class="subtle" style="margin:8px 0 0">${practicing} 項正在練習</p></div>`;
  }
  return '<div class="card"><div class="empty">尚無摘要。</div></div>';
}

export function homeView({ learning, course, courseId }) {
  const weekCount = weeklyCourseSessions(learning, course);
  return `${pageHeader('Learning Studio', '先看現在要去哪裡，再進入 Project 深度資料或歷史複習。')}
    <div class="studio">
      ${studioNav(learning.courses || {}, learning.courseOrder || [], courseId)}
      <section class="studio-main">
        <div class="studio-hero">
          <div class="card purple resume">
            <span class="chip">${esc(course.kind)}</span>
            <h2>${esc(course.resume)}</h2>
            <p>${esc(course.next)}</p>
            <button class="btn" data-open-course="${esc(course.id)}">進入這個 Project</button>
          </div>
          <div class="card"><div class="eyebrow">THIS WEEK</div><div class="metric">${weekCount} <small>${weekCount === 1 ? 'Session' : 'Sessions'}</small></div></div>
        </div>
        ${summaryCard(course)}
      </section>
    </div>`;
}
