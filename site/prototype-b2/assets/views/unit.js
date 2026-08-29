import { esc } from '../lib/html.js';
import { pageHeader } from '../components/header.js';

function statusLabel(status) {
  if (status === 'done') return '已完成';
  if (status === 'current') return '目前進行';
  return '尚未開始';
}

function contentSection(unit) {
  const items = unit?.content || [];
  if (!items.length) return '<div class="empty">這個單元目前只有課綱資料，尚未擷取教材內容。</div>';
  return `<div class="stack">${items.map((item) => `<div class="card">
    <div class="eyebrow">${esc(item.type || '教材內容')}</div>
    <h3 class="section-title" style="margin:6px 0">${esc(item.label || '本課重點')}</h3>
    <p style="margin:0">${esc(item.explanation)}</p>
    ${item.sourceRange ? `<p class="subtle" style="margin:8px 0 0">來源：${esc(item.sourceRange)}</p>` : ''}
  </div>`).join('')}</div>`;
}

function vocabularySection(unit) {
  const items = unit?.vocabulary || [];
  if (!items.length) return '<div class="empty">這個單元目前尚未整理單字資料。</div>';
  return `<div class="stack">${items.map((item) => `<div class="card" style="padding:12px 14px">
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
      <div><b>${esc(item.word)}</b>${item.form ? ` <span class="subtle">→ ${esc(item.form)}</span>` : ''}<div class="subtle" style="margin-top:4px">${esc(item.meaning)}</div></div>
      <span class="chip">${esc(item.memoryStatus || '未開始')}</span>
    </div>
    ${item.sourceRange ? `<div class="subtle" style="margin-top:6px">來源：${esc(item.sourceRange)}</div>` : ''}
  </div>`).join('')}</div>`;
}

export function unitView({ learning, courseId, unitId }) {
  const hierarchy = learning?.hierarchy || {};
  const course = (hierarchy.courses || []).find((item) => item.id === courseId);
  const unit = course?.units?.find((item) => item.id === unitId);
  if (!course || !unit) return `${pageHeader('找不到單元', '這個單元可能尚未進入 Learning Data。')}<button class="btn secondary" data-go-subject="1">回學科課程列表</button>`;

  const outline = unit.outline || [];
  return `${pageHeader(`第 ${unit.number} 課｜${unit.name}`, course.name)}
    <div class="stack">
      <div class="card">
        <div class="eyebrow">單元資訊</div>
        <p style="margin:8px 0 0"><b>${esc(statusLabel(unit.status))}</b>${unit.sourceRange ? `｜教材範圍：${esc(unit.sourceRange)}` : ''}</p>
        ${outline.length ? `<div style="margin-top:10px">${outline.map((text) => `<p style="margin:4px 0">${esc(text)}</p>`).join('')}</div>` : ''}
      </div>
      <section>
        <h2 class="section-title">本課內容</h2>
        ${contentSection(unit)}
      </section>
      <section>
        <h2 class="section-title">單字與記憶狀態</h2>
        ${vocabularySection(unit)}
      </section>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn secondary" data-go-subject="1">回學科課程列表</button>
        <button class="btn secondary" data-open-course="${esc(course.id)}">看完整課程</button>
      </div>
    </div>`;
}
