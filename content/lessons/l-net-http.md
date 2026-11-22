---
id: l-net-http
slug: net-http
title: HTTP：浏览器与服务器的问答协议
difficulty: 1
estMinutes: 85
tags: [网络, HTTP, curl]
summary: 用 curl -v 逐行解剖请求与响应报文，讲透方法语义、状态码家族、高频头部与无状态设计，最后对三个真实网站做一次「响应头体检」。
updated: 2026-11-22
resources:
  - id: r-http-mdn
    title: MDN · HTTP 概述
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Overview
    type: doc
    difficulty: 1
    note: 权威参考，报文与机制的细节都在这里。
  - id: r-http-book
    title: 图解 HTTP
    url: https://book.douban.com/subject/25863506/
    type: book
    difficulty: 1
    note: 入门首选，图多、篇幅小，状态码一章尤其实用。
  - id: r-http-status
    title: MDN · HTTP 响应状态码
    url: https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status
    type: doc
    difficulty: 1
    note: 状态码字典，遇到不认识的码先来这里查。
---

> 一句话定义：HTTP 是浏览器与服务器之间的「问答协议」——浏览器问（请求报文），服务器答（响应报文），格式严格到每一个字符，所以才能全世界互通。

## 概念讲解

### HTTP 在分层地图里的位置

上一课的四层地图里，HTTP 住在**应用层**：它不管选路、不管重传（那是 IP 和 TCP 的活），只负责一件——**定义「问」和「答」的格式**。就像电话打通之后说什么内容是 HTTP 的事，能不能打通是 TCP/IP 的事。

```text
   浏览器                          服务器
 ┌────────┐   请求报文(问)      ┌────────┐
 │  应用层 │ ───────────────→  │  应用层 │
 │ 传输层  │ ←───────────────   │ 传输层  │
 └────────┘   响应报文(答)      └────────┘
         底下是 TCP 连接这条「管道」
```

HTTP 的报文是**文本**，人眼可读——这是它能成为 Web 通用语言的原因之一，也是我们能用 curl 直接「偷看」它的原因。

### 解剖请求报文：四段结构

用 `curl -v https://httpbin.org/headers` 可以看到 curl 发出的完整请求：

```text
> GET /headers HTTP/2          ← ① 请求行：方法 + 路径 + 协议版本
> Host: httpbin.org            ← ② 请求头（key: value，可多行）
> User-Agent: curl/8.4.0
> Accept: */*
>
                               ← ③ 空行：头和正文的分界线
                               ← ④ 请求正文（GET 请求通常没有）
```

逐段拆解：

1. **请求行**只含三样：方法（想干什么）、路径（要哪份资源，注意只写路径，域名写在 Host 头里）、版本（声明自己会说什么方言）。
2. **请求头**是元信息清单：我是什么客户端、我接受什么格式、我带了什么 cookie。每行一个 `key: value`。
3. **空行**是硬性规定——它告诉服务器「头说完了」。手工构造报文漏掉空行，服务器会一直等或直接报错。
4. **正文**是真正要传输的数据。GET 一般没有；POST 的表单、JSON 都在这里。

### 解剖响应报文：同样四段

```text
< HTTP/2 200                   ← ① 状态行：版本 + 状态码 + 短语
< content-type: text/html      ← ② 响应头
< cache-control: private
<
<!DOCTYPE html>...             ← ④ 响应正文：真正的内容
```

请求和响应是同一格式的两次镜像：都有「行 + 头 + 空行 + 正文」——**学一个，会两个**。

### 方法语义：动词决定行为，幂等决定胆量

| 方法 | 语义 | 典型用途 | 幂等？ |
| ---- | ---- | ---- | ---- |
| GET | 只读，取一份资源 | 打开网页、查列表 | 是 |
| POST | 提交数据，服务器新建东西 | 注册、下单、发评论 | 否 |
| PUT | 整体替换目标资源 | 保存配置、更新资料 | 是 |
| DELETE | 删除目标资源 | 删一条记录 | 是 |

