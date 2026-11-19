'use strict';
(() => {
  const nodes = [...document.querySelectorAll('[data-timeline-event]')];
  const dayButtons = [...document.querySelectorAll('[data-calendar-day]')];
  let active = null;
  let pinned = null;
  let requestId = 0;
  let restoringFocus = false;
  dayButtons.forEach(button => button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    dayButtons.forEach(other => {
      const panel = document.getElementById(other.getAttribute('aria-controls'));
      const open = other === button && !expanded;
      other.setAttribute('aria-expanded', String(open));
      if (panel) {
        if (!open && active && panel.contains(active)) close();
        panel.hidden = !open;
      }
    });
  }));
  if (!nodes.length) return;
  const detail = document.createElement('section');
  detail.className = 'timeline-detail';
  detail.id = 'timeline-event-detail';
  detail.setAttribute('aria-label', '事件详情');
  detail.hidden = true;
  const label = document.createElement('p');
  label.className = 'timeline-preview__eyebrow';
  label.textContent = '事件详情';
  const content = document.createElement('div');
  content.setAttribute('aria-live', 'polite');
  const detailLink = document.createElement('a');
  detailLink.className = 'timeline-detail__link';
  detailLink.textContent = '查看完整事件';
  detail.append(label, content, detailLink);
  document.querySelector('.timeline-preview').append(detail);

  function close() {
    ++requestId;
    if (active) {
      active.removeAttribute('aria-current');
      active.setAttribute('aria-expanded', 'false');
    }
    active = pinned = null;
    detail.hidden = true;
    document.querySelector('.timeline-preview').append(detail);
  }
  async function show(node) {
    if (active === node && !detail.hidden) return;
    const current = ++requestId;
    if (active) {
      active.removeAttribute('aria-current');
      active.setAttribute('aria-expanded', 'false');
    }
    active = node;
    pinned = null;
    node.setAttribute('aria-current', 'true');
    node.setAttribute('aria-expanded', 'true');
    node.after(detail);
    detail.hidden = false;
    const heading = document.createElement('h3');
    heading.textContent = node.querySelector('strong').textContent;
    const status = document.createElement('p');
    status.textContent = '正在加载事件详情……';
    content.replaceChildren(heading, status);
    detailLink.href = node.href;
    try {
      const response = await fetch(node.href);
      if (!response.ok) throw new Error('无法加载事件');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const article = doc.querySelector('.article');
      if (!article) throw new Error('未找到事件详情');
      if (current !== requestId) return;
      article.querySelector('h1')?.remove();
      article.querySelectorAll('a[href]').forEach(link => { link.href = new URL(link.getAttribute('href'), response.url).href; });
      content.replaceChildren(heading, ...article.childNodes);
    } catch (error) {
      if (current === requestId) status.textContent = '暂时无法载入详情，请通过下方链接查看事件页面。';
    }
  }
  nodes.forEach(node => {
    node.setAttribute('aria-expanded', 'false');
    node.setAttribute('aria-controls', detail.id);
    const item = node.closest('.timeline-nodes__item');
    item.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') show(node);
    });
    item.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'touch' && pinned !== node && active === node && !item.contains(document.activeElement)) close();
    });
    node.addEventListener('focus', () => { if (!restoringFocus) show(node); });
    item.addEventListener('focusout', event => {
      if (active === node && pinned !== node && !item.contains(event.relatedTarget) && !item.matches(':hover')) close();
    });
    node.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (pinned === node) close();
      else { show(node); pinned = node; }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) { const previous = active; close(); restoringFocus = true; previous.focus(); restoringFocus = false; }
  });
})();
