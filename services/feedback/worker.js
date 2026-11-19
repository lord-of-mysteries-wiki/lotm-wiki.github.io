const REPO = 'lord-of-mysteries-wiki/lotm-wiki.github.io';
const ORIGIN = 'https://lord-of-mysteries-wiki.github.io';
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const encoded = value => b64(new TextEncoder().encode(JSON.stringify(value)));

export class RateLimiter {
  constructor(state) { this.state = state; }
  async fetch() {
    const now = Date.now();
    return this.state.blockConcurrencyWhile(async () => {
      const previous = await this.state.storage.get('last') || 0;
      if (now - previous < 600000) return new Response('Too many requests', { status: 429 });
      await this.state.storage.put('last', now);
      return new Response('OK');
    });
  }
}

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

export default {
  async fetch(request, env) {
    const headers = { 'Access-Control-Allow-Origin': ORIGIN, 'Vary': 'Origin', 'Content-Type': 'application/json; charset=utf-8' };
    const reply = (status, value) => new Response(JSON.stringify(value), { status, headers });
    if (request.headers.get('Origin') !== ORIGIN) return reply(403, { error: '请求来源无效。' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'POST') return reply(405, { error: '请求方式无效。' });
    if (!request.headers.get('Content-Type')?.startsWith('application/json') || Number(request.headers.get('Content-Length') || 0) > 12000) return reply(400, { error: '请求格式或长度无效。' });
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 12000) return reply(400, { error: '内容过长。' });
      const data = JSON.parse(raw);
      for (const [key, max] of [['page', 500], ['claim', 4000], ['source', 3000], ['token', 2048]]) {
        if (typeof data[key] !== 'string' || !data[key].trim() || data[key].length > max) return reply(400, { error: '请检查各项内容及长度。' });
      }
      const ip = request.headers.get('CF-Connecting-IP');
      if (!ip) return reply(400, { error: '无法验证请求。' });
      const limiter = env.RATE_LIMITER.get(env.RATE_LIMITER.idFromName(ip));
      if (!(await limiter.fetch('https://limiter/')).ok) return reply(429, { error: '提交过于频繁，请稍后再试。' });
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: data.token, remoteip: ip }) });
      const result = await verify.json();
      if (!result.success || result.hostname !== 'lord-of-mysteries-wiki.github.io') return reply(400, { error: '验证未通过，请重试。' });
      const token = await githubToken(env);
      const base = await github(token, '/git/ref/heads/main');
      const id = crypto.randomUUID();
      const branch = `feedback/${id}`;
      await github(token, '/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: base.object.sha });
      try {
        const content = `# 事实异议\n\n## 相关页面\n\n${data.page.trim()}\n\n## 意见\n\n${data.claim.trim()}\n\n## 依据\n\n${data.source.trim()}\n`;
        await github(token, `/contents/feedback/${id}.md`, 'PUT', { message: '收到事实异议', content: (() => { const value = b64(new TextEncoder().encode(content)).replace(/-/g, '+').replace(/_/g, '/'); return value + '='.repeat((4 - value.length % 4) % 4); })(), branch });
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
};
