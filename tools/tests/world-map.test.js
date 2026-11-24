'use strict';
const assert=require('node:assert/strict');
const {buildWorldMap}=require('../lib/world-map');
const geometry={version:2,viewBox:[0,0,100,100],coasts:['land'],arcs:[{points:[[0,0],[100,0],[100,100],[0,0]]}],shapes:{land:{rings:[[1]],label:[50,50]}}};
const events=[{entry_id:'old',map_checkpoint:true,event_era:4,event_era_order:10},{entry_id:'end',map_checkpoint:true,event_era:4,event_era_order:20},{entry_id:'new',map_checkpoint:true,event_time_period:'1349'}];
const countries=[{title:'test',path:'country/',map_palette:{group:'nationality',key:'鲁恩'},map_placements:[{event:'old',until:'end',shape:'land'}]}];
const result=buildWorldMap({geometry,countries,events});
assert.equal(result.checkpoints[0].regions.length,1);
assert.equal(result.checkpoints[0].regions[0].colors.primary,require('../../source/relationships/group-palette').nationality['鲁恩'].primary);
assert.equal(result.checkpoints[1].regions.length,0,'End checkpoint must exclude the expired region');
assert.equal(result.checkpoints[2].regions.length,0,'A region must not leak into a later epoch');
for (const bad of [{event:'missing',shape:'land'},{event:'old',shape:'missing'},{event:'old',until:'new',shape:'land'},{event:'old',shape:'land',source:'重复来源'}]) {
 assert.throws(()=>buildWorldMap({geometry,countries:[{...countries[0],map_placements:[bad]}],events}),/地图数据/);
}
assert.throws(()=>buildWorldMap({geometry,countries:[...countries,...countries],events}),/轮廓重复/);
console.log('World map: period boundaries, missing references, source requirements and duplicate assignments pass.');

const {compileGeometry}=require('../lib/map-geometry');
const shared={version:2,arcs:[{points:[[0,0],[5,5],[0,10]]},{points:[[0,10],[-10,10],[-10,0],[0,0]]},{points:[[0,0],[10,0],[10,10],[0,10]]}],shapes:{left:{rings:[[1,2]],label:[-5,5]},right:{rings:[[-1,3]],label:[5,5]}}};
const compiled=compileGeometry(shared);
assert.deepEqual(compiled.shapes.left.arcIds,[0,1]);
assert.deepEqual(compiled.shapes.right.arcIds,[0,2]);
assert.equal(compiled.arcs.length,3,'Neighbors reference a single shared curve');
assert.throws(()=>compileGeometry({...shared,shapes:{bad:{rings:[[1,3]],label:[0,0]}}}),/未闭合/);
assert.throws(()=>compileGeometry({...shared,shapes:{bad:{rings:[[99]],label:[0,0]}}}),/未知边界/);
const actual=compileGeometry(require('../../source/_data/world_map_geometry.json'));
const owners=new Map();
for(const [id,shape] of Object.entries(actual.shapes))if(id.startsWith('north-'))for(const ref of shape.rings.flat()){
 const uses=owners.get(Math.abs(ref))||[];uses.push(ref);owners.set(Math.abs(ref),uses);
}
let sharedCount=0;
for(const uses of owners.values())if(uses.length>1){assert.equal(uses.length,2);assert.equal(uses[0],-uses[1]);sharedCount++;}
assert.ok(sharedCount>0,'Actual adjacent regions must use reversed shared arcs');
console.log('Shared topology: exact reversed boundaries, closed rings and invalid references pass.');
const cityCountry={...countries[0],source:'country.md',map_cities:[{id:'city',name:'城市',point:'city',event:'old'}]};
const cityGeometry={...geometry,points:{city:[20,20]}};
const cityModel=buildWorldMap({geometry:cityGeometry,countries:[cityCountry],events});
assert.equal(cityModel.checkpoints[0].cities.length,1);
assert.equal(cityModel.checkpoints[1].cities.length,0,'City markers follow the active country period');
assert.equal(cityModel.checkpoints[2].cities.length,0,'Cities cannot leak into another epoch');
for(const bad of [{point:'missing'},{event:'missing'}])assert.throws(()=>buildWorldMap({geometry:cityGeometry,countries:[{...cityCountry,map_cities:[{...cityCountry.map_cities[0],...bad}]}],events}),/无效城市/);
console.log('City markers: geometry, source, event references and period filtering pass.');
const earth=require('../../source/_data/world_map_earth.json');
const withEarth=buildWorldMap({geometry,earth,countries,events});
assert.equal(withEarth.checkpoints[0].era,0);
assert.equal(withEarth.checkpoints[0].basemap,'earth');
assert.deepEqual(withEarth.checkpoints[0].regions,[]);
assert.deepEqual(withEarth.checkpoints[0].cities,[]);
assert.equal(withEarth.checkpoints[1].regions.length,1,'Prehistory does not shift historical placement indexes');
assert.ok(withEarth.basemaps.earth.shapes.earth.path.length>1000);
assert.equal(withEarth.basemaps.earth.smoothing,'none','Real coastlines must not undergo fictional smoothing');
console.log('Prehistory: real land data, separate basemap, no modern political borders or historical marker leakage pass.');
const fs=require('node:fs');
const currentGeometry=require('../../source/_data/world_map_geometry.json');
const referenceLayout=require('../../source/_data/world_map_reference_layout.json');
assert.deepEqual(currentGeometry.points,referenceLayout.points,'Rebuild the map after editing city layout');
assert.deepEqual(currentGeometry.pointLabels,referenceLayout.pointLabels);
function inPolygon(p,poly){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit;
}
function inShape(p,id,raw=currentGeometry){
 return raw.shapes[id].rings.reduce((hit,ring)=>{
  const poly=ring.flatMap(ref=>{const points=raw.arcs[Math.abs(ref)-1].points;return ref>0?points:points.slice().reverse();});
  return inPolygon(p,poly)?!hit:hit;
 },false);
}
const coverageModel=require('../lib/content-model').loadModel().worldMap;
for(const checkpoint of coverageModel.checkpoints){
 if(checkpoint.basemap)continue;
 const raw=currentGeometry.variants?.[checkpoint.geometryVariant]||currentGeometry;
 for(const city of checkpoint.cities){
  if(city.region_required===false){assert.ok(raw.coasts.some(id=>inShape(city.at,id,raw)),'Independent city must lie on land: '+city.name);continue;}
  const regions=checkpoint.regions.filter(r=>r.sourcePath===city.sourcePath);
  assert.ok(regions.some(r=>inShape(city.at,r.shape,raw)),'City outside assigned map region: '+city.name+' '+checkpoint.id);
 }
}
console.log('Reference redraw: generated coordinates match the layout and every city lies inside its assigned region.');

