# ECharts Graphic Template API 计划

> 日期：2026-01-20  
> 状态：Draft（仅文档，尚未实现）

目标：为 ECharts `option.graphic` 设计一套基于 Vue 模板语法的声明式 API，让用户用 `v-for / v-if / :prop / @event` 直接描述图形树，并在底层保证更新正确性与性能。

## 本目录包含

- `plans/graphic-template/00-background.md`：背景与痛点
- `plans/graphic-template/01-discussions.md`：需求讨论纪要与关键决策
- `plans/graphic-template/02-rfc.md`：RFC（对外 API 与内部语义）
- `plans/graphic-template/03-execution-plan.md`：执行计划（工作包、验收、风险）
- `plans/graphic-template/04-optimization-baseline.md`：优化前行为基线（测试/警告/视觉）

## 关键决策（摘要）

- 只要提供了 `#graphic` slot，则**完全覆盖**并忽略 `option.graphic`（dev 下给出 warn）。
- 用户 API **不提供** `mode`、`action` 等更新语义开关；差异更新与降级策略全部在内部完成。
- 以可选能力形式交付：新增子路径入口 `vue-echarts/graphic`，用户显式 `import` 才启用；主入口 `vue-echarts` 仅提供极薄的扩展点（不包含 graphic 实现）。
