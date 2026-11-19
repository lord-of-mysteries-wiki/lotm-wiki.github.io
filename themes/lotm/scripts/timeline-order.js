// Dated scenes retain calendar order. Between them, use the maintained reading
// order for each book (including interleaved scenes and time loops).
hexo.extend.helper.register('story_timeline', function (events, index) {
  const byLink = new Map();
  for (const item of events) {
    byLink.set(item.path.replace(/^timeline\//, '').replace(/index\.html$/, ''), item);
    byLink.set('#event-' + (item.event_anchor || item.title), item);
  }
  const ordered = new Set();
  for (const match of (index?.content || '').matchAll(/href="([^"]+)"/g)) {
    const item = byLink.get(decodeURIComponent(match[1]));
    if (item) ordered.add(item);
  }
  const days = new Map();
  const before = [];
  const previousByWork = new Map();
  const unplaced = [];
  for (const item of [...ordered, ...events.filter(item => !ordered.has(item))]) {
    const date = String(item.event_time || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      if (!days.has(date)) days.set(date, { date, items: [], following: [] });
      days.get(date).items.push(item);
      previousByWork.set(item.event_work, days.get(date));
    } else if (ordered.has(item)) {
      const prior = previousByWork.get(item.event_work);
      (prior ? prior.following : before).push(item);
    } else {
      unplaced.push(item);
    }
  }
  const relative = item => ({ label: item.event_time_precision === 'partial'
    ? item.event_time_note : '按原文顺序', items: [item] });
  const groups = before.map(relative);
  for (const date of [...days.keys()].sort()) {
    const day = days.get(date);
    groups.push({ date, items: day.items }, ...day.following.map(relative));
  }
  return { groups, unplaced };
});
