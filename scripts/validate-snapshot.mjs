import fs from 'node:fs/promises';
const file = process.argv[2];
if (!file) throw new Error('Usage: node validate-snapshot.mjs <snapshot.json>');
const snapshot = JSON.parse(await fs.readFile(file, 'utf8'));
const topKeys = new Set(['schemaVersion', 'generatedAt', 'learning', 'monthly']);
const learningKeys = new Set(['courses', 'courseOrder', 'hierarchy', 'weekDays', 'updatedAt']);
const courseKeys = new Set(['id', 'key', 'name', 'short', 'kind', 'progressModel', 'resume', 'next', 'priority', 'progress', 'evidence', 'sessions', 'historySessions', 'reviewQueue']);
const hierarchyKeys = new Set(['subjects', 'courses']);
const subjectKeys = new Set(['id', 'name', 'order', 'currentCourseIds', 'historyCourseIds']);
const hierarchyCourseKeys = new Set(['id', 'subjectId', 'name', 'short', 'courseType', 'status', 'progress', 'units', 'vocabulary', 'courseContent', 'courseVocabulary']);
const unitKeys = new Set(['id', 'number', 'name', 'status', 'sourceRange', 'outline', 'content', 'vocabulary']);
const contentKeys = new Set(['id', 'type', 'label', 'explanation', 'sourceRange']);
const vocabularyKeys = new Set(['id', 'word', 'meaning', 'form', 'memoryStatus', 'sourceRange']);
const forbiddenKeys = /(?:raw|stateText|syllabusText|corrections?|answers?|credential|token|secret|email|phone|address|projectKey|sheetId|spreadsheetId)/i;
const credentialLike = /(?:github_pat_|\bgh[pousr]_[0-9A-Za-z]{20,}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bGOCSPX-[0-9A-Za-z_-]{20,}\b|\bsk-(?:proj-)?[0-9A-Za-z_-]{20,}\b|\bxox[baprs]-[0-9A-Za-z-]{20,}\b)/;
const emailLike = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const urlLike = /https?:\/\//i;
const phoneLike = /(?:\b09\d{2}[- ]?\d{3}[- ]?\d{3}\b|\b0[2-8][- ]?\d{3,4}[- ]?\d{4}\b)/;
const memoryStatuses = new Set(['未開始', '待記憶', '練習中', '已記住', '待複習']);
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertKeys(value, allowed, path) { for (const key of Object.keys(value || {})) assert(allowed.has(key), `Unexpected key ${path}.${key}`); }
function assertPublicText(value, maxLength, path) { assert(String(value || '').length <= maxLength, `Public text too long at ${path}`); }
function walk(value, path = '$') { if (typeof value === 'string') { assert(!credentialLike.test(value), `Credential-like value at ${path}`); assert(!emailLike.test(value), `Email-like value at ${path}`); assert(!phoneLike.test(value), `Phone-like value at ${path}`); assert(!urlLike.test(value), `Unexpected URL at ${path}`); return; } if (Array.isArray(value)) { value.forEach((child, index) => walk(child, `${path}[${index}]`)); return; } if (!value || typeof value !== 'object') return; for (const [key, child] of Object.entries(value)) { assert(!forbiddenKeys.test(key), `Forbidden key at ${path}.${key}`); walk(child, `${path}.${key}`); } }
function validateContent(items, path) { for (const item of items || []) { assertKeys(item, contentKeys, `${path}[]`); assertPublicText(item.label, 240, `${path}.label`); assertPublicText(item.explanation, 600, `${path}.explanation`); assertPublicText(item.sourceRange, 240, `${path}.sourceRange`); } }
function validateVocabulary(items, path) { for (const item of items || []) { assertKeys(item, vocabularyKeys, `${path}[]`); assert(memoryStatuses.has(item.memoryStatus), `Invalid memory status ${path}.${item.id}`); assertPublicText(item.word, 120, `${path}.word`); assertPublicText(item.meaning, 240, `${path}.meaning`); assertPublicText(item.form, 240, `${path}.form`); } }
assert(snapshot.schemaVersion === 3, 'Unexpected snapshot schemaVersion');
assertKeys(snapshot, topKeys, '$'); assertKeys(snapshot.learning, learningKeys, '$.learning');
const courses = snapshot.learning.courses || {};
for (const [id, course] of Object.entries(courses)) { assertKeys(course, courseKeys, `$.learning.courses.${id}`); for (const item of course.evidence || []) { assert(['ok', 'warn'].includes(item.status), `Invalid evidence status for ${id}`); assert(/^\d+ 項(?:穩定學習證據|持續觀察)$|^目前無需/.test(item.text), `Detailed evidence leaked for ${id}`); } for (const collection of ['sessions', 'historySessions']) { for (const session of course[collection] || []) { validateContent(session.content, `${id}.${collection}.${session.sessionId || '?'}.content`); validateVocabulary(session.vocabulary, `${id}.${collection}.${session.sessionId || '?'}.vocabulary`); } } }
const hierarchy = snapshot.learning.hierarchy || {}; assertKeys(hierarchy, hierarchyKeys, '$.learning.hierarchy');
const subjectIds = new Set(); const hierarchyCourseIds = new Set((hierarchy.courses || []).map((course) => String(course.id || '')));
for (const subject of hierarchy.subjects || []) { assertKeys(subject, subjectKeys, '$.learning.hierarchy.subjects[]'); assert(subject.id, 'Subject id is required'); subjectIds.add(subject.id); for (const courseId of [...(subject.currentCourseIds || []), ...(subject.historyCourseIds || [])]) assert(hierarchyCourseIds.has(String(courseId)), `Subject ${subject.id} references missing course ${courseId}`); }
for (const course of hierarchy.courses || []) { assertKeys(course, hierarchyCourseKeys, `$.learning.hierarchy.courses.${course.id || '?'}`); assert(subjectIds.has(course.subjectId), `Unknown subjectId for course ${course.id}`); for (const unit of course.units || []) { assertKeys(unit, unitKeys, `$.learning.hierarchy.courses.${course.id}.units.${unit.id || '?'}`); assert(['done', 'current', 'todo'].includes(unit.status), `Invalid unit status ${course.id}.${unit.id}`); assertPublicText(unit.sourceRange, 240, `${course.id}.${unit.id}.sourceRange`); validateContent(unit.content, `${course.id}.${unit.id}.content`); validateVocabulary(unit.vocabulary, `${course.id}.${unit.id}.vocabulary`); } validateContent(course.courseContent, `${course.id}.courseContent`); validateVocabulary(course.courseVocabulary, `${course.id}.courseVocabulary`); if (course.vocabulary !== null) { const sessions = courses[course.id]?.historySessions || courses[course.id]?.sessions || []; const vocabulary = [...(course.units || []).flatMap((unit) => unit.vocabulary || []), ...(course.courseVocabulary || []), ...sessions.flatMap((session) => session.vocabulary || [])]; assert(course.vocabulary.total === vocabulary.length, `Vocabulary total mismatch for ${course.id}`); } }
walk(snapshot); console.log('Public snapshot validation PASS');
