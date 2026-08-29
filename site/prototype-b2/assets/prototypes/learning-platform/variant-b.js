import { esc } from '../../lib/html.js';

function allCourseIds(subject) {
  return [...(subject?.currentCourseIds || []), ...(subject?.historyCourseIds || [])];
}

function statusLabel(status) {
  if (status === 'done') return '完成';
  if (status === 'current') return '目前';
  return '待學';
}

function topbar(section) {
  return `<header class="b2-topbar">
    <button type="button" class="b2-brand" data-proto-home aria-label="回到學習首頁"><span class="b-character" aria-hidden="true"><i></i></span><strong>我的學習</strong></button>
    <nav aria-label="全域頁面">
      <button type="button" data-proto-home class="${!section ? 'is-active' : ''}">首頁</button>
      <button type="button" data-proto-section="month" class="${section === 'month' ? 'is-active' : ''}">全部科目月曆</button>
    </nav>
  </header>`;
}

function homeView(subjects, courseMap) {
  return `<main class="b2-home">
    <section class="b2-opening">
      <div><h1>今天想打開哪一門？</h1><p>首頁先保留所有學科。選一門後，目錄和課文會在同一個閱讀畫面裡出現。</p></div>
      <aside><span>Prototype B2</span><strong>先選，再專心讀一頁。</strong><small>這版使用目前公開的 sanitized snapshot。</small></aside>
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
    <footer class="b2-statement"><p>首頁負責選方向，閱讀器只負責讓你看懂一課。</p><span>Prototype only · schema v3</span></footer>
  </main>`;
}

function monthCalendar(monthly) {
  const year = Number(monthly?.month?.year || 0);
  const month = Number(monthly?.month?.month || 0);
  if (!year || !month) return '<div class="proto-empty">目前沒有可顯示的月份資料。</div>';
  const eventMap = Object.fromEntries((monthly.days || []).map((day) => [day.date, day.sessions || []]));
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = [];
  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cells.push('<div class="b2-calendar__cell is-empty"></div>');
      continue;
    }
    const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
    const events = (eventMap[date] || []).map((item) => `<span>${esc(item.name)}${Number(item.count || 0) > 1 ? ` ×${Number(item.count)}` : ''}</span>`).join('');
    cells.push(`<div class="b2-calendar__cell"><b>${dayNumber}</b><div>${events}</div></div>`);
  }
  return `<div class="b2-calendar" aria-label="${esc(monthly.month?.label || '本月')}學習月曆">
    <div class="b2-calendar__week">${['日', '一', '二', '三', '四', '五', '六'].map((day) => `<span>週${day}</span>`).join('')}</div>
    <div class="b2-calendar__grid">${cells.join('')}</div>
  </div>`;
}

function monthView(monthly) {
  return `<main class="b2-month-screen">
    <div class="b2-month-head"><div><span>全部科目</span><h1>本月學習狀況</h1><p>這是跨科目的總覽，所以不放在任何一門課的側欄裡。</p></div><strong>${esc(monthly?.month?.label || '本月')}</strong></div>
    <section class="b2-month-stats" aria-label="本月摘要">
      <article><span>學習次數</span><b>${Number(monthly?.totalSessions || 0)}</b></article>
      <article><span>有學習的天數</span><b>${Number(monthly?.activeDays || 0)}</b></article>
      <article><span>有紀錄的課程</span><b>${Number(monthly?.activeCourses || 0)} / ${Number(monthly?.totalCourses || 0)}</b></article>
    </section>
    <section class="b2-course-tally">${(monthly?.courses || []).map((course) => `<article><strong>${esc(course.short || course.name)}</strong><span>${Number(course.sessions || 0)} 次</span><small>最近 ${esc(course.lastDate || '—')}</small></article>`).join('')}</section>
    ${monthCalendar(monthly)}
    <footer class="b2-statement"><p>月曆看整體節奏，不假裝代表學會了多少。</p><span>${esc(monthly?.source || 'Sanitized snapshot')}</span></footer>
  </main>`;
}

function fixedUnitList(course, selectedUnitId) {
  return (course?.units || []).map((unit) => `<button type="button" data-proto-unit="${esc(unit.id)}" data-proto-course="${esc(course.id)}" class="b2-lesson-link ${unit.id === selectedUnitId ? 'is-active' : ''}">
    <span>${String(unit.number ?? '').padStart(2, '0')}</span><strong>${esc(unit.name)}</strong><small>${unit.content?.length ? `${unit.content.length} 段課文` : statusLabel(unit.status)}</small>
  </button>`).join('');
}

