const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

const params = new URLSearchParams(location.search);
const state = { learning: null, monthly: null };

function allCourseIds(subject) {
  return [...(subject?.currentCourseIds || []), ...(subject?.historyCourseIds || [])];
}

function context() {
  const subjects = state.learning?.hierarchy?.subjects || [];
  const courses = state.learning?.hierarchy?.courses || [];
  const courseMap = Object.fromEntries(courses.map((course) => [course.id, course]));
  const selectedSubject = subjects.find((item) => item.id === params.get('psubject')) || subjects[0];
  const subjectCourseIds = allCourseIds(selectedSubject);
  const selectedCourse = courseMap[params.get('pcourse')] && subjectCourseIds.includes(params.get('pcourse'))
    ? courseMap[params.get('pcourse')]
    : courseMap[subjectCourseIds[0]];
  const selectedUnit = (selectedCourse?.units || []).find((item) => item.id === params.get('punit'))
    || (selectedCourse?.units || []).find((item) => item.status === 'current')
    || selectedCourse?.units?.[0];
  const selectedCoursePayload = state.learning?.courses?.[selectedCourse?.id] || null;
  return { subjects, courseMap, selectedSubject, selectedCourse, selectedUnit, selectedCoursePayload };
}

function setParams(changes) {
  Object.entries(changes).forEach(([key, value]) => {
    if (value) params.set(key, value); else params.delete(key);
  });
  const url = new URL(location.href);
  url.search = params.toString();
  history.replaceState({}, '', url);
  render();
}

function topbar(section) {
  return `<header class="b2-topbar">
    <button type="button" class="b2-brand" data-proto-home aria-label="回到學習首頁"><span class="b-character" aria-hidden="true"><i></i></span><strong>我的學習</strong></button>
    <nav aria-label="全域頁面">
      <button type="button" data-proto-home class="${!section ? 'is-active' : ''}">首頁</button>
      <button type="button" data-proto-section="month" class="${section === 'month' ? 'is-active' : ''}">本月學習狀況</button>
    </nav>
  </header>`;
}

function homeView(subjects, courseMap) {
  return `<main class="b2-home">
    <section class="b2-opening">
      <div><h1>今天想打開哪一門？</h1><p>首頁先保留所有學科。選一門後，目錄和課文會在同一個閱讀畫面裡出現。</p></div>
      <aside><strong>先選，再專心讀一頁。</strong></aside>
    </section>
    <nav class="b2-subject-grid" aria-label="選擇學科">${subjects.map((subject, index) => {
      const courses = allCourseIds(subject).map((id) => courseMap[id]).filter(Boolean);
      return `<button type="button" data-proto-subject="${esc(subject.id)}" class="b2-subject b2-subject--${(index % 4) + 1}">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <strong>${esc(subject.name)}</strong>
        <small>${courses.length} 門課程 · ${esc(courses[0]?.name || '目前沒有課程')}</small>
        <b>打開 →</b>
      </button>`;
    }).join('')}</nav>
    <footer class="b2-statement"><p>首頁負責選方向，閱讀器只負責讓你看懂一課。</p></footer>
  </main>`;
}

function monthCalendar(monthly) {
  const year = Number(monthly?.month?.year || 0);
  const month = Number(monthly?.month?.month || 0);
  if (!year || !month) return '<div class="b2-chart-empty">目前沒有可顯示的月份資料。</div>';
  const eventMap = Object.fromEntries((monthly.days || []).map((day) => [day.date, day.sessions || []]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) { cells.push('<div class="b2-calendar__cell is-empty"></div>'); continue; }
    const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const events = (eventMap[date] || []).map((item) => `<span>${esc(item.name)}${Number(item.count || 0) > 1 ? ` ×${Number(item.count)}` : ''}</span>`).join('');
    cells.push(`<div class="b2-calendar__cell"><b>${dayNumber}</b><div>${events}</div></div>`);
  }
  return `<div class="b2-calendar"><div class="b2-calendar__week">${['日','一','二','三','四','五','六'].map((day) => `<span>週${day}</span>`).join('')}</div><div class="b2-calendar__grid">${cells.join('')}</div></div>`;
}

