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
const presentation = require('../lib/event-presentation');
const {shortEventSource} = require('../lib/event-references');
for (const name of ['timeline-order', 'timeline-source']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'themes/lotm/scripts', name + '.js'), 'utf8'), {
    require: require('node:module').createRequire(path.join(root,'themes/lotm/scripts',name+'.js')),
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
test('January actions stay ahead of their later year-only consequences', () => {
  const events = loadModel().events;
  const ids = helpers.story_timeline(events).groups.flatMap(group => group.items.map(item => item.entry_id));
  const sequence = ['event-0337', 'event-0338', 'event-0339', 'event-0340', 'event-0343'];
  const positions = sequence.map(id => ids.indexOf(id));
  assert.ok(positions.every((index, i) => index >= 0 && (!i || index > positions[i - 1])));
});
test('a predecessor sets chronological position without adding its name to the date heading', () => {
  const anchor = event('anchor', 2, {title:'切尔诺贝利探查与记忆封存', event_time:'1351-09-08'});
  const later = event('later', 1, {event_time_period:'1351-09', event_time_period_end:'1352-02', event_time_after:'anchor', event_time_basis:'正式迁居在探查之后。'});
  const {groups} = helpers.story_timeline([later, anchor]);
  assert.deepEqual(Array.from(groups, group => group.items[0].entry_id), ['anchor', 'later']);
  assert.equal(groups[1].label, '1351年9月至1352年2月');
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
  assert.ok(groups.every((g, i) => !i || g.sortKey !== groups[i-1].sortKey || g.label !== groups[i-1].label));
  const ids = [...groups.flatMap(g => g.items), ...unplaced].map(e => e.entry_id);
  assert.equal(ids.length,events.length);
  assert.equal(new Set(ids).size,events.length);
  const keys = Array.from(groups, g => g.sortKey);
  assert.deepEqual(keys, keys.slice().sort((a,b) => a.localeCompare(b)));
});
test('briefs render without chapter headings or repeated unknown-date labels', () => {
  const events = [event('brief',1,{title:'章节标题占位',event_anchor:'stable',event_summary:'人物完成行动。',event_time_note:'日期待考证',event_time_source:'《诡秘之主》第六部“逐光者”第79章 联动'})];
  const html = ejs.render(fs.readFileSync(path.join(root,'themes/lotm/layout/_partials/timeline-preview.ejs'),'utf8'), {
    __:()=>'第五纪', event_short_source:shortEventSource, wiki_events:()=>events, story_timeline:helpers.story_timeline,timeline_sections:helpers.timeline_sections,event_date_label:presentation.eventDateLabel, page:{}, partial:()=>'',
    event_summary_parts:e=>[{text:e.event_summary}],url_for:url=>'/lotm-wiki.github.io'+url,timeline_source:helpers.timeline_source
    ,is_brief_event:presentation.isBriefEvent,event_timeline_title:presentation.eventTimelineTitle
  });
  assert.ok(html.includes('id="event-stable"'));
  assert.ok(html.includes('人物完成行动。'));
  assert.ok(!html.includes('章节标题占位'));
  assert.ok(!html.includes('联动'));
  assert.ok(!html.includes('<small>日期待考证'));
});
test('weekday and time of day do not split a date heading', () => {
  const {groups} = helpers.story_timeline([
    event('first',1,{event_time:'1350-06-06',event_time_qualifier:' · 周一'}),
    event('second',2,{event_time:'1350-06-06',event_time_qualifier:'下午'})
  ]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].label,'1350年6月6日');
  assert.equal(presentation.eventDateLabel({event_time_period:'1358-05',event_time_qualifier:'初 · 周日下午'}),'1358年5月初');
  const meeting = loadModel().events.find(item => item.entry_id === 'event-0368');
  assert.equal(presentation.eventDateLabel(meeting),'1359年3月7日');
});
test('ranges have complete labels and never merge with single days at the same start', () => {
  const {groups} = helpers.story_timeline([
    event('single',1,{event_time:'1349-07-06'}),
    event('range',2,{event_time:'1349-07-06',event_time_end:'1349-07-18',event_time_precision:'range'}),
    event('window',3,{event_time_period:'1349-07',event_time_period_end:'1349-08',event_time_window:true}),
    event('year-end',4,{event_time_period:'1192',event_time_qualifier:'年底'})
  ]);
  assert.deepEqual(Array.from(groups,g=>g.label),['1192年年底','1349年7月至8月间','1349年7月6日','1349年7月6日至18日']);
  assert.equal(presentation.eventDateLabel({event_time_period:'1173',event_time_period_end:'1198',event_time_window:true}),'1173年至1198年间');
  assert.equal(presentation.eventDateLabel({event_time:'1349-12-31',event_time_end:'1350-01-02'}),'1349年12月31日至1350年1月2日');
});
test('a detailed meeting keeps its page with a summary and no duplicate date or end-date line', () => {
  const detail=event('meeting',1,{event_display:'detail',title:'1349年7月2日塔罗会',event_time:'1349-07-02',event_summary:'成员交换配方与消息。',event_source:'《诡秘之主》第一卷第34章至第36章',event_time_note:'周一塔罗会的日期',path:'timeline/meeting/'});
  const range=event('investigation',2,{event_display:'detail',title:'调查',event_summary:'追查失踪笔记。',event_time:'1349-07-06',event_time_end:'1349-07-18',event_time_precision:'range',path:'timeline/investigation/'});
  const confirmedWindow=event('confirmed',3,{event_summary:'日期范围已经核实。',event_time_period:'1349-08',event_time_period_end:'1349-09',event_time_window:true,event_time_certainty:'inferred'});
  const uncertainWindow=event('uncertain',4,{event_summary:'日期范围仍待核实。',event_time_period:'1349-10',event_time_period_end:'1349-11',event_time_window:true,event_time_certainty:'inferred',event_time_uncertain:true});
  assert.equal(presentation.isBriefEvent(detail),false);
  const html=ejs.render(fs.readFileSync(path.join(root,'themes/lotm/layout/_partials/timeline-preview.ejs'),'utf8'),{
    __:key=>key==='event_time_uncertain_label'?'推定':'第五纪', event_short_source:shortEventSource, wiki_events:()=>[detail,range,confirmedWindow,uncertainWindow],story_timeline:helpers.story_timeline,timeline_sections:helpers.timeline_sections,event_date_label:presentation.eventDateLabel,page:{},partial:()=>'',
    event_summary_parts:e=>[{text:e.event_summary}],url_for:url=>'/lotm-wiki.github.io'+url,timeline_source:helpers.timeline_source,
    is_brief_event:presentation.isBriefEvent,event_timeline_title:presentation.eventTimelineTitle
  });
  assert.ok(html.includes('href="/lotm-wiki.github.io/timeline/meeting/"'));
  assert.ok(html.includes('<strong>塔罗会</strong>'));
  assert.ok(html.includes('成员交换配方与消息。'));
  assert.ok(html.includes('1349年7月6日至18日'));
  assert.ok(!html.includes('周一塔罗会的日期'));
  assert.ok(!html.includes('<span>至'));
  assert.match(html, /<summary>(?:1349年)?8月至9月间<\/summary>/);
  assert.match(html, /<summary>(?:1349年)?10月至11月间<\/summary>/);
  assert.equal((html.match(/推定/g) || []).length,1);
});
test('calendar uses the selected phrase while preserving the full summary and detail destination', () => {
  const events=[event('short',1,{event_time_certainty:'inferred',title:'克莱恩制成阳炎符咒',event_calendar_label:'制成阳炎符咒',event_summary:'克莱恩借莫尔斯小镇出勤的机会，制成两枚阳炎符咒。',event_display:'detail',path:'timeline/charms/',content:'<p>完整事件经过。</p>'}),
    event('fallback',2,{event_time_certainty:'inferred',event_time_uncertain:true,title:'其他事件',event_summary:'需要保留的完整概括。',content:''})];
  const html=ejs.render(fs.readFileSync(path.join(root,'themes/lotm/layout/_partials/story-calendar.ejs'),'utf8'),{
    __:()=>'推定',wiki_events:()=>events,event_date_label:presentation.eventDateLabel,event_references:()=>[],partial:()=>'',event_summary_parts:e=>[{text:e.event_summary}],strip_html:html=>html.replace(/<[^>]*>/g,''),
    url_for:url=>'/lotm-wiki.github.io'+url,timeline_source:helpers.timeline_source,is_brief_event:presentation.isBriefEvent,event_timeline_title:presentation.eventTimelineTitle
  });
  const records=JSON.parse(html.match(/<script type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(records[0].uncertain,false);
  assert.equal(records[1].uncertain,true);
  assert.equal(records[0].label,'制成阳炎符咒');
  assert.equal(records[0].summary,events[0].event_summary);
  assert.equal(records[0].url,'/lotm-wiki.github.io/timeline/charms/');
  assert.equal(records[1].label,'其他事件');
});
test('parallel ranges cover their real boundaries, retain overlapping events and exclude uncertain windows', () => {
  const input=[
    event('case',1,{event_time:'1349-07-06',event_time_end:'1349-07-18',event_range_kind:'staged'}),
    event('meeting',2,{event_time:'1349-07-09'}),
    event('nested',3,{event_time:'1349-07-08',event_time_end:'1349-07-10',event_range_kind:'staged'}),
    event('window',4,{event_time_period:'1349-07',event_time_period_end:'1349-08',event_time_window:true})
  ];
  const {groups}=helpers.story_timeline(input);
  const sections=helpers.timeline_sections(groups), parallel=sections.find(section=>section.spans);
  assert.equal(parallel.lanes,2);
  assert.deepEqual(Array.from(parallel.rows,row=>row.date),['1349-07-06','1349-07-08','1349-07-09','1349-07-10','1349-07-18']);
  assert.equal(parallel.spans[0].start,1);assert.equal(parallel.spans[0].end,6);
  assert.equal(parallel.rows[2].items[0].entry_id,'meeting');
  assert.equal(sections.find(section=>section.group).group.items[0].entry_id,'window');
  const actual=loadModel().events;
  const all=helpers.story_timeline(actual),out=helpers.timeline_sections(all.groups);
  const ids=[...out.flatMap(section=>section.group?section.group.items:section.rows.flatMap(row=>row.items).concat(section.spans.map(span=>span.event))),...all.unplaced].map(e=>e.entry_id);
  assert.equal(ids.length,actual.length);assert.equal(new Set(ids).size,actual.length);
});

test('sequential events sharing a range boundary stay on the main axis', () => {
  const input = [
    event('pirates', 1, {event_time:'1350-01-08'}),
    event('rescue', 2, {event_time:'1350-01-08', event_time_end:'1350-01-09', event_range_kind:'staged'}),
    event('departure', 3, {event_time:'1350-01-09'})
  ];
  const sections = () => helpers.timeline_sections(helpers.story_timeline(input).groups);
  assert.deepEqual(Array.from(sections(), section => section.group.items[0].entry_id), ['pirates','rescue','departure']);
  input.push(event('overnight', 4, {event_time:'1350-01-09', event_time_during:'rescue'}));
  const withOverlap = sections();
  assert.equal(withOverlap[0].group.items[0].entry_id, 'pirates');
  assert.equal(withOverlap[1].rows[1].items[0].entry_id, 'overnight');
  assert.equal(withOverlap[2].group.items[0].entry_id, 'departure');
});

test('Tingen battles precede the resurrection and arrival in Beckland', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const order = groups.flatMap(group => group.items.map(item => item.entry_id));
  const chain = ['event-0042', 'event-0041', 'event-0044', 'event-0046', 'event-0048', 'event-meeting-arrival-tarot'];
  for (let i = 0; i < chain.length; i++) {
    assert.ok(order.includes(chain[i]), chain[i]);
    if (i) assert.ok(order.indexOf(chain[i-1]) < order.indexOf(chain[i]), chain[i]);
  }
});

test('event source ranges render the same for legacy and compact notation', () => {
  const canonical = '《诡秘之主》第一卷第172章–第174章、第193章–第201章';
  for (const source of [
    '《诡秘之主》第一卷第172—174章、第193—201章',
    '《诡秘之主》第一卷第172章至第174章、第193章-第201章',
    canonical
  ]) assert.equal(helpers.timeline_source(source), canonical);
});

test('Beckland commission and first gathering precede the assassination', () => {
  const chain = ['event-meeting-beckland-tarot', 'event-meeting-eye-first', 'event-0053', 'event-meeting-eye-second'];
  const {groups} = helpers.story_timeline(loadModel().events);
  const order = groups.flatMap(group => group.items.map(item => item.entry_id));
  assert.deepEqual(Array.from(order.filter(id => chain.includes(id))), chain);
});

test('Cordu calendar resets stay in the order the loops occurred', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const chain = ['0245','0246','0248','0249','0253','0252','0255','0257','0259','0260','0261','0264'].map(id => 'event-' + id);
  const selected = groups.flatMap(group => group.items.map(item => item.entry_id)).filter(id => chain.includes(id));
  assert.deepEqual(Array.from(selected), chain);
  assert.ok(groups.some(group => group.label === '科尔杜第三轮 · 1358年4月1日'));
});