// A loop touching another coast at its endpoint must not move that junction.
const touching={version:2,arcs:[{points:[[0,0],[10,0],[10,10],[0,0]]},{points:[[0,0],[-10,0],[-10,-10],[0,0]]}],shapes:{land:{rings:[[1,2]],label:[0,0]}}};
assert.doesNotThrow(()=>compileGeometry(touching));
assert.equal(currentGeometry.provenance.asset,'docs/maps/world-land-concept-v4.png');
assert.ok(currentGeometry.coasts.includes('old-world'));
assert.ok(!currentGeometry.coasts.includes('east')&&!currentGeometry.coasts.includes('west'));
console.log('V4 baseline and joined closed-arc smoothing pass.');

assert.deepEqual(currentGeometry.focus,currentGeometry.points.backlund,'Default historical view must center Backlund');
assert.ok(Math.abs(earth.focus[0]-(105+180)/360*1240)<.01,'Prehistory focuses China longitude');
assert.ok(inShape([700,170],'north-north'),'Sonia island belongs wholly to Feysac at the default checkpoint');
assert.throws(()=>compileGeometry({...geometry,focus:[NaN,0]}),/无效初始视点/);
const terrainCountry={...countries[0],map_landforms:[{name:'山脉',geometry:'ridge',type:'mountain',event:'old',certainty:'inferred'}]};
const terrainGeometry={...geometry,landformPaths:{ridge:[[10,10],[20,20]]}};
const terrainModel=buildWorldMap({geometry:terrainGeometry,countries:[terrainCountry],events});
assert.equal(terrainModel.checkpoints[0].landforms.length,1);
assert.equal(terrainModel.checkpoints[2].landforms.length,0);
for(const schematic_eras of [[0],[6],[1,1],[],'all'])assert.throws(()=>buildWorldMap({geometry:terrainGeometry,countries:[{...terrainCountry,map_landforms:[{...terrainCountry.map_landforms[0],schematic_eras}]}],events}),/无效地形示意时期/);
assert.doesNotThrow(()=>buildWorldMap({geometry:terrainGeometry,countries:[{...terrainCountry,map_landforms:[{...terrainCountry.map_landforms[0],schematic_eras:[1,2]}]}],events}));

assert.throws(()=>buildWorldMap({geometry,countries:[terrainCountry],events}),/无效地形/);
assert.throws(()=>buildWorldMap({geometry:terrainGeometry,countries:[{...terrainCountry,map_landforms:[{...terrainCountry.map_landforms[0],certainty:'stated'}]}],events}),/无效地形/);
assert.ok(currentGeometry.arcs.some(a=>a.smoothing==='light'&&a.curveTension===.45),'Internal borders use local detail with restrained corner rounding');

assert.ok(!currentGeometry.shapes['north-unmapped'],'The highland states must not leave an unassigned ribbon');
for(const id of ['north-lenburg','north-masik','north-segar'])assert.ok(currentGeometry.shapes[id]?.rings.length,'Missing highland state '+id);

