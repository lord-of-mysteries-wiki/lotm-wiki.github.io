'use strict';
const {stripHTML,unescapeHTML}=require('hexo-util');
const {createCharacterReferences}=require('./character-references');
const {eventReferences,shortEventSource}=require('../../../tools/lib/event-references');
const plain=html=>unescapeHTML(stripHTML(html)).trim();
const placeholder=html=>/^(?:待核实|待补充|待考证|待整理|暂无资料)[。.]?$/.test(plain(html));
function sections(html){
  return String(html||'').split(/(?=<h2\b)/i).filter(Boolean).map(part=>{
    const heading=part.match(/^<h2\b[^>]*>[\s\S]*?<\/h2>/i);
    return {heading:heading?.[0]||'',title:heading?plain(heading[0]):'',body:heading?part.slice(heading[0].length):part};
  });
}
function cleanPlaceholders(html){
  return html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi,paragraph=>placeholder(paragraph)?'':paragraph);
}
function createEntryDetail(page,kind,labels={}){
  // Source documents stay untouched. Only empty scaffold blocks are omitted.
  let html=sections(page.content).map(section=>{
    const body=cleanPlaceholders(section.body);
    if(!plain(body)&&!/<(?:img|video|audio)\b/i.test(body))return '';
    return (section.title==='简介'?'':section.heading)+body;
  }).join('');
  if(kind==='country'){
    // Keep the editable chronology's evidence column, but attach its rendered
    // citations to the event itself so the reader sees only time and event.
    html=html.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi,table=>{
      const headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)];
      if(headers.length!==3 || plain(headers[2][1])!=='来源')return table;
      return table.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi,row=>{
        const cells=[...row.matchAll(/<(th|td)\b[^>]*>[\s\S]*?<\/\1>/gi)];
        if(cells.length!==3)return row;
        if(cells[0][1]==='th')return row.replace(cells[2][0],'');
        const source=cells[2][0].replace(/^<td\b[^>]*>|<\/td>$/gi,'');
        return row.replace(cells[2][0],'').replace(cells[1][0],cells[1][0].replace(/<\/td>$/i,`（${source}）</td>`));
      });
    });
  }
  if(kind==='event'&&page.event_summary){
    html=html.replace(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>/i,(all,content)=>plain(content)===String(page.event_summary).trim()?'':all);
  }
  const references=createCharacterReferences({content:html},labels.sources||'来源',labels.scope||'资料');
  references.body=references.body.replace(/(<(?:p|li|td)\b[^>]*>|[。；])((?:\s*<span hidden class="character-citation"[^>]*><\/span>)+)\s*[，,]/g,'$1$2');
  if(kind==='country')references.body=references.body.replace(/（((?:\s*<span hidden class="character-citation"[^>]*><\/span>)+)\s*[；;、，,]\s*/g,'$1（');
  const main=[],notes=[];
  for(const section of sections(references.body)){
    if(/^(?:来源|出处|参考|待核)/.test(section.title)){
      // Existing source descriptions and unresolved details stay available in
      // the collapsed sources panel, while identical locators share one row.
      let body=section.body.replace(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi,(all,tag,inside)=>plain(inside)?all:'');
      body=body.replace(/(<(?:p|li)\b[^>]*>)((?:\s*<span hidden class="character-citation"[^>]*><\/span>)+)\s*[：:，,]/g,'$1$2');
      if(plain(body))notes.push(body);
    }else main.push(section.heading+section.body);
  }
  if(kind==='event'){
    for(const ref of eventReferences(page))references.citeWhole(ref.source,ref.scopes.map(scope=>scope==='facts'?(labels.facts||'事件经过'):(labels.time||'时间依据')).join('、'));
  }
  return {body:main.join(''),notes:notes.join(''),references,fallback:kind==='event'?shortEventSource(page):''};
}
module.exports={createEntryDetail};
