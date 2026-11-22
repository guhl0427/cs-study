---
id: l-vue-composition
slug: vue-composition
title: 组合式 API 深入：ref、computed 与 watch
difficulty: 3
estMinutes: 85
tags: [Vue, 组合式 API, computed, watch]
summary: 概览课只用过 ref 一招，本课把响应式三件主力补齐——ref 管数据、computed 管派生、watch 管副作用，讲透 computed 缓存机制、响应式丢失与清理纪律，最后写完一个购物车组件。
updated: 2026-11-22
resources:
  - id: r-vue-reactivity
    title: Vue 官方文档 · 响应式 API
    url: https://cn.vuejs.org/api/reactivity-core.html
    type: doc
    difficulty: 2
    note: ref/computed/watch 的权威参考，本课概念与其一一对应。
  - id: r-vue-watch
    title: Vue 官方文档 · 侦听器
    url: https://cn.vuejs.org/guide/essentials/watchers.html
    type: doc
    difficulty: 2
    note: watch 的 deep/immediate/多源监听细节都在这页。
  - id: r-vue-play
    title: Vue SFC Playground
    url: https://play.vuejs.org/
    type: tool
    difficulty: 1
    note: 网页里直接写 SFC 试运行本文示例。
---

> 一句话定义：组合式 API 的三件主力各管一事——`ref` 管**数据**、`computed` 管**派生值**、`watch` 管**副作用**；分工分清，逻辑就不会散落一地。

## 概念讲解

### 从计数器的天花板说起

概览课的计数器只用了一招：`ref()` 存数据，模板自动跟着变。真实项目马上会撞上另外两类需求：

- **派生值**：购物车里有条目列表，页面还要显示「总价」「折后价」「件数」——它们不是新数据，是**从现有数据算出来的**。
- **副作用**：数据变了之后要**做动作**——埋点上报、写 localStorage、重新取数。这些动作不产出页面用的值，属于「顺便要做的事」。

如果全用 ref 硬扛：每加一件商品就要手动重算总价、手动上报——同一份数据的同步逻辑散落各处，这正是「为什么需要框架」课批判过的手动同步。组合式 API 给出三件分工明确的工具：

### 三件主力分工表（先背这张表）

| 工具 | 管什么 | 典型写法 | 误用成别的会怎样 |
| ---- | ---- | ---- | ---- |
| `ref` | **原始数据**（会变的源头） | 条目列表、表单值、开关 | 派生值也用 ref 存 → 只能手动同步，改了 A 忘改 B |
| `computed` | **派生值**（数据算出来的） | 总价、过滤列表、格式化文案 | 拿它发请求/改数据 → 缓存机制让请求次数失控 |
| `watch` | **副作用**（变了之后做动作） | 埋点、持久化、取数 | 拿它手动更新另一个 ref → 回到自己写同步的老路 |

记忆锚点：**ref 是源、computed 是影、watch 是动作**。数据只存一份（ref），一切「算出来的」都写成 computed，「变了要做的事」才进 watch。

### ref：响应式是「包装」出来的

`ref(0)` 返回的不是 0，而是一个**响应式盒子** `{ value: 0 }`——Vue 通过拦截这个盒子的读写，追踪「谁在用这个值」。由此推出概览课见过的两条铁律：

1. **JS 里必须 `.value`**：`count.value++` 才有效；`count++` 改的只是局部变量，页面纹丝不动。
2. **模板里不写 `.value`**：模板自动解包，`{{ count }}` 直接用。

`ref` 包住对象/数组时，内部属性也会被代理，所以 `items.value.push(...)` 能触发更新；而**整体替换** `items.value = newList` 同样有效、语义更清晰，本课示例统一用整体替换。

### computed：缓存是核心，也解释了「为什么不能发请求」

```text
   items ──┐
           ├──→ computed: total（记住了自己依赖 items 和 coupon）
   coupon ─┘
```

computed 的工作方式：**第一次被用到才算**，算完缓存结果，同时记下「我依赖了哪些数据」。之后：

- 依赖没变 → 谁再问它，直接吐缓存，**连函数体都不执行**；
- 依赖变了 → 缓存作废，**下次被用到时**才重算（惰性，不是立刻）。

