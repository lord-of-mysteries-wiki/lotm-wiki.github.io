const {loadModel} = require('../../../tools/lib/content-model');
const {isBriefEvent} = require('../../../tools/lib/event-presentation');
const path = require('node:path');
const {characterExcerpt}=require('../lib/character-excerpt');
let model;
hexo.extend.filter.register('before_generate', function () { model = loadModel(); });
hexo.extend.helper.register('wiki_model', () => model);
hexo.extend.helper.register('character_pathways', function (page) {
  const profile = model.profiles.find(profile => profile.entry_id === page.entry_id);
  return profile ? model.directory[path.basename(profile.source, '.md')]?.pathways || [] : [];
});
hexo.extend.helper.register('wiki_events', function () {
  const pages = new Map(this.site.pages.toArray().map(p => [p.entry_id, p]));
  return model.events.map(event => pages.get(event.entry_id)).filter(Boolean);
});
hexo.extend.helper.register('wiki_event_url', function (event) {
  return isBriefEvent(event) ? this.url_for('/timeline/') + '#event-' + encodeURIComponent(event.event_anchor || event.title) : this.url_for('/' + event.path);
});
hexo.extend.generator.register('wiki-content-data', function () {
  const pages=new Map(this.locals.get('pages').toArray().filter(p=>p.character_profile).map(p=>[p.entry_id,p]));
  const characters=model.characters.map(person=>({...person,documentExcerpt:characterExcerpt(pages.get(person.id)||{content:''})}));
  const safe = JSON.stringify(characters).replace(/</g, '\\u003c');
  return [{path:'relationships/graph-data.js', data:`const characters=${safe};\nconst relations=${JSON.stringify(model.relations).replace(/</g,'\\u003c')};\nconst relationshipCategories=${JSON.stringify(model.categories)};\nconst relationChronology=${JSON.stringify(model.relationChronology).replace(/</g,'\\u003c')};\n`}];
});

const {characterRelationRows} = require('../lib/character-records');
hexo.extend.helper.register('character_relation_rows', function(id, preferredIds = []) {
  return characterRelationRows(model, id, preferredIds);
});
