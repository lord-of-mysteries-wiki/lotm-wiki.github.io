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

test('numbered daily-life extra citations share the normal source collection',()=>{
  const source='《诡秘之主》番外《一个普通人的日常》六、八';
  const view=createCharacterReferences({content:`<h2>交付经过</h2><p>身份未明。（${source}）</p><h2>后续</h2><p>交付完成。（${source}）</p>`});
  assert.equal(view.refs.length,1);
  assert.equal(view.refs[0].source,source);
  assert.deepEqual([...view.refs[0].scopes],['交付经过','后续']);
  assert.equal(view.refs[0].backlinks.length,2);
  assert.ok(view.body.includes('身份未明。'));
  assert.ok(!view.body.replace(/<span hidden[^>]*><\/span>/g,'').includes(source));
  assert.ok(view.body.includes('data-source-target="character-source-1"'));
});

test('an extra without an instalment locator stays visible and is not guessed',()=>{
  const content='<p>同一性不详。（《诡秘之主》番外《一个普通人的日常》）</p>';
  const view=createCharacterReferences({content});
  assert.equal(view.refs.length,0);
  assert.equal(view.body,content);
});

const articleTitle='“美神”非凡特性问题的解答和“魔女”途径能力补全';
const articleURL='https://mp.weixin.qq.com/s/cP_tqkcYhM-fA4l9c59JUA';
const articleSource=`爱潜水的乌贼，2025年8月4日《${articleTitle}》 ${articleURL}`;
const withoutMarkers=value=>value.replace(/<span hidden[^>]*><\/span>/g,'');
test('source scope follows the actual nested life stage and resets at its next sibling',()=>{
  const a='《诡秘之主》第一卷第9章',b='《诡秘之主》第二卷第3章';
  const view=createCharacterReferences({content:`<h2>生平经历</h2><h3>早年</h3><p>早年事实。（${a}）</p><h4>求学</h4><p>求学事实。（${b}）</p><h3>后来</h3><p>后期事实。（${a}）</p><h2>尊名</h2><p>尊名。（${b}）</p>`});
  assert.deepEqual([...view.refs[0].scopes],['生平经历：早年','生平经历：后来']);
  assert.deepEqual([...view.refs[1].scopes],['生平经历：早年：求学','尊名']);
  assert.ok(withoutMarkers(view.body).includes('<h4>求学</h4><p>求学事实。</p>'));
});
test('collected sources keep original URLs clickable and escape authored markup',()=>{
  const view=createCharacterReferences({content:''});
  const html=view.sourceHTML(articleSource+'（限定） <script>bad</script>');
  const link=html.match(/<a href="([^"]+)">([^<]+)<\/a>/);
  assert.ok(link);
  const {unescapeHTML}=require('hexo-util');
  assert.equal(unescapeHTML(link[1]),articleURL);
  assert.equal(unescapeHTML(link[2]),articleURL);
  assert.ok(html.includes('（限定）'));
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
  assert.ok(!view.sourceHTML('javascript:alert(1)').includes('<a'));
});
test('rendered Markdown author articles share structured sources and retain every scope',()=>{
  const html=`<h2>第四纪</h2><p>取得第二份特性。（爱潜水的乌贼，2025年8月4日《<a href="${articleURL}" title="原始文章">${articleTitle}</a>》）</p>`;
  const view=createCharacterReferences({content:html});
  view.cite(`《诡秘之主》第五卷第120章；《诡秘之主》第七卷第55章；${articleSource}`,'晋升：美神');
  view.cite(articleSource,'晋升：双序列1');
  assert.equal(view.refs.length,3);
  assert.equal(view.refs[0].source,articleSource);
  assert.deepEqual([...view.refs[0].scopes],['第四纪','晋升：美神','晋升：双序列1']);
  assert.equal(view.refs[0].backlinks.length,3);
  assert.equal(withoutMarkers(view.body),'<h2>第四纪</h2><p>取得第二份特性。</p>');
});

