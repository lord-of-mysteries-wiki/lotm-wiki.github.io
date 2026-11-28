const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createEntryDetail}=require('../../themes/lotm/lib/entry-detail');
test('keep organization origins and purpose in the body instead of treating them as bibliography',()=>{
  const view=createEntryDetail({content:'<h2>来源与宗旨</h2><p>海拉是发起者之一。（《宿命之环》第一卷第48章）</p><h2>来源</h2><p>作者文章支持成立时期。</p>'},'worldview');
  assert.ok(view.body.includes('来源与宗旨'));
  assert.ok(view.body.includes('海拉是发起者之一'));
  assert.ok(!view.notes.includes('海拉是发起者之一'));
  assert.ok(view.notes.includes('作者文章支持成立时期'));
});
test('omit empty scaffold sections while retaining actual limitations and images',()=>{
  const view=createEntryDetail({content:'<h2>简介</h2><p>一只手套。</p><h2>制造方式</h2><p>待核实。</p><h2>副作用</h2><p>封印后仍会饥饿。</p><h2>外观</h2><img src="glove.png">'},'artifact');
  assert.ok(!view.body.includes('制造方式'));assert.ok(!view.body.includes('<h2>简介'));
  assert.ok(view.body.includes('封印后仍会饥饿'));assert.ok(view.body.includes('glove.png'));
});
test('reuse chapter locators from body and source section without losing notes',()=>{
  const source='《诡秘之主》第一卷第190章';
  const view=createEntryDetail({content:`<h2>功能</h2><p>切换至少一秒。（${source}）</p><h2>来源</h2><p>${source}：齐林格斯持有时期。</p><h2>待核事项</h2><p>完整形成过程不详。</p>`},'artifact');
  assert.equal(view.references.refs.length,1);assert.ok(view.body.includes('data-character-source'));
  assert.ok(!view.body.includes('<h2>来源'));assert.ok(!view.body.includes('齐林格斯持有时期'));
  assert.ok(view.notes.includes('齐林格斯持有时期'));assert.ok(view.notes.includes('完整形成过程不详'));
});
test('retain complete event metadata sources, including time scope and unknown evidence',()=>{
  const fact='《诡秘之主》第一卷第9章；《诡秘之主》第二卷第2章';
  const time='作者原文，特定日期，仅适用本事件';
  const view=createEntryDetail({content:'<h2>经过</h2><p>事件发生。</p>',event_source:fact,event_time_source:time},'event');
  assert.ok(view.references.refs.some(ref=>ref.source===fact));assert.ok(view.references.refs.some(ref=>ref.source===time));
  assert.ok(view.fallback.includes('一卷9章'));assert.ok(view.body.includes('事件发生'));
});

const historyArticle='爱潜水的乌贼，2025年4月7日《诡秘世界简略的历史年表》 https://mp.weixin.qq.com/s/wW__8avKqix8HeFELLEkaw';
test('event bibliography merges a shared author article while preserving inherited novel locators',()=>{
  const fact=`《诡秘之主》第一卷第9章；${historyArticle}；第四卷第12章；未识别的原始记录`;
  const time=`《诡秘之主》第五卷第30章；${historyArticle}`;
  const page={content:'<p>事件发生。</p>',event_source:fact,event_time_source:time};
  const view=createEntryDetail(page,'event');
  assert.equal(view.references.refs.length,3);
  assert.ok(view.references.refs.some(ref=>ref.source==='《诡秘之主》第一卷第9章；第四卷第12章；未识别的原始记录'));
  const article=view.references.refs.find(ref=>ref.source===historyArticle);
  assert.deepEqual([...article.scopes],['事件经过','时间依据']);
  view.references.citeBibliography(fact,'概括');
  assert.equal(view.references.refs.length,3);
  assert.deepEqual([...article.scopes],['事件经过','时间依据','概括']);
  assert.equal(page.event_source,fact);assert.equal(page.event_time_source,time);
});

test('event bibliography retains different article restrictions and incomplete formats verbatim',()=>{
  const fact=`《诡秘之主》第一卷第9章；${historyArticle}（只说明成神）`;
  const time=`《诡秘之主》第四卷第12章；${historyArticle}（只说明年代）`;
  const view=createEntryDetail({content:'',event_source:fact,event_time_source:time},'event');
  assert.equal(view.references.refs.length,4);
  assert.ok(view.references.refs.some(ref=>ref.source===historyArticle+'（只说明成神）'&&ref.scopes.has('事件经过')));
  assert.ok(view.references.refs.some(ref=>ref.source===historyArticle+'（只说明年代）'&&ref.scopes.has('时间依据')));
  const unknown='未知记录 ; 爱潜水的乌贼《未给日期的文章》 https://example.com/raw；第四卷第12章（推测）';
  const raw=createEntryDetail({content:'',event_source:unknown,event_time_source:unknown},'event');
  assert.equal(raw.references.refs.length,1);assert.equal(raw.references.refs[0].source,unknown);
});

