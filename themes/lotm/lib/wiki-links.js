'use strict';
const {parseDocument}=require('htmlparser2');
const {textContent}=require('domutils');
const {isBriefEvent}=require('../../../tools/lib/event-presentation');
const summaryParts=require('./event-summary-parts');
const TYPES=['characters','events','artifacts','organizations','places','pathways','creatures','other'];
const normalize=p=>{try{return decodeURIComponent(p).replace(/^\/+/, '').replace(/index\.html$/, '').replace(/\/+$/, '');}catch{return null;}};
function category(p){
 const route=normalize(p.path)||'';
 if(p.character_profile)return 'characters';
 if(p.timeline_event)return 'events';
 if(route.startsWith('artifacts/entries/'))return 'artifacts';
 if(route.startsWith('worldview/organizations/'))return 'organizations';
 if(p.country_profile||/^worldview\/(countries|locations|geography)\//.test(route))return 'places';
 if(p.pathway_page)return 'pathways';
 if(p.creature_profile)return 'creatures';
 return 'other';
}
function eligible(p){
 const route=normalize(p.path)||'';
 return !p.draft&&!p.home&&!p.relationship_graph&&!p.timeline_view&&!['character_directory','artifact_directory','organization_directory','worldview_directory','power_overview'].some(k=>p[k])&&
  !p['sequence-name']&&Boolean(p.title)&&/^(characters\/entries|artifacts\/entries|creatures\/entries|worldview|timeline)\//.test(route)&&
  !/^(worldview|worldview\/(organizations|countries|pathways)|timeline)$/.test(route);
}
function contentLinks(html){
 const links=[];let excluded=false;
 function walk(nodes){for(const n of nodes||[]){
  const tag=n.name||'',a=n.attribs||{};
  if(/^h[12]$/.test(tag))excluded=/^(来源|出处|参考|待核|相关词条)/.test(textContent(n).trim());
  if(excluded)continue;
  if(['script','style','nav'].includes(tag)||/(?:^|\s)(?:headerlink|wiki-related|entry-sources|character-sources|pathway-references)(?:\s|$)/.test(a.class||''))continue;
  if(tag==='a'&&a.href&&!/^(?:返回|回到|上一篇|下一篇|上一个|下一个)/.test(textContent(n).trim()))links.push(a.href);
  walk(n.children);
 }}
 walk(parseDocument(String(html||'')).children);return links;
}
function buildWikiLinks(pages,config={}){
 const root='/'+String(config.root||new URL(config.url||'https://wiki.invalid').pathname||'/').replace(/^\/+|\/+$/g,'')+'/';
 const prefix=root==='//'?'/':root;
 const origin=new URL(config.url||'https://wiki.invalid').origin;
 const registry=new Map(),aliases=new Map(),eventAnchors=new Map(),issues=[];
 for(const p of pages.filter(eligible)){
  const key=normalize(p.path);const node={key,title:String(p.title),type:category(p),url:isBriefEvent(p)&&p.timeline_event?'timeline/#event-'+encodeURIComponent(p.event_anchor||p.title):p.path,order:Number(p.narrative_order),out:new Set(),in:new Set()};
  registry.set(key,node);aliases.set(key,key);
  if(p.timeline_event&&isBriefEvent(p))eventAnchors.set(String(p.event_anchor||p.title),key);
 }
 const parents=new Map(pages.filter(p=>p.pathway_page).map(p=>[p.title,normalize(p.path)]));
 const owner=p=>p['sequence-name']?parents.get(p.pathway):normalize(p.path);
 for(const p of pages.filter(p=>p['sequence-name'])){const key=owner(p);if(registry.has(key))aliases.set(normalize(p.path),key);}
 function resolve(href,p){
  if(!href||href.startsWith('#')||/^(?:mailto|tel|javascript|data):/i.test(href))return;
  let u;try{u=new URL(href,origin+prefix+String(p.path||''));}catch{return;}
  if(u.origin!==origin)return;
  let pathname=u.pathname;
  if(prefix!=='/'&&pathname.startsWith(prefix))pathname=pathname.slice(prefix.length);
  const route=normalize(pathname);if(route===null)return;
  if(route==='timeline'&&u.hash){try{return eventAnchors.get(decodeURIComponent(u.hash.slice(1).replace(/^event-/,'')));}catch{return;}}
  const key=aliases.get(route);
  if(key)return key;
  if(/^(characters\/entries|artifacts\/entries|creatures\/entries|worldview|timeline)\//.test(route)&&! /\.(?:png|jpe?g|svg|webp|gif|pdf|zip|mp3|mp4)$/i.test(route))issues.push({source:p.source||p.path,target:href});
 }
 for(const p of pages){
  const from=registry.get(owner(p));if(!from)continue;
  const hrefs=contentLinks(p.content);
  if(p.timeline_event)for(const part of summaryParts(p))if(part.target)hrefs.push('/'+prefix.replace(/^\//,'')+part.target);
  for(const href of hrefs){const to=registry.get(resolve(href,p));if(!to||to.key===from.key)continue;from.out.add(to.key);to.in.add(from.key);}
 }
 function related(p){
  const node=registry.get(owner(p));if(!node)return [];
  const groups=new Map(TYPES.map(t=>[t,[]]));
  for(const key of new Set([...node.out,...node.in])){const target=registry.get(key);groups.get(target.type).push({title:target.title,url:target.url,direction:node.out.has(key)?node.in.has(key)?'both':'out':'in',order:target.order});}
  return [...groups].filter(([,items])=>items.length).map(([type,items])=>({type,items:items.sort((a,b)=>type==='events'&&Number.isFinite(a.order)!==Number.isFinite(b.order)?Number.isFinite(a.order)?-1:1:type==='events'&&Number.isFinite(a.order)&&Number.isFinite(b.order)&&a.order!==b.order?a.order-b.order:a.title.localeCompare(b.title,'zh-CN'))}));
 }
 return {related,issues,registry};
}
module.exports={buildWikiLinks,contentLinks,category,normalize};
