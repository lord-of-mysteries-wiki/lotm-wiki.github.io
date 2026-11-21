const {loadModel}=require('./lib/content-model');
const model=loadModel();
console.log(`内容校验通过：${model.profiles.length} 份人物档案，${model.characters.length} 个节点，${model.relations.length} 条关系，${model.events.length} 个事件。`);
