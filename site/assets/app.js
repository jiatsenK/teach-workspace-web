import { createStudioApp } from './lib/studio-app.js';
import { homeView } from './views/home.js';
import { courseView } from './views/course.js';
import { progressView } from './views/progress.js';
import { monthView } from './views/month.js';

const routes = { home: homeView, course: courseView, progress: progressView, rhythm: monthView };
createStudioApp(routes).init();
