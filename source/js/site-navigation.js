/* Shared primary navigation for the wiki and the relationship graph. */
(() => {
  const items = [
    { icon: 'world', path: 'worldview/', zh: '世界观', en: 'World', also: ['creatures/'] },
    { icon: 'power', path: 'power/', zh: '力量体系', en: 'Power System', also: ['worldview/pathways/'] },
    { icon: 'person', path: 'characters/', zh: '角色介绍', en: 'Characters' },
    { icon: 'relations', path: 'relationships/', zh: '人物关系', en: 'Relationships' },
    { icon: 'artifacts', path: 'artifacts/', zh: '非凡物品', en: 'Extraordinary Items' },
    { icon: 'time', path: 'timeline/', zh: '时间线', en: 'Timeline' },
    { icon: 'feedback', path: 'feedback/', zh: '反馈', en: 'Feedback', right: true },
    { icon: 'about', path: 'about/', zh: '关于', en: 'About' }
  ];
  // The shared theme renders these same links before browser scripts load.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = items;
    return;
  }
  const storageKey = 'lotm-wiki-theme';
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(storageKey); } catch {}
  function applyTheme() {
    document.documentElement.dataset.theme = ['day', 'night'].includes(preference)
      ? preference : systemTheme.matches ? 'night' : 'day';
    window.dispatchEvent(new Event('wiki-theme-change'));
  }
  applyTheme();
  systemTheme.addEventListener('change', applyTheme);
  document.addEventListener('DOMContentLoaded', () => {
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
      for (const item of items) {
        const link = document.createElement('a');
        if (item.right) link.className = 'nav-link-right';
        link.href = new URL(item.path, root).href;
        const label = english ? item.en : item.zh;
        link.setAttribute('aria-label', label);
        link.title = label;
        const icon = document.createElement('span');
        icon.className = 'nav-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = `<svg class="wiki-icon" aria-hidden="true" focusable="false"><use href="#wiki-icon-${item.icon}"></use></svg>`;
        const text = document.createElement('span');
        text.className = 'nav-label';
        text.textContent = label;
        link.append(icon, text);
        if (matches[0]?.item === item) link.setAttribute('aria-current', 'page');
        links.appendChild(link);
      }
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      const updateToggle = () => {
        const night = document.documentElement.dataset.theme === 'night';
        toggle.innerHTML = `<svg class="wiki-icon" aria-hidden="true" focusable="false"><use href="#wiki-icon-${night ? 'sun' : 'moon'}"></use></svg>`;
        toggle.title = night ? nav.dataset.day : nav.dataset.night;
        toggle.setAttribute('aria-label', toggle.title);
      };
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let transition;
      toggle.addEventListener('click', () => {
        const current = preference === 'day' || preference === 'night'
          ? preference : document.documentElement.dataset.theme;
        preference = current === 'night' ? 'day' : 'night';
        try { localStorage.setItem(storageKey, preference); } catch {}
        if (transition || reducedMotion.matches || !document.startViewTransition) {
          applyTheme();
          return;
        }
        document.documentElement.classList.add('theme-changing');
        const next = document.startViewTransition(applyTheme);
        transition = next;
        next.finished.then(() => {
          if (transition === next) {
            transition = null;
            document.documentElement.classList.remove('theme-changing');
          }
        });
      });
      window.addEventListener('wiki-theme-change', updateToggle);
      updateToggle();
      nav.replaceChildren(home, links, toggle);
    }
  });
})();
