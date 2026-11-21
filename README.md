# 诡秘之主WIKI

为了整理爱潜水的乌贼的小说《诡秘之主》和《宿命之环》的世界观、故事情节开设的Wiki站点。

## 编辑说明

### 环境配置

站点基于hexo搭建，如果想要优化站点，需要安装nodejs和hexo。

```bash
npm install -g hexo-cli
```

### 本地预览

```bash
hexo server
```

## 界面语言

当前网站以简体中文发布，暂不提供语言切换。主题界面文案使用 `themes/lotm/languages/zh-CN.yml` 中的翻译键，`en.yml` 保留对应的英文翻译；新增主题文案时请在两份文件中使用相同的键，并通过 Hexo 的 `__()` 调用。菜单名称与顺序统一维护在 `source/js/site-navigation.js`。

关系网使用共享主题外壳与专用图谱组件，界面和人物数据目前为中文，不会随 Hexo 语言配置自动切换。将来提供英文版本时，还需为该页面的静态与动态文案、人物及关系数据建立翻译，并实现语言选择和路由；仅修改 `language` 或翻译表不能完成全站切换。

## 字体

正文使用浏览器默认衬线字体，标题、导航和控件使用默认无衬线字体。

## 文件结构

- `source/worldview/pathways/`：按途径分目录，途径和序列词条以中文名称命名。
- `source/characters/entries/`：人物主数据；`source/_data/relations.json`：关系主数据；`tools/lib/content-model.js` 统一读取、校验并供页面与图谱使用。
- `source/characters/entries/`：人物独立档案。`graph_classifications` 使用 JSON 对象，按 `organization`、`nationality` 分别列出带 `value` 和 `source` 的记录；同一人物可有多项组织。关系图的这两类分组只读取对应人物档案，空数组、缺少档案或匹配不明确均显示待核实。更新人物正文时也需同步更新对应分类字段。
- `source/css/typography.css`：全站共用的字体及字号层级；主题和关系网的样式文件分别负责各自的布局与组件。
- `public/`：生成目录，由 Hexo 构建，不应手动编辑。

## 内容模型与构建

运行环境要求 Node.js >= 20.19（与 Hexo 8 一致）。`npm run build` 与 `npm run server` 都通过 Hexo 的 `before_generate` 读取同一内容模型，不依赖本地小说原文，也不改写源词条。预览时人物、事件与关系数据变更触发重新生成。

- 人物稳定标识为 `entry_id`。人物 `graph_profile` 保存图谱资料；组织、国籍只维护 `graph_classifications`。人物页的关系记录和图谱读取同一份 `source/_data/relations.json`。
- 事件的 `narrative_order` 保存作品、卷、全局叙述顺序 `position` 和目录标签。时间线目录、日历与前后导航自动生成，不再编辑 `source/timeline/index.md` 的事件列表。
- `source/_data/character_statistics.json` 是按人物 ID 保存的既有统计结果，只用于统计与排序，不是人物事实主数据。研究时更新需保留消歧和统计范围，普通构建不重新扫描原文。
- `npm run content:check` 校验主数据；来源核验工具仍只检查章节引用格式与标题，不证明关系事实。
- `node tools/build-timeline-file-index.js` 可选生成本地 Markdown 阅读目录，不再改写事件正文。
- `public/relationships/graph-data.js` 是构建结果，不手工修改或提交。

## 架构保护检查

- `npm run architecture:check`：校验唯一数据源、主数据引用、重复路径、统计字段边界，禁止旧文件恢复、运行代码引用旧数据源及生成结果或小说原文进入 Git。检查当前 Git 索引，能够发现强行暂存的忽略文件。
- `npm run build`：构建前记录 `source/` 全部文件的哈希，结束后检查新增、删除及内容改动；发现改写即失败并保留现场，不自动恢复或覆盖文件。也适用于已有未提交和未跟踪的源文件。
- `npm run architecture:verify`：依次运行架构检查、受保护构建、生成页面检查。PR 和 Pages 工作流共用该命令，CI 另运行保护机制的反例测试。
- `npm run hooks:install`：为当前克隆启用 `.githooks/pre-commit`，提交前检查架构。新克隆需执行一次；本地钩子可以被跳过，不能替代 CI。

GitHub 主分支保护需要由仓库管理员将 `Architecture checks` 设为必需检查，并限制绕过；工作流文件本身不能启用分支保护。检查能覆盖已编码的结构规则，不能判断事实内容是否正确或识别所有形式的重复资料。修改政策与校验代码仍需审阅。
