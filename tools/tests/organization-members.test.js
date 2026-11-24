const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ejs=require('ejs');
const {createCharacterReferences}=require('../../themes/lotm/lib/character-references');

const template=fs.readFileSync(path.join(__dirname,'../../themes/lotm/layout/_partials/organization-members.ejs'),'utf8');

function render(facts,references=createCharacterReferences({content:''})){
  const members=[{title:'测试人物',path:'characters/entries/测试人物/',character_profile:true,graph_classifications:{organization:facts}}];
  return ejs.render(template,{
    page:{organization_members:'测试组织'},
    references,
    site:{pages:{sort:()=>({toArray:()=>members})}},
    url_for:value=>'/lotm-wiki.github.io/'+value.replace(/^\//,''),
    __:(key,name)=>({character_inferred_suffix:'（推定）',organization_members:'成员',organization_graph:`在人物关系网中查看${name}`})[key]
  });
}

test('keep inferred membership and its explanation in the source scope rather than beside the member',()=>{
  const references=createCharacterReferences({content:''});
  const html=render([{value:'测试组织',certainty:'inferred',unit:'外勤组',note:'人物判断',source:'《诡秘之主》第三卷第1章'}],references);
  assert.doesNotMatch(html,/（推定）/);
  assert.match(html,/外勤组/);
  assert.doesNotMatch(html,/人物判断/);
  assert.deepEqual([...references.refs[0].scopes],['成员：测试人物 · 外勤组 （推定） · 人物判断']);
  assert.match(html,/data-character-source=/);
  assert.doesNotMatch(html,/《诡秘之主》第三卷第1章/);
});

test('merge membership citations with body sources without losing member scopes or notes',()=>{
  const source='《诡秘之主》第三卷第1章';
  const references=createCharacterReferences({content:`<h2>历史沿革</h2><p>组织成立。（${source}）</p>`});
  const facts=[{value:'测试组织',unit:'外勤组',note:'早期任职',source},
    {value:'测试组织',unit:'后期分组',note:'后期调任',source}];
  const original=JSON.stringify(facts);
  const html=render(facts,references);
  assert.equal(references.refs.length,1);
  assert.equal(references.refs[0].source,source);
  assert.deepEqual([...references.refs[0].scopes],['历史沿革','成员：测试人物 · 外勤组','成员：测试人物 · 后期分组']);
  assert.match(html,/早期任职/);assert.match(html,/后期调任/);
  assert.match(html,/data-source-target="character-source-1"/);
  assert.equal(JSON.stringify(facts),original);
});

test('source-only membership attaches the citation to the member rather than an empty paragraph',()=>{
  const references=createCharacterReferences({content:''});
  const html=render([{value:'测试组织',source:'未识别的完整出处'}],references);
  assert.doesNotMatch(html,/<p>\s*<span hidden/);
  assert.equal(references.refs[0].source,'未识别的完整出处');
  assert.match(html,/lotm-wiki.github.io\/characters\/entries\/测试人物/);
});

test('keep uncertainty attached to its own membership record',()=>{
  const references=createCharacterReferences({content:''});
  const html=render([
    {value:'测试组织',certainty:'inferred',unit:'早期分组',note:'归属判断依据',source:'早期依据'},
    {value:'测试组织',unit:'后期分组',source:'后期依据'}
  ],references);
  assert.doesNotMatch(html,/（推定）|归属判断依据/);
  assert.deepEqual([...references.refs[0].scopes],['成员：测试人物 · 早期分组 （推定） · 归属判断依据']);
  assert.deepEqual([...references.refs[1].scopes],['成员：测试人物 · 后期分组']);
});
