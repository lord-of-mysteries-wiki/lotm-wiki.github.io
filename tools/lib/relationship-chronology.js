'use strict';
const {eventDateLabel, corduCycleLabel, eventTimeQualifier, isBriefEvent} = require('./event-presentation');
const text = x => typeof x === 'string' && x.trim().length > 0;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
const fail = message => { throw Error('关系时间：' + message); };
const stageKey = (relation, id) => JSON.stringify(['stage', relation, id]);
const eventKey = id => JSON.stringify(['event', id]);
const compareText = (a,b) => a < b ? -1 : a > b ? 1 : 0;
function day(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('日期格式无效：' + value);
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(+date) || date.toISOString().slice(0,10) !== value) fail('日期无效：' + value);
  return +date / 86400000;
}
function periodBounds(value) {
  if (!/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(value)) fail('时期无效：' + value);
  const [y,m] = value.split('-').map(Number);
  const lower = day(value + (m ? '-01' : '-01-01'));
  const next = m ? (m===12 ? `${String(y+1).padStart(4,'0')}-01-01` : `${String(y).padStart(4,'0')}-${String(m+1).padStart(2,'0')}-01`) : `${String(y+1).padStart(4,'0')}-01-01`;
  return [lower,day(next)-1];
}
// Bounds are conservative exclusion bounds only. They never become displayed dates.
function eventTime(event) {
  if (event.event_era!==undefined && (![1,2,3,4].includes(event.event_era) || event.event_time || event.event_time_period || event.event_cordu_cycle)) fail('纪元时间域无效：'+event.entry_id);
  if (event.event_cordu_cycle!==undefined && ![1,2,3].includes(event.event_cordu_cycle)) fail('循环时间域无效：'+event.entry_id);
  if (event.event_time_period_end && (!event.event_time_period || String(event.event_time_period_end).length!==String(event.event_time_period).length)) fail('时期范围精度不一致：'+event.entry_id);
  const domain = event.event_cordu_cycle ? 'cordu-cycle:' + event.event_cordu_cycle : event.event_era ? 'era:' + event.event_era : 'fifth-epoch';
  let lower=null,upper=null;
  if (event.event_time) {
    lower=day(String(event.event_time)); upper=day(String(event.event_time_end || event.event_time));
  } else if (event.event_time_period) {
    lower=periodBounds(String(event.event_time_period))[0];
    upper=periodBounds(String(event.event_time_period_end || event.event_time_period))[1];
  }
  const qualifier=eventTimeQualifier(event);
  if(qualifier.kind==='around' || qualifier.kind==='unrecognized') { lower=null;upper=null; }
  else if(qualifier.kind==='after') upper=null;
  else if(qualifier.kind==='before') lower=null;
  else if(event.event_time_period && String(event.event_time_period).length===7 && !event.event_time_period_end) {
    if(qualifier.text==='第一周')upper=lower+6;
    if(qualifier.text==='上旬')upper=lower+9;
    if(qualifier.text==='中旬'){upper=lower+19;lower+=10;}
    if(qualifier.text==='下旬')lower+=20;
    if(qualifier.text==='中下旬')lower+=10;
  }
  if (lower!==null && upper!==null && lower>upper) fail('事件日期反向：' + event.entry_id);
  const uncertain=event.event_time_uncertain===true;
  let label = event.event_era ? `第${event.event_era}纪${event.event_time_note ? ' · '+event.event_time_note : ''}` : [corduCycleLabel(event),eventDateLabel(event)].filter(Boolean).join(' · ');
  if(qualifier.kind==='unrecognized' && qualifier.text)label+=' · '+qualifier.text;
  return {domain,lower,upper,qualifierStatus:qualifier.kind,reliable:!uncertain && (lower!==null || upper!==null),uncertain,
    precision:event.event_time_precision || null,certainty:event.event_time_certainty || null,kind:event.event_time_window ? 'window' : event.event_range_kind || (event.event_time_end || event.event_time_period_end ? 'range' : 'anchor'),
    label:label || '时期未定',status:uncertain ? 'uncertain' : lower!==null || upper!==null ? 'known' : 'unknown'};
}
function createRelationChronology({relations,events}) {
  if (!Array.isArray(relations) || !Array.isArray(events)) fail('需要关系与事件数组');
  const eventsById=new Map(), nodes=new Map(), stableStages=new Map(), relationsById=new Map();
  for (const e of events) {
    if (!text(e.entry_id) || eventsById.has(e.entry_id)) fail('事件 ID 缺失或重复');
    eventsById.set(e.entry_id,e);
  }
  const ensureEvent = id => {
    const event=eventsById.get(id); if (!event) fail('不存在的事件：'+id);
    const key=eventKey(id);
    if (!nodes.has(key)) nodes.set(key,{key,event,time:eventTime(event),label:event.title || id,edges:new Set()});
    return nodes.get(key);
  };
  for (const relation of relations) {
    if (!text(relation.id) || relationsById.has(relation.id)) fail('关系 ID 缺失或重复');
    if (relation.milestones!==undefined && !Array.isArray(relation.milestones)) fail('阶段须为数组：'+relation.id);
    const stages=[];
    for (const [index,stage] of (relation.milestones || []).entries()) {
      if (!object(stage)) fail('阶段须为对象：'+relation.id);
      if (stage.id!==undefined && (!text(stage.id) || /[\s/]/u.test(stage.id))) fail('阶段稳定 ID 无效：'+relation.id);
      // Legacy keys only identify an in-memory record, never a chronology claim or reference target.
      const key=stageKey(relation.id,stage.id ?? {legacy:index});
      if (nodes.has(key)) fail('关系内阶段 ID 重复：'+relation.id+'/'+stage.id);
      const node={key,relation,stage,time:{domain:null,lower:null,upper:null,reliable:false,uncertain:false,label:'时期未定',status:'unknown'},edges:new Set(),event:null,label:stage.tag || stage.note || relation.id};
      nodes.set(key,node); stages.push(node);
      if (stage.id!==undefined) stableStages.set(stageKey(relation.id,stage.id),node);
    }
    relationsById.set(relation.id,{relation,stages});
  }
  const bindings=new Map();
  for (const node of [...nodes.values()]) {
    if (!node.stage || node.stage.chronology===undefined) continue;
    const c=node.stage.chronology;
    if (!object(c) || Object.keys(c).some(k=>!['event_id','after','basis','source'].includes(k))) fail('阶段 chronology 字段无效：'+node.key);
    if (!node.stage.id || !text(node.stage.note) || !text(node.stage.source) || !text(c.basis)) fail('时间绑定须有稳定 ID、事实说明/出处及 basis：'+node.key);
    if (c.source!==undefined && !text(c.source)) fail('时间出处须为非空文本：'+node.key);
    if (c.after!==undefined && !Array.isArray(c.after)) fail('after 须为引用数组：'+node.key);
    if (c.event_id===undefined && !c.after?.length) fail('chronology 缺少时间引用：'+node.key);
    if (c.event_id!==undefined) {
      if (!text(c.event_id)) fail('event_id 无效：'+node.key);
      const en=ensureEvent(c.event_id); node.event=en.event; node.time={...en.time};
      if (!bindings.has(c.event_id)) bindings.set(c.event_id,[]);
      bindings.get(c.event_id).push(node);
    }
  }
  const explicit=[];
  for (const node of [...nodes.values()]) {
    if (!node.stage?.chronology) continue;
    const seen=new Set();
    for (const ref of node.stage.chronology.after || []) {
      if (!object(ref) || !text(ref.id)) fail('after 引用无效：'+node.key);
      let target;
      if (ref.type==='event' && Object.keys(ref).every(k=>['type','id'].includes(k))) target=ensureEvent(ref.id);
      else if (ref.type==='stage' && text(ref.relation_id) && Object.keys(ref).every(k=>['type','relation_id','id'].includes(k))) {
        target=stableStages.get(stageKey(ref.relation_id,ref.id));
        if (!target) fail('不存在的稳定阶段：'+ref.relation_id+'/'+ref.id);
      } else fail('after 须为 event 或 stage 类型引用：'+node.key);
      if (target.key===node.key || (ref.type==='event' && node.stage.chronology.event_id===ref.id)) fail('阶段不能晚于自身锚定动作：'+node.key);
      if (seen.has(target.key)) fail('after 引用重复：'+node.key);
      seen.add(target.key); explicit.push([target,node]);
      // after an event also follows stages explicitly bound to that same action.
      if (ref.type==='event') for (const bound of bindings.get(ref.id) || []) explicit.push([bound,node]);
    }
  }
  const add=(a,b)=>{if(a.key===b.key)fail('自身严格先后约束：'+a.key);a.edges.add(b.key);};
  for (const [a,b] of explicit) {
    if (a.time.reliable && b.time.reliable && a.time.domain===b.time.domain && a.time.lower!==null && b.time.upper!==null && a.time.lower>b.time.upper) fail('先后约束与日期矛盾：'+a.key+' → '+b.key);
    add(a,b);
  }
  // Compress reliable calendar inequalities into two boundary nodes per day.
  // In(day) -> Out(day) -> In(next day); stages enter at their lower bound
  // and leave at their upper bound. Same-day stages therefore never order each other.
  const dated=[...nodes.values()].filter(n=>n.time.reliable),domains=new Map();
  function boundary(domain,value,side) {
    const key=JSON.stringify(['calendar-boundary',domain,value,side]);
    if(!nodes.has(key))nodes.set(key,{key,edges:new Set(),time:{reliable:false}});
    return nodes.get(key);
  }
  for(const node of dated) {
    const t=node.time;if(!domains.has(t.domain))domains.set(t.domain,new Set());
    if(t.lower!==null){domains.get(t.domain).add(t.lower);add(boundary(t.domain,t.lower,'in'),node);}
    if(t.upper!==null){domains.get(t.domain).add(t.upper);add(node,boundary(t.domain,t.upper,'out'));}
  }
  for(const [domain,values] of domains) {
    const days=[...values].sort((a,b)=>a-b);
    for(let i=0;i<days.length;i++) {
      add(boundary(domain,days[i],'in'),boundary(domain,days[i],'out'));
      if(i)add(boundary(domain,days[i-1],'out'),boundary(domain,days[i],'in'));
    }
  }
  // Iterative topological validation avoids deep recursion. Reachability uses
  // compact bitsets, not millions of Set entries in a complete date DAG.
  const keys=[...nodes.keys()],indices=new Map(keys.map((key,i)=>[key,i]));
  const successors=keys.map(key=>[...nodes.get(key).edges].map(k=>indices.get(k)));
  const indegree=new Uint32Array(keys.length);
  for(const edges of successors)for(const target of edges)indegree[target]++;
  const queue=[];for(let i=0;i<keys.length;i++)if(!indegree[i])queue.push(i);
  const topo=[];
  for(let cursor=0;cursor<queue.length;cursor++) {
    const at=queue[cursor];topo.push(at);
    for(const target of successors[at])if(--indegree[target]===0)queue.push(target);
  }
  if(topo.length!==keys.length)fail('时间先后成环');
  const words=Math.ceil(keys.length/32),reach=keys.map(()=>new Uint32Array(words));
  for(let cursor=topo.length-1;cursor>=0;cursor--) {
    const at=topo[cursor],bits=reach[at];
    for(const target of successors[at]) {
      bits[target>>>5]|=1<<(target&31);
      const tail=reach[target];for(let word=0;word<words;word++)bits[word]|=tail[word];
    }
  }
  const precedes=(a,b)=>{
    const ai=indices.get(a),bi=indices.get(b);
    return ai!==undefined && bi!==undefined && Boolean(reach[ai][bi>>>5]&(1<<(bi&31)));
  };
  const topoPosition=new Map(topo.map((at,position)=>[keys[at],position]));
  const hasRelative=new Set(explicit.flatMap(pair=>pair.map(n=>n.key)));
  function groups(items,keyOf) {
    const active=[],unknown=[];
    for(const item of items){const node=nodes.get(keyOf(item));(node && (node.time.reliable || hasRelative.has(node.key)) ? active : unknown).push(item);}
    // Incomparability is not transitive. Merge connected incomparable items so
    // frontier layers cannot imply that every item in layer 1 precedes layer 2.
    const parent=active.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
    for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++) {
      const a=keyOf(active[i]),b=keyOf(active[j]);
      if(!precedes(a,b) && !precedes(b,a))parent[find(j)]=find(i);
    }
    const components=new Map();active.forEach((item,i)=>{const k=find(i);if(!components.has(k))components.set(k,[]);components.get(k).push(item);});
    // Incomparability components form a totally ordered quotient of a poset.
    // Numeric global topological positions order that quotient; within each
    // component they preserve proven constraints without inventing others.
    const orderedComponents=[...components.values()].sort((a,b)=>topoPosition.get(keyOf(a[0]))-topoPosition.get(keyOf(b[0])));
    const result=orderedComponents.map(component=>({status:component.length>1?'undetermined':'ordered',label:component.length>1?'先后未定':'',items:component.sort((a,b)=>topoPosition.get(keyOf(a))-topoPosition.get(keyOf(b)))}));

    if(unknown.length)result.push({status:'unknown',label:'时期未定',items:unknown.sort((a,b)=>compareText(keyOf(a),keyOf(b)))});
    return result;
  }
  function timeEvidence(node) {
    const evidence=[];
    const own=target=>{
      const c=target.stage?.chronology;
      if(target.event)evidence.push({title:target.event.title || target.event.entry_id,source:target.event.event_time_source || '',basis:target.event.event_time_basis || '',event_id:target.event.entry_id});
      if(c?.source)evidence.push({title:target.label,source:c.source,basis:c.basis});
    };
    own(node);
    for(const ref of node.stage?.chronology?.after || []) {
      const target=ref.type==='event'?nodes.get(eventKey(ref.id)):stableStages.get(stageKey(ref.relation_id,ref.id));
      if(target.stage?.source)evidence.push({title:target.label,source:target.stage.source,basis:target.stage.chronology?.basis || ''});
      own(target);
    }
    // Keep direct proof at this stage. Ancestor proofs stay on their own stable
    // target stages instead of being recursively copied into every descendant.
    return evidence.filter((item,index,all)=>all.findIndex(other=>other.source===item.source && other.basis===item.basis)===index);
  }

  function timeProjection(node) {
    const c=node.stage.chronology; const time={...node.time};
    if(!node.event && c?.after?.length) { time.label='相对阶段';time.status='relative'; }
    if(time.uncertain)time.label+='（存疑）';
    const eventPath=event=>isBriefEvent(event) ? 'timeline/#event-'+encodeURIComponent(event.event_anchor || event.title || event.entry_id) : event.path || '';
    const after=(c?.after || []).map(ref=>{
      if(ref.type==='event') {
        const event=eventsById.get(ref.id);
        return {type:ref.type,id:ref.id,label:event.title,path:eventPath(event)};
      }
      const target=stableStages.get(stageKey(ref.relation_id,ref.id));
      return {type:ref.type,id:ref.id,relation_id:ref.relation_id,label:target.label,
        path:'relationships/?a='+encodeURIComponent(target.relation.a)+'&b='+encodeURIComponent(target.relation.b)};
    });
    return {...time,basis:c?.basis || '',source:c?.source || '',after,evidence:timeEvidence(node),event:node.event?{id:node.event.entry_id,title:node.event.title,path:eventPath(node.event),source:node.event.event_time_source || '',basis:node.event.event_time_basis || ''}:null};
  }
  const byRelation=Object.create(null);const representatives=new Map();
  for(const [id,{relation,stages}]of relationsById){
    const earliest=stages.filter(a=>stages.every(b=>a===b || precedes(a.key,b.key)));
    const representative=earliest.length===1 && (earliest[0].time.reliable || hasRelative.has(earliest[0].key)) ? earliest[0] : null;
    if(representative)representatives.set(id,representative);
    const stageViews=new Map(stages.map(n=>[n.key,{id:n.stage.id || null,tag:n.stage.tag || '',note:n.stage.note || '',source:n.stage.source || '',time:timeProjection(n)}]));
    byRelation[id]={id,representative:representative?{stage_id:representative.stage.id || null,note:representative.stage.note,source:representative.stage.source,time:timeProjection(representative),scope:'earliest-recorded'}:null,
      groups:groups(stages,n=>n.key).map(g=>({...g,items:g.items.map(n=>stageViews.get(n.key))})),
      summary:relation.summary || relation.detail || relation.scope || '',sourceHint:relation.sourceHint || ''};
  }
  const people=Object.create(null);
  for(const relation of relations) for(const id of [relation.a,relation.b]) (people[id] ||= []).push(relation.id);
  for(const [id,ids] of Object.entries(people)) {
    // A missing representative has no inferred time, including when some later stages are dated.
    people[id]=groups(ids,rid=>representatives.get(rid)?.key || 'unlocated:'+rid).map(g=>({status:g.status,label:g.label,relation_ids:g.items}));
  }
  return {version:1,byRelation,people};
}
module.exports={eventTime,createRelationChronology};
