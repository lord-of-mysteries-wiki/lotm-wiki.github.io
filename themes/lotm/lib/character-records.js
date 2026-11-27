'use strict';
const {stripHTML, unescapeHTML} = require('hexo-util');
const {shortEventSource} = require('../../../tools/lib/event-references');

// Insert shared advancement after introductory attributes, before honorifics or life events.
function splitCharacterBody(html) {
  const lead = String(html || '').match(/^\s*<p(?:\s[^>]*)?>[\s\S]*?<\/p>/i)?.[0] || '';
  const body = String(html || '').slice(lead.length);
  const heading = [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].find(match => {
    const title = unescapeHTML(stripHTML(match[1])).trim();
    return /尊名|^(?:生平|主要经历|人物经历)/u.test(title);
  });
  const boundary = heading ? heading.index : body.length;
  return {lead, prelude: body.slice(0, boundary), narrative: body.slice(boundary)};
}

function relationLabel(relation, currentId) {
  const categories=relation.categories || [];
  const direction = relation.direction?.上下级;
  if (categories.includes('上下级') && ['a-to-b', 'b-to-a'].includes(direction)) {
    const subordinate = direction === 'a-to-b' ? relation.a : relation.b;
    return subordinate === currentId ? '上级' : '下属';
  }
  // Without structured role direction, keep existing neutral labels rather than guessing.
  const kinship = (relation.tags || []).find(tag => ['师生','兄弟','姐妹','兄妹','姐弟','父子','父女','母子','母女','夫妻'].includes(tag));
  return kinship || categories.join('、');
}

function characterRelationRows(model, currentId, preferredIds = []) {
  const profiles = new Map(model.profiles.map(person => [person.entry_id, person]));
  const preferred = new Map(preferredIds.map((id, index) => [id, index]));
  return model.relations.filter(r => r.a === currentId || r.b === currentId).map(relation => {
    const person = profiles.get(relation.a === currentId ? relation.b : relation.a);
    if (!person) throw new Error(`人物关系缺少正式档案：${relation.id}`);
    const milestone = relation.milestones?.find(stage => stage.note && stage.source);
    return {person, label: relationLabel(relation, currentId),
      description: milestone?.note || relation.summary || relation.detail || relation.scope || '',
      source: milestone?.source || relation.sourceHint};
  }).sort((a, b) => (preferred.get(a.person.entry_id) ?? Infinity) - (preferred.get(b.person.entry_id) ?? Infinity) ||
    a.person.title.localeCompare(b.person.title, 'zh-CN'));
}

function progressionRows(stages = []) {
  return stages.map(stage => {
    const parts = /^((?:相当于)?序列\d+|旧日)“([^”]+)”(.*)$/.exec(stage.sequence);
    const king = /^天使之王（(.+)）$/.exec(stage.sequence);
    const plainSequence = /^((?:相当于)?序列\d+)(.*)$/.exec(stage.sequence);
    return {...stage, rank: parts ? parts[1] : king ? '天使之王' : plainSequence ? plainSequence[1] : stage.scopeLabel || '',
      name: parts ? parts[2] + parts[3] : king ? king[1] : plainSequence ? plainSequence[2] : stage.sequence,
      inferred: stage.certainty === 'inferred' || stage.sequenceCertainty === 'inferred',
      pathwayInferred: Boolean(stage.pathway) && stage.certainty === 'inferred',
      sequenceInferred: stage.sequenceCertainty === 'inferred' || (stage.certainty === 'inferred' && stage.sequenceCertainty !== 'confirmed' && !/具体.*(?:待核实|未明)|序列未明/.test(stage.sequence)),
      sourceLabel: shortEventSource({event_source: stage.source}).replace(
        /爱潜水的乌贼[，,]?\s*(\d{4}年\d{1,2}月\d{1,2}日)《[^》]+》(?:\s*https?:\/\/\S+)?/g, '作者补充（$1）')};
  });
}

module.exports = {splitCharacterBody, characterRelationRows, progressionRows};
