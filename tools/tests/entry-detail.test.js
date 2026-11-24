const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createEntryDetail}=require('../../themes/lotm/lib/entry-detail');
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

test('creature template preserves species scope and reuses collapsed citations',()=>{
  const fs=require('fs'),path=require('path'),ejs=require('ejs');
  const page={title:'生物模板验证',content:'<h2>简介</h2><p>一种生物。</p><h2>能力与危险</h2><p>仅一个体表现（推定）。（《诡秘之主》第一卷第31章）</p><h2>分布与习性</h2><p>待核实。</p><h2>待核事项</h2><p>分布范围不详。</p>'};
  const locals={page,entry_detail_view:createEntryDetail,wiki_related:()=>[],__:(key)=>key};
  locals.partial=(name,data)=>ejs.render(fs.readFileSync(path.join(__dirname,'../../themes/lotm/layout',name+'.ejs'),'utf8'),{...locals,...data});
  const html=locals.partial('_partials/creature-entry',{});
  assert.ok(html.includes('creature-entry'));assert.ok(html.includes('仅一个体表现（推定）'));
  assert.ok(!html.includes('<h2>分布与习性'));assert.ok(html.includes('data-character-source'));
  assert.ok(html.includes('<details class="creature-sources entry-sources">'));
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
