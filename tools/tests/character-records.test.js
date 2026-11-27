'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {splitCharacterBody, characterRelationRows, progressionRows} = require('../../themes/lotm/lib/character-records');
const {validateCharacterSource} = require('../lib/content-model');
const fs = require('node:fs');
const ejs = require('ejs');

test('shared record migration accepts booleans and rejects a quoted false switch', () => {
  for (const value of [true, false]) assert.doesNotThrow(() => validateCharacterSource({character_record_tables:value}));
  assert.doesNotThrow(() => validateCharacterSource({}));
  for (const value of ['false', 'true', 1, null]) {
    assert.throws(() => validateCharacterSource({character_record_tables:value}), /必须为布尔值/);
  }
});

test('keep identity before shared advancement, and honorifics before life history', () => {
  const html = '<p>导语。</p><h2 id="身份">身份与称号</h2><p>化名。</p><h2 id="尊名">格尔曼的五段尊名</h2><p>尊名。</p><h2>生平经历</h2><p>经历。</p>';
  const parts = splitCharacterBody(html);
  assert.equal(parts.lead, '<p>导语。</p>');
  assert.ok(parts.prelude.includes('化名。'));
  assert.ok(parts.narrative.startsWith('<h2 id="尊名">'));
  assert.equal(parts.lead + parts.prelude + parts.narrative, html);
  assert.equal(splitCharacterBody('<p>导语。</p><h2>生平经历</h2><p>经历。</p>').prelude, '');
});

test('short pages keep their attributes, without requiring an empty life section', () => {
  const parts = splitCharacterBody('<p>导语。</p><h2>身份与称号</h2><p>唯一身份。</p>');
  assert.ok(parts.prelude.includes('唯一身份。'));
  assert.equal(parts.narrative, '');
});

test('relations reuse both endpoints and preserve directional roles', () => {
  const profiles = [{entry_id:'pupil',title:'学生',path:'pupil/'},{entry_id:'teacher',title:'老师',path:'teacher/'}];
  const relation = {id:'r',a:'pupil',b:'teacher',categories:['上下级'],direction:{上下级:'a-to-b'},
    summary:'概括。',sourceHint:'总体来源',milestones:[{note:'老师邀请学生入队；当时尚未正式入职。',source:'阶段来源'}]};
  const model = {profiles,relations:[relation]};
  assert.equal(characterRelationRows(model,'pupil')[0].label,'上级');
  assert.equal(characterRelationRows(model,'teacher')[0].label,'下属');
  assert.equal(characterRelationRows(model,'pupil')[0].source,'阶段来源');
  assert.ok(characterRelationRows(model,'pupil')[0].description.includes('尚未正式入职'));
  relation.categories=['友谊'];relation.tags=['师生'];relation.direction={};
  assert.equal(characterRelationRows(model,'pupil')[0].label,'师生');
  assert.equal(characterRelationRows(model,'teacher')[0].label,'师生');
});

test('preferred relations affect order, not coverage; pages without preferences still show relationships', () => {
  const model={profiles:['a','b','c'].map(entry_id=>({entry_id,title:entry_id})),relations:[
    {id:'r1',a:'a',b:'b',categories:['同事'],summary:'曾共同办案。',sourceHint:'来源一'},
    {id:'r2',a:'c',b:'a',categories:['亲情'],summary:'共同生活。',sourceHint:'来源二'}]};
  assert.equal(characterRelationRows(model,'a').length,2);
  assert.deepEqual(characterRelationRows(model,'a',['c']).map(row=>row.person.entry_id),['c','b']);
  assert.equal(characterRelationRows(model,'b')[0].person.entry_id,'a');
});

test('existing uncategorized relations retain their account without inventing a category', () => {
  const model={profiles:[{entry_id:'a',title:'甲'},{entry_id:'b',title:'乙'}],relations:[
    {id:'legacy',a:'a',b:'b',tags:['共用身体'],summary:'存在联系，具体性质尚有不同解释。',sourceHint:'原有来源'}]};
  const row=characterRelationRows(model,'a')[0];
  assert.equal(row.label,'');
  assert.equal(row.description,'存在联系，具体性质尚有不同解释。');
  assert.equal(row.source,'原有来源');
});

