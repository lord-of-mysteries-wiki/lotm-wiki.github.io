'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm');
const root=process.cwd(),draftRoot=process.env.LOTM_CHRONOLOGY_DRAFT_ROOT;
const cache=new Map();
// Compile drafts at their eventual repository filenames: dependencies not in the
// overlay resolve from the real checkout. This runner never writes repository files.
function load(relative) {
  const filename=path.join(root,relative),draft=draftRoot && path.join(draftRoot,relative);
  if (!draft || !fs.existsSync(draft)) return require(filename);
  if(cache.has(filename))return cache.get(filename).exports;
  const m=new Module(filename,module);cache.set(filename,m);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));
  const normal=Module.createRequire(filename);
  // A newly introduced relative module has no real-checkout file yet.
  m.require=request=>{
    if(request.startsWith('.')) {
      const rel=path.relative(root,path.resolve(path.dirname(filename),request.endsWith('.js')?request:request+'.js'));
      if(fs.existsSync(path.join(draftRoot,rel)))return load(rel);
    }
    return normal(request);
  };
  m._compile(fs.readFileSync(draft,'utf8'),filename);return m.exports;
}
const {eventTime,createRelationChronology:build}=load('tools/lib/relationship-chronology.js');
let passed=0;
function test(name,run){run();passed++;console.log('PASS '+name);}
const ev=(id,date,extra={})=>({entry_id:id,title:id,path:'timeline/'+id+'/',event_time:date,event_time_precision:'anchor',event_time_source:'《诡秘之主》第一卷第1章',event_time_basis:'事件日期依据',...extra});
const stage=(id,event_id,extra={})=>({id,tag:id,note:'交集 '+id,source:'《诡秘之主》第一卷第2章',chronology:{event_id,basis:'适用于本阶段的主行动'},...extra});
const rel=(id,stages,a='a',b='b')=>({id,a,b,categories:['上下级'],direction:{上下级:'a-to-b'},summary:'关系概述',sourceHint:'《诡秘之主》第一卷第3章',milestones:stages});
const order=p=>p.byRelation.r.groups.flatMap(g=>g.items.map(s=>s.id));
test('precise dates use shared source, not milestone array order',()=>{
 const p=build({events:[ev('e1','1349-09-09'),ev('e2','1349-10-01')],relations:[rel('r',[stage('late','e2'),stage('early','e1')])]});
 assert.deepEqual(order(p),['early','late']);assert.equal(p.byRelation.r.representative.stage_id,'early');assert.deepEqual(p.people.a,p.people.b);
});
test('same day and overlapping windows remain incomparable',()=>{
 const p=build({events:[ev('a','1349-09-09'),ev('b','1349-09-09'),ev('c','1349-09-01',{event_time_end:'1349-09-30',event_time_window:true,event_time_precision:'range'})],relations:[rel('r',[stage('a','a'),stage('b','b'),stage('c','c')])]});
 assert.equal(p.byRelation.r.groups[0].items.length,3);assert.equal(p.byRelation.r.representative,null);assert.equal(p.byRelation.r.groups[0].status,'undetermined');assert.equal(p.byRelation.r.groups[0].items.find(x=>x.id==='c').time.kind,'window');
});
test('conservative month/year bounds retain displayed precision',()=>{
 const m=ev('month',undefined,{event_time_period:'1349-02',event_time_precision:'partial'}),y=ev('year',undefined,{event_time_period:'1348',event_time_precision:'partial'});
 assert.equal(eventTime(m).label,'1349年2月');assert.equal(eventTime(m).upper-eventTime(m).lower,27);
 const p=build({events:[m,y],relations:[rel('r',[stage('m','month'),stage('y','year')])]});assert.deepEqual(order(p),['y','m']);
});
test('uncertain dates never make strict date edges',()=>{
 const p=build({events:[ev('a','1349-01-01',{event_time_uncertain:true}),ev('b','1349-12-01')],relations:[rel('r',[stage('a','a'),stage('b','b')])]});
 assert.equal(p.byRelation.r.representative,null);assert.equal(p.byRelation.r.groups.at(-1).items[0].time.status,'uncertain');
});
test('eras, cycles and reality are distinct domains; no era-order date',()=>{
 const a=ev('era',undefined,{event_era:4,event_era_order:10,event_time_note:'末期'}),b=ev('c1','1358-03-29',{event_cordu_cycle:1}),c=ev('c2','1358-03-29',{event_cordu_cycle:2});
 assert.equal(eventTime(a).lower,null);assert.notEqual(eventTime(b).domain,eventTime(c).domain);
 const p=build({events:[a,b,c,ev('real','1358-03-30')],relations:[rel('r',[stage('a','era'),stage('b','c1'),stage('c','c2'),stage('d','real')])]});assert.equal(p.byRelation.r.representative,null);assert.equal(p.byRelation.r.groups[0].items.length,3);
});
test('explicit relative chain across relations, with no invented date',()=>{
 const first={id:'first',note:'往事',source:'往事出处',tag:'往事'},second={id:'second',note:'后来',source:'后来出处',chronology:{after:[{type:'stage',relation_id:'r',id:'first'}],basis:'明确晚于往事',source:'先后出处'}};
 const p=build({events:[],relations:[rel('r',[first]),rel('s',[second],'a','c')]});
 assert.deepEqual(p.people.a.map(g=>g.relation_ids),[['r'],['s']]);assert.equal(p.byRelation.s.representative.time.status,'relative');assert.equal(p.byRelation.s.representative.time.lower,null);assert(p.byRelation.s.representative.time.evidence.some(e=>e.source==='往事出处'));
});
test('after event carries target time source and anchor-equivalent stages',()=>{
 const second={id:'b',note:'后续',source:'事实乙',chronology:{after:[{type:'event',id:'e'}],basis:'该事件之后'}};
 const p=build({events:[ev('e','1349-09-09')],relations:[rel('r',[second,stage('a','e')])]});assert.deepEqual(order(p),['a','b']);assert(p.byRelation.r.groups[1].items[0].time.evidence.some(e=>e.source==='《诡秘之主》第一卷第1章'));
});
test('legacy without IDs/chronology remains all unknown and raw unchanged',()=>{
 const r=rel('r',[{tag:'后章回忆童年',note:'童年',source:'第99章'},{tag:'早章',note:'今日',source:'第1章'}]),before=JSON.stringify(r);
 const p=build({events:[],relations:[r]});assert.equal(JSON.stringify(r),before);assert.equal(p.byRelation.r.representative,null);assert.equal(p.byRelation.r.groups[0].status,'unknown');assert.equal(p.byRelation.r.groups[0].items.length,2);
});
test('undated earlier coverage prevents claiming dated stage as earliest',()=>{
 const p=build({events:[ev('e','1349-09-09')],relations:[rel('r',[stage('dated','e'),{note:'未定位往事',source:'独立出处'}])]});assert.equal(p.byRelation.r.representative,null);
});
test('cycles, missing refs, duplicate IDs and direct contradictions fail',()=>{
 const make=(id,after)=>({id,note:id,source:'事实',chronology:{after,basis:'先后依据'}});
 assert.throws(()=>build({events:[],relations:[rel('r',[make('a',[{type:'stage',relation_id:'r',id:'b'}]),make('b',[{type:'stage',relation_id:'r',id:'a'}])])]}),/成环/);
 assert.throws(()=>build({events:[],relations:[rel('r',[stage('a','missing')])]}),/不存在/);
 assert.throws(()=>build({events:[],relations:[rel('r',[make('a',[{type:'stage',relation_id:'r',id:'missing'}])])]}),/不存在/);
 assert.throws(()=>build({events:[ev('e','1349-09-09')],relations:[rel('r',[stage('a','e'),stage('a','e')])]}),/重复/);
 const a=stage('a','early');a.chronology.after=[{type:'event',id:'late'}];
 assert.throws(()=>build({events:[ev('early','1349-01-01'),ev('late','1349-12-31')],relations:[rel('r',[a])]}),/矛盾/);
});
test('transitive date contradiction and self anchor are rejected',()=>{
 const a=stage('a','early');a.chronology.after=[{type:'stage',relation_id:'r',id:'b'}];
 const b={id:'b',note:'中间',source:'事实',chronology:{after:[{type:'event',id:'late'}],basis:'晚于后日'}};
 assert.throws(()=>build({events:[ev('early','1349-01-01'),ev('late','1349-12-31')],relations:[rel('r',[a,b])]}),/成环/);
 const c=stage('c','early');c.chronology.after=[{type:'event',id:'early'}];assert.throws(()=>build({events:[ev('early','1349-01-01')],relations:[rel('r',[c])]}),/自身/);
});
test('no date-copy/phase fields, no unstable reference, basis required',()=>{
 for(const patch of [{date:'1349-01-01'},{phase_id:'x'},{basis:''}]){
  const a=stage('a','e');Object.assign(a.chronology,patch);assert.throws(()=>build({events:[ev('e','1349-01-01')],relations:[rel('r',[a])]}));
 }
 const empty=stage('empty','e');empty.chronology.after=[];assert.doesNotThrow(()=>build({events:[ev('e','1349-01-01')],relations:[rel('r',[empty])]}));
 const a=stage('a','e');delete a.id;assert.throws(()=>build({events:[ev('e','1349-01-01')],relations:[rel('r',[a])]}),/稳定 ID/);
});
test('incomparability components do not turn frontier layers into false chronology',()=>{
 const events=[ev('a','1349-01-01'),ev('b','1349-01-01',{event_time_end:'1349-12-31',event_time_precision:'range',event_time_window:true}),ev('c','1349-12-31')];
 const p=build({events,relations:[rel('r',[stage('c','c'),stage('b','b'),stage('a','a')])]});
 assert.equal(p.byRelation.r.groups.length,1);assert.equal(p.byRelation.r.groups[0].status,'undetermined');assert(order(p).indexOf('a')<order(p).indexOf('c'));
});
test('before/after/since qualifiers retain open bounds and labels',()=>{
 for(const q of ['之前','以前']){const t=eventTime(ev('x',undefined,{event_time_period:'1360-07',event_time_precision:'partial',event_time_qualifier:q}));assert.equal(t.lower,null);assert.notEqual(t.upper,null);assert(t.label.endsWith(q));}
 for(const q of ['之后','以后','以来','起','底以后']){const t=eventTime(ev('x',undefined,{event_time_period:'1360-07',event_time_precision:'partial',event_time_qualifier:q}));assert.equal(t.upper,null);assert.notEqual(t.lower,null);assert(t.label.endsWith(q));}
});
test('around and unrecognized qualifiers cannot prove strict bounds',()=>{
 for(const q of ['前后','不详的某个时候','晚']){const t=eventTime(ev('x','1360-07-01',{event_time_qualifier:q}));assert.equal(t.lower,null);assert.equal(t.upper,null);assert.equal(t.reliable,false);assert(t.label.includes(q));}
});
test('first week is bounded only for a single known month; spring remains conservative',()=>{
 const week=eventTime(ev('w',undefined,{event_time_period:'1360-07',event_time_precision:'partial',event_time_qualifier:'第一周'}));assert.equal(week.upper-week.lower,6);assert.equal(week.label,'1360年7月第一周');
 const spring=eventTime(ev('s',undefined,{event_time_period:'1360',event_time_precision:'partial',event_time_qualifier:'初春'}));assert.equal(spring.upper-spring.lower,365);assert.equal(spring.label,'1360年初春');
});
test('open-ended qualifiers do not turn into closed month/year windows',()=>{
 const t=eventTime(ev('open',undefined,{event_time_period:'1360-07',event_time_precision:'partial',event_time_qualifier:'底以后'}));assert.equal(t.upper,null);assert.equal(t.label,'1360年7月底以后');
});
test('event source date changes sync both participants without touching raw relations',()=>{
 const relations=[rel('r',[stage('a','e')])];const p=build({events:[ev('e','1349-09-09')],relations}),q=build({events:[ev('e','1349-10-09')],relations});assert.notEqual(p.byRelation.r.representative.time.label,q.byRelation.r.representative.time.label);assert.deepEqual(q.people.a,q.people.b);assert.equal(relations[0].milestones[0].chronology.event_id,'e');
});
test('time evidence links reach formal events and referenced relationship pairs',()=>{
 const early=stage('earlier','brief'),later={id:'later',tag:'later',note:'后来的交集',source:'《诡秘之主》第一卷第2章',chronology:{after:[{type:'stage',relation_id:'r',id:'earlier'},{type:'event',id:'brief'}],basis:'晚于前事'}};
 const p=build({events:[ev('brief','1349-09-09',{event_display:'brief',event_anchor:'血月求救'})],relations:[rel('r',[early]),rel('s',[later],'a','c')]});
 assert.equal(p.byRelation.r.representative.time.event.path,'timeline/#event-'+encodeURIComponent('血月求救'));
 const time=p.byRelation.s.groups[0].items[0].time;
 assert.equal(time.after[0].path,'relationships/?a=a&b=b');
 assert.equal(time.after[1].path,p.byRelation.r.representative.time.event.path);
 assert(time.evidence.some(x=>x.source.includes('第1章')));
 assert(time.evidence.some(x=>x.source.includes('第2章')));
});
const {characterRelationRows}=load('themes/lotm/lib/character-records.js');
const fixture={profiles:[{entry_id:'a',title:'甲',path:'a/'},{entry_id:'b',title:'乙',path:'b/'},{entry_id:'c',title:'丙',path:'c/'}],relations:[rel('r',[stage('first','e1'),stage('last','e2')]),rel('s',[stage('other','e2')],'a','c')],events:[ev('e1','1349-09-09'),ev('e2','1349-10-09')]};fixture.relationChronology=build(fixture);
test('both page directions and preference cannot override proven order',()=>{
 const a=characterRelationRows(fixture,'a',['c']),b=characterRelationRows(fixture,'b');assert.equal(a[0].person.entry_id,'b');assert.equal(a[0].label,'上级');assert.equal(b[0].label,'下属');assert.deepEqual(a[0].stages,b[0].stages);
});
test('shared table keeps three columns and collects all fact/time sources',()=>{
 const ejs=require(path.join(root,'node_modules/ejs'));const {createCharacterReferences}=load('themes/lotm/lib/character-references.js');const refs=createCharacterReferences({content:''});
 const file=draftRoot?path.join(draftRoot,'themes/lotm/layout/_partials/character-relations.ejs'):path.join(root,'themes/lotm/layout/_partials/character-relations.ejs');
 const html=ejs.render(fs.readFileSync(file,'utf8'),{page:{entry_id:'a'},character_relation_rows:id=>characterRelationRows(fixture,id),references:refs,__:(key)=>key,url_for:s=>'/lotm-wiki.github.io'+s});
 assert.equal((html.match(/scope="col"/g)||[]).length,3);assert(html.includes('全部')||html.includes('character_relation_stages'));assert(html.includes('交集 last'));assert(refs.refs.some(r=>r.source.includes('第1章')));assert(refs.refs.some(r=>r.source.includes('第2章')));assert(refs.refs.some(r=>r.source.includes('第3章')));assert(html.includes('/lotm-wiki.github.io/b/'));
 assert(html.includes('href="/lotm-wiki.github.io/timeline/e1/"'));
});
test('graph single and pair panels consume the same complete projection',()=>{
 const file=draftRoot?path.join(draftRoot,'source/relationships/graph.js'):path.join(root,'source/relationships/graph.js');const source=fs.readFileSync(file,'utf8');const start=source.indexOf('function relationshipTimeText('),end=source.indexOf('function render(){',start);
 const context={relationChronology:fixture.relationChronology,relations:fixture.relations,byId:new Map(fixture.profiles.map(p=>[p.entry_id,{...p,id:p.entry_id}])),esc:s=>String(s),other:(r,id)=>r.a===id?r.b:r.a,categoryText:()=>'',row:(p,detail)=>p.title+detail};
 vm.runInNewContext(source.slice(start,end)+';globalThis.result={single:relationshipList("a"),pair:relationshipStages(relations[0])}',context);assert(context.result.single.includes('交集 first'));assert(context.result.pair.includes('交集 last'));assert(context.result.pair.includes('第1章'));assert(context.result.pair.includes('第2章'));
 assert(context.result.pair.includes('href="../timeline/e1/"'));
});
test('real model validates legacy and generated projection preserves raw query object',()=>{
 const model=load('tools/lib/content-model.js').loadModel();assert.equal(Object.keys(model.relationChronology.byRelation).length,model.relations.length);
 const {createRelationshipQuery}=load('source/relationships/relationship-query.js');const query=createRelationshipQuery(model.characters,model.relations),r=model.relations[0];assert.equal(query.directRelations(r.a,r.b)[0],r);
 const generators={},filters={};global.hexo={extend:{filter:{register:(key,fn)=>filters[key]=fn},helper:{register:()=>{}},generator:{register:(key,fn)=>generators[key]=fn}}};
 load('themes/lotm/scripts/content-model.js');filters.before_generate();const output=generators['wiki-content-data'].call({locals:{get:()=>({toArray:()=>[]})}})[0].data;delete global.hexo;
 const context={};vm.runInNewContext(output+';globalThis.probe={relations,relationChronology};',context);assert.equal(JSON.stringify(context.probe.relations),JSON.stringify(model.relations));assert.equal(context.probe.relationChronology.version,1);
});
test('every real relation appears on both exact endpoint rows with all phase facts',()=>{
 const model=load('tools/lib/content-model.js').loadModel();
 const rowsByPerson=new Map(model.profiles.map(p=>[p.entry_id,characterRelationRows(model,p.entry_id)]));
 const facts=items=>items.map(s=>JSON.stringify([s.tag||'',s.note||'',s.source||''])).sort();
 for(const relation of model.relations){
  const expected=facts(relation.milestones||[]);
  for(const [current,other] of [[relation.a,relation.b],[relation.b,relation.a]]){
   const rows=rowsByPerson.get(current)||[];
   const row=rows.find(r=>r.relationId===relation.id);
   assert(row,`${relation.id} missing from ${current}`);
   assert.equal(row.person.entry_id,other,`${relation.id} wrong counterpart on ${current}`);
   assert.deepEqual(facts(row.stages.flatMap(g=>g.items)),expected,`${relation.id} lost phase facts on ${current}`);
  }
 }
});
console.log(`Passed ${passed} relationship chronology tests`);
