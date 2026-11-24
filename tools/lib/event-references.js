'use strict';
// Preserve chapter locators and qualifications verbatim. Only identical complete
// citations share a display row; overlapping ranges are not evidence of equality.
function eventReferences(event) {
  const refs = [];
  for (const [field, scope] of [['event_source','facts'],['event_time_source','time']]) {
    const source = String(event[field] || '').trim();
    if (!source) continue;
    let ref = refs.find(item => item.source === source);
    if (!ref) { ref = {source,scopes:[]}; refs.push(ref); }
    ref.scopes.push(scope);
  }
  return refs;
}
function shortEventSource(event) {
  let source = String(event.event_source || event.event_time_source || '').trim();
  if (!event.event_source) {
    // Legacy time citations may append a chapter title after the locator.
    source = source.replace(/(第[零〇一二三四五六七八九十百千\d]+章)[ \t]+[^；;、，,《》\s]+(?=[；;]|$)/g, '$1');
  }
  let previousBook = '';
  source = source.replace(/《[^》]+》/g, book => {
    const repeated = book === previousBook;
    previousBook = book;
    return repeated ? '' : book;
  });
  const number = '[零〇一二三四五六七八九十百千\\d]+';
  source = source.replace(new RegExp('第(' + number + ')[部卷]', 'g'), '$1卷');
  source = source.replace(new RegExp('第(?=' + number + '(?:[、，,]|[-—–至～~]))', 'g'), '');
  source = source.replace(new RegExp('第?(' + number + ')章?\\s*[-—–至～~]\\s*第?(' + number + ')章', 'g'), '$1–$2章');
  source = source.replace(new RegExp('第(' + number + ')章', 'g'), '$1章');
  source = source.replace(new RegExp('章([、，,])(?=' + number + ')', 'g'), '$1');
  return source;
}
module.exports = {eventReferences, shortEventSource};
