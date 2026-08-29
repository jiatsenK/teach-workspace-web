import { createStudioApp } from './lib/studio-app.js';
import { homeView } from './views/home.js';
import { subjectView } from './views/subject.js';
import { courseView } from './views/course.js';
import { unitView } from './views/unit.js';
import { progressView } from './views/progress.js';
import { monthView } from './views/month.js';

const routes = { home: homeView, subject: subjectView, course: courseView, unit: unitView, progress: progressView, rhythm: monthView };
createStudioApp(routes).init();
