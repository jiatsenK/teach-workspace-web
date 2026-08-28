import { esc } from '../lib/html.js';

function gapList(items, emptyText) {
  if (!(items || []).length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div style="display:grid;gap:8px">${items.map((item) => `<div style="padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:#faf8f3;font-size:12px;line-height:1.5">${esc(item)}</div>`).join('')}</div>`;
}

export function renderDynamicGaps(progress) {
  return `<div class="grid2">
    <section class="card soft"><div class="eyebrow">CURRENT FOCUS</div><h3 class="section-title" style="margin-top:5px">目前鎖定弱點</h3>${gapList(progress?.currentFocus, '目前沒有 active retrieval candidates。')}</section>
    <section class="card"><div class="eyebrow">PERSISTENT</div><h3 class="section-title" style="margin-top:5px">長期反覆模式</h3>${gapList(progress?.persistentPatterns, '目前沒有 persistent misconceptions。')}</section>
  </div>`;
}
