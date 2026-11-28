'use strict';
const assert = require('node:assert/strict');
const {parseDocument} = require('htmlparser2');

function validateCharacterRelations(html, {profileId, graphLink, recordTables}) {
  const root = parseDocument(html);
  const nodes = [];
  function walk(node) {
    nodes.push(node);
    for (const child of node.children || []) walk(child);
  }
  walk(root);
  const attr = (node, name) => node.attribs?.[name];
  const sections = nodes.filter(node => node.name === 'details' &&
    (attr(node, 'class') || '').split(/\s+/).includes('character-relations'));
  const hasLink = node => node.name === 'a' && attr(node, 'href') === graphLink;
  if (recordTables) {
    assert.equal(sections.length, 1, profileId + ' 人物关系区须唯一');
    assert.ok(!Object.hasOwn(sections[0].attribs, 'open'), profileId + ' 人物关系区应默认收起');
    const containsLink = node => hasLink(node) || (node.children || []).some(containsLink);
    assert.ok(containsLink(sections[0]), profileId + ' 人物关系区缺少关系网入口');
  } else {
    assert.equal(sections.length, 0, profileId + ' 旧版人物档案只显示关系网入口');
  }
  assert.ok(nodes.some(hasLink), profileId + ' 缺少关系网入口');
}

module.exports = {validateCharacterRelations};