**幂等（idempotent）**= 同一请求执行一次和执行一百次，效果一样。GET 幂等（查一百次列表不变），POST 不幂等（下一百个单就是一百笔订单）。这不只是概念游戏：网络超时后**客户端敢不敢自动重试**，取决于方法是否幂等——GET 重试无妨，POST 重试可能重复扣款。生产环境的支付接口都带「幂等键」防重，而「把删除做成 GET 链接」更是事故级设计：爬虫和浏览器预取都会触发 GET。

### 状态码家族：第一位数字就够定位

| 族 | 含义 | 代表成员与真实场景 |
| ---- | ---- | ---- |
| 1xx | 收到，继续 | `101 Switching Protocols`（升级为 WebSocket） |
| 2xx | 成功 | `200 OK`（页面、API 数据）；`204 No Content`（删除成功，无内容可回） |
| 3xx | 重定向 | `301`（永久搬家：http→https、旧域名→新域名）；`302`（临时改道：短链、登录跳转）；`304 Not Modified`（缓存命中，正文不重发，省流量） |
| 4xx | 你的错 | `403 Forbidden`（没权限/被封）；`404 Not Found`（路径或资源不存在）；`429 Too Many Requests`（请求太频繁被限流） |
| 5xx | 我的错 | `500`（服务器代码崩了）；`502 Bad Gateway`（网关后面的服务挂了）；`504 Gateway Timeout`（后端太慢，网关等不及） |

记忆锚点：**2 顺利、3 转弯、4 你检查、5 我修**。排错方向感全在这一句——4xx 查请求侧（URL、参数、权限），5xx 查服务端日志。

### 高频头部精讲：五个最值得记住的头

| 头部 | 谁发 | 管什么 | 排错价值 |
| ---- | ---- | ---- | ---- |
| `Host` | 请求 | 访问的是这台服务器上的哪个域名 | 一台服务器挂多个站，靠它分流 |
| `Content-Type` | 两侧 | 正文是什么格式（JSON/HTML/表单） | 后端解析不了参数，多半是它没对 |
| `Cache-Control` | 响应 | 缓存策略：`no-store`/`max-age` | 页面改了没生效，先查它 |
| `Set-Cookie` / `Cookie` | 响应/请求 | 服务器发身份牌 / 浏览器随身携带 | 掉登录态、权限异常先看它 |
| `User-Agent` | 请求 | 我是什么客户端 | 接口按 UA 统计/拦截时相关 |

### 无状态：HTTP 的「失忆症」与 Cookie 的补救

HTTP **不记得上一次连接**：五分钟前你来过，再来时服务器对你毫无印象，每次都是陌生人。这就是**无状态（stateless）**设计。好处是服务器简单：不存会话，扩容随意，哪台机器处理都一样；代价是「登录」这种需要记忆的功能没法直接做。

补救方案是 **Cookie**：登录成功后服务器发一张「身份手环」`Set-Cookie: session=abc123`，浏览器存起来，之后每次请求自动带上 `Cookie: session=abc123`——服务器不记得你，手环替它记着。理解这一点，你就能解释一连串日常现象：换浏览器要重登录（手环不在新浏览器里）、清缓存掉登录态（手环被扔了）、接口报 401（手环没带对）。

## 代码示例

主线任务：用 curl 给 **3 个真实网站做体检**——逐行读懂报文与响应头，亲手触发一串状态码，亲手完成一次「发手环→戴手环」。全程约 25 分钟。

### 第 0 步：认识 curl 的三个关键参数

```bash
curl -sI https://www.baidu.com          # -s 静默（不显示进度条），-I 只取响应头
curl -v https://httpbin.org/headers     # -v 逐行打印完整往返报文
```

