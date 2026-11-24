const presentation = require('../../../tools/lib/event-presentation');
hexo.extend.helper.register('cordu_cycle_label', presentation.corduCycleLabel);
hexo.extend.helper.register('is_brief_event', presentation.isBriefEvent);
hexo.extend.helper.register('event_date_label', presentation.eventDateLabel);
hexo.extend.helper.register('event_timeline_title', presentation.eventTimelineTitle);
