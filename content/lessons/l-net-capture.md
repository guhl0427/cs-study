---
id: l-net-capture
slug: net-capture
title: 抓包实战：把网络往返看个清楚
difficulty: 2
estMinutes: 80
tags: [网络, DevTools, 抓包, 性能]
summary: 掌握 F12 Network 面板的完整功能地图与六个标签页的读法，学会用 Timing 分段定责「后端的锅/体积的锅/网络的锅」，并用五步法排查最慢请求、用模拟慢接口做对照实验。
updated: 2026-11-22
resources:
  - id: r-capture-chrome
    title: Chrome DevTools · Network 面板参考
    url: https://developer.chrome.com/docs/devtools/network
    type: doc
    difficulty: 1
    note: 面板功能官方手册，功能地图以此为准。
  - id: r-capture-httpbin
    title: httpbin.org · HTTP 测试服务
    url: https://httpbin.org/
    type: tool
    difficulty: 1
    note: 本课用它模拟各种慢接口与响应。
  - id: r-capture-wireshark
    title: Wireshark 官网
    url: https://www.wireshark.org/
    type: tool
    difficulty: 3
    note: 进阶：能看到 TCP/TLS 层的抓包工具，本课先深耕浏览器侧。
---

> 一句话定义：抓包 = 站在路边把每一趟「网络运输」记录下来逐个检查——前端排错、性能优化、前后端联调的第一件武器，就是 F12 的 Network 面板。

## 概念讲解

![DevTools 瀑布图的时间分段](fig:net-capture)

### 抓包在学什么：把前几课的知识变成「现场证据」

前三课拆了「打开网页的一生」：DNS 翻译、TCP/TLS 握手、HTTP 问答。抓包就是**把这条链路实时录下来**——每次刷新页面，Network 面板里的一行行记录就是一次真实运输的运单。它能回答三类问题：**发了什么**（方法、URL、状态码、大小）、**花了多久**（每个请求的耗时与瀑布图）、**内容对不对**（完整的头与正文）。

### Network 面板功能地图

打开方式：F12 → **Network**（网络）面板，然后刷新页面。面板从上到下五块区域：

| 区域 | 有什么 | 最常用操作 |
| ---- | ---- | ---- |
| 录制条 | 红点=录制中，圆圈=清空，齿轮=设置 | 调试前先清空再刷新 |
| 过滤器栏 | `Doc` / `XHR` / `JS` / `CSS` / `Img` / `Media` / `WS` 等按钮 + 文本框 | 文本框可输入 `method:POST`、`larger-than:100KB`、`domain:api.example.com` |
| 总览瀑布图 | 顶部时间条形图，谁在什么时候跑 | 看有没有「串行排队」的长链 |
| 请求列表 | Name / Status / Type / Size / Time / Waterfall 六列 | 点列头排序；红色行=失败请求 |
| 详情窗格 | 点任意行的六标签视图 | 下文逐个讲 |

两个必勾的开关（都在过滤器栏附近）：

- **Disable cache（禁用缓存）**：调试网络时永远勾上。否则你看到的很多请求是 `(disk cache)`/`304`，测量失真。
- **Preserve log（保留日志）**：页面跳转或单页应用内部路由时不清空记录——排查「登录跳转后接口报错」这类跨页面问题必备。

列表各列的读法：**Name** 请求路径；**Status** 200/304/404…（304 是缓存协商成功，不是错误）；**Type** 资源类型；**Size** 注意是两个数——`3.2 kB / 11.2 kB` 前者是**实际传输量（压缩后）**，后者是**解压后的资源大小**，差距大说明 gzip 生效；**Time** 总耗时；**Waterfall** 时序条。

### 单请求解剖：六个标签各看什么

点开任意一条请求，右侧六个标签就是「一份运单的六个面」：

| 标签 | 看什么 | 排错价值 |
| ---- | ---- | ---- |
| Headers | 请求头/响应头、状态行、General（URL、方法、状态码） | 404/500 定性、Content-Type 是否对、缓存头 |
| Payload | 发出去的数据（表单/JSON） | 「后端收不到参数」先来这里核对 |
| Preview | 响应正文的结构化视图（JSON 折叠树、图片缩略图） | 快速看 API 返回的数据形状 |
| Response | 响应正文原文 | 看错误信息原文、HTML 原文 |
| Initiator | 谁发起的这个请求（哪行代码/哪个页面） | 追踪「这个诡异请求是谁发的」 |
| Timing | 时间分解：DNS/连接/SSL/等待/下载 | 定责神器，下节精讲 |

### Timing 精讲：慢在哪一段，锅在谁

Timing 把一次请求拆成五段，每段慢了指向不同的责任方：

| 阶段 | 在干什么 | 慢了说明什么 |
| ---- | ---- | ---- |
| DNS Lookup | 域名翻译 | DNS 服务慢、未命中缓存 |
| Initial Connection | TCP 三次握手 | 离服务器远（RTT 大）、网络拥塞 |
| SSL | TLS 握手 | 同上，再乘一个往返 |
| Waiting for server response | 等服务器「想」并吐出第一个字节（TTFB） | **后端慢**：数据库慢查询、逻辑复杂、下游依赖卡 |
| Content Download | 下载响应体 | **体积大**：未压缩、图片过大、带宽不足 |

