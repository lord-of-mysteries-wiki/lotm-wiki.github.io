const {encode}=require('../../../source/js/map-data');
const {mapEntryPreview}=require('../lib/map-entry-preview');
hexo.extend.helper.register('world_map_data', function () {
  const model=this.wiki_model();
  const countryPages=new Map(this.site.pages.toArray().map(p=>[p.source,p]));
  const previewCache=new Map();
  const excerpt=(page,cityName)=>{
    const key=page.source+'\0'+(cityName||'');
    if(!previewCache.has(key))previewCache.set(key,mapEntryPreview(page,cityName));
    return previewCache.get(key);
  };
  const pages=new Map(this.site.pages.toArray().map(p=>[p.entry_id,p]));
  return {...model.worldMap,checkpoints:model.worldMap.checkpoints.map(c=>({...c,label:c.labelKey?this.__(c.labelKey):c.label,title:c.titleKey?this.__(c.titleKey):c.title,barriers:(c.barriers||[]).map(b=>{const page=countryPages.get(b.sourcePath);if(!page)throw Error("地图屏障缺少正式页面");return {...b,...excerpt(page),url:this.url_for("/"+page.path)};}),annotations:c.annotations.map(a=>{const page=countryPages.get(a.sourcePath);if(!page)throw Error("地图地区缺少正式页面");return {...a,...excerpt(page),url:this.url_for("/"+page.path)};}),cities:c.cities.map(city=>{const page=countryPages.get(city.sourcePath);if(!page)throw Error('地图城市缺少正式页面');return {...city,...excerpt(page,city.name),url:this.url_for('/'+page.path)+'#'+encodeURIComponent(city.anchor||'城市与地区')};}),url:c.basemap?null:this.wiki_event_url(pages.get(c.id)),regions:c.regions.map(r=>{const page=countryPages.get(r.sourcePath);if(!page)throw Error('地图国家缺少正式页面：'+r.sourcePath);return {...r,...excerpt(page),path:page.path,url:this.url_for('/'+page.path)};})}))};
});

hexo.extend.helper.register('world_map_payload', data => encode(data));
