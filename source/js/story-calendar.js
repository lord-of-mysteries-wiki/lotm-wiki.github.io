'use strict';
(() => {
  const root = document.querySelector('[data-story-calendar]');
  if (!root) return;
  const events = JSON.parse(root.querySelector('script').textContent);
  const oneDay = 86400000;
  const read = iso => Date.parse(iso + 'T00:00:00Z');
  const iso = n => new Date(n).toISOString().slice(0,10);
  const monthStart = n => read(iso(n).slice(0,7) + '-01');
  function moveMonth(n, step) {
    const d = new Date(monthStart(n));
    d.setUTCMonth(d.getUTCMonth() + step);
    return d.getTime();
  }
  // Monday = 0. The novel places 1349-06-28 on Thursday.
  const weekday = n => (((n - read('1349-06-28')) / oneDay + 3) % 7 + 7) % 7;
  const byDay = new Map();
  for (const event of events) {
    if (!event.start) continue;
    for (const date of new Set([event.start, event.end].filter(Boolean))) {
      if (!byDay.has(date)) byDay.set(date, []);
      byDay.get(date).push(event);
    }
  }
  const dates = [...byDay.keys()].sort();
  let selected = read(dates[0] || '1349-06-28');
  let mode = 'month';
  const grid = root.querySelector('.almanac-grid');
  const jump = root.querySelector('.almanac-tools select');
  function clueMonths(event) {
    if (event.start) return [];
    const hit = event.note.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
    if (!hit) return [];
    const end = event.note.slice(hit.index + hit[0].length).match(/至\s*(\d{1,2})\s*月/);
    const months = [];
    for (let m = Number(hit[2]); m <= Number(end?.[1] || hit[2]); m++) {
      months.push(hit[1] + '-' + String(m).padStart(2, '0'));
    }
    return months;
  }
  const clues = new Map(events.map(event => [event, clueMonths(event)]));
  const months = new Set(dates.map(date => date.slice(0,7)));
  for (const list of clues.values()) for (const month of list) months.add(month);
  for (const month of [...months].sort()) jump.add(new Option(month, month));
  const scope = root.querySelector('[data-agenda]');
  const search = root.querySelector('input[type=search]');
  const agenda = root.querySelector('.agenda-list');
  const finder = root.querySelector('.event-finder');
  root.querySelector('[data-find-events]').onclick = () => { finder.showModal(); render(); search.focus(); };
  root.querySelector('[data-close-finder]').onclick = () => finder.close();
  function renderAgenda(first, last) {
    if (!finder.open) return;
    const query = search.value.trim();
    const results = events.filter(event => {
      if (!event.title.includes(query) && !event.summary.includes(query)) return false;
      if (scope.value === 'all') return true;
      if (event.start) return event.start <= last && (event.end || event.start) >= first;
      return clues.get(event).some(month => month >= first.slice(0,7) && month <= last.slice(0,7));
    }).sort((a,b) => Number(!a.start) - Number(!b.start) || a.start.localeCompare(b.start));
    agenda.replaceChildren(element('small',results.length + ' 个事件'));
    for (const event of results) {
      const card = element('article','');
      const title = element(event.url ? 'a' : 'p',event.summary || event.title);
      if (event.url) title.href = event.url;
      const when = event.start ? event.start + (event.end ? ' 至 ' + event.end : '') : event.note || '日期待考证';
      card.append(element('small',(event.inferred ? '推算 · ' : '') + when), title);
      if (!event.summary && event.description) card.append(element('p',event.description));
      if (mode === 'day' && scope.value === 'period' && event.start) card.append(element('p',event.basis));
      agenda.append(card);
    }
    agenda.scrollTop = 0;
  }
  function element(tag, text) {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  }
  function render() {
    root.dataset.mode = mode;
    for (const button of root.querySelectorAll('button[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    let first = selected, count = 1;
    if (mode === 'month') {
      const start = monthStart(selected);
      first = start - weekday(start) * oneDay;
      count = Math.ceil((moveMonth(start,1) - first) / (7 * oneDay)) * 7;
    } else if (mode === 'week') {
      first -= weekday(first) * oneDay;
      count = 7;
    }
    const [year, month, day] = iso(selected).split('-').map(Number);
    root.querySelector('.almanac-period h1').textContent = mode === 'week' ? iso(first) + ' — ' + iso(first + 6 * oneDay) :
      year + ' 年 ' + month + ' 月' + (mode === 'day' ? ' ' + day + ' 日 · 周' + '一二三四五六日'[weekday(selected)] : '');
    grid.style.setProperty('--rows', mode === 'month' ? count / 7 : 1);
    grid.replaceChildren();
    for (let i = 0; i < count; i++) {
      const n = first + i * oneDay, key = iso(n);
      const cell = element('section','');
      cell.className = 'almanac-cell';
      if (mode === 'month' && monthStart(n) !== monthStart(selected)) cell.classList.add('outside');
      const matches = byDay.get(key) || [];
      if (mode !== 'day') {
        const button = element('button', String(new Date(n).getUTCDate()));
        button.setAttribute('aria-label',key + '，' + matches.length + ' 个事件，查看当天');
        if (matches.length) button.dataset.count = matches.length;
        button.onclick = () => openDay(n);
        cell.append(button);
      }
      if (key === iso(selected)) cell.classList.add('selected');
      if (matches.length) cell.classList.add('has-events');
      for (const event of matches) {
        const text = (event.end ? (key === event.start ? '起 · ' : '止 · ') : '') + (event.summary || event.title);
        const entry = element(event.url ? 'a' : 'div',text);
        entry.className = 'almanac-event';
        if (event.url) entry.href = event.url;
        entry.title = event.summary || event.description || event.note;
        cell.append(entry);
        if (!event.summary && mode === 'day') cell.append(element('p',event.description));
        if (mode === 'day' && event.basis) cell.append(element('p',event.basis));
        if (mode === 'day' && event.source) cell.append(element('small',event.source));
      }
      if (mode === 'day' && !matches.length) cell.append(element('p','当天暂无已定位的事件。'));
      grid.append(cell);
    }
    renderAgenda(iso(mode === 'month' ? monthStart(selected) : first), iso(mode === 'month' ? moveMonth(selected,1)-oneDay : first+(count-1)*oneDay));
  }
  function openDay(n) {
    selected = n; mode = 'day'; scope.value = 'period'; search.value = ''; render();
  }
  scope.onchange = render;
  search.oninput = render;
  for (const b of root.querySelectorAll('button[data-mode]')) b.onclick = () => { mode = b.dataset.mode; render(); };
  for (const b of root.querySelectorAll('[data-step]')) b.onclick = () => {
    const step = Number(b.dataset.step);
    selected = mode === 'month' ? moveMonth(selected,step) : selected + step * oneDay * (mode === 'week' ? 7 : 1);
    render();
  };
  jump.onchange = () => {
    if (!jump.value) return;
    selected = read(dates.find(day => day.startsWith(jump.value)) || jump.value + '-01');
    jump.selectedIndex = 0;
    render();
  };
  render();
})();
