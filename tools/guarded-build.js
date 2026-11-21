// Compare actual bytes, including uncommitted and untracked source files.
// Never restore a file automatically: leave evidence and user edits intact.
const {spawnSync} = require('node:child_process');
const {root,snapshot,changedFiles,checkPolicy} = require('./lib/architecture-guard');
try {
  checkPolicy();
  const before = snapshot();
  const result = spawnSync(process.execPath, [require.resolve('hexo-cli/bin/hexo'), 'generate'], {cwd:root,stdio:'inherit'});
  const changed = changedFiles(before,snapshot());
  if(changed.length) throw Error('构建改写了受保护的源文件：\n'+changed.join('\n'));
  if(result.error) throw result.error;
  if(result.status !== 0) process.exitCode = result.status || 1;
} catch(error) { console.error(error.message); process.exitCode=1; }
