import { esc, formatDate, splitScopeTags } from '../lib/html.js';

export function sessionCard(session) {
  const tags = splitScopeTags(session?.learningScope || session?.title);
  return `<article class="card soft" style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
      <span style="font-weight:800;font-size:13px">${esc(session?.track || '學習紀錄')}</span>
      <span class="tiny">${esc(formatDate(session?.date))}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 6px">${tags.map((tag) => `<span style="background:var(--purple-soft);color:#59468d;font-size:11px;padding:4px 8px;border-radius:999px;border:1px solid #d8ceed">${esc(tag)}</span>`).join('')}</div>
  </article>`;
}
