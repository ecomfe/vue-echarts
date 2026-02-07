# 执行计划（事无巨细版）

> 日期：2026-01-20  
> 说明：本计划用于落地 `vue-echarts/graphic`（可选 entry）与 VChart 扩展点。

## 0. 验收总目标（最终用户能感知的结果）

用户完成如下代码后：

```ts
import VChart from "vue-echarts";
import { GRect, GText } from "vue-echarts/graphic";
```

即可：

1. 使用 `#graphic` slot 声明图形树；
2. `v-for` 增删/`v-if` 显隐能正确反映到图表（无残留）；
3. 事件可以写在元素上（`@click` 等）；
4. 不引入 `vue-echarts/graphic` 时不增加主 bundle 负担，且 slot 未启用会有明确 warn；
5. 提供 `#graphic` 时完全忽略 `option.graphic`（dev 下 warn）。

## 1. 里程碑与工作包（按依赖顺序）

### M1：预研与语义钉死（1~2 天）

目标：用最小实验锁死 ECharts graphic 的更新语义，避免实现阶段靠猜。

任务：

- [x] 建立一个最小 demo（或 browser test）验证：
  - 删除 child：仅从 children 数组移除是否会残留？是否必须 `$action:'remove'`？
  - 父子迁移：同 id 从 A group 移动到 B group，merge/replace/remove 的行为如何？
  - 根替换：root `$action:'replace'` 的副作用（动画/状态/性能）
- [x] 输出“策略矩阵表”（写在 RFC 附录或本计划附录）：
  - 何时 merge、何时局部 remove、何时 replace-root 兜底

验收：

- [x] 策略矩阵表明确且可复用到实现与测试用例。

#### M1 结果记录（已验证）

验证方式：新增 browser 测试 `tests/graphic-behavior.browser.test.ts`（真实 ECharts + GraphicComponent）。

结论：

- 默认 merge 下，`graphic.elements` 中**省略的元素不会被删除**（旧元素保留）。
- 提供 `{ id, $action: "remove" }` 时，元素会被正确移除。

这意味着模板系统要保证“删除”正确性，必须生成显式 remove 补丁或等价的兜底策略（例如 replace-root）。

### M2：主入口扩展点（`vue-echarts`，0.5~1 天）

目标：在不引入 graphic 实现的情况下，为子入口提供挂载与 patch 能力。

改动范围：

- 新增 `src/extensions.ts`（示例名）：
  - `registerVChartExtension(factory)`
  - `getVChartExtensions()` / `useVChartExtensions(ctx)`
  - registry 存放在 `globalThis[Symbol.for(...)]`，避免多 entry 多份副本导致无法注册
- 修改 `src/ECharts.ts`：
  - 在 `applyOption()` 前调用 extensions 的 `patchOption`
  - render tree 中追加 extensions 的 `render()`（与现有 `teleportedSlots()` 并列）
  - 提供 `onRequestUpdate()` 给扩展（触发一次 `applyOption(chart, props.option)`）
  - dev warn：
    - slot.graphic 存在但未启用：提示 `import ... from 'vue-echarts/graphic'`
    - slot.graphic + option.graphic 同时存在：提示忽略 option.graphic
- 修改 `src/composables/slot.ts` 的 `SlotsTypes`：加入 `graphic` slot 占位类型，避免 TS 报错

验收：

- [x] 不引入 `vue-echarts/graphic`：其它功能不回归；`#graphic` slot 不生效且有 warn。
- [x] 引入后：扩展的 `render()` 能被渲染；`patchOption()` 能生效。

### M3：子入口构建与 exports（0.5 天）

目标：让用户能从 `vue-echarts/graphic` 引入，且主入口不被牵连。

任务：

- [x] 新增入口 `src/graphic/index.ts`
- [x] 修改 `tsdown.config.ts` 增加 entry，产出 `dist/graphic.js` + `dist/graphic.d.ts`
- [x] 修改 `package.json#exports` 增加 `./graphic` 子路径（含 types）
- [x] 跑 `pnpm build` + `pnpm publint` 验证子路径导出正确

验收：

- [x] `import { GRect } from 'vue-echarts/graphic'` JS/TS 都能解析。
- [x] 主入口体积/依赖不因新增功能显著增加（人工检查即可）。

### M4：`vue-echarts/graphic` 核心实现（2~4 天）

目标：实现“模板收集 → 生成 graphic option → 覆盖 → 批处理更新”的完整闭环。

#### M4.1 声明组件（G\*，render null）

