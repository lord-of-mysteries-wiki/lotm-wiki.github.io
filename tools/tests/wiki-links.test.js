'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildWikiLinks,contentLinks}=require('../../themes/lotm/lib/wiki-links');
const config={url:'https://example.org',root:'/lotm-wiki.github.io/'};
const page=(path,content='',more={})=>({path,title:path,content,...more});
const a=()=>page('characters/entries/甲/index.html','',{character_profile:true});
const b=()=>page('artifacts/entries/乙/index.html');
test('merge both directions, duplicates, and remove an edge on rebuild',()=>{
 const x=a(),y=b();x.content='<p><a href="../../../artifacts/entries/乙/">乙</a><a href="https://example.org/lotm-wiki.github.io/artifacts/entries/%E4%B9%99/index.html#能力">乙</a></p>';y.content='<a href="../../../characters/entries/甲/">甲</a>';
 let index=buildWikiLinks([x,y],config);assert.equal(index.related(x)[0].items.length,1);assert.equal(index.related(x)[0].items[0].direction,'both');
 x.content='';index=buildWikiLinks([x,y],config);assert.equal(index.related(x)[0].items[0].direction,'in');y.content='';assert.deepEqual(buildWikiLinks([x,y],config).related(x),[]);
});
test('exclude navigation, sources, returns, self, assets and outside domains',()=>{
 const x=a(),y=b();x.content='<nav><a href="../../../artifacts/entries/乙/">乙</a></nav><a href="#经历">经历</a><a href="https://outside.org/artifacts/entries/乙/">外部</a><a href="../../../artifacts/entries/乙/">返回乙</a><h2>来源</h2><a href="../../../artifacts/entries/乙/">乙</a>';
 assert.deepEqual(buildWikiLinks([x,y],config).related(x),[]);
 assert.deepEqual(contentLinks('<h2>来源</h2><a href="a">a</a><h2>能力</h2><a href="b">b</a>'),['b']);
});
test('reviewed event summary resolves overlaps and brief events use timeline anchors',()=>{
 const x=a(),e=page('timeline/简记/index.html','',{title:'简记',timeline_event:true,event_display:'brief',event_anchor:'事件一',event_summary:'甲乙',event_summary_links:[{text:'甲乙',target:'characters/entries/甲/'},{text:'乙',target:'artifacts/entries/乙/'}],narrative_order:2});
 const index=buildWikiLinks([x,b(),e],config);const item=index.related(x)[0].items[0];assert.equal(item.url,'timeline/#event-'+encodeURIComponent('事件一'));assert.equal(item.direction,'in');assert.deepEqual(index.related(b()),[]);
 x.content='<a href="../../../timeline/#event-'+encodeURIComponent('事件一')+'">事件</a>';assert.equal(buildWikiLinks([x,b(),e],config).related(x)[0].items[0].direction,'both');
});
test('sequence source belongs to pathway and repeated section links collapse to parent',()=>{
 const x=a(),parent=page('worldview/pathways/途径/途径.html','',{title:'途径',pathway_page:true}),s=page('worldview/pathways/途径/序列1.html','<a href="../../../characters/entries/甲/">甲</a>',{pathway:'途径','sequence-name':'序列1'});
 x.content='<a href="../../../worldview/pathways/途径/途径.html#sequence-1">序列</a><a href="../../../worldview/pathways/途径/途径.html#sequence-2">序列</a>';
 const index=buildWikiLinks([x,parent,s],config);assert.equal(index.related(x)[0].items[0].direction,'both');assert.equal(index.related(x)[0].items.length,1);
});
test('unresolved wiki links report origin without manufacturing a node',()=>{
 const x=a();x.content='<a href="../../../artifacts/entries/不存在/">无效</a>';const index=buildWikiLinks([x],config);assert.equal(index.issues.length,1);assert.equal(index.issues[0].source,x.path);assert.deepEqual(index.related(x),[]);
});
test('directories are excluded and event ordering uses narrative order',()=>{
 const x=a(),directory=page('worldview/topics/index.html','<a href="../../characters/entries/甲/">甲</a>',{worldview_directory:true});
 const events=[9,2].map(n=>page(`timeline/e${n}/index.html`,'',{timeline_event:true,narrative_order:n,title:'事件'+n}));
 x.content=events.map(e=>`<a href="../../../${e.path}">事件</a>`).join('');
 const index=buildWikiLinks([x,directory,...events],config);assert.equal(index.registry.has('worldview/topics'),false);assert.deepEqual(index.related(x)[0].items.map(i=>i.title),['事件2','事件9']);
});
test('related template shows all rows and escapes titles',()=>{
 const fs=require('fs'),ejs=require('ejs');
 const template=fs.readFileSync('themes/lotm/layout/_partials/wiki-related.ejs','utf8');
 const html=ejs.render(template,{page:{},wiki_related:()=>[{type:'characters',items:Array.from({length:10},(_,n)=>({title:n===0?'<script>':'人物'+n,url:'characters/entries/'+n+'/',direction:'in'}))}],url_for:x=>'/lotm-wiki.github.io'+x,__:(key)=>key});
 assert.ok(html.includes('&lt;script&gt;'));assert.equal((html.match(/<li>/g)||[]).length,10);assert.ok(!html.includes('<details'));
 assert.equal(ejs.render(template,{page:{},wiki_related:()=>[]}).trim(),'');
});
test('generated checker rejects missing targets, missing anchors and duplicate entries',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wiki-links-check-'));
 try{
  fs.writeFileSync(path.join(dir,'_config.yml'),'url: https://example.org/lotm-wiki.github.io/\n');fs.mkdirSync(path.join(dir,'public'));
  const link='<a href="/lotm-wiki.github.io/target.html#exists">目标</a>';
  const write=body=>fs.writeFileSync(path.join(dir,'public/index.html'),'<section class="wiki-related">'+body+'</section>');
  const check=()=>spawnSync(process.execPath,[path.resolve('tools/check-related-pages.js')],{cwd:dir,encoding:'utf8'});
  write(link);assert.notEqual(check().status,0);
  fs.writeFileSync(path.join(dir,'public/target.html'),'<p>无锚点</p>');assert.notEqual(check().status,0);
  fs.writeFileSync(path.join(dir,'public/target.html'),'<h2 id="exists">目标</h2>');assert.equal(check().status,0);
  write(link+link);assert.notEqual(check().status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
