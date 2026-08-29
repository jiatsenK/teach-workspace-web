import { esc } from '../lib/html.js';
import { pageHeader, studioNav } from '../components/header.js';

function weeklyCourseSessions(learning, course) {
  return (learning?.weekDays || []).reduce((total, day) => total + (day.sessions || []).filter((session) => session.key === course.key).length, 0);
}

function previewList(items, emptyText, limit = 3) {
  const values = (items || []).map((item) => typeof item === 'string' ? item : item.concept || item.label || '').filter(Boolean).slice(0, limit);
  if (!values.length) return `<p class="subtle" style="margin:8px 0 0">${esc(emptyText)}</p>`;
  return `<ul style="margin:10px 0 0;padding-left:20px">${values.map((value) => `<li>${esc(value)}</li>`).join('')}</ul>`;
}

function summaryCard(course) {
  const progress = course?.progress || {};
  if (course?.progressModel === 'linear-cycle') {
    const current = progress.current || {};
    const position = Number(current.position || 0);
    const total = Number(current.total || 0);
    const progressLabel = course.id === 'korean' ? '教材進度' : '目前進度';
    const unitLabel = course.id === 'korean' ? `第 ${position} 課／共 ${total} 課` : `第 ${position} 項／共 ${total} 項`;
    return `<div class="card"><div class="eyebrow">${progressLabel}</div><div class="metric" style="margin-top:6px">${esc(unitLabel)}</div><p class="subtle" style="margin:8px 0 0">目前：${esc(current.label || '尚未設定')}</p></div>`;
  }
  if (course?.progressModel === 'dynamic-gaps') {
    const currentFocus = progress.currentFocus || [];
    return `<div class="card"><div class="eyebrow">最近常犯的錯誤</div>${previewList(currentFocus, '目前沒有需要特別練習的項目。')}</div>`;
  }
  if (course?.progressModel === 'expanding-map') {
    const items = progress.items || [];
    return `<div class="card"><div class="eyebrow">最近說不順的內容</div>${previewList(items, '目前沒有需要特別練習的內容。')}</div>`;
  }
  return '<div class="card"><div class="empty">目前沒有學習摘要。</div></div>';
}

function focusLabel(course) {
  if (course?.id === 'korean') return '目前課程';
  if (course?.id === 'english') return '這次要練';
  if (course?.id === 'japanese') return '這次要練';
  if (course?.id === 'construction') return '目前主題';
  return '目前學習內容';
}

export function homeView({ learning, course, courseId }) {
  const weekCount = weeklyCourseSessions(learning, course);
  return `${pageHeader('學習首頁', '看目前學到哪裡，以及接下來要做什麼。')}
    <div class="studio">
      ${studioNav(learning.courses || {}, learning.courseOrder || [], courseId)}
      <section class="studio-main">
        <div class="studio-hero">
          <div class="card purple resume">
            <span class="chip">${focusLabel(course)}</span>
            <h2>${esc(course.resume)}</h2>
            <p><b>下一步：</b>${esc(course.next)}</p>
            <button class="btn" data-open-course="${esc(course.id)}">查看學習內容</button>
          </div>
          <div class="card"><div class="eyebrow">本週學習</div><div class="metric">${weekCount} <small>次</small></div></div>
        </div>
        ${summaryCard(course)}
      </section>
    </div>`;
}
