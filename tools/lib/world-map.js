'use strict';
const {compileGeometry}=require('./map-geometry');
const palette=require('../../source/relationships/group-palette');
// Drawing coordinates live in geometry; historical assignments live on entries.
function buildWorldMap({geometry, earth, countries, events}) {
  const fail = message => { throw Error('地图数据：' + message); };
  const {variants:sourceVariants,...sharedGeometry}=geometry;
  const variants=Object.fromEntries(Object.entries(geometry.variants||{}).map(([key,value])=>[key,compileGeometry({...sharedGeometry,...value})]));
  const {variants:rawVariants,...baseGeometry}=geometry;
  geometry=compileGeometry(baseGeometry);
  if (geometry.version !== 2 || geometry.viewBox?.length !== 4 || geometry.viewBox.some(n => !Number.isFinite(n))) fail('无效画布');
  const shapes = geometry.shapes || {};
  for (const [id, shape] of Object.entries(shapes)) {
    if (!/^[a-z-]+$/.test(id) || !/^[MLHVZCQSTAmlhvzcqsta0-9.,\s-]+$/.test(shape.path || '') || shape.label?.length !== 2 || shape.label.some(n => !Number.isFinite(n))) fail('无效轮廓 ' + id);
    if (shape.clip && (!shapes[shape.clip] || shape.clip === id)) fail('无效裁切 ' + id);
  }
  if (!geometry.coasts?.length || geometry.coasts.some(id => !shapes[id])) fail('无效海岸');
  for (const event of events) if (event.map_checkpoint !== undefined && typeof event.map_checkpoint !== 'boolean') fail('事件开关须为布尔值');
  // Content and evidence live on entries/events; map records may only reference them.
  for(const page of [...countries,...events])for(const key of ['map_placements','map_cities','map_annotations','map_landforms','map_barriers','map_transition','map_geography']){
    const values=page[key]===undefined?[]:Array.isArray(page[key])?page[key]:[page[key]];
    for(const value of values)if(value && ['source','summary','description','excerpt','schematic_note'].some(field=>Object.hasOwn(value,field)))fail('地图字段不得重复维护正文或来源 '+(page.title||page.entry_id)+' '+key);
  }
  const checkpoints = events.filter(e => e.map_checkpoint).map(e => {
    const era = e.event_era || 5;
    const date = e.event_time || e.event_time_period;
    if (era === 5 && !date) fail('第五纪节点缺少日期 ' + e.entry_id);
    if (era < 5 && !e.event_era_order) fail('古代节点缺少顺序 ' + e.entry_id);
    if(e.map_geometry && !variants[e.map_geometry])fail('未知历史地图 '+e.map_geometry);
    return {id:e.entry_id, geometryVariant:e.map_geometry, transition:e.map_transition?{...e.map_transition,source:e.event_source}:undefined, dateInferred:e.event_time_certainty==='inferred', era, order:era < 5 ? e.event_era_order : Number(date.replace(/-/g,'').padEnd(8,'0')), date:date || '', label:era < 5 ? e.event_time_note : date.replace(/^0+/,''), title:e.title, summary:e.event_summary, source:e.event_source};
  }).sort((a,b) => a.era-b.era || a.order-b.order);
  const index = new Map(checkpoints.map((c,i) => [c.id, i]));
  const regions = [], annotations = [], landforms = [], barriers = [], geography=[];
  for(const event of events){
    if(event.map_geography!==undefined&&!Array.isArray(event.map_geography))fail('地理变化须为数组');
    for(const item of event.map_geography||[]){
      const start=index.get(event.entry_id),at=geometry.points?.[item.point];
      if(start===undefined||!item.id?.trim()||!item.name?.trim()||!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite))fail('无效地理变化 '+event.entry_id);
      if(geography.some(g=>g.id===item.id))fail('地理变化标识重复 '+item.id);
      if(!event.event_source?.trim())fail('地理变化事件缺少来源 '+event.entry_id);
      geography.push({...item,at,start,event:event.entry_id,source:event.event_source});
    }
  }
  const cities = [], cityIds=new Set();
  for (const country of countries) {
    if (country.map_placements !== undefined && !Array.isArray(country.map_placements)) fail('国家位置须为数组');
    const colors=palette[country.map_palette?.group]?.[country.map_palette?.key];
    if (country.map_placements?.length && !colors) fail('国家缺少共享色卡引用 ' + country.title);
    if(country.map_cities!==undefined&&!Array.isArray(country.map_cities))fail('城市标记须为数组');
    for(const city of country.map_cities || []) {
      const at=geometry.points?.[city.point];
      if(!city.id||cityIds.has(city.id)||!city.name?.trim()||!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite))fail('无效城市标记 '+country.title);
      if(city.region_required!==undefined&&typeof city.region_required!=='boolean')fail('无效城市区域约束');
      if(city.anchor!==undefined&&(typeof city.anchor!=='string'||!city.anchor.trim()))fail('无效城市锚点');
      if(city.periods!==undefined&&(!Array.isArray(city.periods)||!city.periods.length||city.event))fail('无效城市时期');
      cityIds.add(city.id);
      for(const period of city.periods||[{event:city.event,until:city.until}]){
        const start=index.get(period.event),end=period.until?index.get(period.until):undefined;
        if(start===undefined||(period.until&&(end===undefined||end<=start||checkpoints[end].era!==checkpoints[start].era)))fail('无效城市时期 '+city.name);
        cities.push({...city,...period,at,start,end,era:checkpoints[start].era,country:country.title,sourcePath:country.source});
      }
    }
    if(country.map_barriers!==undefined&&!Array.isArray(country.map_barriers))fail('屏障标注须为数组');
    for(const item of country.map_barriers||[]){
      const start=index.get(item.event),shape=geometry.barrierShapes?.[item.geometry];
      const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
      if(start===undefined||!item.name?.trim()||!shape||!geometry.shapes[shape.clip]||!point(shape.label)||!Array.isArray(shape.polygon)||shape.polygon.length<3||!shape.polygon.every(point)||!Array.isArray(shape.frontier)||shape.frontier.length<2||!shape.frontier.every(point))fail('无效屏障标注');
      barriers.push({...item,...shape,start,title:item.name,sourcePath:country.source});
    }
    if(country.map_annotations!==undefined&&!Array.isArray(country.map_annotations))fail('地区标注须为数组');
    for(const item of country.map_annotations || []) {
      const start=index.get(item.event),end=item.until?index.get(item.until):undefined,at=geometry.points?.[item.point];
      if(!item.name?.trim()||start===undefined||!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite))fail('无效地区标注 '+country.title);
      if(item.until&&(end===undefined||end<=start||checkpoints[end].era!==checkpoints[start].era))fail('无效地区标注时期');
      let outlinePaths;
      if(item.outline!==undefined){
        if(!item.outline||typeof item.outline.shape!=='string'||(item.outline.variant!==undefined&&typeof item.outline.variant!=='string'))fail('无效地区轮廓 '+country.title);
        const outlineGeometry=item.outline.variant?variants[item.outline.variant]:geometry;
        const shape=outlineGeometry?.shapes[item.outline.shape];
        if(!shape)fail('无效地区轮廓 '+country.title);
        outlinePaths=shape.arcIds.map(id=>outlineGeometry.arcs[id].path);
      }
      annotations.push({...item,outlinePaths,title:country.title,at,start,end,era:checkpoints[start].era,sourcePath:country.source});
    }
    if(country.map_landforms!==undefined&&!Array.isArray(country.map_landforms))fail('地形标注须为数组');
    for(const item of country.map_landforms||[]){
      const start=index.get(item.event),points=geometry.landformPaths?.[item.geometry];
      if(!item.name||item.certainty!=='inferred'||!['mountain','river','plateau'].includes(item.type)||start===undefined||!Array.isArray(points)||points.length<2||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))fail('无效地形标注 '+country.title);
      if(item.schematic_eras!==undefined&&(!Array.isArray(item.schematic_eras)||!item.schematic_eras.length||new Set(item.schematic_eras).size!==item.schematic_eras.length||item.schematic_eras.some(era=>!Number.isInteger(era)||era<1||era>5)))fail('无效地形示意时期 '+country.title);
      if(item.era_names!==undefined&&(!item.era_names||Array.isArray(item.era_names)||typeof item.era_names!=='object'||Object.entries(item.era_names).some(([era,name])=>!['1','2','3','4','5'].includes(era)||typeof name!=='string'||!name.trim())))fail('无效地形时期名称 '+country.title);
      landforms.push({...item,points,start,era:checkpoints[start].era});
    }
    for (const placement of country.map_placements || []) {
      const start = index.get(placement.event), end = placement.until ? index.get(placement.until) : undefined;
      if (start === undefined || !(variants[checkpoints[start]?.geometryVariant]||geometry).shapes[placement.shape]) fail('位置缺少节点或轮廓 ' + country.title+' '+placement.event+' '+placement.shape+' '+checkpoints[start]?.geometryVariant);
      if (placement.until && (end === undefined || end <= start || checkpoints[end].era !== checkpoints[start].era)) fail('无效结束节点 ' + country.title);
      if(placement.certainty!==undefined&&!['inferred','stated'].includes(placement.certainty))fail('无效疆域确定性');
      if(placement.name!==undefined && !placement.name.trim())fail('无效势力名称');
      regions.push({certainty:placement.certainty,colors,title:placement.name||country.title,sourcePath:country.source,path:country.path,shape:placement.shape,start,end,era:checkpoints[start].era,event:placement.event});
    }
  }
  checkpoints.forEach((c,i) => {
    const active=regions.filter(r=>r.era===c.era && r.start<=i && (r.end===undefined || i<r.end));
    for(const r of active)if(!(variants[c.geometryVariant]||geometry).shapes[r.shape])fail('历史截面缺少轮廓 '+r.shape);
    if (new Set(active.map(r=>r.shape)).size!==active.length) fail('同一截面轮廓重复');
    c.regions=active;
    c.barriers=barriers.filter(b=>b.start<=i);
    c.geography=geography.filter(g=>g.start<=i);
    c.landforms=landforms.filter(a=>(a.era===c.era&&a.start<=i)||a.schematic_eras?.includes(c.era)).map(a=>{
      const schematic=!(a.era===c.era&&a.start<=i);
      const name=a.era_names?.[c.era] || (schematic?{mountain:'山脉',river:'河流',plateau:'高原'}[a.type]:a.name);
      return {...a,name,schematic};
    });
    c.annotations=annotations.filter(a=>a.era===c.era&&a.start<=i&&(a.end===undefined||i<a.end));
    c.cities=cities.filter(city=>city.era===c.era&&city.start<=i&&(city.end===undefined||i<city.end)&&(city.region_required===false||active.some(r=>r.sourcePath===city.sourcePath)));
    if(new Set(c.cities.map(city=>city.id)).size!==c.cities.length)fail('城市时期重叠 '+c.id);
  });
  for(const [i,c] of checkpoints.entries())if(c.transition){
    const t=c.transition, prior=checkpoints[i-1];
    if(!prior || t.from!==prior.id || !['split','transfer','collapse'].includes(t.kind) || t.geometry!=='schematic' || typeof t.source!=='string' || !t.source.trim())fail('无效历史过渡 '+c.id);
    for(const [side,state] of [['before',prior],['after',c]]){
      if(!Array.isArray(t[side]) || new Set(t[side]).size!==t[side].length || t[side].some(id=>!state.regions.some(r=>r.shape===id)))fail('过渡引用不属于相邻截面 '+c.id);
    }
    if(!t.before.length || (t.kind==='split'&&t.after.length<2) || (t.kind==='transfer'&&!t.after.length) || (t.kind==='collapse'&&t.after.length))fail('过渡类型与区域不匹配 '+c.id);
  }
  const basemaps={};
  if(earth){
    basemaps.earth=compileGeometry(earth);
    if(earth.viewBox?.length!==4||!earth.viewBox.every(Number.isFinite)||!earth.coasts?.length||earth.coasts.some(id=>!basemaps.earth.shapes[id]))fail('无效地球底图');
    const migration=require('../../source/_data/world_map_migration.json');
    if(typeof migration.scope!=='string'||!migration.scope.trim())fail('迁移缺少示意范围');
    if(!Array.isArray(migration.splits)||migration.splits.some(s=>!earth.shapes[s.shape]?.rings[s.ring]||!Array.isArray(s.at)||s.at.length!==2||s.at.some(n=>!Number.isFinite(n)||n<0||n>1)))fail('无效迁移轮廓拆分');
    if(checkpoints[0]?.era===1)checkpoints[0].transition={kind:'migration',from:'map-prehistory',...migration};
    checkpoints.unshift({id:'map-prehistory',era:0,order:0,date:'',labelKey:'map_prehistory',titleKey:'map_earth',basemap:'earth',regions:[],cities:[],annotations:[],landforms:[],barriers:[],geography:[]});
  }
  return {geometry,variants,basemaps,checkpoints};
}
module.exports={buildWorldMap};
