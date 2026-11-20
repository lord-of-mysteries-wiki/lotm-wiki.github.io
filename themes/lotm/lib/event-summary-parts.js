// Resolve reviewed summary links exactly as they are rendered on the timeline.
module.exports = function eventSummaryParts(event) {
  const text = String(event.event_summary || '');
  const pending = (Array.isArray(event.event_summary_links) ? event.event_summary_links : [])
    .filter(link => link && typeof link.text === 'string' && link.text &&
      typeof link.target === 'string' && /^(?:characters|artifacts|worldview)\//.test(link.target));
  const parts = [];
  let offset = 0;
  while (pending.length && offset < text.length) {
    const matches = pending.map(link => ({ link, index: text.indexOf(link.text, offset) }))
      .filter(match => match.index >= 0)
      .sort((a, b) => a.index - b.index || b.link.text.length - a.link.text.length);
    if (!matches.length) break;
    const { link, index } = matches[0];
    if (index > offset) parts.push({ text: text.slice(offset, index) });
    parts.push({ text: link.text, target: link.target });
    offset = index + link.text.length;
    pending.splice(pending.indexOf(link), 1);
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
};
