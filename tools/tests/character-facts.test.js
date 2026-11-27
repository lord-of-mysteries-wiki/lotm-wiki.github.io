const {test}=require('node:test');
const assert=require('node:assert/strict');
const {characterFactText,characterHasSection}=require('../../themes/lotm/lib/character-facts');
const {createCharacterReferences}=require('../../themes/lotm/lib/character-references');

test('project the existing labelled attribute rather than an unrelated introduction',()=>{
  const page={content:'<h2 id="身份">身份</h2><p>早期经历。</p><p><strong>职业：</strong>医生（自述，仅限早期身份）。</p><h2>其他</h2><p>后来的经历。</p>'};
  assert.equal(characterFactText(page,{label:'职业',source_section:'身份'}),'医生（自述，仅限早期身份）。');
  assert.equal(characterFactText({...page,content:page.content.replace('医生','教师')},{label:'职业',source_section:'身份'}),'教师（自述，仅限早期身份）。');
});
test('keep complete uncertainty and every attached citation without duplicating citation ids',()=>{
  const source='《诡秘之主》第一卷第9章；《宿命之环》第三卷第1章';
  const page={content:`<h2 id="国籍">国籍</h2><ul><li>国籍：鲁恩（推定，仅适用于当时身份）。见${source}。</li></ul>`};
  const value=characterFactText(page,{label:'国籍',source_section:'国籍'});
  assert.equal(value,`鲁恩（推定，仅适用于当时身份）。见${source}。`);
  const refs=createCharacterReferences(page),inline=refs.text(value,'信息栏：国籍');
  assert.equal(refs.refs.length,2);
  const ids=[...(refs.body+inline).matchAll(/id="(character-citation-[^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(inline.includes('鲁恩（推定，仅适用于当时身份）。'));
});
test('a long block is never truncated before a later qualification',()=>{
  const content='<h2>能力</h2><p>'+'很长的描述'.repeat(40)+'；仅为借用，尚未晋升。</p>';
  assert.equal(characterFactText({content},{label:'能力',source_section:'能力'}),'');
});
test('use the final complete block for outcomes and never cross section boundaries',()=>{
  const page={content:'<h2 id="末日">末日</h2><p>早期遭遇袭击。</p><p>结局不详，最后一次出现于海上。</p><h2>其他</h2><p>不是此项资料。</p>'};
  assert.equal(characterFactText(page,{label:'结局',source_section:'末日'}),'结局不详，最后一次出现于海上。');
  assert.equal(characterFactText(page,{label:'外貌',source_section:'不存在'}),'');
  assert.equal(characterFactText({content:'<h2>身份</h2><p>待核实。</p>'},{label:'身份',source_section:'身份'}),'');
});

test('nested life sections retain precise fact targets without taking the life introduction',()=>{
  const content='<h2>生平经历</h2><p>无关的早年经历。</p><h3 id="信使">信使与书信</h3><p>信使：一位灵界生物（仅限该时期）。</p><h4>后续</h4><p>后来解除契约。</p><h3>战斗</h3><p>无关的战斗。</p><h2>其他</h2><p>无关的现状。</p>';
  assert.equal(characterFactText({content},{label:'信使',source_section:'信使'}),'一位灵界生物（仅限该时期）。');
  assert.equal(characterFactText({content},{label:'状态',source_section:'信使与书信'}),'后来解除契约。');
  assert.ok(characterHasSection(content,'信使'));
  assert.ok(characterHasSection(content,'信使与书信'));
  assert.ok(!characterHasSection('<h2>生平</h2><h3 id="空">空</h3><h3>其他</h3><p>有内容。</p>','空'));
  assert.equal(characterFactText({content},{label:'身份',source_section:'不存在'}),'');
  const table='<h2>身份</h2><table><tr><td>阶段</td><td>旧身份（推定）</td></tr></table><h2>其他</h2><p>别的说明。</p>';
  assert.ok(characterHasSection(table,'身份'));
  assert.equal(characterFactText({content:table},{label:'身份',source_section:'身份'}),'');
});
