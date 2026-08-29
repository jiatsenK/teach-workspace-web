import { pageHeader } from '../components/header.js';
import { reviewQueue } from '../components/review-queue.js';
import { heatmap } from '../components/heatmap.js';
import { sessionCard } from '../components/session-card.js';

export function progressView({ course, monthly }) {
  const history = course?.historySessions || [];
  return `${pageHeader(`${course.short}｜學習紀錄`, '看最近需要再複習什麼，以及之前實際學過哪些內容。')}
    ${reviewQueue(course.reviewQueue || [])}
    ${heatmap(monthly, course.key)}
    <section>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">過去的學習紀錄</div>
      ${history.length ? history.map(sessionCard).join('') : '<div class="empty">目前還沒有學習紀錄。</div>'}
    </section>`;
}
