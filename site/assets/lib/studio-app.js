import { viewBar } from '../components/header.js';

function scriptCall(method) {
  return new Promise((resolve, reject) => {
    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[method]();
  });
}

export function createStudioApp(routes) {
  const params = new URLSearchParams(location.search);
  const state = {
    view: routes[params.get('view')] ? params.get('view') : 'home',
    courseId: params.get('course') || 'construction',
    learning: null,
    monthly: null,
  };

  function currentCourse() {
    const courses = state.learning?.courses || {};
    return courses[state.courseId] || courses[state.learning?.courseOrder?.[0]] || Object.values(courses)[0] || null;
  }

  function syncUrl() {
    const url = new URL(location.href);
    url.searchParams.set('view', state.view);
    url.searchParams.set('course', state.courseId);
    history.replaceState({}, '', url);
  }

  function bind(render) {
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.onclick = () => { state.view = button.dataset.view; render(); };
    });
    document.querySelectorAll('[data-course]').forEach((button) => {
      button.onclick = () => { state.courseId = button.dataset.course; render(); };
    });
    document.querySelectorAll('[data-open-course]').forEach((button) => {
      button.onclick = () => { state.courseId = button.dataset.openCourse; state.view = 'course'; render(); };
    });
    document.querySelectorAll('[data-go-home]').forEach((button) => {
      button.onclick = () => { state.view = 'home'; render(); };
    });
  }

  function render() {
    const course = currentCourse();
    if (!course) return;
    syncUrl();
    document.getElementById('viewBar').innerHTML = viewBar(state.view);
    document.getElementById('app').innerHTML = routes[state.view]({
      learning: state.learning,
      monthly: state.monthly,
      course,
      courseId: state.courseId,
    });
    bind(render);
  }

  async function init() {
    document.getElementById('app').innerHTML = '<div class="loading">正在讀取學習資料…</div>';
    try {
      [state.learning, state.monthly] = await Promise.all([
        scriptCall('getLearningWorkspaceData'),
        scriptCall('getMonthlyLearningStatus'),
      ]);
      if (!state.learning?.courses?.[state.courseId]) state.courseId = state.learning?.courseOrder?.[0] || 'construction';
      document.getElementById('refreshBtn').onclick = () => location.reload();
      window.addEventListener('popstate', () => {
        const next = new URLSearchParams(location.search);
        state.view = routes[next.get('view')] ? next.get('view') : 'home';
        state.courseId = next.get('course') || state.courseId;
        render();
      });
      render();
    } catch (error) {
      document.getElementById('app').innerHTML = `<div class="error">讀取失敗<br>${String(error?.message || error)}</div>`;
    }
  }

  return { init };
}
