import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) throw new Error('Usage: node validate-snapshot.mjs <snapshot.json>');
const snapshot = JSON.parse(await fs.readFile(file, 'utf8'));

const credentialLike = /(?:github_pat_|\bgh[pousr]_[0-9A-Za-z]{20,}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bGOCSPX-[0-9A-Za-z_-]{20,}\b|\bsk-(?:proj-)?[0-9A-Za-z_-]{20,}\b|\bxox[baprs]-[0-9A-Za-z-]{20,}\b)/;
const emailLike = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const urlLike = /https?:\/\//i;
const phoneLike = /(?:\b09\d{2}[- ]?\d{3}[- ]?\d{3}\b|\b0[2-8][- ]?\d{3,4}[- ]?\d{4}\b)/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertObject(value, path) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `Expected object at ${path}`);
}

function allowOnly(object, keys, path) {
  assertObject(object, path);
  const allowed = new Set(keys);
  for (const key of Object.keys(object)) assert(allowed.has(key), `Unexpected key ${path}.${key}`);
}

function scanValues(value, path = '$') {
  if (typeof value === 'string') {
    assert(!credentialLike.test(value), `Credential-like value at ${path}`);
    assert(!emailLike.test(value), `Email-like value at ${path}`);
    assert(!phoneLike.test(value), `Phone-like value at ${path}`);
    assert(!urlLike.test(value), `Unexpected URL at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanValues(child, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => scanValues(child, `${path}.${key}`));
  }
}

function validateProgress(progress, courseId) {
  if (progress === null) return;
  const path = `learning.courses.${courseId}.progress`;
  assertObject(progress, path);
  const model = String(progress.model || '');

  if (model === 'linear-cycle') {
    allowOnly(progress, ['model', 'label', 'current', 'steps', 'secondary'], path);
    if (progress.current !== null) allowOnly(progress.current, ['position', 'total', 'label'], `${path}.current`);
    for (const [index, item] of (progress.steps || []).entries()) {
      allowOnly(item, ['id', 'label', 'status'], `${path}.steps[${index}]`);
      assert(['done', 'current', 'todo'].includes(item.status), `Invalid step status at ${path}.steps[${index}]`);
    }
    if (progress.secondary !== null) {
      allowOnly(progress.secondary, ['label', 'currentLabel', 'items'], `${path}.secondary`);
      for (const [index, item] of (progress.secondary.items || []).entries()) {
        allowOnly(item, ['id', 'label', 'status', 'detail'], `${path}.secondary.items[${index}]`);
        assert(['done', 'current', 'todo'].includes(item.status), `Invalid secondary status at ${path}.secondary.items[${index}]`);
      }
    }
    return;
  }

  if (model === 'dynamic-gaps') {
    allowOnly(progress, ['model', 'currentFocus', 'persistentPatterns'], path);
    return;
  }

  if (model === 'expanding-map') {
    allowOnly(progress, ['model', 'items'], path);
    for (const [index, item] of (progress.items || []).entries()) {
      allowOnly(item, ['id', 'concept', 'type', 'action', 'status'], `${path}.items[${index}]`);
      assert(['NEW', 'PRACTICING'].includes(item.status), `Invalid gap status at ${path}.items[${index}]`);
    }
    return;
  }

  allowOnly(progress, ['model'], path);
}

function validateSession(item, path) {
  allowOnly(item, ['date', 'title', 'track', 'learningScope', 'reviewNeeded', 'sessionId', 'source'], path);
  assert(item.source === 'SESSION_LOG', `Unexpected session source at ${path}`);
}

allowOnly(snapshot, ['schemaVersion', 'generatedAt', 'learning', 'monthly'], '$');
assert(snapshot.schemaVersion === 2, 'Unexpected snapshot schemaVersion');
allowOnly(snapshot.learning, ['courses', 'courseOrder', 'weekDays', 'updatedAt'], 'learning');

const courses = snapshot.learning.courses || {};
assertObject(courses, 'learning.courses');
for (const [id, course] of Object.entries(courses)) {
  const path = `learning.courses.${id}`;
  allowOnly(course, ['id', 'key', 'name', 'short', 'kind', 'progressModel', 'resume', 'next', 'priority', 'progress', 'evidence', 'sessions', 'historySessions', 'reviewQueue'], path);
  assert(['linear-cycle', 'dynamic-gaps', 'expanding-map'].includes(course.progressModel), `Invalid progressModel for ${id}`);
  validateProgress(course.progress, id);
  assert(course.progress?.model === course.progressModel, `Progress model mismatch for ${id}`);
  for (const [index, item] of (course.evidence || []).entries()) {
    allowOnly(item, ['status', 'text'], `${path}.evidence[${index}]`);
    assert(['ok', 'warn'].includes(item.status), `Invalid evidence status for ${id}`);
    assert(/^\d+ 項(?:穩定學習證據|持續觀察)$|^目前無需/.test(item.text), `Detailed evidence leaked for ${id}`);
  }
  for (const [index, item] of (course.sessions || []).entries()) validateSession(item, `${path}.sessions[${index}]`);
  for (const [index, item] of (course.historySessions || []).entries()) validateSession(item, `${path}.historySessions[${index}]`);
  for (const [index, item] of (course.reviewQueue || []).entries()) allowOnly(item, ['text', 'date', 'sessionId'], `${path}.reviewQueue[${index}]`);
}

for (const [index, day] of (snapshot.learning.weekDays || []).entries()) {
  const path = `learning.weekDays[${index}]`;
  allowOnly(day, ['date', 'sessions'], path);
  for (const [sessionIndex, item] of (day.sessions || []).entries()) allowOnly(item, ['key', 'name'], `${path}.sessions[${sessionIndex}]`);
}

allowOnly(snapshot.monthly, ['month', 'totalSessions', 'activeDays', 'activeCourses', 'totalCourses', 'courses', 'days', 'source', 'updatedAt'], 'monthly');
if (snapshot.monthly.month !== null) allowOnly(snapshot.monthly.month, ['year', 'month', 'label', 'start', 'end'], 'monthly.month');
for (const [index, course] of (snapshot.monthly.courses || []).entries()) allowOnly(course, ['id', 'key', 'name', 'short', 'sessions', 'activeDays', 'lastDate'], `monthly.courses[${index}]`);
for (const [index, day] of (snapshot.monthly.days || []).entries()) {
  const path = `monthly.days[${index}]`;
  allowOnly(day, ['date', 'sessions'], path);
  for (const [sessionIndex, item] of (day.sessions || []).entries()) allowOnly(item, ['key', 'name', 'count'], `${path}.sessions[${sessionIndex}]`);
}

scanValues(snapshot);
console.log('Public snapshot validation PASS');
