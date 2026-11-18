'use strict';
indexedCharacters.forEach(p=>{const existing=characters.find(c=>c.id===p.id);if(existing)Object.assign(existing,{mentions:p.mentions,mentionTerm:p.mentionTerm,counts:p.counts,alias:p.alias||existing.alias,aliasSources:p.aliasSources,matchNote:p.matchNote,classificationEvidence:p.classificationEvidence});else characters.push(p)});
const canvas=document.getElementById('graph'),ctx=canvas.getContext('2d'),content=document.getElementById('content'),search=document.getElementById('search'),isolates=document.getElementById('isolates');
const byId=new Map(characters.map(p=>[p.id,p])), adjacency=new Map(characters.map(p=>[p.id,[]]));
relations.forEach(r=>{adjacency.get(r.a)?.push(r);adjacency.get(r.b)?.push(r)});
const edgesOf=id=>adjacency.get(id)||[],other=(r,id)=>r.a===id?r.b:r.a;
const colors={'塔罗会':'#87cad1','值夜者':'#a398d8','愚者与眷者':'#d3b989','莫雷蒂一家':'#d0a7b5','宿命之环':'#8bb6d9','其他人物':'#a5b1c8'};
// The sequence-to-pathway mapping is only applied to chapter-verified clues.
const pathwayFromSequence={'占卜家':'愚者','梦魇':'黑夜','不眠者':'黑夜','午夜诗人':'黑夜','收尸人':'死神','通灵者':'死神','纵火家':'红祭司','猎人':'红祭司','红祭司':'红祭司','痛苦魔女':'魔女','魔女':'魔女','观众':'空想家','学徒':'门','旅行家':'门','秘祈人':'倒吊人','航海家':'暴君','风眷者':'暴君','歌颂者':'太阳','仲裁人':'审判者','刺客':'魔女','教唆者':'魔女','星象师':'隐者','巫师':'隐者','偷盗者':'错误','空想家':'空想家','窥秘人':'隐者','怨魂':'被缚者','囚犯':'被缚者','猎魔者':'黄昏巨人','牧羊人':'倒吊人','心理医生':'空想家','收割者':'红祭司'};
const pathwayColors={'愚者':'#bfa4e8','门':'#7ecce0','错误':'#dc9c83','空想家':'#eaa6c2','暴君':'#6da7dc','白塔':'#d9d7bd','太阳':'#e9c56f','倒吊人':'#976b9c','黑夜':'#828bc9','死神':'#a5b9a7','红祭司':'#dc786e','魔女':'#c37b9e','战神':'#cc9272','黄昏巨人':'#c7a17b','母亲':'#82bf91','月亮':'#c6b1d7','审判者':'#9badce','仲裁人':'#a9b7d7','黑皇帝':'#94869f','律师':'#a397b7','隐者':'#81c3bf','完美者':'#adbec6','深渊':'#985f70','被缚者':'#a18c86','命运之轮':'#d1ba7f'};
function pathwayFact(p){for(const fact of p.classificationEvidence||[]){if(fact.kind==='pathway')return {value:fact.value,inferred:fact.certainty==='inferred'};if(fact.kind==='sequence'&&pathwayFromSequence[fact.value])return {value:pathwayFromSequence[fact.value],inferred:fact.certainty==='inferred'}}return null}
function pathway(p){return pathwayFact(p)?.value||null}
function category(p,kind){if(kind==='pathway')return pathway(p)||'途径待核实';return (p.classificationEvidence||[]).find(x=>x.kind===kind)?.value||(kind==='organization'?'组织待核实':'国籍待核实')}
const grouping=document.getElementById('group-mode');let groupMode='network',groupAnchors=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let a=null,b=null,hover=null,drag=null,panX=0,panY=0,zoom=.65,width=0,height=0,frame=0,temperature=1,cameraAnimation=null;
const portraits=new Map();
function portrait(p){if(!p.avatar)return null;if(!portraits.has(p.avatar)){const image=new Image();image.onload=requestDraw;image.onerror=requestDraw;image.src=p.avatar;portraits.set(p.avatar,image)}const image=portraits.get(p.avatar);return image.complete&&image.naturalWidth?image:null}
const nodes=characters.map((p,i)=>{const angle=i*2.399963,rad=26*Math.sqrt(i);return {p,x:Math.cos(angle)*rad,y:Math.sin(angle)*rad,vx:0,vy:0,r:Math.min(22,8+14*Math.log1p(edgesOf(p.id).length)/Math.log1p(80))}});
const nodeMap=new Map(nodes.map(n=>[n.p.id,n]));
// Shared neighbours add evidence of a tightly connected local group; tags are
// descriptions of one relationship and are not counted as extra links.
const layoutEdges=relations.filter(r=>nodeMap.has(r.a)&&nodeMap.has(r.b)).map(r=>{
 const left=new Set(edgesOf(r.a).map(e=>other(e,r.a)));
 const shared=edgesOf(r.b).reduce((n,e)=>n+(left.has(other(e,r.b))?1:0),0);
 return {relation:r,source:nodeMap.get(r.a),target:nodeMap.get(r.b),length:Math.max(95,145-Math.min(shared,4)*11),strength:.014*(1+Math.min(shared,4)*.2)};
});
const activeNodes=()=>nodes.filter(n=>isolates.checked||edgesOf(n.p.id).length);
const visibleEdges=()=>relations.filter(r=>nodeMap.has(r.a)&&nodeMap.has(r.b));
// Group membership adds a gentle attraction; unknown values have no group force.
// Edges remain active, so connected characters can bridge or overlap groups.
function arrangeGroups(){
 groupAnchors=new Map();if(groupMode==='network')return;
 const list=activeNodes(),counts=new Map();for(const n of list){const key=category(n.p,groupMode);if(!key.endsWith('待核实'))counts.set(key,(counts.get(key)||0)+1)}
 const keys=[...counts.keys()].sort((x,y)=>counts.get(y)-counts.get(x)||x.localeCompare(y,'zh-CN'));
 const radius=keys.length>1?Math.min(300,110+keys.length*16):0;
 keys.forEach((key,i)=>{const angle=-Math.PI/2+i*Math.PI*2/keys.length;groupAnchors.set(key,{x:Math.cos(angle)*radius,y:Math.sin(angle)*radius})});
}
function fitView(){const list=activeNodes();if(!list.length)return;const minX=Math.min(...list.map(n=>n.x-n.r)),maxX=Math.max(...list.map(n=>n.x+n.r)),minY=Math.min(...list.map(n=>n.y-n.r)),maxY=Math.max(...list.map(n=>n.y+n.r));zoom=Math.max(.25,Math.min(1.2,(width-100)/Math.max(1,maxX-minX),(height-170)/Math.max(1,maxY-minY)));panX=-(minX+maxX)/2*zoom;panY=-(minY+maxY)/2*zoom;cameraAnimation=null;requestDraw()}
function restore(){const q=new URLSearchParams(location.search),canonical=id=>({celia:'jenna',hibbert_hall:'hibbert',roche_louise:'roche',vermond_sauron:'vermonda'}[id]||id),first=canonical(q.get('a')),second=canonical(q.get('b'));a=byId.has(first)?first:null;b=a&&byId.has(second)&&second!==a?second:null}
function updateUrl(){const u=new URL(location.href);u.searchParams.delete('a');u.searchParams.delete('b');if(a)u.searchParams.set('a',a);if(b)u.searchParams.set('b',b);history.pushState(null,'',u)}
function focusPerson(id){const node=nodeMap.get(id);if(!node)return;temperature=0;cameraAnimation={start:performance.now(),fromX:panX,fromY:panY,fromZoom:zoom,targetX:-node.x*1.35,targetY:-node.y*1.35,targetZoom:1.35};requestDraw()}
function select(id){if(!byId.has(id))return;search.value='';if(!a){a=id;b=null}else if(id===a){b=null}else if(b&&id!==b){a=id;b=null}else b=id;if(!isolates.checked&&!edgesOf(id).length){isolates.checked=true;arrangeGroups()}updateUrl();render();focusPerson(id)}
function reset(){a=b=null;cameraAnimation=null;panX=panY=0;zoom=.65;updateUrl();render();requestDraw()}
function resize(){const rect=canvas.getBoundingClientRect(),d=window.devicePixelRatio||1;width=rect.width;height=rect.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);requestDraw()}
function screen(n){return {x:width/2+panX+n.x*zoom,y:height/2+panY+n.y*zoom}}
function world(x,y){return {x:(x-width/2-panX)/zoom,y:(y-height/2-panY)/zoom}}
function updatePhysics(){const list=activeNodes(),alpha=temperature;
 for(let i=0;i<list.length;i++){const n=list[i];for(let j=i+1;j<list.length;j++){const m=list[j];let dx=n.x-m.x,dy=n.y-m.y,d2=dx*dx+dy*dy+.1;if(d2>160000)continue;let dist=Math.sqrt(d2),gap=n.r+m.r+16,collision=Math.max(0,gap-dist)*.08,f=(Math.min(3,2100/d2)+collision)*alpha;dx/=dist;dy/=dist;n.vx+=dx*f;n.vy+=dy*f;m.vx-=dx*f;m.vy-=dy*f}}
 for(const e of layoutEdges){const n=e.source,m=e.target;let dx=m.x-n.x,dy=m.y-n.y,d=Math.hypot(dx,dy)||1,f=(d-e.length)*e.strength*alpha;n.vx+=dx/d*f;n.vy+=dy/d*f;m.vx-=dx/d*f;m.vy-=dy/d*f}
 for(const n of list){if(drag?.node===n)continue;const target=groupMode==='network'?null:groupAnchors.get(category(n.p,groupMode));n.vx=(n.vx+(-n.x*.0008+(target?(target.x-n.x)*.008:0))*alpha)*.84;n.vy=(n.vy+(-n.y*.0008+(target?(target.y-n.y)*.008:0))*alpha)*.84;n.x+=n.vx;n.y+=n.vy}temperature*=.986;
}
function requestDraw(){if(!frame)frame=requestAnimationFrame(tick)}
function tick(now){frame=0;if(temperature>.018){updatePhysics();requestDraw()}if(cameraAnimation){const t=Math.min(1,(now-cameraAnimation.start)/450),ease=1-Math.pow(1-t,3);panX=cameraAnimation.fromX+(cameraAnimation.targetX-cameraAnimation.fromX)*ease;panY=cameraAnimation.fromY+(cameraAnimation.targetY-cameraAnimation.fromY)*ease;zoom=cameraAnimation.fromZoom+(cameraAnimation.targetZoom-cameraAnimation.fromZoom)*ease;if(t<1)requestDraw();else cameraAnimation=null}draw()}
// Mention counts are approximate character frequencies, not relationship frequency.
function edgeWeight(left,right){const scale=n=>Math.min(1,Math.log1p(Math.max(0,Number(n)||0))/Math.log1p(5000));return (scale(left.mentions)+scale(right.mentions))/2}
function nodeRadius(n){const base=Math.max(4,Math.min(16,n.r*zoom*.72));return n.p.id===a||n.p.id===b?Math.max(9,base*1.6):n.p.id===hover?Math.max(8,base*1.4):base}
function nodeOrder(n){return n.p.id===hover?2:(n.p.id===a||n.p.id===b?1:0)}
function shortLabel(p){const name=(p.short||p.name).split('·')[0];return Array.from(name).length>4?Array.from(name).slice(0,4).join('')+'…':name}
function draw(){ctx.clearRect(0,0,width,height);const list=activeNodes(),focus=b||a,neighbors=new Set(focus?[focus,...edgesOf(focus).map(e=>other(e,focus))]:[]),q=search.value.trim().toLowerCase();
 for(const e of visibleEdges()){const n=nodeMap.get(e.a),m=nodeMap.get(e.b),p=screen(n),v=screen(m),selected=a&&b&&((e.a===a&&e.b===b)||(e.a===b&&e.b===a)),near=focus&&(e.a===focus||e.b===focus),weight=edgeWeight(n.p,m.p);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(v.x,v.y);ctx.lineWidth=(selected?1.5:near?.85:.35)+weight*(selected?1:.9);const opacity=(.12+weight*.36)*(focus&&!near&&!selected?.18:1);ctx.strokeStyle=selected?`rgba(185,234,223,${Math.min(1,opacity+.5)})`:near?`rgba(136,195,197,${Math.min(1,opacity+.25)})`:`rgba(165,176,195,${opacity})`;ctx.stroke()}
 const ordered=[...list].sort((x,y)=>nodeOrder(x)-nodeOrder(y));
 for(const n of ordered){const p=screen(n),r=nodeRadius(n),selected=n.p.id===a||n.p.id===b,hovered=n.p.id===hover,match=!q||(n.p.name+' '+(n.p.alias||'')).toLowerCase().includes(q),near=!focus||neighbors.has(n.p.id);ctx.globalAlpha=(near||selected||hovered?1:.2)*(match||selected||hovered?1:.28);if(p.x < -45||p.y < -45||p.x>width+45||p.y>height+45)continue;
  if(selected||hovered){ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,r+3,0,Math.PI*2);ctx.strokeStyle=pathwayColors[pathway(n.p)]||'#b5d9da';ctx.lineWidth=selected?2:1.5;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=hovered?16:10;ctx.stroke();ctx.restore()}
  ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='#333d54';ctx.fill();ctx.strokeStyle=pathwayColors[pathway(n.p)]||'#8891a7';ctx.lineWidth=selected?3:2;if(pathwayFact(n.p)?.inferred)ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
  // Portrait placeholder: a head and shoulders, clipped to a round avatar.
  ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,r-1,0,Math.PI*2);ctx.clip();const image=portrait(n.p);if(image){ctx.drawImage(image,p.x-r,p.y-r,r*2,r*2)}else{ctx.fillStyle=colors[n.p.group]||'#a5b1c8';ctx.globalAlpha*=.8;ctx.beginPath();ctx.arc(p.x,p.y-r*.23,r*.31,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(p.x,p.y+r*.68,r*.58,r*.55,0,0,Math.PI*2);ctx.fill()}ctx.restore();
  if(selected||hovered||(!focus&&edgesOf(n.p.id).length>=10)||zoom>2){ctx.font=`${selected||hovered?'600 ':''}${Math.max(10,Math.min(13,11*zoom))}px -apple-system, sans-serif`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#e0e5ef';ctx.fillText(selected||hovered?n.p.short:shortLabel(n.p),p.x,p.y+r+5)}ctx.globalAlpha=1;
 }ctx.globalAlpha=1;
}
function avatar(p){return `<span class="avatar" style="border-color:${pathwayColors[pathway(p)]||'#8891a7'}" aria-hidden="true">${p.avatar?`<img src="${esc(p.avatar)}" alt="" onerror="this.remove()">`:esc(p.mark||p.short[0])}</span>`}
function row(p,detail){return `<button class="person-row" data-id="${esc(p.id)}">${avatar(p)}<span class="row-copy"><strong>${esc(p.name)}</strong><small>${esc(detail||p.group)}</small></span><span class="arrow">›</span></button>`}
function classification(p){const facts=p.classificationEvidence||[],overview=`<p class="meta">组织：${esc(category(p,'organization'))} · 国籍：${esc(category(p,'nationality'))} · 途径：${esc(category(p,'pathway'))}${pathwayFact(p)?.inferred?'（推测）':''}</p>`;if(!facts.length)return overview;const labels={organization:'组织',nationality:'国籍',sequence:'序列线索',pathway:'途径'};return overview+`<details class="meta"><summary>已核对的分类线索（${facts.length}）</summary>${facts.map(x=>`<p>${esc(labels[x.kind]||x.kind)}：${esc(x.value)}${x.certainty==='inferred'?'（推测）':''}<br>${esc(x.source)}${x.note?`<br>${esc(x.note)}`:''}</p>`).join('')}<p>其他属性待核实；序列线索反映所引章节中的状态。</p></details>`}
function roster(){let q=search.value.trim().toLowerCase(),list=characters.filter(p=>!q||(p.name+' '+p.short+' '+(p.alias||'')).toLowerCase().includes(q));if(!q)list.sort((x,y)=>edgesOf(y.id).length-edgesOf(x.id).length||y.mentions-x.mentions);return `<h3 class="section-label">${q?'搜索结果':'人物名册'} <span>${list.length} 位</span></h3><div class="list">${list.slice(0,60).map(p=>row(p,p.alias||p.group)).join('')||'<p class="empty">没有找到相关人物，试试其他名字或别名。</p>'}</div>${list.length>60?'<p class="more">继续输入名字或别名，缩小搜索范围。</p>':''}`}
function render(){document.getElementById('person-count').textContent=characters.length;document.getElementById('relation-count').textContent=relations.length;document.getElementById('visible-count').textContent=`图中 ${activeNodes().length} 人`;
 if(search.value.trim()){content.innerHTML=roster();return}
 if(!a){content.innerHTML=`<p class="intro">每个头像是一位人物，连线代表已整理的联系。点击头像或从名册中选择，沿着线索探索他们的故事。</p>${roster()}`;return}
 const p=byId.get(a);
 if(!b){const rs=edgesOf(a);content.innerHTML=`<button class="back" data-action="reset">← 返回全部人物</button><div class="profile">${avatar(p)}<div><h3>${esc(p.name)}</h3><p>${esc(p.group)}${p.alias?' · '+esc(p.alias):''}</p></div></div><p class="meta">字面提及 ${esc(p.mentions??'待统计')} 次。${esc(p.matchNote||'次数按名称字面匹配，可能存在歧义。')}</p>${classification(p)}${p.aliasSources?.length?`<details class="meta"><summary>查看别名出处</summary>${p.aliasSources.map(x=>`<p>${esc(x.alias)}：${esc(x.source)}</p>`).join('')}</details>`:''}<h3 class="section-label" style="margin-top:24px">已收录的关系 <span>${rs.length} 位</span></h3><div class="list">${rs.map(r=>row(byId.get(other(r,a)),r.type)).join('')||'<p class="empty">暂未收录该人物的关系。</p>'}</div><p class="more">选择另一位人物，查看他们之间的关系与出处。</p>${roster()}`;return}
 const q=byId.get(b),rel=edgesOf(a).find(r=>other(r,a)===b);content.innerHTML=`<button class="back" data-action="single">← 返回 ${esc(p.short)} 的关系</button><div class="profile">${avatar(p)}${avatar(q)}<div><h3>${esc(p.short)} × ${esc(q.short)}</h3><p>${esc(p.name)} · ${esc(q.name)}</p></div></div>${rel?`<div class="tags">${rel.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><p class="detail-text">${esc(rel.summary)}</p><p class="detail-text">${esc(rel.detail)}</p><p class="source">${esc(rel.sourceHint||'具体章节出处待补充。')}</p>${rel.milestones?.length?`<h3 class="section-label" style="margin-top:24px">关系阶段</h3>${rel.milestones.map(m=>`<div class="milestone"><strong>${esc(m.tag)}</strong><br>${esc(m.note)}<small>${esc(m.source)}</small></div>`).join('')}`:''}`:'<p class="empty">暂未收录这两位人物之间的直接联系。</p>'}${roster()}`;
}
function hit(x,y){const list=activeNodes().sort((x,y)=>nodeOrder(x)-nodeOrder(y));for(let i=list.length-1;i>=0;i--){const n=list[i],p=screen(n);if(Math.hypot(x-p.x,y-p.y)<Math.max(8,nodeRadius(n)+3))return n}return null}
function local(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{cameraAnimation=null;const p=local(e),n=hit(p.x,p.y);drag={node:n,startX:p.x,startY:p.y,lastX:p.x,lastY:p.y,moved:false};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{const p=local(e);if(drag){if(Math.hypot(p.x-drag.startX,p.y-drag.startY)>4)drag.moved=true;if(drag.node&&drag.moved){const w=world(p.x,p.y);drag.node.x=w.x;drag.node.y=w.y;drag.node.vx=drag.node.vy=0;temperature=Math.max(temperature,.15)}else if(!drag.node){panX+=p.x-drag.lastX;panY+=p.y-drag.lastY}drag.lastX=p.x;drag.lastY=p.y;requestDraw()}else{const n=hit(p.x,p.y),next=n?.p.id||null;if(next!==hover){hover=next;canvas.style.cursor=hover?'pointer':'grab';requestDraw()}}});
canvas.addEventListener('pointerup',e=>{if(!drag)return;if(drag.node&&!drag.moved)select(drag.node.p.id);drag=null;requestDraw()});canvas.addEventListener('pointercancel',()=>{drag=null});canvas.addEventListener('pointerleave',()=>{hover=null;requestDraw()});
function zoomAt(factor,x=width/2,y=height/2){cameraAnimation=null;const pos=world(x,y);zoom=Math.max(.25,Math.min(3.5,zoom*factor));panX=x-width/2-pos.x*zoom;panY=y-height/2-pos.y*zoom;requestDraw()}
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=local(e);zoomAt(Math.exp(-e.deltaY*.001),p.x,p.y)},{passive:false});
document.getElementById('zoom-in').onclick=()=>zoomAt(1.25);document.getElementById('zoom-out').onclick=()=>zoomAt(.8);document.getElementById('fit').onclick=fitView;document.getElementById('reset').onclick=reset;
content.addEventListener('click',e=>{const node=e.target.closest('[data-id]'),action=e.target.closest('[data-action]');if(node)select(node.dataset.id);if(action){if(action.dataset.action==='single'){b=null;updateUrl();render();focusPerson(a)}else reset()}});
grouping.addEventListener('click',e=>{const button=e.target.closest('[data-group]');if(!button||button.dataset.group===groupMode)return;groupMode=button.dataset.group;grouping.querySelectorAll('[data-group]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));a=b=null;search.value='';updateUrl();arrangeGroups();temperature=1;panX=panY=0;zoom=.65;render();requestDraw()});
search.addEventListener('input',()=>{render();requestDraw()});isolates.addEventListener('change',()=>{arrangeGroups();temperature=.8;render();requestDraw()});window.addEventListener('resize',resize);window.addEventListener('popstate',()=>{restore();render();requestDraw()});window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus()}if(e.key==='Escape'&&document.activeElement===search){search.value='';search.blur();render();requestDraw()}});
restore();if(a&&!edgesOf(a).length)isolates.checked=true;
// Settle the relationship-based layout before a deep-linked person is focused.
for(let i=0;i<260;i++)updatePhysics();
resize();render();if(a)focusPerson(b||a);