// Historical masks are independently partitioned and cannot leak across checkpoints.
const historicalFixture={...geometry,variants:{old:{...geometry,shapes:{historical:{rings:[[1]],label:[50,50]}}}}};
const periodFixture=[{...events[0],map_geometry:'old'},events[1],events[2]];
const historic=buildWorldMap({geometry:historicalFixture,countries:[{...countries[0],map_placements:[{event:'old',until:'end',shape:'historical',name:'旧势力'}]}],events:periodFixture});
assert.equal(historic.checkpoints[0].geometryVariant,'old');
assert.equal(historic.checkpoints[0].regions[0].title,'旧势力');
assert.equal(historic.checkpoints[1].regions.length,0);
assert.throws(()=>buildWorldMap({geometry:historicalFixture,countries:[],events:[{...events[0],map_geometry:'missing'}]}),/未知历史地图/);
assert.throws(()=>buildWorldMap({geometry:historicalFixture,countries:[{...countries[0],map_placements:[{event:'old',shape:'historical'}]}],events:periodFixture}),/历史截面缺少轮廓/);
for(const [name,variant] of Object.entries(currentGeometry.variants)) {
 const result=compileGeometry(variant), coastal=new Set(variant.coasts.flatMap(id=>result.shapes[id].arcIds));
 const ownership=new Map();
 for(const [id,shape] of Object.entries(variant.shapes))if(!variant.coasts.includes(id))for(const ref of shape.rings.flat()){
  if(coastal.has(Math.abs(ref)-1))continue;
  const uses=ownership.get(Math.abs(ref))||[];uses.push(ref);ownership.set(Math.abs(ref),uses);
 }
 for(const uses of ownership.values()){assert.equal(uses.length,2,name+' shared boundary');assert.equal(uses[0],-uses[1]);}
 assert.ok(variant.arcs.some(a=>a.smoothing==='light'&&a.curveTension===.45),name+' uses approved border finish');
}
console.log('Historical variants: independent masks, shared borders and checkpoint isolation pass.');

const transition={from:'old',kind:'collapse',before:['land'],after:[],geometry:'schematic'};
const changeEvents=[events[0],{...events[1],event_source:'原文章节',map_transition:transition},events[2]];
assert.deepEqual(buildWorldMap({geometry,countries,events:changeEvents}).checkpoints[1].transition,{...transition,source:'原文章节'});
for(const bad of [{from:'new'},{before:['unknown']},{after:['land']},{kind:'split'},{geometry:'official'}]) {
 assert.throws(()=>buildWorldMap({geometry,countries,events:[events[0],{...events[1],event_source:'原文章节',map_transition:{...transition,...bad}},events[2]]}),/过渡/);
}
const {loadModel}=require('../lib/content-model');
const live=loadModel().worldMap;
assert.equal(live.checkpoints[0].landforms.length,0,'Prehistory must not inherit fictional terrain');
const terrainIds=live.checkpoints.at(-1).landforms.map(f=>f.geometry).sort();
for(const c of live.checkpoints.slice(1)){
 assert.deepEqual(c.landforms.map(f=>f.geometry).sort(),terrainIds.filter(id=>c.era>=2||id!=='giant-court-ridge'),'Shared terrain missing at '+c.id);
 assert.ok(c.landforms.every(f=>f.certainty==='inferred'&&(f.era===c.era||f.schematic)),'Terrain reused outside its source epoch must retain its schematic qualification');
}

const at=id=>live.checkpoints.find(c=>c.id===id);
assert.equal(at('event-history-sonia-cession').transition.from,'event-history-twenty-years-war');
assert.equal(at('event-history-highland-independence').date,'0743');
assert.equal(at('event-history-highland-independence').dateInferred,true);
for(const name of ['伦堡','马锡','塞加尔']){
 assert.ok(!at('event-history-broken-oath-war').regions.some(r=>r.title===name));
 assert.ok(at('event-history-highland-independence').regions.some(r=>r.title===name));
}
assert.equal(at('event-history-roselle-assassination').transition,undefined,'1198 must not replay the earlier independence');
console.log('Sourced transitions: chronology, source guards and war-result checkpoints pass.');
const motion=require('../../source/js/map-transition');
assert.equal(motion.between(null,{id:'initial'}),null,'First render must not start an empty transition');
assert.equal(motion.between({id:'initial'},{id:'initial'}),null);
assert.equal(motion.between({id:'other'},{id:'next',transition}),null,'Jumping over an intermediate node is not a historical transition');
assert.equal(motion.between({id:'old'},{id:'next',transition}).reverse,false);
assert.equal(motion.between({id:'next',transition},{id:'old'}).reverse,true);
const prehistoric=live.checkpoints[0],firstEra=live.checkpoints[1];
assert.equal(firstEra.era,1);
assert.equal(motion.between(prehistoric,firstEra).transition.kind,'migration');
assert.equal(motion.between(firstEra,prehistoric).reverse,true);
assert.equal(motion.between(prehistoric,live.checkpoints[2]),null,'Migration only joins prehistory and the first era');
assert.ok(firstEra.transition.splits.every(s=>Number.isInteger(s.ring)&&s.at.length===2&&s.at.every(n=>n>=0&&n<=1)));
console.log('Animation routing: initial load, skipped nodes and reverse playback pass.');

