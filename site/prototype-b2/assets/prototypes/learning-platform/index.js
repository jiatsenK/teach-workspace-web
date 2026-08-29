import { variantB } from './variant-b.js';

let latestRender = null;
let listenersInstalled = false;

function context(learning, monthly) {
  const params = new URLSearchParams(location.search);
  const subjects = learning?.hierarchy?.subjects || [];
  const courses = learning?.hierarchy?.courses || [];
  const courseMap = Object.fromEntries(courses.map((course) => [course.id, course]));
  const selectedSubject = subjects.find((item) => item.id === params.get('psubject')) || subjects[0];
  const subjectCourseIds = [...(selectedSubject?.currentCourseIds || []), ...(selectedSubject?.historyCourseIds || [])];
  const selectedCourse = courseMap[params.get('pcourse')] && subjectCourseIds.includes(params.get('pcourse'))
    ? courseMap[params.get('pcourse')]
    : courseMap[subjectCourseIds[0]];
  const selectedUnit = (selectedCourse?.units || []).find((item) => item.id === params.get('punit'))
    || (selectedCourse?.units || []).find((item) => item.status === 'current')
    || selectedCourse?.units?.[0];
  const selectedCoursePayload = learning?.courses?.[selectedCourse?.id] || null;
  return { params, subjects, courseMap, selectedSubject, selectedCourse, selectedUnit, selectedCoursePayload, monthly, learning };
}

function setParams(changes) {
  const url = new URL(location.href);
  Object.entries(changes).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
  url.searchParams.delete('variant');
  history.replaceState({}, '', url);
  latestRender?.();
}

function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target || !document.documentElement.dataset.learningPrototype) return;
    if (target.dataset.protoSubject) {
      setParams({ psubject: target.dataset.protoSubject, pcourse: '', punit: '', plesson: '', pmode: '', psection: 'learn' });
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (target.hasAttribute('data-proto-home')) {
      setParams({ psubject: '', pcourse: '', punit: '', plesson: '', pmode: '', psection: '', pnav: '' });
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (target.dataset.protoSection) {
      setParams({ psection: target.dataset.protoSection });
      if (target.dataset.protoSection === 'month') window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    if (target.hasAttribute('data-proto-nav-toggle')) {
      const closed = new URLSearchParams(location.search).get('pnav') === 'closed';
      setParams({ pnav: closed ? '' : 'closed' });
      return;
    }
    if (target.hasAttribute('data-proto-nav-jump')) {
      setParams({ pnav: '' });
      requestAnimationFrame(() => document.querySelector('.b2-rail')?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return;
    }
    if (target.dataset.protoMode) {
      setParams({ pmode: target.dataset.protoMode, punit: '', plesson: '', psection: 'learn' });
      return;
    }
    if (target.dataset.protoLesson) {
      setParams({ pcourse: target.dataset.protoCourse || '', plesson: target.dataset.protoLesson, punit: '', psection: 'learn' });
      requestAnimationFrame(() => document.querySelector('.b2-reader')?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return;
    }
    if (target.dataset.protoUnit) {
      setParams({ pcourse: target.dataset.protoCourse || '', punit: target.dataset.protoUnit, plesson: '', psection: 'learn' });
      requestAnimationFrame(() => document.querySelector('.b2-reader')?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return;
    }
    if (target.dataset.protoCourse) {
      setParams({ pcourse: target.dataset.protoCourse, punit: '', plesson: '', pmode: '', psection: 'learn' });
    }
  });
}

export function learningPlatformPrototypeView({ learning, monthly }) {
  return `<div class="lp-prototype" data-proto-variant="B">${variantB(context(learning, monthly))}</div>`;
}

export function bindLearningPlatformPrototype({ render }) {
  latestRender = render;
  installListeners();
}
