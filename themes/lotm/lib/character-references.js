'use strict';
const {stripHTML, unescapeHTML, escapeHTML} = require('hexo-util');
const {parseDocument, DomUtils: {getOuterHTML}} = require('htmlparser2');
const {shortEventSource,authorName,authorDate,authorArticle} = require('../../../tools/lib/event-references');
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
const authorCitation=new RegExp(authorArticle,'g');
const escapeText = value => escapeHTML(value).replace(/&#x2F;/gi,'/').replace(/&#x3D;/gi,'=');
function sourceHTML(source) {
  const link=/^\[([^\[\]\n]+)\]\(([^\s<>"'()]+)\)$/;
  return String(source || '').split(/(\[[^\[\]\n]+\]\([^\s<>"'()]+\))/g).map(part=>{
    const match=part.match(link);
    if(match&&(/^(?:https?:)?\/\//.test(match[2])||!/^\w[\w+.-]*:/.test(match[2])))return `<a href="${escapeText(match[2])}">${escapeText(match[1])}</a>`;
    return part.split(/(https?:\/\/[^\s<>"'（）();；，,。]+)/g).map(piece=>
      /^https?:\/\//.test(piece)?`<a href="${escapeText(piece)}">${escapeText(piece)}</a>`:escapeHTML(piece)).join('');
  }).join('');
}
function normalizeAuthorLinks(content) {
  // Only unwrap a complete author-article citation, never ordinary links or
  // attributes. A rendered Markdown title is the sole permitted markup.
  const linked=new RegExp(`${authorName}[，,]\\s*${authorDate}\\s*《<a\\s+[^>]*>(?:(?!<\\/a>)[^\\n])*<\\/a>》`,'g');
  return content.replace(linked,(html,offset,input)=>{
    const link=html.match(/<a\s+[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/i);
    if(!link)return html;
    const clean=html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,'').replace(/<span\b[^>]*aria-hidden=["']true["'][^>]*>[\s\S]*?<\/span>/gi,'');
    const plain=unescapeHTML(stripHTML(clean))+' '+unescapeHTML(link[1]||link[2]);
    const match=plain.match(new RegExp(`^(?:${authorArticle})$`));
    // A locator immediately after the linked title must not become part of
    // the unwrapped URL (e.g. “》第四纪四皇之战段”).
    const next=input[offset+html.length];
    return match?escapeText(plain)+(next&&!/[\s<（）();；，,。]/.test(next)?' ':''):html;
  });
}
const sourceKey = source => {
  source=String(source || '');
  if(new RegExp(authorArticle).test(source))return source.trim().replace(/》\s*[：:]?\s*(https?:)/g,'》 $1');
  return source.replace(/\s+/g,'').replace(/部/g,'卷').replace(/[—–～~]/g,'至');
};

function characterSourceSections(html) {
  const entries=[];
  const headings=[...html.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi)];
  let body='',cursor=0;
  function readable(node,links=true) {
    if(node.type==='text')return node.data;
    if(node.name==='svg'||node.attribs?.['aria-hidden']==='true')return '';
    const text=(node.children||[]).map(child=>readable(child,links)).join('');
    const href=node.name==='a'&&node.attribs?.href;
    return links&&href&&!text.includes(href)?`[${text}](${href})`:text;
  }
  for(let i=0;i<headings.length;i++) {
    const heading=headings[i],title=unescapeHTML(stripHTML(heading[0])).trim();
    if(!/^(?:来源(?:补充|说明)?|出处|参考(?:资料|文献)?)$/.test(title))continue;
    const end=headings[i+1]?.index??html.length;
    body+=html.slice(cursor,heading.index);
    const sourceBody=html.slice(heading.index+heading[0].length,end);
    const originalHTML=node=>Number.isInteger(node.startIndex)&&Number.isInteger(node.endIndex)?sourceBody.slice(node.startIndex,node.endIndex+1):getOuterHTML(node);
    let scope=title,subheading='';
    const remainder=[];
    function keep(node) {
      if(subheading){remainder.push(subheading);subheading='';}
      remainder.push(originalHTML(node));
    }
    function unsupported(node) {
      if(node.name==='table')return true;
      const href=node.name==='a'&&node.attribs?.href;
      if(href&&(!/^[^\s<>"'()]+$/.test(href)||(/^\w[\w+.-]*:/.test(href)&&!/^https?:\/\//.test(href))))return true;
      return (node.children||[]).some(unsupported);
    }
    function collect(nodes,inheritedScope='') {
      for(const node of nodes) {
        if(/^h[3-6]$/.test(node.name||'')){scope=readable(node).trim();subheading=originalHTML(node);continue;}
        if(['ul','ol'].includes(node.name)){
          if(unsupported(node))keep(node);else collect(node.children||[],inheritedScope);
          continue;
        }
        if(['p','li'].includes(node.name)) {
          if(unsupported(node)){keep(node);continue;}
          const lists=(node.children||[]).filter(child=>['ul','ol'].includes(child.name));
          const text=(node.children||[]).filter(child=>!lists.includes(child)).map(child=>readable(child)).join('').replace(/\s+/g,' ').trim();
          if(!text){for(const list of lists)collect(list.children||[],inheritedScope);continue;}
          let children=(node.children||[]).filter(n=>n.type!=='text'||n.data.trim());
          if(children[0]?.name==='p')children=children[0].children||[];
          const first=children.find(n=>n.type!=='text'||n.data.trim());
          const label=['strong','b'].includes(first?.name)?readable(first,false).trim():'';
          const renderedLabel=label?readable(first).trim():'';
          const rest=renderedLabel&&text.startsWith(renderedLabel)?text.slice(renderedLabel.length):'';
          // Without an authored support label (or a labelled parent), do not
          // invent a whole-page scope for prose notes or unknown bibliography.
          if(!/^\s*[：:]/.test(rest)&&!inheritedScope&&scope===title){keep(node);continue;}
          const entryScope=label&&/^\s*[：:]/.test(rest)?[inheritedScope,label].filter(Boolean).join('：'):inheritedScope||scope;
          let source=label&&/^\s*[：:]/.test(rest)?rest.replace(/^\s*[：:]\s*/,''):text;
          if(new RegExp(`^(?:${authorArticle})。$`).test(source))source=source.slice(0,-1);
          if(source)entries.push({source,scope:entryScope});
          else if(!lists.length)keep(node);
          for(const list of lists)collect(list.children||[],entryScope);
        } else if(node.type==='text') {
          if(node.data.trim())keep(node);
        } else if(node.type!=='comment')keep(node);
      }
    }
    collect(parseDocument(sourceBody,{withStartIndices:true,withEndIndices:true}).children);
    // An unhandled table, image or other format stays authored HTML. Only
    // collected bibliography blocks move into the existing shared source list.
    if(remainder.length)body+=heading[0]+remainder.join('');
    cursor=end;
  }
  return {body:body+html.slice(cursor),entries};
}
// Compact only complete author/date/title/URL records. Restrictions outside the
// matched citation stay visible, and the full source remains in the footer.
function shortCharacterSource(source) {
  return shortEventSource({event_source:String(source || '')});
}
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
    return `<span hidden class="character-citation" id="${id}" data-character-source="${escapeHTML(shortCharacterSource(source))}" data-source-target="character-source-${n}"></span>`;
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
  function citeBibliography(source,scope) {
    source=String(source||'');
    const tokens=source.split(/([；;])/),parts=[];
    for(let i=0;i<tokens.length;i+=2)parts.push({text:tokens[i],separator:tokens[i+1]||''});
    const article=new RegExp(`^\\s*(?:${authorArticle})`);
    const isArticle=part=>{
      const match=part.text.match(article);
      // A mixed or unknown remainder is not a separate author record.
      const tail=match?part.text.slice(match[0].length):'';
      return Boolean(match)&&!new RegExp(citation.source).test(tail)&&!new RegExp(authorArticle).test(tail);
    };
    // Do not split novel citations at semicolons: later volumes can inherit
    // their book from an earlier segment, even across a separate author record.
    const authored=parts.map(isArticle);
    if(!authored.some(Boolean))return add(source,scope);
    const rest=parts.filter((part,i)=>!authored[i]&&part.text.trim());
    const remainder=rest.map((part,i)=>part.text+(i<rest.length-1?part.separator||'；':'')).join('');
    let remainingAdded=false;
    return parts.map((part,i)=>{
      if(authored[i])return add(part.text,scope);
      if(!remainingAdded&&remainder.trim()){remainingAdded=true;return add(remainder,scope);}
      return '';
    }).join('');
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
  const normalized=normalizeAuthorLinks(String(page.content||''));
  const authored=page.character_profile?characterSourceSections(normalized):{body:normalized,entries:[]};
  const body=authored.body.split(/(<[^>]*>)/g).map(token=>{
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
  for(const entry of authored.entries) {
    if(new RegExp(authorArticle).test(entry.source))citeBibliography(entry.source,entry.scope);
    else cite(entry.source,entry.scope);
  }
  const text=(value,scope)=>replaceText(escapeText(String(value||'')),scope);
  return {body,refs,cite,text,citeWhole:add,citeBibliography,sourceHTML};
}
module.exports={sourceKey,createCharacterReferences,shortCharacterSource};
