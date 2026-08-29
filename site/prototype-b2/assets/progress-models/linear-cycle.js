import { esc } from '../lib/html.js';

function readableLabel(value) {
  return String(value || '').replace(/\bUnit\s+(\d+)\b/gi, '第 $1 課').replace(/\bCourse complete\b/gi, '課程已完成').replace(/\bCurrent cycle\b/gi, '學習進度');
}

function stepLabel(step, isUnitTrack) {
  const id = String(step?.id || '');
  if (isUnitTrack) {
    const match = id.match(/^U(\d+)$/i);
    if (match) return `第${Number(match[1])}課`;
  }
  return id;
}

export function renderLinearCycle(progress) {
  const current = progress?.current || {};
  const total = Number(current.total || 0);
  const position = Number(current.position || 0);
  const allSteps = progress?.steps || [];
  const isUnitTrack = allSteps.some((step) => /^U\d+$/i.test(String(step.id || '')));
  const dots = allSteps.map((step, index) => {
    const dot = `<i class="dot ${step.status === 'done' ? 'done' : step.status === 'current' ? 'current' : ''}" title="${esc(readableLabel(step.label))}"></i>`;
    return index === 0 ? dot : `<i class="seg"></i>${dot}`;
  }).join('');
  const steps = allSteps.map((step) => `<span class="exam ${step.status === 'done' ? 'done' : step.status === 'current' ? 'current' : ''}" title="${esc(readableLabel(step.label))}">${esc(stepLabel(step, isUnitTrack))}${step.status === 'done' ? ' ✓' : step.status === 'current' ? ' ◐' : ''}</span>`).join('');
  const secondary = progress?.secondary;

  return `<div class="track-box">
    <div class="track-head"><b>${esc(readableLabel(progress?.label || '學習進度'))}</b><span>${position} / ${total}</span></div>
    <div class="dots">${dots || '<span class="tiny">目前還沒有進度資料</span>'}</div>
    <div class="tiny">目前：${esc(readableLabel(current.label || ''))}</div>
    <div class="exam-years" style="margin-top:8px">${steps}</div>
  </div>
  ${secondary ? `<div style="height:16px"></div><div class="track-head"><b>${esc(readableLabel(secondary.label))}</b><span>${esc(secondary.currentLabel ? `${secondary.currentLabel} 進行中` : '')}</span></div><div class="exam-years">${(secondary.items || []).map((item) => `<span class="exam ${item.status === 'done' ? 'done' : item.status === 'current' ? 'current' : ''}" title="${esc(readableLabel(item.detail))}">${esc(readableLabel(item.label))}${item.status === 'done' ? ' ✓' : item.status === 'current' ? ' ◐' : ''}</span>`).join('')}</div>` : ''}`;
}
