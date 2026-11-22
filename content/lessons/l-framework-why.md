---
id: l-framework-why
slug: framework-why
title: 为什么需要框架：从手写 DOM 到声明式
difficulty: 2
estMinutes: 70
tags: [框架, 前端]
summary: 手写 JS 维护「数据→页面」的同步会失控——框架用声明式 UI 与组件化接管同步，跟着把同一个小应用用原生和框架各写一遍，亲眼看差异。
updated: 2026-11-22
resources:
  - id: r-why-framework
    title: Vue 官方 · 为什么不用 DOM 查询 API
    url: https://cn.vuejs.org/guide/exessentials/reactivity-fundamentals.html
    type: doc
    difficulty: 1
    note: 框架动机的官方说明。
  - id: r-todomvc
    title: TodoMVC（同一应用的各框架实现）
    url: https://todomvc.com/
    type: tool
    difficulty: 1
    note: 同一个待办应用在十几种框架下的源码对照，框架学习的圣地。
---

> 一句话定义：前端框架解决的核心问题只有一个——**数据变了，页面怎么跟着变**；它把「手动同步 DOM」升级为「声明式描述 + 自动同步」，并用组件化让代码可复用。

## 概念讲解

**从三件套课程的痛点说起。** DOM 课的待办应用里，每次数据变化你都要手动调 `render()`；事件课里你要小心「监听别重复绑」。数据一多、交互一复杂，会暴露两类失控：

1. **同步散弹**：一个数据可能在 5 处显示（列表、计数、汇总、徽章、标题），改数据后要记得手动更新 5 处——漏一处就是 bug，而且这类 bug 不报错、只是显示错；
2. **状态与 DOM 双写**：真实状态存在数据里，但页面上的 class、文本也可能被你直接改过——两份「真相」渐渐不一致，没人说得清页面当前到底是什么状态。

**框架的答案：声明式 UI（UI = f(state)）**。你不再写「怎么改页面」，只声明「页面长什么样是这个状态的函数」——状态一变，框架自动算出 DOM 要怎么改：

```text
手写：数据变 → 你写代码找到 DOM → 手动改 N 处（会漏）
框架：数据变 → 框架重新计算 UI 描述 → 自动 diff 出最小改动 → 应用到 DOM（不漏）
```

React 与 Vue 只是「声明式」的两条实现路径（React 重跑组件函数再 diff，Vue 靠响应式追踪依赖精准更新——框架深入课展开），世界观一致。

**第二个支柱：组件化。** 把页面拆成独立小单元（每个 = 结构 + 逻辑 + 样式），组件像乐高一样拼装复用：

```text
页面 = <Header/> + <TodoList/> + <TodoItem/>×N + <Footer/>
TodoItem 在列表里写一次，渲染一百次；改它一处，一百处生效
```

组件还带来**命名空间式的隔离**——每个组件管自己那块页面，状态放哪、谁负责更新，边界清晰。

**框架不是必需品**：页面交互极简（几个静态页）用原生 JS 更轻；一旦「同一数据多处显示 + 频繁交互 + 需要复用 UI」，框架的收益就压倒成本。判断标准：**手动同步 DOM 的代码是否已经开始重复**。

## 代码示例

主线：同一个「计数器 + 历史记录」小应用，原生 JS 与 Vue 各写一遍，亲眼对比：

**版本 1：原生 JS（三件套的姿势）**：

```html
<div>
  <button id="plus">+1</button>
  <p>当前：<span id="count">0</span></p>
  <p>历史：<span id="history">[]</span></p>
</div>
<script>
  let count = 0
  const history = []

  document.querySelector("#plus").addEventListener("click", () => {
    count += 1
    history.push(count)
    // ⚠️ 手动同步：每个显示数据的地方都要记得改——漏一处就 bug
    document.querySelector("#count").textContent = count
    document.querySelector("#history").textContent = JSON.stringify(history)
  })
</script>
```

**版本 2：Vue 3（同一需求）**：

```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
const history = ref([])
</script>

<template>
  <button @click="plus">+1</button>
  <p>当前：{{ count }}</p>
  <p>历史：{{ history }}</p>
</template>

<script>
// 上面模板里的 plus：
// function plus() { count.value += 1; history.value.push(count.value) }
// 没有 querySelector，没有手动同步——数据变了，两处显示自动更新
</script>
```

差异一目了然：**原生版每加一个显示位置就要加一行手动同步代码；Vue 版模板只是「声明显示什么」，加显示位置零额外成本**。这个示例只有 1 个状态、2 处显示——真实项目里是 50 个状态、300 处显示，手动同步直接失控。

## 常见坑

1. **坑 1：把「学框架」当成「背语法」**。框架语法只占 20%，剩下 80% 是组件化思维（怎么拆组件、状态放哪、父子怎么通信）——语法三天，思维三个月。
2. **坑 2：三件套不牢就上框架**。分不清「框架的功劳」和「JS 本身的能力」——出了问题不知道该查框架还是查 JS。先用原生写过待办应用（三件套课的主线），再学框架。
3. **坑 3：框架全能论**。框架管「数据→视图」同步，不管请求设计、不管 CSS 架构、不管业务逻辑分层——那些是软件工程课的内容。
4. **坑 4：在小项目里硬上框架**。三个静态页引 Vue + 构建工具是负收益——框架的成本（学习/构建链/包体积）要靠交互复杂度赚回来。

## 小练习

1. 跑通两个版本的计数器，然后给两个版本同时加一个需求：「点击按钮时按钮要禁用 0.5 秒防连点」——观察哪个版本改起来更分散。
2. 在 TodoMVC 上找 Vue 和 React 两个实现，对照它们的源码结构（入口/组件划分/状态放哪），写下三点异同。
3. 综合任务：给原生版计数器再加两个状态（步长、步长历史），体验手动同步的扩散成本，并记录你加了几行「同步代码」。
4. 思考题：为什么说「框架把复杂度从代码里转移到了框架内部」？这个交换什么时候划算？
