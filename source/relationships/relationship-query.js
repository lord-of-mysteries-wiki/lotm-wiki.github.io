'use strict';
(function (root, factory) {
  if (typeof module==='object' && module.exports) module.exports=factory();
  else root.WikiRelationshipQuery=factory();
})(globalThis, function () {
  // These are undirected connections in the recorded relationship network.
  // Traversing a connection never reverses its original direction or proves acquaintance.
  function createRelationshipQuery(people, records, {includeRelation=()=>true}={}) {
    if (!Array.isArray(people) || !Array.isArray(records) || typeof includeRelation!=='function') throw new TypeError('人物、关系及筛选条件无效');
    const adjacency=new Map(), relationIds=new Set();
    for (const person of people) {
      if (typeof person?.id!=='string' || !person.id.trim() || adjacency.has(person.id)) throw new Error('人物 ID 缺失或重复');
      adjacency.set(person.id,new Map());
    }
    let pairCount=0,recordCount=0;
    for (const record of records) {
      if (typeof record?.id!=='string' || !record.id.trim() || relationIds.has(record.id)) throw new Error('关系 ID 缺失或重复');
      relationIds.add(record.id);
      if (!adjacency.has(record.a) || !adjacency.has(record.b) || record.a===record.b) throw new Error('关系端点无效: '+record.id);
      if (!includeRelation(record)) continue;
      let pair=adjacency.get(record.a).get(record.b);
      if (!pair) {
        pair=[];
        adjacency.get(record.a).set(record.b,pair);
        adjacency.get(record.b).set(record.a,pair);
        pairCount++;
      }
      pair.push(record);recordCount++;
    }
    const compare=(a,b)=>a<b?-1:a>b?1:0;
    const neighbors=new Map();
    for (const [id,edges] of adjacency) {
      neighbors.set(id,[...edges.keys()].sort(compare));
    }
    function assertPerson(id) {
      if (!adjacency.has(id)) throw new RangeError('人物不存在: '+String(id));
    }
    function directRelations(a,b) {
      assertPerson(a);assertPerson(b);
      return (adjacency.get(a).get(b) || []).slice();
    }
    function commonConnections(a,b) {
      assertPerson(a);assertPerson(b);
      if (a===b) return [];
      return neighbors.get(a).filter(id=>id!==a && id!==b && adjacency.get(b).has(id)).map(personId=>({
        personId,aRelations:directRelations(a,personId),bRelations:directRelations(b,personId)
      }));
    }
    function makePath(personIds) {
      return {
        personIds,
        segments:personIds.slice(1).map((to,index)=>({from:personIds[index],to,relations:directRelations(personIds[index],to)}))
      };
    }
    function shortestPaths(a,b,{maxPaths=3}={}) {
      assertPerson(a);assertPerson(b);
      if (!Number.isInteger(maxPaths) || maxPaths<1 || maxPaths>20) throw new RangeError('maxPaths 须为 1 至 20 的整数');
      if (a===b) return {status:'same-person',degrees:0,intermediaries:0,withinSixDegrees:true,paths:[makePath([a])],hasMorePaths:false};
      const distances=new Map([[a,0]]),parents=new Map([[a,[]]]),queue=[a];
      let targetDistance=Infinity;
      // No six-hop cutoff: a route longer than six and an unreachable pair differ.
      for (let head=0;head<queue.length;head++) {
        const current=queue[head],distance=distances.get(current);
        if (distance>=targetDistance) break;
        for (const next of neighbors.get(current)) {
          if (!distances.has(next)) {
            distances.set(next,distance+1);parents.set(next,[current]);queue.push(next);
          } else if (distances.get(next)===distance+1) parents.get(next).push(current);
          if (next===b) targetDistance=distance+1;
        }
      }
      if (!distances.has(b)) return {status:'disconnected',degrees:null,intermediaries:null,withinSixDegrees:null,paths:[],hasMorePaths:false};
      for (const predecessors of parents.values()) predecessors.sort(compare);
      const paths=[],reverse=[b],stack=[{id:b,index:0}];
      // Enumerate only maxPaths + 1 routes from the predecessor DAG. This avoids
      // expanding exponentially many alternatives or relying on recursive depth.
      while (stack.length && paths.length<=maxPaths) {
        const frame=stack[stack.length-1];
        if (frame.id===a) {
          paths.push(makePath(reverse.slice().reverse()));stack.pop();reverse.pop();
          continue;
        }
        const previous=parents.get(frame.id);
        if (frame.index===previous.length) {stack.pop();reverse.pop();continue;}
        const id=previous[frame.index++];reverse.push(id);stack.push({id,index:0});
      }
      const degrees=distances.get(b);
      return {status:'connected',degrees,intermediaries:degrees-1,withinSixDegrees:degrees<=6,paths:paths.slice(0,maxPaths),hasMorePaths:paths.length>maxPaths};
    }
    function queryPair(a,b,options) {
      return {a,b,scope:'recorded-relations',directRelations:directRelations(a,b),commonConnections:commonConnections(a,b),connection:shortestPaths(a,b,options)};
    }
    return Object.freeze({directRelations,commonConnections,shortestPaths,queryPair,stats:Object.freeze({people:adjacency.size,relations:recordCount,pairs:pairCount})});
  }
  return {createRelationshipQuery};
});
