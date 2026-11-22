---
id: l-vue-intro
slug: vue-intro
title: Vue 3 初识：响应式与单文件组件
difficulty: 2
estMinutes: 80
tags: [Vue, 框架]
summary: Vue 用「响应式数据 + 单文件组件」接管手动同步——从原生计数器到 Vue 计数器逐行对照，亲手在 Playground 里跑通第一个组件。
updated: 2026-11-22
resources:
  - id: r-vue-doc
    title: Vue 3 官方文档（中文）
    url: https://cn.vuejs.org/guide/introduction.html
    type: doc
    difficulty: 1
    note: 官方指南是最佳教程，本课平行阅读前几章。
  - id: r-vue-play
    title: Vue SFC Playground
    url: https://play.vuejs.org/
    type: tool
    difficulty: 1
    note: 浏览器里直接写 .vue 组件运行，本课全部示例在此练。
  - id: r-vue-component
    title: Vue 官方 · 组件基础
    url: https://cn.vuejs.org/guide/essentials/component-basics.html
    type: doc
    difficulty: 1
    note: props 与事件的官方章节，本课父子通信预告的展开版。
---

> 一句话定义：Vue 把「数据」和「页面」绑定在一起——你只改数据，DOM 自动跟着变；组件化让页面拆成可复用的乐高块。

## 概念讲解

**从三件套课程的痛点说起。** 回忆 DOM 课的计数器：改了 `count` 之后要**手动**调用 `render()` 把数字写回页面；「为什么需要框架」课进一步演示了同步散弹问题——同一数据在 N 处显示就要手动改 N 处。Vue 的解法叫**响应式**：把数据放进 `ref()`，模板里直接用；数据一变，Vue 自动找出哪些页面位置依赖它并更新：

```js
// 原生：改数据 → 手动改 DOM（两步，会漏）
count += 1
document.querySelector("#count").textContent = count

// Vue：只改数据（一步，DOM 自动对齐）
count.value += 1
```

**SFC（单文件组件）是 Vue 的代码组织单元**——一个 `.vue` 文件 = 结构 + 逻辑 + 样式：

```text
App.vue
├── <template>    结构：HTML 模板 + 指令（{{ 插值 }}、@click 事件）
├── <script setup> 逻辑：响应式数据、方法、生命周期
└── <style scoped> 样式：scoped 让样式只作用于本组件（类名不会互相污染）
```

一个组件管自己那一块页面——TodoList 组件管列表、TodoItem 管单条，改一处样式不会炸到别处。

**scoped 样式的原理一句**：`<style scoped>` 在编译期给本组件的每个元素加一个随机属性（如 `data-v-7ba5bd90`），并给每条 CSS 选择器追加 `[data-v-7ba5bd90]`——「类名不冲突」不是魔法，是编译器帮你做的命名空间隔离，F12 里能看到那个属性。

**组合式 API 三个高频 API**（本课只需要 ref，另两个先混脸熟）：

| API | 干什么 | 一句话记忆 |
| ---- | ---- | ---- |
| `ref` | 声明响应式数据 | 「这份数据要被页面用」 |
| `computed` | 由数据算出来的值，自动缓存 | 「派生值，不用手动同步」 |
| `onMounted` | 组件挂载后执行的钩子 | 「页面就绪后的第一件事」 |

**ref 的 .value 规则**（新手第一大坑的原理）：`ref()` 把值包成一个「响应式盒子」——在 **JS 里**要通过 `count.value` 开盒子访问，在**模板里**不用（自动解包）：

```js
const count = ref(0)
console.log(count)          // RefImpl 对象（盒子本身）
console.log(count.value)    // 0（盒子里的值）
count.value = 5             // 改盒子里的值 → 页面自动更新
```

**模板指令全家福速览**（六个高频指令，本课用到一半，其余混脸熟）：

| 写法 | 作用 | 原生等价物 | 一句话记忆 |
| ---- | ---- | ---- | ---- |
| `{{ count }}` 插值 | 显示数据 | `textContent` 赋值 | 数据→视图 |
| `v-bind`（缩写 `:`） | 属性绑定 | `setAttribute` | 数据→属性，如 `:src`、`:checked` |
| `v-on`（缩写 `@`） | 事件绑定 | `addEventListener` | 用户动作→逻辑 |
| `v-model` | 双向绑定 | 监听 input 事件 + 回写 value | 表单首选，两向同步 |
| `v-if` / `v-show` | 条件显示 | 创建/销毁元素 vs 切 display | 见下表 |
| `v-for` | 列表渲染 | 循环 createElement + append | 必带 `:key` |

