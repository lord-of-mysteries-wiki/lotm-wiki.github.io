const assert = require('node:assert/strict');
const {buildPathwayView,summarizeScopes} = require('../../themes/lotm/lib/pathway-view');
const citation = '<a href="https://mp.weixin.qq.com/s/example">作者，日期《原文》</a>（补充设定）。';
const sequence = n => ({'sequence-level':n,'sequence-name':'名称'+n,content:`<h2>概览</h2><p><strong>名称</strong>是序列。</p><p>古称保留。（来源：${citation}）</p><h2>魔药配方</h2><ul><li>材料：9克；可替代但不混用。</li></ul><h2>晋升仪式条件</h2><p>作者此篇未列出该序列的晋升仪式。</p><h2>来源与待补资料</h2><ul><li><strong>魔药配方、晋升仪式条件</strong>：${citation}</li></ul>`});
const v=buildPathwayView({content:'<h2>概览</h2><p>概览事实。</p>'},[sequence(9),sequence(8)]);
assert.ok(v.intro.includes('概览事实'));
assert.equal(v.references.filter(r=>r.html.includes('mp.weixin')).length,1);
assert.ok(v.sequences.every(s=>s.html.includes('9克；可替代但不混用') && s.html.includes('古称保留')));
assert.ok(v.references.some(r=>r.scopes.some(s=>/未列.*仪式/.test(s))));
assert.deepEqual(summarizeScopes(['序列9 甲：配方','序列8 乙：配方','序列6 丙：配方']),['序列9至8、6：配方']);
const novel=buildPathwayView({content:''},[{'sequence-level':3,'sequence-name':'古代学者',content:'<h2>能力</h2><p>有限制的能力。</p><p>来源：《诡秘之主》第四卷第204章，依据为人物联想。</p><h2>晋升仪式条件</h2><p>三百年。</p><p>来源：《诡秘之主》第五卷第108章。</p>'}]);
assert.equal(novel.references.length,2);assert.ok(novel.references[0].html.includes('依据为人物联想'));
console.log('pathway source scope, deduplication, qualifications and novel chapter separation: PASS');

const loose = buildPathwayView({content:''}, [{'sequence-level':9,'sequence-name':'占卜家',content:'<h2>来源与待补资料</h2><ul><li><p><strong>魔药配方</strong>：《诡秘之主》第一卷第31章。</p></li><li><p><strong>能力</strong>：《诡秘之主》第一卷第29章。</p></li></ul>'}]);
assert.ok(loose.references[0].scopes.includes('序列9：魔药配方'));
assert.equal(loose.references[0].html,'《诡秘之主》第一卷第31章。');

// Exercise the actual shared helper/filter and template, including escaped text.
{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const {createRequire}=require('node:module');
  const ejs=require('ejs');
  const scriptPath=path.resolve(__dirname,'../../themes/lotm/scripts/pathway-symbols.js');
  const helpers={},filters={};
  const fixtureHexo={source_dir:path.resolve(__dirname,'../../source'),extend:{helper:{register:(name,fn)=>{helpers[name]=fn;}},filter:{register:(name,fn)=>{filters[name]=fn;}}}};
  vm.runInNewContext(fs.readFileSync(scriptPath,'utf8'),{require:createRequire(scriptPath),hexo:fixtureHexo},{filename:scriptPath});
  const credit='诡秘之主小说官博，2022年11月1日途径硬币物料（帖号4830934497234199）';
  const page={title:'占卜家途径',pathway_page:true,pathway_symbol:'/images/pathways/占卜家.svg',pathway_symbol_source:credit};
  // Keep the fixture independent from which symbol filenames are used on disk.
  page.pathway_symbol=require('hexo-front-matter').parse(fs.readFileSync(path.resolve(__dirname,'../../source/worldview/pathways/占卜家途径/占卜家途径.md'),'utf8')).pathway_symbol;
  assert.equal(helpers.pathway_symbol_source(page),credit);
  assert.ok(helpers.pathway_symbol(page).includes('class="pathway-symbol"'));
  assert.doesNotThrow(()=>filters.before_generate.call({locals:{get:()=>({toArray:()=>[page]})},source_dir:fixtureHexo.source_dir}));
  for(const invalid of [undefined,null,42,'','   ','https://m.weibo.cn/detail/4830934497234199','官博 https://example.com/post','javascript:alert(1)','m.weibo.cn/detail/4830934497234199','原帖\n出处']) {
    assert.throws(()=>helpers.pathway_symbol({...page,pathway_symbol_source:invalid}),/出处必须为非空纯文字/);
  }
  assert.equal(helpers.pathway_symbol_source({title:'无标志途径'}),'');
  const template=fs.readFileSync(path.resolve(__dirname,'../../themes/lotm/layout/_partials/pathway-page.ejs'),'utf8');
  const render=source=>ejs.render(template,{page:{...page,pathway_symbol_source:source},...helpers,pathway_view:()=>({sequences:[],intro:'',tail:'',references:[]}),partial:()=>'',__:key=>key});
  const rendered=render(credit);
  assert.ok(rendered.includes(credit));
  assert.ok(!rendered.includes('weibo.cn'));
  const {parseDocument}=require('htmlparser2'),{findAll,getText}=require('domutils');
  const creditNodes=html=>findAll(n=>n.type==='tag'&&n.attribs.class==='pathway-symbol-credit',parseDocument(html).children);
  assert.equal(creditNodes(rendered).length,1);
  assert.equal(findAll(n=>n.type==='tag'&&n.name==='a',creditNodes(rendered)[0].children).length,0);
  const literal='小说官博 <script>alert("x")</script> & “标识” （帖号4830934497234199）';
  const escaped=render(literal);
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(!escaped.includes('<script>'));
  assert.ok(getText(creditNodes(escaped)[0]).endsWith(literal));
  assert.throws(()=>render('https://m.weibo.cn/detail/4830934497234199'),/出处必须为非空纯文字/);
  console.log('pathway symbol plain provenance, link rejection and template escaping: PASS');
}
