import { esc } from '../lib/html.js';

function typeLabel(value) {
  return ({ vocabulary: '單字', collocation: '搭配', 'abstract-expression': '抽象表達' })[String(value || '')] || '';
}

function actionLabel(value) {
  return ({ memorize: '要記住', 'sentence-production': '要自己造句', 'observe-in-production': '之後口說再觀察' })[String(value || '')] || '';
}

function group(items, status, label, eyebrow) {
  const list = (items || []).filter((item) => item.status === status);
  return `<section class="card ${status === 'PRACTICING' ? 'purple' : 'soft'}"><div class="eyebrow">${esc(eyebrow)}</div><h3 class="section-title" style="margin-top:5px">${esc(label)}</h3>${list.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${list.map((item) => {
    const details = [typeLabel(item.type), actionLabel(item.action)].filter(Boolean).join(' · ');
    return `<div style="max-width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper)"><b style="display:block;font-size:12px">${esc(item.concept)}</b>${details ? `<span class="tiny">${esc(details)}</span>` : ''}</div>`;
  }).join('')}</div>` : '<div class="empty">目前沒有內容。</div>'}</section>`;
}

export function renderExpandingMap(progress) {
  const items = progress?.items || [];
  return `<div class="grid2">${group(items, 'PRACTICING', '正在練習', '還沒說順')}${group(items, 'NEW', '新發現的表達問題', '之後要處理')}</div>`;
}
