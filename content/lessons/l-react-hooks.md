---
id: l-react-hooks
slug: react-hooks
title: Hooks 深入：useState、useEffect 与依赖数组
difficulty: 3
estMinutes: 45
tags: [React, Hooks]
summary: Hooks 的纪律比 API 多：state 只能通过 set 函数换新、useEffect 靠依赖数组声明「跟着谁变」——理解重渲染模型就全通了。
updated: 2026-11-22
resources:
  - id: r-react-docs
    title: React 官方文档 · State 管理
    url: https://react.dev/learn/state-management
    type: doc
    difficulty: 2
    note: react.dev 的新文档质量极高，本节思路与其一致。
  - id: r-react-play
    title: React Playground（CodeSandbox）
    url: https://codesandbox.io/s/new
    type: tool
    difficulty: 1
    note: 网页里建一个 React 项目试运行本文示例。
---

> 一句话定义：`useState` 是组件的记忆、`useEffect` 是「跟着状态变化做事」的钩子——纪律全在「重渲染模型」里：状态变 → 函数重跑 → 副作用按依赖数组重执行。

## 概念讲解

概览课立了总纲：React 组件 = 状态的函数，UI = f(state)。深入之前把重渲染模型背牢：

```text
调用 setState → React 标记组件「脏」→ 下一次 tick 重跑整个函数
             → 对比前后两次的 UI 描述（diff）→ 只把差异写进真实 DOM
```

**useState** 的三条纪律：

1. 只能通过 `setCount(...)` 换值，直接改变量不触发重渲染（概览课的坑 1）；
2. 必须给**新值**：`setArr([...arr, x])` 而不是 `arr.push(x)`——React 靠引用不同判断「变没变」；
3. set 的新值若基于旧值，用函数式更新 `setCount(c => c + 1)`——避免连续 set 拿到旧值。

**useEffect** 的心智模型一句话：**「依赖数组里列的值变了，就把这段副作用重新执行一遍」**。空数组 `[]` = 只在挂载后跑一次；不写数组 = 每次渲染都跑（慎用）。返回的函数是「清理」：下次重执行前、卸载时自动调用——定时器/订阅的关闭都靠它。

React 18 的 StrictMode 会在开发模式故意 double-invoke，所以 useEffect **必须幂等且带清理**，否则会出现两个定时器这类诡异现象。

## 代码示例

一个带轮播定时器的组件，覆盖三条纪律 + 清理：

```jsx
import { useState, useEffect } from 'react';

function Poller() {
  const [seconds, setSeconds] = useState(0);      // 组件的记忆
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;                          // 暂停时不订阅
    const id = setInterval(() => {
      setSeconds(s => s + 1);                      // 函数式更新：基于最新值
    }, 1000);
    return () => clearInterval(id);                // 清理：重执行/卸载前先关旧的
  }, [running]);                                   // running 变了 → 关旧定时器开新的

  return (
    <div>
      <p>已运行 {seconds} 秒</p>
      <button onClick={() => setRunning(r => !r)}>
        {running ? '暂停' : '继续'}
      </button>
    </div>
  );
}
```

数据请求的标准骨架（挂载后取一次）：

```jsx
useEffect(() => {
  let ignore = false;                              // 防竞态：旧请求晚到不覆盖新结果
  fetch(`/api/course/${slug}`)
    .then(r => r.json())
    .then(data => { if (!ignore) setCourse(data); });
  return () => { ignore = true; };
}, [slug]);                                        // slug 变了重新请求
```

## 常见坑

1. **坑 1：依赖数组漏写**。effect 里用了 `slug` 却写 `[]`，请求永远停在初次值——ESLint 的 exhaustive-deps 规则会报错，别关掉它。
2. **坑 2：effect 里手动同步状态**。「A 变了就在 effect 里 setB(算 A)」是反模式——B 应该在**渲染期间**直接由 A 算出（或 useMemo），多一个 effect 多一份竞态风险。
3. **坑 3：不清理定时器/订阅**。组件卸载后回调还在跑，还可能 setState 到已卸载组件上。清理函数与创建永远成对。
4. **坑 4：把「对象属性变了」当没变**。`setUser({...user, name: '新'})` 才触发重渲染；`user.name = '新'` 引用没变，React 什么也不做——和概览课的数组坑同根。

## 小练习

1. 复现 Poller 并解释：为什么 `setSeconds(s => s + 1)` 换成 `setSeconds(seconds + 1)` 在多计时器场景会出错？
2. 给请求骨架加「slug 快速切换」的按钮连点，用 ignore 标志观察竞态防护是否生效。
3. 思考题：对照 Vue 的 `watch`——React 没有 watch 这个 API，「数据变了做某事」为什么用 effect + 依赖数组表达？两者模型差在哪？
