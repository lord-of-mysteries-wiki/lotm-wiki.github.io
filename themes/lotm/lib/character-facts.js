'use strict';
const {parseDocument,DomUtils:{textContent,getOuterHTML}}=require('htmlparser2');
const {createCharacterReferences}=require('./character-references');
const plain=node=>textContent(node).replace(/\s+/g,' ').trim();

function sectionBlocks(html, section) {
  const blocks=[];
  let active=false, level=0, hasContent=false;
  function visit(nodes) {
    for (const node of nodes || []) {
      if (/^h[2-6]$/.test(node.name || '')) {
        const current=Number(node.name[1]);
        if (node.attribs?.id===section || plain(node)===section) {
          active=true;level=current;
        } else if (active && current<=level) active=false;
      } else if (active && ['p','li'].includes(node.name)) {
        if (plain(node)) { blocks.push(node);hasContent=true; }
      } else if (active && node.type==='text' && node.data.trim()) {
        hasContent=true;
      } else if (!['p','li'].includes(node.name)) visit(node.children);
    }
  }
  visit(parseDocument(String(html || '')).children);
  return {blocks,hasContent};
}

function characterHasSection(html, section) {
  return sectionBlocks(html, section).hasContent;
}

// Project existing authored blocks, never a hand-written second summary. A
// complete block is required so later uncertainty cannot be cut off for length.
function characterFactText(page, fact, limit=140) {
  if (!fact.source_section) return '';
  const {blocks}=sectionBlocks(page.content, fact.source_section);
  const escaped=String(fact.label).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const prefix=new RegExp('^'+escaped+'[：:]\\s*');
  const labelled=blocks.find(node=>prefix.test(plain(node)));
  const candidate=labelled || (/结局|状态/.test(fact.label) ? blocks.at(-1) : blocks[0]);
  if (!candidate) return '';
  const raw=plain(candidate).replace(prefix,'');
  const visible=textContent(parseDocument(createCharacterReferences({content:getOuterHTML(candidate)}).body)).replace(prefix,'').trim();
  // Unknown citations stay visible and count towards the limit as well.
  if (!visible || /^待(?:核实|补充)[。.]?$/.test(visible) || [...visible].length>limit) return '';
  return raw;
}
module.exports={characterFactText,characterHasSection};
