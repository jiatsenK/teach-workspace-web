import { esc } from '../lib/html.js';
import { pageHeader } from '../components/header.js';

export function homeView({ learning }) {
  const subjects = learning?.hierarchy?.subjects || [];
  return `${pageHeader('學習首頁', '先選學科，再進入目前課程或歷史課程。')}
    <div class="stack">
      ${subjects.length ? subjects.map((subject) => {
        const currentCount = (subject.currentCourseIds || []).length;
        const historyCount = (subject.historyCourseIds || []).length;
        return `<button class="card" data-open-subject="${esc(subject.id)}" style="text-align:left;width:100%;cursor:pointer">
          <div class="eyebrow">學科</div>
          <h2 class="section-title" style="margin:6px 0">${esc(subject.name)}</h2>
          <p class="subtle" style="margin:0">進行中 ${currentCount} 門${historyCount ? `｜歷史 ${historyCount} 門` : ''}</p>
        </button>`;
      }).join('') : '<div class="empty">目前沒有可顯示的學科。</div>'}
    </div>`;
}
