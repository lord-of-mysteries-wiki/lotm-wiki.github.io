(() => {
  const list = document.querySelector('#artifact-list');
  const tools = document.querySelector('.directory-tools');
  const note = document.querySelector('#artifact-order-note');
  const original = Array.from(list.children);
  const cards = original.filter(node => node.matches('a'));
  const compare = new Intl.Collator('zh-CN-u-co-pinyin', {numeric: true, ignorePunctuation: true}).compare;
  const volumes = ['一', '二', '三', '四', '五', '六', '七', '八'];
  function show(mode) {
    for (const button of tools.children) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    note.hidden = mode !== 'appearance';
    if (mode === 'number') { list.replaceChildren(...original); return; }
    const ordered = [...cards].sort((a, b) => (Number(a.dataset.volume) || 99) - (Number(b.dataset.volume) || 99)
      || (Number(a.dataset.chapter) || 999) - (Number(b.dataset.chapter) || 999) || compare(a.dataset.name, b.dataset.name));
    const result = document.createDocumentFragment();
    let previous;
    for (const card of ordered) {
      const volume = Number(card.dataset.volume);
      if (previous !== volume) {
        previous = volume;
        const heading = document.createElement('h2');
        heading.className = 'directory-group-heading';
        heading.textContent = volume ? `第${volumes[volume - 1]}卷` : '出场章节待核实';
        result.append(heading);
      }
      const link = card.cloneNode(true);
      if (volume) {
        const chapter = document.createElement('small');
        chapter.textContent = `第 ${card.dataset.chapter} 章`;
        link.append(chapter);
      }
      result.append(link);
    }
    list.replaceChildren(result);
  }
  for (const button of tools.children) button.addEventListener('click', () => show(button.dataset.mode));
  tools.hidden = false;
})();
