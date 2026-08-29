let latest = null;
let installed = false;

function nextUnit(course) {
  return (course?.units || []).find((item) => item.status === 'current') || course?.units?.[0] || null;
}

function hierarchyCourse(id) {
  return (latest?.state.learning?.hierarchy?.courses || []).find((item) => item.id === id) || null;
}

function openSelection({ subjectId, courseId, unitId, scrollTarget = '' }) {
  if (!latest) return;
  const course = hierarchyCourse(courseId);
  latest.state.subjectId = subjectId || course?.subjectId || latest.state.subjectId;
  latest.state.courseId = courseId || latest.state.courseId;
  const unit = unitId ? (course?.units || []).find((item) => item.id === unitId) : nextUnit(course);
  latest.state.unitId = unit?.id || '';
  latest.state.view = unit ? 'unit' : 'course';
  latest.render();
  if (scrollTarget && matchMedia('(max-width: 59.99rem)').matches) {
    requestAnimationFrame(() => document.querySelector(scrollTarget)?.scrollIntoView({ block: 'start', behavior: 'auto' }));
  }
}

function visibleResults() {
  return [...document.querySelectorAll('.ls-command__results button:not([hidden])')];
}

function setActiveResult(index) {
  const results = visibleResults();
  if (!results.length) return;
  const normalized = (index + results.length) % results.length;
  results.forEach((item, itemIndex) => {
    item.classList.toggle('is-active', itemIndex === normalized);
    item.setAttribute('aria-selected', String(itemIndex === normalized));
  });
  results[normalized].scrollIntoView({ block: 'nearest' });
}

function openCommand() {
  const dialog = document.getElementById('learningStudioCommand');
  if (!dialog || dialog.open) return;
  dialog.showModal();
  requestAnimationFrame(() => {
    document.getElementById('learningStudioSearch')?.focus();
    setActiveResult(0);
  });
}

function installListeners() {
  if (installed) return;
  installed = true;
  document.addEventListener('click', (event) => {
    if (event.target instanceof HTMLDialogElement && event.target.id === 'learningStudioCommand') {
      event.target.close();
      return;
    }
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || !document.documentElement.dataset.learningStudio) return;
    if (button.hasAttribute('data-ls-command')) {
      openCommand();
      return;
    }
    if (button.dataset.lsUnit) {
      openSelection({ courseId: button.dataset.lsCourse, unitId: button.dataset.lsUnit, scrollTarget: '.ls-pane--content' });
      return;
    }
    if (button.dataset.lsCourse) {
      const targetCourse = hierarchyCourse(button.dataset.lsCourse);
      openSelection({
        subjectId: button.dataset.lsSubject,
        courseId: button.dataset.lsCourse,
        scrollTarget: (targetCourse?.units || []).length ? '.ls-pane--course' : '.ls-pane--content',
      });
      document.getElementById('learningStudioCommand')?.close();
      return;
    }
    if (button.dataset.lsSubject) {
      const subject = (latest?.state.learning?.hierarchy?.subjects || []).find((item) => item.id === button.dataset.lsSubject);
      const courseId = subject?.currentCourseIds?.[0] || subject?.historyCourseIds?.[0] || '';
      openSelection({ subjectId: subject?.id, courseId, scrollTarget: '.ls-pane--course' });
    }
  });
  window.addEventListener('keydown', (event) => {
    if (!document.documentElement.dataset.learningStudio) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommand();
      return;
    }
    const input = document.getElementById('learningStudioSearch');
    if (!(input instanceof HTMLInputElement) || document.activeElement !== input) return;
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    const results = visibleResults();
    const active = results.findIndex((item) => item.classList.contains('is-active'));
    if (event.key === 'Enter') results[Math.max(active, 0)]?.click();
    else setActiveResult(active + (event.key === 'ArrowDown' ? 1 : -1));
  });
  document.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'learningStudioSearch') return;
    const query = event.target.value.trim().toLocaleLowerCase('zh-Hant');
    const results = [...document.querySelectorAll('.ls-command__results button')];
    results.forEach((button) => { button.hidden = Boolean(query) && !button.textContent.toLocaleLowerCase('zh-Hant').includes(query); });
    const visible = visibleResults();
    const status = document.querySelector('.ls-command__status');
    if (status) status.textContent = query ? `找到 ${visible.length} 門課程` : '';
    setActiveResult(0);
  });
}

export function bindLearningStudio(context) {
  latest = context;
  installListeners();
}
