import { esc } from '../lib/html.js';

function gapList(items, emptyText) {
  if (!(items || []).length) return `<div class="empty">${esc(emptyText)}</div>`;
  return `<div style="display:grid;gap:8px">${items.map((item) => `<div style="padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:#faf8f3;font-size:12px;line-height:1.5">${esc(item)}</div>`).join('')}</div>`;
}

export function renderDynamicGaps(progress) {
  return `<div class="grid2">
    <section class="card soft"><div class="eyebrow">這次先練這些</div><h3 class="section-title" style="margin-top:5px">最近常犯的錯誤</h3>${gapList(progress?.currentFocus, '目前沒有需要特別練習的內容。')}</section>
    <section class="card"><div class="eyebrow">反覆出現</div><h3 class="section-title" style="margin-top:5px">一直容易出錯的地方</h3>${gapList(progress?.persistentPatterns, '目前沒有反覆出現的錯誤。')}</section>
  </div>`;
}
