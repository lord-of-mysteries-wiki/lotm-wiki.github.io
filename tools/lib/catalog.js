'use strict';
const crypto=require('node:crypto');
const definitions={
 worldview:{path:'worldview/',key:'catalog_worldview',branches:[
  {id:'history',key:'catalog_history',groups:['eras','structure','concepts','topics']},
  {id:'countries',key:'catalog_countries',groups:['states','regions']},
  {id:'organizations',key:'catalog_organizations',groups:['churches','families','institutions','societies']},
  {id:'creatures',key:'catalog_creatures',groups:['spirit','dragons','others']}
 ]},
 characters:{path:'characters/',key:'catalog_characters',branches:[
  {id:'all',key:'catalog_all_characters'}, {id:'organizations',key:'catalog_by_organization'}, {id:'pathways',key:'catalog_by_pathway'}
 ]},
 artifacts:{path:'artifacts/',key:'catalog_artifacts',branches:[
  {id:'sealed',key:'catalog_sealed',groups:['0','1','2','3','unnumbered']},
  {id:'materials',key:'catalog_materials',groups:['characteristics','materials']},
  {id:'equipment',key:'catalog_equipment',groups:['weapons','accessories','transport']},
  {id:'consumables',key:'catalog_consumables',groups:['charms','preparations']},
  {id:'texts',key:'catalog_texts',groups:['documents','other']}
 ]}
};
const allowed=new Set(Object.entries(definitions).flatMap(([owner,section])=>section.branches.flatMap(branch=>branch.groups?.map(group=>owner+'/'+branch.id+'/'+group)||[])));
for(const group of ['0','1','2','3','unnumbered'])allowed.delete('artifacts/sealed/'+group);
allowed.add('artifacts/sealed');
const pathOf=p=>String(p.path||p.permalink||String(p.source||'').replace(/\.md$/,'/')).replace(/^source\//,'').replace(/^\//,'');
function validateCatalogPage(p) {
 const groups=p.catalog_groups;
 if((p.worldview_directory||p.character_directory||p.artifact_directory) && String(p._content||'').trim())throw Error('目录入口只维护元数据，不得恢复手工词条清单: '+p.source);
 if(groups!==undefined && (!Array.isArray(groups)||new Set(groups).size!==groups.length||groups.some(g=>!allowed.has(g))))throw Error('无效或重复的目录分类: '+p.source);
 if(p.character_profile && groups!==undefined)throw Error('人物目录分类只能从作品、组织和途径主资料生成: '+p.source);
 if(/^artifacts\/entries\//.test(pathOf(p)) && !groups?.length)throw Error('物品缺少主资料目录分类: '+p.source);
 const owner=p.character_profile?'characters':/^artifacts\/entries\//.test(pathOf(p))?'artifacts':'worldview';
 if(groups?.some(group=>!group.startsWith(owner+'/')))throw Error('目录分类所属栏目不匹配: '+p.source);
 const route=pathOf(p);const expected=p.creature_profile?'creatures':route.includes('worldview/countries/entries/')?'countries':/worldview\/organizations\/[^/]+\//.test(route)?'organizations':route.includes('worldview/history/')?'history':null;
 if(groups?.length&&owner==='worldview'&&!route.startsWith('worldview/')&&!p.creature_profile)throw Error('世界观分类须用于世界观词条或非凡生物: '+p.source);
 if(owner==='worldview'&&expected&&groups?.some(group=>!group.startsWith('worldview/'+expected+'/')))throw Error('世界观目录分类与词条类型不符: '+p.source);
 const history=p.worldview_history;
 if(history===undefined)return;
 const fail=()=>{throw Error('无效的世界观历史排序依据: '+p.source);};
 if(owner!=='worldview'||!expected||!history||typeof history!=='object'||Array.isArray(history))fail();
 if(!['founded','attested','occurred'].includes(history.kind))fail();
 if(history.event!==undefined){
  if(typeof history.event!=='string'||!history.event.trim()||Object.keys(history).some(key=>!['kind','event'].includes(key)))fail();
 }else{
  if(![1,2,3,4,5].includes(history.era)||typeof history.source_section!=='string'||Object.keys(history).some(key=>!['kind','era','source_section'].includes(key)))fail();
  const body=String(p._content||'');
  const sections=body.split(/^#{1,6}\s+/m);
  const evidence=history.source_section==='intro'?sections[0]:sections.slice(1).find(section=>section.split('\n')[0].trim()===history.source_section);
  if(!evidence?.trim())fail();
 }
}
const collator=new Intl.Collator('zh-CN',{numeric:true,ignorePunctuation:true});
const compare=(a,b)=>collator.compare(a.title,b.title)||a.id.localeCompare(b.id);
const pinyin=new Intl.Collator('zh-CN-u-co-pinyin',{numeric:true,ignorePunctuation:true});
const eraNames=['第一纪','第二纪','第三纪','第四纪','第五纪'];
function historyFor(page,events) {
 const history=page.worldview_history;
 if(!history){
  const index=eraNames.indexOf(page.title);
  return page.catalog_groups?.includes('worldview/history/eras')&&index>=0?{era:index+1,order:0}:null;
 }
 if(!history.event)return {era:history.era,order:null,kind:history.kind};
 const event=events.get(history.event);
 const date=String(event?.event_time||event?.event_time_period||'');
 const era=event?.event_era||5;
 const order=era===5?(date?Number(date.replace(/-/g,'').padEnd(8,'0')):null):event?.event_era_order;
 if(!Number.isFinite(order)||!event?.event_source?.trim())throw Error('世界观词条引用的事件缺少有效时间或来源: '+history.event);
 return {era,order,kind:history.kind,eventTitle:event.title,date};
}
function compareHistory(a,b) {
 return (a.history?.era??Infinity)-(b.history?.era??Infinity)
  || (a.history?.order??Infinity)-(b.history?.order??Infinity)
  || compare(a,b);
}
function compareWorldview(a,b) {
 const aCountry=a.memberships[0].branch==='countries';
 const bCountry=b.memberships[0].branch==='countries';
 if(aCountry!==bCountry)return aCountry?-1:1;
 return aCountry?(pinyin.compare(a.title,b.title)||compare(a,b)):compareHistory(a,b);
}
const slug=id=>/^[a-z0-9-]+$/.test(id)?id:'g-'+crypto.createHash('sha256').update(id).digest('hex').slice(0,16);
function buildCatalog(pages,directory={}) {
 pages.forEach(validateCatalogPage);
 const events=new Map(pages.filter(page=>page.timeline_event&&!page.draft).map(page=>[page.entry_id,page]));
 const owners=Object.fromEntries(Object.entries(definitions).map(([id,definition])=>[id,{id,path:definition.path,key:definition.key,entries:[],branches:definition.branches.map(branch=>({...branch,path:id==='characters'&&branch.id==='all'?definition.path:definition.path+branch.id+'/',groups:[]}))}]));
 const seen=new Set();
 for(const p of pages){
  const url=pathOf(p);let owner;
  if(p.character_profile)owner='characters';
  else if(/^artifacts\/entries\//.test(url))owner='artifacts';
  else if(p.creature_profile || p.catalog_groups?.some(group=>group.startsWith('worldview/')) || /^worldview\/(countries\/entries\/|organizations\/[^/]+\/|history\/[^/]+\.html$)/.test(url))owner='worldview';
  if(!owner || p.draft)continue;
  if(seen.has(url))throw Error('目录中的正式地址重复: '+url);seen.add(url);
  const data=directory[decodeURIComponent(String(p.source||url).split('/').at(-1).replace(/\.md$/,''))] || directory[decodeURIComponent(url.split('/')[2]||'')] || {};
  const entry={id:p.entry_id||url,title:String(p.title||''),url,aliases:String(p.graph_profile?.alias||p.profile_alias||''),memberships:[],qualifiers:{},works:[],mentions:0,order:null};
  if(owner==='characters'){
   entry.works=['诡秘之主','宿命之环'].filter(book=>String(p.profile_work||'').includes(book));
   entry.mentions=Object.values(data.counts||{}).reduce((sum,n)=>sum+(Number(n)||0),0);entry.order=data.order??null;entry.orderWork=data.work||'';
   for(const work of entry.works)entry.memberships.push({branch:'all',group:work,label:work});
   if(!entry.works.length)entry.memberships.push({branch:'all',group:'unclassified',key:'catalog_unclassified_work'});
   for(const name of new Set((p.graph_classifications?.organization||[]).map(f=>f.value))){
    entry.memberships.push({branch:'organizations',group:name,label:name});
    if(p.graph_classifications.organization.filter(f=>f.value===name).every(f=>f.certainty==='inferred'))entry.qualifiers['organizations/'+name]='catalog_inferred';
   }
   if(!entry.memberships.some(group=>group.branch==='organizations'))entry.memberships.push({branch:'organizations',group:'unknown',key:'catalog_unknown_organization'});
   for(const pathway of data.pathways||[]){entry.memberships.push({branch:'pathways',group:pathway.name,label:pathway.name});if(pathway.inferred)entry.qualifiers['pathways/'+pathway.name]='catalog_inferred';}
   if(p.ordinary_in_cited_period){entry.memberships.push({branch:'pathways',group:'ordinary',key:'catalog_ordinary'});if(p.ordinary_in_cited_period==='inferred')entry.qualifiers['pathways/ordinary']='catalog_inferred';}
   if(!entry.memberships.some(g=>g.branch==='pathways'))entry.memberships.push({branch:'pathways',group:'unknown',key:'catalog_unknown_pathway'});
  }else{
   const groups=p.catalog_groups||[];
   for(const code of groups){const [,branch,group]=code.split('/');
    if(branch==='sealed'){const number=/(?:^|[^\d])([0-3])-\d{2,4}(?!\d)/.exec(entry.title);entry.memberships.push({branch,group:number?.[1]||'unnumbered',key:'catalog_group_sealed_'+(number?.[1]||'unnumbered')});}
    else entry.memberships.push({branch,group,key:'catalog_group_'+branch+'_'+group});
   }
   // Unclassified formal entries remain reachable, without guessing their nature.
   if(!entry.memberships.length){const branch=p.creature_profile?'creatures':url.includes('/history/')?'history':url.includes('/organizations/')?'organizations':'countries';entry.memberships.push({branch,group:'unclassified',key:'catalog_unclassified'});}
  }
  if(owner==='artifacts'){
   const number=/(?:^|[^\d])([0-3])-(\d{2,4})(?!\d)/.exec(entry.title);
   entry.numberOrder=number?Number(number[1])*100000+Number(number[2]):null;
   if(number){
    entry.displayNumber=number[1]+'-'+number[2];
    entry.displayName=entry.title.replace(new RegExp(`[“”"']?${entry.displayNumber}[“”"']?`),'').replace(/^[\s（）()“”"']+|[\s（）()“”"']+$/g,'');
   }
   const chinese=value=>{if(/^\d+$/.test(value))return Number(value);let sum=0,digit=0;for(const c of value){const n='零一二三四五六七八九'.indexOf(c);if(n>=0)digit=n;else if(c==='〇')digit=0;else{sum+=(digit||1)*({'十':10,'百':100,'千':1000}[c]||0);digit=0;}}return sum+digit;};
   const positions=[...String(p._content||'').matchAll(/《(诡秘之主|宿命之环)》\s*第([零〇一二三四五六七八九十百\d]+)[部卷]\s*第?([零〇一二三四五六七八九十百\d]+)(?=章|、|至|[—–-])/g)].map(m=>(m[1]==='诡秘之主'?0:10000000)+chinese(m[2])*10000+chinese(m[3]));
   entry.referenceOrder=positions.length?Math.min(...positions):null;
  }
  if(owner==='worldview'){
   entry.history=historyFor(p,events);
   const {branch,group}=entry.memberships[0];
   entry.overviewGroup=branch==='history'?`history/${group}`:branch;
  }
  owners[owner].entries.push(entry);
 }
 for(const section of Object.values(owners)){
  section.entries.sort(section.id==='worldview'?compareWorldview:compare);section.works=[...new Set(section.entries.flatMap(entry=>entry.works))];
  for(const branch of section.branches){
   branch.count=section.entries.filter(e=>branch.id==='all'||e.memberships.some(m=>m.branch===branch.id)).length;
   const groups=new Map();
   for(const entry of section.entries)for(const m of entry.memberships.filter(m=>m.branch===branch.id)){
    if(!groups.has(m.group))groups.set(m.group,{id:m.group,key:m.key,label:m.label,path:branch.path+slug(m.group)+'/',count:0});
    groups.get(m.group).count++;
   }
   branch.groups=[...groups.values()].sort((a,b)=>{
    const order=definitions[section.id].branches.find(b=>b.id===branch.id).groups;
    return order?(order.includes(a.id)?order.indexOf(a.id):Infinity)-(order.includes(b.id)?order.indexOf(b.id):Infinity):collator.compare(a.label||a.id,b.label||b.id);
   });
  }
  if(section.id==='worldview'){
   section.overviewGroups=section.branches.flatMap(branch=>branch.id==='history'
    ?branch.groups.map(group=>({...group,id:`history/${group.id}`}))
    :[branch]);
  }
 }
 return owners;
}
function selectEntries(section,branchId='all',group='') {return section.entries.filter(entry=>(branchId==='all'&&!group)||entry.memberships.some(m=>m.branch===branchId&&(!group||m.group===group)));}
function contextFor(page,catalog){
 if(page.catalog_view)return page.catalog_view;
 const url=pathOf(page);
 if(page.character_directory)return {owner:'characters',branch:'all',directory:true};
 if(page.artifact_directory)return {owner:'artifacts',branch:'overview',directory:true};
 if(page.worldview_directory)return {owner:'worldview',branch:'overview',directory:true};
 if(page.country_directory)return {owner:'worldview',branch:'countries',directory:true};
 if(page.organization_directory)return {owner:'worldview',branch:'organizations',directory:true};
 for(const section of Object.values(catalog)){
  const entry=section.entries.find(e=>e.url===url);
  if(entry)return {owner:section.id,branch:section.id==='characters'?'all':entry.memberships[0]?.branch||'all',group:section.id==='characters'?'':entry.memberships[0]?.group||'',directory:false};
 }
 return null;
}
module.exports={definitions,validateCatalogPage,buildCatalog,selectEntries,contextFor};
