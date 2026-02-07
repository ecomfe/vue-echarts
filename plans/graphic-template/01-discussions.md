# 需求讨论纪要与关键决策

> 日期：2026-01-20  
> 目的：把“讨论过程中的结论”固化成可执行的产品/工程规则，避免实现阶段反复拉扯。

## 讨论要点 1：slot 与 `option.graphic` 的关系

问题：如果用户同时使用 `#graphic` slot 与 `option.graphic`，应该如何合并？

结论：**slot 覆盖（single source of truth）**。

- 只要提供了 `#graphic` slot，就**完全忽略** `option.graphic`。
- 开发环境给出清晰 warn：同时存在时已忽略 `option.graphic`，并提示迁移路径。

理由：

- 合并/merge 会引入大量心智分歧（谁优先？删除怎么推导？冲突怎么处理？）。
- slot 天然是“全量声明”，更适合作为唯一真相源；我们内部再做差异更新以保证性能与状态保留。

## 讨论要点 2：是否暴露 `mode` / `action`

问题：是否需要把更新语义开关（`mode`）或 ECharts `$action` 暴露为用户 API？

结论：**不暴露**。

- 用户 API 不提供 `mode`（patch/replace）选择。
- 用户 API 不提供 `action`（映射 `$action`）之类的“低层更新语义”。

理由：

- 这些概念会迫使用户理解 ECharts merge 细节，违背“模板即真相”的体验目标。
- 更新策略应由库内部根据 diff 自动决策；遇到高风险场景内部可自动降级（例如 replace-root），但不让用户背负选择成本。

## 讨论要点 3：功能不进入主 bundle，改为可选 entry

问题：不希望把 graphic 模板系统直接合并进 `vue-echarts` 主入口，是否能做成新 entry，让用户自主引入？

结论：**新增子路径入口 `vue-echarts/graphic`**。

- `vue-echarts` 主入口：仅提供“极薄扩展点”，不包含 graphic 编译/diff/事件等实现。
- `vue-echarts/graphic` 子入口：导出 `G*` 组件，并注册扩展以启用 `#graphic` slot 的编译与覆盖逻辑。

## 讨论要点 4：VChart slot 支持如何在“可选 entry”下实现

问题：如果 graphic 功能不进入主 bundle，那么 `<VChart><template #graphic>...</template></VChart>` 的实现入口在哪里？

结论：主入口提供扩展点；子入口注册扩展。

- 在 `VChart` 内部建立一个可注册的 `OptionPatcher`/`Extension` 机制：
  - `patchOption(option) -> option`：在 `setOption` 前改写 option（这里用于覆盖 `option.graphic`）。
  - `render()`：返回需要挂载在 VChart 渲染树里的隐藏 VNode（这里用于 Teleport 到 detached root，展开 `#graphic` slot 并收集声明组件）。
  - `onRequestUpdate()`：扩展可请求触发一次图表更新（用于 slot 自身变化但 `option` 未变更的场景）。
- `vue-echarts/graphic` 在被 import 时注册该扩展，从而启用功能。
- 若用户写了 `#graphic` 但未引入子入口：dev 下 warn 指引用户 `import ... from 'vue-echarts/graphic'`。

## 本次讨论后“冻结”的对外行为

- `#graphic` 存在 ⇒ 覆盖 `option.graphic`。
- 不支持 `mode` / `action` 作为用户 API。
- `vue-echarts/graphic` 为显式 opt-in。
