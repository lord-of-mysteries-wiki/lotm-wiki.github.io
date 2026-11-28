const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('feedback frame accepts sizing only from its service window and keeps theme in sync', () => {
  const events = {}, frameEvents = {}, messages = [];
  const serviceWindow = { postMessage: (...args) => messages.push(args) };
  const frame = { src: 'https://feedback.example.invalid/?embed=1', contentWindow: serviceWindow,
    style: {}, addEventListener: (name, fn) => { frameEvents[name] = fn; } };
  const document = { querySelector: () => frame, documentElement: { dataset: { theme: 'day' } } };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../source/js/feedback-frame.js'), 'utf8'), {
    document, URL, window: { addEventListener: (name, fn) => { events[name] = fn; } }
  });
  const valid = { origin: 'https://feedback.example.invalid', source: serviceWindow,
    data: { type: 'lotm-feedback-size', height: 641.4 } };
  for (const event of [
    { ...valid, origin: 'https://other.example.invalid' },
    { ...valid, source: {} },
    { ...valid, data: { type: 'other', height: 999 } },
    { ...valid, data: { type: 'lotm-feedback-size', height: Infinity } },
    { ...valid, data: { type: 'lotm-feedback-size', height: '999' } }
  ]) events.message(event);
  assert.equal(frame.style.height, undefined);
  events.message(valid);
  assert.equal(frame.style.height, '642px');
  events.message({ ...valid, data: { ...valid.data, height: -1 } });
  assert.equal(frame.style.height, '320px');
  events.message({ ...valid, data: { ...valid.data, height: 99999 } });
  assert.equal(frame.style.height, '2400px');
  document.documentElement.dataset.theme = 'night';
  events['wiki-theme-change']();
  frameEvents.load();
  assert.equal(messages.at(-1)[0].theme, 'night');
  assert.equal(messages.at(-1)[0].type, 'lotm-feedback-theme');
  assert.equal(messages.at(-1)[1], valid.origin);
});

test('feedback keeps drafts on errors, handles HTML rate limits and resets only after success', async () => {
  const script = fs.readFileSync(path.resolve(__dirname, '../../services/feedback/src/main.js'), 'utf8')
    .replace(/^import .+;\r?\n/gm, '');
  for (const scenario of [
    { status: 200, result: { url: 'https://github.com/lord-of-mysteries-wiki/lotm-wiki.github.io/pull/123' }, success: true },
    { status: 429, invalidJson: true, message: '提交过于频繁，请稍后再试。' },
    { status: 500, invalidJson: true, message: '提交未能完成，请稍后重试。' },
    { status: 403, result: { error: '验证未通过，请重试。' }, message: '验证未通过，请重试。' }
  ]) {
    let submit, resetCount = 0, request;
    const button = { disabled: false }, links = [];
    const status = { textContent: '', append: (...nodes) => links.push(...nodes) };
    const form = { values: { page: '测试页面', claim: '测试意见', source: '测试章节' },
      addEventListener: (name, fn) => { if (name === 'submit') submit = fn; },
      querySelector: () => button, reset: () => { resetCount++; } };
    const context = { URLSearchParams, location: { search: '' }, matchMedia: () => ({ matches: false }),
      document: { body: { classList: { toggle() {} } }, documentElement: { dataset: {} },
        querySelector: selector => selector === '#fact-feedback' ? form : status, createElement: () => ({}) },
      initBotId: () => {}, FormData: class { constructor(value) { return Object.entries(value.values); } },
      fetch: async (url, options) => {
        request = { url, options };
        assert.equal(button.disabled, true);
        return { status: scenario.status, ok: scenario.status === 200, json: async () => {
          if (scenario.invalidJson) throw new SyntaxError('HTML response');
          return scenario.result;
        } };
      }
    };
    vm.runInNewContext(script, context);
    await submit({ preventDefault() {} });
    assert.equal(request.url, '/api/feedback');
    assert.deepEqual(JSON.parse(request.options.body), form.values);
    assert.equal(button.disabled, false);
    assert.equal(resetCount, scenario.success ? 1 : 0);
    if (scenario.success) {
      assert.equal(status.textContent, '感谢您的反馈，已提交给维护者审核。');
      assert.equal(links[1].target, '_blank');
      assert.equal(links[1].rel, 'noopener noreferrer');
    } else assert.equal(status.textContent, scenario.message);
  }
});
