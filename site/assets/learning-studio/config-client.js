import { LIVE_DATA_URL } from '../data-provider.js?v=24ee7aa';

export const CONFIG_WRITE_URL = LIVE_DATA_URL.replace(/\?.*$/, '');

export async function readLearningWriteStatus(fetchImpl = fetch) {
  const response = await fetchImpl(`${CONFIG_WRITE_URL}?action=write-status`, { redirect: 'follow' });
  if (!response.ok) throw new Error(`設定服務暫時無法使用（HTTP ${response.status}）。`);
  const status = await response.json();
  return {
    adminKeyConfigured: status.adminKeyConfigured === true,
    configPublishEnabled: status.configPublishEnabled === true,
    repository: String(status.repository || ''),
  };
}

export async function publishLearningPlatformConfig(input, fetchImpl = fetch) {
  const writeKey = String(input.writeKey || '');
  if (writeKey.length < 4) throw new Error('管理金鑰至少需要 4 個字元。');
  if (!input.config || !Array.isArray(input.config.courses)) throw new Error('設定草稿格式不完整。');
  const response = await fetchImpl(CONFIG_WRITE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'publish-platform-config', writeKey, config: input.config }),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`設定服務暫時無法使用（HTTP ${response.status}）。`);
  const result = await response.json();
  if (!result.ok) {
    const messages = {
      'write-disabled': '管理金鑰尚未在 production GAS 設定。',
      'config-write-disabled': 'GitHub 發布權限尚未在 production GAS 設定。',
      unauthorized: '管理金鑰不正確。',
      'invalid-config': '設定包含不允許的課程結構變更，請重新載入後再修改。',
      'config-conflict': 'main 已有新版本，請重新載入頁面後再發布。',
      'config-publish-failed': '無法提交 canonical 設定，請檢查 GitHub token 權限。',
    };
    throw new Error(messages[result.error] || '正式設定發布失敗。');
  }
  return result.publication;
}
