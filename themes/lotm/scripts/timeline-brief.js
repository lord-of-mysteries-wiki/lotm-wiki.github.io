const {isBriefEvent} = require('../../../tools/lib/event-presentation');
// Briefs appear on the timeline and calendar without a standalone page.
hexo.extend.filter.register('after_generate', function () {
  for (const page of this.locals.get('pages').toArray()) {
    if (page.timeline_event && isBriefEvent(page)) this.route.remove(page.path);
  }
});
