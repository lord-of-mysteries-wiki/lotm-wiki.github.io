'use strict';
(() => {
  const nodes = [...document.querySelectorAll('[data-timeline-event]')];
  const detail = document.getElementById('timeline-detail');
  const content = document.getElementById('timeline-detail-content');
  const detailLink = document.getElementById('timeline-detail-link');
  let requestId = 0;
  if (!nodes.length || !detail || !content || !detailLink) return;
  nodes.forEach(node => node.addEventListener('click', async event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const current = ++requestId;
    nodes.forEach(link => link.removeAttribute('aria-current'));
    node.setAttribute('aria-current', 'true');
    const heading = document.createElement('h2');
    heading.id = 'timeline-detail-title';
    heading.textContent = node.querySelector('strong').textContent;
    const status = document.createElement('p');
    status.textContent = '正在加载事件详情……';
    content.replaceChildren(heading, status);
    detailLink.href = node.href;
    detailLink.hidden = false;
    detail.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
      if (current !== requestId) return;
      status.textContent = '暂时无法载入详情，请通过下方链接查看事件页面。';
    }
  }));
})();
