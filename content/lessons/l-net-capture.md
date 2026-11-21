---
id: l-net-capture
slug: packet-capture
title: 抓包初步：用浏览器看请求
difficulty: 1
estMinutes: 25
tags: [网络, 调试]
summary: 开发者工具的 Network 面板是最轻的抓包工具——看懂瀑布图和时间分解，你就有了排错的第一件武器。
updated: 2026-11-21
resources:
  - id: r-capture-chrome
    title: Chrome DevTools · Network 面板参考
    url: https://developer.chrome.com/docs/devtools/network
    type: doc
    difficulty: 1
    note: 面板功能官方手册，本节学完可以通读一遍。
  - id: r-capture-wireshark
    title: Wireshark 官网
    url: https://www.wireshark.org/
    type: tool
    difficulty: 3
    note: 进阶抓包工具（能看到 TCP/IP 层），本章先不深入，留个入口。
---

> 一句话定义：抓包 = 把网络往返的每个请求记录下来逐个检查——前端排错、性能优化、接口调试都从这里开始。

## 概念讲解

前面的课讲了「请求的一生」，抓包就是**站在路边看这场运输**。最轻量的抓包工具你已经有了：F12 → **Network 面板**。它能回答三个高频问题：

1. **发了什么**：每个请求的方法、URL、状态码、大小；
2. **多久**：每条请求的耗时，以及总瀑布图（谁阻塞了谁）；
3. **对不对**：请求/响应的完整头和正文。

**Timing（时间分解）**是排错的钥匙。点开任意请求的 Timing 标签，几个阶段的含义：

| 阶段 | 含义 | 长了说明什么 |
| ---- | ---- | ---- |
| DNS Lookup | 域名解析 | DNS 慢/未命中缓存 |
| Initial Connection / SSL | TCP 握手 + TLS | 网络延迟高 |
| Waiting for server response | 等服务器想（TTFB） | **后端慢**，查服务端 |
| Content Download | 下载响应体 | 响应太大，压缩/瘦身 |

读法口诀：**慢在 Waiting 是后端的锅，慢在 Download 是体积的锅，慢在 DNS/连接是网络的锅**。定位了段，才知道该找谁修。

面板使用要点：勾选 `Disable cache` 让抓包不受缓存干扰；`Filter` 输入 `Doc` 只看文档请求；失败请求红色显示，状态码一眼可见。

## 代码示例

做一个完整的「排查练习」——在本站随便一个内容页：

1. 打开 F12 → Network，勾选 Disable cache，刷新页面；
2. 按 Time 列倒序，找到最慢的那条请求；
3. 点开它的 **Timing**，判断慢在哪一段；
4. 点开 **Headers**，确认状态码、方法与 Content-Type；
5. 点开 **Response/Preview**，看正文是什么。

另一个必会的动作——**复制为请求命令**：右键任意请求 → Copy → Copy as cURL，直接得到可在终端复现的命令：

```bash
curl 'https://example.com/api/list' \
  -H 'Accept: application/json' \
  --compressed
```

这是前后端联调时的标准交接物：把「我这边请求长这样」变成一条可直接执行的命令。

## 常见坑

1. **坑 1：忘了 Disable cache**，看到的全是 `(disk cache)` 秒回，误判性能很好。排查：调试网络问题时永远勾上。
2. **坑 2：把 Waiting 慢怪罪到前端代码**。TTFB 高是服务端处理慢，前端再怎么优化 JS 也救不了。先看 Timing 再定责。
3. **坑 3：刷新页面看不到接口请求**。单页应用（SPA）内跳转不重新加载页面，Network 面板不会清空但需勾选 Preserve log 才能留下跳转前的记录。

## 小练习

1. 完成上面五步排查练习，用一句话写下：本次页面加载最慢的请求、慢在哪一段、可能的原因。
2. 对最慢的那条请求 Copy as cURL，在终端执行并对比两者耗时。
3. 找一个返回 JSON 的接口，用 Preview 面板把数据结构画成层级树。
