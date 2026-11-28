/* Keep the single feedback form in its service origin, alongside BotID and the API. */
(() => {
  const frame = document.querySelector('[data-feedback-frame]');
  if (!frame) return;
  const origin = new URL(frame.src).origin;
  const syncTheme = () => frame.contentWindow.postMessage({
    type: 'lotm-feedback-theme',
    theme: document.documentElement.dataset.theme === 'night' ? 'night' : 'day'
  }, origin);
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== frame.contentWindow) return;
    if (event.data?.type !== 'lotm-feedback-size' || !Number.isFinite(event.data.height)) return;
    frame.style.height = `${Math.min(2400, Math.max(320, Math.ceil(event.data.height)))}px`;
    syncTheme();
  });
  frame.addEventListener('load', syncTheme);
  window.addEventListener('wiki-theme-change', syncTheme);
  syncTheme();
})();
