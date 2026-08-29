const VARIANTS = [
  { key: 'A', name: '索引全景' },
  { key: 'B', name: '首頁＋閱讀器 B2' },
  { key: 'C', name: '學習工作台' },
];

export function prototypeSwitcher({ variant, subject, course, unit, pathLabel = '' }) {
  const currentIndex = VARIANTS.findIndex((item) => item.key === variant);
  const previous = VARIANTS[(currentIndex + VARIANTS.length - 1) % VARIANTS.length];
  const next = VARIANTS[(currentIndex + 1) % VARIANTS.length];
  const current = VARIANTS[currentIndex];
  const path = pathLabel || [subject?.name, course?.short || course?.name, unit ? `Unit ${unit.number}` : ''].filter(Boolean).join(' / ');
  return `<aside class="proto-switcher" aria-label="Prototype 版本切換">
    <div class="proto-switcher__state"><span>目前路徑</span><strong>${path || '尚未選擇'}</strong></div>
    <div class="proto-switcher__controls">
      <button type="button" data-proto-variant="${previous.key}" aria-label="上一個 Prototype">←</button>
      <div><span>Prototype ${current.key}</span><strong>${current.name}</strong></div>
      <button type="button" data-proto-variant="${next.key}" aria-label="下一個 Prototype">→</button>
    </div>
  </aside>`;
}

export function variantKey(value) {
  const key = String(value || 'A').toUpperCase();
  return VARIANTS.some((item) => item.key === key) ? key : 'A';
}
