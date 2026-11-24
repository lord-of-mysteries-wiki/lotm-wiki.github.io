(() => {
'use strict';
// Smooth each shared arc once. Reverse its exact controls when assembling neighbors.
function compileGeometry(input) {
  const fail=message=>{throw Error('地图数据：'+message);};
  const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  if(input.version!==2 || !Array.isArray(input.arcs) || !input.arcs.length)fail('无效共享边界');
  if(input.focus!=null&&!point(input.focus))fail('无效初始视点');
  const tension=input.curveTension ?? 1;
  if(!Number.isFinite(tension)||tension<0||tension>1)fail('无效平滑参数');
  const fmt=p=>p.map(n=>Number(n.toFixed(3))).join(' ');
  const command=s=>'C'+fmt(s[1])+' '+fmt(s[2])+' '+fmt(s[3]);
  // A closed arc can meet other arcs at a junction; keep that shared endpoint fixed.
  const joinedArcs=new Set(Object.values(input.shapes||{}).flatMap(shape=>(shape.rings||[]).filter(ring=>ring.length>1).flat().map(ref=>Math.abs(ref)-1)));
  const segments=input.arcs.map((arc,arcIndex)=>{
    let p=arc.points;
    if(!Array.isArray(p)||p.length<2||!p.every(point))fail('无效边界坐标');
    const closed=same(p[0],p[p.length-1])&&!joinedArcs.has(arcIndex);
    // Two corner-cutting passes remove tracing kinks without moving shared endpoints.
    // Convex interpolation stays inside each local segment's hull.
    for(let pass=0;pass<(arc.smoothing==='light'?1:(arc.smoothing||input.smoothing)==='none'?0:2);pass++) {
      const rounded=closed?[]:[p[0]];
      for(let i=0;i<p.length-1;i++) {
        const a=p[i],b=p[i+1];
        rounded.push(a.map((v,k)=>v*.8+b[k]*.2),a.map((v,k)=>v*.2+b[k]*.8));
      }
      rounded.push(closed?rounded[0]:p[p.length-1]);
      p=rounded;
    }
    const n=p.length, arcTension=arc.curveTension ?? tension;
    if(!Number.isFinite(arcTension)||arcTension<0||arcTension>1)fail('无效边段平滑参数');
    return p.slice(0,-1).map((a,i)=>{
      const b=p[i+1],before=i?p[i-1]:closed?p[n-2]:a,after=i+2<n?p[i+2]:closed?p[1]:b;
      return [a,a.map((v,k)=>v+(b[k]-before[k])*arcTension/6),b.map((v,k)=>v-(after[k]-a[k])*arcTension/6),b];
    });
  });
  const frame=input.viewBox;
  const onFrame=s=>frame&&[[0,frame[0]],[0,frame[0]+frame[2]],[1,frame[1]],[1,frame[1]+frame[3]]].some(([axis,edge])=>s.every(p=>Math.abs(p[axis]-edge)<=1.2));
  const arcs=segments.map((s,i)=>{
    let strokePath='',connected=false;
    for(const segment of s){
      // A projected polygon needs closing edges for fill, but those edges are
      // not coastlines. Restart the stroke after crossing the map's cut.
      if(onFrame(segment)){connected=false;continue;}
      strokePath+=(connected?'':'M'+fmt(segment[0]))+command(segment);connected=true;
    }
    return {...input.arcs[i],path:'M'+fmt(s[0][0])+s.map(command).join(''),strokePath};
  });
  const shapes={};
  for(const [id,shape] of Object.entries(input.shapes||{})) {
    if(!Array.isArray(shape.rings)||!shape.rings.length||!point(shape.label))fail('无效轮廓 '+id);
    if(shape.labelScale!==undefined&&(!Number.isFinite(shape.labelScale)||shape.labelScale<=0||shape.labelScale>1))fail('无效标签比例 '+id);
    const paths=shape.rings.map(ring=>{
      if(!Array.isArray(ring)||!ring.length)fail('空边界环 '+id);
      const chain=ring.flatMap(ref=>{
        if(!Number.isInteger(ref)||!ref||!segments[Math.abs(ref)-1])fail('未知边界引用 '+id);
        const s=segments[Math.abs(ref)-1];
        return ref>0?s:s.slice().reverse().map(seg=>seg.slice().reverse());
      });
      for(let i=0;i<chain.length;i++)if(!same(chain[i][3],chain[(i+1)%chain.length][0]))fail('边界环未闭合 '+id);
      return 'M'+fmt(chain[0][0])+chain.map(command).join('')+'Z';
    });
    shapes[id]={...shape,path:paths.join(''),arcIds:[...new Set(shape.rings.flat().map(ref=>Math.abs(ref)-1))]};
  }
  for(const [id,offset] of Object.entries(input.pointLabels||{}))if(!input.points?.[id]||!point(offset))fail('无效城市标签偏移 '+id);
  return {...input,arcs,shapes};
}
if(typeof module==='object'&&module.exports)module.exports={compileGeometry};
else window.LotmMapGeometry={compileGeometry};
})();
