---
# 数据架构：新建前阅读 docs/词条数据与多视图架构.md；事实只维护一个来源，复用共享模板。
# 简记与时间推定：阅读 docs/简单事件与时间推定规范.md；主动核查前后时间锚点，不把年月未知等同于日号未知。
# 新字段须配套读取器；构建从词条生成视图，不手改生成数据。
title: {{ title }}
layout: index
timeline_event: true
# entry_id 与 narrative_order.position 必须唯一；position 是原文顺序，可在相邻值之间插入小数。
entry_id:
entry_type: event
# work 须与 event_work 相同；volume、label 保存原文目录文案，不猜造章节或日期。
narrative_order: {"work": "诡秘之主", "volume": "", "position": null, "label": ""}
# 填一句话即作为简记直接展示；留空使用详情页；站内链接指向时间线上的事件锚点。
event_summary: ""
# 简记摘要中的已核实词条链接；target 为站内生成路径，按实际指代填写。
event_summary_links: []
event_work: "诡秘之主"
# 完整日期按故事内纪年填写（YYYY-MM-DD），可据文档线索推定并记录依据；日号不明时填写年月字段。
event_time: ""
# 范围终点：仅在可核实边界时填写。
event_time_end: ""
# anchor：事件中的单日锚点；range：日期范围；partial：只有月份、季节等局部线索。
event_time_precision: ""
# partial 的年份或年月（YYYY / YYYY-MM），须有适用于本事件的依据。
event_time_period: ""
# 可选年月范围终点，与起点精度一致，不代表事件连续发生。
event_time_period_end: ""
# stated：原文明确；inferred：由原文线索推算。局部线索可留空。
event_time_certainty: ""
# 记录推理过程、适用范围、未确认部分及原文章节。
event_time_basis: ""
event_time_note: ""
# 来源格式：作品名、卷号和章节号，例如《诡秘之主》第一卷第9章；不写章节标题。
event_time_source: ""
# 详情页可指定固定网址；简记使用时间线锚点。
permalink: ""
# 待补充：事件内容、涉及人物及来源。
# 待核实：故事内日期或范围、推断过程和原文章节。
---

## 事件概述

待核实。

## 时间依据

待核实。
