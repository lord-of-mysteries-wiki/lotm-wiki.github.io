// Citations belong to the smallest readable block, with no visible footnote marker.
(() => {
  const groups=new Map();
  for(const marker of document.querySelectorAll('[data-character-source]')){
    const block=marker.closest('p,li,td,dd') || marker.parentElement;
    if(!groups.has(block))groups.set(block,new Set());
    groups.get(block).add(marker.dataset.characterSource);
  }
  for(const container of document.querySelectorAll('[data-entry-source]')){
    if(!container.dataset.entrySource)continue;
    for(const block of container.querySelectorAll('p,li,td')){
      if(block.querySelector('p,li,td') || groups.has(block))continue;
      groups.set(block,new Set([container.dataset.entrySource]));
    }
  }
  for(const [block,sources] of groups){
    block.dataset.characterCitation=[...sources].join('；');
    block.tabIndex=0;
  }
  const entries=[...groups.keys()];
  if(!entries.length)return;
  const tooltip=document.createElement('div');
  tooltip.id='character-citation-tooltip';
  tooltip.className='character-citation-tooltip';
  tooltip.setAttribute('role','tooltip');
  tooltip.hidden=true;
  document.body.append(tooltip);
  let active=null, pending=null, showTimer, hideTimer;
  function cancelShow(){clearTimeout(showTimer);pending=null;}
  function hide(){
    cancelShow();clearTimeout(hideTimer);
    active?.removeAttribute('aria-describedby');
    active=null;tooltip.hidden=true;
  }
  function show(entry){
    clearTimeout(hideTimer);
    active?.removeAttribute('aria-describedby');
    active=entry;tooltip.textContent=entry.dataset.characterCitation;tooltip.hidden=false;
    entry.setAttribute('aria-describedby',tooltip.id);
    const text=entry;
    const box=text.getBoundingClientRect(), tip=tooltip.getBoundingClientRect();
    // Measure the actual glyphs: a paragraph's block box often fills the column.
    const range=document.createRange();
    range.selectNodeContents(text);
    const rects=[...range.getClientRects()].filter(rect=>rect.width>0);
    const first=rects[0] || box;
    const line={top:first.top,right:Math.max(first.right,...rects.filter(rect=>Math.abs(rect.top-first.top)<4).map(rect=>rect.right))};
    const right=line.right+12;
    const fitsRight=right+tip.width<=innerWidth-12;
    // Never place above the paragraph: that space contains the date heading.
    tooltip.style.left=(fitsRight ? right : Math.max(12,Math.min(box.right-tip.width,innerWidth-tip.width-12)))+'px';
    tooltip.style.top=Math.max(12,Math.min(fitsRight ? line.top : box.bottom+6,innerHeight-tip.height-12))+'px';
  }
  function schedule(entry){
    cancelShow();clearTimeout(hideTimer);
    pending=entry;showTimer=setTimeout(()=>{if(pending===entry)show(entry);pending=null;},600);
  }
  function leave(){cancelShow();hideTimer=setTimeout(hide,200);}
  for(const entry of entries){
    entry.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')schedule(entry);});
    entry.addEventListener('pointerleave',leave);
    entry.addEventListener('focusin',()=>schedule(entry));
    entry.addEventListener('focusout',event=>{if(!entry.contains(event.relatedTarget))leave();});
    entry.addEventListener('pointerup',event=>{
      if(event.pointerType==='touch' && !event.target.closest('a,button')){
        cancelShow();active===entry && !tooltip.hidden ? hide() : show(entry);
      }
    });
  }
  tooltip.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
  tooltip.addEventListener('pointerleave',leave);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  document.addEventListener('pointerdown',event=>{
    if(active && !active.contains(event.target) && !tooltip.contains(event.target))hide();
  });
  window.addEventListener('resize',hide);
  document.addEventListener('scroll',event=>{if(!tooltip.contains(event.target))hide();},true);
})();
