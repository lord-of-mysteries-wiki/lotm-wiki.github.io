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
