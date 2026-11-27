'use strict';
const canvas=document.getElementById('graph'),ctx=canvas.getContext('2d'),content=document.getElementById('content'),search=document.getElementById('search'),isolates=document.getElementById('isolates');
const byId=new Map(characters.map(p=>[p.id,p])), adjacency=new Map(characters.map(p=>[p.id,[]]));
relations.forEach(r=>{adjacency.get(r.a)?.push(r);adjacency.get(r.b)?.push(r)});
const edgesOf=id=>adjacency.get(id)||[],other=(r,id)=>r.a===id?r.b:r.a;
const relationshipQuery=WikiRelationshipQuery.createRelationshipQuery(characters,relations);
function categoryText(r,viewer){return (r.categories||[]).map(category=>{const direction=r.direction?.[category];if(!direction)return category;if(direction==='both')return category+' ↔';const from=direction==='a-to-b'?r.a:r.b;return category+(from===viewer?' →':' ←')}).join(' · ')}
const colors={'塔罗会':'#87cad1','值夜者':'#a398d8','愚者与眷者':'#d3b989','莫雷蒂一家':'#d0a7b5','宿命之环':'#8bb6d9','其他人物':'#a5b1c8'};
// The sequence-to-pathway mapping is only applied to chapter-verified clues.
const pathwayFromSequence={'占卜家':'愚者','秘偶大师':'愚者','梦魇':'黑夜','不眠者':'黑夜','午夜诗人':'黑夜','守夜人':'黑夜','收尸人':'死神','通灵者':'死神','看门人':'死神','纵火家':'红祭司','猎人':'红祭司','挑衅者':'红祭司','红祭司':'红祭司','痛苦魔女':'魔女','不老魔女':'魔女','魔女':'魔女','观众':'空想家','操纵师':'空想家','学徒':'门','占星人':'门','旅行家':'门','秘祈人':'倒吊人','航海家':'暴君','风眷者':'暴君','歌颂者':'太阳','仲裁人':'审判者','刺客':'魔女','教唆者':'魔女','星象师':'隐者','巫师':'隐者','偷盗者':'错误','盗火人':'错误','空想家':'空想家','窥秘人':'隐者','通识者':'完美者','怨魂':'被缚者','囚犯':'被缚者','猎魔者':'黄昏巨人','黎明骑士':'黄昏巨人','牧羊人':'倒吊人','心理医生':'空想家','收割者':'红祭司','耕种者':'母亲','药师':'月亮','阅读者':'白塔','水银之蛇':'命运之轮','欲望使徒':'深渊'};
const palettes={...groupPalette};
function currentPathwayColor(key){return pathwayPrimary(key,document.documentElement.dataset.theme)}
const neutralPair={primary:'#8790a3',accent:'#B8C4D5'};
function categoryColors(mode,key){return mode==='pathway'?{primary:currentPathwayColor(key)||neutralPair.primary,accent:canvasTheme.label}:palettes[mode][key]||neutralPair}
const pathwayStyles=new WeakMap();
function pathwayStyle(person){
 if(pathwayStyles.has(person))return pathwayStyles.get(person);
 const facts=pathways(person);
 const members=facts.filter(f=>f.relation==='member'&&!f.inferred);
 const marked=members.filter(f=>f.primary);
 const main=members.length===1?members[0]:marked.length===1?marked[0]:null;
 const rings=members.filter(f=>f!==main).map(f=>f.value).sort((a,b)=>a.localeCompare(b,'zh-CN'));
 const inferred=facts.filter(f=>f.relation==='member'&&f.inferred);
 const fallback=members.length===0&&inferred.length===1?inferred[0]:null;
 const core=main||fallback;
 const style={main,rings,core};
 pathwayStyles.set(person,style);
 return style;
}
function personAccent(p){return groupMode==='network'||groupMode==='pathway'?canvasTheme.label:categoryColors(groupMode,category(p,groupMode)).accent}
function personColor(p){return groupMode==='network'||groupMode==='pathway'?(currentPathwayColor(pathwayStyle(p).core?.value)||(pathwayStyle(p).rings.length?(document.documentElement.dataset.theme==='day'?canvasTheme.surface:canvasTheme.label):neutralPair.primary)):categoryColors(groupMode,category(p,groupMode)).primary}
function ringColor(key){
 return currentPathwayColor(key)||canvasTheme.label;
}
function pathwayStatus(p){return p.ordinaryInCitedPeriod?'所引时期为普通人':p.ordinaryInCitedPeriodInferred?'所引时期可能为普通人（推测）':'途径待核实'}
function pathwayDescription(p){
 const {main,rings}=pathwayStyle(p);
 const parts=[];
 if(main)parts.push((rings.length?'主途径：':'途径：')+main.value);
 if(rings.length)parts.push((main?'其他途径经历：':'已核实途径经历：')+rings.join('、'));
 const alternatives=(p.progression||[]).filter(stage=>stage.candidatePathways?.length);
 for(const stage of alternatives)parts.push('候选途径：'+stage.candidatePathways.join('或'));
 for(const fact of pathways(p)){
  if(fact.relation==='ability')parts.push('具备部分能力：'+fact.value);
  else if(fact.relation==='sefirah')parts.push('源质关联：'+fact.value);
  else if(fact.relation==='authority')parts.push('权柄／唯一性关联：'+fact.value);
  else if(fact.inferred&&!alternatives.some(stage=>stage.candidatePathways.includes(fact.value)))parts.push('推定途径：'+fact.value);
 }
 if(p.ordinaryInCitedPeriod||p.ordinaryInCitedPeriodInferred)parts.push(pathwayStatus(p));
 return parts.join(' · ')||pathwayStatus(p);
}
let expandedOrganization=null;
function renderPalette() {
 const legend=document.getElementById('palette-legend');
 const mode=groupMode;
 const sizeLegend=document.getElementById('size-legend');
 sizeLegend.lastElementChild.textContent=mode==='pathway'?'最终位阶':'关系人数';
 sizeLegend.title=mode==='pathway'?'按最后收录阶段的位阶计算；位阶待核实的人物使用最小星点':'按已收录的直接关系人数计算';
 legend.hidden=mode==='network';
 if(legend.hidden){legend.replaceChildren();return}
 const counts=new Map(), inferred=new Map();
 for(const node of activeNodes()) {
  for(const key of groupKeys(node.p,mode)) {
   counts.set(key,(counts.get(key)||0)+1);
   if(inferredGroup(node.p,mode,key)) inferred.set(key,(inferred.get(key)||0)+1);
  }
 }
 const items=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));
 const chips=items.map(([key,count])=>{
  const clickable=mode==='organization'&&key!=='独立'&&!key.endsWith('待核实');
  const tag=clickable?'button':'span';
  const attributes=clickable?` type="button" aria-expanded="false" data-org="${esc(key)}"`:'';
  const estimate=inferred.has(key)?`（含推定 ${inferred.get(key)}）`:'';
  const pair=categoryColors(mode,key);
  return `<${tag}${attributes} class="palette-item" style="--swatch:${pair.primary}${mode==='pathway'?'':`;--swatch-accent:${pair.accent}`}"><i></i>${esc(key)} <small>${count}${estimate}</small></${tag}>`;
 });
 legend.dataset.mode=mode;
 legend.innerHTML=`<div class="palette-title">标签</div><div class="palette-list">${chips.join('')}</div>`;
 if(expandedOrganization&&mode==='organization')renderOrganizationMembers();
}
function pathwayFact(p){return pathways(p)[0]||null}
function pathways(p){const found=new Map();function add(value,inferred,relation='member',primary=false){if(!value)return;const key=pathwayNames[value]||value,previous=found.get(key);if(!previous||(previous.relation!=='member'&&relation==='member')||(previous.relation===relation&&previous.inferred&&!inferred))found.set(key,{value:key,inferred,relation,primary});else if(primary&&!inferred&&relation==='member')previous.primary=true}for(const fact of p.classificationEvidence||[]){const value=fact.kind==='pathway'?fact.value:fact.kind==='sequence'?pathwayFromSequence[fact.value]:null;add(value,fact.certainty==='inferred',fact.relation||'member',fact.primary===true)}for(const stage of p.progression||[]){add(stage.pathway,stage.certainty==='inferred',stage.relation||'member',stage.primary===true);for(const candidate of stage.candidatePathways||[])add(candidate,true)}return [...found.values()]}
function pathway(p){return pathwayFact(p)?.value||null}
const pathwayNames={'愚者':'占卜家','门':'学徒','错误':'偷盗者','倒吊人':'秘祈人','空想家':'观众','暴君':'水手','太阳':'歌颂者','白塔':'阅读者','黑夜':'不眠者','黑暗':'不眠者','死神':'收尸人','黄昏巨人':'战士','母亲':'耕种者','月亮':'药师','审判者':'仲裁人','黑皇帝':'律师','红祭司':'猎人','魔女':'刺客','深渊':'罪犯','被缚者':'囚犯','隐者':'窥秘人','完美者':'通识者','命运之轮':'怪物','宿命':'舞蹈家','永劫者':'舞蹈家','混沌原胎':'恶棍','混沌迷雾':'掮客','主父':'吝啬鬼','永生律':'失梦人','致密者':'天文爱好者','吞尾者':'流浪汉','尘世之眼':'萨满','不朽者':'入门者','第二定律':'病患'};
function category(p,kind){if(kind==='pathway'){const value=pathway(p);return pathwayNames[value]||value||pathwayStatus(p)}return (p.classificationEvidence||[]).find(x=>x.kind===kind)?.value||(kind==='organization'?'组织待核实':'国籍待核实')}
const isolatePreferences = new Map([['organization', true], ['nationality', true]]);
const grouping=document.getElementById('group-mode');let groupMode='network',groupAnchors=new Map();
function groupKey(p,mode){return category(p,mode)}
function groupKeys(p,mode){if(mode==='organization'||mode==='nationality'){const values=(p.classificationEvidence||[]).filter(x=>x.kind===mode).map(x=>x.value);return values.length?[...new Set(values)]:[mode==='organization'?'组织待核实':'国籍待核实']}if(mode!=='pathway')return [groupKey(p,mode)];const values=pathways(p).filter(x=>x.relation==='member').map(x=>pathwayNames[x.value]||x.value);if(p.ordinaryInCitedPeriod||p.ordinaryInCitedPeriodInferred)values.push(pathwayStatus(p));return values.length?[...new Set(values)]:[pathwayStatus(p)]}
function layoutGroupKeys(person, mode) {
 return groupKeys(person, mode);
}
function inferredGroup(person, kind, value) {
 if(kind==='pathway')return pathways(person).some(fact=>fact.value===value && fact.inferred);
 const facts = (person.classificationEvidence || []).filter(f => f.kind === kind && f.value === value);
 return facts.length > 0 && facts.every(f => f.certainty === 'inferred');
}
function groupSummary(person, kind) {
 return groupKeys(person, kind).map(value => inferredGroup(person, kind, value) ? value + '（推定）' : value).join('、');
}
function hubColor(key,mode){return categoryColors(mode,key.split(' · ')[0]).primary}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let a=null,b=null,hover=null,drag=null,panX=0,panY=0,zoom=.65,width=0,height=0,frame=0,temperature=1,cameraAnimation=null,layoutTransition=null;
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
const portraits=new Map();
function portrait(p){if(!p.avatar)return null;if(!portraits.has(p.avatar)){const image=new Image();image.onload=requestDraw;image.onerror=requestDraw;image.src=p.avatar;portraits.set(p.avatar,image)}const image=portraits.get(p.avatar);return image.complete&&image.naturalWidth?image:null}
// Use the last recorded period, including simultaneous pathways and demotions.
function finalPathwayRank(person){
 let best=null,startedPeriod=false;
 for(const stage of person.progression||[]){
  if(!stage.samePeriodAsPrevious)startedPeriod=false;
  if(stage.relation==='authority'||stage.relation==='context'||(stage.certainty==='inferred' && stage.sequenceCertainty!=='confirmed')||stage.sequenceCertainty==='inferred')continue;
  if(!startedPeriod){best=null;startedPeriod=true}
  const label=stage.sequence||'';
  const match=label.match(/^(?:序列|相当于序列|出生即相当于序列|恩赐：相当于序列|恢复至序列|再度晋升序列|失去序列1特性，以序列)([0-9])(?![0-9])/);
  let level=null;
  if(/未完成|尝试/.test(label))continue;
  if(match)level=Number(match[1]);
  else if(/^旧日“|^大地母神$|成神$|^远古死神（|^恶魔君王（第二纪古神/.test(label))level=0;
  else if(/^天使之王/.test(label))level=1;
  else if(/^(普通)?天使/.test(label)&&!label.includes('推测'))level=2;
  else if(/^半神/.test(label))level=4;
  else if(label==='“漩涡编织者”（恩赐）')level=3;
  if(level!==null&&(!best||level<best.level))best={level,label};
 }
 return best;
}
const nodes=characters.map((p,i)=>{
 const angle=i*2.399963,rad=26*Math.sqrt(i);
 const contacts=new Set(edgesOf(p.id).map(edge=>other(edge,p.id)).filter(id=>id!==p.id&&byId.has(id)));
 // The Hill weight reaches its midpoint at four contacts.
 const weight=(contacts.size/4)**1.5;
 const fraction=weight/(1+weight);
 const displayRadius=2.2+4.8*fraction+1.5*fraction**3;
 const r=Math.min(22,8+14*Math.log1p(edgesOf(p.id).length)/Math.log1p(80));
 return {p,x:Math.cos(angle)*rad,y:Math.sin(angle)*rad,vx:0,vy:0,phase:angle,r,displayRadius,finalRank:finalPathwayRank(p)};
});
const nodeMap=new Map(nodes.map(n=>[n.p.id,n]));
// Shared neighbours add evidence of a tightly connected local group; tags are
// descriptions of one relationship and are not counted as extra links.
function personSpring(categories,shared){
 const has=(...tags)=>tags.some(tag=>categories.includes(tag));
 const close=has('爱情','亲情','友谊'), cooperative=has('盟友','同事','友善');
 const antagonistic=has('仇恨','敌对');
 const support=Math.min(shared,4);
 if(antagonistic){
  // Keep mixed relationships between their positive and hostile targets.
  const mixed=close||cooperative;
  return {distance:mixed?200:has('仇恨')?300:270,stiffness:.055,repulsive:false,community:mixed};
 }
 if(has('同事')&&has('上下级','盟友'))return {distance:90-support*4,stiffness:.28,priority:true};
 const distance=close?96:cooperative?158:has('上下级','信仰')?193:243;
 return {distance:distance-support*3,priority:close,stiffness:(close?.22:cooperative?.11:.05)*(1+support*.08)};
}
const layoutEdges=relations.filter(r=>nodeMap.has(r.a)&&nodeMap.has(r.b)).map(r=>{
 const left=new Set(edgesOf(r.a).map(e=>other(e,r.a)));
 const shared=edgesOf(r.b).reduce((n,e)=>n+(left.has(other(e,r.b))?1:0),0);
 return {network:personSpring(r.categories||[],shared),relation:r,source:nodeMap.get(r.a),target:nodeMap.get(r.b),length:Math.max(125,180-Math.min(shared,4)*11),strength:.014*(1+Math.min(shared,4)*.2)};
});
for(const n of nodes){
 n.known=new Set(edgesOf(n.p.id).map(e=>nodeMap.get(other(e,n.p.id))));
 n.closeContacts=[];
}
for(const {source,target,network} of layoutEdges){
 if(!network.priority)continue;
 source.closeContacts.push(target);target.closeContacts.push(source);
}
// Identify local circles from positive edges. Degree-adjusted affinity keeps
// a popular contact from merging everyone who happens to know that person.
function assignSocialCircles(){
 const links=new Map(nodes.map(n=>[n,new Map()]));
 for(const {source,target,network} of layoutEdges){
  if(network.repulsive||network.community===false)continue;
  const weight=network.stiffness*100/network.distance;
  links.get(source).set(target,(links.get(source).get(target)||0)+weight);
  links.get(target).set(source,(links.get(target).get(source)||0)+weight);
 }
 const totals=new Map();
 let volume=0;
 for(const n of nodes){
  n.circle=n;n.contacts=links.get(n);
  n.linkWeight=[...n.contacts.values()].reduce((sum,w)=>sum+w,0);
  totals.set(n,n.linkWeight);volume+=n.linkWeight;
 }
 for(let pass=0;pass<20&&volume;pass++){
  let changed=false;
  for(const n of nodes){
   const votes=new Map();
   for(const [m,w] of n.contacts)votes.set(m.circle,(votes.get(m.circle)||0)+w);
   let best=n.circle;
   totals.set(best,totals.get(best)-n.linkWeight);
   const score=c=>(votes.get(c)||0)-n.linkWeight*totals.get(c)/volume;
   let highest=score(best);
   for(const c of votes.keys()){
    const value=score(c);
    if(value>highest+1e-9){highest=value;best=c}
   }
   changed ||= best!==n.circle;
   n.circle=best;totals.set(best,totals.get(best)+n.linkWeight);
  }
  if(!changed)break;
 }
}
assignSocialCircles();
const activeNodes=()=>nodes.filter(n=>isolates.checked||edgesOf(n.p.id).length);
const visibleEdges=()=>relations.filter(r=>nodeMap.has(r.a)&&nodeMap.has(r.b));
// Compute group positions once per grouping or filter change.
// Swap equivalent slots when doing so lowers the sum of squared travel distances.
function matchSlots(slots,origins){
 for(let pass=0;pass<5;pass++){
  let changed=false;
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
   const a=origins[i],b=origins[j],u=slots[i],v=slots[j];
   if(!a||!b)continue;
   if((a.x-b.x)*(u.x-v.x)+(a.y-b.y)*(u.y-v.y)<0){
    slots[i]=v;slots[j]=u;changed=true;
   }
  }
  if(!changed)break;
 }
}
const centralGroup={organization:'塔罗会',pathway:'占卜家'};
// Lay out each connected component separately; disconnected people do not
// inherit an artificial distance from any protagonist.
const components=[];
const remaining=new Set(nodes);
while(remaining.size){
 const first=remaining.values().next().value,queue=[first],members=[];
 remaining.delete(first);
 for(let i=0;i<queue.length;i++){
  const n=queue[i];members.push(n);
  for(const other of n.known)if(other&&remaining.delete(other))queue.push(other);
 }
 components.push(members);
}
components.sort((a,b)=>Number(b.some(n=>n.p.id==='klein'))-Number(a.some(n=>n.p.id==='klein'))||b.length-a.length||a[0].p.id.localeCompare(b[0].p.id));
for(const members of components){
 const slot={x:0,y:0};
 members.sort((a,b)=>a.p.id.localeCompare(b.p.id,'zh-CN'));
 members.forEach((n,i)=>{n.component=slot;n.componentIndex=i;n.storyRadius=n.p.id==='klein'?0:1});
}
// Pack actual settled bounds, rather than reserving a guessed circle based on
// population. Disconnected components have no relationship-distance constraint.
function packNetworkComponents(list){
 const visible=new Set(list),placed=[];
 for(const members of components){
  const group=members.filter(n=>visible.has(n));
  if(!group.length)continue;
  const left=Math.min(...group.map(n=>n.x-n.r)),right=Math.max(...group.map(n=>n.x+n.r));
  const top=Math.min(...group.map(n=>n.y-n.r)),bottom=Math.max(...group.map(n=>n.y+n.r));
  const halfW=(right-left)/2,halfH=(bottom-top)/2,cx=(left+right)/2,cy=(top+bottom)/2;
  let x=0,y=0;
  if(placed.length){
   const candidates=placed.flatMap(b=>[
    {x:b.x-b.halfW-halfW-64,y:b.y},{x:b.x+b.halfW+halfW+64,y:b.y},
    {x:b.x,y:b.y-b.halfH-halfH-64},{x:b.x,y:b.y+b.halfH+halfH+64}
   ]).sort((a,b)=>a.x*a.x+a.y*a.y-b.x*b.x-b.y*b.y);
   const fit=candidates.find(c=>placed.every(b=>Math.abs(c.x-b.x)+1e-6>=halfW+b.halfW+64||Math.abs(c.y-b.y)+1e-6>=halfH+b.halfH+64));
   x=fit.x;y=fit.y;
  }
  const dx=x-cx,dy=y-cy;
  group.forEach(n=>{n.x+=dx;n.y+=dy});
  group[0].component.x+=dx;group[0].component.y+=dy;
  placed.push({x,y,halfW,halfH});
 }
}
const layoutOrigins=new Map();
function captionsBelow(mode){return mode==='organization'||mode==='nationality'||mode==='pathway'}
function spaceForCaptions(hubs,central){
 // Allocate the symbol and its caption together at the normal overview scale.
 const scale=.32,placed=[];
 ctx.save();ctx.font='12px sans-serif';
 for(const h of [...hubs].sort((a,b)=>Number(b===central)-Number(a===central))){
  h.captionHalf=ctx.measureText(h.key).width/2+4;
  const half=Math.max(12,h.captionHalf)/scale;
  let above=h.y,below=h.y;
  const neighbors=placed.filter(p=>Math.abs(h.x-p.x)<half+p.half+8/scale);
  const height=52/scale;
  for(const p of neighbors.sort((a,b)=>b.y-a.y)){
   if(Math.abs(above-p.y)<height)above=p.y-height;
  }
  for(const p of neighbors.reverse()){
   if(Math.abs(below-p.y)<height)below=p.y+height;
  }
  h.y=h.y-above<below-h.y?above:below;
  placed.push({x:h.x,y:h.y,half});
 }
 ctx.restore();
}
function arrangeGroups(){
 groupAnchors=new Map();if(groupMode==='network')return;
 const list=activeNodes(),members=new Map();for(const n of list){for(const key of layoutGroupKeys(n.p,groupMode)){if(!members.has(key))members.set(key,[]);members.get(key).push(n)}}
 const keys=[...members.keys()].filter(key=>!key.endsWith('待核实')).sort((a,b)=>members.get(b).length-members.get(a).length||a.localeCompare(b,'zh-CN'));
 const aspect=width>0&&height>0?width/height:1;
 const cols=Math.max(1,Math.min(keys.length,Math.ceil(Math.sqrt(keys.length*aspect)))),rows=Math.ceil(keys.length/cols),spacing=340;
 keys.forEach((key,i)=>{const people=members.get(key),radius=56+Math.sqrt(people.length)*36;groupAnchors.set(key,{key,x:(i%cols-(cols-1)/2)*spacing,y:(Math.floor(i/cols)-(rows-1)/2)*spacing,radius,count:people.length})});
 const hubs=[...groupAnchors.values()];
 const origins=layoutOrigins.get(groupMode);
 if(origins){
  const cells=hubs.map(h=>({x:h.x,y:h.y}));
  const centers=hubs.map(h=>{
   const prior=members.get(h.key).map(n=>origins.get(n)).filter(Boolean);
   if(!prior.length)return null;
   return {x:prior.reduce((v,p)=>v+p.x,0)/prior.length,y:prior.reduce((v,p)=>v+p.y,0)/prior.length};
  });
  matchSlots(cells,centers);
  hubs.forEach((h,i)=>Object.assign(h,cells[i]));
 }
 const central=groupAnchors.get(centralGroup[groupMode]);
 const weights=new Map();
 for(const {source,target,relation} of layoutEdges){
  const left=layoutGroupKeys(source.p,groupMode),right=layoutGroupKeys(target.p,groupMode);
  const tags=relation.categories||[];
  const hostile=tags.some(tag=>tag==='敌对'||tag==='仇恨');
  const friendly=tags.some(tag=>!['熟人','敌对','仇恨'].includes(tag));
  for(const x of left)for(const y of right){
   if(x===y||x.endsWith('待核实')||y.endsWith('待核实'))continue;
   const pair=[x,y].sort().join('\0'),weight=weights.get(pair)||{pull:0,push:0};
   const share=1/(left.length*right.length);
   weight.pull+=(friendly?1:hostile?0:.25)*share;
      weights.set(pair,weight);
  }
 }
 const pairs=hubs.flatMap((left,i)=>hubs.slice(i+1).map(right=>{
  const weight=weights.get([left.key,right.key].sort().join('\0'))||{pull:0,push:0};
  return {left,right,pull:Math.log1p(weight.pull),push:Math.log1p(weight.push)};
 }));
 for(let step=0;step<150;step++){
  for(const h of hubs){h.fx=-h.x*.0015;h.fy=-h.y*.0015}
  for(const {left,right,pull,push} of pairs){
   const dx=right.x-left.x,dy=right.y-left.y,d=Math.hypot(dx,dy)||1;
   const clearance=d-left.radius-right.radius;
   const repel=1600/(Math.max(25,clearance)**1.5)+Math.max(0,65-clearance)*.32;
   const force=Math.max(-28,Math.min(28,
    pull*Math.max(0,clearance-65)*.06-repel-push*Math.max(0,430-clearance)*.085));
   left.fx+=dx/d*force;left.fy+=dy/d*force;right.fx-=dx/d*force;right.fy-=dy/d*force;
  }
  for(const h of hubs){h.x+=h.fx*.55;h.y+=h.fy*.55}
 }
 if(captionsBelow(groupMode))spaceForCaptions(hubs,central);
 const slots=new Map(),cohorts=new Map();
 // Use the spread of the actual hubs to seed free nodes; there is no outer contour.
 const spread=Math.max(180,Math.sqrt(hubs.reduce((sum,h)=>sum+h.x*h.x+h.y*h.y,0)/Math.max(1,hubs.length)));
 for(const n of list){
  const keys=layoutGroupKeys(n.p,groupMode);
  const confirmed=keys.filter(key=>!inferredGroup(n.p,groupMode,key));
  const explicit=groupMode==='pathway'?pathwayStyle(n.p).main?.value:null;
  const placement=explicit?[explicit]:(confirmed.length?confirmed:keys);
  const anchors=placement.map(key=>groupAnchors.get(key)).filter(Boolean);
  const h=anchors[0];
  n.multiGroup=anchors.length>1;
  n.peripheral=!h;
  n.contactWeight=0;
  if(h){
   if(!cohorts.has(h))cohorts.set(h,[]);
   cohorts.get(h).push(n);
   const i=slots.get(h)||0;
   slots.set(h,i+1);
   const angle=i*2.399963,rad=Math.sqrt(1+i)*38+32;
   const cx=anchors.reduce((sum,anchor)=>sum+anchor.x,0)/anchors.length,cy=anchors.reduce((sum,anchor)=>sum+anchor.y,0)/anchors.length;
   n.slotX=cx+Math.cos(angle)*rad;n.slotY=cy+Math.sin(angle)*rad;
  }else{
   let sumX=0,sumY=0;
   if(groupMode==='organization'){
    const contacts=new Set(edgesOf(n.p.id).map(edge=>other(edge,n.p.id)));
    for(const id of contacts){
     const person=byId.get(id);
     if(!person||id===n.p.id)continue;
     const groups=layoutGroupKeys(person,groupMode).filter(k=>groupAnchors.has(k)&&!inferredGroup(person,groupMode,k));
     for(const key of groups){
      const hub=groupAnchors.get(key),weight=1/groups.length;
      sumX+=hub.x*weight;sumY+=hub.y*weight;n.contactWeight+=weight;
     }
    }
   }
   // A repeatable, diffuse starting position for people without contact evidence.
   const seed=Math.abs(Math.sin(n.phase*12.9898+1)*43758.5453)%1;
   const radius=Math.sqrt(-2*Math.log(Math.max(.001,seed)));
   const scatter=n.contactWeight?55/Math.sqrt(n.contactWeight):spread*.85;
   n.slotX=sumX/(n.contactWeight||1)+Math.cos(n.phase)*radius*scatter;
   n.slotY=sumY/(n.contactWeight||1)+Math.sin(n.phase)*radius*scatter;
   n.x=n.slotX;n.y=n.slotY;n.vx=n.vy=0;
  }
 }
 for(const cohort of cohorts.values()){
  const targets=cohort.map(n=>({x:n.slotX,y:n.slotY}));
  if(origins&&!cohort.some(n=>n.multiGroup))matchSlots(targets,cohort.map(n=>origins.get(n)));
  cohort.forEach((n,i)=>{
   n.x=n.slotX=targets[i].x;n.y=n.slotY=targets[i].y;n.vx=n.vy=0;
  });
 }

}

