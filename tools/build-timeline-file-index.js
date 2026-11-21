// Optional local reading aid. Normal builds never rewrite source documents.
const fs = require('node:fs');
const path = require('node:path');
const {loadModel} = require('./lib/content-model');
const events = loadModel().events;
const link = event => event ? `[${event.narrative_order.label || event.title}](<../source/${event.source}>)` : '—';
const rows = ['# 事件原文顺序', '', '| 卷 | 前一事件 | 本事件 | 后一事件 |', '| --- | --- | --- | --- |'];
events.forEach((event,i) => rows.push('| ' + [event.narrative_order.volume,link(events[i-1]),link(event),link(events[i+1])].join(' | ') + ' |'));
const directory = path.resolve(__dirname,'../docs');
fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(path.join(directory,'事件原文顺序.md'),rows.join('\n')+'\n');
