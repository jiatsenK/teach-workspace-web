export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

export function formatDate(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(value);
}

export function splitScopeTags(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const parts = text.split(/\s+(?:and|&)\s+|[、;；／/]+/i).map((item) => item.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, 4) : [text];
}
