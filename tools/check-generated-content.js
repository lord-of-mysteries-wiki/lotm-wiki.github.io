// Validate every generated relation endpoint and event destination under the configured subpath.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {loadModel}=require('./lib/content-model');
const {isBriefEvent,eventTimelineTitle}=require('./lib/event-presentation');
const m=loadModel(),timeline=fs.readFileSync('public/timeline/index.html','utf8'),calendar=fs.readFileSync('public/timeline/calendar/index.html','utf8');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('public/relationships/graph-data.js','utf8')+'\nthis.data={characters,relations};',context);
assert.equal(context.data.characters.length,m.characters.length);assert.equal(context.data.relations.length,m.relations.length);
// Exercise the exact browser query module against the generated primary data.
vm.runInContext(fs.readFileSync('public/relationships/relationship-query.js','utf8'),context);
const pairQuery=context.WikiRelationshipQuery.createRelationshipQuery(context.data.characters,context.data.relations);
assert.equal(pairQuery.stats.relations,m.relations.length);
for (const relation of context.data.relations) {
  assert.ok(pairQuery.directRelations(relation.a,relation.b).includes(relation),'查询器丢失原始关系: '+relation.id);
}
if (context.data.relations.length) {
  const sample=context.data.relations[0];
  assert.equal(pairQuery.queryPair(sample.a,sample.b).connection.degrees,1);
}
const graphPage=fs.readFileSync('public/relationships/index.html','utf8');
assert.ok(graphPage.indexOf('/relationships/graph-data.js')<graphPage.indexOf('/relationships/relationship-query.js'));
assert.ok(graphPage.indexOf('/relationships/relationship-query.js')<graphPage.indexOf('/relationships/graph.js'));
console.log(`关系查询校验通过：${pairQuery.stats.people} 人、${pairQuery.stats.relations} 条原始关系及查询模块加载顺序。`);
// Compare generated graph introductions against Hexo's rendered canonical body,
// not against a second hand-maintained expected summary.
const {characterExcerpt}=require('../themes/lotm/lib/character-excerpt');
const renderedPeople=new Map(JSON.parse(fs.readFileSync('db.json','utf8')).models.Page.filter(p=>p.character_profile).map(p=>[p.entry_id,p]));
const sourcePeople=new Map(m.profiles.map(p=>[p.entry_id,p]));
for (const person of context.data.characters) {
  assert.ok(!Object.hasOwn(person,'documentProfile'),person.id);
  const rendered=renderedPeople.get(person.id);
  assert.ok(rendered,person.id);
  assert.equal(rendered._content.trim(),sourcePeople.get(person.id)._content.trim(),'人物正文已变更，须重新构建: '+person.id);
  assert.deepEqual(JSON.parse(JSON.stringify(person.documentExcerpt)),characterExcerpt(rendered),'图谱简介或局部来源未同步: '+person.id);
}
console.log(`人物摘要校验通过：${context.data.characters.length} 个图谱简介与正式正文及局部出处一致。`);
for(const p of m.profiles){const file=path.join('public',p.path,p.path.endsWith('/')?'index.html':'');assert.ok(fs.existsSync(file),file);}
for(const event of m.events){
  if(isBriefEvent(event)){
    assert.ok(timeline.includes('id="event-'+(event.event_anchor||event.title)+'"'),event.entry_id);
    assert.equal(event._content.trim(),'',
      event.entry_id+' 简记的叙述应由共享概括字段提供');
  }else{
    assert.ok(fs.existsSync(path.join('public',event.path,event.path.endsWith('/')?'index.html':'')),event.path);
  }
}
const records=JSON.parse(calendar.match(/<script type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(records.length,m.events.length);
assert.equal(new Set(records.map(r=>r.id)).size,m.events.length);
const recordsById=new Map(records.map(record=>[record.id,record]));
for(const e of m.events){
  const record=recordsById.get(e.entry_id);
  const window=e.event_time_window && e.event_time;
  const label=(e.event_calendar_label || eventTimelineTitle(e)) +
    (e.event_cordu_cycle ? '（第'+'一二三'[e.event_cordu_cycle-1]+'轮）' : '');
  assert.equal(record?.title,e.title,e.entry_id);
  assert.equal(record.start,window ? '' : String(e.event_time || ''),e.entry_id);
  assert.equal(record.end,window ? '' : String(e.event_time_end || ''),e.entry_id);
  assert.equal(record.period,window ? e.event_time.slice(0,7) : e.event_time_period || '',e.entry_id);
  assert.equal(record.periodEnd,window ? e.event_time_end.slice(0,7) : e.event_time_period_end || '',e.entry_id);
  assert.equal(record.label,label,e.entry_id);
  assert.equal(record.summary,e.event_summary || '',e.entry_id);
  assert.equal(record.rangeKind,e.event_range_kind || '',e.entry_id);
}
for(const profile of m.profiles.filter(p=>m.relations.some(r=>r.a===p.entry_id||r.b===p.entry_id))){
  const html=fs.readFileSync(path.join('public',profile.path,'index.html'),'utf8');
  const graphLink='/lotm-wiki.github.io/relationships/?a='+encodeURIComponent(profile.entry_id);
  const section=html.match(/<details\b[^>]*\bclass="character-relations"[^>]*>[\s\S]*?<\/details>/)?.[0];
  if(profile.character_record_tables){
    assert.ok(section && !/<details\b[^>]*\bopen\b/.test(section),profile.entry_id+' 人物关系区应默认收起');
    assert.ok(section.includes(graphLink),profile.entry_id+' 人物关系区缺少关系网入口');
  }else{
    assert.ok(!section,profile.entry_id+' 旧版人物档案只显示关系网入口');
  }
  assert.ok(html.includes(graphLink),profile.entry_id);
}
assert.ok(fs.readFileSync('public/relationships/index.html','utf8').includes('/relationships/graph-data.js'));
console.log(`生成页面校验通过：人物目标、关系网入口、${m.events.length} 个事件目的地、日历记录与部署子路径。`);

// The calendar and event detail pages must retain both evidence scopes.
const {eventReferences}=require('./lib/event-references');
const escapeHTML=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
for(const event of m.events) {
  const expected=eventReferences(event);
  const actual=recordsById.get(event.entry_id).references;
  assert.deepEqual(actual.map(r=>r.source),expected.map(r=>r.source),event.entry_id);
  if(!isBriefEvent(event)) {
    const html=fs.readFileSync(path.join('public',event.path,event.path.endsWith('/')?'index.html':''),'utf8');
    const {sourceKey}=require('../themes/lotm/lib/character-references');
    const {parseDocument}=require('htmlparser2'),{findAll,textContent}=require('domutils');
    const rows=findAll(node=>node.name==='li' && /^character-source-/.test(node.attribs?.id||''),parseDocument(html).children);
    for(const ref of expected) assert.ok(rows.some(row=> {
      const scope=row.children.find(node=>(node.attribs?.class||'').split(/\s+/).includes('character-source-scopes'));
      const source=row.children.filter(node=>node!==scope).map(textContent).join('');
      return sourceKey(source)===sourceKey(ref.source) && ref.scopes.every(value=>textContent(scope||{children:[]}).includes(value==='facts'?'事件概括与经过':'时间依据'));
    }),event.entry_id+' missing source or scope: '+ref.source);
    if(expected.length) assert.ok(html.includes('<section class="event-sources entry-sources">'),event.entry_id+' 来源须在详情页末直接显示');
  }
}
console.log('事件来源校验通过：事实及时间来源完整保留，日历和详情共用引用集合。');

assert.ok(!timeline.includes('event-sources--compact'),'时间线不再按事件显示来源展开控件');
for(const event of m.events) {
  const citation=require('./lib/event-references').shortEventSource(event);
  if(citation) assert.ok(timeline.includes('data-event-citation="'+escapeHTML(citation)+'"'),event.entry_id);
}

assert.ok(!timeline.includes('class="timeline-source"'),'时间线不常显来源行');

// Every generated character citation must resolve to a source and back again.
for(const profile of m.profiles){
  const html=fs.readFileSync(path.join('public',profile.path,'index.html'),'utf8');
  const ids=[...html.matchAll(/id="(character-(?:source-\d+|citation-\d+-\d+))"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,profile.entry_id+' duplicate citation ID');
  const links=[...html.matchAll(/href="#(character-(?:source-\d+|citation-\d+-\d+))"/g)].map(match=>match[1]);
  for(const id of links)assert.ok(ids.includes(id),profile.entry_id+' missing '+id);
  const markers=ids.filter(id=>id.startsWith('character-citation-'));
  if(markers.length){assert.ok(html.includes('<section class="character-sources">'),profile.entry_id);assert.ok(html.includes('/js/character-citations.js'),profile.entry_id);assert.ok(!html.includes('>[1]</a>'),profile.entry_id);}
}
console.log('人物引用校验通过：标识唯一，来源完整显示，共享浮层已加载。');

// Short authored attributes must actually reach the infobox, rather than being
// replaced by generic detail links after a template change.
const {parseDocument,DomUtils}=require('htmlparser2');
const {characterFactText}=require('../themes/lotm/lib/character-facts');
const {createCharacterReferences:factReferences}=require('../themes/lotm/lib/character-references');
let directFacts=0;
for (const profile of m.profiles) {
  const html=fs.readFileSync(path.join('public',profile.path,'index.html'),'utf8');
  const dom=parseDocument(html);
  const box=DomUtils.findOne(node=>(node.attribs?.class || '').split(/\s+/).includes('character-profile__facts'),dom.children,true);
  assert.ok(box,profile.entry_id);
  const rows=new Map(DomUtils.findAll(node=>node.name==='dt',box.children).map(node=>[
    DomUtils.textContent(node),DomUtils.textContent(DomUtils.findOne(sibling=>sibling.name==='dd',node.parent.children,false))
  ]));
  for (const fact of profile.profile_facts || []) {
    if (fact.value || ['所属组织','途径与序列'].includes(fact.label)) continue;
    const text=characterFactText(renderedPeople.get(profile.entry_id),fact);
    if (!text) continue;
    const visible=DomUtils.textContent(parseDocument(factReferences({content:''}).text(text,'信息栏'))).replace(/\s+/g,'');
    assert.ok(String(rows.get(fact.label) || '').replace(/\s+/g,'').includes(visible),profile.entry_id+' 信息栏缺少直接属性: '+fact.label);
    directFacts++;
  }
}
console.log(`人物信息栏校验通过：${directFacts} 项正文短属性直接显示，完整限定与出处沿用主资料。`);

// Character links must use an existing canonical page and a current section.
// Resolve relative links from their actual generated routes under the subpath.
const characterHtmlCache=new Map();
for(const profile of m.profiles){
  const html=fs.readFileSync(path.join('public',profile.path,'index.html'),'utf8');
  for(const match of html.matchAll(/href="([^"]+)"/g)){
    const url=new URL(match[1].replace(/&amp;/g,'&'),'https://wiki.invalid/lotm-wiki.github.io/'+profile.path);
    if(url.hostname!=='wiki.invalid'||!url.pathname.startsWith('/lotm-wiki.github.io/characters/'))continue;
    const target=path.join('public',decodeURIComponent(url.pathname.slice('/lotm-wiki.github.io/'.length)),url.pathname.endsWith('/')?'index.html':'');
    assert.ok(fs.existsSync(target),profile.entry_id+' invalid character link '+match[1]);
    if(url.hash){
      if(!characterHtmlCache.has(target))characterHtmlCache.set(target,fs.readFileSync(target,'utf8'));
      assert.ok(characterHtmlCache.get(target).includes('id="'+decodeURIComponent(url.hash.slice(1))+'"'),profile.entry_id+' invalid character anchor '+match[1]);
    }
  }
}
console.log('人物链接校验通过：全部正式档案的站内人物目标与当前章节锚点有效。');

// Detail templates retain source locators while keeping research panels closed.
for(const event of m.events.filter(event=>!isBriefEvent(event))){
  const html=fs.readFileSync(path.join('public',event.path,'index.html'),'utf8');
  assert.ok(html.includes('article entry-detail event-entry'),event.entry_id);
  if(event.event_time_basis || event.event_time_note)assert.ok(html.includes('<details class="event-time">'),event.entry_id);
  assert.ok(!/<details[^>]*class="event-time"[^>]*\bopen\b/.test(html),event.entry_id);
}
for(const event of m.events.filter(event=>event.event_era && /\d+-\d+年/u.test(event.event_time_note))){
  const label=event.event_time_note.replace(/^第[一二三四]纪/u,'').trim();
  assert.ok(timeline.includes('<summary>'+escapeHTML(label)+'</summary>'),event.entry_id+' 纪内年份范围须用半角短横线');
}
const fm=require('hexo-front-matter');
const {createCharacterReferences}=require('../themes/lotm/lib/character-references');
let artifactCount=0;
for(const file of fs.readdirSync('source/artifacts/entries').filter(file=>/\.(md|html)$/.test(file))){
  const page=fm.parse(fs.readFileSync(path.join('source/artifacts/entries',file),'utf8'));
  const html=fs.readFileSync(path.join('public',page.permalink,'index.html'),'utf8');
  assert.ok(html.includes('article entry-detail artifact-entry'),file);
  const expected=createCharacterReferences({content:page._content}).refs;
  for(const ref of expected)assert.ok(html.includes(escapeHTML(ref.source)),file+' lost source '+ref.source);
  if(expected.length)assert.ok(html.includes('<section class="artifact-sources entry-sources">'),file);
  assert.ok(!html.includes('<details class="artifact-sources entry-sources">'),file);
  assert.ok(!/<p>\s*(?:待核实|待补充|待考证)[。.]?\s*<\/p>/.test(html),file+' visible placeholder');
  artifactCount++;
}
console.log(`详情模板校验通过：事件时间依据默认收起，${artifactCount} 个物品页保留卷章来源并隐藏纯占位段落。`);
