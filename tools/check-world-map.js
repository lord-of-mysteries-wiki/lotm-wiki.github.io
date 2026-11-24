'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync('public/index.html','utf8');
const match=html.match(/<script type="application\/json" data-map-data>([\s\S]*?)<\/script>/);
assert.ok(match,'首页缺少共享地图数据');
const data=require('../source/js/map-data').decode(JSON.parse(match[1]));
let checked=0;
for(const checkpoint of data.checkpoints){
 for(const url of [checkpoint.url,...(checkpoint.barriers||[]).map(b=>b.url),...checkpoint.annotations.map(a=>a.url),...checkpoint.regions.map(r=>r.url),...checkpoint.cities.map(city=>city.url)].filter(Boolean)){
  assert.ok(url.startsWith('/lotm-wiki.github.io/'),'部署子路径错误：'+url);
  const [relative,hash]=url.slice('/lotm-wiki.github.io/'.length).split('#');
  const filename=path.join('public',decodeURIComponent(relative),relative.endsWith('/')?'index.html':'');
  assert.ok(fs.existsSync(filename),'目标文件不存在：'+filename);
  if(hash)assert.ok(fs.readFileSync(filename,'utf8').includes(`id="${decodeURIComponent(hash)}"`),'地图资料锚点不存在：'+hash);
  checked++;
 }
}
assert.ok(!html.includes('class="home-hero"'),'旧首页主体未移除');
console.log(`地图首页 ${data.checkpoints.length} 个节点、${checked} 个词条/事件链接及部署子路径通过。`);
