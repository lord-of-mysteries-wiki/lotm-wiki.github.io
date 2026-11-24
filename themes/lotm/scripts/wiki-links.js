'use strict';
const {buildWikiLinks}=require('../lib/wiki-links');
let index;
hexo.extend.filter.register('before_generate',()=>{index=undefined;});
function getIndex(context){
 if(!index){
  index=buildWikiLinks(context.site.pages.toArray(),context.config);
  for(const issue of index.issues)hexo.log.warn(`词条关联：${issue.source} -> ${issue.target}：目标未注册，未生成关联`);
 }
 return index;
}
hexo.extend.helper.register('wiki_related',function(page){return getIndex(this).related(page);});
hexo.extend.helper.register('wiki_is_entry',function(page){return getIndex(this).registry.has(require('../lib/wiki-links').normalize(page.path));});
