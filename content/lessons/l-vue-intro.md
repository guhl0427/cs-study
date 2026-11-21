---
id: l-vue-intro
slug: vue-intro
title: Vue 3 初识
difficulty: 2
estMinutes: 25
tags: [Vue, 框架]
summary: Vue 用「响应式数据 + 模板」让页面跟着数据自动变——体会声明式渲染与原生 DOM 操作的本质区别。
updated: 2026-11-21
resources:
  - id: r-vue-doc
    title: Vue 3 官方文档（中文）
    url: https://cn.vuejs.org/guide/introduction.html
    type: doc
    difficulty: 2
    note: 中文文档质量极高，官方指南就是最好的教程。
  - id: r-vue-play
    title: Vue SFC Playground
    url: https://play.vuejs.org/
    type: tool
    difficulty: 1
    note: 在线写组件即时预览，本节示例可直接粘贴运行。
---

> 一句话定义：Vue 把「数据」和「页面」绑定在一起——你只改数据，DOM 自动跟着变。

## 概念讲解

回忆上一课的计数器：改了 `count` 之后要**手动**调用 `render()` 把数字写回页面。数据一多，「手动同步」就成了灾难——漏一处就是 bug。

Vue 的解法叫**响应式**：把数据放进 `ref()`，模板里直接用。数据一变，Vue 自动找出哪些页面位置依赖它并更新。对比一下：

```js
// 原生：改数据 → 手动改 DOM（两步，会漏）
count.value += 1;

// Vue：只改数据（一步，DOM 自动对齐）
count.value += 1;
```

核心组件是 **SFC**（Single-File Component，单文件组件）：一个 `.vue` 文件 = 结构（`<template>`）+ 逻辑（`<script setup>`）+ 样式（`<style scoped>`），一个组件管自己那一块页面。`scoped` 让样式只作用于本组件——不用再担心类名冲突。

组合式 API 三个高频 API：`ref`（声明响应式数据）、`computed`（由数据算出来的值，自动缓存）、`onMounted`（组件挂载后执行的钩子）。本节只需要 `ref`。

## 代码示例

同样是计数器，Vue 版本（可粘贴进 Playground 运行）：

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count += 1">点我 +1</button>
  <p>当前次数：{{ count }}</p>
</template>

<style scoped>
button {
  padding: 8px 16px;
}
</style>
```

对比原生版本省掉了什么：没有 `querySelector`，没有 `addEventListener`，没有手动 `render()`。`{{ count }}` 是插值——数据到视图的桥。`@click` 是事件绑定——用户动作到逻辑的桥。

**什么时候学框架？** 能用原生 JS 独立写完一个小项目（列表增删、表单提交、本地存储）再学框架，否则你分不清「框架的功劳」和「JS 本身的能力」。

## 常见坑

1. **坑 1：忘了 `.value`**。`ref()` 包出来的数据在 **JS 里**要 `count.value` 访问，但在**模板里**不用（自动解包）。症状：界面显示一串对象而不是数字。排查：打印时忘了 `.value`。
2. **坑 2：把「学框架」当成「学 Vue 语法」**。框架语法只占 20%，剩下 80% 是组件化思维：怎么拆组件、状态放哪、父子怎么通信。语法三天，思维三个月。
3. **坑 3：在 `<script setup>` 里直接改 props**。props 是只读的，子组件想改外部数据应该「发事件」让父组件改。

## 小练习

1. 在 Playground 里复现计数器，再加一个「清零」按钮。
2. 加一个 `<input v-model="name">` 和 `<p>你好，{{ name }}</p>`，体会双向绑定。
3. 思考题：如果页面要同时显示「总数」和「未完成数」，两者都由同一个任务数组算出来——该用 `ref` 还是 `computed`？为什么？
