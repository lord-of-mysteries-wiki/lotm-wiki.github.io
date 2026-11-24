'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseDocument}=require('htmlparser2');
const {load}=require('js-yaml');
const config=load(fs.readFileSync('_config.yml','utf8'));
const root='/'+String(config.root||new URL(config.url).pathname||'/').replace(/^\/+|\/+$/g,'')+'/';
const prefix=root==='//'?'/':root;
const origin=new URL(config.url).origin;
const cache=new Map();let pages=0,links=0;
function html(file){if(!cache.has(file))cache.set(file,fs.readFileSync(file,'utf8'));return cache.get(file);}
function nodes(list,predicate){const found=[];for(const n of list||[]){if(predicate(n))found.push(n);found.push(...nodes(n.children,predicate));}return found;}
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);if(item.isDirectory()){visit(file);continue;}if(!item.name.endsWith('.html'))continue;
 const dom=parseDocument(html(file));
 const regions=nodes(dom.children,n=>(n.attribs?.class||'').split(/\s+/).includes('wiki-related'));
 assert.ok(regions.length<=1,file+' duplicate related regions');if(!regions.length)continue;pages++;
 const targets=new Set();
 for(const anchor of nodes(regions[0].children,n=>n.name==='a')){
  const href=anchor.attribs.href,u=new URL(href,origin+prefix+path.relative('public',file));
  assert.equal(u.origin,origin,file+' external related link');assert.ok(u.pathname.startsWith(prefix),file+' deployment root');
  const route=decodeURIComponent(u.pathname.slice(prefix.length));
  const target=path.resolve('public',route,u.pathname.endsWith('/')?'index.html':'');
  assert.ok(target.startsWith(path.resolve('public')+path.sep),file+' escaped output directory');
  assert.ok(fs.existsSync(target),file+' missing target '+href);
  if(u.hash)assert.ok(html(target).includes('id="'+decodeURIComponent(u.hash.slice(1))+'"'),file+' missing anchor '+href);
  const key=u.pathname.replace(/index\.html$/,'').replace(/\/$/,'')+(route==='timeline/'||route==='timeline/index.html'?u.hash:'');assert.ok(!targets.has(key),file+' duplicate related target '+href);targets.add(key);links++;
 }
}}
visit('public');console.log(`分类双链生成校验通过：${pages} 个详情页、${links} 个关联链接与锚点，无重复关联区或无效目标。`);
