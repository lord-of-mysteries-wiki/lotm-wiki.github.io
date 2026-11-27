const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildCatalog,selectEntries,contextFor,validateCatalogPage}=require('../lib/catalog');
const {directoryPathways}=require('../lib/content-model');
const person=(extra={})=>({title:'角色',path:'characters/entries/角色/',source:'characters/entries/角色.md',entry_id:'person',character_profile:true,profile_work:'《诡秘之主》及《宿命之环》',graph_classifications:{organization:[{value:'甲组织',certainty:'inferred'},{value:'乙组织'}]},...extra});
test('one person belongs to both books and several organizations without duplicating the all-directory entry',()=>{
 const p=person(),data=buildCatalog([p],{'角色':{counts:{诡秘之主:3,宿命之环:2},pathways:[{name:'猎人途径',inferred:true}]}}).characters;
 assert.equal(data.entries.length,1);assert.equal(selectEntries(data,'all','诡秘之主').length,1);assert.equal(selectEntries(data,'all','宿命之环').length,1);
 assert.equal(data.branches.find(b=>b.id==='organizations').count,1);
 assert.equal(data.entries[0].qualifiers['organizations/甲组织'],'catalog_inferred');
 assert.equal(data.entries[0].qualifiers['pathways/猎人途径'],'catalog_inferred');
 assert.equal(data.entries[0].mentions,5);
});
test('an owned pathway directory excludes borrowed ability, authority and sefirah associations',()=>{
 const paths=directoryPathways({classificationEvidence:[{kind:'pathway',value:'猎人',certainty:'inferred'},{kind:'pathway',value:'学徒',relation:'ability'},{kind:'pathway',value:'窥秘人',relation:'sefirah'}],progression:[{pathway:'猎人',sequence:'序列5'},{pathway:'收尸人',relation:'authority',sequence:'序列0'}]},new Map());
 assert.deepEqual(paths,[{name:'猎人途径',inferred:false}]);
});
test('unknown affiliation remains reachable without inventing independent membership or ordinary status',()=>{
 const data=buildCatalog([person({graph_classifications:{organization:[]}})]).characters;
 assert.equal(selectEntries(data,'organizations','unknown').length,1);assert.equal(selectEntries(data,'pathways','unknown').length,1);assert.equal(selectEntries(data,'pathways','ordinary').length,0);
});
test('artifact classification is read from its own metadata, grade from its canonical title, and duplicates are not inferred',()=>{
 const pages=[{title:'“0-05”许愿神灯',path:'artifacts/entries/0-05/',catalog_groups:['artifacts/sealed','artifacts/equipment/accessories']},{title:'长得像武器的物品',path:'artifacts/entries/other/',catalog_groups:['artifacts/texts/other']}];
 const data=buildCatalog(pages).artifacts;assert.equal(data.entries.length,2);assert.equal(selectEntries(data,'sealed','0').length,1);assert.equal(selectEntries(data,'equipment','accessories').length,1);assert.equal(selectEntries(data,'equipment','weapons').length,0);
});
test('directory context follows the declared owner, including creatures outside the worldview folder',()=>{
 const p={title:'生物',path:'creatures/entries/生物/',creature_profile:true,catalog_groups:['worldview/creatures/spirit']};const data=buildCatalog([p]);assert.equal(contextFor(p,data).owner,'worldview');assert.equal(contextFor({worldview_directory:true},data).directory,true);
 assert.equal(data.worldview.branches.find(b=>b.id==='creatures').groups.length,1);
 assert.equal(contextFor({path:'worldview/pathways/猎人途径/猎人途径.html',pathway_page:true},data),null);
});
test('classifications, duplicate paths and hand-maintained root directories are rejected',()=>{
 for(const page of [{path:'artifacts/entries/a/'},{path:'artifacts/entries/a/',catalog_groups:['artifacts/sealed/0']},{path:'artifacts/entries/a/',catalog_groups:['artifacts/texts/other','artifacts/texts/other']},person({catalog_groups:['worldview/creatures/spirit']}),{worldview_directory:true,_content:'- [词条](entries/词条/)'}])assert.throws(()=>validateCatalogPage(page));
 assert.throws(()=>buildCatalog([person(),person()]),/正式地址重复/);
 assert.throws(()=>validateCatalogPage({path:'creatures/entries/a/',creature_profile:true,catalog_groups:['worldview/countries/states']}),/词条类型不符/);
});
test('group routes are deterministic and safe even for punctuation in names',()=>{
 const a=person({graph_classifications:{organization:[{value:'甲/乙?组'},{value:'甲-乙?组'}]}});const first=buildCatalog([a]).characters.branches.find(b=>b.id==='organizations').groups;const second=buildCatalog([a]).characters.branches.find(b=>b.id==='organizations').groups;
 assert.deepEqual(first,second);assert.equal(new Set(first.map(g=>g.path)).size,2);assert.ok(first.every(g=>/^characters\/organizations\/g-[a-f0-9]+\/$/.test(g.path)));
});

