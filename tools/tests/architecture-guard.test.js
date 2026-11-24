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

test('reject retired character pages and newly invented alias stubs', () => {
  const {loadModel}=require('../lib/content-model');
  const folder=path.join(root,'source/characters/aliases');
  assert.ok(!fs.existsSync(folder));
  fs.mkdirSync(folder);
  try {
    const retired=require('../architecture-policy.json').retiredFiles.find(file=>file.startsWith('source/characters/aliases/'));
    probe(retired,'---\ntitle: retired\n---\n',()=>assert.throws(checkPolicy,/已退役文件重新出现/));
    probe('source/characters/aliases/new-alias-probe.md','---\ntitle: alias\n---\n',()=>assert.throws(loadModel,/不允许别名或兼容文档/));
  } finally { fs.rmdirSync(folder); }
});

test('reject restoring a retired directory renderer', () => {
  probe('source/js/artifact-directory.js','',()=>assert.throws(checkPolicy,/已退役文件重新出现/));
});