function monthCourseChart(monthly) {
  const courses = monthly?.courses || [];
  if (!courses.length) return '<div class="b2-chart-empty">目前沒有課程統計。</div>';
  const maxSessions = Math.max(1, ...courses.map((course) => Number(course.sessions || 0)));
  return `<div class="b2-course-bars" aria-label="各課程本月學習次數">${courses.map((course) => {
    const sessions = Number(course.sessions || 0);
    const width = Math.round((sessions / maxSessions) * 100);
    return `<div class="b2-course-bar"><strong>${esc(course.short || course.name)}</strong><div class="b2-course-bar__track"><div class="b2-course-bar__fill" style="--bar:${width}%"></div></div><span>${sessions}</span></div>`;
  }).join('')}</div>`;
}

function monthRhythmChart(monthly) {
  const year = Number(monthly?.month?.year || 0);
  const month = Number(monthly?.month?.month || 0);
  if (!year || !month) return '<div class="b2-chart-empty">目前沒有學習節奏資料。</div>';
  const counts = Object.fromEntries((monthly.days || []).map((day) => [day.date, (day.sessions || []).reduce((sum, item) => sum + Number(item.count || 1), 0)]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const series = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, count: Number(counts[date] || 0) };
  });
  const maxCount = Math.max(1, ...series.map((item) => item.count));
  return `<div class="b2-daily-rhythm"><p>每天實際打開課程的次數，空白日也保留。</p><div class="b2-daily-bars" style="--days:${daysInMonth}" aria-label="每日學習次數">${series.map((item) => {
    const height = Math.round((item.count / maxCount) * 100);
    const showLabel = item.day === 1 || item.day === daysInMonth || item.day % 5 === 0;
    return `<div class="b2-daily-bar ${item.count ? '' : 'is-zero'}" title="${item.day} 日：${item.count} 次"><i style="--bar:${height}%"></i><span>${showLabel ? item.day : ''}</span></div>`;
  }).join('')}</div></div>`;
}

function monthPanel(monthly, view) {
  if (view === 'courses') return monthCourseChart(monthly);
  if (view === 'rhythm') return monthRhythmChart(monthly);
  return monthCalendar(monthly);
}

function monthView(monthly) {
  const view = params.get('pmonthview') || 'calendar';
  return `<main class="b2-month-screen">
    <div class="b2-month-head"><div><span>全部科目</span><h1>本月學習狀況</h1></div><strong>${esc(monthly?.month?.label || '本月')}</strong></div>
    <div class="b2-month-layout">
      <section class="b2-month-visual">
        <div class="b2-month-switch" aria-label="切換本月圖表">
          <button type="button" data-month-view="calendar" class="${view === 'calendar' ? 'is-active' : ''}">月曆</button>
          <button type="button" data-month-view="courses" class="${view === 'courses' ? 'is-active' : ''}">課程分布</button>
          <button type="button" data-month-view="rhythm" class="${view === 'rhythm' ? 'is-active' : ''}">每日節奏</button>
        </div>
        <div class="b2-month-panel">${monthPanel(monthly, view)}</div>
      </section>
      <aside class="b2-month-summary" aria-label="本月摘要">
        <h2>本月摘要</h2>
        <section class="b2-month-stats"><article><span>學習次數</span><b>${Number(monthly?.totalSessions || 0)}</b></article><article><span>有學習的天數</span><b>${Number(monthly?.activeDays || 0)}</b></article><article><span>有紀錄的課程</span><b>${Number(monthly?.activeCourses || 0)} / ${Number(monthly?.totalCourses || 0)}</b></article></section>
        <section class="b2-course-tally">${(monthly?.courses || []).map((course) => `<article><strong>${esc(course.short || course.name)}</strong><span>${Number(course.sessions || 0)} 次</span><small>最近 ${esc(course.lastDate || '—')}</small></article>`).join('')}</section>
      </aside>
    </div>
  </main>`;
}

function fixedUnitList(course, selectedUnitId) {
  return (course?.units || []).map((unit) => `<button type="button" data-proto-unit="${esc(unit.id)}" data-proto-course="${esc(course.id)}" class="b2-lesson-link ${unit.id === selectedUnitId ? 'is-active' : ''}"><span>${String(unit.number ?? '').padStart(2, '0')}</span><strong>${esc(unit.name)}</strong><small>${unit.content?.length ? `${unit.content.length} 段課文` : unit.status === 'done' ? '完成' : unit.status === 'current' ? '目前' : '待學'}</small></button>`).join('');
}

