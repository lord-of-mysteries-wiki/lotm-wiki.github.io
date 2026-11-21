'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const policy = require('../architecture-policy.json');
function walk(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, {withFileTypes:true}).flatMap(entry => {
    const name = directory + '/' + entry.name;
    if (entry.isSymbolicLink()) throw Error('保护目录内不允许符号链接：' + name);
    return entry.isDirectory() ? walk(name) : [name];
  });
}
function snapshot() {
  return new Map(policy.protectedSourceDirectories.flatMap(walk).map(file => [file,
    crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
}
function changedFiles(before, after) {
  return [...new Set([...before.keys(), ...after.keys()])].sort().filter(file => before.get(file) !== after.get(file)).map(file =>
    `${!before.has(file)?'新增':!after.has(file)?'删除':'修改'} ${file}`);
}
function checkPolicy() {
  const errors = [];
  const tracked = execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  for (const file of tracked) {
    if (policy.forbiddenTrackedPaths.some(p => p.endsWith('/') ? file.startsWith(p) : file===p)) errors.push('生成结果或原文进入版本控制：'+file);
  }
  const staged = execFileSync('git',['diff','--cached','--name-only','--diff-filter=AM','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  for (const file of staged) if (policy.retiredFiles.includes(file)) errors.push('暂存区恢复已退役文件：'+file);
  for (const file of policy.retiredFiles) if (fs.existsSync(path.join(root,file))) errors.push('已退役文件重新出现：'+file);
  const excluded = new Set(['tools/architecture-policy.json', 'tools/lib/architecture-guard.js', 'tools/tests/architecture-guard.test.js']);
  for (const file of policy.runtimeDirectories.flatMap(walk)) {
    if (excluded.has(file) || !policy.referenceCheckExtensions.includes(path.extname(file))) continue;
    const source = fs.readFileSync(path.join(root,file),'utf8');
    for (const retired of policy.retiredFiles) {
      if (source.includes(path.basename(retired))) errors.push('旧数据源引用：'+file+' → '+retired);
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
}
module.exports = {root,snapshot,changedFiles,checkPolicy};
