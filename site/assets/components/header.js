import { esc } from '../lib/html.js';

export function pageHeader(title, description) {
  return `<div class="eyebrow">Learning workspace</div><h1 class="page-title">${esc(title)}</h1><p class="lead">${esc(description)}</p>`;
}

export function studioNav(courses, courseOrder, activeCourseId) {
  return `<div class="studio-nav">${(courseOrder || []).filter((id) => courses[id]).map((id) => {
    const course = courses[id];
    return `<button data-course="${esc(id)}" class="${activeCourseId === id ? 'active' : ''}"><span>${esc(course.short)}</span><span>›</span></button>`;
  }).join('')}</div>`;
}

export function viewBar(activeView) {
  return [
    ['home', 'Learning Home'],
    ['course', 'Course Workspace'],
    ['progress', 'Progress / History'],
    ['rhythm', '本月學習狀況'],
  ].map(([key, label]) => `<button data-view="${key}" class="${activeView === key ? 'active' : ''}">${label}</button>`).join('');
}
