const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const model = require('../lib/content-model').loadModel();
const helpers = new Map();
const filters = new Map();
const hexo = {extend: {
  helper: {register: (name, fn) => helpers.set(name, fn)},
  filter: {register: (name, fn) => filters.set(name, fn)},
  generator: {register() {}}
}};
const script = path.resolve('themes/lotm/scripts/content-model.js');
new Function('hexo', 'require', fs.readFileSync(script, 'utf8'))(hexo, name => {
  if (name === '../../../tools/lib/content-model') return {loadModel: () => model};
  if (name === '../../../tools/lib/event-presentation') return {isBriefEvent: () => false};
  return require('node:module').createRequire(script)(name);
});
filters.get('before_generate')();
const profileScript = path.resolve('themes/lotm/scripts/character-profile.js');
new Function('hexo', 'require', fs.readFileSync(profileScript, 'utf8'))(hexo, require('node:module').createRequire(profileScript));
const organizationContext = {site: {pages: {toArray: () => [{title: '贝利亚家族', path: 'worldview/organizations/贝利亚家族/index.html'}]}}};
const template = fs.readFileSync('themes/lotm/layout/_partials/character-profile.ejs', 'utf8');
function render(name) {
  const profile = model.profiles.find(profile => path.basename(profile.source, '.md') === name);
  assert.ok(profile, name);
  return ejs.render(template, {
    page: {...profile, content: ''},
    character_pathways: helpers.get('character_pathways'),
    character_reference_view: () => ({body: '', text: value => value, cite: () => ''}),
    character_has_section: () => false,
    character_organization_pages: (...args) => helpers.get('character_organization_pages').call(organizationContext, ...args),
    url_for: value => '/lotm-wiki.github.io' + value,
    partial: () => '',
    __: key => ({character_pathway: '途径', character_inferred_suffix: '（推定）'})[key] || key
  });
}
test('infobox retains inferred pathway qualification from the shared directory', () => {
  assert.match(render('克雷斯泰·塞西玛'), /<dt>途径<\/dt><dd>不眠者途径（推定）<\/dd>/);
  assert.match(render('洛克哈德·西亚卡姆'), /<dt>途径<\/dt><dd>律师途径（推定）<\/dd>/);
});
test('confirmed pathway is not weakened by a later inferred promotion stage', () => {
  assert.match(render('艾德雯娜·爱德华兹'), /<dt>途径<\/dt><dd>阅读者途径<\/dd>/);
});

test('organization link retains inference while a confirmed affiliation does not gain it', () => {
  assert.match(render('“欲望使徒”'), />贝利亚家族<\/a>（推定）/);
  assert.doesNotMatch(render('艾德雯娜·爱德华兹'), /知识教会（推定）/);
});
test('confirmed evidence for the same organization overrides an inferred episode', () => {
  const result = helpers.get('character_organization_pages').call(organizationContext, ['贝利亚家族'], [{value: '贝利亚家族', certainty: 'inferred'}, {value: '贝利亚家族'}]);
  assert.equal(result[0].inferred, false);
  assert.ok(result[0].path);
});
