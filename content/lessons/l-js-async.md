---
id: l-js-async
slug: promise-async
title: 异步编程：从回调地狱到 async/await
difficulty: 2
estMinutes: 85
tags: [JavaScript, 异步, Promise]
summary: JS 是单线程的，慢操作只能「先登记、回头再执行」——从回调的失控，到 Promise 的标准化，再到 async/await 的像同步一样好读，异步演进史一次讲透。
updated: 2026-11-22
resources:
  - id: r-async-mdn
    title: MDN · 异步 JavaScript
    url: https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Asynchronous
    type: doc
    difficulty: 2
    note: MDN 官方异步学习路径，本课的平行阅读。
  - id: r-async-eventloop
    title: What the heck is the event loop anyway?
    url: https://www.youtube.com/watch?v=8aGhZQkoFbQ
    type: video
    difficulty: 2
    note: 现场演示事件循环的著名演讲，27 分钟，值得完整看一次。
---

> 一句话定义：异步 = 「现在先返回，结果回头再给」——**Promise 是那张「回头给你结果」的取货凭证**，async/await 是让异步代码读起来像同步的语法糖。

## 概念讲解

**为什么需要异步？** JS 是单线程的：同一时刻只执行一段代码。网络请求要几百毫秒、定时器要等几秒——如果 JS 干等，页面就冻结（按钮点不动、动画全停）。所以浏览器模型是：**慢操作发起后立刻返回，JS 继续跑后面的代码；结果到达时，回调被排进队列执行**。

```js
setTimeout(() => console.log("1 秒后"), 1000)
console.log("我先执行")            // 先打印这句——JS 不会停在 setTimeout 上
```

**事件循环一句话直觉**：JS 线程永远先跑完当前这段同步代码，再去队列里取「到点/已到达」的回调执行——`setTimeout(fn, 0)` 也不是立刻跑，而是「同步代码跑完后的下一轮」（这就是面试题「0 毫秒定时器为什么最后打」的答案）。想亲眼看清这个过程，看上面 resources 里那个 27 分钟的著名演讲。

**第一代方案：回调，以及它的失控。** 回调就是「结果到了帮我执行这个函数」，单层没问题，层层依赖就塌方：

```js
getUser(id, (user) => {                    // 第 1 层
  getOrders(user.id, (orders) => {         // 第 2 层
    getOrderDetail(orders[0].id, (detail) => {   // 第 3 层……嵌套越来越深
      console.log(detail)                  // 错误处理散落在每层，漏一层就丢
    })
  })
})
```

这就是**回调地狱**：右缩进失控、错误处理重复、无法复用组合。Promise 正是为终结它而生。

**Promise：标准化的一张凭证。** 三种状态，状态一旦定型不可再变：

```text
pending（等待中）──成功──▶ fulfilled（已兑现，值可通过 .then 拿到）
                ──失败──▶ rejected（已拒绝，原因走 .catch）
```

它的关键能力是**可链式组合**——把嵌套拍平成流水线：

```js
getUser(id)
  .then(user => getOrders(user.id))      // 返回新 Promise → 链到下一步
  .then(orders => getOrderDetail(orders[0].id))
  .then(detail => console.log(detail))
  .catch(err => console.error("链条上任何一步失败都会到这里", err))   // 错误集中处理
  .finally(() => console.log("无论成败都执行——适合关 loading"))
```

`.then` 里返回值会被自动包成 Promise，所以链式书写时每一步都拿到上一步的**真实结果**——这是回调做不到的组合性。

**async/await：让异步读起来像同步。** `async` 函数内可用 `await` 暂停等待结果；错误用 try/catch 接——和同步代码完全同构：

```js
async function showDetail(id) {
  try {
    const user = await getUser(id)
    const orders = await getOrders(user.id)
    const detail = await getOrderDetail(orders[0].id)
    console.log(detail)
  } catch (err) {
    console.error("任何一步失败", err)
  } finally {
    hideLoading()
  }
}
```

**并发模式**是实战分水岭——「逐个 await」是串行，耗时相加；互不依赖的请求用 `Promise.all` 并发，耗时 ≈ 最慢的那个：

```js
const [user, notices] = await Promise.all([getUser(id), getNotices()])   // 并发
for (const o of orders) await deliver(o)                                  // 有依赖才串行
```

## 代码示例

主线：同一个需求（模拟获取用户 → 订单 → 详情）的三代写法对照，亲眼看异步的进化：

