'use strict';
const {stripHTML, unescapeHTML, escapeHTML} = require('hexo-util');
const {shortEventSource} = require('../../../tools/lib/event-references');
// Match complete locators. Narrative qualifications stay beside the fact;
// never infer missing book, chapter or author context.
const num='[零〇一二三四五六七八九十百千万\\d]+';
const chapterNumber=`第?${num}(?:章?\\s*[-—–至～~]\\s*第?${num})?`;
const chapter=`${chapterNumber}(?:章?\\s*[、，,]\\s*${chapterNumber})*章`;
const volume=`第${num}[部卷]`;
const volumeLocator=`${volume}\\s*${chapter}(?:\\s*[、，,]\\s*${chapter})*`;
// The published extra uses numbered instalments rather than volume/chapter labels.
const extraLocator=`番外\\s*《一个普通人的日常》\\s*${chapterNumber}(?:\\s*[、，,]\\s*${chapterNumber})*章?`;
const locator=`(?:${volumeLocator}|${extraLocator})`;
const citation=new RegExp(`《(?:诡秘之主|宿命之环)》\\s*${locator}(?:\\s*[；;、，,]\\s*${locator})*`,'g');
// An author source must supply all four parts. Unknown and partial formats
// remain authored text; URLs alone never establish source identity.
const authorName='爱[潜潛]水的乌贼';
const authorDate='\\d{4}年\\d{1,2}月\\d{1,2}日';
const authorArticle=`${authorName}[，,]\\s*${authorDate}\\s*《[^《》<>\\n]+》\\s*https?:\\/\\/(?:&(?:amp|quot|#\\d+|#x[\\da-fA-F]+);|[^\\s<>（）();；，,。])+`;
const authorCitation=new RegExp(authorArticle,'g');
const escapeText = value => escapeHTML(value).replace(/&#x2F;/gi,'/').replace(/&#x3D;/gi,'=');
function sourceHTML(source) {
  return String(source || '').split(/(https?:\/\/[^\s<>"'（）;；，,。]+)/g).map(part =>
    /^https?:\/\//.test(part) ? `<a href="${escapeText(part)}">${escapeText(part)}</a>` : escapeHTML(part)).join('');
}
function normalizeAuthorLinks(content) {
  // Only unwrap a complete author-article citation, never ordinary links or
  // attributes. A rendered Markdown title is the sole permitted markup.
  const linked=new RegExp(`${authorName}[，,]\\s*${authorDate}\\s*《<a\\s+[^>]*>(?:(?!<\\/a>)[^\\n])*<\\/a>》`,'g');
  return content.replace(linked,html=>{
    const link=html.match(/<a\s+[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/i);
    if(!link)return html;
    const clean=html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,'').replace(/<span\b[^>]*aria-hidden=["']true["'][^>]*>[\s\S]*?<\/span>/gi,'');
    const plain=unescapeHTML(stripHTML(clean))+' '+unescapeHTML(link[1]||link[2]);
    const match=plain.match(new RegExp(`^(?:${authorArticle})$`));
    return match?escapeText(plain):html;
  });
}
const sourceKey = source => {
  source=String(source || '');
  if(new RegExp(authorArticle).test(source))return source.trim().replace(/》\s*(https?:)/g,'》 $1');
  return source.replace(/\s+/g,'').replace(/部/g,'卷').replace(/[—–～~]/g,'至');
};
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
    // Split mixed records at explicit source separators only. A qualification
    // attached to an article stays in that same full record, so equal URLs with
    // different locators or notes cannot accidentally merge.
    if(new RegExp(authorArticle).test(source)) {
      const parts=source.split(/\s*[；;]\s*/).filter(part=>part.trim());
      if(parts.length>1)return parts.map(part=>cite(part,scope)).join('');
      return add(source,scope);
    }
    const matches=[...source.matchAll(citation)];
    const residue=source.replace(citation,'').replace(/[\s；;、，,。]/g,'');
    if(!matches.length || residue)return add(source,scope);
    return [...new Set(matches.map(m=>m[0]))].map(s=>add(s,scope)).join('');
  }
  function replaceText(value,scope){
    // Remove only citation-introducing words and brackets directly attached to a
    // complete locator. Qualifications and prose outside that locator stay visible.
    const complete=`(?:${citation.source}|${authorArticle})`;
    const combined=`${complete}(?:\\s*[；;、，,]\\s*${complete})*`;
    const wrapped=new RegExp(`(?:（(${combined})）|\\((${combined})\\)|(?:依据[：:]|参见|见)\\s*(${combined})[。]?)`,'g');
    // Keep authored scope/uncertainty in parentheses, but move its citation out
    // with the joining separator. Do not split off an inherited volume locator.
    const qualified=new RegExp(`([（(])(${combined})\\s*(?<!&(?:amp|quot|#\\d+|#x[\\da-fA-F]+))[；;，,]\\s*(?!${locator})(?=[^\\s；;，,、）)《])`,'g');
    value=value.replace(qualified,(_,open,source)=>cite(unescapeHTML(source),scope)+open);
    value=value.replace(/分别见(《(?:诡秘之主|宿命之环)》[零〇一二三四五六七八九十百千万\d第部卷章节及后续、，,\s—–至~-]+)。/g,(_,source)=>add(unescapeHTML(source),scope));
    value=value.replace(wrapped,(_,a,b,c)=>cite(unescapeHTML(a||b||c),scope));
    // Wrapped citations have already inserted markers. Do not re-read their
    // attributes as new citations when the compact label keeps a full locator.
    return value.split(/(<[^>]*>)/g).map(token=>token.startsWith('<')?token:
      token.replace(authorCitation,source=>add(unescapeHTML(source),scope)).replace(citation,(source,offset,input)=>add(unescapeHTML(source),scope)+(/^(?:介绍|记述|描写|记载|叙述|回顾|提到|提及|说明|显示|确认)/.test(input.slice(offset+source.length)) ? '原文' : ''))).join('');
  }
  let section=initialScope,heading=0,headingText='',anchorDepth=0;
  const sectionPath=[];
  const body=normalizeAuthorLinks(String(page.content||'')).split(/(<[^>]*>)/g).map(token=>{
    if(token.startsWith('<')){
      const start=token.match(/^<h([2-6])\b/i);
      if(start){heading=Number(start[1]);headingText='';}
      if(heading && new RegExp('^</h'+heading+'\\b','i').test(token)){
        const title=unescapeHTML(stripHTML(headingText)).trim();
        sectionPath.length=heading;
        sectionPath[heading]=title;
        section=sectionPath.filter(Boolean).join('：')||section;
        heading=0;
      }
      if(/^<a\b/i.test(token))anchorDepth++;
      if(/^<\/a\b/i.test(token))anchorDepth=Math.max(0,anchorDepth-1);
      return token;
    }
    if(heading){headingText+=token;return token;}
    if(anchorDepth)return token;
    return replaceText(token,section);
  }).join('');
  const text=(value,scope)=>replaceText(escapeText(String(value||'')),scope);
  return {body,refs,cite,text,citeWhole:add,sourceHTML};
}
module.exports={sourceKey,createCharacterReferences};
