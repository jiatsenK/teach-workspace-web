import { esc } from '../lib/html.js';

function taipeiToday() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const map = {};
    parts.forEach((item) => { map[item.type] = item.value; });
    return `${map.year}-${map.month}-${map.day}`;
  } catch (_) {
    return '';
  }
}

function monthCalendar(monthly) {
  const year = Number(monthly?.month?.year || 0);
  const month = Number(monthly?.month?.month || 0);
  if (!year || !month) return '<div class="empty">無法建立月曆。</div>';
  const eventMap = {};
  (monthly.days || []).forEach((day) => { eventMap[day.date] = day.sessions || []; });
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const today = taipeiToday();
  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cells.push('<div class="calendar-cell empty"></div>');
      continue;
    }
    const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const sessions = eventMap[date] || [];
    const events = sessions.map((session) => `<span class="calendar-event">${esc(session.name)}${Number(session.count || 0) > 1 ? ` ×${Number(session.count)}` : ''}</span>`).join('');
    cells.push(`<div class="calendar-cell ${date === today ? 'today' : ''}"><div class="calendar-date">${dayNumber}</div><div class="calendar-events">${events}</div></div>`);
  }
  return `<div class="card calendar-card"><div class="calendar-wrap"><div class="month-calendar"><div class="calendar-weekdays">${['日', '一', '二', '三', '四', '五', '六'].map((item) => `<div class="calendar-weekday">週${item}</div>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div></div></div><div class="calendar-note">月曆只顯示正式 <code>SESSION_LOG</code> 紀錄。</div></div>`;
}

export function monthView({ monthly }) {
  if (!monthly) return '<div class="loading" style="min-height:260px">正在整理本月 Session…</div>';
  return `<div class="eyebrow">Learning workspace</div><div class="month-title-row"><h1 class="page-title">本月學習狀況</h1><span class="month-tag">${esc(monthly.month?.label || '本月')}</span></div>
    <div class="month-summary">
      <div class="card"><div class="summary-label">本月 Session</div><div class="summary-number">${Number(monthly.totalSessions || 0)}</div></div>
      <div class="card"><div class="summary-label">學習日</div><div class="summary-number">${Number(monthly.activeDays || 0)}</div></div>
      <div class="card"><div class="summary-label">有紀錄課程</div><div class="summary-number">${Number(monthly.activeCourses || 0)} / ${Number(monthly.totalCourses || 0)}</div></div>
    </div>${monthCalendar(monthly)}`;
}
