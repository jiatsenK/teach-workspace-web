import { esc } from '../lib/html.js';

export function pageHeader(title, description) {
  return `<div class="eyebrow">我的學習</div><h1 class="page-title">${esc(title)}</h1><p class="lead">${esc(description)}</p>`;
}

export function studioNav(courses, courseOrder, activeCourseId) {
  return `<div class="studio-nav">${(courseOrder || []).filter((id) => courses[id]).map((id) => {
    const course = courses[id];
    return `<button data-course="${esc(id)}" class="${activeCourseId === id ? 'active' : ''}"><span>${esc(course.short)}</span><span>›</span></button>`;
  }).join('')}</div>`;
}

export function viewBar(activeView) {
  return [
    ['home', '學習首頁'],
    ['course', '學習內容'],
    ['progress', '學習紀錄'],
    ['rhythm', '本月學習'],
  ].map(([key, label]) => `<button data-view="${key}" class="${activeView === key ? 'active' : ''}">${label}</button>`).join('');
}
