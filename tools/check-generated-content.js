// Validate every generated relation endpoint and event destination under the configured subpath.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {loadModel}=require('./lib/content-model');
const m=loadModel(),timeline=fs.readFileSync('public/timeline/index.html','utf8'),calendar=fs.readFileSync('public/timeline/calendar/index.html','utf8');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('public/relationships/graph-data.js','utf8')+'\nthis.data={characters,relations};',context);
assert.equal(context.data.characters.length,m.characters.length);assert.equal(context.data.relations.length,m.relations.length);
for(const p of m.profiles){const file=path.join('public',p.path,p.path.endsWith('/')?'index.html':'');assert.ok(fs.existsSync(file),file);}
for(const e of m.events){if(e.event_summary?.trim())assert.ok(timeline.includes('id="event-'+(e.event_anchor||e.title)+'"'),e.entry_id);else assert.ok(fs.existsSync(path.join('public',e.path,e.path.endsWith('/')?'index.html':'')),e.path);}
const records=JSON.parse(calendar.match(/<script type="application\/json">([\s\S]*?)<\/script>/)[1]);assert.equal(records.length,m.events.length);
for(const e of m.events)assert.ok(records.some(r=>r.title===e.title && r.start===String(e.event_time||'') && (r.period || '')===String(e.event_time_period||'') && (r.periodEnd || '')===String(e.event_time_period_end||'')),e.entry_id);
for(const p of m.profiles.filter(p=>m.relations.some(r=>r.a===p.entry_id||r.b===p.entry_id))){const html=fs.readFileSync(path.join('public',p.path,'index.html'),'utf8');assert.ok(html.includes('class="character-relations"'),p.entry_id);assert.ok(html.includes('/lotm-wiki.github.io/characters/entries/'),p.entry_id);}
assert.ok(fs.readFileSync('public/relationships/index.html','utf8').includes('/relationships/graph-data.js'));
console.log(`生成页面校验通过：人物目标、关系区块、${m.events.length} 个事件目的地、日历记录与部署子路径。`);
