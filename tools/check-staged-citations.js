#!/usr/bin/env node
// Check newly staged citation lines; existing content is not silently rewritten.
const { execFileSync } = require('child_process');
const diff = execFileSync('git', ['diff', '--cached', '--no-ext-diff', '--unified=0', '--', 'source'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const problems = [];
let file = '';
for (const line of diff.split('\n')) {
  if (line.startsWith('+++ b/')) { file = line.slice(6); continue; }
  if (!line.startsWith('+') || line.startsWith('+++') || line.startsWith('+narrative_order:')) continue;
  const text = line.slice(1);
  if (!/《(?:诡秘之主|宿命之环)》/.test(text)) continue;
  const rules = [
    [/《(?:诡秘之主|宿命之环)》\s*第\d+卷/, '卷号请使用中文数字'],
    [/第[一二三四五六七八九十百零〇\d]+部(?=[，、\s]*第)/, '卷号请使用“卷”'],
    [/第[一二三四五六七八九十百零〇]+章/, '章节号请使用阿拉伯数字'],
    [/第\d+(?:[、，,]\d+|[—–至-]\d+)+章/, '多章或章节范围请逐一写明“第N章”'],
    [/《(?:诡秘之主|宿命之环)》第[一二三四五六七八九十]+卷\s*[^第\s，；。]+\s*[，、 ]+第\d+章/, '章节来源不写卷名'],
    [/第\d+章\s*《[^》]+》/, '章节来源不写章节标题'],
    [/《(?:诡秘之主|宿命之环)》\s*第\d+章/, '请补充已知卷号']
  ];
  for (const [pattern, message] of rules) if (pattern.test(text)) problems.push(`${file}: ${message}\n  ${text.trim().slice(0, 200)}`);
}
if (problems.length) {
  console.error('暂存内容中发现需要调整的章节来源：\n' + problems.join('\n'));
  process.exitCode = 1;
} else console.log('暂存内容中的常见章节来源格式检查通过。');
