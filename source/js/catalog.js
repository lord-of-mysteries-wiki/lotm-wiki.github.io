'use strict';
(async () => {
 const nav=document.querySelector('[data-catalog-navigation]'),directory=document.querySelector('[data-catalog-directory]');
 if(!nav)return;
 try {
  const response=await fetch(nav.dataset.source);if(!response.ok)throw Error(response.status);
  const data=await response.json(),t=key=>data.text[key]||key,root=new URL('../',new URL(nav.dataset.source,location.href));
  const url=path=>new URL(path.replace(/^\//,''),root);
  const path=value=>decodeURIComponent(new URL(value,location.href).pathname).replace(/index\.html$/,'');
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  const branchById=id=>data.branches.find(branch=>branch.id===id);
  function route(locationURL){
   let match={branch:'overview',group:''};
   for(const branch of data.branches)for(const item of [branch,...branch.groups])if(path(locationURL)===path(url(item.path)))match={branch:branch.id,group:item===branch?'':item.id};
   return match;
  }
  function crumbs(context,currentTitle,detail){
   let trail=document.querySelector('.breadcrumbs');
   if(!detail){if(trail)trail.hidden=true;return;}
   if(!trail){trail=node('nav');trail.className='breadcrumbs';trail.setAttribute('aria-label',t('catalog_breadcrumbs'));nav.before(trail);}
   trail.hidden=false;trail.replaceChildren();
   function add(title,target){const a=node('a',title);a.href=url(target);const separator=node('span','/');separator.setAttribute('aria-hidden','true');trail.append(a,separator);}
   const branch=branchById(context.branch),group=branch?.groups.find(group=>group.id===context.group);
   if(!detail&&!group&&branch?.path===data.path){trail.hidden=true;return;}
   add(data.title,data.path);
   if(branch&&branch.path!==data.path&&(detail||group))add(branch.title,branch.path);
   if(group&&detail)add(group.title,group.path);
   const current=node('span',currentTitle);current.setAttribute('aria-current','page');trail.append(current);
  }
  if(!directory){
   const from=new URL(location.href).searchParams.get('from');let context={branch:nav.dataset.branch||'all',group:nav.dataset.group||''};
   if(from){const target=new URL(from,location.href),parsed=route(target);const valid=target.origin===location.origin&&(path(target)===path(url(data.path))||parsed.branch!=='overview');if(valid){context=parsed;const back=nav.querySelector('[data-catalog-back]');back.href=target.pathname+target.search;back.title=t('catalog_back');}}
   for(const link of nav.querySelectorAll('nav a')){if(path(link.href)===path(url(context.branch==='overview'?data.path:branchById(context.branch)?.path||data.path)))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
   crumbs(context,nav.dataset.title,true);return;
  }
  const branch=branchById(directory.dataset.branch),search=directory.querySelector('[data-catalog-search]'),groupSelect=directory.querySelector('[data-catalog-group]'),workSelect=directory.querySelector('[data-catalog-work]');
  const results=directory.querySelector('[data-catalog-results]'),count=directory.querySelector('[data-catalog-count]');
  const collator=new Intl.Collator('zh-CN',{numeric:true,ignorePunctuation:true});
  function state(){const current=new URL(location.href),base=route(current);return {group:base.group,q:current.searchParams.get('q')||'',work:current.searchParams.get('work')||'',sort:current.searchParams.get('sort')||(data.id==='characters'&&branch?.id==='all'?'mentions':data.id==='artifacts'&&(!branch||branch.id==='sealed')?'number':'name')};}
  let current=state();
  function navigate(next,replace=false){current={...current,...next};const group=branch?.groups.find(g=>g.id===current.group),target=url(group?.path||branch?.path||data.path);for(const key of ['q','work','sort'])if(current[key]&&!(key==='sort'&&current[key]==='name'))target.searchParams.set(key,current[key]);history[replace?'replaceState':'pushState']({},'',target.pathname+target.search);render();}
  function render(){
   const selected=branch?.groups.find(g=>g.id===current.group);if(!selected)current.group='';
   const side=directory.querySelector('.catalog-side');side.hidden=!branch||branch.groups.length<=4;directory.classList.toggle('catalog-has-side',!side.hidden);
   for(const link of directory.querySelectorAll('[data-catalog-side-group]')){if(link.dataset.catalogSideGroup===current.group)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
   const heading=data.id==='characters'?data.title:selected?.title||(!current.group&&branch?.path===data.path?data.title:branch?.title)||data.title;
   directory.querySelector('h1').textContent=heading;crumbs({branch:branch?.id||'overview',group:current.group},heading,false);
   const viewTitle=directory.querySelector('[data-catalog-view-title]');if(viewTitle)viewTitle.textContent=selected?.title||branch.title;for(const link of directory.querySelectorAll('[data-catalog-work-filter]')){const active=current.work||(branch?.id==='all'?current.group:'');if(link.dataset.catalogWorkFilter===active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
   search.value=current.q;if(groupSelect){groupSelect.disabled=false;groupSelect.value=current.group;}if(workSelect)workSelect.value=current.work;for(const button of directory.querySelectorAll('[data-catalog-sort],[data-catalog-view]')){const mode=branch?.id==='organizations'||branch?.id==='pathways'?branch.id:current.sort;button.setAttribute('aria-pressed',String((button.dataset.catalogSort||button.dataset.catalogView)===mode));}
   results.replaceChildren();
   let items=data.entries.filter(entry=>(!branch||branch.id==='all'||entry.memberships.some(m=>m.branch===branch.id))&&(!current.group||entry.memberships.some(m=>m.branch===branch.id&&m.group===current.group))&&(!current.work||entry.works.includes(current.work)));
   if(current.q){const q=current.q.trim().toLocaleLowerCase();items=items.filter(entry=>[entry.title,entry.aliases,...entry.works,...entry.memberships.map(m=>(branchById(m.branch)?.title||'')+' '+(m.label||branchById(m.branch)?.groups.find(g=>g.id===m.group)?.title||''))].join(' ').toLocaleLowerCase().includes(q));}
   items.sort((a,b)=>current.sort==='number'?(a.numberOrder??Infinity)-(b.numberOrder??Infinity)||collator.compare(a.title,b.title):current.sort==='chapters'?(a.referenceOrder??Infinity)-(b.referenceOrder??Infinity)||collator.compare(a.title,b.title):current.sort==='mentions'?b.mentions-a.mentions||collator.compare(a.title,b.title):current.sort==='order'?((current.work&&a.orderWork!==current.work)?Infinity:(a.order??Infinity))-((current.work&&b.orderWork!==current.work)?Infinity:(b.order??Infinity))||collator.compare(a.title,b.title):collator.compare(a.title,b.title));
   const groupRows=!current.group&&!current.q&&(current.sort==='name'||current.sort==='number')&&data.id!=='characters',groups=new Map();
   for(const entry of items){const membership=groupRows?entry.memberships.find(m=>!branch||m.branch===branch.id):null;const key=membership?branch?membership.group:membership.branch:'';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);}
   const order=branch?branch.groups.map(g=>g.id):data.branches.map(b=>b.id);
   for(const [key,entries]of [...groups].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0]))){
    const group=node('section');group.className='catalog-result-group';const title=key?(branch?branch.groups.find(g=>g.id===key):branchById(key))?.title:'';if(title)group.append(node('h2',title));
    const list=node('div');list.className='directory-list catalog-results';
    for(const entry of entries){const link=node('a'),target=url(entry.url);target.searchParams.set('from',location.pathname+location.search);link.href=target;link.title=t('catalog_open')+entry.title;if(entry.displayNumber){const number=node('span',entry.displayNumber);number.className='artifact-number';link.append(number);if(entry.displayName){const name=node('span',entry.displayName);name.className='artifact-name';link.append(name);}}else link.append(node('span',entry.title));list.append(link);}
    group.append(list);results.append(group);
   }
   count.textContent=items.length+' '+t('catalog_entries');if(!items.length)results.append(node('p',t('catalog_empty')));
  }
  directory.querySelector('form').onsubmit=event=>{event.preventDefault();navigate({q:search.value});};search.oninput=()=>navigate({q:search.value},true);
  if(groupSelect)groupSelect.onchange=()=>navigate({group:groupSelect.value});if(workSelect)workSelect.onchange=()=>navigate({work:workSelect.value});for(const button of directory.querySelectorAll('[data-catalog-sort]'))button.onclick=()=>{if(data.id==='characters'&&branch?.id!=='all'){const target=url(data.path);target.searchParams.set('sort',button.dataset.catalogSort);if(current.q)target.searchParams.set('q',current.q);if(current.work)target.searchParams.set('work',current.work);location.assign(target);}else navigate({sort:button.dataset.catalogSort});};
  for(const button of directory.querySelectorAll('[data-catalog-view]'))button.onclick=()=>{const target=url(branchById(button.dataset.catalogView).path);if(current.q)target.searchParams.set('q',current.q);const work=current.work||(branch?.id==='all'?current.group:'');if(work)target.searchParams.set('work',work);location.assign(target);};
  for(const link of directory.querySelectorAll('[data-catalog-work-filter]'))link.onclick=event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate({work:link.dataset.catalogWorkFilter,...(branch?.id==='all'?{group:''}:{})});};
  for(const link of directory.querySelectorAll('[data-catalog-side-group]'))link.onclick=event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate({group:link.dataset.catalogSideGroup});};
  directory.querySelector('[data-catalog-group-search]').oninput=event=>{const q=event.target.value.trim().toLocaleLowerCase();for(const link of directory.querySelectorAll('[data-catalog-side-group]'))link.hidden=!link.textContent.toLocaleLowerCase().includes(q);};
  addEventListener('popstate',()=>{current=state();render();});render();
 } catch(error){console.warn('目录索引加载失败，保留基础分类目录。',error);}
})();
