---
id: l-net-http
slug: http
title: HTTP：一次网页请求的一生
difficulty: 1
estMinutes: 40
tags: [网络, HTTP]
summary: HTTP 就是一问一答的约定——请求报文问什么、响应报文答什么；读懂状态码和报文结构，你就有了排错的语言。
updated: 2026-11-21
resources:
  - id: r-http-illustrated
    title: 图解 HTTP（上野宣）
    url: https://book.douban.com/subject/25863506/
    type: book
    difficulty: 1
    note: 本章内容与这本书前三章完全对应，想展开就读它。
  - id: r-http-mdn
    title: MDN · HTTP 概述
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Overview
    type: doc
    difficulty: 1
    note: 官方概述，术语权威。
---

> 一句话定义：HTTP 是浏览器和服务器之间的「问答礼仪」——浏览器发一份结构化的问（请求），服务器回一份结构化的答（响应），仅此而已。

## 概念讲解

HTTP 是**无状态**的文本协议：每个请求都是独立的，服务器不记得你上次问过什么（状态靠 Cookie 等机制补）。结构上，请求和响应都分三段：

```
请求：
GET /index.html HTTP/1.1          ← 请求行：方法 路径 版本
Host: www.example.com             ← 头部：元信息（键值对）
Cookie: sid=abc123
                                  ← 空行
（POST 才有正文：表单/JSON 数据）

响应：
HTTP/1.1 200 OK                   ← 状态行：版本 状态码 短语
Content-Type: text/html
Cache-Control: max-age=3600

<html>…</html>                    ← 响应正文
```

**方法**表达意图，日常只记四个：`GET`（取东西，不改数据）、`POST`（新建/提交）、`PUT`（整体更新）、`DELETE`（删除）。RESTful API 就是用「URL 定位资源 + 方法表达动作」的约定（`DELETE /users/42` = 删除 42 号用户）。

**状态码**是响应的「体检结论」，按首位分五族，必背的一批：

| 码 | 含义 | 典型场景 |
| ---- | ---- | ---- |
| 200 | 成功 | 一切正常 |
| 301/302 | 永久/临时搬家 | 网站换域名 |
| 304 | 内容没变，用缓存 | 强缓存协商命中 |
| 403 | 服务器拒绝（权限） | 未登录访问后台 |
| 404 | 这里没有这个资源 | 路径写错 |
| 500 | 服务器自己挂了 | 后端异常 |
| 502/504 | 网关层的问题 | 后端没起、超时 |

## 代码示例

用 curl 完整看一次报文往返（`-v` 显示过程）：

```bash
curl -v https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Overview
```

重点观察输出的三段：`> 开头` 是请求（方法 + 头），`< 开头` 是响应（状态行 + 头 + 尺寸）。再用 `-o /dev/null -s -w "%{http_code}"` 只提取状态码，做健康检查：

```bash
curl -o /dev/null -s -w "%{http_code}\n" https://example.com
# 输出 200
```

浏览器里等价的操作：F12 → Network → 点任意请求 → Headers 标签，就是上面两段报文的图形化版本。

## 常见坑

1. **坑 1：把 404 和 500 混为一谈**。404 = 你的请求有问题（路径错）；500 = 服务器代码有问题（查后端日志）。分不清这两者，排错方向就会反。
2. **坑 2：GET 用来改数据**。GET 语义是「读取」，浏览器预取、爬虫都会触发 GET——用 GET 做删除，链接被爬虫扫到数据就没了。改数据必须 POST/PUT/DELETE。
3. **坑 3：以为 HTTPS = 新协议**。HTTPS = HTTP 先经过 TLS 加密再传输，报文结构不变，只是管道从明文变成了加密。所以「HTTP 知识」全部适用于 HTTPS。

## 小练习

1. 对三个不同网站分别提取状态码，找出一个 301 或 302 的案例并解释它为什么跳转。
2. 在 Network 面板里找到本页对 `fonts` 或 `img` 的请求，指出请求方法、状态码和 Content-Type。
3. 思考题：为什么刷新页面时很多请求返回 304？这对加载速度意味着什么？
