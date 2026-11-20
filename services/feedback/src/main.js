import { initBotId } from 'botid/client/core';
import './style.css';
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
    const result = await response.json();
    if (response.status === 429) throw new Error('提交过于频繁，请稍后再试。');
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '提交未能完成，请稍后重试。');
    form.reset();
    status.textContent = '感谢您的反馈，已提交给维护者审核。';
    if (/^https:\/\/github\.com\/lord-of-mysteries-wiki\/lotm-wiki\.github\.io\/pull\/\d+$/.test(result.url || '')) {
      const link = document.createElement('a'); link.href = result.url; link.textContent = '查看反馈'; status.append(' ', link);
    }
  } catch (error) { status.textContent = error.message || '提交未能完成，请稍后重试。'; }
  finally { button.disabled = false; }
});
