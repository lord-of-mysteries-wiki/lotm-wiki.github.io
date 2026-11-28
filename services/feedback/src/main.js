import { initBotId } from 'botid/client/core';
import '../../../source/css/typography.css';
import './style.css';
const embedded = new URLSearchParams(location.search).get('embed') === '1';
document.body.classList.toggle('is-embedded', embedded);
document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
// The host only controls presentation; form contents and submissions stay here.
if (embedded && document.referrer) {
  const parentOrigin = new URL(document.referrer).origin;
  const main = document.querySelector('main');
  let lastHeight;
  const updateHeight = () => {
    const height = Math.ceil(main.getBoundingClientRect().height) + 4;
    if (height !== lastHeight) {
      lastHeight = height;
      parent.postMessage({ type: 'lotm-feedback-size', height }, parentOrigin);
    }
  };
  new ResizeObserver(updateHeight).observe(main);
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== parentOrigin) return;
    if (event.data?.type === 'lotm-feedback-theme' && ['day', 'night'].includes(event.data.theme)) {
      document.documentElement.dataset.theme = event.data.theme;
    }
  });
  updateHeight();
}
initBotId({ protect: [{ path: '/api/feedback', method: 'POST' }] });
const form = document.querySelector('#fact-feedback');
const status = document.querySelector('#status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = '正在提交，请稍候……';
  try {
    const data = Object.fromEntries(new FormData(form));
    const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (response.status === 429) throw new Error('提交过于频繁，请稍后再试。');
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '提交未能完成，请稍后重试。');
    form.reset();
    status.textContent = '感谢您的反馈，已提交给维护者审核。';
    if (/^https:\/\/github\.com\/lord-of-mysteries-wiki\/lotm-wiki\.github\.io\/pull\/\d+$/.test(result.url || '')) {
      const link = document.createElement('a'); link.href = result.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '查看反馈'; status.append(' ', link);
    }
  } catch (error) { status.textContent = error.message || '提交未能完成，请稍后重试。'; }
  finally { button.disabled = false; }
});
