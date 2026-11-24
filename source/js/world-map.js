(() => {
  'use strict';
  const root=document.querySelector('[data-world-map]');
  if(!root) return;
  const {geometry:baseGeometry,variants={},basemaps,checkpoints:allCheckpoints,labels:L}=window.LotmMapData.decode(JSON.parse(root.querySelector('[data-map-data]').textContent));
  const checkpoints=window.LotmMapTransition.compactCheckpoints(allCheckpoints);
  const {positions,bands}=window.LotmMapTransition.timelineLayout(checkpoints);
  let geometry=baseGeometry;
  const $=q=>root.querySelector(q), svg=$('.map-svg'), viewport=$('[data-map-viewport]');
  const slider=$('[data-time]');
  let center={x:geometry.viewBox[0]+geometry.viewBox[2]/2,y:geometry.viewBox[1]+geometry.viewBox[3]/2};
  let current=Math.max(0,checkpoints.findIndex(c=>c.date==='1349-06-28')), selected='', highlighted='', selectedCity='', zoom=1, pan={x:0,y:0}, drag=null, moved=false, cityPointer=null;
  const element=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
  const vector=(tag,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
  let displayedPosition=positions[current];
  let renderedCheckpoint=null, finishTransition=null, pendingRender=false;
  viewport.id='map-world-scene';
  const wrapPan=x=>{const period=geometry.viewBox[2]*zoom;return ((x+period/2)%period+period)%period-period/2;};
  function syncWorldCopies(width){
    const period=geometry.viewBox[2]*zoom,count=Math.ceil(width/period/2)+1;
    const existing=svg.querySelectorAll('[data-world-copy]');
    if(existing.length===count*2){existing.forEach(n=>n.setAttribute('transform',`translate(${Number(n.dataset.worldCopy)*period} 0)`));return;}
    existing.forEach(n=>n.remove());
    for(let i=-count;i<=count;i++)if(i){
      const copy=vector('use',{href:'#map-world-scene',transform:`translate(${i*period} 0)`,'data-world-copy':i,'aria-hidden':'true'});
      copy.addEventListener('pointermove',e=>{if(!drag&&e.pointerType!=='touch')activateCopy(e,false);});
      copy.addEventListener('click',e=>{if(!moved)activateCopy(e,true);});
      copy.addEventListener('pointerleave',()=>{highlighted='';paintSelection();});
      svg.append(copy);
    }
  }
  function activateCopy(e,click){
    const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
    const local=p.matrixTransform(viewport.getScreenCTM().inverse()),w=geometry.viewBox[2],x0=geometry.viewBox[0];
    local.x=((local.x-x0)%w+w)%w+x0;
    const scale=(svg.getScreenCTM()?.a||1)*zoom,c=checkpoints[current];
    const city=c.cities.find(city=>Math.hypot(city.at[0]-local.x,city.at[1]-local.y)*scale<10);
    let target=city?viewport.querySelector(`[data-city="${CSS.escape(city.id)}"]`):null;
    if(!target)target=Array.from(viewport.querySelectorAll('[data-annotation]')).find(n=>{const b=n.getBBox();return local.x>=b.x&&local.x<=b.x+b.width&&local.y>=b.y&&local.y<=b.y+b.height;});
    if(!target)target=Array.from(viewport.querySelectorAll('[data-barrier]')).find(n=>n.querySelector('polygon').isPointInFill(local));
    if(!target)target=Array.from(viewport.querySelectorAll('[data-country]')).find(n=>n.querySelector('path').isPointInFill(local));
    if(target)target.dispatchEvent(click?new MouseEvent('click'):new PointerEvent(target.hasAttribute('data-country')?'pointermove':'pointerenter',{pointerType:e.pointerType}));
    else{highlighted='';paintSelection();}
  }
  function dateLabel(c){
    if(c.era===0)return L.map_earth;
    const years=c.era===5
      ?[Number(c.date.split('-')[0]),c.mergedThrough?Number(c.mergedThrough.date.split('-')[0]):null]
      :(()=>{const match=c.label.match(/(\d+)(?:\s*[-–—至]\s*(\d+))?年/);return match?[Number(match[1]),match[2]?Number(match[2]):null]:null;})();
    if(!years)return c.label;
    return L.map_year_format.replace('{year}',years[0]);
  }
  function layoutDateLabels(){
    const ticks=$('.map-ticks'),labels=Array.from(ticks.children),width=ticks.clientWidth;
    if(!width)return;
    root.querySelectorAll('.map-era-band > span').forEach(cell=>{cell.textContent=width<420?cell.dataset.compact:cell.dataset.full;});
    const boxes=labels.map((label,i)=>{
      label.hidden=false;
      const w=Math.min(width,label.getBoundingClientRect().width);
      const center=labels.length===1?width/2:positions[i]/1000*width;
      const left=center-w/2;label.style.left=center+'px';
      return {label,i,left,right:left+w};
    });
    const ordered=boxes.slice().sort((a,b)=>{
      const rank=x=>x.label.classList.contains('is-current')?0:x.i===0||x.i===labels.length-1?1:x.label.dataset.eraStart==='true'?2:3;
      return rank(a)-rank(b)||a.i-b.i;
    }),visible=[];
    for(const box of ordered){
      const current=box.label.classList.contains('is-current');
      const hide=!current&&visible.some(other=>box.left<other.right+12&&box.right+12>other.left);
      box.label.hidden=hide;if(!hide)visible.push(box);
    }
  }
  function selectRegion(region){selectedCity='';selected=region.title;highlighted=region.title;renderSelection();paintSelection();}
  function renderSelection(){
    const target=$('[data-selection]');target.replaceChildren();
    const c=checkpoints[current],city=c.cities.find(item=>item.id===selectedCity),region=[...c.regions,...c.annotations,...(c.barriers||[])].find(r=>r.title===selected)||(city?{title:city.country}:null);
    if(c.basemap==='earth'){target.append(element('h2',L.map_earth),element('p',L.map_earth_info));return;}
    if(!region){target.append(element('h2',L.map_select),element('p',L.map_hover_hint,'map-muted'));return;}
    const entry=city||region;
    target.append(element('h2',city?city.name:(region.name||region.title)));
    if(city)target.append(element('p',region.title,'map-muted'));
    if(entry.certainty==='inferred')target.append(element('p',city?L.map_city_schematic:L.map_boundary_inferred,'map-muted'));
    if(entry.excerpt)target.append(element('p',entry.excerpt,'map-entry-excerpt'));
    const link=element('a',L.map_preview_entry,'button');link.insertAdjacentHTML('beforeend',' <svg class="wiki-icon" aria-hidden="true" focusable="false"><use href="#wiki-icon-forward"></use></svg>');link.href=entry.url;target.append(link);
    if(entry.excerptSources?.length){const details=element('details'),list=element('ul');details.append(element('summary',L.map_source),list);entry.excerptSources.forEach(source=>list.append(element('li',source)));target.append(details);}
  }
  function paintSelection(){
    updateCityLabels();
    const chosen=checkpoints[current].regions.find(r=>r.title===highlighted);
    root.querySelectorAll('[data-boundary]').forEach(el=>{el.classList.toggle('is-selected',JSON.parse(el.dataset.owners).includes(highlighted));el.style.setProperty('--boundary-accent',chosen?.colors.accent || '#d0f3ed');});
    root.querySelectorAll('[data-country]').forEach(el=>{const active=el.dataset.country===highlighted;el.classList.toggle('is-selected',active);el.setAttribute('aria-pressed',String(active));});
  }
  function draw(){
    const c=checkpoints[current];
    viewport.replaceChildren();
    const coastLayer=vector('g',{'class':'map-coasts'});viewport.append(coastLayer);
    for(const id of geometry.coasts)coastLayer.append(vector('path',{d:geometry.shapes[id].path}));
    // Blend uncertain territorial fills, then clip the result to dry land and
    // outside the seal. Coastlines and labels never enter the blur filter.
    const defs=vector('defs'),filter=vector('filter',{id:'map-frontier-blend',x:'-25%',y:'-25%',width:'150%',height:'150%','color-interpolation-filters':'sRGB'});
    filter.append(vector('feGaussianBlur',{stdDeviation:7}));defs.append(filter);
    const mask=vector('mask',{id:'map-inferred-land',maskUnits:'userSpaceOnUse',x:0,y:0,width:geometry.viewBox[2],height:geometry.viewBox[3]});
    for(const id of geometry.coasts)mask.append(vector('path',{d:geometry.shapes[id].path,fill:'white'}));
    for(const barrier of c.barriers||[])mask.append(vector('polygon',{points:barrier.polygon.map(p=>p.join(',')).join(' '),fill:'black'}));
    defs.append(mask);viewport.append(defs);
    const inferred=new Set(c.regions.filter(r=>r.certainty==='inferred').map(r=>r.title));
    const borders=new Map();
    for(const id of geometry.coasts)for(const arc of geometry.shapes[id].arcIds)borders.set(arc,[]);
    const coastArcs=new Set(borders.keys());
    for(const region of c.regions){
      const shape=geometry.shapes[region.shape];
      for(const arc of shape.arcIds){if(!borders.has(arc))borders.set(arc,[]);borders.get(arc).push(region.title);}
      const g=vector('g',{'class':'map-region',role:'button',tabindex:'0','aria-label':region.title,'aria-pressed':'false','data-country':region.title,'data-region':region.shape});
      g.style.setProperty('--region-color',region.colors.primary);
      g.style.setProperty('--region-accent',region.colors.accent);
      const path=vector('path',{d:shape.path,...(shape.clip?{'clip-path':`url(#map-clip-${shape.clip})`}:{})});
      const label=vector('text',{x:0,y:0,transform:`translate(${shape.label[0]} ${shape.label[1]}) scale(${shape.labelScale||1})`,'text-anchor':'middle'});label.textContent=region.title;
      if(region.certainty==='inferred'){
        g.dataset.inferred='true';
        path.setAttribute('filter','url(#map-frontier-blend)');
        const fill=vector('g',{'mask':'url(#map-inferred-land)'});fill.append(path);g.append(fill,label);
      }else g.append(path,label);
      g.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'&&!drag&&highlighted!==region.title)selectRegion(region);});
      g.addEventListener('pointerleave',()=>{highlighted='';paintSelection();});
      g.addEventListener('blur',()=>{highlighted='';paintSelection();});
      g.addEventListener('focus',()=>selectRegion(region));
      g.addEventListener('click',()=>{if(!moved)selectRegion(region);});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(region);}});
      viewport.append(g);
    }
    const geographic=vector('g',{'class':'map-geographic-labels','aria-hidden':'true'});
    for(const label of [...geometry.labels,...(c.geography||[])]){
      const group=vector('g',{'data-geography':label.id||label.key,'class':'map-geographic-label'});
      const text=vector('text',{x:label.at[0],y:label.at[1],'text-anchor':'middle'});text.textContent=label.name||L[label.key];group.append(text);
      if(label.source){const title=vector('title');title.textContent=label.source;group.append(title);}
      geographic.append(group);
    }
    const boundaryLayer=vector('g',{'class':'map-boundaries','aria-hidden':'true'});
    for(const [id,owners] of borders){const uncertain=!coastArcs.has(id)&&owners.length&&owners.every(name=>inferred.has(name));boundaryLayer.append(vector('path',{d:coastArcs.has(id)?geometry.arcs[id].strokePath:geometry.arcs[id].path,'data-boundary':id,'data-owners':JSON.stringify(owners),...(uncertain?{'data-inferred-boundary':''}:{}),...(coastArcs.has(id)?{'data-coast-border':''}:{})}));}
    const terrainLayer=vector('g',{'class':'map-terrain','clip-path':'url(#map-clip-north)'});
    for(const feature of c.landforms||[]){
      const group=vector('g',{'data-landform':feature.geometry});
      const title=vector('title');title.textContent=feature.name;group.append(title);
      for(const path of window.LotmTerrain.terrainPaths(feature))group.append(vector('path',{d:path.d,'class':'map-terrain-'+path.kind}));
      terrainLayer.append(group);
    }
    const formerBorders=vector('g',{'class':'map-former-boundaries','aria-hidden':'true'});
    const formerPaths=new Set(c.annotations.filter(a=>!c.regions.some(r=>r.shape===a.outline?.shape)).flatMap(a=>a.outlinePaths||[]));
    for(const d of formerPaths)formerBorders.append(vector('path',{d}));
    viewport.append(terrainLayer,formerBorders,boundaryLayer,geographic);
    for(const barrier of c.barriers||[]){
      const group=vector('g',{'class':'map-barrier',role:'button',tabindex:'0','aria-label':barrier.name,'data-barrier':barrier.geometry});
      const area=vector('polygon',{points:barrier.polygon.map(p=>p.join(',')).join(' '),'class':'map-barrier-area','clip-path':`url(#map-clip-${barrier.clip})`});
      const path='M'+barrier.frontier.map(p=>p.join(' ')).join('L');
      group.append(area,vector('path',{d:path,'class':'map-barrier-haze'}),vector('path',{d:path,'class':'map-barrier-edge'}));
      const label=vector('text',{x:barrier.label[0],y:barrier.label[1],'text-anchor':'middle'});label.textContent=barrier.name;group.append(label);
      group.addEventListener('click',()=>{if(!moved)selectRegion(barrier);});
      group.addEventListener('focus',()=>selectRegion(barrier));
      group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(barrier);}});
      viewport.append(group);
    }
    const cityLayer=vector('g',{'class':'map-cities'});
    for(const [cityIndex,city] of c.cities.entries()) {
      const marker=vector('g',{'class':'map-city',role:'button',tabindex:'0','aria-label':city.name,'data-city':city.id,'data-city-country':city.country,transform:`translate(${city.at[0]} ${city.at[1]})`});
      const title=vector('title');title.textContent=city.name+' · '+L.map_city_schematic;
      const hit=vector('circle',{r:8,'class':'map-city-hit'}),dot=vector('circle',{r:2.6,'class':'map-city-dot'});
      const offset=geometry.pointLabels?.[city.point] || [cityIndex%2?6:-6,-5];
      const label=vector('text',{x:offset[0],y:offset[1],'text-anchor':offset[0]<0?'end':'start'});label.textContent=city.name;
      const choose=()=>{selected=city.country;selectedCity=city.id;renderSelection();paintSelection();};
      marker.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!drag)choose();});
      marker.addEventListener('focus',choose);
      marker.append(title,hit,dot,label);marker.addEventListener('click',()=>{if(!moved)choose();});
      marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
      cityLayer.append(marker);
    }
    viewport.append(cityLayer);
    for(const annotation of window.LotmMapData.visibleAnnotations(c)){
      const marker=vector('text',{x:annotation.at[0],y:annotation.at[1],'text-anchor':'middle',class:'map-area-label',role:'button',tabindex:'0','data-annotation':annotation.point,'aria-label':annotation.name});
      marker.textContent=annotation.name;
      const choose=()=>selectRegion(annotation);
      marker.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!drag)choose();});
      marker.addEventListener('focus',choose);
      marker.addEventListener('click',()=>{if(!moved)choose();});
      marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
      viewport.append(marker);
    }
    paintSelection();transform();
  }
  function render(){
    if(finishTransition){pendingRender=true;return;}
    pendingRender=false;
    const previousCheckpoint=renderedCheckpoint,previousGeometry=geometry;
    const previousViewBox=svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const matrix=viewport.transform.baseVal.consolidate()?.matrix;
    if(matrix){previousViewBox[0]=(previousViewBox[0]-matrix.e)/matrix.a;previousViewBox[1]=(previousViewBox[1]-matrix.f)/matrix.d;previousViewBox[2]/=matrix.a;previousViewBox[3]/=matrix.d;}
    const previous=Array.from(viewport.childNodes).map(node=>node.cloneNode(true));
    selected='';selectedCity='';highlighted='';
    const c=checkpoints[current];
    const nextGeometry=c.basemap?basemaps[c.basemap]:(variants[c.geometryVariant]||baseGeometry);
    if(geometry!==nextGeometry){
      // Preserve the viewed position and zoom even when a basemap uses
      // different drawing units. Only the reset control recentres the map.
      const unitRatio=nextGeometry.viewBox[3]/geometry.viewBox[3];
      pan={x:pan.x*unitRatio,y:pan.y*unitRatio};
      geometry=nextGeometry;
    }
    center={x:geometry.viewBox[0]+geometry.viewBox[2]/2,y:geometry.viewBox[1]+geometry.viewBox[3]/2};
    const nodes=checkpoints.map((c,i)=>({c,i})), index=current;
    const fromPosition=displayedPosition,toPosition=positions[index];
    slider.max='1000';slider.value=String(displayedPosition);slider.disabled=nodes.length<2;slider.setAttribute('aria-valuetext',[...new Set([L['map_era_'+c.era],dateLabel(c),c.title])].join(' · '));
    const band=$('.map-era-band');band.replaceChildren();
    const columns=bands.map(b=>b.width+'fr').join(' ');band.style.gridTemplateColumns=columns;
    const segments=$('.map-track-segments');segments.style.gridTemplateColumns=columns;segments.replaceChildren(...bands.map(()=>element('span')));
    bands.forEach(({era:epoch})=>{const cell=element('span',L['map_era_'+epoch]);cell.classList.toggle('is-current',epoch===c.era);cell.title=L['map_era_'+epoch];cell.dataset.full=cell.title;cell.dataset.compact=cell.title.replace(/^第/,'');band.append(cell);});
    const ticks=$('.map-ticks');ticks.replaceChildren();nodes.forEach(({c:node},i)=>{
      const eraStart=i===0||nodes[i-1].c.era!==node.era;
      const full=L['map_era_'+node.era]+' · '+dateLabel(node),t=element('span',dateLabel(node));
      t.title=full+' · '+node.title;
      t.dataset.eraStart=String(eraStart);
      t.dataset.full=full;t.dataset.compact=full;
      t.classList.toggle('is-current',i===index);ticks.append(t);
    });
    layoutDateLabels();
    $('[data-step="-1"]').disabled=current===0;$('[data-step="1"]').disabled=current===checkpoints.length-1;
    if(![...c.regions,...c.annotations,...(c.barriers||[])].some(r=>r.title===selected))selected='';
    if(!c.cities.some(city=>city.id===selectedCity))selectedCity='';
    draw();renderSelection();
    renderedCheckpoint=c;
    let change=window.LotmMapTransition?.between(previousCheckpoint,c);
    if(!change&&previousCheckpoint&&((previousCheckpoint.basemap==='earth')!==(c.basemap==='earth'))){
      const migration=checkpoints.find(node=>node.transition?.kind==='migration')?.transition;
      if(migration)change={transition:migration,reverse:c.basemap==='earth'};
    }
    if(change&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      finishTransition=window.LotmMapTransition.animate({viewport,previous,previousViewBox,previousGeometry,geometry,previousCheckpoint,checkpoint:c,...change,duration:window.LotmMapTransition.travelDuration(fromPosition,toPosition,change.transition.kind),onProgress:p=>{displayedPosition=fromPosition+(toPosition-fromPosition)*p;slider.value=String(displayedPosition);layoutMapLabels();},onFinish:()=>{finishTransition=null;if(pendingRender){render();return;}transform();paintSelection();}});
    }else{displayedPosition=toPosition;slider.value=String(toPosition);}
  }
  function updateCityLabels(){
    // Screen-space proximity stays consistent at every zoom level.
    root.querySelectorAll('[data-city]').forEach(el=>{
      const dot=el.querySelector('.map-city-dot').getBoundingClientRect();
      const period=geometry.viewBox[2]*(svg.getScreenCTM()?.a||1)*zoom;
      const dx=cityPointer?cityPointer.x-(dot.left+dot.width/2):0;
      const wrappedDx=((dx+period/2)%period+period)%period-period/2;
      const nearby=cityPointer&&Math.hypot(wrappedDx,cityPointer.y-(dot.top+dot.height/2))<=65;
      const reveal=Boolean(nearby)||el.matches(':focus-visible');
      el.classList.toggle('is-nearby',reveal);
      el.classList.toggle('show-label',reveal);
      el.classList.toggle('is-selected',el.dataset.city===selectedCity);
      el.setAttribute('aria-pressed',String(el.dataset.city===selectedCity));
    });
    layoutMapLabels();
  }
  function layoutMapLabels(){
    const labels=Array.from(viewport.querySelectorAll('text'));
    labels.forEach(n=>n.removeAttribute('data-label-hidden'));
    const opacityCache=new Map();
    const opacityOf=n=>{
      if(!n||n===viewport)return 1;
      if(!opacityCache.has(n))opacityCache.set(n,Number(getComputedStyle(n).opacity)*opacityOf(n.parentElement));
      return opacityCache.get(n);
    };
    const candidates=labels.flatMap((node,index)=>{
      if(getComputedStyle(node).visibility==='hidden'||opacityOf(node)<=.03)return [];
      const city=node.closest('[data-city]');
      const focused=node.matches(':focus')||city?.matches(':focus');
      const priority=focused||city?.dataset.city===selectedCity?0:node.closest('.map-region')?1:node.matches('[data-annotation]')?2:city?4:3;
      const box=node.getBoundingClientRect();
      if(!box.width||!box.height)return [];
      return [{index,priority,box}];
    });
    const visible=new Set(window.LotmMapData.selectLabels(candidates));
    for(const {index} of candidates)if(!visible.has(index))labels[index].setAttribute('data-label-hidden','true');
  }
  function transform(){
    // Minimum zoom fits all latitudes; longitude repeats seamlessly.
    const aspect=Math.max(1,svg.clientWidth)/Math.max(1,svg.clientHeight);
    const height=geometry.viewBox[3],width=height*aspect;
    const verticalLimit=height*(zoom-1)/2;
    pan.x=wrapPan(pan.x);pan.y=Math.max(-verticalLimit,Math.min(verticalLimit,pan.y));
    svg.setAttribute('viewBox',[center.x-width/2,center.y-height/2,width,height].join(' '));
    updateCityLabels();viewport.setAttribute('transform',`translate(${pan.x} ${pan.y}) translate(${center.x} ${center.y}) scale(${zoom}) translate(${-center.x} ${-center.y})`);
    syncWorldCopies(width);
    const scale=(svg.getScreenCTM()?.a || 1)*zoom;
    for(const city of checkpoints[current].cities){const marker=root.querySelector(`[data-city="${CSS.escape(city.id)}"]`);if(marker)marker.setAttribute('transform',`translate(${city.at[0]} ${city.at[1]}) scale(${1/scale})`);}
    updateCityLabels();
  }
  function setZoom(value,anchor){
    if(finishTransition)return;
    const next=Math.max(1,Math.min(5,value)), ratio=next/zoom;
    if(anchor)pan={x:anchor.x-center.x-(anchor.x-center.x-pan.x)*ratio,y:anchor.y-center.y-(anchor.y-center.y-pan.y)*ratio};
    else pan={x:pan.x*ratio,y:pan.y*ratio};
    zoom=next;transform();
  }
  $('[data-zoom="in"]').onclick=()=>setZoom(zoom*1.25);$('[data-zoom="out"]').onclick=()=>setZoom(zoom/1.25);$('[data-zoom="reset"]').onclick=()=>{if(finishTransition)return;pan={x:0,y:0};setZoom(1);};
  svg.addEventListener('wheel',e=>{e.preventDefault();if(finishTransition)return;if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){pan.x=wrapPan(pan.x-e.deltaX/(svg.getScreenCTM()?.a||1));transform();}else if(e.deltaY)setZoom(zoom*(e.deltaY<0?1.12:1/1.12),svgPoint(e));},{passive:false});
  function svgPoint(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
  svg.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'){cityPointer=null;updateCityLabels();}});
  svg.addEventListener('focusout',()=>requestAnimationFrame(updateCityLabels));
  svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;if(finishTransition){e.preventDefault();return;}cityPointer={x:e.clientX,y:e.clientY};updateCityLabels();moved=false;drag={id:e.pointerId,point:svgPoint(e),pan:{...pan}};});
  svg.addEventListener('pointermove',e=>{cityPointer={x:e.clientX,y:e.clientY};updateCityLabels();if(!drag||drag.id!==e.pointerId)return;const p=svgPoint(e),dx=p.x-drag.point.x,dy=p.y-drag.point.y;if(Math.hypot(dx,dy)>5){moved=true;svg.setPointerCapture(e.pointerId);}if(moved){pan={x:wrapPan(drag.pan.x+dx),y:drag.pan.y+dy};transform();}});
  const endDrag=()=>{drag=null;};svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);svg.addEventListener('lostpointercapture',endDrag);
  slider.oninput=()=>{
    const value=Number(slider.value);slider.value=String(displayedPosition);
    current=positions.reduce((best,position,i)=>Math.abs(position-value)<Math.abs(positions[best]-value)?i:best,0);render();
  };
  slider.onkeydown=e=>{
    const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-1,PageUp:1}[e.key];
    if(delta===undefined&&!['Home','End'].includes(e.key))return;
    e.preventDefault();current=e.key==='Home'?0:e.key==='End'?checkpoints.length-1:Math.max(0,Math.min(checkpoints.length-1,current+delta));render();
  };
  root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{current=Math.max(0,Math.min(checkpoints.length-1,current+Number(b.dataset.step)));render();});
  window.addEventListener('pagehide',()=>{pendingRender=false;if(finishTransition)finishTransition();});
  render();
  new ResizeObserver(()=>{if(!finishTransition)transform();layoutDateLabels();}).observe(svg);
})();