test('Cordu aftermath and the Trier investigations follow their story order', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const chain = ['0264','0265','0266','0267','0269','0270','0273','0272','0274','0276','0277','0278','0281','0280'].map(id => 'event-' + id);
  const selected = groups.flatMap(group => group.items.map(item => item.entry_id)).filter(id => chain.includes(id));
  assert.deepEqual(Array.from(selected), chain);
});

test('Trier election aftermath follows the actual sequence and the Fool’s Day meeting belongs to 1357', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const chain = ['event-0298','event-0281','event-0280','event-0282','event-0283','event-0284','event-0284-evening','event-0285','event-0286','event-0286-promotion','event-0287','event-0289','event-0291','event-0292','event-0293','event-0295-lugano','event-0295-lavigny','event-0294','event-0295','event-0296-boon','event-0296','event-0297','event-0299','event-0299-black-cat','event-0300'];
  const selected = groups.flatMap(group => group.items.map(item => item.entry_id)).filter(id => chain.includes(id));
  assert.deepEqual(Array.from(selected), chain);
});

test('Red Swan, Trier crisis and the two sea rites use the story chronology', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const chain = ['0298','0320','0300','0301','0302','0303','0303-emergency','0304','0305-audit','0305','0306','0306-promotion','0307','0311','0312','0313','0314','0315','0316','0317','0318','0319'].map(id => 'event-' + id);
  const selected = groups.flatMap(group => group.items.map(item => item.entry_id)).filter(id => chain.includes(id));
  assert.deepEqual(Array.from(selected), chain);
});

