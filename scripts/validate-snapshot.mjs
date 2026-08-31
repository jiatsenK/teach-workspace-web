import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) throw new Error('Usage: node validate-snapshot.mjs <snapshot.json>');
const snapshot = JSON.parse(await fs.readFile(file, 'utf8'));

const topKeys = new Set(['schemaVersion', 'generatedAt', 'publication', 'learning', 'monthly']);
const learningKeys = new Set(['courses', 'courseOrder', 'hierarchy', 'weekDays', 'updatedAt']);
const courseKeys = new Set(['id', 'key', 'name', 'short', 'kind', 'progressModel', 'resume', 'next', 'priority', 'progress', 'evidence', 'sessions', 'historySessions', 'reviewQueue', 'review', 'operations', 'exam']);
const hierarchyKeys = new Set(['subjects', 'courses']);
const subjectKeys = new Set(['id', 'name', 'order', 'currentCourseIds', 'historyCourseIds']);
const hierarchyCourseKeys = new Set(['id', 'subjectId', 'name', 'short', 'courseType', 'status', 'progress', 'units', 'vocabulary', 'courseContent', 'courseVocabulary']);
const unitKeys = new Set(['id', 'number', 'name', 'status', 'sourceRange', 'outline', 'content', 'vocabulary']);
const contentKeys = new Set(['id', 'type', 'label', 'explanation', 'sourceRange']);
const vocabularyKeys = new Set(['id', 'word', 'meaning', 'form', 'memoryStatus', 'sourceRange']);
const examKeys = new Set(['questionCount', 'questions']);
const questionKeys = new Set(['id', 'examLabel', 'prompt', 'memorization', 'notes']);
const memorizationKeys = new Set(['status', 'text']);
const noteKeys = new Set(['id', 'title', 'text', 'mnemonic']);
const sessionKeys = new Set(['date', 'title', 'track', 'learningScope', 'completedSummary', 'learningAdjustments', 'reviewSummary', 'learnerPerformance', 'reviewNeeded', 'nextStart', 'sessionId', 'source', 'content', 'vocabulary']);
const reviewKeys = new Set(['queue', 'notes', 'anki']);
const reviewItemKeys = new Set(['id', 'type', 'text', 'status', 'lastReview', 'nextReview']);
const reviewNoteKeys = new Set(['id', 'unitId', 'sessionId', 'title', 'text', 'mnemonic', 'updatedAt']);
const reviewAnkiKeys = new Set(['id', 'type', 'prompt', 'response', 'tags']);
const operationsKeys = new Set(['recordHealth', 'ankiRelease']);
const recordHealthKeys = new Set(['latestSession', 'sessionCount', 'ankiPackageReady']);
const latestSessionHealthKeys = new Set(['sessionId', 'date', 'title', 'fields', 'complete']);
const recordFieldKeys = new Set(['stableId', 'learningScope', 'completedSummary', 'reviewSummary', 'learnerPerformance', 'nextStart']);
const ankiReleaseKeys = new Set(['generatedAt', 'noteCount', 'noteTypes', 'status']);
const forbiddenKeys = /(?:raw|stateText|syllabusText|corrections?|answers?|credential|token|secret|email|phone|address|projectKey|sheetId|spreadsheetId)/i;
const forbiddenValues = /(?:CORR|CACHE|RES)-\d+|(?:korean|japanese|english|construction)\/[a-z0-9-]+/i;
const memoryStatuses = new Set(['未開始', '待記憶', '練習中', '已記住', '待複習']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertKeys(value, allowed, path) {
  for (const key of Object.keys(value || {})) assert(allowed.has(key), `Unexpected key ${path}.${key}`);
}

function assertPublicText(value, maxLength, path) {
  assert(String(value || '').length <= maxLength, `Public text too long at ${path}`);
}

function walk(value, path = '$') {
  if (typeof value === 'string') {
    assert(!forbiddenValues.test(value), `Forbidden private value at ${path}`);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!forbiddenKeys.test(key), `Forbidden key at ${path}.${key}`);
    walk(child, `${path}.${key}`);
  }
}

function validateContent(item, path) {
  assertKeys(item, contentKeys, path);
  assertPublicText(item.label, 240, `${path}.label`);
  assertPublicText(item.explanation, 600, `${path}.explanation`);
  assertPublicText(item.sourceRange, 240, `${path}.sourceRange`);
}

function validateVocabulary(item, path) {
  assertKeys(item, vocabularyKeys, path);
  assert(memoryStatuses.has(item.memoryStatus), `Invalid memory status at ${path}`);
  assertPublicText(item.word, 120, `${path}.word`);
  assertPublicText(item.meaning, 240, `${path}.meaning`);
  assertPublicText(item.form, 240, `${path}.form`);
}

function validateSession(session, path) {
  assertKeys(session, sessionKeys, path);
  assert(session.source === 'COURSE_LEARNING_DATA', `Invalid session source at ${path}`);
  for (const field of ['title', 'track', 'learningScope', 'completedSummary', 'learningAdjustments', 'reviewSummary', 'learnerPerformance', 'reviewNeeded', 'nextStart']) {
    assertPublicText(session[field], 4000, `${path}.${field}`);
  }
  for (const item of session.content || []) validateContent(item, `${path}.content[]`);
  for (const item of session.vocabulary || []) validateVocabulary(item, `${path}.vocabulary[]`);
}

