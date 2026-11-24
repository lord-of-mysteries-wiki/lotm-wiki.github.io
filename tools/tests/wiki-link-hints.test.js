const {test}=require('node:test');
const assert=require('node:assert/strict');
const {describeLink}=require('../../source/js/wiki-link-hints');
const messages={internal:'打开：{title}',section:'本页：{title}',external:'外部：{title}（{host}）'};
const base='https://preview.invalid/lotm-wiki.github.io/characters/entries/甲/';
const site='https://wiki.invalid/lotm-wiki.github.io/';
test('relative Chinese paths and production URLs remain internal under deployment subpath',()=>{
 for(const href of ['../乙/','https://wiki.invalid/lotm-wiki.github.io/characters/entries/乙/']) {
  assert.deepEqual(describeLink(href,'乙',base,site,'',messages),{kind:'internal',hint:'打开：乙'});
 }
});
test('fragment hints use their actual heading; other-page fragments stay page links',()=>{
 assert.deepEqual(describeLink('#%E8%BA%AB%E4%BB%BD','资料',base,site,'身份与经历',messages),{kind:'section',hint:'本页：身份与经历'});
 assert.equal(describeLink('../乙/#身份','乙',base,site,'错误的本页标题',messages).hint,'打开：乙');
 assert.equal(describeLink('./index.html#身份','资料',base,site,'',messages).hint,'本页：身份');
});
test('external host is visible and non-web actions are not relabelled',()=>{
 assert.deepEqual(describeLink('https://author.invalid/article','作者原文',base,site,'',messages),{kind:'external',hint:'外部：作者原文（author.invalid）'});
 for(const href of ['#','mailto:test@example.com','tel:123','javascript:void(0)','data:text/plain,test','http://[invalid']) assert.equal(describeLink(href,'名称',base,site,'',messages),null);
});
