import { createStudioApp } from './lib/studio-app.js';
import { learningStudioView } from './learning-studio/view.js';
import { bindLearningStudio } from './learning-studio/controller.js';

const routes = Object.fromEntries(
  ['home', 'subject', 'course', 'unit', 'progress', 'rhythm'].map((key) => [key, learningStudioView]),
);

document.documentElement.dataset.learningStudio = 'v1';
for (const href of [
  './assets/learning-studio/tokens.css',
  './assets/learning-studio/styles.css',
]) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

createStudioApp(routes, { afterRender: bindLearningStudio }).init();
