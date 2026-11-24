'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseDocument,DomUtils}=require('htmlparser2');
const {selectEntries}=require('./lib/catalog');
const classes=(node,name)=>(node.attribs?.class||'').split(/\s+/).includes(name);
let pages=0,links=0;
for(const owner of ['worldview','characters','artifacts']){
 const data=JSON.parse(fs.readFileSync('public/catalog-data/'+owner+'.json','utf8'));
 const expected=new Map([[data.path,{count:data.entries.length}]]);
 for(const branch of data.branches){expected.set(branch.path,{count:selectEntries(data,branch.id).length});for(const group of branch.groups)expected.set(group.path,{count:selectEntries(data,branch.id,group.id).length});}
 for(const [route,view]of expected){
  const file=path.join('public',route,'index.html'),html=fs.readFileSync(file,'utf8'),dom=parseDocument(html);
  assert.ok(html.includes('/css/character-profile.css'),file+' missing shared card styles');
  const main=DomUtils.findOne(n=>classes(n,'catalog-directory'),dom.children,true);assert.ok(main,file);
  const results=DomUtils.findOne(n=>n.attribs?.['data-catalog-results']!==undefined,main.children,true);
  const entries=DomUtils.findAll(n=>n.name==='a',results.children);assert.equal(entries.length,view.count,file+' must show all entries without pagination');
  const targets=new Set();for(const a of entries){const href=a.attribs.href,u=new URL(href,'https://wiki.invalid/lotm-wiki.github.io/'+route);assert.ok(u.pathname.startsWith('/lotm-wiki.github.io/'),file);const target=decodeURIComponent(u.pathname.slice('/lotm-wiki.github.io/'.length));assert.ok(!targets.has(target),file+' duplicate entry');targets.add(target);assert.ok(fs.existsSync(path.join('public',target,u.pathname.endsWith('/')?'index.html':'')),file+' invalid '+href);assert.ok(u.searchParams.has('from'),file+' missing return context');links++;}
  const nav=DomUtils.findOne(n=>n.attribs?.['data-catalog-navigation']!==undefined,dom.children,true);assert.ok(nav,file);const active=DomUtils.findAll(n=>n.name==='a'&&n.attribs?.['aria-current']==='page',nav.children);assert.equal(active.length,owner==='characters'?0:1,file+' active tab');if(owner==='characters'){assert.ok(Object.hasOwn(nav.attribs,'hidden'),file+' duplicate character navigation');const heading=DomUtils.findOne(n=>n.name==='h1',main.children,true);assert.equal(DomUtils.textContent(heading),data.title,file+' shared character heading');assert.equal(DomUtils.findAll(n=>n.attribs?.['data-catalog-work-filter']!==undefined,main.children).length,3,file+' shared work filters');assert.equal(DomUtils.findAll(n=>n.name==='button'&&(n.attribs?.['data-catalog-sort']!==undefined||n.attribs?.['data-catalog-view']!==undefined),main.children).length,4,file+' original character button group');}
  assert.ok(!html.includes('data-catalog-pagination'),file+' pagination was removed');pages++;
 }
}
console.log(`目录生成校验通过：${pages} 个目录页、${links} 个正式词条链接，当前分类全部列出、无分页、无重复词条，返回上下文及子路径有效。`);
