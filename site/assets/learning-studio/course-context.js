function normalizedUnitId(value) {
  const text = String(value || '').trim().toUpperCase();
  const match = text.match(/^UNIT-(\d{1,3})$/);
  return match ? `UNIT-${match[1].padStart(2, '0')}` : '';
}

export function unitIdForSession(session = {}, course = {}) {
  const explicit = normalizedUnitId(session.unitId);
  if (explicit) return explicit;
  if (course.contentPlacement !== 'unit') return '';

  const source = [session.title, session.learningScope, session.track].filter(Boolean).join(' ');
  const match = source.match(/\bUnit\s*0*(\d{1,3})\b/i) || source.match(/第\s*0*(\d{1,3})\s*課/);
  return match ? `UNIT-${match[1].padStart(2, '0')}` : '';
}

export function sessionsForUnit(sessions = [], unit = {}, course = {}) {
  const unitId = normalizedUnitId(unit.id || unit.unitId);
  if (!unitId) return [];
  return sessions.filter((session) => unitIdForSession(session, course) === unitId);
}

export function contextIdForSelection({ unit, session } = {}) {
  return normalizedUnitId(unit?.id || unit?.unitId) || String(session?.sessionId || '').trim();
}

export function groupFootprintsByDate(courses = []) {
  const byDate = new Map();
  courses.forEach((course) => {
    (course.sessions || []).forEach((session) => {
      const date = String(session.date || '').trim();
      if (!date) return;
      const entries = byDate.get(date) || [];
      entries.push({ ...session, courseId: course.id, courseName: course.name });
      byDate.set(date, entries);
    });
  });
  return [...byDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, entries]) => ({ date, entries }));
}
