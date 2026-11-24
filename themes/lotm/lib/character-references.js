'use strict';
const {stripHTML, unescapeHTML, escapeHTML} = require('hexo-util');
const {shortEventSource} = require('../../../tools/lib/event-references');
// Match chapter locators only. Narrative qualifications following the locator
// remain beside the fact; never infer missing book or chapter context.
const num='[零〇一二三四五六七八九十百千万\\d]+';
const chapterNumber=`第?${num}(?:章?\\s*[-—–至～~]\\s*第?${num})?`;
const chapter=`${chapterNumber}(?:章?\\s*[、，,]\\s*${chapterNumber})*章`;
const volume=`第${num}[部卷]`;
const locator=`${volume}\\s*${chapter}(?:\\s*[、，,]\\s*${chapter})*`;
const citation=new RegExp(`《(?:诡秘之主|宿命之环)》\\s*${locator}(?:\\s*[；;、，,]\\s*${locator})*`,'g');
const sourceKey = source => String(source || '').replace(/\s+/g,'').replace(/部/g,'卷').replace(/[—–～~]/g,'至');
function createCharacterReferences(page, sourceLabel='来源', initialScope='人物资料') {
  const refs=[];
  function add(source,scope){
    source=String(source||'').trim();
    if(!source)return '';
    const key=sourceKey(source);
    let ref=refs.find(r=>r.key===key);
    if(!ref){ref={key,source,scopes:new Set(),backlinks:[]};refs.push(ref);}
    ref.scopes.add(scope);
    const n=refs.indexOf(ref)+1,id=`character-citation-${n}-${ref.backlinks.length+1}`;
    ref.backlinks.push(id);
    return `<span hidden class="character-citation" id="${id}" data-character-source="${escapeHTML(shortEventSource({event_source:source}))}" data-source-target="character-source-${n}"></span>`;
  }
  function cite(source,scope){
    // Structured records keep every unrecognised portion verbatim as its own
    // reference, including qualifications, rather than losing it in parsing.
    source=String(source||'');
    if(!source.trim())return '';
    const matches=[...source.matchAll(citation)];
    const residue=source.replace(citation,'').replace(/[\s；;、，,。]/g,'');
    if(!matches.length || residue)return add(source,scope);
    return [...new Set(matches.map(m=>m[0]))].map(s=>add(s,scope)).join('');
  }
  function replaceText(value,scope){
    // Remove only citation-introducing words and brackets directly attached to a
    // complete locator. Qualifications and prose outside that locator stay visible.
    const combined=`${citation.source}(?:\\s*[；;、，,]\\s*${citation.source})*`;
    const wrapped=new RegExp(`(?:（(${combined})）|\\((${combined})\\)|(?:依据[：:]|参见|见)\\s*(${combined})[。]?)`,'g');
    // Keep authored scope/uncertainty in parentheses, but move its citation out
    // with the joining separator. Do not split off an inherited volume locator.
    const qualified=new RegExp(`([（(])(${combined})\\s*[；;，,]\\s*(?!${locator})(?=[^\\s；;，,、）)《])`,'g');
    value=value.replace(qualified,(_,open,source)=>cite(unescapeHTML(source),scope)+open);
    value=value.replace(/分别见(《(?:诡秘之主|宿命之环)》[零〇一二三四五六七八九十百千万\d第部卷章节及后续、，,\s—–至~-]+)。/g,(_,source)=>add(unescapeHTML(source),scope));
    return value.replace(wrapped,(_,a,b,c)=>cite(unescapeHTML(a||b||c),scope))
      .replace(citation,(source,offset,input)=>add(unescapeHTML(source),scope)+(/^(?:介绍|记述|描写|记载|叙述|回顾|提到|提及|说明|显示|确认)/.test(input.slice(offset+source.length)) ? '原文' : ''));
  }
  let section=initialScope,heading=false,headingText='',anchorDepth=0;
  const body=String(page.content||'').split(/(<[^>]*>)/g).map(token=>{
    if(token.startsWith('<')){
      if(/^<h2\b/i.test(token)){heading=true;headingText='';}
      if(/^<\/h2/i.test(token)){heading=false;section=unescapeHTML(stripHTML(headingText)).trim()||section;}
      if(/^<a\b/i.test(token))anchorDepth++;
      if(/^<\/a\b/i.test(token))anchorDepth=Math.max(0,anchorDepth-1);
      return token;
    }
    if(heading){headingText+=token;return token;}
    if(anchorDepth)return token;
    return replaceText(token,section);
  }).join('');
  const text=(value,scope)=>replaceText(escapeHTML(String(value||'')),scope);
  return {body,refs,cite,text,citeWhole:add};
}
module.exports={sourceKey,createCharacterReferences};
