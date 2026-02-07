# 背景与痛点

ECharts `graphic` 是一个非常强大的“画布层 UI 系统”，允许在图表容器上叠加自定义图元（矩形、文字、图片、路径、组等），并支持：

- 布局（`left/top/right/bottom/width/height`，相对父容器或父 `group`）。
- 变换（`x/y/rotation/scaleX/scaleY/originX/originY`）。
- 交互（`silent/draggable/cursor`）与携带 `info`（可在事件回调中读取）。
- 动画（`transition/enterFrom/leaveTo/keyframeAnimation/...`）。
- 增量更新语义（`$action: 'merge' | 'replace' | 'remove'`）。

但在 Vue 场景中，直接书写 `option.graphic` 往往体验不佳，典型问题如下：

## 1) 写法复杂、可读性差

`graphic` 配置深层嵌套（`shape/style/textContent/textConfig/children`），当业务需要组合、复用、拆分组件时，JSON option 结构不如模板直观。

## 2) 动态数据绑定困难

Vue 的优势是模板语法：

- `v-for`：天然适合列表渲染（增删改）
- `v-if`：天然适合条件渲染（显示/隐藏）
- `:prop`：天然适合响应式绑定

但 `graphic.elements` 是数组，更新时“元素减少/删除”的语义不是天然由 merge 推导出来的；用户需要理解并处理：

- 稳定 `id` 的设计（否则更新不稳定）
- 删除元素时是否需要 `$action: 'remove'`（否则旧元素可能残留）
- 父子结构变更（从一个 group 移到另一个 group）时 merge 的行为与正确性

这些细节让用户难以“像写 UI 一样写 graphic”，尤其在动态数据（标注点、交互热点、提示卡片、拖拽点）场景中。

## 3) 更新正确性与性能容易踩坑

常见坑：

- `v-for` 忘记写 `:key` 或缺少 `id`：导致重复创建/残留/动画错乱。
- 一次小变更却触发大 `setOption`：带来性能问题。
- 误把 `left/top` 与 `shape.x/y/cx/cy` 混用：文档明确说明会导致 `shape` 的定位字段失效，但用户不易察觉。

## 结论

我们需要一个“模板优先（template-first）”的 API：

- 用户用模板声明 graphic 树（体验像写 UI）。
- 底层负责把模板编译回 ECharts `graphic` option，并处理增删改、事件路由、批处理更新。
- 功能以可选 entry 形式提供，避免把复杂实现并入 `vue-echarts` 主 bundle。