```js
// 模拟接口：延迟 ms 后成功/失败（真实接口在 fetch 课）
function api(name, ms, fail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => (fail ? reject(new Error(`${name} 失败`)) : resolve(`${name} 的数据`)), ms)
  })
}

// ① 回调版：嵌套 + 每层手工处理错误（体会为什么被淘汰）
api("用户", 300, (user, err) => {
  if (err) return console.error(err)
  api("订单", 300, (orders, err2) => {
    if (err2) return console.error(err2)
    console.log("回调版拿到：", user, orders)
  })
})

// ② Promise 链版：拍平 + 错误集中
api("用户", 300)
  .then(user => api("订单", 300))
  .then(orders => console.log("链版拿到：", orders))
  .catch(err => console.error(err.message))

// ③ async/await 版：像同步一样读（现代标准）
async function main() {
  try {
    const user = await api("用户", 300)
    const orders = await api("订单", 300)
    console.log("await 版拿到：", user, orders)

    // 并发：两个互不依赖的请求同时发
    const [a, b] = await Promise.all([api("资料", 400), api("通知", 200)])
    console.log(a, b)                          // 总耗时 ≈ 400ms 而非 600ms
  } catch (err) {
    console.error("失败：", err.message)
  }
}
main()
```

把三段都粘进 Console 观察：打印顺序、失败路径、并发耗时——异步的「为什么」到此闭环。

## 进阶一课：串行还是并发？一张决策表

拿到一个「要做 N 件事」的需求，选循环方式只需要回答一个问题——**后面的请求需要前面的结果吗？**

```js
// ① 互不依赖（如拉 3 个不同板块的数据）→ all + map 并发
const plates = await Promise.all(ids.map(id => api(`板块${id}`, 300)))

// ② 有依赖（如先拿列表、再逐个拿详情）→ for...of 串行，结果顺序天然正确
const details = []
for (const id of ids) {
  details.push(await api(`详情${id}`, 300))
}

// ③ 互不依赖但要求「按顺序展示」→ 并发拿、按下标收
const results = await Promise.all(ids.map(id => api(`详情${id}`, 300)))
// all 的结果数组顺序 = 传入顺序，与完成先后无关——所以并发也不会乱序
```

「限流并发」（最多同时 3 个请求）是更进阶的需求，思路是分批 all——初学阶段记住结论：**默认并发，有依赖才串行，太猛了分批**。

## 常见坑

1. **坑 1：循环里逐个 await**。`for...of { await fetch(...) }` 是串行，10 个请求耗时相加；互不依赖的请求放 `Promise.all` 并发。注意 `forEach` 里写 await **完全无效**（它不等待回调）——要顺序处理用 `for...of`，要并发用 all+map。
2. **坑 2：吞掉错误**。Promise 链没有终点 `.catch`、async 函数没 try/catch，失败就静默蒸发（Console 只有一条 Unhandled 提示）——纪律：每条链的终点必须有 catch。
3. **坑 3：在非 async 函数里 await**。语法直接报错；事件回调、forEach 回调都要先声明成 async。
4. **坑 4：以为 await 冻结整个页面**。它只暂停当前 async 函数的执行流，页面照常响应——把「等待」理解成「让出线程再回来」。
5. **坑 5：Promise.all 一损俱损**。任何一个 reject 整体失败——需要「失败也拿到结果」时用 `Promise.allSettled`，逐项检查 status。
6. **坑 6：忘 await 直接传 Promise**。`console.log(getUser(id))` 打印的是 pending 凭证不是数据——看到「Promise { <pending> }」就说明少了 await。

## 小练习

1. 把主线的并发示例改成 `Promise.allSettled`，故意让其中一个 reject，对照两种 API 的结果结构（`status`/`value`/`reason`）。
2. 写 `timeout(promise, ms)` 工具函数：给任意 Promise 加超时——用 `Promise.race([promise, 超时reject的Promise])` 实现，并用 wait 函数验证。
3. 小项目：写一个 `retry(fn, times)` 重试工具——失败后自动重试最多 times 次（提示：async 函数 + for 循环 + try/catch），用随机失败的 api 验证。这是前端请求层的真实需求（fetch 课会用到它）。
4. 思考题：为什么「回调地狱」在 Promise 链里消失了？用「返回凭证 vs 直接调函数」的差别解释。
