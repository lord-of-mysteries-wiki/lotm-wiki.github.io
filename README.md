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

当前网站以简体中文发布，暂不提供语言切换。主题界面文案使用 `themes/lotm/languages/zh-CN.yml` 中的翻译键，`en.yml` 保留对应的英文翻译；新增主题文案时请在两份文件中使用相同的键，并通过 Hexo 的 `__()` 调用。菜单配置使用翻译键作为名称。

关系网使用共享主题外壳与专用图谱组件，界面和人物数据目前为中文，不会随 Hexo 语言配置自动切换。将来提供英文版本时，还需为该页面的静态与动态文案、人物及关系数据建立翻译，并实现语言选择和路由；仅修改 `language` 或翻译表不能完成全站切换。

## 字体

网站自托管 Inter、Libre Baskerville、Noto Sans SC（思源黑体）和 Noto Serif SC（思源宋体）的 WOFF2 网页字体。字体采用 SIL Open Font License 1.1，各字体目录下的 `OFL.txt` 保留了授权及版权信息。英文使用拉丁字符集，中文字体各使用一个完整的可变字重文件；加载期间先显示系统备用字体。英文字体来自 Fontsource 字体包；中文字体来自 Google Fonts 字体仓库并转换为 WOFF2。

## 文件结构

- `source/worldview/pathways/`：按途径分目录，途径和序列词条以中文名称命名。
- `source/relationships/relationship-data.js`：关系网的人物与关系数据；`character-index.js` 由 `tools/build-character-index.py` 生成。
- `source/characters/entries/`：人物独立档案。已迁移档案的 `graph_classifications` 使用 JSON 对象，按 `organization`、`nationality` 分别列出带 `value` 和 `source` 的记录；同一人物可有多项组织。字段中的分类以档案为准，空数组表示该类暂无已核实的分组。尚未迁移的分类暂由生成脚本维护；更新人物正文时也需同步更新对应分类字段。
- `source/css/typography.css`：全站共用的字体及字号层级；主题和关系网的样式文件分别负责各自的布局与组件。
- `source/fonts/`：按字体分目录保存网页字体及授权文件。
- `public/`：生成目录，由 Hexo 构建，不应手动编辑。