test('event overview reuses bibliography entries instead of adding its original composite citation',()=>{
  const fs=require('node:fs'),ejs=require('ejs');
  const fact=`《诡秘之主》第一卷第9章；${historyArticle}`;
  const time=`《诡秘之主》第四卷第12章；${historyArticle}`;
  const page={title:'事件',content:'<p>详细经过。</p>',event_summary:'事件概括。',event_source:fact,event_time_source:time};
  let renderedView;
  const sourcesTemplate=fs.readFileSync('themes/lotm/layout/_partials/entry-sources.ejs','utf8');
  const html=ejs.render(fs.readFileSync('themes/lotm/layout/_partials/event-entry.ejs','utf8'),{
    page,entry_detail_view:(page,kind)=>renderedView=createEntryDetail(page,kind),event_date_label:()=>'',
    event_summary_parts:()=>[{text:page.event_summary}],__:key=>key,url_for:x=>x,
    partial:(name,data)=>name==='_partials/entry-sources'?ejs.render(sourcesTemplate,{...data,__:key=>key}):''
  });
  assert.ok(html.includes('event-overview'));
  assert.equal(renderedView.references.refs.length,3);
  assert.equal(renderedView.references.refs.filter(ref=>ref.source===historyArticle).length,1);
  assert.ok(!renderedView.references.refs.some(ref=>ref.source===fact));
  const footer=html.slice(html.indexOf('<section class="event-sources entry-sources">'));
  assert.equal(footer.split('诡秘世界简略的历史年表').length-1,1);
  assert.ok(footer.includes('事件经过；时间依据'));
});

test('event template displays the era date once and keeps the time evidence collapsed',()=>{
  const fs=require('node:fs');
  const path=require('node:path');
  const ejs=require('ejs');
  const {eventDateLabel}=require('../lib/event-presentation');
  const template=fs.readFileSync(path.join(__dirname,'../../themes/lotm/layout/_partials/event-entry.ejs'),'utf8');
  const page={
    title:'四皇之战',
    content:'<p>四皇交战。</p>',
    event_era:4,
    event_time_note:'第四纪1047-1052年',
    event_time_basis:'纪元年份见作者年表。'
  };
  const html=ejs.render(template,{
    page,
    entry_detail_view:createEntryDetail,
    event_date_label:eventDateLabel,
    __:key=>key,
    partial:()=> ''
  });
  assert.match(html,/<p class="entry-date">第四纪1047-1052年<\/p>/);
  assert.equal(html.split(page.event_time_note).length,2);
  assert.match(html,/<details class="event-time">[\s\S]*纪元年份见作者年表。/);
});
test('remove only exact repeated overview; keep a different detailed account',()=>{
  const repeated=createEntryDetail({event_summary:'事件概括。',content:'<p>事件概括。</p><p>随后展开行动。</p>'},'event');
  assert.ok(!repeated.body.includes('事件概括'));assert.ok(repeated.body.includes('随后展开行动'));
  const different=createEntryDetail({event_summary:'事件概括。',content:'<p>事件的具体经过。</p>'},'event');
  assert.ok(different.body.includes('具体经过'));
});
test('preserve unknown citations and explicit uncertainty in reader prose',()=>{
  const view=createEntryDetail({content:'<h2>相关途径</h2><p>恶棍途径（推测）。作者公众号原文，日期待核。</p>'},'artifact');
  assert.ok(view.body.includes('（推测）'));assert.ok(view.body.includes('作者公众号原文'));
});

test('inline chapter introductions do not leave orphan punctuation',()=>{
  const view=createEntryDetail({content:'<p>《诡秘之主》第六卷第21章，克莱恩失去手套。《诡秘之主》第八卷第6章，手套落入阿蒙手中。</p>'},'artifact');
  assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),'<p>克莱恩失去手套。手套落入阿蒙手中。</p>');
});

test('repeated book names separated by enumeration commas leave no empty parentheses',()=>{
  const view=createEntryDetail({content:'<p>带回源堡。（《诡秘之主》第七卷第23章、《诡秘之主》第八卷第28章）</p>'},'artifact');
  assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),'<p>带回源堡。</p>');
  assert.equal(view.references.refs.length,2);
});

test('creature template preserves species scope and renders visible citations',()=>{
  const fs=require('fs'),path=require('path'),ejs=require('ejs');
  const page={title:'生物模板验证',content:'<h2>简介</h2><p>一种生物。</p><h2>能力与危险</h2><p>仅一个体表现（推定）。（《诡秘之主》第一卷第31章）</p><h2>分布与习性</h2><p>待核实。</p><h2>待核事项</h2><p>分布范围不详。</p>'};
  const locals={page,entry_detail_view:createEntryDetail,wiki_related:()=>[],__:(key)=>key};
  locals.partial=(name,data)=>ejs.render(fs.readFileSync(path.join(__dirname,'../../themes/lotm/layout',name+'.ejs'),'utf8'),{...locals,...data});
  const html=locals.partial('_partials/entry-detail',{kind:'creature'});
  assert.ok(html.includes('creature-entry'));assert.ok(html.includes('仅一个体表现（推定）'));
  assert.ok(!html.includes('<h2>分布与习性'));assert.ok(html.includes('data-character-source'));
  assert.ok(html.includes('<section class="creature-sources entry-sources">'));
  assert.ok(!/<details[^>]*\bopen\b/.test(html));assert.ok(html.includes('分布范围不详'));
});

test('country chronology attaches sources to events and retains qualifications',()=>{
  const source='《诡秘之主》第一卷第9章';
  const view=createEntryDetail({content:`<h2>历史</h2><p>建立国家。（${source}；年代不详）</p><table><thead><tr><th>时间</th><th>事件</th><th>来源</th></tr></thead><tbody><tr><td>第四纪</td><td>建立国家。</td><td>${source}；年代不详</td></tr></tbody></table>`},'country');
  assert.equal(view.references.refs.length,1);
  assert.equal((view.body.match(/<td>/g)||[]).length,2);
  assert.ok(!view.body.includes('<th>来源</th>'));
  assert.ok(!view.body.includes(source));
  assert.equal((view.body.match(/（年代不详）/g)||[]).length,2);
  assert.equal(view.references.refs[0].backlinks.length,2);
});
