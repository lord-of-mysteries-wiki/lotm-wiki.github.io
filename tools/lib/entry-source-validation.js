'use strict';
const assert=require('node:assert/strict');
const {parseDocument,DomUtils:{findAll,textContent}}=require('htmlparser2');
const {eventReferences,authorArticle}=require('./event-references');
const {createCharacterReferences,sourceKey}=require('../../themes/lotm/lib/character-references');

const scopeLabels={facts:'事件概括与经过',time:'时间依据'};
const hasClass=(node,name)=>(node.attribs?.class||'').split(/\s+/).includes(name);

function expectedEventBibliography(event) {
  const view=createCharacterReferences({content:''});
  for(const ref of eventReferences(event)) {
    view.citeBibliography(ref.source,ref.scopes.map(scope=>scopeLabels[scope]).join('、'));
  }
  return view.refs.map(ref=>({source:ref.source,scopes:[...ref.scopes]}));
}

function sourceText(node) {
  if(node.type==='text')return node.data;
  if(node.name==='a') {
    const label=textContent(node),href=node.attribs?.href;
    // A bare URL's visible text and href are checked independently below.
    return !href||/^https?:\/\//.test(label)?label:`[${label}](${href})`;
  }
  return (node.children||[]).map(sourceText).join('');
}

function validateEventDetailSources(html,event) {
  const id=event.entry_id||event.title||'event';
  const expected=expectedEventBibliography(event);
  const root=parseDocument(html);
  const sections=findAll(node=>node.name==='section'&&hasClass(node,'event-sources')&&hasClass(node,'entry-sources'),root.children);
  if(!expected.length)return;
  assert.equal(sections.length,1,id+' 来源须由唯一的详情页末共享区直接显示');
  const rows=findAll(node=>node.name==='li'&&/^character-source-\d+$/.test(node.attribs?.id||''),sections[0].children).map(node=>{
    const scopeNode=(node.children||[]).find(child=>hasClass(child,'character-source-scopes'));
    return {
      source:(node.children||[]).filter(child=>child!==scopeNode).map(sourceText).join(''),
      scopes:textContent(scopeNode||{children:[]}).split(/[；;、]/).map(value=>value.trim()).filter(Boolean),
      links:findAll(child=>child.name==='a',node.children).map(link=>link.attribs?.href)
    };
  });
  for(const ref of expected) {
    const matches=rows.filter(row=>sourceKey(row.source)===sourceKey(ref.source));
    assert.equal(matches.length,1,id+' 完整来源须恰有一行（缺失、改变或重复）: '+ref.source);
    const row=matches[0];
    if(new RegExp('^'+authorArticle).test(ref.source)) {
      const copies=rows.filter(actual=>{
        const parts=createCharacterReferences({content:''});
        parts.citeBibliography(actual.source,'validation');
        return parts.refs.some(part=>sourceKey(part.source)===sourceKey(ref.source));
      });
      assert.equal(copies.length,1,id+' 完整作者书目不得在复合来源中重复: '+ref.source);
    }
    for(const scope of ref.scopes.flatMap(value=>value.split(/[；;、]/))) {
      assert.ok(row.scopes.includes(scope),id+' 来源丢失适用范围 '+scope+': '+ref.source);
    }
    for(const url of ref.source.match(/https?:\/\/[^\s<>"'（）();；，,。]+/g)||[]) {
      assert.ok(row.links.includes(url),id+' 来源原始URL链接缺失或改变: '+url);
    }
  }
}

module.exports={expectedEventBibliography,validateEventDetailSources};