`httpbin.org` 是专为学习 HTTP 搭的公共实验站：你发什么它回显什么，还内置各种状态码的体验入口。若它临时超时，换 `https://httpbin.dev` 的同名接口即可。

### 第 1 步：看一次完整的问答往返

```bash
curl -v https://httpbin.org/headers
```

预期输出（节选，`>` 是发出去的请求，`<` 是收到的响应）：

```text
> GET /headers HTTP/2
> Host: httpbin.org
> User-Agent: curl/8.4.0
> Accept: */*
>
< HTTP/2 200
< server: gunicorn/22.0.0
< content-type: application/json
<
{"headers": {"Host": "httpbin.org", "User-Agent": "curl/8.4.0", ...}}
```

输出说明了什么：请求行三要素齐全；`/headers` 把收到的头原样回显在正文里——你能确认「我发出去的就是我以为发出去的」；`content-type: application/json` 指定正文按 JSON 解析。报文四段结构（行/头/空行/正文）第一次在真实流量里对上了号。

### 第 2 步：亲手发一个带正文的 POST

```bash
curl -v -X POST -H "Content-Type: application/json" \
     -d '{"name":"xiaoming","age":20}' \
     https://httpbin.org/post
```

预期输出要点：请求部分出现 `"Content-Type: application/json"`，响应正文的 `"data"` 字段回显了你的 JSON；`"json": {"name": "xiaoming", ...}` 说明服务器按 JSON 成功解析。

输出说明了什么：`-d` 把数据放进正文，`Content-Type` 声明格式，后端靠它决定用哪个解析器。**漏了这个头，后端常把 JSON 当普通文本，参数全空**——这是联调中「接口 400」的头号原因。

### 第 3 步：给三个真实网站做响应头体检

```bash
curl -sI https://www.baidu.com
```

预期输出（节选，头部内容可能随时间微调，重点看这几个）：

```text
HTTP/2 200
server: BWS/1.1
content-type: text/html
cache-control: private
set-cookie: BDORZ=27315; max-age=86400
```

判读：`200` 正常；`server: BWS` 是百度自研服务器；`cache-control: private` 表示缓存只许存在你个人的浏览器里；`set-cookie` 正在发「手环」——第 5 步你会亲手体验这个机制。

```bash
curl -sI https://github.com
```

预期输出（节选）：

```text
HTTP/2 200
server: GitHub.com
content-type: text/html; charset=utf-8
cache-control: no-store
strict-transport-security: max-age=31536000; includeSubdomains; preload
x-frame-options: deny
```

判读：`no-store` 表示「绝不缓存」（带登录态的页面，缓存了会串号）；`strict-transport-security` 强制浏览器今后只走 HTTPS（下一课的主角）；`x-frame-options: deny` 禁止被套进别人的 iframe。**同一个 200，头不同，含义千差万别**——响应头才是页面的「体检报告」。

```bash
curl -sI https://httpbin.org/headers
```

判读：`content-type: application/json`——同一台服务器可以同时给浏览器发 HTML、给程序发 JSON，靠的就是这个头区分。

### 第 4 步：亲手触发一串状态码

```bash
curl -sI http://github.com
```

预期输出：`HTTP/1.1 301 Moved Permanently` 加一行 `location: https://github.com/`。判读：永久搬家，浏览器自动重访新地址；生产环境 http→https 全靠它。

```bash
curl -sv https://httpbin.org/redirect/2 -o /dev/null
```

预期输出：能看到两个 `< HTTP/2 302`，每条后面跟一行 `location: ...`。判读：302 临时改道；curl 默认不跟随，加 `-L` 会连跳到底。短链服务、「登录后跳回原页」用的都是它。

```bash
curl -sI https://httpbin.org/status/429
curl -sI https://httpbin.org/status/500
curl -sI https://httpbin.org/status/502
```

预期输出：状态行分别是 `HTTP/2 429`、`HTTP/2 500`、`HTTP/2 502`。判读：429 是被限流（重试要等待或降频），500 是服务端代码异常，502 是网关后面挂了——今后线上报警时，看状态码就能先给故障定性，再去翻日志验证。

