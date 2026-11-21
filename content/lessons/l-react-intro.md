---
id: l-react-intro
slug: react-intro
title: React 初识
difficulty: 2
estMinutes: 25
tags: [React, 框架]
summary: React 的世界观是「UI = f(state)」——界面是状态的函数；用 JSX 写结构，用 useState 管状态。
updated: 2026-11-21
resources:
  - id: r-react-doc
    title: React 官方文档（中文）
    url: https://zh-hans.react.dev/learn
    type: doc
    difficulty: 2
    note: 新版官方文档质量很高，「描述 UI」一章直击心智模型。
  - id: r-react-play
    title: React Playground
    url: https://stackblitz.com/edit/react-ts
    type: tool
    difficulty: 1
    note: 在线环境，本节示例可粘贴运行。
---

> 一句话定义：React 认为界面就是状态的函数——状态一变，整个函数重跑一遍，React 负责算出页面最小改动。

## 概念讲解

Vue 和 React 解决同一个问题（数据与视图的同步），但路径不同：

- **Vue**：模板 + 响应式。数据被「追踪」，哪个数据变了就精准更新对应位置。
- **React**：函数 + 重渲染。状态变了，**整个组件函数重新执行**，React 对比前后两次结果（Virtual DOM diff），只把变化的部分写进真实 DOM。

听起来 React 更「笨重」？代价换来的是极致的简单心智：**UI = f(state)**，界面永远等于状态算出来的结果，不存在「忘了同步」这类 bug。

两个核心概念：

1. **JSX**：在 JS 里直接写 HTML。它不是字符串，是函数调用（`<h1>` 编译后是 `React.createElement('h1', ...)`），所以可以配合变量、条件、循环。
2. **useState**：组件的记忆。普通变量在函数重跑时会被重置，只有 `useState` 的值能在重渲染之间存活。

```
setState(新值) → 组件函数重跑 → 新的 UI 描述 → diff → 最小 DOM 更新
```

## 代码示例

React 版计数器（粘贴进 Playground 运行）：

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>点我 +1</button>
      <p>当前次数：{count}</p>
    </div>
  );
}

export default Counter;
```

注意「单向」味道：你从不直接改 `count`，只能调 `setCount` 申请新值，函数重跑后界面自然更新。列表渲染用 `map` + `key`：

```jsx
{todos.map((todo) => (
  <li key={todo.id}>{todo.text}</li>
))}
```

## 常见坑

1. **坑 1：直接改状态**。`count += 1` 或 `arr.push(x)` 都不触发重渲染（React 对比的是引用）。必须用 `setCount(count + 1)`、`setArr([...arr, x])` 创建新值。
2. **坑 2：忘了 `key`**。列表渲染不写 key，React 用下标猜身份，增删项时会出现「内容错位」。key 用稳定 id，不用数组下标。
3. **坑 3：函数名大小写**。JSX 里 `<counter/>` 会被当成 HTML 标签，组件必须首字母大写 `<Counter/>`。

## 小练习

1. 复现计数器，并加一个「每次 +2」按钮，体会「只调 setXxx、不直接改值」的纪律。
2. 渲染一个 5 项的 todo 列表，给每项配稳定 `key`，然后删除第 2 项观察界面。
3. 对比题：同样的计数器，Vue 靠什么知道「只更新那一处 DOM」？React 又靠什么？一句话说清两者机制差异。