`v-if` 与 `v-show` 都能「条件显示」，但机制不同（高频面试点）：

| | `v-if` | `v-show` |
| ---- | ---- | ---- |
| 切换机制 | 真「创建/销毁」DOM 元素 | 元素一直渲染，切 CSS `display` |
| 初始开销 | 条件为假时零开销 | 无论真假都要渲染一次 |
| 适用场景 | 很少切换（权限块、空态页） | 频繁切换（Tab 页签、悬浮面板） |

**props 与事件：父子通信的预告**——组件要复用，就必须能「从外面接收数据、向外面报告动作」：

```vue
<!-- 子组件 TodoItem.vue：接 props，发事件，不自己改数据 -->
<script setup>
defineProps({ todo: Object })   // 接收：父组件传入的数据
defineEmits(['toggle'])         // 声明：我会发出的动作名
</script>

<template>
  <li @click="$emit('toggle')">
    <input type="checkbox" :checked="todo.done" /> {{ todo.text }}
  </li>
</template>
```

```vue
<!-- 父组件：传数据（props 下行）、监听动作（事件上行） -->
<script setup>
import { ref } from 'vue'
import TodoItem from './TodoItem.vue'
const todo = ref({ text: '学 Vue', done: false })
</script>

<template>
  <TodoItem :todo="todo" @toggle="todo.done = !todo.done" />
</template>
```

注意子组件里写的是 `:checked`（绑定值）而不是 `v-model`——**子组件不拥有这个数据，无权直接改它**，只能 `$emit('toggle')` 请父组件改。一句话：**数据经 props 下行、动作经事件上行**（单向数据流，框架深入课展开）。

**两条上手路线：CDN 一行引入 vs Vite 工程**：

| | CDN 一行引入 | Vite 脚手架 |
| ---- | ---- | ---- |
| 怎么跑 | `<script src="vue.global.js">`，打开 HTML 即用 | `npm create vue@latest` + `npm run dev` |
| 能写什么 | HTML 内模板，**无 SFC**（写不了 .vue 文件） | 完整 SFC、热更新、TypeScript、路由/状态全家桶 |
| 适合 | 五分钟体验响应式、旧页面局部增强 | 一切正经项目与学习主线 |
| 和本课的关系 | Playground 本质就是云端 Vite | 深入课后在本地搭 |

本课用 Playground 是因为它免配置且支持 SFC——写正经项目时本地 `npm create vue@latest`，两者体验一致。

**什么时候学框架？** 能用原生 JS 独立写完一个小项目（列表增删、表单提交、本地存储）再学框架，否则你分不清「框架的功劳」和「JS 本身的能力」——出了问题也不知道该查哪一层。

## 代码示例

主线：在 Playground 里把「待办列表」从原生对照版写到 Vue 版，覆盖插值、事件、双向绑定：

**第 1 步：复现计数器**（粘贴进 play.vuejs.org）：

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
button { padding: 8px 16px; }
</style>
```

对比原生版本省掉了什么：没有 `querySelector`，没有 `addEventListener`，没有手动 `render()`。`{{ count }}` 是**插值**——数据到视图的桥；`@click` 是**事件绑定**——用户动作到逻辑的桥。

**第 2 步：双向绑定与列表渲染**：

```vue
<script setup>
import { ref, computed } from 'vue'

const text = ref('')                          // 输入框的内容
const todos = ref([])                         // 待办列表（对象数组）
const remaining = computed(() =>              // 派生值：未完成数（自动缓存）
  todos.value.filter(t => !t.done).length
)

function add() {
  if (!text.value.trim()) return
  todos.value.push({ text: text.value, done: false })
  text.value = ''                             // 清空输入框
}
</script>

<template>
  <input v-model="text" placeholder="要做什么？" @keyup.enter="add" />
  <button @click="add">添加</button>
  <p>剩余 {{ remaining }} 项未完成</p>
  <ul>
    <li v-for="(todo, i) in todos" :key="i">
      <label><input type="checkbox" v-model="todo.done" /> {{ todo.text }}</label>
    </li>
  </ul>