```bash
curl -sI https://httpbin.org/cache          # ① 记下响应里的 Etag 值
curl -s -o /dev/null -w "%{http_code}\n" \
     -H 'If-None-Match: <把上一步的 Etag 连引号抄进来>' \
     https://httpbin.org/cache              # ② 预期输出：304
```

判读：你带着「上次拿到的指纹」去问，服务器说「没变，别重传了」——304 就是缓存协商成功的回执。网页二次打开快，一半功劳在它。

### 第 5 步：亲历无状态与 Cookie——发手环、戴手环

```bash
curl -s -c jar.txt "https://httpbin.org/cookies/set?user=xiaoming" -o /dev/null
curl -s -b jar.txt https://httpbin.org/cookies
```

预期输出：

```json
{
  "cookies": {
    "user": "xiaoming"
  }
}
```

输出说明了什么：第一条命令，服务器通过 `Set-Cookie` 发出身份牌，`-c jar.txt` 把它存进「手环盒」；第二条命令，`-b jar.txt` 戴上手环，服务器在响应里认出了你。**HTTP 本身没记住任何事**——两次请求之间的记忆，全靠这张来回传的小牌子。把 `-b jar.txt` 去掉再跑一次，它又变成陌生人：这就是「掉登录态」的物理本质。

## 常见坑

1. **坑 1：把 404 当成服务器故障去查后端**。现象：接口报 404，就喊后端「服务挂了」。原因：4xx 是请求侧问题——路径拼错、资源不存在。排查：先 `curl -sI` 核对 URL 与方法，确认无误再找后端。
2. **坑 2：把 500 当成自己 URL 写错**。现象：报 500 反复改参数重试。原因：5xx 是服务端异常，改请求救不了它。排查：拿到状态码直接找服务端，把状态码、时间点、请求报文报给对方。
3. **坑 3：POST 忘带 Content-Type**。现象：curl 发 JSON 正常，前端页面发同样数据却 400。原因：fetch 需要显式写 `Content-Type: application/json`，漏了后端按表单解析失败。排查：F12 → Network → 该请求 → Payload/Headers，与 curl 的请求头逐行对比。
4. **坑 4：301 缓存顽固不化**。现象：改了重定向配置，浏览器仍跳旧地址。原因：301「永久」会被浏览器长期缓存。排查：F12 勾选 Disable cache 或用无痕窗口验证，再回看服务器配置是否真的改对。
5. **坑 5：GET 请求带正文，或用 GET 做「删除」**。现象：接口时灵时不灵、被中间层拦截。原因：GET 语义只读，代理与浏览器预取会丢弃或重复触发 GET。对策：读用 GET，写用 POST/PUT/DELETE，正文交给 POST。
6. **坑 6：看到 304 以为「请求失败」**。现象：Network 面板一串 304 混着 200，以为页面坏了。原因：304 是缓存协商成功的标志，省掉正文正是优化。排查：看 Size 列，304 的传输体积极小——是省钱，不是报错。

## 小练习

1. 对你常用的三个网站各跑 `curl -sI`，记录状态码、server、cache-control 三个字段，并各用一句话解读它的缓存策略。
2. 用第 4 步的方法再触发 `/status/403`、`/status/404`、`/status/429`，给每个码写一个「生产环境最常出现的场景」。
3. 把第 5 步 Cookie 实验反过来做（先戴手环再发手环），观察服务器回应 `{"cookies": {}}`——用「无状态」解释为什么顺序反了就认不出人。
4. **综合排查任务**：找一个报 404 或 500 的线上接口（自己项目的或公开 API 均可），用 `curl -v` 完整复现并写一份 5 行诊断：方法、URL、关键请求头、状态码，按 4xx/5xx 规则定性，写出下一步查谁、用什么命令验证。
