import { esc } from '../lib/html.js';

export function heatmap(monthly, projectKey) {
  const month = monthly?.month;
  if (!month?.year || !month?.month) return '<div class="empty">沒有可用的學習節奏資料。</div>';
  const counts = {};
  (monthly.days || []).forEach((day) => {
    const own = (day.sessions || []).filter((session) => session.key === projectKey);
    counts[day.date] = own.reduce((sum, session) => sum + Number(session.count || 0), 0);
  });
  const daysInMonth = new Date(Number(month.year), Number(month.month), 0).getDate();
  const cells = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${month.year}-${String(month.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = Number(counts[date] || 0);
    const opacity = count <= 0 ? 0 : Math.min(0.22 + count * 0.22, 0.9);
    cells.push(`<span title="${esc(date)}${count ? ` · 學習 ${count} 次` : ''}" style="display:block;aspect-ratio:1;border-radius:3px;background:${count ? `rgba(110,90,166,${opacity})` : 'transparent'}"></span>`);
  }
  return `<div style="margin-bottom:18px"><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${esc(month.label)}學習節奏</div><div style="display:grid;grid-template-columns:repeat(${daysInMonth},minmax(6px,1fr));gap:3px;align-items:center">${cells.join('')}</div></div>`;
}
