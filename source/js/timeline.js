'use strict';
(() => {
  const control = document.querySelector('.timeline-depth');
  if (!control) return;
  const panels = [...document.querySelectorAll('.timeline-preview details[data-level]')];
  const buttons = [...control.querySelectorAll('button')];
  function sync() {
    for (const button of buttons) {
      const matches = panels.every(panel => panel.open === (Number(panel.dataset.level) <= Number(button.dataset.depth)));
      button.setAttribute('aria-pressed', String(matches));
    }
  }
  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const panel of panels) panel.open = Number(panel.dataset.level) <= Number(button.dataset.depth);
      if (button.dataset.depth === '0') document.getElementById('event-index').open = false;
      sync();
    });
  }
  for (const panel of panels) panel.addEventListener('toggle', sync);
  control.hidden = false;
  function revealTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    for (let period = target.closest('details'); period; period = period.parentElement.closest('details')) {
      period.open = true;
    }
    target.scrollIntoView({block: 'start'});
  }
  window.addEventListener('hashchange', revealTarget);
  revealTarget();
})();

// One shared tooltip; citations never occupy a row in the timeline.
(() => {
  const entries=[...document.querySelectorAll('[data-event-citation]')];
  if(!entries.length)return;
  const tooltip=document.createElement('div');
  tooltip.id='timeline-citation-tooltip';
  tooltip.className='timeline-citation-tooltip';
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
    active=entry;tooltip.textContent=entry.dataset.eventCitation;tooltip.hidden=false;
    entry.setAttribute('aria-describedby',tooltip.id);
    const text=entry.querySelector('.timeline-event-summary') || entry.querySelector('p') || entry.querySelector('strong') || entry;
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
    tooltip.style.top=Math.max(12,fitsRight ? line.top : box.bottom+6)+'px';
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