assert(snapshot.schemaVersion === 4, 'Unexpected snapshot schemaVersion');
assertKeys(snapshot, topKeys, '$');
assert(snapshot.learning && typeof snapshot.learning === 'object', 'Missing learning payload');
assert(snapshot.monthly && typeof snapshot.monthly === 'object', 'Missing monthly payload');
if (snapshot.publication !== undefined) {
  assertKeys(snapshot.publication, new Set(['configVersion', 'projectedAt', 'courses']), '$.publication');
  for (const [courseId, course] of Object.entries(snapshot.publication.courses || {})) {
    assertKeys(course, new Set(['visible', 'shape', 'sections']), `$.publication.courses.${courseId}`);
    for (const [sectionId, section] of Object.entries(course.sections || {})) {
      assertKeys(section, new Set(['visible', 'available', 'published']), `$.publication.courses.${courseId}.sections.${sectionId}`);
      assert(Number.isInteger(section.available) && section.available >= 0, `Invalid available count for ${courseId}.${sectionId}`);
      assert(Number.isInteger(section.published) && section.published >= 0, `Invalid published count for ${courseId}.${sectionId}`);
      if (!section.visible) assert(section.published === 0, `Hidden section published data for ${courseId}.${sectionId}`);
    }
  }
}
assertKeys(snapshot.learning, learningKeys, '$.learning');

const courses = snapshot.learning.courses || {};
for (const [id, course] of Object.entries(courses)) {
  assertKeys(course, courseKeys, `$.learning.courses.${id}`);
  assert(course.id === id && course.key === id, `Course ${id} must use its public id as key`);
  for (const item of course.evidence || []) {
    assert(['ok', 'warn'].includes(item.status), `Invalid evidence status for ${id}`);
    assert(/^\d+ 項(?:穩定學習證據|持續觀察)$|^目前無需/.test(item.text), `Detailed evidence leaked for ${id}`);
  }
  for (const session of course.sessions || []) validateSession(session, `$.learning.courses.${id}.sessions[]`);
  for (const session of course.historySessions || []) validateSession(session, `$.learning.courses.${id}.historySessions[]`);
  assertKeys(course.review || {}, reviewKeys, `$.learning.courses.${id}.review`);
  for (const item of course.review?.queue || []) {
    assertKeys(item, reviewItemKeys, `$.learning.courses.${id}.review.queue[]`);
    assertPublicText(item.text, 4000, `${id}.review.queue.text`);
  }
  for (const note of course.review?.notes || []) {
    assertKeys(note, reviewNoteKeys, `$.learning.courses.${id}.review.notes[]`);
    assertPublicText(note.title, 240, `${id}.review.notes.title`);
    assertPublicText(note.text, 8000, `${id}.review.notes.text`);
    assertPublicText(note.mnemonic, 1000, `${id}.review.notes.mnemonic`);
  }
  for (const note of course.review?.anki || []) {
    assertKeys(note, reviewAnkiKeys, `$.learning.courses.${id}.review.anki[]`);
    assertPublicText(note.prompt, 4000, `${id}.review.anki.prompt`);
    assertPublicText(note.response, 8000, `${id}.review.anki.response`);
  }
  if (course.operations !== undefined) {
    assertKeys(course.operations, operationsKeys, `$.learning.courses.${id}.operations`);
    assert(course.operations.recordHealth && typeof course.operations.recordHealth === 'object', `Missing recordHealth for ${id}`);
    const health = course.operations.recordHealth || {};
    assertKeys(health, recordHealthKeys, `$.learning.courses.${id}.operations.recordHealth`);
    assert(Number.isInteger(health.sessionCount) && health.sessionCount >= 0, `Invalid sessionCount for ${id}`);
    assert(typeof health.ankiPackageReady === 'boolean', `Invalid ankiPackageReady for ${id}`);
    if (health.latestSession !== null) {
      assertKeys(health.latestSession, latestSessionHealthKeys, `$.learning.courses.${id}.operations.recordHealth.latestSession`);
      assertPublicText(health.latestSession.sessionId, 80, `${id}.operations.latestSession.sessionId`);
      assertPublicText(health.latestSession.date, 80, `${id}.operations.latestSession.date`);
      assertPublicText(health.latestSession.title, 400, `${id}.operations.latestSession.title`);
      assertKeys(health.latestSession.fields, recordFieldKeys, `$.learning.courses.${id}.operations.recordHealth.latestSession.fields`);
      assert(Object.keys(health.latestSession.fields || {}).length === recordFieldKeys.size, `Missing record health fields for ${id}`);
      for (const [field, present] of Object.entries(health.latestSession.fields || {})) {
        assert(typeof present === 'boolean', `Invalid record health field ${id}.${field}`);
      }
      assert(typeof health.latestSession.complete === 'boolean', `Invalid record completeness for ${id}`);
      assert(health.latestSession.complete === Object.values(health.latestSession.fields || {}).every(Boolean), `Record completeness mismatch for ${id}`);
    }
    const release = course.operations.ankiRelease;
    if (release !== null) {
      assertKeys(release, ankiReleaseKeys, `$.learning.courses.${id}.operations.ankiRelease`);
      assertPublicText(release.generatedAt, 80, `${id}.operations.ankiRelease.generatedAt`);
      assert(Number.isInteger(release.noteCount) && release.noteCount >= 0, `Invalid Anki noteCount for ${id}`);
      assert(Array.isArray(release.noteTypes) && release.noteTypes.length <= 20, `Invalid Anki noteTypes for ${id}`);
      for (const type of release.noteTypes) assertPublicText(type, 120, `${id}.operations.ankiRelease.noteTypes[]`);
      assertPublicText(release.status, 80, `${id}.operations.ankiRelease.status`);
    }
  }
  if (course.exam !== undefined) {
    assert(id === 'construction', `Exam projection is only allowed for construction, not ${id}`);
    assertKeys(course.exam, examKeys, `$.learning.courses.${id}.exam`);
    assert(Number.isInteger(course.exam.questionCount), `Invalid questionCount for ${id}`);
    assert(course.exam.questionCount === (course.exam.questions || []).length, `questionCount mismatch for ${id}`);
    const questionIds = new Set();
    for (const question of course.exam.questions || []) {
      assertKeys(question, questionKeys, `$.learning.courses.${id}.exam.questions[]`);
      assert(/^Q-\d{4}$/.test(question.id), `Invalid question id ${question.id}`);
      assert(!questionIds.has(question.id), `Duplicate question id ${question.id}`);
      questionIds.add(question.id);
      assertPublicText(question.examLabel, 120, `${id}.${question.id}.examLabel`);
      assertPublicText(question.prompt, 2000, `${id}.${question.id}.prompt`);
      assertKeys(question.memorization, memorizationKeys, `${id}.${question.id}.memorization`);
      assert(['verified', 'unavailable'].includes(question.memorization.status), `Invalid memorization status ${id}.${question.id}`);
      assertPublicText(question.memorization.text, 6000, `${id}.${question.id}.memorization.text`);
      if (question.memorization.status === 'verified') assert(Boolean(question.memorization.text), `Verified memorization is empty at ${id}.${question.id}`);
      if (question.memorization.status === 'unavailable') assert(question.memorization.text === '', `Unavailable memorization has text at ${id}.${question.id}`);
      for (const note of question.notes || []) {
        assertKeys(note, noteKeys, `${id}.${question.id}.notes[]`);
        assert(/^NOTE-\d{4}$/.test(note.id), `Invalid note id ${note.id}`);
        assertPublicText(note.title, 240, `${id}.${question.id}.notes.title`);
        assertPublicText(note.text, 4000, `${id}.${question.id}.notes.text`);
        assertPublicText(note.mnemonic, 1000, `${id}.${question.id}.notes.mnemonic`);
      }
    }
  }
}