// Fit the settled distribution to the drawable area. Move centers only:
// labels, hit targets and group symbols keep their screen-space proportions.
function adaptLayoutAspect() {
 const visible = activeNodes();
 const points = [...visible, ...groupAnchors.values()];
 if (points.length < 2 || !width || !height) return;
 const xs = points.map(p => p.x), ys = points.map(p => p.y);
 const spanX = Math.max(...xs) - Math.min(...xs);
 const spanY = Math.max(...ys) - Math.min(...ys);
 if (!spanX || !spanY) return;
 const factor = (width / height) / (spanX / spanY);
 const scaleX = Math.max(1, factor), scaleY = Math.max(1, 1 / factor);
 for (const p of points) {
  p.x *= scaleX;
  p.y *= scaleY;
 }
 if (groupMode === 'network') {
  for (const members of components) {
   members[0].component.x *= scaleX;
   members[0].component.y *= scaleY;
  }
 } else {
  for (const n of visible) {
   n.slotX *= scaleX;
   n.slotY *= scaleY;
  }
 }
}

function settleLayout() {
 arrangeGroups();
 if (groupMode === 'network') {
  settleNetwork();
 } else {
  temperature = 1;
  for (let i = 0; i < 55; i++) updatePhysics();
  temperature = 0;
 }
 adaptLayoutAspect();
}

