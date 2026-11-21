'use strict';
const fs = require('node:fs');
const path = require('node:path');
const fm = require('hexo-front-matter');
const root = path.resolve(__dirname, '../..');
const readJSON = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
function pages(directory) {
  return fs.readdirSync(path.join(root, directory)).filter(name => name.endsWith('.md')).sort().map(name => {
    const data = fm.parse(fs.readFileSync(path.join(root, directory, name), 'utf8'));
    return {...data, source: directory.replace(/^source\//, '') + '/' + name,
      path: String(data.permalink || directory.replace(/^source\//, '') + '/' + name.slice(0, -3) + '/').replace(/^\//, '')};
  });
}
function loadModel() {
  const profiles = pages('source/characters/entries');
  const events = pages('source/timeline').filter(p => p.timeline_event === true);
  const stats = readJSON('source/_data/character_statistics.json');
  const relations = readJSON('source/_data/relations.json');
  const categories = readJSON('source/_data/relationship_categories.json');
  const ids = new Set();
  const statisticsFields = new Set(['mentions','mentionTerm','counts','matchNote','directory']);
  for (const [id, record] of Object.entries(stats)) {
    if (Object.keys(record).some(key => !statisticsFields.has(key))) throw Error('统计数据不得覆盖人物事实: ' + id);
  }
  const paths = new Set();
  for (const entry of [...profiles, ...events]) {
    if (typeof entry.entry_id !== 'string' || !entry.entry_id.trim() || ids.has(entry.entry_id)) throw Error('缺少或重复 entry_id: ' + entry.source);
    ids.add(entry.entry_id);
    if (paths.has(entry.path)) throw Error('重复公开路径: ' + entry.path);
    paths.add(entry.path);
  }
  const characters = profiles.filter(p => p.graph_visible !== false).map(p => {
    const data = p.graph_profile || {};
    if ((data.classificationEvidence || []).some(f => ['organization','nationality'].includes(f.kind))) throw Error('组织与国籍只能维护于 graph_classifications: ' + p.source);
    const evidence = [...(data.classificationEvidence || [])];
    for (const kind of Object.keys(p.graph_classifications || {})) {
      for (const fact of p.graph_classifications?.[kind] || []) {
        if (!fact.value || !fact.source) throw Error('分类缺少名称或出处: ' + p.source);
        evidence.push({kind, ...fact});
      }
    }
    return {...data, id:p.entry_id, name:data.name || p.title, ...(stats[p.entry_id] || {}),
      classificationEvidence: evidence,
      ordinaryInCitedPeriod:p.ordinary_in_cited_period === true || undefined,
      ordinaryInCitedPeriodInferred:p.ordinary_in_cited_period === 'inferred' || undefined,
      documentProfileUrl:'../' + p.path.split('/').map(encodeURIComponent).join('/')};
  });
  const people = new Map(characters.map(p => [p.id, p]));
  const relationIds = new Set();
  for (const r of relations) {
    if (!r.id || relationIds.has(r.id) || !people.has(r.a) || !people.has(r.b) || r.a === r.b) throw Error('关系 ID 或端点无效: ' + r.id);
    relationIds.add(r.id);
    if ((r.categories || []).some(c => !categories.includes(c))) throw Error('关系类别无效: ' + r.id);
    if (Object.entries(r.direction || {}).some(([c,d]) => !r.categories.includes(c) || !['a-to-b','b-to-a','both'].includes(d))) throw Error('关系方向无效: ' + r.id);
  }
  const positions = new Set();
  for (const event of events) {
    const order = event.narrative_order;
    if (!order || !order.volume || order.work !== event.event_work || !Number.isFinite(order.position) || positions.has(order.position)) throw Error('事件叙述顺序无效: ' + event.source);
    positions.add(order.position);
    for (const field of ['event_time','event_time_end']) {
      const date = event[field];
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date)) throw Error('事件日期无效: ' + event.source);
    }
    if (event.event_time_period && (!/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(String(event.event_time_period)) || event.event_time_precision !== 'partial' || event.event_time || !event.event_time_basis || !['stated','inferred'].includes(event.event_time_certainty))) throw Error('事件年月或依据无效: ' + event.source);
    if (event.event_time_period_end && (!event.event_time_period || !/^\d{4}(?:-(?:0[1-9]|1[0-2]))?$/.test(String(event.event_time_period_end)) || String(event.event_time_period_end).length !== String(event.event_time_period).length || event.event_time_period_end < event.event_time_period)) throw Error('事件年月范围无效: ' + event.source);
    if (event.event_time_end && (!event.event_time || event.event_time_end < event.event_time)) throw Error('事件日期范围无效: ' + event.source);
  }
  events.sort((a,b) => a.narrative_order.position - b.narrative_order.position);
  const directory = {};
  // Derive directory pathways from the same evidence as the graph.
  const sequencePaths = new Map();
  const pathwayRoot = path.join(root,'source/worldview/pathways');
  for(const dir of fs.readdirSync(pathwayRoot,{withFileTypes:true}).filter(d=>d.isDirectory())) {
    for(const file of fs.readdirSync(path.join(pathwayRoot,dir.name)).filter(f=>f.endsWith('.md'))) {
      const p=fm.parse(fs.readFileSync(path.join(pathwayRoot,dir.name,file),'utf8'));
      if(p['sequence-name'])sequencePaths.set(p['sequence-name'],dir.name);
    }
  }
  sequencePaths.set('宿命','舞蹈家途径');
  sequencePaths.set('黑夜','不眠者途径');
  for(const p of profiles) {
    const person=people.get(p.entry_id), st=stats[p.entry_id] || {};
    const pathways=new Map();
    for(const fact of [...(person?.classificationEvidence || []),...(person?.progression || [])]) {
      if(fact.relation==='authority')continue;
      const value=fact.pathway || (['pathway','sequence'].includes(fact.kind)?fact.value:null);
      if(!value)continue;
      const name=sequencePaths.get(value) || (fact.kind==='sequence'?null:value+'途径');
      if(name)pathways.set(name,(pathways.get(name) ?? true) && fact.certainty==='inferred');
    }
    directory[path.basename(p.source,'.md')]={...(st.directory || {}),counts:st.counts || {},pathways:[...pathways].map(([name,inferred])=>({name,inferred}))};
  }
  return {profiles,characters,events,relations,categories,directory};
}
module.exports={loadModel};
if(require.main===module)process.stdout.write(JSON.stringify(loadModel()));
