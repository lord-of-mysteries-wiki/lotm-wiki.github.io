// Event metadata supplies stable narrative order independently of story dates.
hexo.extend.helper.register('story_timeline', function (events, index) {
  const dated = [];
  const undated = [];
  for (const item of events.slice().sort((a,b) => a.narrative_order.position - b.narrative_order.position)) {
    const date = String(item.event_time || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dated.push({ date, key: date, item });
    } else {
      const period = String(item.event_time_period || '');
      if (period) {
        const format = value => { const [year, month] = value.split('-'); return year + '年' + (month ? Number(month) + '月' : ''); };
        const end = String(item.event_time_period_end || '');
        dated.push({ label: format(period) + (end ? '至' + format(end) : ''), key: period + (period.length === 7 ? '-00' : '-00-00'), item });
        continue;
      }
      undated.push(item);
    }
  }
  dated.sort((a, b) => a.key.localeCompare(b.key));
  const groups = [];
  const byPeriod = new Map();
  for (const { date, label, item } of dated) {
    const key = date ? 'date:' + date : 'period:' + label;
    let group = byPeriod.get(key);
    if (!group) {
      group = {date, label, items: []};
      byPeriod.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return { groups, unplaced: undated };
});
