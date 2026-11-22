---
id: l-vue-composition
slug: vue-composition
title: 组合式 API 深入：ref、computed 与 watch
difficulty: 3
estMinutes: 45
tags: [Vue, 组合式 API]
summary: 框架概览只用了 ref 一招——这一课把响应式的三件主力补齐：computed 管派生、watch 管副作用、生命周期管时机。
updated: 2026-11-22
resources:
  - id: r-vue-reactivity
    title: Vue 官方文档 · 响应式 API
    url: https://cn.vuejs.org/api/reactivity-core.html
    type: doc
    difficulty: 2
    note: ref/computed/watch 的权威参考。
  - id: r-vue-play
    title: Vue SFC Playground
    url: https://play.vuejs.org/
    type: tool
    difficulty: 1
    note: 网页里直接写 SFC 试运行本文示例。
---

> 一句话定义：组合式 API 的三件主力各管一事——`ref` 管**数据**、`computed` 管**派生值**、`watch` 管**副作用**，分工分清就不乱。

## 概念讲解

概览课说过：数据放进 `ref()`，模板自动跟着变。真实项目里还有两类需求：**由数据算出来的值**（已完成数、过滤后的列表）和**数据变化后要做的动作**（存 localStorage、请接口）。对应两个 API：

| API | 管什么 | 关键特征 |
| ---- | ---- | ---- |
| `ref` | 原始数据 | 你改它，别的东西跟着动 |
| `computed` | 派生值 | **只读**、带缓存——依赖不变就不重算 |
| `watch` | 副作用 | 数据变了「顺便做某事」，不产出值 |

`computed` 的缓存是它的核心价值：同一个 computed 在模板里出现 10 处，依赖没变就只算一次。而且它**强迫你声明依赖**——函数里用了什么数据一目了然。

`watch` 最容易踩的坑是「拿它当 computed 用」：能在模板里直接用 computed 表达的逻辑，就别写进 watch 手动更新另一个 ref——那等于回到了「手动同步」的老路（框架概览第一课批过的）。

生命周期钩子记三个就够：`onMounted`（挂载后，适合取数据/操作 DOM）、`onUnmounted`（卸载前，清理定时器/事件监听）、`onUpdated` 一句带过。

## 代码示例

一个「购物车」组件把三件主力全用上（可粘贴进 Playground）：

```vue
<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const items = ref([])                       // 数据：购物车条目
const coupon = ref(1)                       // 数据：折扣系数

const total = computed(() =>                // 派生：总价（依赖变了才重算）
  items.value.reduce((s, it) => s + it.price * it.count, 0)
)
const payable = computed(() => total.value * coupon.value)

watch(payable, (val) => {                   // 副作用：金额变化时上报
  console.log('应付金额变化:', val.toFixed(2))
})

onMounted(() => {                           // 时机：挂载后取初始数据
  items.value = [
    { title: '键盘', price: 199, count: 1 },
    { title: '鼠标垫', price: 39, count: 2 },
  ]
})
</script>

<template>
  <p v-for="it in items" :key="it.title">{{ it.title }} × {{ it.count }}</p>
  <p>合计：{{ total }}，券后：{{ payable.toFixed(2) }}</p>
  <button @click="coupon = 0.8">打八折</button>
</template>
```

运行观察：点「打八折」只触发 `payable` 的重算和 watch——`total` 依赖没变，缓存生效。

## 常见坑

1. **坑 1：忘了 `.value`**。`<script>` 里读改 ref 必须 `items.value`，模板里不用（自动解包）——解构丢响应式同理：`const { count } = props` 之后 props 变了你看不见，要保留响应式得用 `toRef`/`computed` 包一层。
2. **坑 2：在 computed 里发请求/改数据**。computed 必须是纯计算——副作用写进去会被缓存机制坑（不触发或重复触发），那是 watch 的活。
3. **坑 3：watch 一个对象不深度监听**。`watch(items, ...)` 只在引用变化时触发；整棵树内部字段变了要 `{ deep: true }`，或者直接 watch 具体字段的 getter。
4. **坑 4：onUnmounted 不清理**。onMounted 里开的定时器、加的事件监听，卸载不清就是内存泄漏——「set 和 clear 永远成对」。

## 小练习

1. 扩展示例：加一个「只看已加购商品」的开关（ref），用 computed 产出过滤列表，观察 watch 在切换时是否触发。
2. 把 watch 改成「保存购物车到 localStorage」的副作用，并写出 onUnmounted 里不该有什么。
3. 思考题：为什么说「能用 computed 就别用 watch + 手动同步」？用「手动同步」在概览课里的教训说明。
