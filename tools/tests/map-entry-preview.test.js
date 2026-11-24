'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mapEntryPreview}=require('../../themes/lotm/lib/map-entry-preview');
test('preview follows entry edits and uses only sources of the selected paragraph',()=>{
 const source='《诡秘之主》第一卷第9章';
 const page={content:`<p>一座古国（推定）。（${source}）</p><p>后续事件。（《诡秘之主》第二卷第30章）</p>`};
 assert.deepEqual(mapEntryPreview(page),{excerpt:'一座古国（推定）。',excerptSources:[source]});
 assert.equal(mapEntryPreview({...page,content:page.content.replace('一座古国','一座城邦')}).excerpt,'一座城邦（推定）。');
});
test('city preview keeps its own citations and does not fall back to country prose',()=>{
 const page={content:'<p>国家简介。（《诡秘之主》第一卷第9章）</p><ul><li><strong>特里尔</strong>：首都。（《宿命之环》第三卷第93章；第四纪）</li><li>特里尔旧城：遗迹。</li></ul>'};
 assert.deepEqual(mapEntryPreview(page,'特里尔'),{excerpt:'特里尔：首都。（第四纪）',excerptSources:['《宿命之环》第三卷第93章']});
 assert.deepEqual(mapEntryPreview(page,'不存在的城市'),{excerpt:'',excerptSources:[]});
});
test('unparsed evidence remains visible instead of being discarded',()=>{
 assert.ok(mapEntryPreview({content:'<p>资料。（作者说明，篇章待核）</p>'}).excerpt.includes('作者说明，篇章待核'));
});
