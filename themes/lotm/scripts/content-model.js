const {loadModel} = require('../../../tools/lib/content-model');
let model;
hexo.extend.filter.register('before_generate', function () { model = loadModel(); });
hexo.extend.helper.register('wiki_model', () => model);
hexo.extend.helper.register('wiki_events', function () {
  const pages = new Map(this.site.pages.toArray().map(p => [p.entry_id, p]));
  return model.events.map(event => pages.get(event.entry_id)).filter(Boolean);
});
hexo.extend.helper.register('wiki_event_url', function (event) {
  return event.event_summary?.trim() ? this.url_for('/timeline/') + '#event-' + encodeURIComponent(event.event_anchor || event.title) : this.url_for('/' + event.path);
});
hexo.extend.generator.register('wiki-content-data', function () {
  const safe = JSON.stringify(model.characters).replace(/</g, '\\u003c');
  return [{path:'relationships/graph-data.js', data:`const characters=${safe};\nconst relations=${JSON.stringify(model.relations).replace(/</g,'\\u003c')};\nconst relationshipCategories=${JSON.stringify(model.categories)};\n`}];
});