判例表（背下来）：

| 慢在哪段 | 锅 | 证据特征 | 修复方向 |
| ---- | ---- | ---- | ---- |
| DNS / Connection / SSL | **网络的锅** | 前三段高，Waiting 很低 | 就近部署、CDN、收敛握手 |
| Waiting（TTFB） | **后端的锅** | Waiting 独高 | 查服务端日志、慢 SQL、下游依赖 |
| Content Download | **体积的锅** | Download 段长、Size 大 | 开压缩、砍体积、图片瘦身 |

**先定段，再定责**——避免把后端慢当成「前端再优化一下 JS」这类方向性错误。

### Copy as cURL：把现场封存成一条命令

右键任意请求 → Copy → **Copy as cURL**，得到一条带齐所有头（含 Cookie、UA）的命令，终端直接执行即可复现。价值在于**交接**：前后端联调时，「我这边请求长这样」是一句说不清的话，一条可执行的命令才是完整证据——后端跑一遍就知道问题在请求侧还是服务侧。

## 代码示例

主线任务一：**排查「本站最慢请求」五步法**；主线任务二：用模拟慢接口做**对照实验**，亲手把三种「锅」各触发一次。全程约 25 分钟。

### 主线一：五步排查「本站最慢请求」

**第 1 步：设置现场并抓取。** 打开任意网页（建议你自己的项目或内容丰富的站点），F12 → Network，勾选 **Disable cache** 与 **Preserve log**，点圆圈清空旧记录，按 F5 刷新。

预期：列表里出现几十至上百条请求，顶部瀑布图从左到右依次铺开。**这一步说明了什么**：Disable cache 保证测的是真实网络而非缓存，Preserve log 保证跳转不丢记录——现场必须干净。

**第 2 步：找出最慢请求。** 点 **Time** 列让请求按耗时倒序，或看瀑布图最长的条。

预期：第一名往往是一个大图片、一个大 JSON 或一段 3MB 的 JS。点 **Waterfall** 里的色块还能看到它是和谁并行/排队。**说明了什么**：页面性能通常由少数几个「长条」决定，抓住第一名就抓住了主要矛盾。

**第 3 步：Timing 定段。** 点开该请求 → **Timing** 标签，读五段的分布。

预期会命中判例表之一：前三段高（网络）、Waiting 高（后端）、Download 高（体积）。写下一句话结论：「慢在 X 段，锅在 Y」。**说明了什么**：你已经把「页面慢」这个模糊抱怨，翻译成了带证据的定位。

**第 4 步：定责取证。** 切到 **Headers** 标签：核对状态码（是不是 304 假象）、`content-length`、`cache-control`、`content-encoding`（有没有 gzip）；再切 **Size** 列对比传输量与解压量。

预期示例：Size 显示 `980 kB / 3.4 MB`——传输只有 980kB，说明压缩在工作；若两数几乎相等，就是没开压缩，「体积的锅」坐实。**说明了什么**：同一列里的两个数字就是定责证据。

**第 5 步：封存现场。** 右键该请求 → Copy → **Copy as cURL**，粘贴到终端执行：

```bash
curl 'https://example.com/api/list?page=1' \
  -H 'Accept: application/json' \
  -H 'Cookie: session=...' \
  --compressed
```

预期：返回与浏览器一致的响应。加上计时参数测一次 TTFB：

```bash
curl -s -o /dev/null -w "TTFB:%{time_starttransfer}s 总:%{time_total}s\n" \
  'https://example.com/api/list?page=1' -H 'Cookie: session=...'
```

**说明了什么**：浏览器外的复现证明问题与前端代码无关——这条命令就是甩锅/自证的交接物。

### 主线二：模拟慢接口对照实验——三种锅各触发一次

用 httpbin.org 的人工慢接口，亲手把判例表的三种情况各做一遍（若 httpbin 超时，换 https://httpbin.dev 同名接口）。

**实验 A：后端的锅（服务器想得慢，吐得快）**

```bash
curl -s -o /dev/null \
  -w "A·后端慢  TTFB:%{time_starttransfer}s 下载量:%{size_download}B 总耗时:%{time_total}s\n" \
  https://httpbin.org/delay/3
```

预期输出（示意）：`A·后端慢 TTFB:3.12s 下载量:246B 总耗时:3.13s`。判读：TTFB 占了几乎全部时间，下载瞬间完成——对应 Timing 里 **Waiting 独高**，慢在服务器「想」，去查服务端。

**实验 B：体积的锅（吐得快，传得慢）**

```bash
curl -s -o /dev/null \
  -w "B·传输慢  TTFB:%{time_starttransfer}s 下载量:%{size_download}B 总耗时:%{time_total}s\n" \
  "https://httpbin.org/drip?duration=3&numbytes=50000"
```