test('an inferred pathway does not turn a separately confirmed angel rank into a guess', () => {
  const [stage]=progressionRows([{pathway:'通识者',sequence:'序列2天使',certainty:'inferred',sequenceCertainty:'confirmed',source:'原有来源'}]);
  assert.equal(stage.rank,'序列2');assert.equal(stage.name,'天使');
  assert.equal(stage.pathwayInferred,true);assert.equal(stage.sequenceInferred,false);
  const [unknown]=progressionRows([{pathway:'不眠者',sequence:'高级执事时期，具体序列未明',certainty:'inferred',source:'原有来源'}]);
  assert.equal(unknown.pathwayInferred,true);assert.equal(unknown.sequenceInferred,false);
});

test('shared uncertainty for a pathway and named sequence is shown once', () => {
  const template = fs.readFileSync(require.resolve('../../themes/lotm/layout/_partials/character-progression.ejs'), 'utf8');
  const html=ejs.render(template,{page:{graph_profile:{progression:[{pathway:'囚犯',sequence:'序列5“怨魂”',certainty:'inferred',sequenceCertainty:'inferred',source:'来源'}]}},character_progression_rows:progressionRows,__:key=>key==='character_inferred_suffix'?'（推定）':key,references:{cite:()=>''}});
  assert.equal((html.match(/（推定）/g)||[]).length,1);
  assert.ok(html.includes('囚犯 · 怨魂（推定）'));
});

test('advancement retains uncertain rank, boon wording, contemporaneous stages and full source', () => {
  const source='爱潜水的乌贼，2025年8月4日《补充》 https://example.com/source';
  const rows=progressionRows([{pathway:'歌颂者',sequence:'序列6“公证人”',sequenceCertainty:'inferred',source:'《诡秘之主》第三卷第210章'},
    {pathway:'舞蹈家',sequence:'相当于序列9“舞蹈家”的恩赐',samePeriodAsPrevious:true,source},
    {sequence:'旧日“诡秘之主”',scopeLabel:'序列之上',source:'《宿命之环》第八卷第39章'}]);
  assert.equal(rows[0].rank,'序列6');assert.equal(rows[0].name,'公证人');assert.equal(rows[0].inferred,true);
  assert.ok(rows[1].name.includes('恩赐'));assert.equal(rows[1].samePeriodAsPrevious,true);
  assert.equal(rows[1].source,source);assert.equal(rows[1].sourceLabel,'作者补充（2025年8月4日）');
  assert.equal(rows[1].rank,'相当于序列9');
  assert.equal(rows[2].rank,'旧日');
  const [king, noble] = progressionRows([{sequence:'天使之王（双序列1“美神”）',source:''},
    {sequence:'序列6“魔药教授”（血族男爵）',source:''}]);
  assert.equal(king.rank,'天使之王');assert.equal(king.name,'双序列1“美神”');
  assert.equal(noble.rank,'序列6');assert.equal(noble.name,'魔药教授（血族男爵）');
});

test('dream context is separate from personal advancement and authority-only pages have no empty table', () => {
  const template = fs.readFileSync(require.resolve('../../themes/lotm/layout/_partials/character-progression.ejs'), 'utf8');
  const render = progression => ejs.render(template, {
    page:{graph_profile:{progression}}, character_progression_rows:progressionRows,
    __:key=>key, references:{cite:()=>''}
  });
  const html = render([{sequence:'序列5“收割者”',source:'章节'},
    {sequence:'梦境中的“画家”状态',relation:'context',source:'梦境章节'}]);
  assert.ok(html.indexOf('梦境中的') > html.indexOf('</table>'));
  assert.ok(html.indexOf('收割者') < html.indexOf('</table>'));
  assert.ok(!render([{sequence:'回收“门”唯一性',relation:'authority',source:'章节'}]).includes('<table>'));
});