test('Tizamo stays a single festival and the southern voyage precedes the Morora exile', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const chain = ['0319','0323','0324','0327','0328','0330','0331','0332','0334','0335','0336-bloodline','0336-harrison','0336','0336-harvest-priest','0337','0338','0339','0340','0343'].map(id => 'event-' + id);
  const orderedIds = groups.flatMap(group => group.items.map(item => item.entry_id));
  const selected = orderedIds.filter(id => chain.includes(id));
  assert.deepEqual(Array.from(selected), chain);
  // The theater and the ship are in different places without a shared day.
  const theaterIndex = orderedIds.indexOf('event-0322');
  assert.ok(theaterIndex > orderedIds.indexOf('event-0319'));
  assert.ok(theaterIndex < orderedIds.indexOf('event-0324'));
  assert.ok(!groups.some(group => group.items.some(event => event.entry_id === 'event-0329')));
});

test('Morora and the vortex precede the shared dream, with the real-world wake in between dream phases', () => {
  const {groups} = helpers.story_timeline(loadModel().events);
  const chain = ['0343','0342','0344','0345','0346','0349','0350','0351','0352','0353','0354','0356','0358','0359','0360','0361'].map(id => 'event-' + id);
  const selected = groups.flatMap(group => group.items.map(item => item.entry_id)).filter(id => chain.includes(id));
  assert.deepEqual(Array.from(selected), chain);
  const wake = groups.find(group => group.items.some(item => item.entry_id === 'event-0359'));
  assert.ok(wake, '现实中醒来的事件应保留在时间线上');
  assert.doesNotMatch(wake.label, /特里尔/u);
  assert.match(wake.items.find(item => item.entry_id === 'event-0359').event_summary, /现实(?:的)?特里尔/u);
});
