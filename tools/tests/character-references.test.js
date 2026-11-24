const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createCharacterReferences}=require('../../themes/lotm/lib/character-references');
test('repeated complete locators share one source with all section scopes',()=>{
  const source='《诡秘之主》第七卷第85章';
  const view=createCharacterReferences({content:`<h2>所属组织</h2><p>见${source}。</p><h2>尊名与回应</h2><p>见${source}。</p>`});
  assert.equal(view.refs.length,1);assert.equal(view.refs[0].source,source);
  assert.deepEqual([...view.refs[0].scopes],['所属组织','尊名与回应']);
  assert.equal(view.refs[0].backlinks.length,2);assert.ok(!view.body.includes(source));
});
test('qualifications remain beside facts and separate chapters remain separate',()=>{
  const view=createCharacterReferences({content:'<h2>晋升经历</h2><p>借用的能力，尚未晋升。（《宿命之环》第八卷第3章）</p><p>真正晋升。（《宿命之环》第八卷第25章）</p>'});
  assert.equal(view.refs.length,2);assert.ok(view.body.includes('借用的能力，尚未晋升。'));
});
test('relation overview and stages reuse locators without losing unknown evidence',()=>{
  const view=createCharacterReferences({content:''});
  view.cite('《诡秘之主》第一卷第5章、第6章；《诡秘之主》第八卷第2章、第8章','关系概述');
  view.cite('《诡秘之主》第一卷第5章、第6章','关系阶段：初遇');
  assert.equal(view.refs.length,2);assert.equal(view.refs[0].backlinks.length,2);
  view.cite('《诡秘之主》第一卷第5章（仅为推测）','身份');
  assert.equal(view.refs.at(-1).source,'《诡秘之主》第一卷第5章（仅为推测）');
});
test('links, attributes, and unrelated prose are not rewritten',()=>{
  const content='<h2 id="人物">人物</h2><p>待核实。<a href="/test" title="《诡秘之主》第一卷第9章">人物档案</a></p>';
  const view=createCharacterReferences({content});assert.equal(view.body,content);assert.equal(view.refs.length,0);
});
test('infobox joins the same source collection and escapes markup',()=>{
  const source='《诡秘之主》第七卷第85章';
  const view=createCharacterReferences({content:`<h2>组织</h2><p>${source}</p>`});
  const summary=view.text('<script>unsafe</script>'+source,'信息栏：所属组织');
  assert.equal(view.refs.length,1);assert.equal(view.refs[0].backlinks.length,2);
  assert.ok(summary.includes('&lt;script&gt;'));assert.ok(!summary.includes('<script>'));
});
test('hover citations have no visible marker or dangling citation labels',()=>{
  const view=createCharacterReferences({content:'<p>保持推定。依据：《诡秘之主》第一卷第9章。</p><p>限定时期（《诡秘之主》第一卷第10章）。</p>'});
  assert.ok(!view.body.includes('依据：'));
  assert.ok(!view.body.includes('[1]'));
  assert.ok(view.body.includes('data-character-source="《诡秘之主》一卷9章"'));
  assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),'<p>保持推定。</p><p>限定时期。</p>');
});

test('multi-book citation sentences leave no visible separators',()=>{
  const view=createCharacterReferences({content:'<p>保留事实。见《诡秘之主》第八卷第40章；《宿命之环》第七卷第68章、第八卷第3章。</p>'});
  assert.equal(view.refs.length,2);
  assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),'<p>保留事实。</p>');
});

test('citation prose retains readable subjects and inherited chapter evidence',()=>{
  const view=createCharacterReferences({content:'<p>分别见《诡秘之主》第一卷第15章及后续章节、第5章-第7章、第48章。</p><p>《诡秘之主》第一卷第1章介绍原身。</p>'});
  assert.equal(view.refs[0].source,'《诡秘之主》第一卷第15章及后续章节、第5章-第7章、第48章');
  assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),'<p></p><p>原文介绍原身。</p>');
});

test('compact chapter lists and inherited volumes are fully hidden without losing scope',()=>{
  const source='《诡秘之主》第三卷第65、66–67章；第八卷第18、37章；《宿命之环》第八卷第16、18、23章';
  const view=createCharacterReferences({content:`<p>仅代掌，晋升尚未发生。（${source}）</p>`});
  assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),'<p>仅代掌，晋升尚未发生。</p>');
  assert.equal(view.refs.length,2);
  assert.equal(view.refs[0].source,'《诡秘之主》第三卷第65、66–67章；第八卷第18、37章');
  assert.equal(view.refs[1].source,'《宿命之环》第八卷第16、18、23章');
  assert.ok(view.body.includes('《诡秘之主》三卷65、66–67章；八卷18、37章'));
});

test('partial chapter mentions do not consume neighboring prose or uncertainty',()=>{
  const view=createCharacterReferences({content:'<p>第二卷的经历待核。（《诡秘之主》第七卷第17、22章，仅为推测）</p>'});
  assert.ok(view.body.includes('第二卷的经历待核。'));
  assert.ok(view.body.includes('仅为推测'));
  assert.equal(view.refs[0].source,'《诡秘之主》第七卷第17、22章');
});

test('qualified citation parentheses retain authored notes without orphaned separators',()=>{
  const a='《宿命之环》第五卷第96章',b='《诡秘之主》第一卷第9章';
  for (const [content,expected,sources] of [
    [`受创。（${a}；军团协同、当地限制与陨石冲击）`,'受创。（军团协同、当地限制与陨石冲击）',[a]],
    [`序列未定。（${a}，仅为推测）`,'序列未定。（仅为推测）',[a]],
    [`借用能力。(${a}; ${b}; 仅适用于本次战斗)`,'借用能力。(仅适用于本次战斗)',[a,b]],
  ]) {
    const view=createCharacterReferences({content:`<p>${content}</p>`});
    assert.equal(view.body.replace(/<span hidden[^>]*><\/span>/g,''),`<p>${expected}</p>`);
    assert.deepEqual(view.refs.map(ref=>ref.source),sources);
  }
});

test('source keys merge range typography without dropping qualifiers or chapters',()=>{
  const {sourceKey}=require('../../themes/lotm/lib/character-references');
  const source='《诡秘之主》第一卷第9章至第12章、第210章';
  assert.equal(sourceKey(source),sourceKey(source.replace('至','—')));
  assert.notEqual(sourceKey(source),sourceKey(source+'（推定）'));
  assert.notEqual(sourceKey(source),sourceKey(source.replace('210','211')));
  const view=createCharacterReferences({content:''});
  view.citeWhole(source.replace('至','—'),'经过');view.citeWhole(source,'时间');
  assert.equal(view.refs.length,1);assert.deepEqual([...view.refs[0].scopes],['经过','时间']);
});
