// Disposable prototype entry. Production builds exclude this directory.
import { createStudioApp } from '../../lib/studio-app.js';
import { learningPlatformPrototypeView, bindLearningPlatformPrototype } from './index.js';

const routes = Object.fromEntries(
  ['home', 'subject', 'course', 'unit', 'progress', 'rhythm'].map((key) => [key, learningPlatformPrototypeView]),
);

document.documentElement.dataset.learningPrototype = 'true';
for (const href of [
  new URL('./tokens.css', import.meta.url).href,
  new URL('./styles.css', import.meta.url).href,
]) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}

createStudioApp(routes, { afterRender: bindLearningPlatformPrototype }).init();
