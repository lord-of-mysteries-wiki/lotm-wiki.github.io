'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('source/relationships/graph.js','utf8');
const pack=script.slice(script.indexOf('function packNetworkComponents('),script.indexOf('const layoutOrigins='));
function fixture(count){
 const center={x:0,y:0};
 const main=Array.from({length:count},(_,i)=>({x:i%2?100:-100,y:i%4<2?-80:80,r:10,component:center}));
 const components=[main,...Array.from({length:219},()=>[{x:0,y:0,r:8,component:{x:0,y:0}}])];
 const context={components};vm.createContext(context);
 vm.runInContext(pack+';packNetworkComponents(components.flat());',context);
 return components;
}
const small=fixture(4),large=fixture(500);
assert.equal(small[1][0].x,large[1][0].x);
assert.equal(small[1][0].y,large[1][0].y);
const bounds=large.map(group=>({left:Math.min(...group.map(n=>n.x-n.r)),right:Math.max(...group.map(n=>n.x+n.r)),top:Math.min(...group.map(n=>n.y-n.r)),bottom:Math.max(...group.map(n=>n.y+n.r))}));
for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){
 const a=bounds[i],b=bounds[j];
 assert.ok(a.right+64<=b.left+1e-6||b.right+64<=a.left+1e-6||a.bottom+64<=b.top+1e-6||b.bottom+64<=a.top+1e-6,'Disconnected components must retain clearance');
}
assert.equal(large[0][1].x-large[0][0].x,200,'Packing must preserve internal relationship geometry');
console.log('PASS: 219 isolates packed without overlap; population does not inflate distance; connected geometry preserved');
