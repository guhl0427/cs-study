---
id: l-react-intro
slug: react-intro
title: React 初识：UI 是状态的函数
difficulty: 2
estMinutes: 80
tags: [React, 框架]
summary: React 认为「界面 = 状态算出来的结果」——JSX、useState 与重渲染模型，与 Vue 对照着学，把同一个待办应用再写一遍。
updated: 2026-11-22
resources:
  - id: r-react-doc
    title: React 官方文档（react.dev）
    url: https://zh-hans.react.dev/learn
    type: doc
    difficulty: 1
    note: 官方 Learn 区是业界最佳教程，本课平行阅读。
  - id: r-react-play
    title: CodeSandbox（React 模板）
    url: https://codesandbox.io/s/new
    type: tool
    difficulty: 1
    note: 浏览器里建 React 项目运行，本课全部示例在此练。
  - id: r-react-thinking
    title: React 官方 · Thinking in React
    url: https://zh-hans.react.dev/learn/thinking-in-react
    type: doc
    difficulty: 1
    note: 官方方法论：怎么把页面拆成组件、状态放哪，本课「UI = f(state)」的展开版。
---

> 一句话定义：React 认为**界面就是状态的函数**——状态一变，整个组件函数重跑一遍，React 负责算出页面的最小改动；JSX 让「写界面」变成「写 JS」。

## 概念讲解

**Vue 和 React 解决同一个问题，但路径不同**（概览课的世界观对比）：

```text
Vue：模板 + 响应式。数据被「追踪」，哪个数据变了就精准更新对应位置。
React：函数 + 重渲染。状态变了 → 整个组件函数重新执行 → React 对比前后
       两次的 UI 描述（diff）→ 只把变化的部分写进真实 DOM。
```

听起来 React 更「笨重」？代价换来的是极致的简单心智：**UI = f(state)**，界面永远等于状态算出来的结果，不存在「忘了同步」这类 bug——你甚至可以把组件函数当纯函数来理解。

**两个核心概念**：

1. **JSX**：在 JS 里直接写 HTML。它不是字符串，是函数调用（`<h1>` 编译后是 `React.createElement('h1', ...)`），所以可以配合变量、条件、循环——「界面是算出来的」在 JSX 里是字面意义的真。
2. **useState**：组件的记忆。普通变量在函数重跑时会被重置，只有 `useState` 的值能在重渲染之间存活。

```jsx
const [count, setCount] = useState(0);
// count：当前值（本次渲染的快照）
// setCount：申请改变量的唯一合法途径
```

**重渲染模型的完整链条**（React 一切纪律的根源）：

```text
调用 setCount(新值) → React 标记组件「脏」→ 重跑组件函数
  → 得到新的 UI 描述 → 与上次对比（diff）→ 只把差异写进真实 DOM
```

三条纪律全部从这里推导出来：直接改变量不触发重跑（没走 setCount）；数组必须给新引用（diff 对比的是引用）；列表渲染要给稳定 key（diff 需要辨认「哪个是哪个」）。

**JSX 与模板：两种思维的差异表**：

| 维度 | Vue 模板 | React JSX |
| ---- | ---- | ---- |
| 写的是什么 | 受约束的 HTML 方言（指令固定几个） | 就是一段 JS（表达式随便写） |
| 条件/循环 | 框架指令（v-if/v-for） | JS 原生（三目、&&、map） |
| 心智 | 「学一套模板语法」 | 「用 JS 知识直接迁移」 |
| 复杂逻辑 | 挪到 computed，模板保持干净 | 直接写在 return 之前，按普通 JS 组织 |
| 出错面 | 指令写错编译期就报 | 语法错编译期报，逻辑错运行期报 |

一句话：Vue 是「给界面专门设计的 DSL」，React 是「把 JS 灌回界面」——**JSX 没有新语法要背，考察的是 JS 本身**。

**条件渲染与列表渲染：全是 JS 原生写法**（对照 Vue 的 v-if/v-for，React 一个指令都没有）：