这就是「不要在 computed 里发请求」的原理。请求是一种**副作用**（占带宽、动服务器、有成本），而 computed 的承诺是「依赖不变就绝不执行」。两者拼在一起：模板里 3 处用到它，请求可能连发 3 次也可能只发 1 次——**次数不可控**；依赖没变时**永远无法手动重试**；报错了也没有干净的时机重跑。正确姿势：请求这个「动作」交给 watch 或事件处理函数；请求的**结果**才是数据，取回后写进 ref，派生值再用 computed 从 ref 算。

### watch：显式声明「跟着谁、做什么」

`watch(数据源, 回调, 选项)` 三个位置各有一个考点。**数据源**必须是响应式引用或 getter 函数；多源监听用数组，回调按序拿到新旧两组值——埋点上报「从多少变到多少」全靠第二组：

```js
watch([items, coupon], ([newItems, newCoupon], [oldItems, oldCoupon]) => {
  console.log('条目或折扣变了')
})
```

**选项**是坑最多的地方：

| 选项 | 默认 | 打开后的行为 | 什么时候加 |
| ---- | ---- | ---- | ---- |
| `deep` | false | 递归跟踪对象**内部**变化 | 监听整个对象、改的是内部属性时 |
| `immediate` | false | 声明后**立即先执行一次**回调 | 回调承担初始化动作时 |
| `once` | false | 触发一次后自动停止 | 一次性提示、首访埋点 |

### 响应式丢失：解构 props 是重灾区

props 是响应式对象，但它的**单个属性**被解构出来后就成了普通值。记忆口径：**响应式属于「容器」，不属于「里面的值」**——一旦把值从容器里倒出来（解构、取出、当普通参数传走），响应性就断了：

```js
const props = defineProps(['userId'])
watch(() => props.userId, ...)  // ✔ 仍是响应式：getter 每次都去找 props 要新值
const { userId } = props
watch(userId, ...)              // ✘ userId 只是当时的数字快照，从此不再更新
const { userId } = toRefs(props)  // ✔ userId 变成 ref，跟着 props 一起变
```

需要「始终指向某属性的响应式引用」用 `toRef`；需要「整组属性保持响应式」就用上面的 `toRefs`。

### 生命周期三钩子与清理纪律

组合式 API 里最常用的三个时机钩子：

| 钩子 | 时机 | 典型用途 |
| ---- | ---- | ---- |
| `onMounted` | 组件首次渲染进页面后 | 发首个请求、启动定时器、测 DOM 尺寸 |
| `onUnmounted` | 组件被移除后 | **清理**：停定时器、解绑监听、断开订阅 |
| `onUpdated` | 因数据变化重新渲染后 | 调试观察为主，业务逻辑尽量别放这里 |

清理纪律是重点：凡在 `onMounted` 里「向外借了东西」（定时器、事件监听、WebSocket），都要在 `onUnmounted` 里**归还**——组件会被反复创建销毁，每次进来开一个定时器却从不关，内存里就攒下一堆无人管理的定时器，页面越用越卡。

### 把三件主力拼成一条数据流

```text
 ref(items) ──┬─→ computed(total/payable) ──→ 模板显示
              │          │（payable 变化）
              └─→ watch(payable) ──────────→ 埋点上报（副作用）
 onMounted ────────────────────────────────→ 取数写回 items（数据源就位）
 onUnmounted ──────────────────────────────→ 清理定时器/监听（归还资源）
```

判断一段逻辑放哪，问三个问题：这个值是「算出来的」吗？→ computed。是「变了之后要做的事」吗？→ watch。都不是、只是要存的数据？→ ref。**三问定归属**，本课代码示例全程按这个口径走。

## 代码示例

主线任务：写一个**购物车组件** `CartPanel.vue`——条目与优惠券是数据（ref），原价/应付/件数是派生值（computed），应付变化要上报埋点（watch），挂载时取数、卸载时清理（生命周期）。做完它，「三问定归属」应能脱口而出。全程约 30 分钟，可整段粘进 SFC Playground 运行。

