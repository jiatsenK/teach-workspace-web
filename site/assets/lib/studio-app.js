import { viewBar } from '../components/header.js';

function scriptCall(method) {
  return new Promise((resolve, reject) => {
    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method]();
  });
}

export function createStudioApp(routes, options = {}) {
  const params = new URLSearchParams(location.search);
  const state = {
    view: routes[params.get('view')] ? params.get('view') : 'home',
    subjectId: params.get('subject') || '',
    courseId: params.get('course') || '',
    unitId: params.get('unit') || '',
    learning: null,
    monthly: null,
  };

  function hierarchyCourse(courseId) {
    return (state.learning?.hierarchy?.courses || []).find((course) => course.id === courseId) || null;
  }

  function currentCourse() {
    const courses = state.learning?.courses || {};
    return courses[state.courseId] || null;
  }

  function currentSubjectId() {
    const subjects = state.learning?.hierarchy?.subjects || [];
    if (subjects.some((subject) => subject.id === state.subjectId)) return state.subjectId;
    return hierarchyCourse(state.courseId)?.subjectId || subjects[0]?.id || '';
  }

  function syncUrl() {
    const url = new URL(location.href);
    url.searchParams.set('view', state.view);
    if (state.subjectId) url.searchParams.set('subject', state.subjectId);
    else url.searchParams.delete('subject');
    if (state.courseId) url.searchParams.set('course', state.courseId);
    else url.searchParams.delete('course');
    if (state.view === 'unit' && state.unitId) url.searchParams.set('unit', state.unitId);
    else url.searchParams.delete('unit');
    history.replaceState({}, '', url);
  }

  function bind(render) {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.onclick = () => { state.view = button.dataset.view; state.unitId = ''; render(); };
    });
    document.querySelectorAll('[data-course]').forEach((button) => {
      button.onclick = () => { state.courseId = button.dataset.course; state.unitId = ''; render(); };
    });
    document.querySelectorAll('[data-open-subject]').forEach((button) => {
      button.onclick = () => {
        state.subjectId = button.dataset.openSubject;
        const subject = (state.learning?.hierarchy?.subjects || []).find((item) => item.id === state.subjectId);
        state.courseId = subject?.currentCourseIds?.[0] || subject?.historyCourseIds?.[0] || '';
        state.unitId = '';
        state.view = 'subject';
        render();
      };
    });
    document.querySelectorAll('[data-open-course]').forEach((button) => {
      button.onclick = () => {
        state.courseId = button.dataset.openCourse;
        const selected = hierarchyCourse(state.courseId);
        if (selected?.subjectId) state.subjectId = selected.subjectId;
        state.unitId = '';
        state.view = 'course';
        render();
      };
    });
    document.querySelectorAll('[data-open-unit]').forEach((button) => {
      button.onclick = () => {
        state.courseId = button.dataset.unitCourse || state.courseId;
        const selected = hierarchyCourse(state.courseId);
        if (selected?.subjectId) state.subjectId = selected.subjectId;
        state.unitId = button.dataset.openUnit;
        state.view = 'unit';
        render();
      };
    });
    document.querySelectorAll('[data-go-subject]').forEach((button) => {
      button.onclick = () => { state.unitId = ''; state.view = 'subject'; render(); };
    });
    document.querySelectorAll('[data-go-home]').forEach((button) => {
      button.onclick = () => { state.unitId = ''; state.view = 'home'; render(); };
    });
  }

  function render() {
    state.subjectId = currentSubjectId();
    const course = currentCourse();
    const hierarchyCoursePayload = hierarchyCourse(state.courseId);
    if (state.view === 'progress' && !course) state.view = 'subject';
    if ((state.view === 'course' || state.view === 'unit') && !course && !hierarchyCoursePayload) state.view = 'subject';
    syncUrl();
    document.getElementById('viewBar').innerHTML = viewBar(state.view);
    document.getElementById('app').innerHTML = routes[state.view]({
      view: state.view,
      learning: state.learning,
      monthly: state.monthly,
      course,
      hierarchyCourse: hierarchyCoursePayload,
      courseId: state.courseId,
      unitId: state.unitId,
      subjectId: state.subjectId,
    });
    bind(render);
    options.afterRender?.({ state, render });
  }

  async function init() {
    document.getElementById('app').innerHTML = '<div class="loading">正在讀取 learning snapshot…</div>';
    try {
      [state.learning, state.monthly] = await Promise.all([
        scriptCall('getLearningWorkspaceData'),
        scriptCall('getMonthlyLearningStatus'),
      ]);
      const subjects = state.learning?.hierarchy?.subjects || [];
      if (!state.subjectId) state.subjectId = subjects[0]?.id || '';
      if (!state.courseId || (!state.learning?.courses?.[state.courseId] && !hierarchyCourse(state.courseId))) {
        const subject = subjects.find((item) => item.id === state.subjectId) || subjects[0];
        state.courseId = subject?.currentCourseIds?.[0] || subject?.historyCourseIds?.[0] || state.learning?.courseOrder?.[0] || '';
      }
      state.subjectId = currentSubjectId();
      document.getElementById('refreshBtn').onclick = () => location.reload();
      window.addEventListener('popstate', () => {
        const next = new URLSearchParams(location.search);
        state.view = routes[next.get('view')] ? next.get('view') : 'home';
        state.subjectId = next.get('subject') || state.subjectId;
        state.courseId = next.get('course') || state.courseId;
        state.unitId = next.get('unit') || '';
        render();
      });
      render();
    } catch (error) {
      document.getElementById('app').innerHTML = `<div class="error">讀取失敗<br>${String(error?.message || error)}</div>`;
    }
  }

  return { init };
}
