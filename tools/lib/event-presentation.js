'use strict';

// Explicit presentation is independent of the summary. Unreviewed entries keep
// their previous behaviour until their source documents are reviewed.
const isBriefEvent = event => event.event_display ? event.event_display === 'brief' : Boolean(event.event_summary?.trim());
const periodText = value => {
  const [year, month, day] = String(value).split('-');
  return Number(year) + '年' + (month ? Number(month) + '月' : '') + (day ? Number(day) + '日' : '');
};
function rangeText(start, end) {
  if (!end || start === end) return periodText(start);
  const a = start.split('-'), b = end.split('-');
  let tail = periodText(end);
  if (a[0] === b[0]) {
    tail = tail.slice(tail.indexOf('年') + 1);
    if (a.length === 3 && a[1] === b[1]) tail = Number(b[2]) + '日';
  }
  return periodText(start) + '至' + tail;
}
function eventDateLabel(event) {
  const start = String(event.event_time || event.event_time_period || '');
  if (!start) return '';
  const end = String(event.event_time ? (event.event_time_end || '') : (event.event_time_period_end || ''));
  const qualifier = (event.event_time_qualifier || '').split(' · ')[0].trim();
  const precision = /^(?:初春|春|夏|秋|冬|初|末|底|年底|年初|年末|上旬|中旬|下旬|中下旬|第一周)?(?:前后|以前|以后|起)?$/u.test(qualifier) ? qualifier : '';
  return rangeText(start, end) + precision + (event.event_time_window ? '间' : '');
}
function eventTimelineTitle(event) {
  const date = String(event.event_time || '');
  const prefix = date ? periodText(date) : '';
  const title = String(event.title || '');
  return prefix && title.startsWith(prefix) ? title.slice(prefix.length) : title;
}
function eventReferenceLabel(event, label = event.narrative_order?.label || event.title) {
  if (!['塔罗会例会', '塔罗会临时会议'].includes(event.title)) return label;
  const date = eventDateLabel(event);
  return date ? label + '（' + date + '）' : label;
}
function corduCycleLabel(event) {
  return event.event_cordu_cycle ? '科尔杜第' + '一二三'[event.event_cordu_cycle - 1] + '轮' : '';
}
module.exports = {isBriefEvent, corduCycleLabel, eventDateLabel, eventTimelineTitle, eventReferenceLabel};
