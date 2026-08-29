import { esc } from '../lib/html.js';

export function reviewQueue(items) {
  const list = items || [];
  return `<div class="card" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span style="font-weight:800;font-size:14px">最近需要再複習</span>
      <span class="tiny">從過去的學習紀錄整理</span>
    </div>
    ${list.length ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${list.map((item) => `<span title="${esc(item.date)}" style="background:#fbefdc;color:#8f6015;font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid #eccf9f">${esc(item.text)}</span>`).join('')}</div>` : '<div class="empty">目前沒有需要再複習的內容。</div>'}
  </div>`;
}