const independentCity={...cityCountry,map_cities:[{...cityCountry.map_cities[0],event:undefined,region_required:false,periods:[{event:'old',until:'end'},{event:'new',name:'新城名'}]}]};
const cityPeriods=buildWorldMap({geometry:cityGeometry,countries:[independentCity],events});
assert.equal(cityPeriods.checkpoints[0].cities.length,1);
assert.equal(cityPeriods.checkpoints[1].cities.length,0,'City period end is exclusive');
assert.equal(cityPeriods.checkpoints[2].cities[0].name,'新城名','City survives absent country polygon only when explicitly declared');
assert.throws(()=>buildWorldMap({geometry:cityGeometry,countries:[{...independentCity,map_cities:[{...independentCity.map_cities[0],periods:[{event:'old'},{event:'old'}]}]}],events}),/城市时期重叠/);
assert.throws(()=>buildWorldMap({geometry:cityGeometry,countries:[{...independentCity,map_cities:[{...independentCity.map_cities[0],periods:[{event:'old',until:'new'}]}]}],events}),/城市时期/);
const annotationsCountry={...countries[0],map_annotations:[{name:'旧国名',point:'city',event:'old',until:'end'}]};
const annotationPeriods=buildWorldMap({geometry:cityGeometry,countries:[annotationsCountry],events});
assert.equal(annotationPeriods.checkpoints[0].annotations.length,1);
assert.equal(annotationPeriods.checkpoints[1].annotations.length,0);
assert.ok(at('event-history-human-ascendancy').cities.some(c=>c.id==='moon-city'));
assert.ok(at('event-history-twenty-years-war').regions.some(a=>a.title==='神弃之地'));
assert.ok(at('event-history-tudor-ascension').cities.some(c=>c.id==='fourth-trier'));
assert.equal(at('event-0012').cities.find(c=>c.id==='fourth-trier').name,'地下旧特里尔');
assert.ok(!at('event-0012').cities.some(c=>c.id==='trier'),'Modern Trier must not leak into fourth epoch');
console.log('Historical labels: city survival, renamed ruins, annotation expiry and organization sources pass.');

assert.equal(motion.between({id:'era2',era:2},{id:'era3',era:3}).transition.kind,'presentation','An epoch change blends presentation without inventing territorial motion');
assert.equal(motion.between({id:'same',era:2},{id:'same',era:2}),null);
assert.ok(at('event-0012').annotations.filter(a=>a.outline).length===3,'Fallen empires retain their former boundary outlines');
assert.ok(at('event-0012').annotations.filter(a=>a.outline).every(a=>a.outlinePaths.length>0));


// Southern inferred territories must tessellate the continent, sharing each
// interior arc in reverse, with labels inside their own regions in all variants.
const southernShapes=['south-highland','south-paz','south-hagati','south-balam'];
for(const raw of [currentGeometry,currentGeometry.variants.prewar,currentGeometry.variants['before-island']]){
 const coast=new Set(raw.shapes.south.rings.flat().map(Math.abs)),owners=new Map();
 for(const id of southernShapes){
  assert.ok(inShape(raw.shapes[id].label,id,raw),'Southern label outside '+id);
  for(const ref of raw.shapes[id].rings.flat()){const id=Math.abs(ref);if(!owners.has(id))owners.set(id,[]);owners.get(id).push(Math.sign(ref));}
 }
 for(const id of coast)assert.equal(owners.get(id)?.length,1,'Southern coastline must have one territory');
 for(const [id,signs] of owners)if(!coast.has(id)){assert.equal(signs.length,2,'Missing adjacent southern territory');assert.equal(signs[0]+signs[1],0,'Southern shared border must reverse exactly');}
}
for(const c of live.checkpoints.filter(c=>c.era===5)){
 assert.equal(c.regions.filter(r=>southernShapes.includes(r.shape)).length,4,'Missing southern territory at '+c.id);
 assert.ok(c.regions.filter(r=>southernShapes.includes(r.shape)).every(r=>r.certainty==='inferred'));
}
assert.ok(!at('event-history-joint-empire').regions.some(r=>southernShapes.includes(r.shape)),'Later southern kingdoms must not leak into the unified empire');
console.log('Southern inferred territories: shared borders, coast coverage, labels and historical isolation pass.');

