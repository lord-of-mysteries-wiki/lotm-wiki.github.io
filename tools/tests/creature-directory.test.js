const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ejs=require('ejs');
test('creature directory uses marked pages and deployment prefix, escapes titles',()=>{
  const pages=[
    {title:'普通页',path:'worldview/other.html'},
    {title:'生物10',path:'creatures/entries/十/',creature_profile:true},
    {title:'生物2',path:'creatures/entries/二/',creature_profile:true},
    {title:'<别名>',path:'creatures/entries/别名/',creature_profile:true}
  ];
  const html=ejs.render(fs.readFileSync(path.join(__dirname,'../../themes/lotm/layout/_partials/creature-cards.ejs'),'utf8'),{
    site:{pages:{toArray:()=>pages}},url_for:route=>'/lotm-wiki.github.io/'+route
  });
  assert.equal((html.match(/<a /g)||[]).length,3);
  assert.ok(!html.includes('普通页'));
  assert.ok(html.indexOf('生物2')<html.indexOf('生物10'));
  assert.ok(html.includes('&lt;别名&gt;'));
  assert.ok(html.includes('/lotm-wiki.github.io/creatures/entries/二/'));
  assert.equal(pages[0].title,'普通页');
});
