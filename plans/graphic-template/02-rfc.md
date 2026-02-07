# RFC：基于模板语法的 ECharts Graphic API（Template-first）

> 状态：Draft  
> 日期：2026-01-20  
> 本 RFC 以“最终对外行为”为准：slot 覆盖、无 mode/action、可选 entry。

## 1. 目标（Goals）

1. 让用户用 Vue 原生模板语法描述 `graphic`：`v-for / v-if / :prop / @event`。
2. slot 作为 single source of truth：提供 `#graphic` 时，不需要用户理解 ECharts `$action/remove/replaceMerge`。
3. 底层保证正确性与性能：
   - 正确处理增删（不残留）
   - 结构变化可兜底（内部降级）
   - 更新批处理（避免 setOption 风暴）
4. 以可选 entry 交付：`import ... from 'vue-echarts/graphic'` 才启用。

## 2. Non-goals

- 不试图取代 ECharts 其它标注能力（markPoint/markLine 等）。
- 不承诺为 zrender 全量属性提供扁平化 props（保留 raw 透传作为逃生舱）。

## 3. 用户 API

### 3.1 启用方式（显式 opt-in）

用户必须显式引入：

```ts
import { GRect, GText, GGroup } from "vue-echarts/graphic";
```

该 import 的副作用是：注册一个 VChart 扩展，使 `#graphic` slot 生效。

### 3.2 入口：`#graphic` slot（覆盖规则）

```vue
<VChart :option="option">
  <template #graphic>
    <GText id="watermark" left="center" top="middle" :text="'CONFIDENTIAL'" :opacity="0.12" />
  </template>
</VChart>
```

规则：

- 只要提供了 `#graphic` slot，就**忽略** `option.graphic`（开发环境 warn）。
- slot 内容是“全量声明”，库内部做 diff 以达到性能与状态保留的目标，但用户无需理解更新语义。

### 3.3 组件集合（对齐 ECharts graphic type）

- 容器：`GGroup`（对应 `type:'group'`，唯一允许 children）
- 图元：`GRect`, `GCircle`, `GSector`, `GRing`, `GArc`, `GLine`, `GPolyline`, `GPolygon`,
  `GBezierCurve`, `GImage`, `GText`, `GCompoundPath`

约束：

- 非 `GGroup` 组件不允许 children（开发环境 warn 并忽略 children）。

### 3.4 props 设计（不暴露 mode/action）

#### 3.4.1 通用 props（示意）

通用字段尽量与 ECharts graphic option 对齐，但不暴露 `$action`：

- 布局：`left/right/top/bottom/width/height/bounding`
- transform：`x/y/rotation/scaleX/scaleY/originX/originY`
- 层级：`z/zlevel`
- 交互：`silent/draggable/cursor/ignore/invisible`
- 事件携带：`info`（用户数据，事件回调可读）
- 动画：`transition/enterFrom/leaveTo/enterAnimation/updateAnimation/leaveAnimation/keyframeAnimation`
- 其它：`focus/blurScope`（ECharts v5+）

#### 3.4.2 shape/style 扁平化 + raw 逃生舱

每个图元提供高频字段的扁平 props（例如 rect 的 `x/y/width/height/r`、circle 的 `cx/cy/r` 等），并提供：

- `shape?: Record<string, any>`：透传并与扁平字段合并
- `style?: Record<string, any>`：透传并与扁平 style 字段合并

### 3.5 事件（元素级 `@click`）

用户写法：

```vue
<GRect id="btn" :width="120" :height="40" fill="#5470c6" @click="onBtnClick" />
```

实现原则：

- 在生成的 graphic element option 上注入可路由的信息（基于 `info` 字段）。
- 运行时仅注册必要的 chart 事件监听，并将事件分发到对应元素的 handler。

## 4. 内部实现语义（概要）

### 4.1 主入口扩展点（不包含 graphic 逻辑）

`vue-echarts` 主入口提供 registry：

- `registerVChartExtension(extFactory)`
- 扩展可提供 `render()` 与 `patchOption()`

### 4.2 `vue-echarts/graphic` 子入口实现

子入口负责：

1. 导出 `G*` 声明组件（render null）
2. 注册 VChart 扩展：
   - `render()`：Teleport 到 detached root，展开 `#graphic` slot 并收集声明树
   - `patchOption()`：当 slot 存在时覆盖 `option.graphic`

### 4.3 正确性策略

- id 稳定：
  - 推荐用户显式 `id` 或在 `v-for` 提供稳定 `:key`（dev 下缺失时 warn）
  - 重复 id：dev warn，内部兜底降级（例如 replace-root）
- 删除：内部生成满足 ECharts 更新语义的补丁，保证旧元素不会残留。
- 结构变化（父子迁移等）：内部可降级（replace-root）确保正确性优先。

### 4.4 性能策略

- slot 变化触发更新时做批处理（microtask/RAF 合并）。
- 仅 patch `graphic`（而不是重放整个大 option）。
- 事件监听按需注册（只监听用户实际绑定的事件类型）。