### 第 0 步：数据与派生值的骨架

```vue
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const items = ref([])        // 数据：购物车条目
const coupon = ref(0.9)      // 数据：折扣券，0.9 表示九折
const loading = ref(false)   // 数据：加载状态

// 派生值 1：原价合计 = Σ(单价 × 数量)
const total = computed(() =>
  items.value.reduce((sum, it) => sum + it.price * it.qty, 0)
)
// 派生值 2：应付 = 原价 × 折扣，保留两位
const payable = computed(() => (total.value * coupon.value).toFixed(2))
// 派生值 3：件数——同一份依赖、各算各的派生
const count = computed(() => items.value.reduce((s, it) => s + it.qty, 0))
</script>

<template>
  <div>
    <p v-if="loading">加载中…</p>
    <ul v-else>
      <li v-for="it in items" :key="it.id">
        {{ it.name }} × {{ it.qty }} = ¥{{ (it.price * it.qty).toFixed(2) }}
      </li>
    </ul>
    <p>共 {{ count }} 件 | 原价 ¥{{ total.toFixed(2) }} | 应付 ¥{{ payable }}</p>
    <label>折扣
      <select v-model.number="coupon">
        <option :value="1">无折扣</option>
        <option :value="0.9">九折</option>
        <option :value="0.8">八折</option>
      </select>
    </label>
    <button @click="addOne">加购一件机械键盘</button>
  </div>
</template>
```

`addOne` 与取数逻辑下面两步补齐。注意模板同时用了三个 computed——它们共享 `items` 这一份依赖，却各自缓存、各自失效。

### 第 1 步：watch 负责副作用——应付变了就上报

继续在 `<script setup>` 里追加：

```js
// 副作用：应付金额变化 → 上报埋点（真实项目里换成埋点 SDK 调用）
watch(payable, (now, before) => {
  console.log(`[埋点] 应付从 ¥${before} 变为 ¥${now}`)
})
// immediate 版：初始化时也要先上报一次当前应付（多个 watch 监听同一源互不干扰）
watch(payable, (now) => console.log(`[埋点·immediate] 初始应付 ¥${now}`), {
  immediate: true,
})
```

### 第 2 步：事件里改数据，挂载取数、卸载清理

```js
function addOne() {
  const kb = items.value.find((it) => it.id === 'kb')
  if (kb) kb.qty += 1
  else items.value.push({ id: 'kb', name: '机械键盘', price: 199, qty: 1 })
  // 只改 items —— total/payable/count 会怎样？全都不用你管
}

let timer = null   // 定时器 id 不需要在页面显示，普通变量即可，别滥用 ref

onMounted(() => {
  loading.value = true
  const data = [                       // 真实项目：await fetch('/api/cart')
    { id: 'mouse', name: '无线鼠标', price: 99, qty: 2 },
    { id: 'pad', name: '桌垫', price: 39, qty: 1 },
  ]
  setTimeout(() => {
    items.value = data                 // 整体替换数据源
    loading.value = false
  }, 500)
  timer = setInterval(() => console.log('轮询购物车…'), 3000)  // 借出定时器
})

onUnmounted(() => {
  clearInterval(timer)                 // 卸载时归还
  console.log('[清理] 定时器已停止')
})
```

一个细节值得注意：`timer` 用的是**普通 `let` 变量而不是 ref**——只有「要在页面里显示、要触发更新」的值才配响应式包装；定时器 id 这类纯内部变量，包装反而徒增 `.value` 噪音。

### 第 3 步：逐个交互，对答案

**打开页面（挂载）**，控制台与页面依次出现：

```text
[埋点·immediate] 初始应付 ¥0.00      ← immediate 在数据到达前先跑了一次
轮询购物车…                           ← onMounted 的定时器启动
（约 500ms 后）[埋点] 应付从 ¥0.00 变为 ¥213.30
```

页面渲染 `共 3 件 | 原价 ¥237.00 | 应付 ¥213.30`（鼠标 99×2 + 桌垫 39，再乘九折）。注意：**没有一行代码「更新总价」**——items 替换 → total 重算 → payable 重算 → 模板更新，全部由依赖关系自动驱动。

