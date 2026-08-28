import fs from 'node:fs/promises';

const file = process.argv[2];
if (!file) throw new Error('Usage: node validate-snapshot.mjs <snapshot.json>');
const snapshot = JSON.parse(await fs.readFile(file, 'utf8'));

const topKeys = new Set(['schemaVersion', 'generatedAt', 'learning', 'monthly']);
const courseKeys = new Set(['id', 'key', 'name', 'short', 'kind', 'quotaId', 'resume', 'next', 'priority', 'progress', 'evidence', 'sessions']);
const forbiddenKeys = /(?:raw|stateText|syllabusText|corrections?|answers?|credential|token|secret|email|phone|address)/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(value, path = '$') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!forbiddenKeys.test(key), `Forbidden key at ${path}.${key}`);
    walk(child, `${path}.${key}`);
  }
}

assert(snapshot.schemaVersion === 1, 'Unexpected snapshot schemaVersion');
for (const key of Object.keys(snapshot)) assert(topKeys.has(key), `Unexpected top-level key: ${key}`);
assert(snapshot.learning && typeof snapshot.learning === 'object', 'Missing learning payload');
assert(snapshot.monthly && typeof snapshot.monthly === 'object', 'Missing monthly payload');

const courses = snapshot.learning.courses || {};
for (const [id, course] of Object.entries(courses)) {
  for (const key of Object.keys(course)) assert(courseKeys.has(key), `Unexpected course key ${id}.${key}`);
  for (const item of course.evidence || []) {
    assert(['ok', 'warn'].includes(item.status), `Invalid evidence status for ${id}`);
    assert(/^\d+ 項(?:穩定學習證據|持續觀察)$|^目前無需/.test(item.text), `Detailed evidence leaked for ${id}`);
  }
}

walk(snapshot);
console.log('Public snapshot validation PASS');
