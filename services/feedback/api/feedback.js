import { webcrypto } from 'node:crypto';
import { checkBotId } from 'botid/server';
const crypto = webcrypto;
const REPO = 'lord-of-mysteries-wiki/lotm-wiki.github.io';
const b64 = bytes => Buffer.from(bytes).toString('base64url');
const encoded = value => b64(new TextEncoder().encode(JSON.stringify(value)));

async function githubToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = encoded({ alg: 'RS256', typ: 'JWT' });
  const payload = encoded({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID });
  const pem = env.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const input = `${header}.${payload}`;
  const jwt = `${input}.${b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input)))}`;
  const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lotm-feedback', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ repositories: ['lotm-wiki.github.io'], permissions: { contents: 'write', pull_requests: 'write' } }) });
  if (!response.ok) throw new Error('Installation token failed');
  return (await response.json()).token;
}

async function github(token, path, method = 'GET', body) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lotm-feedback', 'X-GitHub-Api-Version': '2022-11-28' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const reply = (status, data) => res.status(status).json(data);
  if (req.method !== 'POST') return reply(405, { error: '请求方式无效。' });
  if (process.env.FEEDBACK_ENABLED !== 'true') return reply(503, { error: '反馈服务尚未启用。' });
  if (!req.headers['content-type']?.startsWith('application/json') || Number(req.headers['content-length'] || 0) > 12000) return reply(400, { error: '请求格式或长度无效。' });
  let data;
  try { data = req.body; } catch (_) { return reply(400, { error: '请求格式无效。' }); }
  if (!data || typeof data !== 'object' || Buffer.byteLength(JSON.stringify(data)) > 12000) return reply(400, { error: '请求格式或长度无效。' });
  for (const [key, max] of [['page', 500], ['claim', 4000], ['source', 3000]]) {
    if (typeof data[key] !== 'string' || !data[key].trim() || data[key].length > max) return reply(400, { error: '请检查各项内容及长度。' });
  }
  try {
    const env = process.env;
    const verification = await checkBotId({ advancedOptions: { headers: req.headers } });
    if (verification.isBot) return reply(403, { error: '验证未通过，请重试。' });
    const token = await githubToken(env);
    const base = await github(token, '/git/ref/heads/main');
    const id = crypto.randomUUID();
    const branch = `feedback/${id}`;
    await github(token, '/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: base.object.sha });
    try {
      const content = `# 事实异议\n\n## 相关页面\n\n${data.page.trim()}\n\n## 意见\n\n${data.claim.trim()}\n\n## 依据\n\n${data.source.trim()}\n`;
      await github(token, `/contents/feedback/${id}.md`, 'PUT', { message: '收到事实异议', content: Buffer.from(content).toString('base64'), branch });
      const pr = await github(token, '/pulls', 'POST', { title: '反馈：事实异议', head: branch, base: 'main', body: '读者通过反馈页面提交的事实异议，请核对来源后处理。' });
      return reply(200, { url: pr.html_url });
    } catch (error) {
      try { await github(token, `/git/refs/heads/${branch}`, 'DELETE'); } catch (_) {}
      throw error;
    }
  } catch (error) {
    console.error('Feedback submission failed', error.message);
    return reply(500, { error: '提交未能完成，请稍后重试。' });
  }
}
