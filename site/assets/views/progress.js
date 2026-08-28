import { pageHeader } from '../components/header.js';
import { reviewQueue } from '../components/review-queue.js';
import { heatmap } from '../components/heatmap.js';
import { sessionCard } from '../components/session-card.js';

export function progressView({ course, monthly }) {
  const history = course?.historySessions || [];
  return `${pageHeader(`${course.short}｜進度與歷史`, '這裡只回答兩件事：現在該複習什麼，以及之前實際學過什麼。')}
    ${reviewQueue(course.reviewQueue || [])}
    ${heatmap(monthly, course.key)}
    <section>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Session history</div>
      ${history.length ? history.map(sessionCard).join('') : '<div class="empty">尚無正式 Session。</div>'}
    </section>`;
}
