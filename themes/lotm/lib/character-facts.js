'use strict';
const {parseDocument,DomUtils:{textContent,getOuterHTML}}=require('htmlparser2');
const {createCharacterReferences}=require('./character-references');
const plain=node=>textContent(node).replace(/\s+/g,' ').trim();

// Project existing authored blocks, never a hand-written second summary. A
// complete block is required so later uncertainty cannot be cut off for length.
function characterFactText(page, fact, limit=140) {
  if (!fact.source_section) return '';
  const root=parseDocument(String(page.content || ''));
  const blocks=[];
  let active=false;
  function visit(nodes) {
    for (const node of nodes || []) {
      if (node.name==='h2') {
        active=node.attribs?.id===fact.source_section || plain(node)===fact.source_section;
      } else if (active && ['p','li'].includes(node.name)) {
        if (plain(node)) blocks.push(node);
      } else if (!['p','li'].includes(node.name)) visit(node.children);
    }
  }
  visit(root.children);
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
module.exports={characterFactText};
