/* Shared terrain symbols for the interactive map and exported geographic studies. */
(function(scope){
  'use strict';
  function terrainPaths(feature){
    const points=feature.points, line='M'+points.map(p=>p.join(' ')).join('L');
    if(feature.type==='plateau')return [{d:line+'Z',kind:'plateau'}];
    if(feature.type==='river')return [{d:line,kind:'river'}];
    const paths=[];
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const count=Math.max(1,Math.floor(length/9));
      for(let j=0;j<count;j++){
        const t=(j+.5)/count,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
        paths.push({d:`M${x-3.5} ${y+3}L${x} ${y-4}L${x+3.5} ${y+3}`,kind:'mountain'});
      }
    }
    return paths;
  }
  if(typeof module==='object'&&module.exports)module.exports={terrainPaths};
  else scope.LotmTerrain={terrainPaths};
})(typeof window==='object'?window:globalThis);
