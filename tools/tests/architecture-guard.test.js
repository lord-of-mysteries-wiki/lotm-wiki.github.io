const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {root,snapshot,changedFiles,checkPolicy} = require('../lib/architecture-guard');
// Temporary probes only; no existing user file is overwritten.
function probe(file, content, run) {
  const absolute = path.join(root,file);
  fs.writeFileSync(absolute,content,{flag:'wx'});
  try {run(absolute);} finally {fs.unlinkSync(absolute);}
}
test('detect additions, modifications and deletions without restoring source files', () => {
  const before=snapshot();
  probe('source/.architecture-test-probe','first', file => {
    const added=snapshot();
    assert.ok(changedFiles(before,added).includes('新增 source/.architecture-test-probe'));
    fs.writeFileSync(file,'second');
    assert.ok(changedFiles(added,snapshot()).includes('修改 source/.architecture-test-probe'));
    assert.ok(changedFiles(added,before).includes('删除 source/.architecture-test-probe'));
  });
  assert.deepEqual(changedFiles(before,snapshot()),[]);
});
test('reject restoring a retired data source', () => {
  probe('source/relationships/character-index.js','',() => assert.throws(checkPolicy,/已退役文件重新出现/));
});
test('reject runtime references to a retired data source', () => {
  probe('source/.architecture-test-probe.js', "require('./character-index.js')",() => assert.throws(checkPolicy,/旧数据源引用/));
});