const hierarchy = snapshot.learning.hierarchy || {};
assertKeys(hierarchy, hierarchyKeys, '$.learning.hierarchy');
const subjectIds = new Set();
const hierarchyCourseIds = new Set((hierarchy.courses || []).map((course) => String(course.id || '')));
for (const subject of hierarchy.subjects || []) {
  assertKeys(subject, subjectKeys, '$.learning.hierarchy.subjects[]');
  assert(subject.id, 'Subject id is required');
  subjectIds.add(subject.id);
  for (const courseId of [...(subject.currentCourseIds || []), ...(subject.historyCourseIds || [])]) {
    assert(hierarchyCourseIds.has(String(courseId)), `Subject ${subject.id} references missing course ${courseId}`);
  }
}

for (const course of hierarchy.courses || []) {
  assertKeys(course, hierarchyCourseKeys, `$.learning.hierarchy.courses.${course.id || '?'}`);
  assert(subjectIds.has(course.subjectId), `Unknown subjectId for course ${course.id}`);
  for (const unit of course.units || []) {
    assertKeys(unit, unitKeys, `$.learning.hierarchy.courses.${course.id}.units.${unit.id || '?'}`);
    assert(['done', 'current', 'todo'].includes(unit.status), `Invalid unit status ${course.id}.${unit.id}`);
    assertPublicText(unit.sourceRange, 240, `${course.id}.${unit.id}.sourceRange`);
    for (const item of unit.content || []) {
      validateContent(item, `$.learning.hierarchy.courses.${course.id}.units.${unit.id}.content[]`);
    }
    for (const item of unit.vocabulary || []) {
      validateVocabulary(item, `$.learning.hierarchy.courses.${course.id}.units.${unit.id}.vocabulary[]`);
    }
  }
  for (const item of course.courseContent || []) validateContent(item, `$.learning.hierarchy.courses.${course.id}.courseContent[]`);
  for (const item of course.courseVocabulary || []) validateVocabulary(item, `$.learning.hierarchy.courses.${course.id}.courseVocabulary[]`);
}

walk(snapshot);
console.log('Public snapshot validation PASS');
