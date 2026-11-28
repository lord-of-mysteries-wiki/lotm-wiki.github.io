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
test('complete author records share identity across space and colon separators',()=>{
  const prefix=`爱潜水的乌贼，2025年8月4日《${articleTitle}》`;
  const view=createCharacterReferences({content:`<h2>身份</h2><p>别名。（爱潜水的乌贼，2025年8月4日《<a href="${articleURL}">${articleTitle}</a>》）</p>`});
  for(const separator of [' ',':','：',' ： '])view.cite(prefix+separator+articleURL,'晋升');
  assert.equal(view.refs.length,1);
  assert.deepEqual([...view.refs[0].scopes],['身份','晋升']);
  assert.equal(view.refs[0].source,articleSource);
  assert.equal(withoutMarkers(view.body),'<h2>身份</h2><p>别名。</p>');
  view.cite(prefix+'：'+articleURL+'（仅说明出生时材料）','限定');
  assert.equal(view.refs.length,2);
  assert.ok(view.refs[1].source.includes('仅说明出生时材料'));
});

test('compact author labels require the complete record and preserve following restrictions',()=>{
  const {shortCharacterSource}=require('../../themes/lotm/lib/character-references');
  const prefix=`爱潜水的乌贼，2025年8月4日《${articleTitle}》`;
  for(const separator of [' ',':','：']){
    assert.equal(shortCharacterSource(prefix+separator+articleURL),'作者补充（2025年8月4日）');
    assert.equal(shortCharacterSource(prefix+separator+articleURL+'；仅说明出生时材料'),'作者补充（2025年8月4日）；仅说明出生时材料');
  }
  assert.equal(shortCharacterSource(prefix),prefix);
  assert.equal(shortCharacterSource(articleURL),articleURL);
});
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

test('authored character bibliography moves to shared sources with its explicit support scopes',()=>{
  const source='《宿命之环》第七卷第23章';
  const content=`<p>导语。（${source}）</p><h2>身份与信仰</h2><p>属性（自述）。</p><h2>生平经历</h2><p>经历。</p><h2>来源</h2><ul><li><strong>身份与信仰、生平经历</strong>：${source}。</li></ul>`;
  const view=createCharacterReferences({character_profile:true,content});
  assert.equal(view.refs.length,1);
  assert.deepEqual([...view.refs[0].scopes],['人物资料','身份与信仰、生平经历']);
  assert.ok(!view.body.includes('<h2>来源</h2>'));
  assert.ok(!view.body.includes('身份与信仰、生平经历</strong>：'));
  assert.ok(view.body.includes('属性（自述）。'));
  // Other entry types retain their own existing source-section processing.
  assert.ok(createCharacterReferences({content}).body.includes('<h2>来源</h2>'));
});

test('character bibliography preserves author links, unknown sources and local restrictions',()=>{
  const view=createCharacterReferences({character_profile:true,content:`<h2>来源</h2><ul><li><strong>第四纪阶段</strong>：爱潜水的乌贼，2025年8月4日《<a href="${articleURL}">${articleTitle}</a>》。</li><li><strong>转述范围</strong>：作者访谈<a href="https://example.com/transcript">原始记录</a>；仅为当事人自述。</li><li><strong>出生阶段</strong>：${articleSource}（仅说明出生时材料）。</li></ul>`});
  view.cite(articleSource,'晋升');
  const article=view.refs.find(ref=>ref.source===articleSource);
  assert.ok(article);
  assert.deepEqual([...article.scopes],['第四纪阶段','晋升']);
  assert.ok(view.refs.some(ref=>ref.source.includes('[原始记录](https://example.com/transcript)')&&ref.source.includes('仅为当事人自述')));
  assert.ok(view.refs.some(ref=>ref.source.includes('仅说明出生时材料')));
  assert.ok(view.sourceHTML(view.refs.find(ref=>ref.source.includes('原始记录')).source).includes('href="https://example.com/transcript"'));
  const unknown='<h2>来源</h2><h3>旧档案图</h3><img src="archive.png" alt="未识别原始书目">';
  assert.equal(createCharacterReferences({character_profile:true,content:unknown}).body,unknown);
});

