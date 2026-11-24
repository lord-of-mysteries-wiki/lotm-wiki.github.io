'use strict';
const {stripHTML,unescapeHTML}=require('hexo-util');
const {createEntryDetail}=require('./entry-detail');
const plain=html=>unescapeHTML(stripHTML(html)).replace(/\s+/g,' ').trim();
// Derived at build time from the same body and citation collector as entries.
// A preview carries only the sources attached to its selected content block.
function mapEntryPreview(page,cityName){
  const view=createEntryDetail(page,'country');
  const items=view.body.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi)||[];
  const paragraphs=view.body.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi)||[];
  const block=cityName&&cityName!==page.title
    ?items.find(item=>plain(item).startsWith(cityName+'：')||plain(item).startsWith(cityName+':'))
    :paragraphs.find(item=>plain(item)&&!plain(item).startsWith('返回'));
  if(!block)return {excerpt:'',excerptSources:[]};
  const ids=new Set([...block.matchAll(/data-source-target="character-source-(\d+)"/g)].map(m=>Number(m[1])-1));
  return {excerpt:plain(block),excerptSources:view.references.refs.filter((ref,i)=>ids.has(i)).map(ref=>ref.source)};
}
module.exports={mapEntryPreview};