const frameClock={elapsed:0,last:null};
assert.equal(motion.advanceFrame(frameClock,1000,2800),0);
assert.equal(motion.advanceFrame(frameClock,1016,2800),16/2800);
assert.equal(motion.advanceFrame(frameClock,11016,2800),66/2800,'A ten-second stall must not skip to the final map');
frameClock.last=null;
assert.equal(motion.advanceFrame(frameClock,21016,2800),66/2800,'Resuming a hidden tab must not consume animation time');
assert.equal(motion.advanceFrame({elapsed:2790,last:0},16,2800),1,'Displayed frame budget reaches the exact endpoint');
console.log('Animation clock: long frames and background suspension do not force completion.');

assert.ok(!at('event-history-ancient-alliances').annotations.some(a=>a.name==='白银之国'),'Giant rule alone does not date Silver Kingdom to the early ancient-alliance checkpoint');
assert.ok(at('event-history-human-ascendancy').annotations.some(a=>a.name==='白银之国'),'Keep the attested kingdom before the Cataclysm');

assert.equal(at('event-history-primordial-divides').barriers.length,0,'Do not put the later seal at the beginning of the First Epoch');
assert.equal(at('event-history-pillars').barriers.length,1,'The First Epoch sealing checkpoint must expose the barrier');
for(const c of live.checkpoints.filter(c=>c.era>=2))assert.equal(c.barriers.length,1,'Western seal missing at '+c.id);
const ancientCheckpoint=at('event-history-ancient-alliances');
assert.equal(ancientCheckpoint.regions.length,8,'Restore all eight inferred ancient powers');
assert.ok(ancientCheckpoint.regions.every(r=>r.certainty==='inferred'));
const ancientMasks=referenceLayout.historicalLayouts.ancient.partitions['old-world'];
assert.deepEqual(Object.entries(ancientMasks).filter(([,polygons])=>!polygons.length).map(([name])=>name),['ancient-unassigned'],'Unassigned land must never default to an ancient faction');
for(const region of ancientCheckpoint.regions)assert.ok(ancientMasks[region.shape].length,'Every faction needs a bounded candidate polygon');
assert.ok(currentGeometry.variants.ancient.shapes['ancient-unassigned']);
assert.ok(!ancientCheckpoint.regions.some(r=>r.shape==='ancient-unassigned'));
const ancientRaw=currentGeometry.variants.ancient;
// The seaward extent of a territory is clipped by the shared land mask,
// not by a second hand-drawn line parallel to the shore.
for(const [id,box] of [['ancient-giant',[950,245,1010,290]],['ancient-blood',[1000,298,1080,335]],['ancient-mutant',[1230,360,1460,500]]]){
 let checked=0;
 for(let x=box[0];x<box[2];x+=3)for(let y=box[1];y<box[3];y+=3){
  const p=[x,y];
  if(!inShape(p,'old-world',ancientRaw)||inPolygon(p,referenceLayout.barrierShapes['western-seal'].polygon))continue;
  checked++;
  assert.ok(inShape(p,id,ancientRaw),'Unassigned coastal strip: '+id+' '+p);
 }
 assert.ok(checked>0,'Coast coverage check needs land samples');
}

// Land powers need a dominant connected core; remote large fragments require
// evidence rather than being accepted merely because every polygon is valid.
function ringArea(ring,raw){
 const p=ring.flatMap(ref=>{const a=raw.arcs[Math.abs(ref)-1].points;return ref>0?a:a.slice().reverse();});
 return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2);
}
for(const id of ['ancient-giant','ancient-blood','ancient-mutant','ancient-phoenix']){
 const areas=ancientRaw.shapes[id].rings.map(r=>ringArea(r,ancientRaw));
 assert.ok(Math.max(...areas)/areas.reduce((a,b)=>a+b,0)>.95,'Unsupported distant territory in '+id);
}
assert.ok(!inShape([873,209],'ancient-blood',ancientRaw),'Do not restore the unsupported overseas blood territory');
assert.ok(!inShape([1150,354],'ancient-phoenix',ancientRaw),'Do not restore the isolated northern phoenix territory');

