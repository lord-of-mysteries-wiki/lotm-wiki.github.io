/* Shared primary navigation for the wiki and the relationship graph. */
(() => {
  const items = [
    { path: 'worldview/', zh: '世界观', en: 'World' },
    { path: 'power/', zh: '力量体系', en: 'Power System', also: ['worldview/pathways/'] },
    { path: 'characters/', zh: '角色介绍', en: 'Characters' },
    { path: 'relationships/', zh: '人物关系', en: 'Relationships' },
    { path: 'artifacts/', zh: '非凡物品', en: 'Extraordinary Items' },
    { path: 'timeline/', zh: '时间线', en: 'Timeline' },
    { path: 'feedback/', zh: '反馈', en: 'Feedback', right: true },
    { path: 'about/', zh: '关于', en: 'About' }
  ];
  const icons = [
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    '<path d="M13 2 5 13h6l-1 9 9-12h-6z"/>',
    '<circle cx="12" cy="8" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2z"/>',
    '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m7 7 4 9M17 7l-4 9M7 6h10"/>',
    '<path d="m12 3 8 5-8 13L4 8zM4 8h16M9 8l3 13 3-13M9 8l3-5 3 5"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
  ];
  for (const nav of document.querySelectorAll('[data-site-navigation]')) {
    const root = new URL(nav.dataset.root || './', document.baseURI);
    const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    const path = decodeURI(location.pathname);
    const home = document.createElement('a');
    home.className = 'site-title';
    home.href = root.href;
    const siteName = nav.dataset.title || '诡秘之主WIKI';
    home.setAttribute('aria-label', siteName);
    const fullTitle = document.createElement('span');
    fullTitle.className = 'site-title-full';
    fullTitle.textContent = siteName;
    const shortTitle = document.createElement('span');
    shortTitle.className = 'site-title-short';
    shortTitle.setAttribute('aria-hidden', 'true');
    shortTitle.textContent = '诡秘';
    home.append(fullTitle, shortTitle);
    const links = document.createElement('div');
    links.className = 'nav-links';
    const matches = items.flatMap(item => [item.path, ...(item.also || [])].map(prefix => ({ item, prefix: decodeURI(new URL(prefix, root).pathname) })))
      .filter(candidate => path === candidate.prefix.slice(0, -1) || path.startsWith(candidate.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length);
    for (const [index, item] of items.entries()) {
      const link = document.createElement('a');
      if (item.right) link.className = 'nav-link-right';
      link.href = new URL(item.path, root).href;
      const label = english ? item.en : item.zh;
      link.setAttribute('aria-label', label);
      link.title = label;
      const icon = document.createElement('span');
      icon.className = 'nav-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[index]}</svg>`;
      const text = document.createElement('span');
      text.className = 'nav-label';
      text.textContent = label;
      link.append(icon, text);
      if (matches[0]?.item === item) link.setAttribute('aria-current', 'page');
      links.appendChild(link);
    }
    nav.replaceChildren(home, links);
  }
})();
