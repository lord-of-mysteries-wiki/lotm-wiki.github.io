/* Shared transport format: geometry arcs and recurring records are sent once. */
(() => {
  'use strict';
  const geometryCompiler=typeof module==='object'&&module.exports?require('./map-geometry'):window.LotmMapGeometry;
  const collections=['regions','cities','annotations','landforms','barriers','geography'];
  function encode(model){
    const arcs=[],arcIndex=new Map(),records=[],recordIndex=new Map();
    function intern(value,table,index){
      const key=JSON.stringify(value);
      if(!index.has(key)){index.set(key,table.length);table.push(value);}
      return index.get(key);
    }
    function geometry(value){
      const {viewBox,coasts,curveTension,smoothing,labels,pointLabels}=value;
      const shapes=Object.fromEntries(Object.entries(value.shapes).map(([id,shape])=>{
        const {path,arcIds,...source}=shape;return [id,source];
      }));
      return {version:2,viewBox,coasts,curveTension,smoothing,labels,pointLabels,shapes,
        arcs:value.arcs.map(({path,strokePath,...arc})=>intern(arc,arcs,arcIndex))};
    }
    const base=geometry(model.geometry);
    const variants=Object.fromEntries(Object.entries(model.variants).map(([id,value])=>{
      const packed=geometry(value);
      for(const key of ['viewBox','coasts','curveTension','smoothing','labels','pointLabels'])if(JSON.stringify(packed[key])===JSON.stringify(base[key]))delete packed[key];
      return [id,packed];
    }));
    const basemaps=Object.fromEntries(Object.entries(model.basemaps).map(([id,value])=>[id,geometry(value)]));
    const checkpoints=model.checkpoints.map(c=>{
      const packed={...c};
      for(const key of collections)packed[key]=(c[key]||[]).map(value=>intern(value,records,recordIndex));
      return packed;
    });
    return {format:'lotm-map-shared-v1',arcs,records,geometry:base,variants,basemaps,checkpoints,labels:model.labels};
  }
  function decode(data){
    if(data.format!=='lotm-map-shared-v1')throw Error('Unsupported map data format');
    function geometry(value){
      // Transport references must be resolved before the shared compiler validates rings.
      const arcs=value.arcs.map(id=>{
        if(!Number.isInteger(id)||!data.arcs[id])throw Error('Invalid map arc reference');
        return data.arcs[id];
      });
      // City offsets are already validated against points during model construction.
      const {pointLabels,...source}=value;
      return {...geometryCompiler.compileGeometry({...source,arcs}),pointLabels};
    }
    const base=geometry(data.geometry);
    const variants=Object.fromEntries(Object.entries(data.variants).map(([id,value])=>[id,geometry({...data.geometry,...value})]));
    const basemaps=Object.fromEntries(Object.entries(data.basemaps).map(([id,value])=>[id,geometry(value)]));
    const checkpoints=data.checkpoints.map(c=>{
      const restored={...c};
      for(const key of collections)restored[key]=c[key].map(id=>{
        if(!Number.isInteger(id)||!data.records[id])throw Error('Invalid map record reference');
        return data.records[id];
      });
      return restored;
    });
    return {geometry:base,variants,basemaps,checkpoints,labels:data.labels};
  }
  // A filled region already labels its own former territory. Keep the source
  // annotation for checkpoints without that fill, but render the name once.
  function visibleAnnotations(checkpoint){
    return checkpoint.annotations.filter(a=>!checkpoint.regions.some(r=>
      a.outline?.shape===r.shape&&a.name===r.title&&a.sourcePath===r.sourcePath));
  }
  // Screen-space label selection is shared by settled and animated scenes.
  // Keep semantic priority stable; do not shift labels away from their places.
  function selectLabels(candidates,gap=3){
    const accepted=[];
    for(const item of candidates.slice().sort((a,b)=>a.priority-b.priority||a.index-b.index)){
      const a=item.box;
      if(!accepted.some(other=>{const b=other.box;return a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;}))accepted.push(item);
    }
    return accepted.map(item=>item.index);
  }
  const api={encode,decode,visibleAnnotations,selectLabels};
  if(typeof module==='object'&&module.exports)module.exports=api;else window.LotmMapData=api;
})();
