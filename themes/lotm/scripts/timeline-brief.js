// Briefs appear on the timeline and calendar without a standalone page.
hexo.extend.filter.register('after_generate', function () {
  for (const page of this.locals.get('pages').toArray()) {
    if (page.timeline_event && page.event_summary?.trim()) this.route.remove(page.path);
  }
});

// Source navigation uses sibling Markdown files. Published events use either
// a timeline anchor or the detail page's stable URL under the site's root.
const fs = require('node:fs');
const path = require('node:path');
const frontMatter = require('hexo-front-matter');
hexo.extend.filter.register('before_post_render', function (data) {
  if (!data.timeline_event) return data;
  data.content = data.content.replace(/<!-- event-navigation -->([\s\S]*?)<!-- \/event-navigation -->/, (_, nav) =>
    nav.replace(/\]\(<\.\/([^/<>]+\.md)>\)/g, (match, name) => {
      const neighbor = frontMatter.parse(fs.readFileSync(path.join(this.source_dir, 'timeline', name), 'utf8'));
      const route = neighbor.event_summary?.trim()
        ? 'timeline/#event-' + (neighbor.event_anchor || neighbor.title) : neighbor.permalink;
      return '](' + encodeURI(this.config.root + route) + ')';
    }));
  return data;
});
