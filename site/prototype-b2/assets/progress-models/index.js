import { renderLinearCycle } from './linear-cycle.js';
import { renderDynamicGaps } from './dynamic-gaps.js';
import { renderExpandingMap } from './expanding-map.js';

export function renderProjectProgress(progress) {
  if (!progress) return '<div class="empty">尚無進度資料。</div>';
  if (progress.model === 'linear-cycle') return renderLinearCycle(progress);
  if (progress.model === 'dynamic-gaps') return renderDynamicGaps(progress);
  if (progress.model === 'expanding-map') return renderExpandingMap(progress);
  return '<div class="empty">目前沒有可顯示的進度內容。</div>';
}