function sessionList(coursePayload, selectedLessonId, courseId) {
  return (coursePayload?.historySessions || coursePayload?.sessions || []).map((session) => `<button type="button" data-proto-lesson="${esc(session.sessionId)}" data-proto-course="${esc(courseId)}" class="b2-lesson-link ${session.sessionId === selectedLessonId ? 'is-active' : ''}">
    <span>${esc((session.date || '').slice(5))}</span><strong>${esc(session.title || '未命名學習回合')}</strong><small>學習回合</small>
  </button>`).join('');
}

function constructionBranches(mode, coursePayload, hierarchyCourse) {
  const examCount = (coursePayload?.historySessions || []).length;
  const topicCount = (hierarchyCourse?.units || []).length;
  return `<div class="b2-branches">
    <p>目前 snapshot 是同一門課；B2 先分成兩個入口讓你判斷。</p>
    <button type="button" data-proto-mode="exam" class="${mode === 'exam' ? 'is-active' : ''}"><strong>考古題演練</strong><span>${examCount} 個學習回合</span></button>
    <button type="button" data-proto-mode="topic" class="${mode === 'topic' ? 'is-active' : ''}"><strong>主題學習</strong><span>${topicCount} 個主題</span></button>
  </div>`;
}

function rail({ subjects, courseMap, selectedSubject, selectedCourse, selectedCoursePayload, selectedUnit, selectedLessonId, mode, closed }) {
  const courses = allCourseIds(selectedSubject).map((id) => courseMap[id]).filter(Boolean);
  const useSessions = selectedSubject?.id === 'japanese' || (selectedSubject?.id === 'construction' && mode === 'exam');
  const lessonList = useSessions
    ? sessionList(selectedCoursePayload, selectedLessonId, selectedCourse?.id)
    : fixedUnitList(selectedCourse, selectedUnit?.id);
  return `<aside class="b2-rail ${closed ? 'is-closed' : ''}" aria-label="課程目錄">
    <div class="b2-rail__head"><button type="button" data-proto-nav-toggle aria-label="${closed ? '展開課程目錄' : '收合課程目錄'}">${closed ? '→' : '←'}</button><div><span>${esc(selectedSubject?.name || '')}</span><strong>${esc(selectedCourse?.name || '')}</strong></div></div>
    <div class="b2-rail__body">
      <div class="b2-subject-shortcuts">${subjects.map((subject) => `<button type="button" data-proto-subject="${esc(subject.id)}" class="${subject.id === selectedSubject?.id ? 'is-active' : ''}">${esc(subject.name)}</button>`).join('')}</div>
      ${courses.length > 1 ? `<div class="b2-course-list">${courses.map((course) => `<button type="button" data-proto-course="${esc(course.id)}" class="${course.id === selectedCourse?.id ? 'is-active' : ''}">${esc(course.name)}</button>`).join('')}</div>` : ''}
      ${selectedSubject?.id === 'construction' ? constructionBranches(mode, selectedCoursePayload, selectedCourse) : ''}
      <div class="b2-lesson-list">${lessonList || '<p class="proto-empty">目前 snapshot 沒有可列出的課次。</p>'}</div>
    </div>
  </aside>`;
}

