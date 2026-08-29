import { prototypeSwitcher, variantKey } from './switcher.js';
import { variantA } from './variant-a.js';
import { variantB } from './variant-b.js';
import { variantC } from './variant-c.js';

const renderers = { A: variantA, B: variantB, C: variantC };
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
  history.replaceState({}, '', url);
  latestRender?.();
  if (Object.hasOwn(changes, 'variant')) window.scrollTo({ top: 0, behavior: 'auto' });
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target || !document.documentElement.dataset.learningPrototype) return;
    if (target.dataset.protoVariant) {
      setParams({ variant: target.dataset.protoVariant });
      return;
    }
    if (target.dataset.protoSubject) {
      setParams({ psubject: target.dataset.protoSubject, pcourse: '', punit: '', plesson: '', pmode: '', psection: 'learn' });
      document.getElementById('prototypeCommand')?.close();
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
      requestAnimationFrame(() => document.querySelector('.b2-reader, .b-reader')?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return;
    }
    if (target.dataset.protoUnit) {
      setParams({ pcourse: target.dataset.protoCourse || '', punit: target.dataset.protoUnit, plesson: '', psection: 'learn' });
      requestAnimationFrame(() => document.querySelector('.b2-reader, .b-reader')?.scrollIntoView({ block: 'start', behavior: 'auto' }));
      return;
    }
    if (target.dataset.protoCourse) {
      setParams({ pcourse: target.dataset.protoCourse, punit: '', plesson: '', pmode: '', psection: 'learn' });
      return;
    }
    if (target.hasAttribute('data-proto-command')) {
      const dialog = document.getElementById('prototypeCommand');
      dialog?.showModal();
      requestAnimationFrame(() => document.getElementById('prototypeCommandSearch')?.focus());
    }
  });
  window.addEventListener('keydown', (event) => {
    if (!document.documentElement.dataset.learningPrototype) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      document.getElementById('prototypeCommand')?.showModal();
      requestAnimationFrame(() => document.getElementById('prototypeCommandSearch')?.focus());
      return;
    }
    if (isTypingTarget(event.target) || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const keys = ['A', 'B', 'C'];
    const current = keys.indexOf(variantKey(new URLSearchParams(location.search).get('variant')));
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    setParams({ variant: keys[(current + delta + keys.length) % keys.length] });
  });
  document.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'prototypeCommandSearch') return;
    const query = event.target.value.trim().toLocaleLowerCase('zh-Hant');
    document.querySelectorAll('.c-command__results button').forEach((button) => {
      button.hidden = Boolean(query) && !button.textContent.toLocaleLowerCase('zh-Hant').includes(query);
    });
  });
}

export function learningPlatformPrototypeView({ learning, monthly }) {
  const data = context(learning, monthly);
  const variant = variantKey(data.params.get('variant'));
  const renderer = renderers[variant];
  const pathLabel = variant === 'B' && data.params.get('psection') === 'month'
    ? '全部科目 / 本月學習狀況'
    : variant === 'B' && !data.params.get('psubject')
      ? '首頁'
      : '';
  return `<div class="lp-prototype" data-proto-variant="${variant}">
    ${renderer(data)}
    ${prototypeSwitcher({ variant, subject: data.selectedSubject, course: data.selectedCourse, unit: data.selectedUnit, pathLabel })}
  </div>`;
}

export function bindLearningPlatformPrototype({ render }) {
  latestRender = render;
  installListeners();
}