预期输出（示意）：`B·传输慢 TTFB:0.31s 下载量:50000B 总耗时:3.20s`。判读：TTFB 很快，之后 3 秒都在「下载」——对应 Timing 里 **Content Download 长**，慢在体积与带宽，去瘦身/开压缩。

**实验 C：体积的锅·极端版（一次甩给你 1MB）**

```bash
curl -s -o /dev/null \
  -w "C·大文件  TTFB:%{time_starttransfer}s 下载量:%{size_download}B 总耗时:%{time_total}s\n" \
  https://httpbin.org/bytes/1048576
```

预期输出（示意）：`C·大文件 TTFB:0.28s 下载量:1048576B 总耗时:1.05s`。判读：响应体 1MB，下载段明显长于 A。对比 A/B/C 三行：**同样的「慢」，TTFB 与 Download 的比例完全不同**——这正是 Timing 分段定责的意义。

**实验 D：网络的锅——用节流模拟弱网**

实验 A/B 造出了「后端慢」与「体积慢」，判例表里还剩一种：网络本身慢。不用真的挤地铁——DevTools 内置了节流：

在 F12 → Network 面板顶部的节流下拉框（默认 No throttling）选 **Slow 4G**，访问 `https://httpbin.org/delay/1`，点开它的 Timing 标签。

预期看到：与不节流时对比，DNS / Initial connection / SSL 各段显著拉长，Content Download 也变慢，而 Waiting 段的数值基本没变。

输出说明了什么：节流模拟的是高延迟低带宽的链路，**被拉长的全是「网络侧」的段**——同样的接口，慢的段从「后端」转移到了「网络」。

结论一句话：慢在哪一段不取决于接口本身，而取决于瓶颈在哪。这解释了为什么同一个接口「在公司是后端的锅、在地铁里是网络的锅」——先看 Timing，再定责。

两个收尾提醒：节流只影响 DevTools 里的页面请求，curl 不受影响，对照实验请留在浏览器里做；看完记得把档位调回 No throttling——忘了恢复是「我浏览器怎么全变慢了」的经典来源。

把浏览器侧也对齐做一遍：F12 → Network → 访问 `https://httpbin.org/delay/3`，点开 Timing——你会亲眼看到 **Waiting for server response ≈ 3s**，与 curl 的 TTFB 对上号。

## 常见坑

1. **坑 1：忘了勾 Disable cache，测量全失真**。现象：列表里大量 `(disk cache)`、`304`，耗时全接近 0，误判性能很好。原因：缓存把本该走网络的请求截在本地。排查：调试网络/性能问题时永远勾上，或用无痕窗口。
2. **坑 2：SPA 页面跳转后请求记录消失**。现象：单页应用点了几页，之前的接口请求不见了。原因：默认每次「页面加载」清空列表，SPA 内部跳转常伴随清空。排查：勾选 **Preserve log** 再复现一遍，记录会完整保留。
3. **坑 3：把 Waiting 慢怪到前端头上**。现象：接口 3 秒才回，前端拼命优化 JS。原因：TTFB 高是服务端处理慢，前端代码改变不了它。排查：看 Timing——Waiting 独高就拿着 Copy as cURL 找后端，用实验 A 的数据说话。
4. **坑 4：把 Size 列两个数字看反**。现象：看到 `3.2 kB / 11.2 kB` 以为传了 11MB。原因：前者是**传输量（压缩后）**，后者是**资源解压后大小**。排查：两数差距大说明 gzip 正在工作；几乎相等才需要检查压缩配置。
5. **坑 5：页面里明明发了请求，列表里却找不到**。现象：确认代码 fetch 了，Network 里没有。原因：过滤器停在某个类型（如只剩 Doc），或该请求被浏览器扩展拦截。排查：清掉过滤器、切到 All、再检查 Initiator；仍未出现则查 Console 是否有拦截报错。
6. **坑 6：Copy as cURL 的命令带着自己的 Cookie 到处发**。现象：把复现命令直接贴进聊天群/工单。原因：命令包含完整的 Cookie 与鉴权头——等于把你的登录态发给了别人，还可能触发对方的限流。排查：粘贴前删掉或打码 Cookie/Authorization 头。

## 小练习

1. 对任一网站完整走一遍五步法，写出三行结论：最慢请求是谁、慢在哪一段、锅在谁、证据是哪两个字段。
2. 把实验 A/B/C 各跑三遍，用一张表记录三次的 TTFB 与总耗时，观察抖动范围——养成「多测几次再下结论」的习惯。
3. 找一个返回 JSON 的接口：Preview 里把数据层级展开截图，再用 Copy as cURL 在终端复现，对比浏览器与 curl 的 TTFB 差异并解释。
4. **综合排查任务**：模拟一次真实协作场景——「用户反馈页面要 5 秒才能看到内容」。用 Network 面板定位最慢请求 → Timing 定段 → 判例表定责 → Copy as cURL 封存证据 → 写一份 5 行以内的工单：现象、定位过程、责任方、建议修复方向。