function sessionList(coursePayload, hierarchyCourse, selectedLessonId, courseId) {
  const courseMaterials = (hierarchyCourse?.courseContent || []).length + (hierarchyCourse?.courseVocabulary || []).length;
  const materialsLink = courseMaterials ? `<button type="button" data-proto-lesson="course-materials" data-proto-course="${esc(courseId)}" class="b2-lesson-link ${selectedLessonId === 'course-materials' ? 'is-active' : ''}"><span>＋</span><strong>課程整理</strong><small>${courseMaterials} 筆跨回合內容</small></button>` : '';
  return materialsLink + (coursePayload?.historySessions || coursePayload?.sessions || []).map((session) => `<button type="button" data-proto-lesson="${esc(session.sessionId)}" data-proto-course="${esc(courseId)}" class="b2-lesson-link ${session.sessionId === selectedLessonId ? 'is-active' : ''}"><span>${esc((session.date || '').slice(5))}</span><strong>${esc(session.title || '未命名學習回合')}</strong><small>學習回合</small></button>`).join('');
}

function constructionBranches(mode, coursePayload, hierarchyCourse) {
  const examCount = (coursePayload?.historySessions || []).length;
  const topicCount = (hierarchyCourse?.units || []).length;
  return `<div class="b2-branches"><p>可從考古題演練或主題學習進入。</p><button type="button" data-proto-mode="exam" class="${mode === 'exam' ? 'is-active' : ''}"><strong>考古題演練</strong><span>${examCount} 個學習回合</span></button><button type="button" data-proto-mode="topic" class="${mode === 'topic' ? 'is-active' : ''}"><strong>主題學習</strong><span>${topicCount} 個主題</span></button></div>`;
}

function rail(data) {
  const { subjects, courseMap, selectedSubject, selectedCourse, selectedCoursePayload, selectedUnit, selectedLessonId, mode, closed } = data;
  const courses = allCourseIds(selectedSubject).map((id) => courseMap[id]).filter(Boolean);
  const useSessions = selectedSubject?.id === 'japanese' || (selectedSubject?.id === 'construction' && mode === 'exam');
  const lessonList = useSessions ? sessionList(selectedCoursePayload, selectedCourse, selectedLessonId, selectedCourse?.id) : fixedUnitList(selectedCourse, selectedUnit?.id);
  return `<aside class="b2-rail ${closed ? 'is-closed' : ''}"><div class="b2-rail__head"><button type="button" data-proto-nav-toggle aria-label="${closed ? '展開課程目錄' : '收起課程目錄'}">${closed ? '展開目錄' : '收起目錄'}</button><div><span>${esc(selectedSubject?.name || '')}</span><strong>${esc(selectedCourse?.name || '')}</strong></div></div><div class="b2-rail__body"><div class="b2-subject-shortcuts">${subjects.map((subject) => `<button type="button" data-proto-subject="${esc(subject.id)}" class="${subject.id === selectedSubject?.id ? 'is-active' : ''}">${esc(subject.name)}</button>`).join('')}</div>${courses.length > 1 ? `<div class="b2-course-list">${courses.map((course) => `<button type="button" data-proto-course="${esc(course.id)}" class="${course.id === selectedCourse?.id ? 'is-active' : ''}">${esc(course.name)}</button>`).join('')}</div>` : ''}${selectedSubject?.id === 'construction' ? constructionBranches(mode, selectedCoursePayload, selectedCourse) : ''}<div class="b2-lesson-list">${lessonList || '<p class="proto-empty">目前沒有可列出的課次。</p>'}</div></div></aside>`;
}

