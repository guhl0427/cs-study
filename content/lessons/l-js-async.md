---
id: l-js-async
slug: promise-async
title: Promise 与异步编程
difficulty: 2
estMinutes: 45
tags: [JavaScript, 异步]
summary: JS 是单线程的，慢操作只能靠「先登记、回头再执行」；Promise 是这个约定的标准化写法，async/await 是它的语法糖。
updated: 2026-11-21
resources:
  - id: r-async-mdn
    title: MDN · 异步 JavaScript
    url: https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Asynchronous
    type: doc
    difficulty: 2
    note: 想深入事件循环与队列机制，读这份。
  - id: r-async-eventloop
    title: What the heck is the event loop anyway?
    url: https://www.youtube.com/watch?v=8aGhZQkoFbQ
    type: video
    difficulty: 2
    note: 现场演示事件循环，27 分钟，前端学习者都该看一次。
---

> 一句话定义：异步 = 「现在先返回，结果回头再给」；Promise 就是那张「回头给你结果」的取货凭证。

## 概念讲解

JS 是**单线程**的：同一时刻只能干一件事。如果网络请求、读文件这类慢活让线程干等，页面就会卡死。所以慢操作采用异步模型：**发起请求 → 继续执行后面的代码 → 结果到达时再执行回调**。

**Promise** 是异步结果的标准化凭证，三种状态：

```
pending（等待） ──成功──▶ fulfilled（有值，走 .then / await 后面的代码）
               ──失败──▶ rejected（有原因，走 .catch）
```

凭证一旦兑现（fulfilled/rejected）就**不可再变**，这让它可以被安全地传递和组合。

**async/await** 是 Promise 的语法糖，让异步代码长得像同步代码：

```js
// 原始写法
getUser(id).then(user => console.log(user));

// 语法糖
const user = await getUser(id);
console.log(user);
```

`await` 只能出现在 `async` 函数里，效果是「在这里等结果，但不停整个线程」。最实用的组合技是 `Promise.all`——多个互不依赖的请求**并发**发出，全部完成再继续，比逐个 await 快得多。

## 代码示例

```js
// 模拟一个慢接口
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('开始');

  await wait(1000);           // 等 1 秒，但不卡住页面
  console.log('1 秒后');

  // 并发：三个请求同时发出，总耗时 ≈ 最慢的那个
  const results = await Promise.all([
    wait(500).then(() => '数据A'),
    wait(800).then(() => '数据B'),
    wait(300).then(() => '数据C'),
  ]);
  console.log(results);       // ['数据A', '数据B', '数据C']

  // 错误处理：await 抛出的异常用 try/catch 接
  try {
    await Promise.reject(new Error('网络错误'));
  } catch (err) {
    console.error('捕获：', err.message);
  }
}

main();
```

在浏览器控制台直接粘贴运行，观察打印顺序——「开始」之后页面完全可交互，这就是异步不卡线程的含义。

## 常见坑

1. **坑 1：循环里逐个 `await`**。`for` 循环内 await 会串行执行，10 个请求耗时相加。排查：互不依赖的请求放 `Promise.all` 里并发。
2. **坑 2：Promise 吞错误**。忘了 `.catch`（或没 try/catch），失败会静默消失，控制台只有一条 Unhandled 提示。排查：每个 Promise 链的终点必须有 catch。
3. **坑 3：在非 async 函数里用 `await`**。语法直接报错；回调风格的老代码（如事件处理器）要先改成 async 函数。
4. **坑 4：以为 await 会「暂停整个世界」**。它只暂停当前 async 函数，页面照常响应——理解这点才不会把并发逻辑写成假并发。

## 小练习

1. 把示例里的 `Promise.all` 改成 `Promise.allSettled`，故意让其中一个 reject，观察两者对失败的处理差异。
2. 写一个 `timeout(ms, promise)` 工具：Promise 超过 ms 没完成就抛出超时错误（提示：`Promise.race`）。
3. 用 `fetch('https://httpbin.org/get')` 发起真实请求，用 await 拿到 JSON 并打印（记得 try/catch）。