let minimumZoom=.25,defaultCamera=true,overviewCamera=false;
function fitView(animate=false){const list=activeNodes();if(!list.length)return;const hubs=[...groupAnchors.values()],minX=Math.min(...list.map(n=>n.x-n.r),...hubs.map(h=>h.x-h.radius-60)),maxX=Math.max(...list.map(n=>n.x+n.r),...hubs.map(h=>h.x+h.radius+60)),minY=Math.min(...list.map(n=>n.y-n.r),...hubs.map(h=>h.y-h.radius-50)),maxY=Math.max(...list.map(n=>n.y+n.r),...hubs.map(h=>h.y+h.radius+50));const targetZoom=Math.min(1.2,Math.max(1,width*.94)/Math.max(1,maxX-minX),Math.max(1,height*.94)/Math.max(1,maxY-minY));minimumZoom=Math.min(.25,targetZoom);moveCamera(-(minX+maxX)/2*targetZoom,-(minY+maxY)/2*targetZoom,targetZoom,animate?300:0,'overview')}
function readingView(animate=false){
 const visible=activeNodes();
 if(!visible.length)return;
 const classified=groupMode==='network'?visible:visible.filter(n=>!n.peripheral);
 const subjects=classified.length?classified:visible;
 const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const cx=median(subjects.map(n=>n.x)),cy=median(subjects.map(n=>n.y));
 // Pick a populated center even when the median falls between distinct groups.
 const center=(groupMode==='network'?{x:0,y:0}:groupAnchors.get(centralGroup[groupMode]))||subjects.reduce((best,n)=>
  Math.hypot(n.x-cx,n.y-cy)<Math.hypot(best.x-cx,best.y-cy)?n:best
 );
 frameCharacters(visible,center,animate);
}
function frameCharacters(list,center,animate=false){
 // Each value is the maximum scale at which this entire dot fits on both axes.
 const limits=list.map(n=>{
  const r=outerRadius(n)+1,dx=Math.abs(n.x-center.x),dy=Math.abs(n.y-center.y);
  return Math.min(dx?Math.max(1,width/2-r)/dx:Infinity,
                  dy?Math.max(1,height/2-r)/dy:Infinity);
 }).sort((a,b)=>b-a);
 const scale=Math.min(3.5,Math.max(width<=700?.75:groupMode==='network'?0:Math.min(width,height)<600?.25:.35,limits[Math.ceil(list.length*.8)-1]));
 minimumZoom=Math.min(.25,scale*.5);
 moveCamera(-center.x*scale,-center.y*scale,scale,animate?300:0,'default');
}
function restore(){const q=new URLSearchParams(location.search),first=q.get('a'),second=q.get('b');a=byId.has(first)?first:null;b=a&&byId.has(second)&&second!==a?second:null}
function updateUrl(){const u=new URL(location.href);u.searchParams.delete('organization');u.searchParams.delete('a');u.searchParams.delete('b');if(a)u.searchParams.set('a',a);if(b)u.searchParams.set('b',b);history.pushState(null,'',u)}
function focusPerson(id){layoutTransition=null;const node=nodeMap.get(id);if(!node)return;temperature=0;moveCamera(-node.x*1.35,-node.y*1.35,1.35,450)}
function revealSelection(){
 content.parentElement.scrollTop=0;
 if(window.matchMedia('(max-width:800px)').matches)content.scrollIntoView({block:'start'});
}
function select(id){if(!byId.has(id))return;search.value='';if(!a){a=id;b=null}else if(id===a){b=null}else if(b&&id!==b){a=id;b=null}else b=id;if(!isolates.checked&&!edgesOf(id).length){isolates.checked=true;settleLayout()}updateUrl();render();revealSelection();focusPerson(id)}
function reset(){layoutTransition=null;a=b=null;readingView(true);updateUrl();render();requestDraw()}
let resizeLayoutTimer;
function resize(){const rect=canvas.getBoundingClientRect(),d=window.devicePixelRatio||1;const changed=width!==rect.width||height!==rect.height;width=rect.width;height=rect.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);requestDraw();
 if (changed && width && height) {
  clearTimeout(resizeLayoutTimer);
  resizeLayoutTimer = setTimeout(() => {
   layoutTransition = null;
   settleLayout();
   if (a) focusPerson(b || a);
   else if (overviewCamera) fitView();
   else if (defaultCamera) readingView();
   requestDraw();
  }, 120);
 }
}
function projected(n){return {x:width/2+panX+n.x*zoom,y:height/2+panY+n.y*zoom}}
// Use the same displayed positions for dots, incident lines, labels and hit tests.
const displayed=new Map();
function screen(n){return displayed.get(n)||projected(n)}
function placeDots(list){
 displayed.clear();
 const grid=new Map(),cell=40;
 const featured=groupAnchors.get(centralGroup[groupMode]);
 const reservedLabels=[];
 for(const h of groupAnchors.values()){
  if(!captionsBelow(groupMode)&&h!==featured)continue;
  const {x,y}=projected(h);
  reservedLabels.push({x,y,half:h.captionHalf??h.key.length*6+4});
 }
 function key(x,y){return Math.floor(x/cell)+','+Math.floor(y/cell)}
 function reserve(x,y,r){
  const id=key(x,y);
  if(!grid.has(id))grid.set(id,[]);
  grid.get(id).push({x,y,r});
 }
 function fits(x,y,r){
  if(reservedLabels.some(p=>Math.abs(x-p.x)<p.half+r+2&&y+r+2>p.y+16&&y-r-2<p.y+32))return false;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
   const nearby=grid.get(key(x+dx*cell,y+dy*cell));
   if(nearby?.some(p=>Math.hypot(x-p.x,y-p.y)<r+p.r+(groupMode==='network'?2:6)))return false;
  }
  return true;
 }
 for(const h of groupAnchors.values())reserve(width/2+panX+h.x*zoom,height/2+panY+h.y*zoom,Math.max(6,Math.min(11,8*zoom+3)));
 for(const n of list){
  const origin=projected(n),r=outerRadius(n);
  let {x,y}=origin;
  for(let k=1;!fits(x,y,r);k++){
   const angle=n.phase+k*2.399963,offset=3*Math.sqrt(k);
   x=origin.x+Math.cos(angle)*offset;y=origin.y+Math.sin(angle)*offset;
  }
  displayed.set(n,{x,y});reserve(x,y,r);
 }
}
function world(x,y){return {x:(x-width/2-panX)/zoom,y:(y-height/2-panY)/zoom}}
function updatePhysics(){const list=activeNodes(),alpha=temperature;
 // Re-evaluate local crowding as the graph settles. Leave space around each
 // person's actual close contacts instead of enforcing one gap for all pairs.
 if(groupMode==='network'){
  for(const n of list){
   let reach=0;
   for(const m of n.closeContacts)reach=Math.max(reach,Math.hypot(n.x-m.x,n.y-m.y));
   n.neighborhoodReach=Math.min(230,reach+20);
   n.nearestUnknown=Infinity;
  }
 }
 for(let i=0;i<list.length;i++){
  const n=list[i];
  for(let j=i+1;j<list.length;j++){
   const m=list[j];
   if(groupMode==='network'&&n.component!==m.component)continue;
   const dx=n.x-m.x,dy=n.y-m.y,d2=dx*dx+dy*dy+.1;
   if(d2>160000)continue;
   const d=Math.sqrt(d2);
   const unrelated=groupMode==='network'&&!n.contacts.has(m);
   const clearance=unrelated?(n.circle===m.circle?104:148):36;
   let separation=n.r+m.r+clearance;
   if(unrelated&&!n.known.has(m)){
    n.nearestUnknown=Math.min(n.nearestUnknown,d);
    m.nearestUnknown=Math.min(m.nearestUnknown,d);
    separation=Math.max(separation,n.neighborhoodReach,m.neighborhoodReach);
   }
   const overlap=Math.max(0,separation-d);
   const force=(Math.min(3,3200/d2)+overlap*(unrelated?.22:.08))*alpha/d;
   n.vx+=dx*force;n.vy+=dy*force;m.vx-=dx*force;m.vy-=dy*force;
  }
 }
 for(const e of layoutEdges){
  const n=e.source,m=e.target,dx=m.x-n.x,dy=m.y-n.y,d=Math.hypot(dx,dy)||1;
  let force;
  if(groupMode==='network'){
   const {distance,stiffness,repulsive}=e.network;
   const gap=d-distance;
   force=(repulsive?Math.min(0,gap):gap)*stiffness;
   if(e.network.priority){
    const neighborLimit=Math.min(n.nearestUnknown,m.nearestUnknown)-18;
    force+=Math.max(0,d-Math.max(distance*.65,neighborLimit))*.65;
   }
  }else force=(d-e.length)*e.strength*.12;
  const impulse=force*alpha/d;
  n.vx+=dx*impulse;n.vy+=dy*impulse;m.vx-=dx*impulse;m.vy-=dy*impulse;
 }
 for(const n of list){if(drag?.node===n)continue;const grouped=groupMode!=='network';
 const tether=n.peripheral?(n.contactWeight>0 ? .09 : 0):.22;
 let fx=grouped?(n.slotX-n.x)*tether:(n.component.x-n.x)*.002;
 let fy=grouped?(n.slotY-n.y)*tether:(n.component.y-n.y)*.002;
 const damping=grouped?.84:.72;
 n.vx=(n.vx+fx*alpha)*damping;n.vy=(n.vy+fy*alpha)*damping;
 if(!grouped){const cap=Math.min(1,18/(Math.hypot(n.vx,n.vy)||1));n.vx*=cap;n.vy*=cap}n.x+=n.vx;n.y+=n.vy}temperature*=.986;
}
// Refine local rankings after the global forces settle. Move a close contact
// inward and the nearest unlinked person outward, with a soft tether to the
// settled layout so competing neighborhoods share the correction.
function refineNeighborhoods(list){
 const centered=nodeMap.get('klein');
 const anchors=list.filter(n=>n.closeContacts.length);
 const original=list.map(n=>({x:n.x,y:n.y}));
 for(let step=0;step<36;step++){
  for(const n of list)n.vx=n.vy=0;
  for(const n of anchors){
   let stranger,minimum=Infinity;
   for(const m of list){
    if(n===m||n.component!==m.component||n.known.has(m))continue;
    const d2=(m.x-n.x)**2+(m.y-n.y)**2;
    if(d2<minimum){stranger=m;minimum=d2}
   }
   if(!stranger)continue;
   const outside=Math.sqrt(minimum)||1;
   for(const m of n.closeContacts){
    const dx=m.x-n.x,dy=m.y-n.y,d=Math.hypot(dx,dy)||1;
    const error=d+14-outside;
    if(error<=0)continue;
    const push=Math.min(9,error*.2);
    const pull=d>42?push:0;
    const sx=(stranger.x-n.x)*push/outside,sy=(stranger.y-n.y)*push/outside;
    const fx=dx*pull/d,fy=dy*pull/d;
    m.vx-=fx;m.vy-=fy;stranger.vx+=sx;stranger.vy+=sy;
    n.vx+=fx-sx;n.vy+=fy-sy;
   }
  }
  list.forEach((n,i)=>{
   if(n!==centered){
    const scale=Math.min(1,7/(Math.hypot(n.vx,n.vy)||1));
    n.x+=n.vx*scale+(original[i].x-n.x)*.025;
    n.y+=n.vy*scale+(original[i].y-n.y)*.025;
   }
   n.vx=n.vy=0;
  });
 }
}
const networkLayouts=new Map();
function settleNetwork(){
 const key=isolates.checked;
 if(!networkLayouts.has(key)){
  components.forEach(members=>{members[0].component.x=members[0].component.y=0});
  nodes.forEach(n=>{
   const radius=32*Math.sqrt(n.componentIndex),angle=n.componentIndex*2.399963;
   n.x=n.component.x+Math.cos(angle)*radius;n.y=n.component.y+Math.sin(angle)*radius;n.vx=n.vy=0;
  });
  temperature=1;
  for(let i=0;i<300;i++)updatePhysics();
  refineNeighborhoods(activeNodes());
  packNetworkComponents(activeNodes());
  networkLayouts.set(key,{positions:nodes.map(n=>({x:n.x,y:n.y})),centers:components.map(m=>({...m[0].component}))});
 }else{
  const {positions,centers}=networkLayouts.get(key);
  components.forEach((m,i)=>Object.assign(m[0].component,centers[i]));
  nodes.forEach((n,i)=>{n.x=positions[i].x;n.y=positions[i].y;n.vx=n.vy=0});
 }
 temperature=0;
}
function requestDraw(){if(!frame)frame=requestAnimationFrame(tick)}
function tick(now){frame=0;if(layoutTransition){const t=Math.min(1,(now-layoutTransition.start)/layoutTransition.duration),ease=t*t*(3-2*t);layoutTransition.progress=ease;for(const item of layoutTransition.nodes){item.node.x=item.x+(item.toX-item.x)*ease;item.node.y=item.y+(item.toY-item.y)*ease}panX=layoutTransition.fromX+(layoutTransition.toX-layoutTransition.fromX)*ease;panY=layoutTransition.fromY+(layoutTransition.toY-layoutTransition.fromY)*ease;zoom=layoutTransition.fromZoom+(layoutTransition.toZoom-layoutTransition.fromZoom)*ease;if(t<1)requestDraw();else{layoutTransition=null;temperature=.015}}else if(temperature>.018){updatePhysics();requestDraw()}if(cameraAnimation){const t=Math.min(1,Math.max(0,now-cameraAnimation.start)/cameraAnimation.duration),ease=1-Math.pow(1-t,3);panX=cameraAnimation.fromX+(cameraAnimation.targetX-cameraAnimation.fromX)*ease;panY=cameraAnimation.fromY+(cameraAnimation.targetY-cameraAnimation.fromY)*ease;zoom=cameraAnimation.fromZoom+(cameraAnimation.targetZoom-cameraAnimation.fromZoom)*ease;if(t<1)requestDraw();else cameraAnimation=null}draw()}
// Mention counts are approximate character frequencies, not relationship frequency.
function edgeWeight(left,right){const scale=n=>Math.min(1,Math.log1p(Math.max(0,Number(n)||0))/Math.log1p(5000));return (scale(left.mentions)+scale(right.mentions))/2}
// Logarithmic scaling prevents very frequent characters from overwhelming the graph.
function mentionGlow(p){const value=Number(p.mentions);return Number.isFinite(value)&&value>0?Math.min(1,Math.log1p(value)/Math.log1p(20000)):0}
function nodeRadius(n){
 const target=groupMode==='pathway'?(n.finalRank?2.8+5.7*(9-n.finalRank.level)/9:2.2):n.displayRadius;
 const prior=layoutTransition?.colors.get(n.p.id);
 return prior?prior.radius+(target-prior.radius)*layoutTransition.progress:target;
}
function nodeRings(n){return groupMode==='network'||groupMode==='pathway'?pathwayStyle(n.p).rings:[]}
function outerRadius(n){return nodeRadius(n)}
function drawRings(n,p,r){
 const rings=nodeRings(n),span=2*Math.PI/rings.length;
 ctx.save();
 ctx.lineWidth=.8;
 rings.forEach((key,i)=>{
  const gap=rings.length===1?Math.PI/2:Math.min(.38,span*.2);
  const start=-Math.PI/2+i*span;
  ctx.beginPath();ctx.arc(p.x,p.y,r-.5,start+gap/2,start+span-gap/2);
  ctx.strokeStyle=ringColor(key);ctx.stroke();
 });
 ctx.restore();
}
const hubShapes={
 organization:[[0,-1],[.87,-.5],[.87,.5],[0,1],[-.87,.5],[-.87,-.5]],
 nationality:[[-.84,-.8],[.84,-.8],[.77,.22],[.48,.67],[0,1],[-.48,.67],[-.77,.22]],
 pathway:[[0,-1],[.83,0],[0,1],[-.83,0]]
};
function drawHub(x,y,mode,color,accent){
 const size=Math.max(8,Math.min(11,8*zoom+4));
 ctx.save();ctx.translate(x,y);
 ctx.beginPath();
 hubShapes[mode].forEach(([px,py],i)=>{
  if(i===0)ctx.moveTo(px*size,py*size);else ctx.lineTo(px*size,py*size);
 });
 ctx.closePath();ctx.fillStyle=color;ctx.fill();
 ctx.strokeStyle=mode==='pathway'?canvasTheme.label:blendColor(color,'#e1e7f1',.45);ctx.lineWidth=.6;ctx.lineJoin='round';ctx.stroke();
 if(mode!=='pathway'){ctx.fillStyle=accent;ctx.fillRect(-2,-2,4,4);}
 ctx.restore();
}
function nodeOrder(n){return n.p.id===hover?2:(n.p.id===a||n.p.id===b?1:0)}
function shortLabel(p){const name=(p.short||p.name).split('·')[0];return Array.from(name).length>4?Array.from(name).slice(0,4).join('')+'…':name}
function blendColor(from,to,t){const a=parseInt(from.slice(1),16),b=parseInt(to.slice(1),16),v=shift=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t);return '#'+[v(16),v(8),v(0)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function rgba(hex,alpha){const value=parseInt(hex.slice(1),16);return `rgba(${value>>16},${(value>>8)&255},${value&255},${alpha})`}
let inspectedHub=null;
function readCanvasTheme() {
 const style = getComputedStyle(canvas);
 const color = name => style.getPropertyValue('--ui-' + name).trim();
 return { label: color('ink'), edge: color('muted'), selected: color('accent'), surface: color('page') };
}
let canvasTheme = readCanvasTheme();
window.addEventListener('wiki-theme-change', () => {
 canvasTheme = readCanvasTheme();
 if(layoutTransition)layoutTransition.colors.clear();
 renderPalette();
 render();
 requestDraw();
});
function draw(){
 const tip=document.getElementById('person-hover'),person=byId.get(hover);
 tip.hidden=!!drag||!person;
 if(person&&tip.textContent!==person.name)tip.textContent=person.name;
 const labels=[];ctx.clearRect(0,0,width,height);const list=activeNodes(),focus=b||a,neighbors=new Set(focus?[focus,...edgesOf(focus).map(e=>other(e,focus))]:[]),q=search.value.trim().toLowerCase();
 if(layoutTransition){
  const {startDots,endDots,progress}=layoutTransition;
  for(const n of list){
   const end=endDots.get(n),start=startDots.get(n)||end;
   displayed.set(n,{x:start.x+(end.x-start.x)*progress,y:start.y+(end.y-start.y)*progress});
  }
 }else placeDots(list);
 for(const e of visibleEdges()){const n=nodeMap.get(e.a),m=nodeMap.get(e.b),p=screen(n),v=screen(m),selected=a&&b&&((e.a===a&&e.b===b)||(e.a===b&&e.b===a)),near=(focus||hover)&&[e.a,e.b].includes(focus||hover),weight=edgeWeight(n.p,m.p),peripheral=groupMode!=='network'&&(n.peripheral||m.peripheral);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(v.x,v.y);ctx.lineWidth=selected?1.8:near?1:.45;ctx.strokeStyle=selected?rgba(canvasTheme.selected,.9):near?rgba(canvasTheme.edge,.65):rgba(canvasTheme.edge,focus?.04:peripheral?.06+weight*.025:.13+weight*.06);ctx.stroke();if(selected){const directions=Object.values(e.direction||{}),arrow=(from,to,node)=>{const angle=Math.atan2(to.y-from.y,to.x-from.x),offset=nodeRadius(node)+3,x=to.x-Math.cos(angle)*offset,y=to.y-Math.sin(angle)*offset;ctx.beginPath();ctx.moveTo(x-8*Math.cos(angle-.5),y-8*Math.sin(angle-.5));ctx.lineTo(x,y);ctx.lineTo(x-8*Math.cos(angle+.5),y-8*Math.sin(angle+.5));ctx.stroke()};if(directions.includes('both')||directions.includes('a-to-b'))arrow(p,v,m);if(directions.includes('both')||directions.includes('b-to-a'))arrow(v,p,n)}}
 // Old and new hubs crossfade while their members move.
 if(layoutTransition&&layoutTransition.oldHubs.length){ctx.save();ctx.globalAlpha=1-layoutTransition.progress;for(const h of layoutTransition.oldHubs){const x=width/2+panX+h.x*zoom,y=height/2+panY+h.y*zoom;drawHub(x,y,h.mode,h.mode==='pathway'?hubColor(h.key,h.mode):h.color,categoryColors(h.mode,h.key).accent);ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='rgba(228,234,245,.92)';labels.push({text:h.key,x,y,r:12,below:captionsBelow(h.mode),priority:0,alpha:ctx.globalAlpha})}ctx.restore()}
 // Membership links are separate from person-to-person relationships.
 if(groupMode!=='network'){ctx.save();if(layoutTransition)ctx.globalAlpha=layoutTransition.progress;
  for(const n of [...list].sort((x,y)=>Number(x.p.id===focus)-Number(y.p.id===focus)))for(const key of groupKeys(n.p,groupMode)){const h=groupAnchors.get(key);if(!h)continue;const p=screen(n),x=width/2+panX+h.x*zoom,y=height/2+panY+h.y*zoom,highlight=n.p.id===focus;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(p.x,p.y);ctx.lineWidth=highlight?2.5:.5;ctx.strokeStyle=highlight?rgba(hubColor(key,groupMode),.95):rgba(canvasTheme.edge,.2);ctx.setLineDash(inferredGroup(n.p,groupMode,key)?[4,3]:[]);ctx.stroke()}ctx.setLineDash([]);
  for(const h of groupAnchors.values()){const x=width/2+panX+h.x*zoom,y=height/2+panY+h.y*zoom;if(x< -100||x>width+100||y< -50||y>height+50)continue;const color=hubColor(h.key,groupMode);drawHub(x,y,groupMode,color,categoryColors(groupMode,h.key).accent);labels.push({text:h.key,x,y,r:12,below:captionsBelow(groupMode),required:x>=0&&x<=width&&y>=0&&y<=height,priority:h.key===inspectedHub?5:h.key===centralGroup[groupMode]?4:1+Math.min(.9,h.count/100),alpha:ctx.globalAlpha})}
  ctx.restore();
 }

 const ordered=[...list].sort((x,y)=>nodeOrder(x)-nodeOrder(y));
 for(const n of ordered){const p=screen(n),radius=nodeRadius(n),rings=nodeRings(n),r=rings.length?radius-1.5:radius,selected=n.p.id===a||n.p.id===b,hovered=n.p.id===hover,lead=groupMode==='network'&&n.storyRadius===0,detail=lead||selected||hovered||zoom>2,unknown=groupMode==='network'?!pathwayStyle(n.p).core&&!pathwayStyle(n.p).rings.length:n.peripheral,match=!q||matchesSearch(n.p,q),near=!focus||neighbors.has(n.p.id);ctx.globalAlpha=(near||selected||hovered?1:.18)*(match||selected||hovered?1:.28);if(p.x < -45||p.y < -45||p.x>width+45||p.y>height+45)continue;
  const prior=layoutTransition?.colors.get(n.p.id),primary=prior?blendColor(prior.primary,personColor(n.p),layoutTransition.progress):personColor(n.p),accent=prior?blendColor(prior.accent,personAccent(n.p),layoutTransition.progress):personAccent(n.p);
  {const frequency=mentionGlow(n.p),size=Math.min(30,r+3+frequency*12+(selected||hovered?6:0)),glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,size);glow.addColorStop(0,rgba(document.documentElement.dataset.theme==='day'||nodeRings(n).length?primary:accent,selected||hovered?.32:unknown?.045:.16));glow.addColorStop(1,rgba(accent,0));ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill()}
  if(rings.length)drawRings(n,p,radius);
  if(!detail){ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=unknown?'rgba(157,171,194,.42)':primary;ctx.fill();if(!unknown&&document.documentElement.dataset.theme==='night'){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.8,r*.32),0,Math.PI*2);ctx.fillStyle=accent;ctx.fill()}continue}
  ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=primary;ctx.fill();ctx.strokeStyle=rgba(accent,.8);ctx.lineWidth=selected||hovered?.75:.5;if((groupMode==='pathway'||groupMode==='network')&&pathwayStyle(n.p).core?.inferred)ctx.setLineDash([3,2]);ctx.stroke();ctx.setLineDash([]);
  ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,r-1),0,Math.PI*2);ctx.clip();const image=portrait(n.p);if(image)ctx.drawImage(image,p.x-r,p.y-r,r*2,r*2);else{ctx.fillStyle=document.documentElement.dataset.theme==='day'?canvasTheme.surface:accent;ctx.beginPath();ctx.arc(p.x,p.y-r*.23,r*.31,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(p.x,p.y+r*.68,r*.58,r*.55,0,0,Math.PI*2);ctx.fill()}ctx.restore();
  ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle=canvasTheme.label;labels.push({text:n.p.short||shortLabel(n.p),x:p.x,y:p.y,r:outerRadius(n),priority:lead?4:selected||hovered?3:0,alpha:ctx.globalAlpha});ctx.globalAlpha=1;
 }ctx.globalAlpha=1;
 const obstacles=list.map(n=>{const {x,y}=screen(n),r=outerRadius(n)+2;return {left:x-r,right:x+r,top:y-r,bottom:y+r}});
 const canvasBox=canvas.getBoundingClientRect();
 for(const overlay of [grouping,document.querySelector('.graph-controls'),document.querySelector('.graph-legend')]){
  const rect=overlay.getBoundingClientRect();
  obstacles.push({left:rect.left-canvasBox.left-4,right:rect.right-canvasBox.left+4,top:rect.top-canvasBox.top-4,bottom:rect.bottom-canvasBox.top+4});
 }
 for(const h of [...groupAnchors.values(),...(layoutTransition?.oldHubs||[])]){
  const x=width/2+panX+h.x*zoom,y=height/2+panY+h.y*zoom;
  obstacles.push({left:x-12,right:x+12,top:y-12,bottom:y+12});
 }
 ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
 for(const label of labels.sort((a,b)=>Number(!!b.required)-Number(!!a.required)||b.priority-a.priority)){
  const {x,y,r,text}=label,half=ctx.measureText(text).width/2+2,gap=r+4;
  function fits(cx,top){
   return cx-half>=0&&cx+half<=width&&top>=0&&top+16<=height&&
    !obstacles.some(b=>cx-half<b.right&&cx+half>b.left&&top<b.bottom&&top+16>b.top);
  }
  const candidates=label.below?[[x,y+gap]]:[[x,y+gap],[x,y-gap-15],[x+gap+half,y-7],[x-gap-half,y-7]];
  const position=candidates.find(([cx,top])=>fits(cx,top));
  if(!position)continue;
  const [cx,top]=position;
  ctx.globalAlpha=label.alpha;ctx.fillStyle=canvasTheme.label;ctx.fillText(text,cx,top+1);
  obstacles.push({left:cx-half,right:cx+half,top,bottom:top+16});
 }
 ctx.globalAlpha=1;
}
function avatar(p){return `<span class="avatar" style="border-color:${personColor(p)}" aria-hidden="true">${p.avatar?`<img src="${esc(p.avatar)}" alt="" onerror="this.remove()">`:esc(p.mark||p.short[0])}</span>`}
function row(p,detail){return `<button class="person-row" data-id="${esc(p.id)}">${avatar(p)}<span class="row-copy"><strong>${esc(p.name)}</strong><small>${esc(detail||p.group)}</small></span><span class="arrow"><svg class="wiki-icon" aria-hidden="true" focusable="false"><use href="#wiki-icon-next"></use></svg></span></button>`}
function pathwayBadge(person){
 const {rings}=pathwayStyle(person);
 const primary=currentPathwayColor(pathwayStyle(person).core?.value)||canvasTheme.label;
 if(!rings.length)return '';
 const span=360/rings.length,gap=rings.length===1?90:Math.min(18,span*.2);
 const stops=rings.map((key,i)=>`transparent ${i*span}deg ${i*span+gap/2}deg, ${ringColor(key)} ${i*span+gap/2}deg ${(i+1)*span-gap/2}deg, transparent ${(i+1)*span-gap/2}deg ${(i+1)*span}deg`);
 return `<i class="pathway-badge" style="--core:${primary};background-image:conic-gradient(${stops.join(',')})" aria-hidden="true"></i>`;
}
function stageCertaintyLabel(stage){
 if(stage.certainty==='inferred' && stage.sequenceCertainty==='confirmed')return /^序列[0-9]+(?:[“「]|天使)/.test(stage.sequence)?'（途径推测，序列已确认）':'（途径推测，位阶范围已确认）';
 if(stage.sequenceCertainty==='inferred')return stage.certainty==='inferred'?'（途径与序列均为推测）':'（序列推测）';
 return stage.certainty==='inferred'?'（推测）':'';
}
function classification(p){const excerpt=p.documentExcerpt;const profile=p.documentProfileUrl?`<details class="meta" open><summary>人物文档</summary>${excerpt?.text?`<p>${esc(excerpt.text)}</p>${excerpt.sources?.length?`<p class="meta">${excerpt.sources.map(esc).join('；')}</p>`:''}`:''}<p><a href="${esc(p.documentProfileUrl)}">查看人物文档</a></p></details>`:'';const facts=p.classificationEvidence||[],overview=`<p class="meta">组织：${esc(groupSummary(p,'organization'))} · 国籍：${esc(groupSummary(p,'nationality'))} · ${pathwayBadge(p)}${esc(pathwayDescription(p))}</p>`;const stages=p.progression||[];const progression=stages.length?`<div class="meta"><strong>已收录的序列经历</strong>${stages.map(x=>`<p>${x.samePeriodAsPrevious?'与上一条并存 · ':''}${x.pathway?esc(x.pathway)+'途径':esc(x.scopeLabel||'途径待核实')} · ${esc(x.sequence)}${stageCertaintyLabel(x)}<br>${esc(x.source)}${x.note?`<br>${esc(x.note)}`:''}</p>`).join('')}<p>未列出的中间阶段仍待核实。</p></div>`:'';if(!facts.length)return overview+profile+progression;const labels={organization:'组织',nationality:'国籍',sequence:'序列线索',pathway:'途径'};return overview+profile+progression+`<details class="meta"><summary>已核对的分类线索（${facts.length}）</summary>${facts.map(x=>`<p>${esc(x.relation==='ability'?'能力关联':x.relation==='sefirah'?'源质关联':labels[x.kind]||x.kind)}：${esc(x.value)}${x.unit?' · '+esc(x.unit):''}${x.certainty==='inferred'?'（推测）':''}<br>${esc(x.source)}${x.note?`<br>${esc(x.note)}`:''}</p>`).join('')}<p>其他属性待核实；序列线索反映所引章节中的状态。</p></details>`}
function organizationNames(person) {
 return (person.classificationEvidence || []).filter(fact => fact.kind === 'organization').map(fact => fact.value);
}
function matchesSearch(person, query) {
 const names = [person.name, person.short, person.alias, ...organizationNames(person)];
 if(person.ordinaryInCitedPeriod||person.ordinaryInCitedPeriodInferred)names.push(pathwayStatus(person));
 return names.some(name => name && name.toLowerCase().includes(query));
}
function searchResults(query) {
 const members=characters.filter(person=>organizationNames(person).includes(query));
 const results=members.length?members:characters.filter(person=>matchesSearch(person,query));
 const limit=members.length?results.length:60;
 const heading=members.length?`${esc(query)}成员`:'搜索结果';
 const rows=results.slice(0,limit).map(person=>{
  if(!members.length) return row(person,person.alias||person.group);
  const facts=person.classificationEvidence.filter(fact=>fact.kind==='organization'&&fact.value===query);
  const details=facts.map(fact=>fact.note||fact.unit||'').filter(Boolean);
  return row(person,details.join(' ')||query);
 });
 const more=results.length>limit?'<p class="more">继续输入名字或别名，缩小搜索范围。</p>':'';
 return `<h3 class="section-label">${heading} <span>${results.length} 位</span></h3><div class="list">${rows.join('')||'<p class="empty">没有找到相关人物，试试其他名字、别名或组织。</p>'}</div>${more}`;
}
function renderRelationshipPaths(connection) {
 if(connection.status==='disconnected'){
  return '<h3 class="section-label">最短关系链</h3><p class="empty">已收录的关系中，暂未找到连接两人的路径。</p>';
 }
 const {degrees,intermediaries,withinSixDegrees,paths,hasMorePaths}=connection;
 const status=withinSixDegrees?'六步内连通':'超过六步';
 const chains=paths.map(({personIds,segments})=>{
  const names=personIds.map(id=>esc(byId.get(id).short)).join(' → ');
  if(degrees===1)return `<p class="detail-text">${names}</p>`;
  const steps=segments.map(({from,to,relations:records})=>{
   const endpoints=`${esc(byId.get(from).short)} · ${esc(byId.get(to).short)}`;
   const evidence=records.map(record=>`<p class="detail-text">${esc(record.summary||'')}</p>${record.sourceHint?`<p class="source">${esc(record.sourceHint)}</p>`:''}`).join('');
   return `<li><strong>${endpoints}</strong>${evidence}</li>`;
  }).join('');
  return `<details class="relationship-chain"><summary>${names}</summary><ol>${steps}</ol></details>`;
 }).join('');
 return `<h3 class="section-label">最短关系链</h3><p class="meta">${status} · ${degrees} 步 · ${intermediaries} 位中间人</p>${chains}${hasMorePaths?`<p class="more">显示其中 ${paths.length} 条最短路径。</p>`:''}`;
}
function render(){
 document.getElementById('person-count').textContent=characters.length;document.getElementById('relation-count').textContent=relations.length;document.getElementById('visible-count').textContent=`图中 ${activeNodes().length} 人`;
 const query=search.value.trim().toLowerCase();
 if(expandedOrganization&&(groupMode!=='organization'||query!==expandedOrganization.toLowerCase())){
  expandedOrganization=null;renderOrganizationMembers();
 }
 if(expandedOrganization){content.replaceChildren();return}
 if(query){content.innerHTML=searchResults(query);return}
 if(!a){content.replaceChildren();return}
 const p=byId.get(a);
 if(!b){const rs=edgesOf(a);content.innerHTML=`<button class="back" data-action="reset"><svg class="wiki-icon" aria-hidden="true" focusable="false"><use href="#wiki-icon-back"></use></svg> 返回关系网</button><div class="profile">${avatar(p)}<div><h3>${esc(p.name)}</h3><p>${esc(p.group)}${p.alias?' · '+esc(p.alias):''}</p></div></div><p class="meta">字面提及 ${esc(p.mentions??'待统计')} 次。${esc(p.matchNote||'次数按名称字面匹配，可能存在歧义。')}</p>${classification(p)}${p.aliasSources?.length?`<details class="meta"><summary>查看别名出处</summary>${p.aliasSources.map(x=>`<p>${esc(x.alias)}：${esc(x.source)}</p>`).join('')}</details>`:''}<h3 class="section-label" style="margin-top:24px">已收录的关系 <span>${rs.length} 位</span></h3><div class="list">${rs.map(r=>row(byId.get(other(r,a)),categoryText(r,a)||'尚未分类')).join('')||'<p class="empty">暂未收录该人物的关系。</p>'}</div><p class="more">选择另一位人物，查看他们之间的关系与出处。</p>`;return}
 const q=byId.get(b);
 const {connection,directRelations}=relationshipQuery.queryPair(a,b);
 const rel=directRelations[0];
 content.innerHTML=`<button class="back" data-action="single"><svg class="wiki-icon" aria-hidden="true" focusable="false"><use href="#wiki-icon-back"></use></svg> 返回 ${esc(p.short)} 的关系</button><div class="profile">${avatar(p)}${avatar(q)}<div><h3>${esc(p.short)} × ${esc(q.short)}</h3><p>${esc(p.name)} · ${esc(q.name)}</p></div></div>${renderRelationshipPaths(connection)}${rel?`${rel.categories?.length?`<div class="tags">${categoryText(rel,a).split(' · ').map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:'<p class="meta">关系分类尚待核对。</p>'}<p class="detail-text">${esc(rel.summary)}</p><p class="detail-text">${esc(rel.detail)}</p><p class="source">${esc(rel.sourceHint||'具体章节出处待补充。')}</p>${rel.milestones?.length?`<h3 class="section-label" style="margin-top:24px">关系阶段</h3>${rel.milestones.map(m=>`<div class="milestone"><strong>${esc(m.tag)}</strong><br>${esc(m.note)}<small>${esc(m.source)}</small></div>`).join('')}`:''}`:''}`;
}
function hitHub(x,y){
 let best=null,nearest=13;
 for(const h of groupAnchors.values()){
  const p=projected(h),d=Math.hypot(x-p.x,y-p.y);
  if(d<nearest){best=h;nearest=d}
 }
 return best;
}
function hit(x,y){const list=activeNodes().sort((x,y)=>nodeOrder(x)-nodeOrder(y));for(let i=list.length-1;i>=0;i--){const n=list[i],p=screen(n);if(Math.hypot(x-p.x,y-p.y)<Math.max(8,outerRadius(n)+3))return n}return null}
function local(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
canvas.addEventListener('pointerdown',e=>{layoutTransition=null;cameraAnimation=null;const p=local(e),hub=hitHub(p.x,p.y),n=hub?null:hit(p.x,p.y);inspectedHub=hub?.key||null;drag={node:n,startX:p.x,startY:p.y,lastX:p.x,lastY:p.y,moved:false};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{const p=local(e);if(drag){if(Math.hypot(p.x-drag.startX,p.y-drag.startY)>4)drag.moved=true;if(drag.node&&drag.moved){const w=world(p.x,p.y);drag.node.x=w.x;drag.node.y=w.y;drag.node.vx=drag.node.vy=0;temperature=Math.max(temperature,.15)}else if(!drag.node){defaultCamera=false;overviewCamera=false;panX+=p.x-drag.lastX;panY+=p.y-drag.lastY}drag.lastX=p.x;drag.lastY=p.y;requestDraw()}else{const hub=hitHub(p.x,p.y);inspectedHub=hub?.key||null;const n=hub?null:hit(p.x,p.y),next=n?.p.id||null;if(next!==hover){hover=next;canvas.style.cursor=hover?'pointer':'grab'}requestDraw()}});
let pendingNodeClick=null;
canvas.addEventListener('pointerup',e=>{
 if(!drag)return;
 if(drag.node&&!drag.moved){
  const person=drag.node.p;
  if(pendingNodeClick&&pendingNodeClick.id===person.id){
   clearTimeout(pendingNodeClick.timer);pendingNodeClick=null;
   if(person.documentProfileUrl)location.assign(person.documentProfileUrl);else select(person.id);
  }else{
   if(pendingNodeClick){clearTimeout(pendingNodeClick.timer);select(pendingNodeClick.id)}
   pendingNodeClick={id:person.id,timer:setTimeout(()=>{select(person.id);pendingNodeClick=null},300)};
  }
 }
 drag=null;requestDraw();
});canvas.addEventListener('pointercancel',()=>{drag=null;requestDraw()});canvas.addEventListener('pointerleave',e=>{hover=null;if(e.pointerType!=='touch')inspectedHub=null;requestDraw()});
motionPreference.addEventListener('change',()=>{requestDraw()});document.addEventListener('visibilitychange',()=>{if(!document.hidden){requestDraw()}});
function moveCamera(targetX,targetY,targetZoom,duration,kind='view'){
 defaultCamera=kind==='default';
 overviewCamera=kind==='overview';
 if(duration && !motionPreference.matches){
  cameraAnimation={start:performance.now(),duration,kind,fromX:panX,fromY:panY,fromZoom:zoom,targetX,targetY,targetZoom};
 }else{
  cameraAnimation=null;
  panX=targetX;panY=targetY;zoom=targetZoom;
 }
 requestDraw();
}
function zoomAt(factor,x=width/2,y=height/2){
 if(factor===1)return;
 layoutTransition=null;
 const previousTarget=cameraAnimation?.kind==='zoom'?cameraAnimation.targetZoom:zoom;
 const targetZoom=Math.max(minimumZoom,Math.min(3.5,previousTarget*factor));
 if(targetZoom===previousTarget)return;
 const anchor=world(x,y);
 moveCamera(x-width/2-anchor.x*targetZoom,y-height/2-anchor.y*targetZoom,targetZoom,220,'zoom');
}
canvas.addEventListener('wheel',e=>{
 e.preventDefault();
 const p=local(e),unit=e.deltaMode===1?16:e.deltaMode===2?height:1;
 zoomAt(Math.exp(-e.deltaY*unit*.001),p.x,p.y);
},{passive:false});
document.getElementById('zoom-in').onclick=()=>zoomAt(1.25);document.getElementById('zoom-out').onclick=()=>zoomAt(.8);document.getElementById('fit').onclick=()=>{layoutTransition=null;fitView(true)};document.getElementById('reset').onclick=reset;
content.addEventListener('click',e=>{const node=e.target.closest('[data-id]'),action=e.target.closest('[data-action]');if(node)select(node.dataset.id);if(action){if(action.dataset.action==='single'){b=null;updateUrl();render();revealSelection();focusPerson(a)}else reset()}});
grouping.addEventListener('click',e=>{const button=e.target.closest('[data-group]');if(!button||button.dataset.group===groupMode)return;
 const startDots=new Map(activeNodes().map(n=>[n,screen(n)]));
 // Keep the first reference arrangement so returning to a view restores its geography.
 if(!layoutOrigins.has(button.dataset.group)&&button.dataset.group!=='network'){
  layoutOrigins.set(button.dataset.group,new Map([...startDots].map(([n,p])=>[n,world(p.x,p.y)])));
 }
 const before=nodes.map(node=>({node,x:node.x,y:node.y})),colors=new Map(nodes.map(n=>[n.p.id,{primary:personColor(n.p),accent:personAccent(n.p),radius:nodeRadius(n)}])),oldHubs=groupMode==='network'?[]:[...groupAnchors.values()].map(h=>({...h,mode:groupMode,color:hubColor(h.key,groupMode)})),fromX=panX,fromY=panY,fromZoom=zoom;
 isolatePreferences.set(groupMode, isolates.checked);
 layoutTransition=null;cameraAnimation=null;groupMode=button.dataset.group;
 isolates.checked = isolatePreferences.get(groupMode) || [a,b].some(id=>id&&!edgesOf(id).length);
 grouping.querySelectorAll('[data-group]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));hover=null;inspectedHub=null;
 // Prepare the destination first, then animate from the current visible positions.
 settleLayout();
 // For the old viewport, the mean screen offset minimizes squared travel.
 // Bound the correction around a populated area when no person is selected.
 readingView();
 const anchor=nodeMap.get(b||a),oldAnchor=startDots.get(anchor);
 if(oldAnchor){
  zoom=fromZoom;panX=oldAnchor.x-width/2-anchor.x*zoom;panY=oldAnchor.y-height/2-anchor.y*zoom;
 }else if(groupMode!=='network'&&!groupAnchors.has(centralGroup[groupMode])){
  const shared=activeNodes().filter(n=>{const p=startDots.get(n);return p&&p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height});
  if(shared.length){
   let dx=0,dy=0;
   for(const n of shared){const p=startDots.get(n),q=projected(n);dx+=p.x-q.x;dy+=p.y-q.y}
   panX+=Math.max(-width*.35,Math.min(width*.35,dx/shared.length));
   panY+=Math.max(-height*.35,Math.min(height*.35,dy/shared.length));
   frameCharacters(activeNodes(),world(width/2,height/2));
  }
 }
 const toX=panX,toY=panY,toZoom=zoom;for(const item of before){item.toX=item.node.x;item.toY=item.node.y;item.node.vx=item.node.vy=0}
 if(!motionPreference.matches){placeDots(activeNodes());const endDots=new Map(displayed);for(const item of before){item.node.x=item.x;item.node.y=item.y}panX=fromX;panY=fromY;zoom=fromZoom;layoutTransition={start:performance.now(),duration:950,progress:0,startDots,endDots,nodes:before,colors,oldHubs,fromX,fromY,fromZoom,toX,toY,toZoom}}else temperature=.015;
 render();renderPalette();requestDraw()});
function renderOrganizationMembers(){
 const list=document.querySelector('#palette-legend .palette-list');
 if(!list)return;
 const buttons=[...list.querySelectorAll('button[data-org]')];
 const chosen=buttons.find(button=>button.dataset.org===expandedOrganization);
 const oldTop=chosen?.getBoundingClientRect().top;
 list.querySelector('.organization-members')?.remove();
 for(const button of buttons)button.setAttribute('aria-expanded',String(button===chosen));
 if(!chosen)return;
 const rowTop=chosen.offsetTop;
 let last=chosen;
 while(last.nextElementSibling&&last.nextElementSibling.offsetTop===rowTop)last=last.nextElementSibling;
 const panel=document.createElement('section');
 panel.className='organization-members';
 panel.innerHTML=searchResults(expandedOrganization);
 last.after(panel);
 // Keep the clicked row in place when a previous expansion above it closes.
 list.scrollTop+=chosen.getBoundingClientRect().top-oldTop;
}
function showOrganization(name) {
 expandedOrganization=name;
 search.value=name;
 renderOrganizationMembers();
 render();
 const hub=groupAnchors.get(name);
 if(hub) {
  layoutTransition=null;
  cameraAnimation=null;
  zoom=Math.max(0.4,Math.min(1.5, Math.min(width,height)/(2*hub.radius+100)));
  panX=-hub.x*zoom;
  panY=-hub.y*zoom;
 }
 requestDraw();
}
document.getElementById('palette-legend').addEventListener('click',event=>{
 const button=event.target.closest('button[data-org]');
 if(button){
  if(expandedOrganization===button.dataset.org){search.value='';render();requestDraw()}
  else showOrganization(button.dataset.org);
 }else{
  const person=event.target.closest('.organization-members [data-id]');
  if(person)select(person.dataset.id);
 }
});
search.addEventListener('input',()=>{render();requestDraw()});isolates.addEventListener('change',()=>{layoutTransition=null;settleLayout();if(!a)readingView(true);render();renderPalette();requestDraw()});new ResizeObserver(resize).observe(canvas);window.addEventListener('resize',resize);window.addEventListener('popstate',()=>{restore();render();requestDraw()});window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus()}if(e.key==='Escape'&&document.activeElement===search){search.value='';search.blur();render();requestDraw()}});
restore();if(a&&!edgesOf(a).length)isolates.checked=true;
// Settle the relationship-based layout before a deep-linked person is focused.
resize();clearTimeout(resizeLayoutTimer);settleLayout();render();renderPalette();if(a)focusPerson(b||a);else readingView();

const requestedOrganization=new URLSearchParams(location.search).get('organization');
if(requestedOrganization && characters.some(person=>organizationNames(person).includes(requestedOrganization))){
 grouping.querySelector('[data-group="organization"]').click();
 showOrganization(requestedOrganization);
}
