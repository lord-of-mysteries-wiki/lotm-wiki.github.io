const fs=require('fs'),path=require('path'),fm=require('hexo-front-matter');
const {parseDocument}=require('htmlparser2');
const {findAll,getText}=require('domutils');
const assert=require('assert/strict');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]);
const nodes=html=>findAll(n=>n.type==='tag',parseDocument(html).children);
const map = {};
for (const p of files('source/worldview/pathways').filter(p=>/序列[0-9]-.*\.md$/.test(p))) {
  const data=fm.parse(fs.readFileSync(p,'utf8'));
  map[p.slice(7).replace(/\.md$/,'.html')]=data;
}
let pages=0,links=0,chapters=0;
for(const dir of fs.readdirSync('source/worldview/pathways',{withFileTypes:true}).filter(d=>d.isDirectory())){
 const base='worldview/pathways/'+dir.name,src=fm.parse(fs.readFileSync('source/'+base+'/'+dir.name+'.md','utf8'));
 assert.equal(src.pathway_page,true);pages++;
 assert.ok(!fs.readFileSync('source/'+base+'/'+dir.name+'.md','utf8').includes('fandom.com'),base+' secondhand source');
 const html=fs.readFileSync('public/'+base+'/'+dir.name+'.html','utf8'),els=nodes(html),ids=els.filter(n=>n.attribs.id).map(n=>n.attribs.id);
 assert.equal(ids.length,new Set(ids).size,base+' duplicate IDs');
 for(let n=0;n<10;n++){assert.ok(ids.includes('sequence-'+n),base+' '+n);chapters++;}
 assert.ok(!html.includes('http-equiv="refresh"'),base+' unexpected redirect');
 for(const seq of fs.readdirSync('source/'+base).filter(f=>/^序列\d-.*\.md$/.test(f))){
  assert.ok(!fs.existsSync('public/'+base+'/'+seq.replace('.md','.html')));
  const s=fs.readFileSync('source/'+base+'/'+seq,'utf8');
  assert.ok(!s.includes('fandom.com'),seq+' secondhand source');
  for(const m of s.matchAll(/https:\/\/mp\.weixin\.qq\.com\/s\/[^)\s]+/g))assert.ok(html.includes(m[0]),base+' lost source '+m[0]);
 }
 const ref=els.filter(n=>n.name==='li' && /^pathway-source-/.test(n.attribs.id||''));
 const authorUrls=ref.flatMap(n=>findAll(x=>x.type==='tag' && x.name==='a',n.children).map(x=>x.attribs.href).filter(x=>x.includes('mp.weixin')));
 assert.equal(authorUrls.length,new Set(authorUrls).size,base+' duplicate author article');
}
for(const file of files('public').filter(p=>p.endsWith('.html'))){
 for(const a of nodes(fs.readFileSync(file,'utf8')).filter(n=>n.name==='a' && n.attribs.href)){
  const u=new URL(a.attribs.href,'https://local.invalid/'+file.replace(/^public\//,'lotm-wiki.github.io/'));
  if(u.host!=='local.invalid')continue;
  const dest=decodeURIComponent(u.pathname).replace(/^\/lotm-wiki.github.io\//,'');
  assert.ok(!Object.hasOwn(map,dest),file+' retired link '+a.attribs.href);
  if(/^worldview\/pathways\//.test(dest)&&u.hash){
   const target=path.join('public',dest);assert.ok(fs.existsSync(target),target);
   assert.ok(nodes(fs.readFileSync(target,'utf8')).some(n=>n.attribs.id===decodeURIComponent(u.hash.slice(1))),file+' bad anchor '+a.attribs.href);links++;
  }
 }
}
// Catch rendering failures that Hexo may log without failing the process.
const symbolEntries=files('source/worldview/pathways').filter(p=>p.endsWith('.md')).map(p=>fm.parse(fs.readFileSync(p,'utf8'))).filter(p=>p.pathway_page&&p.pathway_symbol);
const overview=nodes(fs.readFileSync('public/worldview/pathways/index.html','utf8'));
assert.equal(overview.filter(n=>n.name==='td'&&n.attribs.class==='pathway-symbol-cell').length,symbolEntries.length,'missing overview symbol cells');
assert.equal(overview.filter(n=>n.name==='svg'&&n.attribs.class==='pathway-symbol').length,symbolEntries.length,'missing overview vector symbols');
for(const entry of symbolEntries){
 const html=fs.readFileSync(path.join('public/worldview/pathways',entry.title,entry.title+'.html'),'utf8');
 assert.equal(nodes(html).filter(n=>n.name==='svg'&&n.attribs.class==='pathway-symbol').length,1,entry.title+' symbol');
 const credits=nodes(html).filter(n=>n.name==='p'&&n.attribs.class==='pathway-symbol-credit');
 assert.equal(credits.length,1,entry.title+' symbol credit');
 assert.ok(typeof entry.pathway_symbol_source==='string'&&entry.pathway_symbol_source.trim(),entry.title+' missing symbol provenance');
 assert.ok(!/https?:\/\//i.test(entry.pathway_symbol_source),entry.title+' linked symbol provenance');
 assert.ok(getText(credits[0]).endsWith('：'+entry.pathway_symbol_source.trim()),entry.title+' changed symbol provenance');
 assert.equal(findAll(n=>n.type==='tag'&&n.name==='a',credits[0].children).length,0,entry.title+' symbol credit must not regenerate links');
}
console.log('PASS:',pages,'single pathway pages;',chapters,'chapters; no retired routes or links;',links,'pathway anchors; author citations deduplicated and retained');
