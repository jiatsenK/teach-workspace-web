import { esc } from '../lib/html.js';

export function renderLinearCycle(progress) {
  const current = progress?.current || {};
  const total = Number(current.total || 0);
  const position = Number(current.position || 0);
  const dots = (progress?.steps || []).map((step, index) => {
    const dot = `<i class="dot ${step.status === 'done' ? 'done' : step.status === 'current' ? 'current' : ''}" title="${esc(step.label)}"></i>`;
    return index === 0 ? dot : `<i class="seg"></i>${dot}`;
  }).join('');
  const steps = (progress?.steps || []).map((step) => `<span class="exam ${step.status === 'done' ? 'done' : step.status === 'current' ? 'current' : ''}" title="${esc(step.label)}">${esc(step.id)}${step.status === 'done' ? ' ✓' : step.status === 'current' ? ' ◐' : ''}</span>`).join('');
  const secondary = progress?.secondary;

  return `<div class="track-box">
    <div class="track-head"><b>${esc(progress?.label || 'Current cycle')}</b><span>${position} / ${total}</span></div>
    <div class="dots">${dots || '<span class="tiny">尚無線性進度</span>'}</div>
    <div class="tiny">目前：${esc(current.label || '')}</div>
    <div class="exam-years" style="margin-top:8px">${steps}</div>
  </div>
  ${secondary ? `<div style="height:16px"></div><div class="track-head"><b>${esc(secondary.label)}</b><span>${esc(secondary.currentLabel ? `${secondary.currentLabel} 進行中` : '')}</span></div><div class="exam-years">${(secondary.items || []).map((item) => `<span class="exam ${item.status === 'done' ? 'done' : item.status === 'current' ? 'current' : ''}" title="${esc(item.detail)}">${esc(item.label)}${item.status === 'done' ? ' ✓' : item.status === 'current' ? ' ◐' : ''}</span>`).join('')}</div>` : ''}`;
}
