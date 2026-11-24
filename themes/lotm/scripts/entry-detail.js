const {createEntryDetail}=require('../lib/entry-detail');
hexo.extend.helper.register('entry_detail_view',function(page,kind){return createEntryDetail(page,kind,{sources:this.__('event_sources'),scope:this.__('entry_information'),facts:this.__('event_source_facts'),time:this.__('entry_time_evidence')});});
