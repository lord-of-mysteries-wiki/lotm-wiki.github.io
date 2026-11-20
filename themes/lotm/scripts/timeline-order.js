// The source index records narrative order, including flashbacks and time loops.
hexo.extend.helper.register('story_timeline', function (events, index) {
  const byLink = new Map();
  for (const item of events) {
    const link = item.event_summary?.trim() ? '#event-' + (item.event_anchor || item.title)
      : item.path.replace(/^timeline\//, '').replace(/index\.html$/, '');
    byLink.set(link, item);
  }
  const seen = new Set();
  const groups = [];
  for (const match of (index?.content || '').matchAll(/href="([^"]+)"/g)) {
    const item = byLink.get(decodeURIComponent(match[1]));
    if (!item || seen.has(item)) continue;
    seen.add(item);
    const date = String(item.event_time || '');
    const previous = groups.at(-1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (previous?.date === date && previous.items[0].event_work === item.event_work) previous.items.push(item);
      else groups.push({ date, items: [item] });
    } else {
      const label = item.event_time_precision === 'partial' ? item.event_time_note : '按原文顺序';
      groups.push({ label, items: [item] });
    }
  }
  return { groups, unplaced: events.filter(item => !seen.has(item)) };
});