function unitReader(unit) {
  if (!unit) return '<div class="b2-empty-reader"><strong>選一課開始閱讀。</strong><span>課文會固定出現在這個區域，不會跑到清單最下面。</span></div>';
  const content = unit.content || [];
  const vocabulary = unit.vocabulary || [];
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>第 ${Number(unit.number || 0)} 課</span><span>${esc(unit.sourceRange || '目前未標示教材範圍')}</span></div><h1>${esc(unit.name || '未命名課次')}</h1>${(unit.outline || []).length ? `<section class="b2-lede"><h2>這一課要學什麼</h2><ul>${unit.outline.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>` : ''}<div class="b2-content-blocks">${content.length ? content.map((item) => `<section><span>${esc(item.type || '教材內容')}</span><h2>${esc(item.label || '本課重點')}</h2><p>${esc(item.explanation || '')}</p>${item.sourceRange ? `<small>來源：${esc(item.sourceRange)}</small>` : ''}</section>`).join('') : '<section class="b2-data-note"><strong>這一課目前尚未發布教材內容。</strong><p>內容更新後會顯示在這裡。</p></section>'}</div>${vocabulary.length ? `<section class="b2-vocab"><h2>單字與表達</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>學習狀態：${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}</article>`;
}

function courseMaterialsReader(course) {
  const content = course?.courseContent || [];
  const vocabulary = course?.courseVocabulary || [];
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>課程整理</span><span>跨回合整理</span></div><h1>跨回合教材與表達</h1><section class="b2-lede"><h2>為什麼放在這裡</h2><p>這些內容沒有可確認的單一學習回合，因此集中顯示在這裡。</p></section><div class="b2-content-blocks">${content.map((item) => `<section><span>${esc(item.type || '教材內容')}</span><h2>${esc(item.label || '課程重點')}</h2><p>${esc(item.explanation || '')}</p></section>`).join('')}</div>${vocabulary.length ? `<section class="b2-vocab"><h2>單字與表達</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>學習狀態：${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}</article>`;
}

function sessionReader(session, coursePayload, subjectId) {
  if (!session) return '<div class="b2-empty-reader"><strong>目前沒有可顯示的學習回合。</strong></div>';
  const isJapanese = subjectId === 'japanese';
  const content = Array.isArray(session.content) ? session.content : [];
  const vocabulary = Array.isArray(session.vocabulary) ? session.vocabulary : [];
  const japaneseLearningContent = `<div class="b2-content-blocks">${content.length
    ? content.map((item) => `<section><span>${esc(item.type || '學習內容')}</span><h2>${esc(item.label || '本次重點')}</h2><p>${esc(item.explanation || '')}</p></section>`).join('')
    : '<section class="b2-data-note"><strong>這次學習回合目前沒有已整理的學習內容。</strong><p>整理完成的文法、自然表達與搭配會直接顯示在這裡。</p></section>'}</div>
    ${vocabulary.length ? `<section class="b2-vocab"><h2>單字與表達</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>學習狀態：${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}`;
  const sessionNote = isJapanese
    ? japaneseLearningContent
    : '<section class="b2-data-note"><strong>這是考古題學習紀錄摘要。</strong><p>完整題目與答案目前尚未提供。</p></section>';
  return `<article class="b2-reading-page"><div class="b2-reading-meta"><span>${isJapanese ? '日文學習回合' : '考古題回合'}</span><span>${esc(session.date || '')}</span></div><h1>${esc(session.title || '未命名學習回合')}</h1><section class="b2-lede"><h2>本次學習範圍</h2><p>${esc(session.learningScope || session.title || '目前沒有範圍摘要')}</p></section>${sessionNote}<section class="b2-review-note"><h2>下次接續</h2><p>${esc(session.reviewNeeded || coursePayload?.next || '目前沒有待接續項目')}</p></section></article>`;
}

function footprintView(coursePayload) {
  const sessions = coursePayload?.historySessions || coursePayload?.sessions || [];
  return `<article class="b2-reading-page b2-footprint"><div class="b2-reading-meta"><span>學習足跡</span><span>${sessions.length} 個已記錄回合</span></div><h1>最近學過什麼</h1><p class="b2-helper">這裡只整理已正式記錄的學習回合，不會修改進度或教材。</p><div class="b2-footprint-list">${sessions.length ? sessions.map((session) => `<section><time>${esc(session.date || '')}</time><div><h2>${esc(session.title || '未命名回合')}</h2><p>${esc(session.learningScope || '')}</p>${session.reviewNeeded ? `<small>待接續：${esc(session.reviewNeeded)}</small>` : ''}</div></section>`).join('') : '<div class="b2-data-note"><strong>目前沒有學習足跡。</strong><p>有新的學習紀錄後會顯示在這裡。</p></div>'}</div></article>`;
}

function learningView(data) {
  const section = params.get('psection') || 'learn';
  const closed = params.get('pnav') === 'closed';
  const mode = data.selectedSubject?.id === 'construction' ? (params.get('pmode') || 'exam') : '';
  const sessions = data.selectedCoursePayload?.historySessions || data.selectedCoursePayload?.sessions || [];
  const hasCourseMaterials = (data.selectedCourse?.courseContent || []).length + (data.selectedCourse?.courseVocabulary || []).length > 0;
  const selectedLessonId = params.get('plesson') || (hasCourseMaterials ? 'course-materials' : sessions[0]?.sessionId) || '';
  const selectedSession = sessions.find((item) => item.sessionId === selectedLessonId) || sessions[0];
  const useSessions = data.selectedSubject?.id === 'japanese' || (data.selectedSubject?.id === 'construction' && mode === 'exam');
  const content = section === 'history'
    ? footprintView(data.selectedCoursePayload)
    : useSessions
      ? selectedLessonId === 'course-materials' ? courseMaterialsReader(data.selectedCourse) : sessionReader(selectedSession, data.selectedCoursePayload, data.selectedSubject?.id)
      : unitReader(data.selectedUnit);
  return `<main class="b2-learning-shell ${closed ? 'is-nav-closed' : ''}">${rail({ ...data, selectedLessonId, mode, closed })}<section class="b2-reader"><div class="b2-reader-tabs"><button type="button" data-proto-nav-jump>查看目錄</button><button type="button" data-proto-section="learn" class="${section === 'learn' ? 'is-active' : ''}">讀課文</button><button type="button" data-proto-section="history" class="${section === 'history' ? 'is-active' : ''}">看學習足跡</button><small>${section === 'history' ? '查看這門課最近學過什麼' : '一次只看一課'}</small></div><div class="b2-reader__scroll">${content}</div></section></main>`;
}

function render() {
  const data = context();
  const section = params.get('psection') || '';
  const isHome = !params.get('psubject') && section !== 'month';
  document.getElementById('app').innerHTML = `<div class="variant-b2">${topbar(section)}${section === 'month' ? monthView(state.monthly) : isHome ? homeView(data.subjects, data.courseMap) : learningView(data)}</div>`;
}

document.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  if (!target) return;
  if (target.dataset.monthView) return setParams({ pmonthview: target.dataset.monthView });
  if (target.hasAttribute('data-proto-home')) return setParams({ psubject:'', pcourse:'', punit:'', plesson:'', pmode:'', psection:'', pnav:'', pmonthview:'' });
  if (target.dataset.protoSubject) return setParams({ psubject:target.dataset.protoSubject, pcourse:'', punit:'', plesson:'', pmode:'', psection:'learn' });
  if (target.dataset.protoSection) return setParams({ psection:target.dataset.protoSection });
  if (target.hasAttribute('data-proto-nav-toggle')) return setParams({ pnav: params.get('pnav') === 'closed' ? '' : 'closed' });
  if (target.hasAttribute('data-proto-nav-jump')) { setParams({ pnav:'' }); requestAnimationFrame(() => document.querySelector('.b2-rail')?.scrollIntoView({ block:'start' })); return; }
  if (target.dataset.protoMode) return setParams({ pmode:target.dataset.protoMode, punit:'', plesson:'', psection:'learn' });
  if (target.dataset.protoLesson) { setParams({ pcourse:target.dataset.protoCourse || '', plesson:target.dataset.protoLesson, punit:'', psection:'learn' }); requestAnimationFrame(() => document.querySelector('.b2-reader')?.scrollIntoView({ block:'start' })); return; }
  if (target.dataset.protoUnit) { setParams({ pcourse:target.dataset.protoCourse || '', punit:target.dataset.protoUnit, plesson:'', psection:'learn' }); requestAnimationFrame(() => document.querySelector('.b2-reader')?.scrollIntoView({ block:'start' })); return; }
  if (target.dataset.protoCourse) return setParams({ pcourse:target.dataset.protoCourse, punit:'', plesson:'', pmode:'', psection:'learn' });
});

function scriptCall(method) {
  return new Promise((resolve, reject) => google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method]());
}

(async () => {
  document.getElementById('app').innerHTML = '<div style="padding:2rem">正在讀取學習資料…</div>';
  try {
    [state.learning, state.monthly] = await Promise.all([scriptCall('getLearningWorkspaceData'), scriptCall('getMonthlyLearningStatus')]);
    render();
  } catch (error) {
    document.getElementById('app').innerHTML = `<div style="padding:2rem">讀取失敗：${esc(error?.message || error)}</div>`;
  }
})();
