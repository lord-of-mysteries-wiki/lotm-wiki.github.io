const {checkPolicy} = require('./lib/architecture-guard');
const {loadModel} = require('./lib/content-model');
try {
  checkPolicy();
  const model = loadModel();
  console.log(`架构检查通过：唯一数据源、退役文件、旧引用、生成文件与内容引用；${model.profiles.length} 份人物档案、${model.events.length} 个事件、${model.relations.length} 条关系。`);
} catch(error) {console.error(error.message);process.exitCode=1;}
