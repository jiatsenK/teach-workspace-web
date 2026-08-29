import { esc, learnerText } from '../lib/html.js';
import { pageHeader } from '../components/header.js';
import { renderProjectProgress } from '../progress-models/index.js';

function readableText(course, value) {
  let text = learnerText(value);
  if (course?.id === 'korean') {
    text = text.replace(/\bUnit\s+(\d+)\b/gi, '第 $1 課').replace(/\bCourse complete\b/gi, '課程已完成');
  }
  return text;
}

function evidenceSummary(course) {
  const items = course?.evidence || [];
  if (!items.length) return '<div class="empty">目前沒有可顯示的學習狀況。</div>';
  return `<div class="evidence">${items.map((item) => `<div class="evidence-item"><span class="${item.status === 'ok' ? 'status-ok' : 'status-warn'}">${item.status === 'ok' ? '✓' : '△'}</span><span>${esc(readableText(course, item.text))}</span></div>`).join('')}</div>`;
}

export function courseView({ course }) {
  return `${pageHeader(course.name, '查看目前進度、下一步與需要注意的內容。')}
    <div class="course-shell">
      <section class="stack">
        <div class="card purple resume">
          <span class="chip">接著從這裡開始</span>
          <h2>${esc(readableText(course, course.resume))}</h2>
          <p><b>下一步：</b>${esc(readableText(course, course.next))}</p>
          <button class="btn secondary" data-go-home="1">回首頁</button>
        </div>
        <div>${renderProjectProgress(course.progress)}</div>
      </section>
      <aside class="stack">
        <div class="card"><h3 class="section-title">現在最重要</h3><b style="font-size:13px">${esc(readableText(course, course.priority))}</b><p class="side-note" style="margin-top:8px">這裡只顯示目前最需要處理的內容。</p></div>
        <div class="card"><h3 class="section-title">學習狀況</h3>${evidenceSummary(course)}</div>
      </aside>
    </div>`;
}
