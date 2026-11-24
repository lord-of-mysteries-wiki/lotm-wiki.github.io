'use strict';
(() => {
  function describeLink(href,label,base,siteUrl,section,messages) {
    if (!href || !label || href==='#') return null;
    let target,here,site;
    try { target=new URL(href,base);here=new URL(base);site=new URL(siteUrl || base); } catch { return null; }
    if (!['http:','https:'].includes(target.protocol)) return null;
    const internal=[here.origin,site.origin].includes(target.origin);
    const path=url=>url.pathname.replace(/index\.html$/,'');
    const samePage=internal && path(target)===path(here) && target.search===here.search;
    let kind=internal?'internal':'external',title=label;
    if (samePage && target.hash) {
      kind='section';
      try {title=section || decodeURIComponent(target.hash.slice(1));} catch {title=label;}
    }
    const hint=(messages[kind] || '{title}').replaceAll('{title}',title).replaceAll('{host}',target.host);
    return {kind,hint};
  }
  if (typeof module!=='undefined' && module.exports) {module.exports={describeLink};return;}
  const config=document.currentScript.dataset;
  const selectors=['.article','.page-content','.character-profile__facts','.wiki-related','.timeline-brief','.sidebar #content .meta','.almanac-grid p'].map(scope=>scope+' a[href]').join(',');
  function enhance() {
  for (const anchor of document.querySelectorAll(selectors)) {
    if (anchor.dataset.wikiLinkKind) continue;
    if (anchor.matches('.headerlink,.character-profile__graph,[role="button"]') || anchor.closest('nav') || anchor.querySelector('img,svg,h2,h3')) continue;
    const text=anchor.textContent.replace(/\s+/g,' ').trim();
    // Reuse an arrow control's existing label instead of exposing a bare icon.
    const label=/^[↗↖→←↑↓\s]+$/.test(text) ? anchor.getAttribute('aria-label') || text : text;
    if (!label) continue;
    let section='';
    try {
      const target=document.getElementById(decodeURIComponent(new URL(anchor.href).hash.slice(1)));
      if (target) {
        const heading=target.matches('h1,h2,h3,h4')?target:target.querySelector('h1,h2,h3,h4,strong');
        if (heading) {const copy=heading.cloneNode(true);copy.querySelectorAll('.headerlink').forEach(node=>node.remove());section=copy.textContent.trim();}
      }
    } catch {}
    const hint=describeLink(anchor.getAttribute('href'),label,location.href,config.siteUrl,section,config);
    if (!hint) continue;
    anchor.dataset.wikiLinkKind=hint.kind;
    if (/↗$/.test(text)) anchor.dataset.wikiLinkMarked='';
    if (!anchor.hasAttribute('title')) anchor.title=hint.hint+(anchor.target==='_blank'?config.newTab:'');
  }
  }
  enhance();
  // Graph details and calendar prose are inserted after the initial render.
  const observer=new MutationObserver(enhance);
  for (const root of document.querySelectorAll('.article,.page-content,.character-profile__facts,.timeline-brief,.sidebar #content,.almanac-grid')) observer.observe(root,{childList:true,subtree:true});
})();
