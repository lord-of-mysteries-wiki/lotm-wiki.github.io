'use strict';
(() => {
  const root = document.querySelector('[data-story-calendar]');
  function appendReferences(target,event) {
    if (!event.references?.length) return;
    const details=element('details','');
    details.className='event-sources';
    details.append(element('summary','来源'));
    const list=element('ul','');
    for(const ref of event.references) list.append(element('li',ref.scope+'：'+ref.source));
    details.append(list);
    if(event.basis) details.append(element('p',event.basis));
    target.append(details);
  }

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
  // The Tingen and December weekday references disagree when extrapolated.
  // Keep each displayed grid internally consistent with its reference month.
  const weekdayReferences = {
    '1349-12': ['1349-12-21', 1, '皇冠墓园葬礼当天（1349年12月21日，周二）'],
    '1350-01': ['1350-01-12', 2, '白玛瑙号抵达拜亚姆当天（1350年1月12日，周三）'],
    '1350-06': ['1350-06-05', 6, '霍尔家族准备生日舞会当天（1350年6月5日，周日）']
  };
  function weekday(date, referenceMonth) {
    const [anchorDate, anchorWeekday] = weekdayReferences[referenceMonth] || ['1349-06-28', 3];
    const anchor = read(anchorDate);
    return (((date - anchor) / oneDay + anchorWeekday) % 7 + 7) % 7;
  }
  const ranges = events.filter(event => event.rangeKind && event.start && event.end > event.start);
  const byDay = new Map();
  for (const event of events) {
    if (!event.start || ranges.includes(event)) continue;
    for (const date of new Set([event.start, event.end].filter(Boolean))) {
      if (!byDay.has(date)) byDay.set(date, []);
      byDay.get(date).push(event);
    }
  }
  const dates = [...new Set(events.flatMap(event => [event.start,event.end].filter(Boolean)))].sort();
  let selected = read(dates[0] || '1349-06-28');
  let mode = 'month';
  let weekStart;
  const grid = root.querySelector('.almanac-grid');
  const jump = root.querySelector('.almanac-tools select');
  function clueMonths(event) {
    if (event.start) return [];
    if (/^\d{4}-\d{2}$/.test(event.period || '')) {
      const months = [];
      const last = event.periodEnd || event.period;
      for (let year = Number(event.period.slice(0,4)); year <= Number(last.slice(0,4)); year++) {
        for (let month = 1; month <= 12; month++) {
          const key = String(year).padStart(4,'0') + '-' + String(month).padStart(2,'0');
          if (key >= event.period && key <= last) months.push(key);
        }
      }
      return months;
    }
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
      if (![event.title,event.summary,event.label].some(text => String(text || '').includes(query))) return false;
      if (scope.value === 'all') return true;
      if (event.start) return event.start <= last && (event.end || event.start) >= first;
      if (event.windowStart) return event.windowStart <= last && event.windowEnd >= first;
      if (mode !== 'month') return false;
      // A known year alone does not establish membership in the selected month.
      if (/^\d{4}$/.test(event.period || '')) return false;
      return clues.get(event).some(month => month >= first.slice(0,7) && month <= last.slice(0,7));
    }).sort((a,b) => Number(!a.start) - Number(!b.start) || a.start.localeCompare(b.start));
    agenda.replaceChildren(element('small',results.length + ' 个事件'));
    for (const event of results) {
      const card = element('article','');
      const title = element(event.url ? 'a' : 'p',event.label || event.title);
      if (event.url) title.href = event.url;
      const when = event.note || '日期待考证';
      card.append(title, element('small',(event.uncertain ? root.dataset.uncertainLabel + ' · ' : '') + when));
      if (event.summary) { const summary = element('p',''); appendSummary(summary,event); card.append(summary); }
      else if (event.description) card.append(element('p',event.description));
      appendReferences(card,event);
      agenda.append(card);
    }
    agenda.scrollTop = 0;
  }
  function appendSummary(parent, event, prefix = '') {
    if (prefix) parent.append(document.createTextNode(prefix));
    if (!event.summaryParts?.length) { parent.append(document.createTextNode(event.summary || event.title)); return; }
    for (const part of event.summaryParts) {
      if (!part.url) { parent.append(document.createTextNode(part.text)); continue; }
      const link = element('a', part.text);
      link.href = part.url;
      parent.append(link);
    }
  }
  function element(tag, text) {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  }
  function render() {
    root.dataset.mode = mode;
    for (const button of root.querySelectorAll('button[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    const referenceMonth = iso(selected).slice(0,7);
    const weekdayNote = root.querySelector('[data-weekday-note]');
    weekdayNote.textContent = weekdayReferences[referenceMonth]
      ? '本期按' + weekdayReferences[referenceMonth][2] + '推排星期。'
      : '本期星期按廷根篇推定的1349年6月28日周四排布。';
    let first = selected, count = 1;
    if (mode === 'month') {
      const start = monthStart(selected);
      first = start - weekday(start, referenceMonth) * oneDay;
      count = Math.ceil((moveMonth(start,1) - first) / (7 * oneDay)) * 7;
    } else if (mode === 'week') {
      first -= weekday(first, referenceMonth) * oneDay;
      weekStart = first;
      count = 7;
    }
    const [year, month, day] = iso(selected).split('-').map(Number);
    root.querySelector('.almanac-period h1').textContent = mode === 'week' ? iso(first) + ' — ' + iso(first + 6 * oneDay) :
      year + ' 年 ' + month + ' 月' + (mode === 'day' ? ' ' + day + ' 日 · 周' + '一二三四五六日'[weekday(selected, referenceMonth)] : '');
    grid.style.setProperty('--rows', mode === 'month' ? count / 7 : 1);
    grid.replaceChildren();
    let week;
    for (let i = 0; i < count; i++) {
      const n = first + i * oneDay, key = iso(n);
      const cell = element('section','');
      cell.className = 'almanac-cell';
      if(mode !== 'day')cell.style.gridColumn=String(i % 7 + 1);
      const dayEvents=mode === 'day' ? cell : element('div','');
      if(mode !== 'day')dayEvents.className='almanac-day-events';
      if (mode === 'month' && monthStart(n) !== monthStart(selected)) cell.classList.add('outside');
      if(mode !== 'day' && i % 7 === 0) { week=element('section',''); week.className='almanac-week'; week.setAttribute('aria-label',iso(n)+'起的一周'); grid.append(week); }
      const activeRanges=ranges.filter(event=>event.start<=key && event.end>=key);
      const matches = [...(byDay.get(key) || []), ...(mode === 'day' ? activeRanges : [])];
      const dayCount=(byDay.get(key) || []).length+activeRanges.length;
      if (mode !== 'day') {
        const button = element('button', String(new Date(n).getUTCDate()));
        button.setAttribute('aria-label',key + '，' + dayCount + ' 个事件，查看当天');
        if (dayCount) {
          button.dataset.count = dayCount;
          const countLabel = element('span', dayCount + root.dataset.countLabel);
          countLabel.className = 'almanac-mobile-count';
          countLabel.setAttribute('aria-hidden', 'true');
          button.append(countLabel);
        }
        button.onclick = () => openDay(n);
        cell.append(button);
      }
      if (key === iso(selected)) cell.classList.add('selected');
      if (dayCount) cell.classList.add('has-events');
      for (const event of matches) {
        const text = (event.end && !event.rangeKind ? (key === event.start ? '起 · ' : '止 · ') : '') + (event.label || event.title);
        const entry = element(event.url ? 'a' : (mode === 'day' ? 'div' : 'button'), mode === 'day' ? event.title : text);
        if (entry.tagName === 'BUTTON') { entry.type = 'button'; entry.onclick = () => openDay(n); }
        entry.className = 'almanac-event';
        if (event.url) entry.href = event.url;
        entry.title = event.summary || event.description || event.note;
        dayEvents.append(entry);
        if (mode === 'day') {
          if(event.uncertain) cell.append(element('small', root.dataset.uncertainLabel));
          if(event.rangeKind) cell.append(element('small',event.start+'—'+event.end+(event.rangeKind==='staged' ? ' · 分阶段' : '')));
          const description = element('p','');
          if (event.summary) appendSummary(description,event);
          else description.textContent = event.description;
          if (description.textContent) cell.append(description);
        }
        if (mode === 'day') appendReferences(cell,event);
      }
      if (mode === 'day' && !matches.length) cell.append(element('p','当天暂无已定位的事件。'));
      if(mode !== 'day')cell.append(dayEvents);
      (mode === 'day' ? grid : week).append(cell);
      if(mode !== 'day' && i % 7 === 6) renderRanges(week,n-6*oneDay,n);
    }
    renderAgenda(iso(mode === 'month' ? monthStart(selected) : first), iso(mode === 'month' ? moveMonth(selected,1)-oneDay : first+(count-1)*oneDay));
  }
  function renderRanges(week,first,last) {
    const start=iso(first),end=iso(last),laneEnds=[];
    for(const event of ranges.filter(event=>event.start<=end && event.end>=start).sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end))){
      const a=Math.max(0,Math.round((read(event.start)-first)/oneDay));
      const b=Math.min(6,Math.round((read(event.end)-first)/oneDay));
      let lane=laneEnds.findIndex(previous=>previous<a);
      if(lane<0)lane=laneEnds.length;
      laneEnds[lane]=b;
      const bar=element(event.url ? 'a' : 'button','');
      if(event.url)bar.href=event.url;
      else {bar.type='button';bar.onclick=()=>openDay(Math.max(first,read(event.start)));}
      bar.className='almanac-range almanac-range--'+event.rangeKind;
      bar.dataset.eventId=event.id;
      bar.style.gridColumn=(a+1)+' / '+(b+2);
      bar.style.gridRow=String(lane+2);
      if(event.start<start){const continuation=element('span','续');continuation.className='almanac-range__continuation';bar.append(continuation);}
      bar.append(document.createTextNode(event.label || event.title));
      bar.setAttribute('aria-label',(event.label || event.title)+'，'+event.start+'至'+event.end+(event.rangeKind==='staged'?'，分阶段':''));
      bar.title=event.summary;
      week.append(bar);
    }
    week.style.setProperty('--range-rows',String(laneEnds.length));
    week.style.gridTemplateRows='var(--calendar-date-height,2.3rem) '+(laneEnds.length ? 'repeat('+laneEnds.length+',1.9rem) ' : '')+'minmax(var(--calendar-events-height,3rem),1fr)';
    for(const cell of week.querySelectorAll('.almanac-cell'))cell.style.gridRow='1 / '+String(laneEnds.length+3);
  }
  function openDay(n) {
    selected = n; mode = 'day'; scope.value = 'period'; search.value = ''; render();
  }
  scope.onchange = render;
  search.oninput = render;
  for (const b of root.querySelectorAll('button[data-mode]')) b.onclick = () => { mode = b.dataset.mode; render(); };
  for (const b of root.querySelectorAll('[data-step]')) b.onclick = () => {
    const step = Number(b.dataset.step);
    if (mode === 'month') selected = moveMonth(selected,step);
    else if (mode === 'week') selected = weekStart + (step > 0 ? 7 : -1) * oneDay;
    else selected += step * oneDay;
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
