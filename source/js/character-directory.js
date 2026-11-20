(() => {
  const list = document.querySelector('#character-list');
  const tools = document.querySelector('.directory-tools');
  const original = Array.from(list.children);
  const cards = original.filter(node => node.matches('a'));
  const books = original.filter(node => node.matches('h2')).map(node => node.textContent.slice(1, -1));
  const compare = new Intl.Collator('zh-CN-u-co-pinyin', {ignorePunctuation:true}).compare;
  const unknown = new Set(['组织待核', '途径待核']);
  function show(mode) {
    list.dataset.mode = mode;
    for (const button of tools.children) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    if (mode === 'mentions') {
      list.replaceChildren(...original);
      return;
    }
    const groups = new Map();
    const ordered = mode === 'order' ? [...cards].sort((a,b) =>
      books.indexOf(a.dataset.work) - books.indexOf(b.dataset.work)
      || Number(a.dataset.order || Infinity) - Number(b.dataset.order || Infinity)
      || compare(a.id,b.id)) : cards;
    for (const card of ordered) {
      const d = card.dataset;
      let labels;
      if (mode === 'order') labels = [d.volume];
      if (mode === 'organization') labels = JSON.parse(d.org);
      if (mode === 'pathway') labels = JSON.parse(d.pathways).map(p => p.name);
      if (!labels.length) labels = [mode === 'organization' ? '组织待核' : d.ordinary === 'true' ? '所引时期为普通人' : '途径待核'];
      for (const label of labels) {
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(card);
      }
    }
    const labels = Array.from(groups.keys());
    if (mode !== 'order') labels.sort((a,b) => Number(unknown.has(a)) - Number(unknown.has(b)) || compare(a,b));
    const content = document.createDocumentFragment();
    const shown = new Set();
    for (const label of labels) {
      const heading = document.createElement('h2');
      heading.className = 'directory-group-heading';
      heading.textContent = label;
      content.append(heading);
      const members = groups.get(label);
      if (mode !== 'order') members.sort((a,b) => compare(a.id,b.id));
      for (const card of members) {
        const link = card.cloneNode(true);
        if (shown.has(card)) link.removeAttribute('id');
        shown.add(card);
        if (mode === 'pathway' && JSON.parse(card.dataset.pathways).some(p => p.name === label && p.inferred)) {
          const mark = document.createElement('small');
          mark.className = 'directory-inferred';
          mark.textContent = '推测';
          link.append(mark);
        }
        if (mode === 'order' && card.dataset.chapter) {
          const chapter = document.createElement('small');
          chapter.textContent = card.dataset.chapter;
          link.append(chapter);
        }
        content.append(link);
      }
    }
    list.replaceChildren(content);
  }
  for (const button of tools.children) button.addEventListener('click', () => show(button.dataset.mode));
  tools.hidden = false;
})();
