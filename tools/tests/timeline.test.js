'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ejs = require('ejs');
const {loadModel} = require('../lib/content-model');
const root = path.resolve(__dirname, '../..');
const helpers = {};
for (const name of ['timeline-order', 'timeline-source']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'themes/lotm/scripts', name + '.js'), 'utf8'), {
    hexo: {extend: {helper: {register(name, fn) { helpers[name] = fn; }}}}
  });
}
const event = (id, position, fields = {}) => ({entry_id:id, narrative_order:{position}, ...fields});
test('sorts years and months independently of narrative order, preserving same-period narrative order', () => {
  const input = [event('late',1,{event_time:'1351-01-03'}),event('oct-b',4,{event_time_period:'1350-10'}),event('apr',3,{event_time_period:'1350-04'}),event('oct-a',2,{event_time_period:'1350-10'})];
  const result = helpers.story_timeline(input);
  assert.deepEqual(Array.from(result.groups, g => g.date || g.label), ['1350年4月','1350年10月','1351-01-03']);
  assert.deepEqual(Array.from(result.groups[1].items, e => e.entry_id), ['oct-a','oct-b']);
});
test('does not treat one-sided, dream or prophecy clues as event years', () => {
  const result = helpers.story_timeline([event('lower',1,{event_time_note:'1351年1月以后'}),event('dream',2,{event_time_note:'梦中八月'}),event('prophecy',3,{event_time_note:'1368年是预言年份'})]);
  assert.equal(result.groups.length, 0);
  assert.equal(result.unplaced.length, 3);
});
test('period ranges retain their endpoints and every actual event appears exactly once', () => {
  const range = helpers.story_timeline([event('range',1,{event_time_period:'1350-12',event_time_period_end:'1351-02'})]);
  assert.equal(range.groups[0].label,'1350年12月至1351年2月');
  const events = loadModel().events;
  const {groups, unplaced} = helpers.story_timeline(events);
  assert.equal(new Set(groups.map(g => g.date || g.label)).size, groups.length);
  const ids = [...groups.flatMap(g => g.items), ...unplaced].map(e => e.entry_id);
  assert.equal(ids.length,events.length);
  assert.equal(new Set(ids).size,events.length);
  const keys = Array.from(groups, g => g.date || g.items[0].event_time_period.padEnd(10,'-0'));
  assert.deepEqual(keys, keys.slice().sort());
});
test('briefs render without chapter headings or repeated unknown-date labels', () => {
  const events = [event('brief',1,{title:'章节标题占位',event_anchor:'stable',event_summary:'人物完成行动。',event_time_note:'日期待考证',event_time_source:'《诡秘之主》第六部“逐光者”第79章 联动'})];
  const html = ejs.render(fs.readFileSync(path.join(root,'themes/lotm/layout/_partials/timeline-preview.ejs'),'utf8'), {
    wiki_events:()=>events, story_timeline:helpers.story_timeline, page:{}, partial:()=>'',
    event_summary_parts:e=>[{text:e.event_summary}],url_for:url=>'/lotm-wiki.github.io'+url,timeline_source:helpers.timeline_source
  });
  assert.ok(html.includes('id="event-stable"'));
  assert.ok(html.includes('人物完成行动。'));
  assert.ok(!html.includes('章节标题占位'));
  assert.ok(!html.includes('联动'));
  assert.ok(!html.includes('<small>日期待考证'));
});