for(const point of ['silver-city','giant-court','nost'])assert.ok(inShape(currentGeometry.points[point],'ancient-giant',ancientRaw),'Giant anchors must remain on the giant side: '+point);
assert.ok(!inShape(currentGeometry.points.nost,'ancient-wolf',ancientRaw),'Nost is a giant city near the wolf realm, not a wolf possession');
assert.ok(inShape([700,170],'ancient-elf',ancientRaw),'Keep the inferred Sonia island foothold when merging continental rings');
assert.ok(ancientRaw.shapes['ancient-elf'].rings.some(ring=>ring.some(ref=>ancientRaw.arcs[Math.abs(ref)-1].points.some(p=>p[0]>775))),'Keep the eastern littoral as well as the overseas island');
assert.ok(inShape([1450,583],'ancient-devil',ancientRaw),'Abyss core follows the Australian landmass');
assert.ok(!inShape([1305,440],'ancient-devil',ancientRaw),'Do not retain the arbitrary southeast mainland devil territory');
assert.ok(inShape([980,555],'eastern-open'),'The southern eastern landmass must inherit its ancient territories');
assert.ok(inShape([980,555],'ancient-phoenix',ancientRaw),'Do not leave the southern landmass without inferred history');
assert.ok(!inShape([1540,625],'old-world'),'The Abyss interior must no longer retain the unmodified Australian land silhouette');
assert.ok(!inShape([1540,625],'eastern-open'),'The Abyss is not the Forsaken Land');
assert.ok(!inShape([1560,130],'eastern-open'),'Restore the previous Western seal footprint');
const giantArcs=new Set(ancientRaw.shapes['ancient-giant'].rings.flat().map(Math.abs));
assert.ok(ancientRaw.shapes['ancient-wolf'].rings.flat().some(r=>giantArcs.has(Math.abs(r))),'Giant and wolf realms must share a border');

const sealed=referenceLayout.barrierShapes['western-seal'].polygon;
for(const region of ancientCheckpoint.regions){
 const raw=currentGeometry.variants.ancient;
 assert.ok(inShape(raw.shapes[region.shape].label,region.shape,raw),'Ancient label must lie within territory: '+region.shape);
 const vertices=raw.shapes[region.shape].rings.flat().flatMap(ref=>raw.arcs[Math.abs(ref)-1].points);
 assert.ok(!vertices.some(p=>inPolygon([p[0]+8,p[1]],sealed)&&inPolygon([p[0]-8,p[1]],sealed)&&inPolygon([p[0],p[1]+8],sealed)&&inPolygon([p[0],p[1]-8],sealed)),'Ancient polity must not cross the Western seal');
}
assert.ok(at('event-history-human-ascendancy').regions.some(r=>r.shape==='eastern-open'),'Solar rule must inherit the unsealed eastern territory');
// Test geographical continuity, not just the presence of a successor's name.
const solarShapes=at('event-history-human-ascendancy').regions.map(r=>r.shape);
for(const region of ancientCheckpoint.regions.filter(r=>r.shape!=='ancient-devil')){
 let sampled=0;
 for(let x=650;x<1774;x+=12)for(let y=40;y<742;y+=12){
  const p=[x,y];
  if(![[0,0],[-4,0],[4,0],[0,-4],[0,4]].every(([dx,dy])=>inShape([x+dx,y+dy],region.shape,ancientRaw)))continue;
  sampled++;
  assert.ok(solarShapes.some(id=>inShape(p,id)),'Conquered territory lost at the epoch change: '+region.shape+' '+p);
 }
 assert.ok(sampled>0,'Continuity check must sample '+region.shape);
}
assert.ok(!solarShapes.some(id=>inShape([1450,583],id)),'Retreat into the Abyss is not conquest of the Abyss itself');

for(const c of live.checkpoints.filter(c=>c.era>=3))assert.ok(c.regions.some(r=>r.shape==='eastern-open'),'Eastern territory must persist after the Cataclysm: '+c.id);
for(const id of ['event-0138','event-0012','event-0104'])assert.ok(at(id).regions.length>=3,'A fallen ruler must not empty the world map');
assert.throws(()=>buildWorldMap({geometry,countries:[{...countries[0],map_placements:[{...countries[0].map_placements[0],certainty:'guess'}]}],events}),/确定性/);
console.log('Ancient inference: eight powers, seal exclusion, labels and successor geography pass.');

// Only explicitly sourced adjacent events may animate, in either direction.
for(let i=1;i<live.checkpoints.length;i++){
 const before=live.checkpoints[i-1],after=live.checkpoints[i];
 for(const [from,to] of [[before,after],[after,before]]){
  const change=motion.between(from,to);
  if(after.transition){assert.ok(change);assert.equal(change.transition.kind,after.transition.kind);}
  else {assert.equal(change.transition.kind,'presentation');assert.equal(change.transition.before,undefined);assert.equal(change.transition.after,undefined);}
 }
}
assert.equal(at('event-0012').transition,undefined,'Changing imperial names to former territory does not move borders');
console.log('Historical animation gates: sourced adjacent events only.');

const compact=motion.compactCheckpoints(live.checkpoints);
assert.equal(compact.length,15,'Only the identical 642/738 map states should merge');
assert.equal(compact.find(c=>c.id==='event-history-sonia-cession').mergedThrough.id,'event-history-broken-oath-war');
assert.equal(compact.find(c=>c.id==='event-history-highland-independence').transition.from,'event-history-sonia-cession','Merged snapshots must preserve the following sourced transition');
assert.equal(live.checkpoints.length,16,'Compaction must not modify historical events');
for(let i=1;i<compact.length;i++){
 assert.ok(motion.between(compact[i-1],compact[i]));
 assert.ok(motion.between(compact[i],compact[i-1]));
}
assert.deepEqual([...new Set(compact.map(c=>c.era))],[0,1,2,3,4,5]);
console.log('Single timeline: identical snapshots compact without losing epochs, dates or transition routing.');