test('plain author citations and encoded link text normalize to the same complete article',()=>{
  const source='爱潜水的乌贼，2025年8月4日《A & B》 https://example.com/article?a=1&b=2';
  const view=createCharacterReferences({content:'<h2>经历</h2><p>完成。（爱潜水的乌贼，2025年8月4日《<a href="https://example.com/article?a=1&amp;b=2">A &amp; B</a>》）</p>'});
  view.cite(source,'晋升');
  assert.equal(view.refs.length,1);assert.equal(view.refs[0].source,source);
  assert.equal(withoutMarkers(view.body),'<h2>经历</h2><p>完成。</p>');
});

test('author citation qualifications remain visible beside their fact',()=>{
  const view=createCharacterReferences({content:`<h2>早期</h2><p>状态改善。（${articleSource}；具体年份不详）</p>`});
  assert.equal(withoutMarkers(view.body),'<h2>早期</h2><p>状态改善。（具体年份不详）</p>');
  assert.equal(view.refs[0].source,articleSource);
});

test('structured mixed sources preserve unknown portions and article qualifications verbatim',()=>{
  const view=createCharacterReferences({content:''});
  const qualified=articleSource+'（仅说明第四纪）';
  view.cite(`《诡秘之主》第五卷第120章；${qualified}；未核实的访谈定位`,'历史阶段');
  assert.deepEqual(view.refs.map(ref=>ref.source),['《诡秘之主》第五卷第120章',qualified,'未核实的访谈定位']);
  view.cite(articleSource,'另一阶段');
  assert.equal(view.refs.length,4);
  assert.deepEqual([...view.refs[1].scopes],['历史阶段']);
});

test('equal URLs do not merge distinct author article locators or restrictions',()=>{
  const view=createCharacterReferences({content:''});
  for(const source of [articleSource,articleSource.replace('2025年8月4日','2025年8月5日'),articleSource.replace(articleTitle,'另一篇文章'),articleSource+'（仅为自述）'])view.cite(source,'范围');
  assert.equal(view.refs.length,4);
});

test('incomplete author formats and unrelated links remain authored HTML',()=>{
  for(const content of [
    `<p>未核。（爱潜水的乌贼，2025年8月《<a href="${articleURL}">${articleTitle}</a>》）</p>`,
    `<p>未核。（爱潜水的乌贼，《${articleTitle}》 ${articleURL}）</p>`,
    `<p>未核。（2025年8月4日《<a href="${articleURL}">${articleTitle}</a>》）</p>`,
    `<p>未核。（爱潜水的乌贼，2025年8月4日《${articleTitle}》）</p>`,
    `<p><a href="${articleURL}" title="${articleSource}">普通相关文章</a></p>`,
  ]) {
    const view=createCharacterReferences({content});
    assert.equal(view.body,content);assert.equal(view.refs.length,0);
  }
});

test('author article title discards link decoration while preserving the title text',()=>{
  const view=createCharacterReferences({content:`<h2>历史</h2><p>晋升。（爱潜水的乌贼，2025年8月4日《<a target="_blank" href="${articleURL}"><em>${articleTitle}</em><span aria-hidden="true">↗</span><svg><title>外部链接</title></svg></a>》）</p>`});
  assert.equal(view.refs.length,1);assert.equal(view.refs[0].source,articleSource);
  assert.equal(withoutMarkers(view.body),'<h2>历史</h2><p>晋升。</p>');
});

test('infobox author source reuses the same complete article without rendering input HTML',()=>{
  const view=createCharacterReferences({content:`<p>完成。（${articleSource}）</p>`});
  const info=view.text('<script>unsafe</script>'+articleSource,'信息栏');
  assert.equal(view.refs.length,1);assert.equal(view.refs[0].backlinks.length,2);
  assert.ok(info.includes('&lt;script&gt;'));assert.ok(!info.includes('<script>'));
});

test('novel typography normalization never merges different article titles or qualifiers',()=>{
  const view=createCharacterReferences({content:''});
  for(const title of ['第一部 A','第一卷 A','第一部A'])view.cite(articleSource.replace(articleTitle,title)+'（限定范围）','范围');
  assert.equal(view.refs.length,3);
});
