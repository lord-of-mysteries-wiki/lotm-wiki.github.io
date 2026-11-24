const { buildPathwayView } = require('../lib/pathway-view');
hexo.extend.helper.register('pathway_view', function (entry) {
  const sequences = this.site.pages.toArray().filter(p => p.pathway === entry.title && p['sequence-name'])
    .sort((a, b) => Number(b['sequence-level']) - Number(a['sequence-level']));
  if (sequences.length !== 10 || new Set(sequences.map(p => Number(p['sequence-level']))).size !== 10) throw new Error(`途径序列不完整：${entry.title}`);
  return buildPathwayView(entry, sequences, this.__('pathway_sources'));
});
hexo.extend.filter.register('after_generate', function () {
  const pages = this.locals.get('pages').toArray();
  const parents = new Set(pages.filter(p => p.pathway_page).map(p => p.title));
  for (const page of pages) if (page['sequence-name'] && parents.has(page.pathway)) this.route.remove(page.path);
});
