import { LIVE_DATA_URL } from '../data-provider.js';

export const NOTE_WRITE_URL = LIVE_DATA_URL.replace(/\?.*$/, '');

export async function writeLearningNote(input, fetchImpl = fetch) {
  const payload = {
    action: 'save-note',
    writeKey: String(input.writeKey || ''),
    courseId: String(input.courseId || ''),
    unitId: String(input.unitId || ''),
    sessionId: String(input.sessionId || ''),
    title: String(input.title || '').trim(),
    text: String(input.text || '').trim(),
  };
  if (!payload.courseId || (!payload.unitId && !payload.sessionId) || (payload.unitId && payload.sessionId)) {
    throw new Error('筆記缺少唯一的課程脈絡。');
  }
  if (!payload.writeKey) throw new Error('請輸入筆記寫入金鑰。');
  if (!payload.text) throw new Error('筆記內容不能空白。');

  const response = await fetchImpl(NOTE_WRITE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`筆記服務暫時無法使用（HTTP ${response.status}）。`);
  const result = await response.json();
  if (!result.ok) {
    const messages = {
      'write-disabled': '筆記寫入尚未在後台解鎖。',
      unauthorized: '寫入金鑰不正確。',
      'invalid-context': '這個課程脈絡無法寫入筆記。',
      'not-found': '找不到指定的課程或單元。',
    };
    throw new Error(messages[result.error] || '筆記儲存失敗。');
  }
  return result.note;
}
