---
# 分类双链由共享构建索引生成；正文使用正式站内链接，不手填反向关联清单。来源与导航不参与关联。
# 引用规范：遵循 docs/来源标注规范.md；完整出处集中列一次，注明小节或阶段范围，推定与例外紧贴事实。
# 小说卷章在正文保留完整原始引用，共享模板按段落悬停显示简短来源，页末完整来源默认收起；不手工添加编号或引用组件。
# 人物正文直接写属性和经历，不写“据某人说”“原文记述”“据此推断”等考据过程；出处交给共享引用，推定／传闻／自述只保留简短限定。
# 局部限定紧贴事实，关系出处只在 relations.json 维护。作者文章及无法识别的正文引用仍按来源规范明确标注。
# graph_profile、graph_classifications 与 relations.json 各项原始出处保持完整；页末显示合并不替代结构化来源。
# 章节来源写作《作品名》第一卷第9章；保留多章或范围，不写章节标题。
# 数据架构：新建前阅读 docs/词条数据与多视图架构.md；事实只维护一个来源，复用共享模板。
# 新字段须配套读取器；构建从词条生成视图，不手改生成数据。
title: {{ title }}
layout: index
character_profile: true
# entry_id 使用唯一且稳定的标识；新增前检查现有别名与提及门槛。
# 只维护正式人物页；改名、合并或删节时更新站内引用，不创建旧地址别名页、跳转或兼容锚点。
entry_id:
entry_type: character
# graph_profile 保存图谱名称、简称、别名、途径依据和晋升阶段；组织与国籍只填 graph_classifications。
graph_profile: {"short": "", "mark": "", "alias": "", "group": "其他人物", "classificationEvidence": [], "progression": []}
# 关系统一维护于 source/_data/relations.json，以双方 entry_id 引用；人物页仅提供关系网定位入口，不复制关系列表。
# 基本资料只填简短属性；正文补充依据和经历，不再重复属性表。经历按人物人生顺序整合为少量阶段，不按来源发现顺序追加事件标题。
# 办公地点、普通雇主和学校写入人物履历。组织分类用于有章节依据的团体归属。
# 原文能确认角色独立且没有组织归属时，可在 organization 中填写 value 为“独立”的条目，并注明章节依据和适用时期。资料不足时保留空数组。
graph_classifications: {"organization": [], "nationality": []}
permalink: characters/entries/{{ title }}/
# 作品归属只在这里维护；不再重复填写 profile_facts 的“所属作品”。
# title 为正式名称；别名维护于 graph_profile.alias 及现有依据，不另写 document_name/profile_alias 副本。
# 信息栏优先使用现有结构化显示或 source_section；短属性直接从对应正文生成，过长记录跳转小节，不复制 summary。
# progression 为晋升阶段主源；图谱简介从正文及其出处生成，不填写 documentProfile/documentExcerpt。
profile_work: 待补充
profile_facts:
  - label: 途径与序列
    source_section: 途径与序列经历
  - label: 国籍／身份
    source_section: 身份与国籍
  - label: 所属组织
    source_section: 所属组织与身份
  - label: 首次登场
    value: 待核实
# 待补充：概述人物身份、主要经历及其在故事中的地位，并标注原文出处。
# 区分籍贯、居住地与国籍。关系与晋升阶段注明时期、依据和出处。
---

## 人物简介

待核实。

## 外貌与性格

- **外貌：**待核实。
- **性格：**待核实。

## 途径与序列经历

<!-- 晋升阶段及出处维护于 graph_profile.progression；此处只写有独立价值的经历，不复制阶段表。没有补充则删除此节。 -->

## 所属组织与身份

<!-- 组织、国籍分类及时期维护于 graph_classifications；此处只写活动经历，不复制成员分类表。 -->

## 身份与国籍

待核实。


## 主要经历

待补充。

## 待核事项
