const {test} = require('node:test');
const assert = require('node:assert/strict');
const {eventReferences} = require('../lib/event-references');
test('identical complete citations share all applicable scopes', () => {
  assert.deepEqual(eventReferences({event_source:'《诡秘之主》第一卷第9章',event_time_source:'《诡秘之主》第一卷第9章'}), [{source:'《诡秘之主》第一卷第9章',scopes:['facts','time']}]);
});
test('different locators, qualifications and reasoning are never silently merged', () => {
  for(const time of ['《诡秘之主》第一卷第9章、第12章','《诡秘之主》第一卷第9章（仅限回忆）']) {
    const event={event_source:'《诡秘之主》第一卷第9章',event_time_source:time};
    assert.deepEqual(eventReferences(event).map(r=>r.source),[event.event_source,time]);
  }
});
test('missing citations never manufacture a bibliography from the book name', () => {
  assert.deepEqual(eventReferences({event_work:'诡秘之主'}),[]);
});
test('all event source fields remain represented verbatim', () => {
  for(const event of require('../lib/content-model').loadModel().events) {
    const refs=eventReferences(event);
    for(const [field,scope] of [['event_source','facts'],['event_time_source','time']]) if(event[field]?.trim()) {
      assert.ok(refs.some(r=>r.source===event[field].trim() && r.scopes.includes(scope)),event.entry_id);
    }
  }
});

test('timeline citation stays compact without losing chapter locators', () => {
  const {shortEventSource}=require('../lib/event-references');
  assert.equal(shortEventSource({event_source:'《诡秘之主》第一卷第9章至第12章、第210章'}),'《诡秘之主》一卷9–12、210章');
  assert.equal(shortEventSource({event_source:'《诡秘之主》第一卷第9章；《诡秘之主》第六卷第68章（仅限回忆）'}),'《诡秘之主》一卷9章；六卷68章（仅限回忆）');
  assert.equal(shortEventSource({event_time_source:'《宿命之环》第七卷第39章'}),'《宿命之环》七卷39章');
});
