---
id: l-react-hooks
slug: react-hooks
title: Hooks 深入：useState、useEffect 与依赖数组
difficulty: 3
estMinutes: 85
tags: [React, Hooks, useEffect]
summary: Hooks 的纪律比 API 多：重渲染模型一条链（setX → 标脏 → 重跑 → diff）推出 useState 三纪律与 useEffect 依赖数组语义——主线做出可暂停的轮询定时器，并亲手做一次数据请求竞态实验。
updated: 2026-11-22
resources:
  - id: r-react-docs
    title: React 官方文档 · State 管理
    url: https://react.dev/learn/state-management
    type: doc
    difficulty: 2
    note: react.dev 新文档质量极高，本课三条纪律与其一一对应。
  - id: r-react-effects
    title: React 官方文档 · 同步使用 Effect
    url: https://react.dev/learn/synchronizing-with-effects
    type: doc
    difficulty: 2
    note: 依赖数组、清理函数与「Why Effects」的心智模型都在这章。
  - id: r-react-play
    title: React Playground（CodeSandbox）
    url: https://codesandbox.io/s/new
    type: tool
    difficulty: 1
    note: 网页里建一个 React 项目试运行本文示例。
---

> 一句话定义：`useState` 是组件的记忆、`useEffect` 是「跟着依赖数组变化重执行的副作用」——所有纪律都从重渲染模型一条链推出来：setX → 标脏 → 函数重跑 → diff → 最小更新 DOM。

## 概念讲解

### 把重渲染链条背牢，纪律都是推论

概览课立了总纲：React 组件 = 状态的函数，UI = f(state)。深入之前把完整链条过一遍：

```text
 调用 setCount(1)
    │ ① 标脏：把「该组件需要重新渲染」排进队列（不是立刻执行）
    ▼
 React 重跑整个组件函数（局部变量全新，返回一棵新的 JSX 树）
    │ ② diff：新旧两棵树对比，算出最小改动
    ▼
 把差异应用到真实 DOM → 页面更新
```

两个常被忽略的推论：

1. 组件函数里定义的普通变量**每次重跑都会重新初始化**；能在重渲染之间存活的，只有 useState 的值——这就是「state 是组件的记忆」的含义。
2. `setX` 是「申请重渲染」而不是「立即赋值」：set 之后马上读 state，读到的还是**本次渲染的旧快照**。

### useState 三条纪律（每条都有反例）

**纪律 1：state 只能通过 set 函数改。** 反例：直接 `count = 5` 或 `user.name = 'x'`——React 靠「set 被调用 + 新旧引用不同」判断要不要重渲染，绕过 set 的修改它根本看不见，页面纹丝不动。

**纪律 2：换新引用，不原地改。** 对象/数组 state 必须造出新副本：

```js
setTodos([...todos, newTodo])      // ✔ 新数组，引用变了 → 重渲染
todos.push(newTodo)                // ✘ 还是原来那个数组，React 认为「没东西变了」
setUser({ ...user, name: 'x' })    // ✔ 新对象
```

**纪律 3：新值依赖旧值时，用函数式更新。** `setCount(count + 1)` 里的 count 是本次渲染的快照——连续调用两次都基于同一快照，结果只 +1。函数式更新把「怎么算」交给 React 排队执行，`c` 永远是队列里的最新值：

```js
setCount(c => c + 1)               // ✔ 连续两次也生效：0 → 1 → 2
```

### useEffect 心智模型：一句话 + 三种形态

一句话：**「依赖数组里列的值变了，就在渲染后重新执行这段副作用」**。它既不是「只跑一次的初始化」也不是事件监听器——是每轮渲染后对照清单，清单项有变化就重跑。

| 写法 | 执行时机 | 典型用途 |
| ---- | ---- | ---- |
| 不写数组 | **每次渲染后**都执行 | 几乎不用（调试用） |
| `[]` | 挂载后执行一次，卸载时清理 | 只依赖外部世界的副作用（订阅一次、埋一次点） |
| `[a, b]` | 挂载后 + a 或 b 变化后的渲染 | 跟着数据走：取数、上报、重连 |

比较规则是 `Object.is`：基本值比内容，对象/数组比**引用**——所以「每次渲染都新建的对象字面量」放进依赖数组，每轮都算「变了」，effect 狂跑（坑 2 的根源）。

与 Vue 对照记忆：Vue 的 watch **自动追踪**你函数里用了什么；React 要求你**手动列清单**，漏列一项，effect 闭包里就永远是那轮渲染的旧值（闭包陷阱）。

### 清理函数与 StrictMode 双调用

