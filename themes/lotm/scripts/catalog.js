'use strict';
const fs=require('node:fs'),path=require('node:path'),yaml=require('js-yaml');
const {buildCatalog,contextFor,selectEntries}=require('../../../tools/lib/catalog');
const {loadModel}=require('../../../tools/lib/content-model');
let catalog,labels;
function get(){
 if(!catalog){
  const language=String(hexo.config.language).startsWith('en')?'en':'zh-CN';
  labels=yaml.load(fs.readFileSync(path.join(hexo.theme_dir,'languages',language+'.yml'),'utf8'));
  catalog=buildCatalog(hexo.locals.get('pages').toArray(),loadModel().directory);
  for(const entry of catalog.worldview.entries){
   const history=entry.history;
   if(!history?.kind)continue;
   const era=labels.catalog_history_era.replace('{era}',history.era);
   const basis=[era,history.date?.replace(/^0+(?=\d)/,''),history.eventTitle].filter(Boolean).join(' · ');
   entry.historyHint=labels['catalog_history_'+history.kind]+basis;
  }
 }
 return catalog;
}
function label(item){get();return item.label||labels[item.key]||item.id||'';}
function branchFor(view){return get()[view.owner].branches.find(branch=>branch.id===view.branch);}
function selection(view){const section=get()[view.owner],branch=branchFor(view),group=branch?.groups.find(g=>g.id===view.group);const overview=view.branch==='overview';const items=selectEntries(section,overview?'all':view.branch,view.group||'');if(section.id==='characters'&&view.branch==='all')items.sort((a,b)=>b.mentions-a.mentions||a.title.localeCompare(b.title,'zh-CN'));if(section.id==='artifacts')items.sort((a,b)=>(a.numberOrder??Infinity)-(b.numberOrder??Infinity)||a.title.localeCompare(b.title,'zh-CN'));return {section,branch,group,overview,items,count:items.length,base:group?.path||branch?.path||section.path};}
hexo.extend.filter.register('before_generate',()=>{catalog=labels=undefined;});
hexo.extend.helper.register('catalog_context',page=>contextFor(page,get()));
hexo.extend.helper.register('catalog_section',owner=>get()[owner]);
hexo.extend.helper.register('catalog_label',label);
hexo.extend.helper.register('catalog_selection',selection);
hexo.extend.generator.register('catalog-directories',function(){
 const data=get(),routes=[],existing=new Set(this.locals.get('pages').toArray().map(page=>page.path.replace(/index\.html$/,'')));
 function add(base,view,title){if(!existing.has(base))routes.push({path:base+'index.html',layout:['index'],data:{title,path:base,catalog_view:{...view,directory:true},content:''}});}
 for(const section of Object.values(data)){
  const payload={...section,title:label(section),branches:section.branches.map(branch=>({...branch,title:label(branch),groups:branch.groups.map(group=>({...group,title:label(group)}))})),text:Object.fromEntries(Object.entries(labels).filter(([key])=>key.startsWith('catalog_')))};
  if(section.overviewGroups)payload.overviewGroups=section.overviewGroups.map(group=>({...group,title:label(group)}));
  routes.push({path:'catalog-data/'+section.id+'.json',data:JSON.stringify(payload)});
  for(const branch of section.branches){
   add(branch.path,{owner:section.id,branch:branch.id},label(branch));
   for(const group of branch.groups)add(group.path,{owner:section.id,branch:branch.id,group:group.id},label(group));
  }
 }
 return routes;
});
