'use strict';
const fs = require('node:fs');
const path = require('node:path');
const fm = require('hexo-front-matter');
const root = path.resolve(__dirname, '../..');
const readJSON = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
function validateCharacterSource(profile) {
  const graph = profile.graph_profile || {};
  if (Object.hasOwn(profile, 'character_record_tables') && typeof profile.character_record_tables !== 'boolean') {
    throw Error('人物共享记录开关必须为布尔值: ' + profile.source);
  }
  if (['documentProfile', 'documentExcerpt'].some(key => Object.hasOwn(graph, key) || Object.hasOwn(profile, key))) {
    throw Error('人物图谱简介只能从正式正文生成，不得维护摘要副本: ' + profile.source);
  }
  for (const fact of profile.profile_facts || []) {
    if (Object.hasOwn(fact, 'summary') || fact.label === '所属作品') {
      throw Error('人物信息栏不得维护摘要或作品副本，请使用正文定位及 profile_work: ' + profile.source);
    }
    if (fact.source_section) {
      const sections=[...String(profile._content || '').matchAll(/^#{2,6} (.+)$/gm)].map(match=>match[1].trim());
      if (!sections.includes(fact.source_section)) throw Error('人物信息栏指向不存在的正文小节: ' + profile.source + ' / ' + fact.source_section);
    }
  }
}
function pages(directory) {
  return fs.readdirSync(path.join(root, directory)).filter(name => name.endsWith('.md')).sort().map(name => {
    const data = fm.parse(fs.readFileSync(path.join(root, directory, name), 'utf8'));
    return {...data, source: directory.replace(/^source\//, '') + '/' + name,
      path: String(data.permalink || directory.replace(/^source\//, '') + '/' + name.slice(0, -3) + '/').replace(/^\//, '')};
  });
}
function directoryPathways(person,sequencePaths) {
  const pathways=new Map();
  for(const fact of [...(person?.classificationEvidence || []),...(person?.progression || [])]) {
      if(fact.relation && fact.relation!=='member')continue;
      const value=fact.pathway || (['pathway','sequence'].includes(fact.kind)?fact.value:null);
      if(!value)continue;
      const name=sequencePaths.get(value) || (fact.kind==='sequence'?null:value+'途径');
      if(name)pathways.set(name,(pathways.get(name) ?? true) && fact.certainty==='inferred');
    }
  return [...pathways].map(([name,inferred])=>({name,inferred}));
}
function loadModel() {
  // Character pages have one canonical source. Alias stubs and compatibility
  // documents must not quietly generate additional public routes.
  const characterRoot = path.join(root, 'source/characters');
  for (const file of fs.readdirSync(characterRoot, {recursive:true})) {
    if (file.endsWith('.md') && file !== 'index.md' && !/^entries\/[^/]+\.md$/.test(file)) {
      throw Error('人物目录只保留正式档案，不允许别名或兼容文档: ' + file);
    }
  }
  const profiles = pages('source/characters/entries');
  profiles.forEach(validateCharacterSource);
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
  const eventsById = new Map(events.map(event => [event.entry_id, event]));
  for (const event of events) {
    if (event.event_cordu_cycle !== undefined && (
      ![1, 2, 3].includes(event.event_cordu_cycle) ||
      event.event_work !== '宿命之环' ||
      !/^1358-(03|04)/.test(event.event_time || event.event_time_period || '') ||
      event.event_range_kind
    )) throw Error('科尔杜循环须有有效轮次及村内日期: ' + event.source);
    if (event.event_time_during !== undefined) {
      const span = eventsById.get(event.event_time_during);
      if (!span?.event_range_kind || event.event_time_end || event.event_time_window ||
          !event.event_time_basis || ![span.event_time, span.event_time_end].includes(event.event_time)) {
        throw Error('跨日首末日的同期事件须引用有效区间并注明日内依据: ' + event.source);
      }
    }
    if (event.event_time_after !== undefined) {
      const predecessor = eventsById.get(event.event_time_after);
      if (!event.event_time_period || event.event_time || !predecessor?.event_time ||
          !predecessor.event_time.startsWith(event.event_time_period) || !event.event_time_basis) {
        throw Error('相对时间须引用同一时期内有日号的前序事件: ' + event.source);
      }
    }
    if (event.event_era_order !== undefined && (!event.event_era || !Number.isSafeInteger(event.event_era_order) || event.event_era_order < 1)) {
      throw Error('纪内顺序须为正整数并对应已知纪元: ' + event.source);
    }
    if (event.event_era !== undefined && (![1,2,3,4].includes(event.event_era) || event.event_time || event.event_time_period || !event.event_time_note || !event.event_time_basis)) {
      throw Error('纪元事件须有纪元依据，且不能混用第五纪日期: ' + event.source);
    }
    if (event.event_calendar_label !== undefined && (typeof event.event_calendar_label !== 'string' || !event.event_calendar_label.trim() || [...event.event_calendar_label].length > 24 || /[\r\n]/.test(event.event_calendar_label))) throw Error('日历事件名须为非空单行名称，且不超过24字: ' + event.source);
    if (event.event_range_kind && (!['staged','continuous'].includes(event.event_range_kind) || !event.event_time_end || event.event_time_window || event.event_time_precision !== 'range')) throw Error('跨日事件类型或日期范围无效: ' + event.source);
    if (event.event_display && !['brief','detail'].includes(event.event_display)) throw Error('事件展示类型无效: ' + event.source);
    if (event.event_display && (!event.event_summary?.trim() || !event.event_source?.trim())) throw Error('已整理事件缺少概括或事实出处: ' + event.source);
    if (/[（()）]/u.test(event.event_time_qualifier || '')) throw Error('日期限定只写时间词，括号说明请移入依据: ' + event.source);
    if (/^(?:第[一二三四五六七八九十百〇零\d]+[次场]塔罗会|塔罗会\s*[·・])/u.test(event.title)) {
      throw Error('塔罗会标题须使用会议名称，议题写入概括: ' + event.source);
    }
    if (event.event_time_qualifier && (typeof event.event_time_qualifier !== 'string' || !event.event_time_basis || !(event.event_time || event.event_time_period))) throw Error('事件时间限定缺少日期或依据: ' + event.source);
    const hasWindowEnd = event.event_time_period_end || (event.event_time && event.event_time_end && event.event_time_precision === 'range');
    if (event.event_time_uncertain !== undefined && (typeof event.event_time_uncertain !== 'boolean' || (event.event_time_uncertain && !event.event_time_basis))) throw Error('事件日期存疑标记须为布尔值，并注明依据: ' + event.source);
    if (event.event_time_window !== undefined && (typeof event.event_time_window !== 'boolean' || (event.event_time_window && (!hasWindowEnd || !event.event_time_basis)))) throw Error('事件可能时间窗口无效: ' + event.source);
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
    directory[path.basename(p.source,'.md')]={...(st.directory || {}),counts:st.counts || {},pathways:directoryPathways(person,sequencePaths)};
  }
  const countries = pages('source/worldview/countries/entries');
  const mapSupplemental=['organizations','history'].flatMap(section=>fs.readdirSync(path.join(root,'source/worldview',section),{recursive:true}).filter(file=>file.endsWith('.md')).flatMap(file=>{
    const source='worldview/'+section+'/'+file;
    const text=fs.readFileSync(path.join(root,'source',source),'utf8');
    if(!/^map_(cities|placements|annotations|barriers):/m.test(text))return [];
    return [{...fm.parse(text),source}];
  }));
  const {buildWorldMap} = require('./world-map');
  const worldMap = buildWorldMap({geometry:readJSON('source/_data/world_map_geometry.json'), earth:readJSON('source/_data/world_map_earth.json'), countries: [...countries,...profiles.filter(p=>p.map_placements?.length),...mapSupplemental], events});
  return {profiles,characters,events,relations,categories,directory,countries,worldMap};
}
module.exports={loadModel,validateCharacterSource,directoryPathways};
if(require.main===module)process.stdout.write(JSON.stringify(loadModel()));