test('number and chapter positions are derived without creating a first-appearance claim',()=>{
 const page={title:'“阿罗德斯”（“2-111”）',path:'artifacts/entries/阿罗德斯/',catalog_groups:['artifacts/sealed'],_content:'见《宿命之环》第一卷第3章；《诡秘之主》第二卷第9章。'};
 const item=buildCatalog([page]).artifacts.entries[0];assert.equal(item.displayNumber,'2-111');assert.equal(item.displayName,'阿罗德斯');assert.equal(item.numberOrder,200111);assert.equal(item.referenceOrder,20009);assert.equal(item.firstAppearance,undefined);assert.equal(page.numberOrder,undefined);
});

test('numbered cards separate unquoted numbers from names regardless of title order',()=>{
 const titles=['“0-01”（“神陨之旗／萨林格尔血旗”）','“阿勒苏霍德之笔”（“0-08”）','“0-36”','普通物品'];
 const entries=buildCatalog(titles.map((title,i)=>({title,path:'artifacts/entries/a'+i+'/',catalog_groups:['artifacts/sealed']}))).artifacts.entries;
 for(const [i,number,name]of [[0,'0-01','神陨之旗／萨林格尔血旗'],[1,'0-08','阿勒苏霍德之笔'],[2,'0-36','']]){const entry=entries.find(e=>e.title===titles[i]);assert.equal(entry.displayNumber,number);assert.equal(entry.displayName,name);}
 assert.equal(entries.find(e=>e.title==='普通物品').displayNumber,undefined);
});

test('worldview sorts by story era and event chronology before unknown entries',()=>{
 const organization=(title,history)=>({
  title,path:`worldview/organizations/${title}/`,
  catalog_groups:['worldview/organizations/societies'],_content:'## 沿革\n原文依据',
  worldview_history:history
 });
 const event=(id,time)=>({timeline_event:true,entry_id:id,event_source:'原著卷章',...time});
 const pages=[
  organization('阿国'),organization('乙国',{kind:'founded',event:'later'}),
  organization('丙国',{kind:'attested',era:3,source_section:'沿革'}),
  organization('丁国',{kind:'founded',event:'ancient'})
 ];
 const events=[
  event('later',{event_time:'1349-06-28'}),
  event('ancient',{event_era:4,event_era_order:10})
 ];
 const section=buildCatalog([...pages,...events]).worldview;
 assert.deepEqual(selectEntries(section,'organizations','societies').map(entry=>entry.title),['丙国','丁国','乙国','阿国']);
 assert.throws(()=>buildCatalog(pages),/事件缺少有效时间或来源/);
 assert.throws(()=>validateCatalogPage(organization('戊国',{kind:'attested',era:3,source_section:'不存在'})),/历史排序依据/);
});

test('country names use pinyin and history topics have a separate overview group',()=>{
 const country=title=>({title,path:`worldview/countries/entries/${title}.html`,catalog_groups:['worldview/countries/states']});
 const history=(title,group)=>({title,path:`worldview/history/${title}.html`,catalog_groups:[`worldview/history/${group}`]});
 const data=buildCatalog([country('鲁恩王国'),country('拜朗帝国'),history('第一纪','eras'),history('西大陆封印','topics')]).worldview;
 assert.deepEqual(selectEntries(data,'countries').map(entry=>entry.title),['拜朗帝国','鲁恩王国']);
 assert.deepEqual(data.overviewGroups.map(group=>group.id).filter(id=>id.startsWith('history/')),['history/eras','history/topics']);
 assert.equal(data.entries.find(entry=>entry.title==='西大陆封印').overviewGroup,'history/topics');
 assert.deepEqual(selectEntries(data,'history','eras').map(entry=>entry.title),['第一纪']);
});
