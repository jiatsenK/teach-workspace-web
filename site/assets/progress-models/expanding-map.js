import { esc } from '../lib/html.js';

function group(items, status, label) {
  const list = (items || []).filter((item) => item.status === status);
  return `<section class="card ${status === 'PRACTICING' ? 'purple' : 'soft'}"><div class="eyebrow">${esc(status)}</div><h3 class="section-title" style="margin-top:5px">${esc(label)}</h3>${list.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${list.map((item) => `<div style="max-width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper)"><b style="display:block;font-size:12px">${esc(item.concept)}</b><span class="tiny">${esc(item.type)} · ${esc(item.action)}</span></div>`).join('')}</div>` : '<div class="empty">目前沒有項目。</div>'}</section>`;
}

export function renderExpandingMap(progress) {
  const items = progress?.items || [];
  return `<div class="grid2">${group(items, 'PRACTICING', '正在練習')}${group(items, 'NEW', '新發現的表達邊界')}</div>`;
}