function unitReader(unit) {
  if (!unit) return '<div class="b2-empty-reader"><strong>選一課開始閱讀。</strong><span>課文會固定出現在這個區域，不會跑到清單最下面。</span></div>';
  const content = unit.content || [];
  const vocabulary = unit.vocabulary || [];
  return `<article class="b2-reading-page">
    <div class="b2-reading-meta"><span>第 ${Number(unit.number || 0)} 課</span><span>${esc(unit.sourceRange || '目前未標示教材範圍')}</span></div>
    <h1>${esc(unit.name || '未命名課次')}</h1>
    ${(unit.outline || []).length ? `<section class="b2-lede"><h2>這一課要學什麼</h2><ul>${unit.outline.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></section>` : ''}
    <div class="b2-content-blocks">${content.length ? content.map((item) => `<section><span>${esc(item.type || '教材內容')}</span><h2>${esc(item.label || '本課重點')}</h2><p>${esc(item.explanation || '')}</p>${item.sourceRange ? `<small>來源：${esc(item.sourceRange)}</small>` : ''}</section>`).join('') : '<section class="b2-data-note"><strong>這一課目前只有課綱。</strong><p>不是介面藏起來；目前公開 snapshot 還沒有這一課的教材內容。</p></section>'}</div>
    ${vocabulary.length ? `<section class="b2-vocab"><h2>單字與記憶</h2>${vocabulary.map((item) => `<div><b>${esc(item.word)}</b><span>${esc(item.meaning)}</span><small>${esc(item.memoryStatus || '未開始')}</small></div>`).join('')}</section>` : ''}
  </article>`;
}

function sessionReader(session, coursePayload, subjectId) {
  if (!session) return '<div class="b2-empty-reader"><strong>目前沒有可顯示的學習回合。</strong><span>這是 snapshot 資料限制，不是導覽失效。</span></div>';
  const isJapanese = subjectId === 'japanese';
  return `<article class="b2-reading-page">
    <div class="b2-reading-meta"><span>${isJapanese ? '日文學習回合' : '考古題回合'}</span><span>${esc(session.date || '')}</span></div>
    <h1>${esc(session.title || '未命名學習回合')}</h1>
    <section class="b2-lede"><h2>本次範圍</h2><p>${esc(session.learningScope || session.title || '目前沒有範圍摘要')}</p></section>
    <section class="b2-review-note"><h2>下次接續</h2><p>${esc(session.reviewNeeded || coursePayload?.next || '目前沒有待接續項目')}</p></section>
    <section class="b2-data-note"><strong>${isJapanese ? '這不是完整日文教材頁。' : '這是考古題學習紀錄摘要。'}</strong><p>${isJapanese ? '目前 schema v3 沒有日文 Unit／教材本文；B2 先把每次 Session 當作一頁，測試你要的閱讀方式。' : '目前公開 snapshot 尚未提供完整 EXAM_BANK 題目與答案內容。'}</p></section>
  </article>`;
}

function footprintView(coursePayload) {
  const sessions = coursePayload?.historySessions || coursePayload?.sessions || [];
  return `<article class="b2-reading-page b2-footprint">
    <div class="b2-reading-meta"><span>學習足跡</span><span>${sessions.length} 個已記錄回合</span></div>
    <h1>最近學過什麼</h1>
    <p class="b2-helper">這裡只整理已正式記錄的學習回合，不會修改進度或教材。</p>
    <div class="b2-footprint-list">${sessions.length ? sessions.map((session) => `<section><time>${esc(session.date || '')}</time><div><h2>${esc(session.title || '未命名回合')}</h2><p>${esc(session.learningScope || '')}</p>${session.reviewNeeded ? `<small>待接續：${esc(session.reviewNeeded)}</small>` : ''}</div></section>`).join('') : '<div class="b2-data-note"><strong>目前沒有學習足跡。</strong><p>正式記錄 Session 後會顯示在這裡。</p></div>'}</div>
  </article>`;
}

function learningView(data) {
  const { params, subjects, courseMap, selectedSubject, selectedCourse, selectedUnit, selectedCoursePayload } = data;
  const section = params.get('psection') || 'learn';
  const closed = params.get('pnav') === 'closed';
  const mode = selectedSubject?.id === 'construction' ? (params.get('pmode') || 'exam') : '';
  const sessions = selectedCoursePayload?.historySessions || selectedCoursePayload?.sessions || [];
  const selectedLessonId = params.get('plesson') || sessions[0]?.sessionId || '';
  const selectedSession = sessions.find((item) => item.sessionId === selectedLessonId) || sessions[0];
  const useSessions = selectedSubject?.id === 'japanese' || (selectedSubject?.id === 'construction' && mode === 'exam');
  const content = section === 'history'
    ? footprintView(selectedCoursePayload)
    : useSessions ? sessionReader(selectedSession, selectedCoursePayload, selectedSubject?.id) : unitReader(selectedUnit);
  return `<main class="b2-learning-shell ${closed ? 'is-nav-closed' : ''}">
    ${rail({ subjects, courseMap, selectedSubject, selectedCourse, selectedCoursePayload, selectedUnit, selectedLessonId, mode, closed })}
    <section class="b2-reader">
      <div class="b2-reader-tabs" aria-label="課程頁面">
        <button type="button" data-proto-nav-jump>開啟目錄</button>
        <button type="button" data-proto-section="learn" class="${section === 'learn' ? 'is-active' : ''}">讀課文</button>
        <button type="button" data-proto-section="history" class="${section === 'history' ? 'is-active' : ''}">看學習足跡</button>
        <small>${section === 'history' ? '查看這門課最近學過什麼' : '一次只看一課'}</small>
      </div>
      <div class="b2-reader__scroll">${content}</div>
    </section>
  </main>`;
}

export function variantB(data) {
  const section = data.params.get('psection') || '';
  const isHome = !data.params.get('psubject') && section !== 'month';
  return `<div class="variant-b variant-b2">
    ${topbar(section)}
    ${section === 'month' ? monthView(data.monthly) : isHome ? homeView(data.subjects, data.courseMap) : learningView(data)}
  </div>`;
}