```jsx
function Status({ isDone, todos }) {
  const messages = ['周一', '周二', '周三'];
  return (
    <div>
      {/* 条件 A：三目运算符——二选一 */}
      <p>{isDone ? '全部完成' : '还有未完成项'}</p>

      {/* 条件 B：&& 短路——要么渲染要么不渲染 */}
      {todos.length === 0 && <p>没有待办，添加一条吧</p>}

      {/* 列表：map 把数组映射成元素数组 */}
      <ul>
        {messages.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </div>
  );
}
```

`map` 输出一个**元素数组**，JSX 会把数组直接铺进页面——这就是「界面是算出来的」：列表不是「循环渲染」，而是「把数据算成一个 UI 数组」。

**受控组件：value 与 onChange 的完整概念**——input 的值交给 React 状态管理：

```jsx
const [text, setText] = useState('');
<input value={text} onChange={(e) => setText(e.target.value)} />
```

数据流闭环：用户输入 → onChange 触发 → setText 更新状态 → 组件重渲染 → input 显示新的 value。React 的世界观里没有「双向绑定」这个词——**双向效果是「单向数据流转一圈」模拟出来的**：Vue 给你 v-model 快捷方式，React 给你拼装的原件。只写 `value` 不写 `onChange`，React 就把输入框当成「永远是这个值」的只读框（坑 4 的原理）。

**key 的 diff 原理：为什么不能用下标**。React diff 两棵树时，对同级子元素**先按 key 配对**（key 相同的视为「同一个」，复用其 DOM 与状态），再逐项比较内容。key 用数组下标时，在列表**头部**插入一项 → 后面所有项的 key 整体前移 → React 认为「每一项都变了」，全部重渲染；更糟的是带内部状态的项（勾选框、输入框）会把状态**错位继承给下一项**。稳定 id 让每项身份终身不变——这就是「key 用稳定 id，不用下标」的原理出处。

**props 与回调：父子通信预告**——与 Vue 的 props/事件一一对应：

```jsx
// 父组件：传数据（props 下行）+ 传方法（动作上行）
<TodoItem todo={t} onToggle={toggle} onRemove={remove} />

// 子组件：接 props、调回调，从不直接改数据
function TodoItem({ todo, onToggle }) {
  return <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />;
}
```

子组件只报告动作（调回调），父组件做决定（改状态）——**数据下行、动作上行**，与 Vue 单向数据流完全同构。

**单向数据流**：你从不直接改 count，只能调 setCount 申请新值——数据只能从父组件经 props 流向子组件，子组件要「改」数据只能回调父组件的方法。这让数据流向可追踪，是 React 项目的秩序基础。

## 代码示例

主线：把 Vue 课的待办应用用 React 再写一遍，覆盖 JSX、useState、列表渲染与不可变更新：

**第 1 步：复现计数器**（粘贴进 CodeSandbox React 模板）：

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>点我 +1</button>
      <p>当前次数：{count}</p>
    </div>
  );
}
```

对比 Vue 版省掉了什么、多了什么：没有模板指令，事件与插值全部是 JS 表达式（`{count}` 与 Vue 的 `{{ count }}` 一一对应）；**注意「单向」味道**——你从不直接改 count，只能调 setCount 申请新值。

**第 2 步：待办列表（含不可变更新与列表 key）**：

```jsx
import { useState } from 'react';

