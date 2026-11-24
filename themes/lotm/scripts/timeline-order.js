const {corduCycleLabel, eventDateLabel} = require('../../../tools/lib/event-presentation');
// Event metadata supplies stable narrative order independently of story dates.
hexo.extend.helper.register('story_timeline', function (events, index) {
  const byId = new Map(events.map(item => [item.entry_id, item]));
  const dated = [];
  const undated = [];
  for (const item of events.slice().sort((a,b) => a.narrative_order.position - b.narrative_order.position)) {
    const date = String(item.event_time || '');
    if (item.event_cordu_cycle) {
      const predecessor = byId.get(item.event_time_after);
      const localDate = date || (predecessor ? predecessor.event_time + '~' : item.event_time_period + '-00');
      const label = corduCycleLabel(item) + ' · ' + eventDateLabel(item);
      dated.push({date: date || undefined, label, key: '1358-03-29/科尔杜/' + item.event_cordu_cycle + '/' + localDate, item});
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dated.push({ date, label: eventDateLabel(item), key: date, item });
    } else {
      const period = String(item.event_time_period || '');
      if (period) {
        const predecessor = byId.get(item.event_time_after);
        // A year and its January share a lower bound. Preserve established order for ties.
        const earliestMonth = period.length === 4 ? period + '-01' : period;
        const key = predecessor?.event_time ? predecessor.event_time + '~' : earliestMonth + '-00';
        const label = eventDateLabel(item);
        dated.push({ label, key, item });
        continue;
      }
      undated.push(item);
    }
  }
  dated.sort((a, b) => a.key.localeCompare(b.key));
  const groups = [];
  for (const { date, label, key: sortKey, item } of dated) {
    let group = groups[groups.length - 1];
    if (!group || group.sortKey !== sortKey || group.label !== label) {
      group = {date, label, sortKey, items: []};
      groups.push(group);
    }
    group.items.push(item);
  }
  return { groups, unplaced: undated };
});

// Group overlapping, explicitly reviewed intervals without creating new events.
hexo.extend.helper.register('timeline_sections', function(groups) {
  const events = groups.flatMap(group => group.items);
  const ranges = events.filter(event => event.event_range_kind && event.event_time_end > event.event_time);
  const inside = (event, range) => !event.event_time_window && !event.event_cordu_cycle &&
    (event.event_time_during === range.entry_id ||
      (event.event_time > range.event_time && event.event_time < range.event_time_end));
  const overlaps = (a, b) => a.event_time < b.event_time_end && b.event_time < a.event_time_end;
  const concurrent = ranges.filter(range => events.some(event =>
    event !== range && (inside(event, range) || (ranges.includes(event) && overlaps(event, range)))));
  const zones = [];
  for (const event of concurrent.sort((a, b) => a.event_time.localeCompare(b.event_time))) {
    let zone = zones[zones.length - 1];
    if (!zone || event.event_time >= zone.end) {
      zone = {end: event.event_time_end, ranges: []};
      zones.push(zone);
    }
    if (event.event_time_end > zone.end) zone.end = event.event_time_end;
    zone.ranges.push(event);
  }
  const sections = [];
  const emitted = new Set();
  for (const group of groups) {
    const byZone = new Map();
    for (const event of group.items) {
      const zone = zones.find(z => z.ranges.some(range => range === event || inside(event, range)));
      if (!byZone.has(zone)) byZone.set(zone, []);
      byZone.get(zone).push(event);
    }
    for (const [zone, items] of byZone) {
      if (!zone) {
        sections.push({group: {...group, items}});
        continue;
      }
      if (emitted.has(zone)) continue;
      emitted.add(zone);
      const days = new Map();
      for (const event of events) {
        if (zone.ranges.includes(event) || !zone.ranges.some(range => inside(event, range))) continue;
        if (!days.has(event.event_time)) days.set(event.event_time, []);
        days.get(event.event_time).push(event);
      }
      for(const range of zone.ranges)for(const date of [range.event_time,range.event_time_end])if(!days.has(date))days.set(date,[]);
      const rows=[...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=>({date,items}));
      const laneEnds=[];
      const spans=zone.ranges.map(event=>{
        let lane=laneEnds.findIndex(end=>end<event.event_time);
        if(lane<0)lane=laneEnds.length;
        laneEnds[lane]=event.event_time_end;
        return {event,lane,start:rows.findIndex(r=>r.date===event.event_time)+1,end:rows.findIndex(r=>r.date===event.event_time_end)+2};
      });
      sections.push({rows,spans,lanes:laneEnds.length,years:[...new Set(zone.ranges.flatMap(e=>[e.event_time.slice(0,4),e.event_time_end.slice(0,4)]))]});
    }
  }
  return sections;
});
