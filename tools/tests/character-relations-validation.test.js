'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateCharacterRelations} = require('../lib/character-relations-validation');
const options = {profileId:'person',graphLink:'/lotm-wiki.github.io/relationships/?a=person',recordTables:true};
const link = '<a href="' + options.graphLink + '">关系网</a>';

test('nested stage disclosure does not truncate the parent section or change its open state', () => {
  assert.doesNotThrow(() => validateCharacterRelations('<details class="character-relations"><details open><summary>阶段</summary></details>'+link+'</details>', options));
});
test('a graph link outside the relation section does not satisfy its required link', () => {
  assert.throws(() => validateCharacterRelations('<details class="character-relations"><details>阶段</details></details>'+link, options), /关系区缺少关系网入口/);
});
test('an open parent or duplicate relation section still fails', () => {
  assert.throws(() => validateCharacterRelations('<details class="character-relations" open>'+link+'</details>', options), /默认收起/);
  assert.throws(() => validateCharacterRelations('<details class="character-relations">'+link+'</details><details class="character-relations">'+link+'</details>', options), /须唯一/);
});
test('legacy pages need an actual link and cannot include the migrated section', () => {
  assert.doesNotThrow(() => validateCharacterRelations(link, {...options,recordTables:false}));
  assert.throws(() => validateCharacterRelations('只有文字关系网', {...options,recordTables:false}), /缺少关系网入口/);
  assert.throws(() => validateCharacterRelations('<details class="character-relations">'+link+'</details>', {...options,recordTables:false}), /旧版/);
});
