'use strict';
const {stripHTML, unescapeHTML} = require('hexo-util');
const {shortCharacterSource} = require('./character-references');

// Insert shared advancement after introductory attributes, before honorifics or life events.
function splitCharacterBody(html) {
  const lead = String(html || '').match(/^\s*<p(?:\s[^>]*)?>[\s\S]*?<\/p>/i)?.[0] || '';
  const body = String(html || '').slice(lead.length);
  const headings = [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
  const attribute = [
    '(?:公开|主要)?身份','原身','姓名','原名','本名','化名','称号','称呼','称谓','别名',
    '外貌','外貌伪装','形貌','外形','形态','形象','肖像','躯体','性格','性别','种族','年龄','寿命','生日','生日纪念','国籍',
    '所属组织','组织归属','所属作品','信仰','侍奉者','宗教地位','途径','途径候选','序列',
    '非凡能力','恩赐能力','个人能力','能力','能力来源','能力线索','力量','同期力量','代行者力量','权柄','象征','认知',
    '限制','使用条件','装备','圣物','神降物品','血统','血脉','起源','状态',
    '家人','家庭','亲属','家族关系','习惯','举止','装束','住处','生活','职业','写作','海上名声','悬赏','通缉资料','船队',
    '灵界来历','飞船','梦境都市的对应形象','降灵称谓'
  ].join('|');
  const attributes = new RegExp(`^(?:${attribute})(?:(?:与|及|和|、|／|/)(?:${attribute}))*$`, 'u');
  const heading = headings.find(match => {
    const title = unescapeHTML(stripHTML(match[1])).trim();
    // Event headings need not use the literal word “生平”. Only an opening
    // attribute section belongs before advancement; unknown topics stay with
    // the narrative rather than moving an entire life history above the table.
    return !attributes.test(title) && !/^契约伙伴[^：]+$/u.test(title);
  });
  const boundary = heading ? heading.index : headings.length ? body.length : 0;
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
  const records = new Map(model.relations.map(relation => [relation.id, relation]));
  const projection=model.relationChronology;
  if (!projection) throw new Error('缺少共享关系时间投影');
  return (projection.people[currentId] || []).flatMap(group => {
    const rows=group.relation_ids.map(id => {
      const relation=records.get(id), view=projection.byRelation[id];
      const person=profiles.get(relation.a===currentId ? relation.b : relation.a);
      if (!person) throw new Error(`人物关系缺少正式档案：${relation.id}`);
      const representative=view.representative;
      return {person,relationId:id,label:relationLabel(relation,currentId),
        description:representative?.note || view.summary, source:representative?.source || view.sourceHint,
        sourceHint:view.sourceHint,time:representative?.time || {label:'时期未定',status:'unknown'},
        stages:view.groups, groupLabel:group.label, groupStatus:group.status};
    });
    // Keep the shared partial-order projection. Preferred IDs must not reverse
    // a proven constraint inside an otherwise incomparable component.
    return rows.map((row,index)=>({...row,groupStart:index===0}));
  });
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
      sourceLabel: shortCharacterSource(stage.source)};
  });
}

module.exports = {splitCharacterBody, characterRelationRows, progressionRows};
