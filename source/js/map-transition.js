/* Shared territorial reveal, border drawing and coastline migration. */
(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const el=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
  // Measure displayed frame time rather than jumping to wall-clock progress.
  // A suspended tab or a long frame slows the animation instead of skipping it.
  function advanceFrame(clock,time,duration){
    if(clock.last!==null)clock.elapsed+=Math.min(50,Math.max(0,time-clock.last));
    clock.last=time;
    return Math.min(1,clock.elapsed/duration);
  }
  // Compact only adjacent, visually identical snapshots in the same epoch.
  // Original event records remain untouched; redirects preserve sourced transitions.
  function compactCheckpoints(input){
    const signature=c=>JSON.stringify({era:c.era,geometry:c.geometryVariant,basemap:c.basemap,
      regions:c.regions.map(r=>[r.shape,r.title,r.certainty,r.colors]),
      cities:c.cities.map(r=>[r.id,r.name,r.at]),annotations:c.annotations.map(r=>[r.name,r.at,r.outline]),
      geography:(c.geography||[]).map(r=>[r.id,r.name,r.at]),barriers:(c.barriers||[]).map(r=>[r.geometry,r.name]),landforms:c.landforms.map(r=>[r.geometry,r.name,r.type])});
    const output=[],aliases=new Map();
    for(const item of input){
      const previous=output.at(-1);
      if(previous&&signature(previous)===signature(item)){
        previous.mergedThrough=item;aliases.set(item.id,previous.id);continue;
      }
      const next={...item};
      if(item.transition&&aliases.has(item.transition.from))next.transition={...item.transition,from:aliases.get(item.transition.from)};
      output.push(next);
    }
    return output;
  }
  // Display scale, not a new chronology: ranges stay ranges, unknown eras
  // receive a neutral width. Square roots compress long spans for usable stops.
  function timelineLayout(checkpoints){
    const yearRange=c=>{
      if(c.era===0)return null;
      const m=c.era===5?c.date?.match(/^(\d+)/):c.label?.match(/(\d+)(?:\s*[-–—至]\s*(\d+))?年/);
      if(!m)return null;
      const end=c.mergedThrough?yearRange(c.mergedThrough)?.[1]:null;
      return [Number(m[1]),end??Number(m[2]||m[1])];
    };
    const epochs=[...new Set(checkpoints.map(c=>c.era))];
    const groups=epochs.map(era=>{
      const indices=checkpoints.flatMap((c,i)=>c.era===era?[i]:[]);
      const ranges=indices.map(i=>yearRange(checkpoints[i]));
      const known=ranges.filter(Boolean),span=known.length?Math.max(...known.map(r=>r[1]))-Math.min(...known.map(r=>r[0])):0;
      return {era,indices,ranges,weight:era===0?16:24+Math.sqrt(span)};
    });
    const total=groups.reduce((sum,g)=>sum+g.weight,0),positions=[];let offset=0;
    const bands=groups.map((g,groupIndex)=>{
      const width=g.weight/total*1000,start=offset;offset+=width;
      const gaps=g.indices.slice(1).map((_,i)=>18+Math.sqrt(Math.max(0,(g.ranges[i+1]?.[0]??0)-(g.ranges[i]?.[0]??0))));
      const sum=gaps.reduce((a,b)=>a+b,0);let distance=0;
      const lo=groupIndex===0?0:.12,hi=groupIndex===groups.length-1?1:.88;
      g.indices.forEach((index,i)=>{if(i)distance+=gaps[i-1];positions[index]=start+width*(sum ? lo+(hi-lo)*distance/sum : .5);});
      return {era:g.era,start,width};
    });
    if(positions.length){positions[0]=0;if(positions.length>1)positions[positions.length-1]=1000;}
    return {positions,bands};
  }
  function travelDuration(from,to,kind){
    return kind==='migration'?2800:Math.round(460+1400*Math.sqrt(Math.min(1,Math.abs(to-from)/1000)));
  }
  // Derived from existing snapshots; never serialize intermediate territories.
  function territorialChanges(previous,next,oldGeometry,newGeometry){
    const unchanged=(region,others,a,b)=>others.some(other=>other.shape===region.shape
      &&a.shapes[region.shape]?.path===b.shapes[other.shape]?.path);
    return {
      entering:next.regions.filter(r=>!unchanged(r,previous.regions,newGeometry,oldGeometry)).map(r=>r.shape),
      leaving:previous.regions.filter(r=>!unchanged(r,next.regions,oldGeometry,newGeometry)).map(r=>r.shape)
    };
  }
  function animateMigration({viewport,previous,previousViewBox,previousGeometry,geometry,transition,reverse,onFinish,onProgress}){
    const svg=viewport.ownerSVGElement,finalView=svg.getAttribute('viewBox');
    const earth=reverse?geometry:previousGeometry,history=reverse?previousGeometry:geometry;
    const target=el('g');target.append(...Array.from(viewport.childNodes));
    const land=el('g',{'class':'map-migration-land','aria-hidden':'true','pointer-events':'none'});
    const destinationHeight=geometry.viewBox[3];
    const earthWidth=earth.viewBox[2]*destinationHeight/earth.viewBox[3],historyWidth=history.viewBox[2]*destinationHeight/history.viewBox[3];
    const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
    const sample=(path,count)=>{
      const points=(path.match(/[MC][^MCZ]*/g)||[]).map(command=>{const values=command.slice(1).trim().split(/[ ,]+/).map(Number);return values.slice(-2);});
      return resample(points,count);
    };
    const area=p=>p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0)/2;
    const center=p=>p.reduce((c,a)=>[c[0]+a[0]/p.length,c[1]+a[1]/p.length],[0,0]);
    const resample=(points,count)=>{
      const lengths=[0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];lengths.push(lengths[i]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
      let edge=0;return Array.from({length:count},(_,i)=>{const distance=lengths.at(-1)*i/count;while(edge<points.length-1&&lengths[edge+1]<distance)edge++;const a=points[edge],b=points[(edge+1)%points.length],t=(distance-lengths[edge])/(lengths[edge+1]-lengths[edge]||1);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];});
    };
    const rings=g=>g.coasts.flatMap(id=>g.shapes[id].path.split(/(?=M)/).filter(Boolean).map((d,index)=>{
      const points=sample(d,Math.max(32,Math.min(1536,Math.max(32,(d.match(/C/g)||[]).length)))).map(p=>[(p[0]-g.viewBox[0])/g.viewBox[2],(p[1]-g.viewBox[1])/g.viewBox[3]]);
      return {id,index,points,area:Math.abs(area(points)),center:center(points)};
    }));
    let from=rings(earth),to=rings(history);
    // The modern Americas share one coastline. Split at the data-defined isthmus
    // so their two destination continents can separate without a crossfade.
    for(const split of transition.splits||[]){
      const original=from.find(r=>r.id===split.shape&&r.index===split.ring);
      if(!original)continue;
      from=from.filter(r=>r!==original);
      const p=original.points,n=p.length,distance=q=>Math.hypot(q[0]-split.at[0],q[1]-split.at[1]);
      const indices=p.map((_,i)=>i).sort((a,b)=>distance(p[a])-distance(p[b]));
      const first=indices[0],second=indices.find(i=>Math.min(Math.abs(i-first),n-Math.abs(i-first))>n*.06);
      const lo=Math.min(first,second),hi=Math.max(first,second);
      for(const points of [p.slice(lo,hi+1),p.slice(hi).concat(p.slice(0,lo+1))])from.push({...original,points,area:Math.abs(area(points)),center:center(points)});
    }
    const pairs=[],unused=new Set(to);
    // Largest landmasses claim their nearest comparable destination first.
    for(const a of from.slice().sort((a,b)=>b.area-a.area)){
      let best=null,cost=Infinity;
      for(const b of unused){const distance=Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1]);const score=distance+.06*Math.abs(Math.log((a.area+1e-7)/(b.area+1e-7)));if(score<cost){best=b;cost=score;}}
      if(best&&cost<.42){unused.delete(best);pairs.push([a,best]);}else pairs.push([a,null]);
    }
    for(const b of unused)pairs.push([null,b]);
    const morphs=pairs.map(([a,b])=>{
      const count=Math.max(a?.points.length||0,b?.points.length||0,32);
      const nearest=(p,collection)=>collection.flatMap(r=>r.points).reduce((best,q)=>Math.hypot(q[0]-p[0],q[1]-p[1])<Math.hypot(best[0]-p[0],best[1]-p[1])?q:best,collection[0].points[0]);
      let ap=a?resample(a.points,count):Array(count).fill(nearest(b.center,from));
      let bp=b?resample(b.points,count):Array(count).fill(nearest(a.center,to));
      if(area(ap)*area(bp)<0)bp.reverse();
      // Align the closed rings' starting vertex to prevent twisting coastlines.
      if(a&&b){let offset=0,best=Infinity;for(let j=0;j<count;j++){let cost=0;for(let i=0;i<count;i+=Math.max(1,Math.floor(count/64))){const q=bp[(i+j)%count];cost+=(ap[i][0]-q[0])**2+(ap[i][1]-q[1])**2;}if(cost<best){best=cost;offset=j;}}bp=bp.map((_,i)=>bp[(i+offset)%count]);}
      const path=el('path');land.append(path);return {path,ap,bp};
    });
    // Labels and relief arrive after the coasts have nearly reached their destination.
    const details=reverse?el('g'):target.cloneNode(true);
    if(reverse){details.append(...previous);const k=destinationHeight/previousGeometry.viewBox[3];details.setAttribute('transform',`scale(${k})`);}
    if(details){details.querySelectorAll('.map-coasts,.map-boundaries').forEach(n=>n.remove());details.setAttribute('pointer-events','none');}
    viewport.replaceChildren(land,...(details?[details]:[]));
    const ratio=destinationHeight/previousGeometry.viewBox[3],startView=previousViewBox.map(v=>v*ratio),endView=finalView.split(/\s+/).map(Number);
    const copies=Array.from(svg.querySelectorAll('[data-world-copy]'));
    const motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,done=false;const clock={elapsed:0,last:null};
    const resetClock=()=>{clock.last=null;};document.addEventListener('visibilitychange',resetClock);
    const paint=p=>{
      const deformation=smooth(p/.7),camera=smooth((p-.7)/.3);
      const t=reverse?1-deformation:deformation;
      for(const {path,ap,bp} of morphs)path.setAttribute('d',ap.map((a,i)=>{const b=bp[i];return (i?'L':'M')+(a[0]*earthWidth*(1-t)+b[0]*historyWidth*t).toFixed(2)+' '+((a[1]*(1-t)+b[1]*t)*destinationHeight).toFixed(2);}).join('')+'Z');
      const period=earthWidth*(1-t)+historyWidth*t;
      copies.forEach(n=>n.setAttribute('transform',`translate(${Number(n.dataset.worldCopy)*period} 0)`));
      if(details)details.setAttribute('opacity',reverse?1-smooth(deformation/.2):smooth((deformation-.8)/.2));
      svg.setAttribute('viewBox',startView.map((v,i)=>v+(endView[i]-v)*camera).join(' '));
      viewport.setAttribute('data-transition-progress',p.toFixed(3));onProgress(p);
    };
    const finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);svg.setAttribute('viewBox',finalView);viewport.replaceChildren(...Array.from(target.childNodes));copies.forEach(n=>n.setAttribute('transform',`translate(${Number(n.dataset.worldCopy)*geometry.viewBox[2]} 0)`));viewport.removeAttribute('data-transition-progress');viewport.removeAttribute('data-transition-kind');motion.removeEventListener('change',finish);document.removeEventListener('visibilitychange',resetClock);onProgress(1);onFinish();};
    viewport.setAttribute('data-transition-kind','migration');paint(0);
    const tick=time=>{if(done)return;const p=advanceFrame(clock,time,2800);paint(p);if(p<1)frame=requestAnimationFrame(tick);else finish();};
    if(motion.matches)finish();else{motion.addEventListener('change',finish);frame=requestAnimationFrame(tick);}
    return finish;
  }
  const api={advanceFrame,compactCheckpoints,timelineLayout,travelDuration,territorialChanges,between(previous,next){
    if(!previous||!next)return null;
    if(next.transition?.from===previous.id)return {transition:next.transition,reverse:false};
    if(previous.transition?.from===next.id)return {transition:previous.transition,reverse:true};
    // Presentation continuity is independent of sourced territorial changes.
    if(previous.id!==next.id&&previous.era>0&&next.era>0)return {transition:{kind:'presentation'},reverse:false};
    return null;
  },animate({viewport,previous,previousViewBox,previousGeometry,geometry,previousCheckpoint,checkpoint,transition,reverse=false,duration,onProgress=()=>{},onFinish=()=>{}}){
    if(transition.kind==='migration')return animateMigration({viewport,previous,previousViewBox,previousGeometry,geometry,transition,reverse,onFinish,onProgress});
    // Stable coasts remain separate from territory fills and changing borders.
    const target=el('g'),old=el('g',{'aria-hidden':'true','pointer-events':'none'});
    target.append(...Array.from(viewport.childNodes));old.append(...previous);
    old.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));
    old.querySelectorAll('.is-selected').forEach(n=>n.classList.remove('is-selected'));
    // Coast, relief and geographic labels stay fixed across political scenes.
    const stable=el('g',{'aria-hidden':'true','pointer-events':'none'});
    for(const selector of ['.map-coasts','.map-terrain']){
      const node=target.querySelector(selector);if(node)stable.append(node);
      old.querySelectorAll(selector).forEach(n=>n.remove());
    }
    // Identical territories and the persistent seal do not blink at every date.
    // Definitions stay in the target tree so old and new gradients share one ID.
    old.querySelectorAll('defs').forEach(n=>n.remove());
    for(const selector of ['[data-country]','[data-barrier]','[data-city]','[data-annotation]','[data-geography]']){
      for(const node of Array.from(target.querySelectorAll(selector))){
        const attr=selector.slice(1,-1),key=node.getAttribute(attr);
        const prior=Array.from(old.querySelectorAll(selector)).find(n=>n.getAttribute(attr)===key&&(attr!=='data-country'||n.dataset.region===node.dataset.region));
        if(prior&&prior.innerHTML===node.innerHTML&&prior.getAttribute('style')===node.getAttribute('style')){prior.remove();stable.append(node);}
      }
    }
    // Text survives a boundary change independently of its country's fill.
    // Keep its original parent for the final interactive scene.
    const textMoves=[];
    const numbers=value=>(value||'').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number)||[];
    for(const node of Array.from(target.querySelectorAll('[data-country] > text'))){
      const parent=node.parentNode;
      const prior=Array.from(old.querySelectorAll('[data-country] > text')).find(n=>n.textContent===node.textContent&&n.parentNode.dataset.region===parent.dataset.region)
        ||Array.from(old.querySelectorAll('[data-country] > text')).find(n=>n.textContent===node.textContent);
      if(!prior)continue;
      const holder=el('g',{'class':parent.getAttribute('class'),style:parent.getAttribute('style')||''});
      const attributes=['x','y','transform'].map(name=>({name,from:prior.getAttribute(name),to:node.getAttribute(name)}));
      prior.remove();holder.append(node);stable.append(holder);textMoves.push({node,parent,holder,attributes});
    }
    const changingOldText=Array.from(old.querySelectorAll('text'));
    const changingNewText=Array.from(target.querySelectorAll('text'));
    const shore=el('g',{'class':'map-boundaries'});
    target.querySelectorAll('[data-coast-border]').forEach(n=>shore.append(n));
    old.querySelectorAll('[data-coast-border]').forEach(n=>n.remove());
    // Reuse unchanged shared borders as well as unchanged country fills.
    for(const path of Array.from(target.querySelectorAll('[data-boundary]'))){
      const prior=Array.from(old.querySelectorAll('[data-boundary]')).find(n=>n.getAttribute('d')===path.getAttribute('d')&&n.dataset.owners===path.dataset.owners);
      if(prior){prior.remove();shore.append(path);}
    }
    stable.append(shore);
    target.style.pointerEvents='none';viewport.replaceChildren(stable,old,target);
    const changes=territorialChanges(previousCheckpoint,checkpoint,previousGeometry,geometry);
    const revealLayer=reverse?old:target;
    // Transfers blend ownership without inventing a direction of conquest.
    const allowed=new Set(transition.kind==='split' ? transition.after||[] : []);
    const changed=new Set((reverse?changes.leaving:changes.entering).filter(id=>allowed.has(id)));
    const revealDefs=el('defs'),reveals=[];
    viewport.prepend(revealDefs);
    for(const region of revealLayer.querySelectorAll('[data-region]')){
      if(!changed.has(region.dataset.region))continue;
      const path=region.querySelector('path');if(!path)continue;
      // Clip an existing fill, including its uncertainty mask; never scale the
      // coastline itself or store a second set of intermediate polygons.
      const fill=path.parentNode===region?path:path.parentNode;
      const box=path.getBBox(),cx=box.x+box.width/2,cy=box.y+box.height/2;
      const radius=Math.hypot(box.width,box.height)/2+16;
      const id='map-territory-reveal-'+reveals.length;
      const clip=el('clipPath',{id,clipPathUnits:'userSpaceOnUse'}),circle=el('circle',{cx,cy,r:0});
      clip.append(circle);revealDefs.append(clip);
      const wrapper=el('g',{'clip-path':`url(#${id})`,'data-territory-reveal':region.dataset.region});
      fill.replaceWith(wrapper);wrapper.append(fill);reveals.push({wrapper,fill,circle,radius});
    }
    const details=Array.from(target.children).filter(n=>!n.matches('[data-country],defs'));
    const drawingLayer=reverse?old:target;
    const affected=new Set([...(transition.before||[]),...(transition.after||[])]);
    const affectedNames=new Set([...(previousCheckpoint?.regions||[]),...(checkpoint?.regions||[])].filter(r=>affected.has(r.shape)).map(r=>r.title));
    const strokes=Array.from(drawingLayer.querySelectorAll('[data-boundary]:not([data-coast-border])')).filter(path=>JSON.parse(path.dataset.owners||'[]').some(name=>affectedNames.has(name))).map(path=>({path,length:path.getTotalLength()}));
    viewport.dataset.territoryChanges=String(reveals.length);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,done=false;const clock={elapsed:0,last:null};
    const resetClock=()=>{clock.last=null;};document.addEventListener('visibilitychange',resetClock);
    const finish=()=>{
      if(done)return;done=true;cancelAnimationFrame(frame);
      target.style.pointerEvents='';
      for(const {wrapper,fill} of reveals)wrapper.replaceWith(fill);
      revealDefs.remove();
      for(const {path} of strokes){path.removeAttribute('stroke-dasharray');path.removeAttribute('stroke-dashoffset');}
      delete viewport.dataset.territoryChanges;
      for(const {node,parent,holder,attributes} of textMoves){
        for(const {name,to} of attributes)if(to===null)node.removeAttribute(name);else node.setAttribute(name,to);
        parent.append(node);holder.remove();
      }
      changingNewText.forEach(n=>n.removeAttribute('opacity'));
      details.forEach(n=>n.removeAttribute('opacity'));
      viewport.replaceChildren(...Array.from(stable.childNodes),...Array.from(target.childNodes));
      viewport.removeAttribute('data-transition-progress');viewport.removeAttribute('data-transition-kind');
      motion.removeEventListener('change',finish);document.removeEventListener('visibilitychange',resetClock);onProgress(1);onFinish();
    };
    const paint=p=>{
      old.setAttribute('opacity',reverse&&reveals.length?1:1-p);target.setAttribute('opacity',reverse||!reveals.length?p:1);
      for(const {circle,radius} of reveals)circle.setAttribute('r',radius*(reverse?1-p:p));
      details.forEach(n=>n.setAttribute('opacity',p));
      const ink=Math.max(0,Math.min(1,(p-.15)/.75));
      for(const {path,length} of strokes){path.setAttribute('stroke-dasharray',String(length));path.setAttribute('stroke-dashoffset',String(length*(reverse?ink:1-ink)));}
      for(const {node,attributes} of textMoves)for(const {name,from,to} of attributes){
        const a=numbers(from),b=numbers(to);
        if(from!==null&&to!==null&&a.length===b.length){let i=0;node.setAttribute(name,to.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi,()=>String(a[i]+(b[i]-a[i++])*p)));}
      }
      changingOldText.forEach(n=>n.setAttribute('opacity',Math.max(0,1-p*2)));
      changingNewText.forEach(n=>n.setAttribute('opacity',Math.max(0,p*2-1)));
      viewport.setAttribute('data-transition-progress',p.toFixed(3));onProgress(p);
    };
    viewport.setAttribute('data-transition-kind',transition.kind);paint(0);
    const tick=time=>{
      if(done)return;
      const p=advanceFrame(clock,time,duration??(transition.kind==='scene'?850:560));
      paint(p*p*(3-2*p));
      if(p<1)frame=requestAnimationFrame(tick);else finish();
    };
    if(motion.matches)finish();else {motion.addEventListener('change',finish);frame=requestAnimationFrame(tick);}

    return finish;
  }};
  if(typeof module==='object'&&module.exports)module.exports=api;else window.LotmMapTransition=api;
})();
