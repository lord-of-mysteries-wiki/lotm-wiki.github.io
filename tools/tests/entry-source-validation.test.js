'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {expectedEventBibliography,validateEventDetailSources}=require('../lib/entry-source-validation');

const url='https://mp.weixin.qq.com/s/wW__8avKqix8HeFELLEkaw';
const article='爱潜水的乌贼，2025年4月7日《诡秘世界简略的历史年表》 '+url;
const event={entry_id:'fixture',event_source:`《诡秘之主》第一卷第9章；${article}；第四卷第12章；未识别的原始记录（自述）`,event_time_source:`《诡秘之主》第六卷第68章；${article}`};
// Independent expected records: do not obtain these rows from the renderer or
// the shared splitter whose data retention this validator must protect.
const rows=[
  {source:'《诡秘之主》第一卷第9章；第四卷第12章；未识别的原始记录（自述）',scopes:['事件概括与经过']},
  {source:article,scopes:['事件概括与经过','时间依据']},
  {source:'《诡秘之主》第六卷第68章',scopes:['时间依据']}
];
const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function html(records) {
  return '<section class="event-sources entry-sources"><h2>来源</h2><ol>'+records.map((row,i)=>
    `<li id="character-source-${i+1}">${escape(row.source).replace(escape(url),`<a href="${url}">${url}</a>`)}<span class="character-source-scopes">${row.scopes.join('；')}</span></li>`).join('')+'</ol></section>';
}
const clone=()=>structuredClone(rows);

test('shared bibliography matches independent explicit records without mutating source fields',()=>{
  const before=structuredClone(event);
  assert.deepEqual(expectedEventBibliography(event),rows);
  assert.doesNotThrow(()=>validateEventDetailSources(html(rows),event));
  assert.deepEqual(event,before);
});

test('missing author, missing inherited chapter, missing time scope and duplicate author all fail',()=>{
  assert.throws(()=>validateEventDetailSources(html(rows.filter(row=>row.source!==article)),event),/完整来源/);
  const chapter=clone();chapter[0].source=chapter[0].source.replace('第四卷第12章；','');
  assert.throws(()=>validateEventDetailSources(html(chapter),event),/完整来源/);
  const scope=clone();scope[1].scopes=['事件概括与经过'];
  assert.throws(()=>validateEventDetailSources(html(scope),event),/丢失适用范围 时间依据/);
  assert.throws(()=>validateEventDetailSources(html([...rows,rows[1]]),event),/恰有一行/);
  assert.throws(()=>validateEventDetailSources(html([...rows,{source:event.event_source,scopes:['事件概括与经过']}]),event),/复合来源中重复/);
});

test('an unchanged visible URL cannot conceal a changed href',()=>{
  const altered=html(rows).replace(`href="${url}"`,'href="https://example.com/altered"');
  assert.throws(()=>validateEventDetailSources(altered,event),/原始URL链接缺失或改变/);
  const text=clone();text[1].source=article.replace(url,'https://example.com/altered');
  assert.throws(()=>validateEventDetailSources(html(text),event),/完整来源/);
});

test('same article URL with distinct restrictions remains two complete, scoped records',()=>{
  const restricted={entry_id:'restrictions',event_source:article+'（只说明成神）',event_time_source:article+'（只说明年代）'};
  const separate=[{source:article+'（只说明成神）',scopes:['事件概括与经过']},{source:article+'（只说明年代）',scopes:['时间依据']}];
  assert.deepEqual(expectedEventBibliography(restricted),separate);
  assert.doesNotThrow(()=>validateEventDetailSources(html(separate),restricted));
  assert.throws(()=>validateEventDetailSources(html([{source:article,scopes:['事件概括与经过','时间依据']}]),restricted),/完整来源/);
});

test('unknown records and inherited novel strings are validated as full records',()=>{
  const raw={entry_id:'unknown',event_source:'未知访谈；第四卷第12章（定位待核）'};
  const complete=[{source:raw.event_source,scopes:['事件概括与经过']}];
  assert.deepEqual(expectedEventBibliography(raw),complete);
  assert.doesNotThrow(()=>validateEventDetailSources(html(complete),raw));
  assert.throws(()=>validateEventDetailSources(html([{source:'未知访谈',scopes:['事件概括与经过']}]),raw),/完整来源/);
  assert.throws(()=>validateEventDetailSources(html(rows).replace('event-sources entry-sources','other'),event),/唯一/);
});
