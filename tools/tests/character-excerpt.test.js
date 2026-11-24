const {test}=require('node:test');
const assert=require('node:assert/strict');
const {characterExcerpt}=require('../../themes/lotm/lib/character-excerpt');
const {validateCharacterSource}=require('../lib/content-model');

test('excerpt follows the authored paragraph and its exact evidence, preserving qualifications',()=>{
  const a='《诡秘之主》第一卷第9章',b='《宿命之环》第八卷第3章';
  const content=`<h2>晋升经历</h2><ul><li>序列9。（${a}）</li></ul><h2>人物简介</h2><p>仅在早年借用能力，尚未晋升（推定）。（${b}）</p><p>后续经历。（${a}）</p>`;
  assert.deepEqual(characterExcerpt({content}),{text:'仅在早年借用能力，尚未晋升（推定）。',sources:[b]});
  assert.equal(characterExcerpt({content:content.replace('早年','1350年')}).text,'仅在1350年借用能力，尚未晋升（推定）。');
});
test('complete list fallback and multiple books retain all attached sources',()=>{
  const a='《诡秘之主》第一卷第9章',b='《宿命之环》第一卷第2章';
  assert.deepEqual(characterExcerpt({content:`<ul><li>身份不详；自述为医生。见${a}；${b}。</li></ul>`}),{text:'身份不详；自述为医生。',sources:[a,b]});
});
test('excerpt keeps citation scope and uncertainty without leading punctuation',()=>{
  const source='《宿命之环》第五卷第96章';
  const text='借来力量仍受创（推定）。';
  assert.deepEqual(characterExcerpt({content:`<p>${text}（${source}；军团协同、当地限制与陨石冲击）</p>`}),{
    text:text+'（军团协同、当地限制与陨石冲击）',sources:[source]
  });
});
test('sources and pending sections cannot become an invented introduction',()=>{
  assert.deepEqual(characterExcerpt({content:'<p>返回目录</p><p>待核实。</p><h2>来源</h2><p>书目。</p>'}),{text:'',sources:[]});
  assert.deepEqual(characterExcerpt({content:'<h2>待核实</h2><p>不能确定的编辑线索。</p>'}),{text:'',sources:[]});
  assert.deepEqual(characterExcerpt({content:'<p>身份不详。</p><p>其他经历。（《诡秘之主》第一卷第2章）</p>'}),{text:'身份不详。',sources:[]});
});
test('readers reject retired summary fields even when empty, and work duplicates',()=>{
  for (const field of ['documentProfile','documentExcerpt']) {
    assert.throws(()=>validateCharacterSource({source:'probe',graph_profile:{[field]:[]}}),/只能从正式正文生成/);
    assert.throws(()=>validateCharacterSource({source:'probe',[field]:{}}),/只能从正式正文生成/);
  }
  for (const fact of [{label:'身份',summary:''},{label:'所属作品',value:'诡秘之主'}]) {
    assert.throws(()=>validateCharacterSource({source:'probe',profile_facts:[fact]}),/不得维护摘要或作品副本/);
  }
  assert.throws(()=>validateCharacterSource({profile_facts:[{label:'身份',source_section:'已删除的小节'}]}),/不存在的正文小节/);
  assert.doesNotThrow(()=>validateCharacterSource({_content:'## 身份\n\n推定。',profile_work:'诡秘之主',profile_facts:[{label:'身份',source_section:'身份'}],graph_profile:{progression:[{certainty:'inferred',source:'完整原始出处'}]}}));
});
