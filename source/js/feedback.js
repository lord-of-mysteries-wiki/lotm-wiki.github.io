(() => {
  // 部署反馈服务后填写这两个公开配置值；不要在此放置任何密钥。
  const endpoint = '';
  const siteKey = '';
  const form = document.getElementById('fact-feedback');
  if (!form || !endpoint || !siteKey) return;
  const status = document.getElementById('feedback-status');
  const button = form.querySelector('button');
  let widget;
  window.initFeedbackCaptcha = () => {
    widget = window.hcaptcha.render('#feedback-verification', { sitekey: siteKey });
    button.disabled = false;
    status.textContent = '';
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const token = window.hcaptcha.getResponse(widget);
    if (!token) { status.textContent = '请先完成人机验证。'; return; }
    const data = new FormData(form);
    button.disabled = true;
    status.textContent = '正在提交，请稍候……';
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: data.get('page'), claim: data.get('claim'), source: data.get('source'), token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '提交未能完成，请稍后重试。');
      form.reset();
      status.textContent = '感谢您的反馈，已提交给维护者审核。';
      if (result.url && /^https:\/\/github\.com\/lord-of-mysteries-wiki\/lotm-wiki\.github\.io\/pull\/\d+$/.test(result.url)) {
        const link = document.createElement('a');
        link.href = result.url;
        link.textContent = '查看反馈';
        status.append(' ', link);
      }
    } catch (error) {
      status.textContent = error.message || '提交未能完成，请稍后重试。';
    } finally {
      window.hcaptcha.reset(widget);
      button.disabled = false;
    }
  });
})();