effect 返回的函数就是**清理函数**，执行时机固定两处：**下次 effect 执行前**（先清上一轮）和**组件卸载时**。「借-还」配对因此成立：开了定时器就 clearInterval，订阅了就退订，fetch 了就 ignore（下一节）。

开发模式下 StrictMode 会把每个组件「挂载 → 执行 effect → 清理 → 再执行 effect」演练一遍（double-invoke）。这不是 bug，是**体检**：凡是没写清理的副作用（忘关的定时器、重复订阅）立刻暴露成两个定时器这类诡异现象。生产环境不会双调用，但清理纪律必须按「随时可能被拆了重来」来写。

### 数据请求标准骨架（含竞态防护）

请求的深坑是**竞态（race condition）**：先发慢请求 A，再发快请求 B；B 先回来渲染，A 后回来把页面**覆盖成旧数据**。标准骨架用 ignore 标志作废过期响应：

```js
useEffect(() => {
  let ignore = false                                    // 本轮 effect 的作废开关
  fetch(url).then((r) => r.json()).then((d) => {
    if (!ignore) setData(d)                             // 只有本轮还「活着」才写入
  })
  return () => { ignore = true }                        // 下轮开始/卸载时：本轮作废
}, [url])
```

为什么骨架天生防竞态：React 保证**先清理上一轮、再执行下一轮**——所以 id=3 那轮开始时，id=1 那轮的 ignore 已经被置 true，慢吞吞的旧响应即使回来也写不进 state。完整实验在代码示例里亲手做。

### useMemo / useCallback 一句话

`useMemo(() => 算, [deps])` 缓存计算结果，`useCallback` 缓存函数引用——只有当「这个值要放进别人的依赖数组」「计算确实昂贵」或「对象引用导致子组件反复重渲染」时才需要，别过早优化。它像 Vue 的 computed，但依赖清单要你手动列。

## 代码示例

主线任务：写一个**可暂停/继续的轮询定时器**组件（清理纪律 + 依赖数组语义），再用**数据请求标准骨架**做一次竞态实验。全程约 35 分钟，可直接粘进 CodeSandbox 运行。

### 第 0 步：轮询组件（暂停/继续）

```jsx
import { useState, useEffect } from 'react'

export default function Poller() {
  const [seconds, setSeconds] = useState(0)      // 组件的记忆
  const [running, setRunning] = useState(true)   // 暂停/继续开关

  useEffect(() => {
    if (!running) return                         // 暂停：本轮不借定时器
    const timer = setInterval(() => {
      setSeconds((s) => s + 1)                   // 函数式更新：永远基于最新值
    }, 1000)
    return () => clearInterval(timer)            // 借了必还：下轮 effect / 卸载前先清
  }, [running])                                  // running 变 → 清旧定时器、开新的

  return (
    <div>
      <p>已轮询 {seconds} 次</p>
      <button onClick={() => setRunning((r) => !r)}>
        {running ? '暂停' : '继续'}
      </button>
    </div>
  )
}
```

### 第 1 步：逐个动作，对答案

- 打开页面：每秒 +1，一切安静——`[running]` 让 effect 只在挂载后跑一次。
- 点「暂停」：running 变 false → React **先执行上一轮的清理**（clearInterval），再跑本轮 effect（直接 return，不借新的）→ 计数停住。定时器被换了一茬，你一行管理代码都没写——这就是「依赖变化 = 先还后借」。
- 点「继续」：同理，旧的无、新的开，从当前数字继续累加，不重置。
- 开着 StrictMode 看控制台：挂载瞬间 effect 执行两次、清理两次——双调用演练；因为每轮都有清理，定时器始终只有一个。若把 `return () => clearInterval(timer)` 删掉，开发模式立刻出现**两个**定时器、每秒 +2——体检报告当场送达。
- 把依赖数组 `[running]` 删掉再试：计数越走越快、控制台日志翻倍——每轮渲染都新建一个 setInterval，旧的没人清。亲手制造一次「泄漏」，比读十遍文档记得牢。

### 第 2 步：数据请求标准骨架 + 竞态实验

```jsx
import { useState, useEffect } from 'react'

function Profile({ userId }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let ignore = false                            // 本轮的作废开关
    setData(null)                                 // 切换目标先清旧数据，避免闪旧内容
    fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
      .then((r) => r.json())
      .then((d) => { if (!ignore) setData(d) })
    return () => { ignore = true }
  }, [userId])

  if (!data) return <p>加载中…</p>
  return <h2>{data.name}</h2>
}

export default function App() {
  const [userId, setUserId] = useState(1)
  return (
    <div>
      <button onClick={() => setUserId(3)}>慢：用户 3（约 3 秒）</button>
      <button onClick={() => setUserId(1)}>快：用户 1（约 0.5 秒）</button>
      <Profile userId={userId} />
    </div>
  )
}
```

