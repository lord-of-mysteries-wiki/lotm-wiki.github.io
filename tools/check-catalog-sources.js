'use strict';
const fs=require('node:fs'),path=require('node:path'),fm=require('hexo-front-matter');
const {validateCatalogPage}=require('./lib/catalog');
function checkCatalogSources(){
 let count=0;
 for(const file of fs.readdirSync('source',{recursive:true}).filter(file=>file.endsWith('.md'))){const page=fm.parse(fs.readFileSync(path.join('source',file),'utf8'));validateCatalogPage({...page,source:file});count++;}
 return count;
}
module.exports={checkCatalogSources};
if(require.main===module)console.log('目录主资料校验通过：'+checkCatalogSources()+' 份词条。');
