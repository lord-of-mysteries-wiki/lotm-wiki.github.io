const {characterHasSection,characterFactText}=require('../lib/character-facts');
hexo.extend.helper.register('character_has_section', characterHasSection);

// Only link an organization when exactly one published organization page has
// the same name. Classification text alone does not create a wiki page.
hexo.extend.helper.register('character_organization_pages', function (names, classifications = []) {
  const pages = this.site.pages.toArray();
  return names.map(name => {
    const matches = pages.filter(page => String(page.title || '') === name &&
      /^worldview\/organizations\//.test(String(page.path || '').replace(/^\/+/, '')));
    const evidence = classifications.filter(entry => entry.value === name);
    return { name, path: matches.length === 1 ? matches[0].path : null,
      inferred: evidence.length > 0 && evidence.every(entry => entry.certainty === 'inferred') };
  });
});

const {createCharacterReferences} = require('../lib/character-references');
hexo.extend.helper.register('character_reference_view', function(page) {
  return createCharacterReferences(page,this.__('character_sources'));
});

hexo.extend.helper.register('character_fact_text', characterFactText);

const {splitCharacterBody, progressionRows} = require('../lib/character-records');
hexo.extend.helper.register('character_body_sections', splitCharacterBody);
hexo.extend.helper.register('character_progression_rows', progressionRows);