const transport=require('../../source/js/map-data');
const packed=transport.encode(live),decoded=transport.decode(JSON.parse(JSON.stringify(packed)));
assert.deepEqual(decoded.checkpoints,JSON.parse(JSON.stringify(live.checkpoints)),'Shared records must preserve all historical facts and qualifiers');
for(const [key,original] of Object.entries({base:live.geometry,...live.variants,...live.basemaps})){
 const restored=key==='base'?decoded.geometry:decoded.variants[key]||decoded.basemaps[key];
 assert.deepEqual(restored.viewBox,original.viewBox);
 assert.deepEqual(restored.coasts,original.coasts);
 for(const id of Object.keys(original.shapes)){
  assert.equal(restored.shapes[id].path,original.shapes[id].path,'Shared compiler changed geometry '+key+'/'+id);
  assert.deepEqual(restored.shapes[id].arcIds,original.shapes[id].arcIds);
 }
}
assert.equal(new Set(packed.arcs.map(a=>JSON.stringify(a))).size,packed.arcs.length,'Boundary pool must contain no duplicates');
assert.equal(new Set(packed.records.map(a=>JSON.stringify(a))).size,packed.records.length,'Record pool must contain no duplicates');
assert.ok(JSON.stringify(packed).length<JSON.stringify(live).length*.3,'Transport must remove the repeated compiled geometry');
const badTransport=JSON.parse(JSON.stringify(packed));badTransport.geometry.arcs[0]=-1;
assert.throws(()=>transport.decode(badTransport),/arc reference/);
console.log('Shared payload: exact geometry round-trip, historical records and deduplicated pools pass.');

// Catastrophe geography must not leak backward through the shared base map.
assert.ok(!live.geometry.labels.some(l=>l.key==='map_berserk'));
const pale=live.checkpoints.findIndex(c=>c.id==='event-0104'),cataclysm=live.checkpoints.findIndex(c=>c.id==='event-0138');
for(const [i,c] of live.checkpoints.entries()){
 assert.equal(c.geography.some(g=>g.id==='berserk-sea'),i>=pale,'Raging Sea chronology: '+c.id);
 assert.equal(c.geography.some(g=>g.id==='divine-battle-sea'),i>=cataclysm,'Divine battlefield chronology: '+c.id);
}
assert.ok(live.checkpoints.filter(c=>c.era===5).every(c=>c.cities.some(city=>city.id==='fourth-trier'&&city.name==='地下旧特里尔')));
console.log('Catastrophe geography: separate Third/Fourth Epoch onset and buried Trier survival pass.');

const axis=motion.timelineLayout(compact);
assert.equal(axis.positions[0],0);
assert.equal(axis.positions.at(-1),1000);
assert.ok(axis.positions.every((p,i)=>!i||p>axis.positions[i-1]),'Timeline stops remain ordered and distinct');
assert.ok(Math.abs(axis.bands.reduce((sum,b)=>sum+b.width,0)-1000)<1e-8);
assert.ok(new Set(axis.bands.map(b=>b.width)).size>2,'Epoch widths reflect available year spans');
const sampleAxis=motion.timelineLayout([0,10,110,111].map((y,i)=>({id:String(i),era:5,date:String(y)})));
assert.ok(sampleAxis.positions[2]-sampleAxis.positions[1]>sampleAxis.positions[3]-sampleAxis.positions[2],'Long intervals get more space than nearby dates');
assert.ok(motion.travelDuration(0,800,'scene')>motion.travelDuration(0,50,'scene'));
assert.equal(motion.travelDuration(0,50,'migration'),2800,'Coast deformation retains its two-stage timing');
assert.deepEqual(motion.timelineLayout([]),{positions:[],bands:[]});
assert.ok(motion.timelineLayout([{era:0},{era:1}]).positions.every(Number.isFinite),'Unknown dates never manufacture years or NaN positions');
console.log('Timeline: duration-weighted bands, ordered stops, unknown years and synchronized travel timing pass.');

const geometryFor=c=>c.basemap?live.basemaps[c.basemap]:(live.variants[c.geometryVariant]||live.geometry);
const beforeIndependence=at('event-history-broken-oath-war'),afterIndependence=at('event-history-highland-independence');
const expansion=motion.territorialChanges(beforeIndependence,afterIndependence,geometryFor(beforeIndependence),geometryFor(afterIndependence));
for(const shape of ['north-south','north-lenburg','north-masik','north-segar'])assert.ok(expansion.entering.includes(shape));
assert.ok(expansion.leaving.includes('prewar-feynapotter'));
const contraction=motion.territorialChanges(afterIndependence,beforeIndependence,geometryFor(afterIndependence),geometryFor(beforeIndependence));
assert.deepEqual(contraction.entering,expansion.leaving);
assert.deepEqual(contraction.leaving,expansion.entering);
assert.deepEqual(motion.territorialChanges(afterIndependence,afterIndependence,geometryFor(afterIndependence),geometryFor(afterIndependence)),{entering:[],leaving:[]});
console.log('Territorial motion: independence reveals successor regions, reverses contraction and leaves identical territories stable.');