</template>
```

三个新指令各司其职：`v-model` **双向绑定**（输入框↔数据，两边改都同步）；`v-for` **列表渲染**（`:key` 给每项唯一身份）；`v-model` 绑 checkbox 直接切换 done——没有一行手动 DOM 操作。

**第 3 步：验证响应式**——在 add() 里加 `console.log(todos.value)` 观察：数据变了，页面同步变了，而你没有写过任何「更新页面」的代码。

**第 4 步（分支）：拆出第一个子组件**——把单条待办拆成 TodoItem，亲手体验上面的 props/事件预告：

```vue
<!-- TodoItem.vue -->
<script setup>
defineProps({ todo: Object })
defineEmits(['remove'])
</script>

<template>
  <li>
    <label><input type="checkbox" v-model="todo.done" /> {{ todo.text }}</label>
    <button @click="$emit('remove')">删</button>
  </li>
</template>
```

```vue
<!-- App.vue：替换掉原来的整个 v-for 块 -->
<script setup>
import { ref, computed } from 'vue'
import TodoItem from './TodoItem.vue'
// text / todos / remaining / add 照抄第 2 步，add 里补 id：
// todos.value.push({ id: Date.now(), text: text.value, done: false })
</script>

<template>
  <input v-model="text" placeholder="要做什么？" @keyup.enter="add" />
  <p>剩余 {{ remaining }} 项未完成</p>
  <TodoItem v-for="todo in todos" :key="todo.id"
            :todo="todo" @remove="todos = todos.filter(t => t !== todo)" />
</template>
```

三个观察点：① `:key` 从下标 `i` 换成了稳定 `todo.id`——第 2 步用下标只是图省事，删除中间项会错位（呼应坑 4）；② `v-model="todo.done"` 直接改对象属性依然响应式——`ref()` 包对象时 Vue 会**深度追踪**，对象内属性的变化也在雷达里；③ 删除是子组件 `$emit('remove')` 报告、父组件改数组——**子组件只报告，父组件做决定**。

## 常见坑

1. **坑 1：忘了 `.value`**。`ref()` 包出来的数据在 **JS 里**要 `count.value` 访问，但在**模板里**不用（自动解包）。症状：界面显示一串对象而不是数字；`count + 1` 得到 "[object Object]1"。排查：打印时忘了 `.value`。
2. **坑 2：把「学框架」当成「学 Vue 语法」**。框架语法只占 20%，剩下 80% 是组件化思维：怎么拆组件、状态放哪、父子怎么通信。语法三天，思维三个月。
3. **坑 3：在 `<script setup>` 里直接改 props**。props 是只读的，子组件想改外部数据应该「发事件」让父组件改（框架深入课展开单向数据流）。
4. **坑 4：v-for 忘了 :key**。不写 key 时 Vue 用下标猜身份，列表中间插入/删除时出现「内容错位」——key 用稳定 id，不用数组下标（React 课同款纪律）。
5. **坑 5：解构 props/ref 丢失响应式**。`const { count } = props` 之后 props 变了你看不见——保留响应式用 computed 包一层或 toRef。
6. **坑 6：v-for 和 v-if 挤在同一元素上**。现象：想「只渲染未完成项」写成 `<li v-for="todo in todos" v-if="!todo.done">`，控制台警告、v-if 报「todo is not defined」。原因：Vue 3 中 v-if 优先级高于 v-for，条件判断时 v-for 还没跑，拿不到 todo 变量。对策：先用 computed 产出过滤列表（`visibleTodos`），再对它 v-for——过滤逻辑还能复用。

## 小练习

1. 在 Playground 复现主线两步，并加一个「清空全部」按钮（todos.value = []）。
2. 加一个「只看未完成」开关：`<input type="checkbox" v-model="showPending">` + computed 产出过滤列表——体会 computed 与 ref 的分工。
3. 综合任务：把计数器改造成「点我 +1，但记录每次点击的历史时间」（history 数组 + v-for 渲染），对比三件套 DOM 课的同款实现，数一数你少写了多少行「手动同步」代码；再按主线第 4 步把单条待办拆成子组件，体会 props 下行、事件上行。
4. 思考题：`v-model` 在原生 JS 里等价于哪两行代码？（监听 input 事件 + 更新 value——框架只是把它打了个包。）
