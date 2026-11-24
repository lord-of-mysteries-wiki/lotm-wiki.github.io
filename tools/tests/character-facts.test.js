const {test}=require('node:test');
const assert=require('node:assert/strict');
const {characterFactText}=require('../../themes/lotm/lib/character-facts');
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
