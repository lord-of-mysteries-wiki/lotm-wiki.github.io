/* Shared primary navigation for the wiki and the relationship graph. */
(() => {
  const items = [
    { path: 'worldview/', zh: '世界观', en: 'World' },
    { path: 'power/', zh: '力量体系', en: 'Power System', also: ['worldview/pathways/'] },
    { path: 'characters/', zh: '角色介绍', en: 'Characters' },
    { path: 'relationships/', zh: '人物关系', en: 'Relationships' },
    { path: 'artifacts/', zh: '非凡物品', en: 'Extraordinary Items' },
    { path: 'timeline/', zh: '时间线', en: 'Timeline' },
    { path: 'feedback/', zh: '反馈', en: 'Feedback' }
  ];
  for (const nav of document.querySelectorAll('[data-site-navigation]')) {
    const root = new URL(nav.dataset.root || './', document.baseURI);
    const english = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    const path = decodeURI(location.pathname);
    const home = document.createElement('a');
    home.className = 'site-title';
    home.href = root.href;
    home.textContent = nav.dataset.title || '诡秘之主WIKI';
    const links = document.createElement('div');
    links.className = 'nav-links';
    const matches = items.flatMap(item => [item.path, ...(item.also || [])].map(prefix => ({ item, prefix: decodeURI(new URL(prefix, root).pathname) })))
      .filter(candidate => path === candidate.prefix.slice(0, -1) || path.startsWith(candidate.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length);
    for (const item of items) {
      const link = document.createElement('a');
      link.href = new URL(item.path, root).href;
      link.textContent = english ? item.en : item.zh;
      if (matches[0]?.item === item) link.setAttribute('aria-current', 'page');
      links.appendChild(link);
    }
    nav.replaceChildren(home, links);
  }
})();
