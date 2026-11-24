const {eventReferences, shortEventSource} = require('../../../tools/lib/event-references');
hexo.extend.helper.register('event_references', eventReferences);
hexo.extend.helper.register('event_reference_scope', function (scopes) {
  return scopes.map(scope => this.__(scope === 'facts' ? 'event_source_facts' : 'event_source_time')).join('、');
});

hexo.extend.helper.register('event_short_source', shortEventSource);