**把折扣切到八折**：控制台打印 `[埋点] 应付从 ¥213.30 变为 ¥189.60`。只改了 `coupon` 一个数据——`total` 依赖没动（连函数都没执行），`payable` 重算，watch 触发。若走「在 change 事件里手动重算应付」的路线，你得自己保证 total、count 一个不漏，computed 把这份负担全免了。

**点「加购一件机械键盘」**：控制台打印 `[埋点] 应付从 ¥189.60 变为 ¥348.80`（即 (237+199) × 0.8），条目多一行、件数变 4——改一次数据，三处派生与模板同时就位。

**离开页面（卸载）**：控制台打印 `[清理] 定时器已停止`；再进再出，「轮询购物车…」始终只有一组——清理纪律生效。想练多源监听与 deep，就用第 1 步的写法扩展：`watch([items, coupon], ...)` 与 `watch(settings, ..., { deep: true })`。

## 常见坑

1. **坑 1：JS 里忘写 `.value`**。现象：改了数据页面不动；`count + 1` 得到 `"[object Object]1"`。原因：ref 在 JS 中是盒子，直接操作盒子或把盒子当数字用都不生效。排查：不更新时先搜赋值处有没有漏 `.value`；`console.log(count)` 打印出盒子而非值即是此坑。
2. **坑 2：在 computed 里发请求/改数据**。现象：请求有时连发多次、有时不发、想重试重不动。原因：computed 惰性+缓存，执行次数取决于「被用到几处」，依赖不变就永不重算。排查：把「做动作」的代码移进 watch 或事件函数，computed 里只留纯计算。
3. **坑 3：watch 对象没加 deep，或对大对象乱加 deep**。现象：改 `obj.value.inner.x` 回调不触发；或给大列表加 deep 后回调狂触发、页面卡顿。原因：默认只比较引用，内部变化看不见；deep 则递归全量跟踪，大对象开销大。排查：确要监听内部属性，优先用 getter 精准监听 `watch(() => obj.value.inner.x, ...)`，比 deep 便宜且明确。
4. **坑 4：解构 props 丢响应式**。现象：`const { id } = defineProps(...)` 之后页面不再随 props 更新。原因：解构把值从响应式容器倒了出来，只剩当时的快照。排查：改用 `toRefs(props)` 再解构，或始终以 `props.id` 方式访问。
5. **坑 5：watch 回调里改自己监听的数据**。现象：无限循环或控制台警告。原因：回调改源 → 源变化再触发回调，自我喂养。排查：回调只做「外部动作」不改源；确要联动就改**另一个**源，或者反思这层关系是不是该用 computed 表达。
6. **坑 6：定时器/监听只借不还**。现象：组件反复进出后越来越卡、日志重复打印、接口轮询停不下来。原因：onMounted 创建的资源在组件销毁后仍在运行。排查：逐条核对 onMounted 里「借」的东西，在 onUnmounted 里 clearInterval / removeEventListener / close 归还；用 StrictMode 或反复进出页面来复现验证。

## 小练习

1. 给购物车补一个 `freeShipping = computed`（应付满 99 元免运费，返回布尔），显示到模板；在 computed 里临时加一行 `console.log('算运费')`，验证「切换折扣时它不重算、加购时才重算」——亲手确认缓存机制。
2. 用**多源 watch** 同时监听 `count` 与 `payable`，任一变化打印「车况变化：N 件 / ¥M」，并用 `immediate` 让它挂载即打印一次初始车况。
3. 把 `coupon` 改成由父组件通过 props 传入：先试 `const { coupon } = props`，观察切档后应付不动；再换 `toRefs(props)` 修复，写出一句原因。
4. **综合任务**：把购物车升级为「可搜索」——加 `keyword` ref 和搜索框；`filtered = computed` 按 name 过滤条目并用于渲染；`watch(keyword)` 打印「上报搜索词」；保留 onMounted 取数与 onUnmounted 清理。硬性要求：全组件**不允许出现任何「手动重算/手动更新另一个 ref」的代码**——凡是算出来的都进 computed，凡是动作都进 watch。
