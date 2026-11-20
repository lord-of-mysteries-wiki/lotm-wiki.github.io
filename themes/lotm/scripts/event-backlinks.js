// Reverse only explicitly linked, published summaries; do not infer entities.
hexo.extend.helper.register('event_backlinks', function (page) {
  const normalize = value => String(value || '').split(/[?#]/)[0].replace(/^\/+/, '').replace(/index\.html$/, '').replace(/\/+$/, '');
  const route = normalize(page.path);
  if (!/^(?:characters\/entries|artifacts\/entries|worldview)\//.test(route)) return [];
  return this.site.pages.toArray().filter(event => {
    const summary = String(event.event_summary || '');
    if (!event.timeline_event || !summary.trim() || !(event.event_anchor || event.title)) return false;
    // Use the same resolved parts as the timeline, including its overlap rules.
    return this.event_summary_parts(event).some(part => part.target && normalize(part.target) === route);
  }).map(event => ({
    title: String(event.title || event.event_anchor),
    anchor: String(event.event_anchor || event.title),
    date: String(event.event_time_note || event.event_time || '')
  }));
});