export default function Todos() {
  const [text, setText] = useState('');
  const [todos, setTodos] = useState([]);
  const remaining = todos.filter((t) => !t.done).length;

  function add() {
    if (!text.trim()) return;
    setTodos([...todos, { id: Date.now(), text, done: false }]);   // 不可变：新数组
    setText('');
  }

  function toggle(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && add()} />
      <button onClick={add}>添加</button>
      <p>剩余 {remaining} 项未完成</p>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            <label style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
              {t.text}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**第 3 步：验证「引用对比」**——把 add 里改成 `todos.push({...})` 再点添加：界面纹丝不动。这就是 React 重渲染模型的第一课：**push 不换引用，diff 认为「没变」**。

对照 Vue 版读这份代码：`v-model` 变成了 `value + onChange` 手动配对；`v-for` 变成了 `map`；`computed` 变成了直接在渲染期间计算的 `remaining`——概念一一对应，语法完全不同（这正是「第二门框架是翻译不是重学」的例证）。

**第 4 步（分支）：拆出第一个子组件**——把单条待办从 Todos 里拆出来，亲手体验 props/回调：

```jsx
// TodoItem.jsx：单条待办组件（接 props，发回调，不持有列表）
function TodoItem({ todo, onToggle, onRemove }) {
  return (
    <li>
      <label style={{ textDecoration: todo.done ? 'line-through' : 'none' }}>
        <input type="checkbox" checked={todo.done}
               onChange={() => onToggle(todo.id)} />
        {todo.text}
      </label>
      <button onClick={() => onRemove(todo.id)}>删</button>
    </li>
  );
}

// Todos 组件里：替换原来的整个 <li>…</li>，并补一个 remove 方法
function remove(id) {
  setTodos(todos.filter((t) => t.id !== id));   // filter 产生新数组：不可变删除
}

{todos.map((t) => (
  <TodoItem key={t.id} todo={t} onToggle={toggle} onRemove={remove} />
))}
```

输出说明了什么：子组件不知道 todos 从哪来、有多少项，只接单条 `todo` 和两个回调——**父组件管理状态，子组件负责显示与报告**。注意 `key={t.id}` 写在 map 的每一项上（key 是给 diff 看的身份标签，不属于组件的 props）。

## 常见坑

1. **坑 1：直接改状态**。`count += 1` 或 `arr.push(x)` 都不触发重渲染（React 对比的是引用）。必须用 `setCount(count + 1)`、`setArr([...arr, x])` 创建新值。
2. **坑 2：忘了 `key`**。列表渲染不写 key，React 用下标猜身份，增删项时会出现「内容错位」。key 用稳定 id，不用数组下标。
3. **坑 3：函数名大小写**。JSX 里 `<counter/>` 会被当成 HTML 标签，组件必须首字母大写 `<Counter/>`。
4. **坑 4：input 不绑 onChange**。`value={text}` 配不配 onChange 会变成「只读输入框」——受控组件的纪律：value 与 onChange 永远成对出现。
5. **坑 5：连续 setCount 拿旧值**。`setCount(count + 1); setCount(count + 1);` 只加 1（两次都用同一次渲染的快照）——基于旧值更新要用函数式写法 `setCount(c => c + 1)`（框架深入课展开）。
6. **坑 6：`&&` 短路渲染出一个孤零零的 "0"**。现象：空列表时页面左上角出现数字 0。原因：写 `{items.length && <List/>}`——length 为 0 时整个表达式的值就是数字 0，JSX 会把数字 0 渲染出来（只有 false/null/undefined 才不渲染）。排查：把渲染条件改成显式布尔：`{items.length > 0 && <List/>}` 或三目 `{items.length > 0 ? <List/> : null}`。

## 小练习

1. 跑通主线两步，并给待办加「删除」按钮（filter 产生新数组），体验不可变更新的全套姿势。
2. 故意把 add 改成 `todos.push(...)`，观察界面不更新；再打印 todos 确认数据其实变了——亲手踩一遍「引用没变」的坑。
3. 综合任务：加一个「只看未完成」过滤（checkbox + filter 渲染），对照 Vue 课的同款实现，记录两边在「派生值」上的写法差异（渲染期计算 vs computed）；再按主线第 4 步把 TodoItem 拆成子组件，对照 Vue 课的 props/事件版本，验证「数据下行、动作上行」是同构的。
4. 思考题：Vue 靠响应式「精准更新」、React 靠重渲染 + diff「最小更新」——两种模型对「组件函数能不能有副作用」的要求有什么不同？（提示：React 组件函数会被重跑多次。）