任务：

- [x] 实现 `GGroup` 与若干 MVP 图元：`GRect/GCircle/GText/GLine/GPolyline/GPolygon/GImage`
- [x] 每个组件通过 provide/inject 注册到 collector：
  - id 推导：`props.id ?? vnode.key ?? autoId(仅 dev warn)`
  - mount/update/unmount 生命周期同步到 collector
- [x] 自定义组件封装可用（slot 展开后仍能注册）

验收：

- [x] 组件不产生真实 DOM。
- [x] `v-for`/自定义组件封装能正确注册多节点。

#### M4.2 GraphicMount（隐藏渲染 + 收集 + 调度）

任务：

- [x] patcher.render() Teleport 到 detached root（参考现有 tooltip slot 的实现）
- [x] `GraphicMount` 内部执行 `slots.graphic?.()` 以展开模板
- [x] collector 输出 `computedGraphic`：
  - 标准形态：`{ graphic: { elements: [managedRootGroup] } }`
  - managedRootGroup id 固定（内部使用），children 来自用户声明
- [x] 批处理：同一 tick 多次变化合并成一次 `onRequestUpdate()`

验收：

- [x] slot 内容变化会触发图表更新，即便 `option` 本身未变化。
- [x] 性能：高频更新不会出现 setOption 风暴（至少 microtask 合并）。

#### M4.3 patchOption 覆盖规则

任务：

- [x] 当 `#graphic` slot 存在：浅克隆 option 并强制 `option.graphic = computedGraphic`
- [x] 同时存在 `option.graphic`：dev warn（由主入口做也可）

验收：

- [x] slot 为真相源；option.graphic 永远不参与。

#### M4.4 正确性：删除与结构变化兜底

任务：

- [x] 基于 M1 的策略矩阵实现删除/迁移处理：
  - 删除：生成 remove 补丁或等价策略，保证旧元素不残留
  - 结构变化：内部 replace-root 兜底（不暴露给用户）
- [x] dev 校验：
  - 重复 id：warn + 兜底策略
  - `v-for` 无 key 且无 id：warn（必要时兜底策略）
  - layout 与 shape 定位冲突：warn（例如设置 left 后 shape.x 不生效）

验收：

- [x] 增删/迁移无残留，行为可预测。

### M5：事件路由（1~2 天）

目标：用户能在 `G*` 上直接写 `@click`。

任务：

- [x] 在编译输出的元素 option 上注入可路由标识（基于 `info` 字段）：
  - 保留用户 `info`，并附加内部 id 标记
- [x] 收集元素级事件 handler（`onClick/onMouseover/...`）
- [x] 运行时按需注册 chart-level 事件监听，并按 `params.info` 路由
- [x] chart 重建时自动重新绑定（监听 `chartRef`）

验收：

- [x] `@click` 触发稳定；`params.info` 同时包含用户数据与内部标识。

### M6：文档 & Demo（0.5~1 天）

任务：

- [x] README（中英）：
  - 如何启用（必须 import 子入口）
  - 覆盖规则（slot 覆盖 option.graphic）
  - id/key 最佳实践
  - 示例（水印、动态标注、交互）
- [x] demo 增加一页专门演示：
  - 动态 points（增删）
  - 自定义组件封装
  - 点击事件

验收：

- [x] 用户照文档 5 分钟内能跑通 demo。

### M7：测试与发布校验（1~2 天）

任务：

- [x] Node tests：
  - collector 行为、option 生成、重复 id 校验
- [x] Browser tests：
  - 未启用时 warn
  - 启用后增删与事件可用（可通过简单交互或 ZRender 检测）
- [x] `pnpm lint && pnpm typecheck && pnpm build && pnpm publint`
- [ ] `pnpm test`（全量）

验收：

- [ ] CI 等价命令全绿；关键路径有测试覆盖（未全量跑 `pnpm test`）。

## 2. 风险清单与对策

- 多 entry 导致 registry 不共享：使用 `globalThis + Symbol.for` 存放扩展列表（必须做）。
- ECharts graphic 更新语义复杂：M1 先钉死策略矩阵；实现中保留 replace-root 兜底。
- SSR/hydration：Teleport 到 detached root 必须 client-only（仿照现有 slot 逻辑 `isMounted` 控制）。
- `manual-update` 语义：需明确是否跟随现有“manual-update 下忽略 prop 变更”。建议默认：manual-update 下不自动响应 slot 更新，并在文档写清楚；如需可选行为再加一个显式开关（后续讨论）。
