'use strict';
const {parseDocument,DomUtils:{textContent}}=require('htmlparser2');
const {createCharacterReferences}=require('./character-references');

// Derive a complete authored block and only its own citations. Never truncate
// uncertainty or period qualifications to meet a preview character limit.
function characterExcerpt(page) {
  const view=createCharacterReferences(page);
  const root=parseDocument(view.body);
  const blocks=[];
  let stopped=false;
  function visit(nodes) {
    for (const node of nodes || []) {
      if (stopped) return;
      if (/^h[12]$/.test(node.name || '') && /^(来源|待核|参考)/.test(textContent(node).trim())) {
        stopped=true;
        return;
      }
      if (['p','li'].includes(node.name)) {
        const text=textContent(node).replace(/\s+/g,' ').trim();
        if (text && !/^(返回|待核实[。.]?$|待补充[。.]?$)/.test(text)) blocks.push({node,text});
        // A list item may contain a paragraph; collect the block just once.
      } else visit(node.children);
    }
  }
  visit(root.children);
  const selected=blocks.find(block=>block.node.name==='p') || blocks[0];
  if (!selected) return {text:'',sources:[]};
  const ids=new Set();
  function collect(node) {
    if (node.attribs?.['data-source-target']) ids.add(node.attribs['data-source-target']);
    for (const child of node.children || []) collect(child);
  }
  collect(selected.node);
  return {
    text:selected.text,
    sources:view.refs.filter((ref,i)=>ids.has('character-source-'+(i+1))).map(ref=>ref.source)
  };
}
module.exports={characterExcerpt};
