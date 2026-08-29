const CONSTRUCTION_TRACKS = Object.freeze({
  'Underground excavation water-failure mechanisms': Object.freeze({
    title: '地下開挖地下水破壞機制',
    steps: Object.freeze({
      '01': '開挖與地下水流動',
      '02': '管湧形成機制',
      '03': '砂湧形成機制',
      '04': '區分管湧、砂湧、隆起與上浮',
      '05': '滲流異常如何逐步惡化',
      '06': '緊急與預防措施',
      '07': '綜合考題驗證',
    }),
  }),
});

function currentStep(progress) {
  const steps = progress?.steps || [];
  return steps.find((step) => step.status === 'current') || steps[Math.max(0, Number(progress?.current?.position || 1) - 1)] || null;
}

function listValues(items, limit = 3) {
  return (items || [])
    .map((item) => typeof item === 'string' ? item : item?.concept || item?.label || '')
    .filter(Boolean)
    .slice(0, limit);
}

function constructionSummary(course) {
  const progress = course?.progress || {};
  const track = CONSTRUCTION_TRACKS[String(progress.label || '')] || null;
  const step = currentStep(progress);
  const position = Number(progress?.current?.position || 0);
  const total = Number(progress?.current?.total || 0);
  const stepTitle = track?.steps?.[String(step?.id || '')] || (position ? `第 ${position} 個學習目標` : '目前學習目標');
  const trackTitle = track?.title || '目前營造學習主題';
  const localizedProgress = {
    ...progress,
    label: trackTitle,
    current: progress.current ? { ...progress.current, label: stepTitle } : null,
    steps: (progress.steps || []).map((item, index) => ({
      ...item,
      label: track?.steps?.[String(item.id || '')] || `第 ${index + 1} 個學習目標`,
    })),
  };

  return {
    focusLabel: '正在學',
    focus: stepTitle,
    next: step ? `完成「${stepTitle}」後，再進入下一個學習目標。` : '目前主題已完成。',
    summaryMode: 'progress',
    summaryTitle: '目前進度',
    progressValue: total ? `第 ${position} 項／共 ${total} 項` : '尚未建立進度',
    progressDetail: trackTitle,
    summaryItems: [],
    priority: `先把「${stepTitle}」弄懂並能自己說明。`,
    progress: localizedProgress,
  };
}

function koreanSummary(course) {
  const progress = course?.progress || {};
  const step = currentStep(progress);
  const unitMatch = String(step?.id || '').match(/^U(\d+)$/i);
  const unit = unitMatch ? Number(unitMatch[1]) : Number(progress?.current?.position || 0);
  const total = Number(progress?.current?.total || 0);
  const unitLabel = unit ? `第 ${unit} 課` : '目前課次';
  const localizedProgress = {
    ...progress,
    label: '教科書進度',
    current: progress.current ? { ...progress.current, label: unitLabel } : null,
  };

  return {
    focusLabel: '目前課程',
    focus: `${course.name}｜${unitLabel}`,
    next: unit ? `繼續第 ${unit} 課。` : '依教科書主線繼續。',
    summaryMode: 'progress',
    summaryTitle: '教材進度',
    progressValue: total ? `${unitLabel}／共 ${total} 課` : unitLabel,
    progressDetail: course.name,
    summaryItems: [],
    priority: '照目前教科書進度繼續。',
    progress: localizedProgress,
  };
}

function englishSummary(course) {
  const progress = course?.progress || {};
  const items = listValues(progress.currentFocus, 3);
  const first = items[0] || '英文口說練習';
  return {
    focusLabel: '這次先練',
    focus: first,
    next: items.length ? `先用「${first}」做口說或造句練習。` : '從最近的口說內容繼續練習。',
    summaryMode: 'list',
    summaryTitle: '最近常犯的錯誤',
    progressValue: '',
    progressDetail: '',
    summaryItems: items,
    priority: '先處理最近實際說錯或容易卡住的內容。',
    progress,
  };
}

function japaneseSummary(course) {
  const progress = course?.progress || {};
  const active = (progress.items || []).find((item) => item.status === 'PRACTICING') || (progress.items || [])[0] || null;
  const items = listValues(progress.items, 3);
  const focus = active?.concept || '日文口說練習';
  return {
    focusLabel: '這次先練',
    focus,
    next: active ? `換一個新話題，再練一次「${focus}」。` : '從新話題繼續做無提示口說。',
    summaryMode: 'list',
    summaryTitle: '最近說不順的內容',
    progressValue: '',
    progressDetail: '',
    summaryItems: items,
    priority: '用實際口說確認哪些詞和表達還叫不出來。',
    progress,
  };
}

export function buildLearnerSummary(course) {
  if (course?.id === 'construction') return constructionSummary(course);
  if (course?.id === 'korean') return koreanSummary(course);
  if (course?.id === 'english') return englishSummary(course);
  if (course?.id === 'japanese') return japaneseSummary(course);
  return {
    focusLabel: '目前學習',
    focus: course?.name || '目前課程',
    next: '依目前進度繼續。',
    summaryMode: 'progress',
    summaryTitle: '目前進度',
    progressValue: '尚未建立進度',
    progressDetail: '',
    summaryItems: [],
    priority: '依目前進度繼續。',
    progress: course?.progress || null,
  };
}
