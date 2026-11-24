'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {createRelationshipQuery}=require('../../source/relationships/relationship-query');
const people=ids=>ids.map(id=>({id}));
const relation=(id,a,b,extra={})=>({id,a,b,summary:id,sourceHint:'《诡秘之主》第一卷第9章',...extra});

test('parallel records remain intact, count as one hop, and retain their original directions and sources',()=>{
  const records=[relation('z','b','a',{direction:{信仰:'a-to-b'},note:'仅单方知晓'}),relation('a','a','b')];
  const before=JSON.stringify(records),query=createRelationshipQuery(people(['a','b']),records);
  const result=query.queryPair('a','b');
  assert.equal(result.scope,'recorded-relations');
  assert.deepEqual(result.directRelations,records);
  assert.equal(result.connection.degrees,1);
  assert.equal(result.connection.intermediaries,0);
  assert.equal(result.connection.paths[0].segments[0].relations[0],records[0]);
  assert.equal(JSON.stringify(records),before);
  const returned=query.directRelations('a','b');returned.pop();assert.equal(query.directRelations('a','b').length,2);
  assert.deepEqual(query.stats,{people:2,relations:2,pairs:1});
});
test('common connections are unique people and retain evidence for both sides',()=>{
  const records=[relation('1','a','c'),relation('2','c','a'),relation('3','b','c'),relation('4','a','d'),relation('5','b','d'),relation('6','a','b')];
  const query=createRelationshipQuery(people(['a','b','c','d']),records),common=query.commonConnections('a','b');
  assert.deepEqual(common.map(x=>x.personId),['c','d']);
  assert.equal(common[0].aRelations.length,2);assert.equal(common[0].bRelations[0],records[2]);
  assert.deepEqual(query.commonConnections('a','a'),[]);
});
test('all equally short alternatives are considered, capped without duplicates or longer routes',()=>{
  const records=[];for(const id of ['b','c','d','e'])records.push(relation('a'+id,'a',id),relation(id+'z',id,'z'));
  records.push(relation('duplicate','a','b'),relation('ax','a','x'),relation('xy','x','y'),relation('yz','y','z'));
  const nodes=people(['a','b','c','d','e','x','y','z']);
  const query=createRelationshipQuery(nodes,records),result=query.shortestPaths('a','z');
  assert.equal(result.degrees,2);assert.equal(result.paths.length,3);assert.equal(result.hasMorePaths,true);
  assert.deepEqual(result.paths.map(p=>p.personIds),[['a','b','z'],['a','c','z'],['a','d','z']]);
  assert.deepEqual(createRelationshipQuery(nodes,records.slice().reverse()).shortestPaths('a','z').paths.map(p=>p.personIds),result.paths.map(p=>p.personIds));
  assert.equal(query.shortestPaths('a','z',{maxPaths:4}).hasMorePaths,false);
});
test('six hops, seven hops, isolates, same-person queries and cycles have distinct results',()=>{
  const ids=Array.from({length:8},(_,i)=>String(i));
  const records=ids.slice(1).map((id,i)=>relation(id,String(i),id));
  const query=createRelationshipQuery(people([...ids,'alone']),records);
  assert.equal(query.shortestPaths('0','6').withinSixDegrees,true);
  const seven=query.shortestPaths('0','7');assert.equal(seven.degrees,7);assert.equal(seven.intermediaries,6);assert.equal(seven.withinSixDegrees,false);
  assert.deepEqual(query.shortestPaths('0','alone'),{status:'disconnected',degrees:null,intermediaries:null,withinSixDegrees:null,paths:[],hasMorePaths:false});
  const self=query.shortestPaths('0','0');assert.equal(self.status,'same-person');assert.equal(self.degrees,0);assert.deepEqual(self.paths[0].personIds,['0']);
  const cycle=createRelationshipQuery(people(['a','b','c','d']),[relation('1','a','b'),relation('2','b','c'),relation('3','c','a'),relation('4','c','d')]);
  assert.deepEqual(cycle.shortestPaths('a','d').paths[0].personIds,['a','c','d']);
});
test('explicit filters affect direct records, common connections and paths consistently',()=>{
  const records=[relation('1','a','b',{categories:['信仰']}),relation('2','b','c',{categories:['熟人']}),relation('3','a','d',{categories:['熟人']}),relation('4','d','c',{categories:['熟人']})];
  const query=createRelationshipQuery(people(['a','b','c','d']),records,{includeRelation:r=>r.categories.includes('熟人')});
  assert.deepEqual(query.directRelations('a','b'),[]);
  assert.deepEqual(query.commonConnections('a','c').map(x=>x.personId),['d']);
  assert.deepEqual(query.shortestPaths('a','c').paths[0].personIds,['a','d','c']);
});
test('invalid people, records and path limits fail explicitly instead of inventing links',()=>{
  assert.throws(()=>createRelationshipQuery(people(['a','a']),[]),/重复/);
  assert.throws(()=>createRelationshipQuery(people(['a']),[relation('1','a','missing')]),/端点无效/);
  assert.throws(()=>createRelationshipQuery(people(['a']),[relation('1','a','a')]),/端点无效/);
  assert.throws(()=>createRelationshipQuery(people(['a','b']),[relation('1','a','b'),relation('1','a','b')]),/重复/);
  const query=createRelationshipQuery(people(['a','b']),[]);
  for(const method of ['directRelations','commonConnections','shortestPaths','queryPair'])assert.throws(()=>query[method]('a','missing'),/人物不存在/);
  for(const maxPaths of [0,-1,1.5,Infinity,21])assert.throws(()=>query.shortestPaths('a','b',{maxPaths}),/maxPaths/);
});
test('long chains use iterative traversal and huge alternative sets only produce the requested paths',()=>{
  const ids=Array.from({length:3000},(_,i)=>'n'+i);
  const long=createRelationshipQuery(people(ids),ids.slice(1).map((id,i)=>relation(id,ids[i],id)));
  assert.equal(long.shortestPaths(ids[0],ids.at(-1)).degrees,2999);
  const layers=[['a'],...Array.from({length:10},(_,i)=>Array.from({length:5},(_,j)=>i+'-'+j)),['z']];
  const records=[];for(let i=1;i<layers.length;i++)for(const from of layers[i-1])for(const to of layers[i])records.push(relation(records.length+'',from,to));
  const many=createRelationshipQuery(people(layers.flat()),records).shortestPaths('a','z');
  assert.equal(many.degrees,11);assert.equal(many.paths.length,3);assert.equal(many.hasMorePaths,true);
});
test('browser entry point exports the same query engine without DOM dependencies',()=>{
  const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('source/relationships/relationship-query.js','utf8'),context);
  const query=context.WikiRelationshipQuery.createRelationshipQuery(people(['a','b']),[relation('1','a','b')]);
  assert.equal(query.queryPair('a','b').connection.degrees,1);
});
test('shortest distances agree with an independent all-pairs reference across seeded graphs',()=>{
  let seed=9;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
  for(let trial=0;trial<25;trial++){
    const ids=Array.from({length:10},(_,i)=>String(i)),records=[],dist=ids.map((_,i)=>ids.map((_,j)=>i===j?0:Infinity));
    for(let a=0;a<10;a++)for(let b=a+1;b<10;b++)if(random()<.2){records.push(relation('r'+records.length,ids[a],ids[b]));dist[a][b]=dist[b][a]=1;}
    for(let k=0;k<10;k++)for(let a=0;a<10;a++)for(let b=0;b<10;b++)dist[a][b]=Math.min(dist[a][b],dist[a][k]+dist[k][b]);
    const query=createRelationshipQuery(people(ids),records);
    for(let a=0;a<10;a++)for(let b=0;b<10;b++){
      const result=query.shortestPaths(ids[a],ids[b]);assert.equal(result.degrees,Number.isFinite(dist[a][b])?dist[a][b]:null);
      for(const path of result.paths){assert.equal(path.personIds.length,result.degrees+1);assert.equal(new Set(path.personIds).size,path.personIds.length);for(const segment of path.segments)assert.ok(segment.relations.length);}
    }
  }
});