为了做出「一慢一快」，给其中一个请求手动加延迟，或用浏览器 DevTools 的 Network 节流。实验步骤：

1. 点「慢：用户 3」，立刻点「快：用户 1」。
2. 0.5 秒后页面显示用户 1（快请求先到）。
3. 约 3 秒后慢请求返回——**页面仍是用户 1**：用户 3 那轮 effect 早已被清理（ignore=true），旧响应被丢弃。把 `if (!ignore)` 去掉再跑一遍，用户 3 的旧数据就会覆盖上来——竞态事故现场复现。

### 第 3 步（可选）：验证快照与函数式更新

```jsx
function onClick() {
  setN(n + 1)          // 基于本次渲染快照 n=0
  setN(n + 1)          // 还是基于 n=0 → 最终只 +1
  console.log(n)       // 打印 0：重渲染还没发生（纪律「set 不立即生效」）
}
```

两处都改成 `setN((v) => v + 1)` 后，n 正确变 2、console.log 仍是 0——三条纪律在四行代码里全部现身。

## 常见坑

1. **坑 1：依赖数组漏项**。现象：effect 里读到的 state 永远是旧值，取数参数停在初次值。原因：漏列的依赖让 effect 闭包捕获的是某一轮渲染的快照，之后再也不更新。排查：开启 ESLint 规则 `react-hooks/exhaustive-deps` 且别关掉它；确实想「只跑一次」的，函数式更新或 ref 兜住最新值。
2. **坑 2：对象/数组字面量放进依赖数组**。现象：effect 每轮渲染都执行，取数请求连发。原因：`useEffect(..., [{ id: 1 }])` 每次渲染都是**新对象**，Object.is 比较引用必然不等。排查：把依赖拆成基本值 `[id]`，或用 useMemo 稳定引用。
3. **坑 3：忘写清理函数**。现象：组件卸载后定时器还在跑、日志重复打印、开发模式下数量翻倍。原因：StrictMode 双调用放大了「只借不还」的 bug。排查：每个 useEffect 找「借」（setInterval/subscribe/addEventListener）是否配了「还」（clearInterval/退订/removeEventListener）。
4. **坑 4：set 之后立刻读 state**。现象：`setN(n + 1); console.log(n)` 打印旧值，以为 set 失效。原因：set 是「申请重渲染」，新值要到**下一轮渲染**才出现在变量里。排查：需要基于新值的逻辑写在函数式更新里，或用局部变量先算好再 set。
5. **坑 5：数组/对象原地修改**。现象：push 了、改了属性，界面不动。原因：引用没变，React 的 diff 认为「无变化」。排查：一律造新引用——展开运算符、`filter`/`map` 代替 push/ splice。
6. **坑 6：effect 里无条件 setState 又没写依赖数组**。现象：页面疯狂渲染、请求无限连发。原因：每次渲染后 effect 执行 → set → 触发新一轮渲染 → effect 再执行，自我喂养成死循环。排查：给依赖数组（通常 `[]`），或在 effect 里加条件只在真正需要时 set；反思这个「派生」是不是该在渲染期直接算（useMemo）而不是绕道 effect。

## 小练习

1. 把 Poller 改造成秒表：加 `start/stop/reset` 三个按钮——reset 时 `setSeconds(0)` 且不重启定时器；想清楚 reset 要不要进依赖数组。
2. 给 Poller 加「轮询满 10 次自动暂停」：`setSeconds((s) => s + 1)` 保持函数式更新，另用一个 `useEffect([seconds])` 判断 `seconds >= 10` 时 `setRunning(false)`。想清楚为什么这个判断不该塞进 setInterval 回调或 updater 里（副作用要放在 effect，而不是更新过程中），再动手。
3. 把 Profile 骨架接上真实接口（如 jsonplaceholder 的 users），连点「慢/快」按钮各 5 次，记录最终显示的是谁，并用「先清理再执行」的顺序解释原因。
4. **综合任务**：实现搜索防抖取数——`keyword` 输入框 + `useEffect([keyword])`；effect 里 `setTimeout(load, 300)` 且清理函数 `clearTimeout`，请求部分沿用 ignore 骨架。要求：快速输入一串字符只发**一次**请求、结果不串页，并说明每一处清理分别防的是什么（防抖抖动 / 竞态 / 卸载泄漏）。