const {visibleAnnotations}=require('../../source/js/map-data');
for(const id of ['event-0012','event-0104']){
 const c=at(id),original=JSON.stringify(c.annotations),annotations=visibleAnnotations(c);
 for(const name of ['图铎帝国旧境','所罗门帝国旧境','特伦索斯特帝国旧境']){
  assert.equal(c.regions.filter(r=>r.title===name).length+annotations.filter(a=>a.name===name).length,1,'Former empire name must render once: '+id+' '+name);
 }
 assert.equal(JSON.stringify(c.annotations),original,'Source annotations must not be deleted');
 assert.equal(visibleAnnotations({...c,regions:[]}).length,c.annotations.length,'Unfilled former territories retain their labels');
 const unrelated={...c.annotations[0],sourcePath:'another-entry.md'};
 assert.ok(visibleAnnotations({...c,annotations:[unrelated]}).includes(unrelated),'Same name belonging to another entry is not discarded');
}
console.log('Map labels: former-territory fills suppress duplicate annotations without deleting sources or unrelated labels.');

const {selectLabels}=require('../../source/js/map-data');
const box=(left,top,right,bottom)=>({left,top,right,bottom});
const collision=[{index:0,priority:3,box:box(0,0,60,20)},{index:1,priority:1,box:box(10,5,80,25)},{index:2,priority:1,box:box(100,0,160,20)}];
assert.deepEqual(selectLabels(collision),[1,2],'Country names take precedence over colliding continental labels');
assert.deepEqual(selectLabels([{...collision[0],priority:0},...collision.slice(1)]),[0,2],'Focused labels remain accessible');
assert.deepEqual(selectLabels([{index:0,priority:1,box:box(0,0,30,10)},{index:1,priority:1,box:box(100,0,130,10)}]),[0,1],'Separated same-name territories can retain both labels');
for(let frame=0;frame<=60;frame++){
 const moving=[{index:0,priority:1,box:box(frame,0,frame+30,10)},{index:1,priority:2,box:box(40,0,70,10)}];
 const kept=selectLabels(moving);
 if(frame<73&&frame+33>40)assert.equal(kept.length,1,'Moving labels cannot overlap at frame '+frame);
}
console.log('Shared label layout: country priority, focus, distinct places and every sampled moving frame pass.');

assert.deepEqual(motion.territorialChanges(afterIndependence,{...afterIndependence,regions:afterIndependence.regions.map(r=>({...r,title:r.title+'旧境',colors:{fill:'red'},certainty:'inferred'}))},geometryFor(afterIndependence),geometryFor(afterIndependence)),{entering:[],leaving:[]},'Names, palettes and certainty do not change territory');

// Projection closure remains available for fill, but is never painted as coast.
const framed=compileGeometry({version:2,viewBox:[0,0,100,100],smoothing:'none',curveTension:0,arcs:[{points:[[0,20],[0,100],[100,100],[100,20],[60,25],[0,20]]}],shapes:{land:{rings:[[1]],label:[50,60]}}});
assert.ok(framed.arcs[0].path.includes('100 100'));
assert.ok(!framed.arcs[0].strokePath.includes('100 100'),'Map frame is not a coastline');
assert.ok(framed.arcs[0].strokePath.includes('60 25'),'Real coastal sections remain visible');
assert.ok(packed.arcs.every(a=>!('strokePath' in a)),'Derived coast strokes must not be serialized as another geometry source');

// Source-era labels must not masquerade as names attested in earlier epochs.
assert.equal(at('event-history-human-ascendancy').landforms.find(f=>f.geometry==='antares').name,'北方背脊山脉');
assert.equal(at('event-0002').landforms.find(f=>f.geometry==='antares').name,'安塔尔斯山脉');
assert.equal(at('event-history-ancient-alliances').landforms.find(f=>f.geometry==='tussock').name,'河流');
assert.ok(!at('event-history-human-ascendancy').cities.some(c=>c.id==='silver-city'),'Do not project the post-cataclysm refuge back into the Sun God era');
assert.ok(at('event-0138').cities.some(c=>c.id==='silver-city'));
for(const era_names of [[],null,{'6':'山'},{'3':''}])assert.throws(()=>buildWorldMap({geometry:terrainGeometry,countries:[{...terrainCountry,map_landforms:[{...terrainCountry.map_landforms[0],era_names}]}],events}),/无效地形时期名称/);