test('nested bibliography scopes and internal links survive while unsupported table HTML stays authored',()=>{
  const table='<table><tr><td>无法识别的原始书目</td><td><a href="../档案/">档案</a></td></tr></table>';
  const content=`<h2 id="sources">来源</h2><ul><li><strong>早年</strong>：记录<a href="../人物/">人物档案</a>（自述）。<ul><li><strong>家人</strong>：原始访谈<a href="https://example.com/raw">原链接</a>，仅支持童年。</li></ul></li></ul><h3>手写档案表</h3>${table}<h2>后续</h2><p>后续事实。</p>`;
  const view=createCharacterReferences({character_profile:true,content});
  assert.ok(view.refs.some(ref=>ref.scopes.has('早年')&&ref.source.includes('自述')&&!ref.source.includes('仅支持童年')));
  assert.ok(view.refs.some(ref=>ref.scopes.has('早年：家人')&&ref.source.includes('仅支持童年')));
  const rendered=view.refs.map(ref=>view.sourceHTML(ref.source)).join('');
  assert.ok(rendered.includes('<a href="../人物/">人物档案</a>'));
  assert.ok(rendered.includes('<a href="https://example.com/raw">原链接</a>'));
  assert.ok(view.body.includes('<h3>手写档案表</h3>'+table));
  assert.ok(view.body.endsWith('<h2>后续</h2><p>后续事实。</p>'));
  assert.ok(!view.sourceHTML('[恶意](javascript:alert(1))').includes('<a'));
  const nested=`<h2>来源</h2><ul><li><strong>未知表格</strong>：${table}</li></ul>`;
  assert.equal(createCharacterReferences({character_profile:true,content:nested}).body,nested);
  const unknown='<h2>来源</h2><p><a href="mailto:archive@example.com">邮件存档</a>；条件不详。</p>';
  assert.equal(createCharacterReferences({character_profile:true,content:unknown}).body,unknown);
  const note='<h2>来源</h2><p>此处的计划尚未实行，年份不详。</p>';
  const retained=createCharacterReferences({character_profile:true,content:note});
  assert.equal(retained.body,note);assert.equal(retained.refs.length,0);
  const nestedOnly='<h2>来源</h2><ul><li><ul><li><strong>童年</strong>：未识别的访谈原记录（自述）。</li></ul></li></ul>';
  assert.ok(createCharacterReferences({character_profile:true,content:nestedOnly}).refs.some(ref=>ref.scopes.has('童年')&&ref.source.includes('自述')));
  const group='<h2>来源</h2><ul><li><strong>早年</strong>：<ul><li>未识别的访谈原记录（自述）。</li></ul></li></ul>';
  const grouped=createCharacterReferences({character_profile:true,content:group});
  assert.ok(grouped.refs.some(ref=>ref.scopes.has('早年')&&ref.source.includes('自述')));
  assert.equal(grouped.body,'');
  assert.equal(view.sourceHTML('[当地档案](archive.html#early)'),'<a href="archive.html#early">当地档案</a>');
});

test('real bibliography profiles have one shared list and retain their authored ranges',()=>{
  const fs=require('node:fs'),{marked}=require('marked');
  for(const [name,scope] of [['“凝聚态”','身份与信仰、生平经历'],['西蒙','开篇、特里尔经历、身份与国籍']]) {
    const text=fs.readFileSync(`source/characters/entries/${name}.md`,'utf8');
    const content=marked.parse(text.replace(/^---\n[\s\S]*?\n---\n/,''));
    const view=createCharacterReferences({character_profile:true,content});
    assert.ok(!/<h2[^>]*>来源<\/h2>/.test(view.body),name);
    assert.ok(view.refs.some(ref=>ref.scopes.has(scope)),name);
    assert.ok(view.refs.every(ref=>!ref.scopes.has('来源')),name);
  }
});

test('an author article followed immediately by its locator retains the original URL',()=>{
  const url='https://mp.weixin.qq.com/s/wW__8avKqix8HeFELLEkaw';
  const content=`<h2>来源</h2><ul><li><strong>成神时期</strong>：爱潜水的乌贼，2025年4月7日《<a href="${url}">诡秘世界简略的历史年表</a>》第四纪四皇之战段。作者订正为四皇之战后期；战后成神为传闻。</li></ul>`;
  const view=createCharacterReferences({character_profile:true,content});
  const rendered=view.refs.map(ref=>view.sourceHTML(ref.source)).join('');
  assert.ok(rendered.includes(`href="${url}"`));
  assert.ok(!rendered.includes(`href="${url}第四纪`));
  assert.ok(rendered.includes('第四纪四皇之战段'));
  assert.ok(rendered.includes('作者订正为四皇之战后期'));
  assert.ok(rendered.includes('战后成神为传闻'));
});
