---
id: l-net-https
slug: net-https
title: HTTPS：明文管道如何变成加密隧道
difficulty: 2
estMinutes: 75
tags: [网络, HTTPS, TLS, 安全]
summary: 从 HTTP 明文的三大风险讲到 TLS 握手全流程，理解对称与非对称加密为什么要混用、证书链怎么防「假银行」，并亲手解读 TLS 握手输出与三类证书报错。
updated: 2026-11-22
resources:
  - id: r-https-cloudflare
    title: Cloudflare · 什么是 SSL/TLS
    url: https://www.cloudflare.com/zh-cn/learning/ssl/what-is-ssl/
    type: doc
    difficulty: 1
    note: 图文并茂的 TLS 科普，本课的延伸阅读。
  - id: r-https-book
    title: 图解 HTTP（含 HTTPS 与证书章节）
    url: https://book.douban.com/subject/25863506/
    type: book
    difficulty: 1
    note: 第 7 章把本课内容展开讲透。
  - id: r-https-badssl
    title: badssl.com · 证书故障体验站
    url: https://badssl.com/
    type: tool
    difficulty: 1
    note: 官方提供的各种证书错误演示站，本课用它做故障复现。
---

> 一句话定义：HTTPS = HTTP 先经过 TLS 加密再传输——报文格式一字不变，变的是管道：从「明信片」升级为「上了锁的运钞车」。

## 概念讲解

### 先看清楚：明文 HTTP 有多危险

上一课说过，HTTP 报文是文本。这既是优点也是灾难：**链路上所有设备都能读它**。你家路由器、运营商设备、咖啡店热点，都站在你和目标之间。三种经典风险，各配一个场景：

- **窃听（偷看）**：你连上咖啡店的免费 Wi-Fi 登录邮箱，同网的攻击者用一个抓包工具就能看到你的 Cookie 和密码——明文里它们躺得明明白白。
- **篡改（改货）**：运营商在响应里插入广告脚本，或把页面里的收款二维码换成攻击者的——内容被人「拆开加了私货」，你毫不知情。
- **冒充（假货）**：你连的 Wi-Fi 被动了手脚，输入 `bank.com` 时被劫持到一台假服务器，界面一模一样，密码进了对方口袋——你根本不知道对面「不是本人」。

HTTPS 的使命就是同时干掉这三件事：**加密**防窃听、**完整性校验**防篡改、**证书**防冒充。

### 对称加密的困境：钥匙怎么安全地交出去

最直觉的加密是**对称加密**：双方用同一把钥匙，加密解密都用它。快、成熟，今天所有 HTTPS 流量都是它扛的。但有个死结——**钥匙怎么先交给对方？**

```text
你把加密数据发给对方，可钥匙也走同一条明文管道：
        ┌──────────── 明文管道（路由器/运营商都看得见）────────────┐
你 ──→  「数据加密版 + 顺便把钥匙也给你」 ──→  对方
                ↑ 中间人看到了钥匙 = 加密形同虚设
```

快递一整车黄金（数据）没问题，但你怎么把开箱密码（钥匙）寄过去？寄密码的包裹本身也会被拆。这就是**密钥分发问题**，纯对称加密在互联网上无解。

### 非对称加密登场：一把能公开的锁

非对称加密换了个思路：生成一对钥匙——**公钥**和**私钥**。公钥像一把挂锁：**用挂锁锁上的箱子，只有配对的私钥能打开**。于是流程变成：

```text
服务器把「挂锁」（公钥）大喇叭广播给全世界——被看见也无所谓
你用这把公锁把「对称钥匙」锁进箱子寄回去
路上任何人捡到箱子也没用——没有私钥打不开
服务器用私钥开箱，拿到对称钥匙——此后你们用对称加密畅聊
```

公钥被窃听完全没关系：它本来就是设计来公开的。密钥分发问题就此解决。

### 混合加密：为什么不让非对称包揽一切

既然非对称这么安全，为什么不全用它？因为**太慢**——非对称运算比对称加密慢几个数量级。所以 TLS 的答案是**各干各的**：

| 阶段 | 用什么加密 | 为什么 |
| ---- | ---- | ---- |
| 握手阶段：协商并传送对称密钥 | 非对称（公钥/密钥交换） | 只传一小段数据，慢一点也能接受 |
| 数据传输阶段：正式业务流量 | 对称 | 数据量大，必须用快的 |

一句话：**非对称只用来安全地交出对称钥匙，真正的数据全走对称加密**。这是 HTTPS 的核心设计，面试高频考点。

### 还有最后一个漏洞：对面拿来的公钥，是「真的」吗？

细想一个问题：你收到一把「bank.com 的公钥」，怎么证明它真是银行的，而不是中间人把自己的公钥冒名顶替给你？——锁再好，锁是假冒的，等于零。这就是**信任**问题，解法是引入大家都信的第三方：**CA（证书颁发机构）**。

CA 出面担保：它核实过「这把公钥确实属于 bank.com」，并出具一份**证书**——里面有公钥、域名、有效期、CA 的数字签名。你验证的不是公钥本身，而是「**这份证书是不是可信 CA 签发的**」。浏览器里预置了一张可信 CA 名单；证书还能一级签一级（根 CA 签中级 CA，中级 CA 签网站），形成**证书链**——验证时逐级向上找到你信任的根，就像查家谱验明正身。银行、大公司用的是 OV/EV 级证书，CA 要查营业执照；个人博客用免费 DV 证书（如 Let's Encrypt）只验域名归属——**验的强度不同，加密强度一样**。

### TLS 握手全流程：四步把管道换成加密的

TLS 1.3 握手简化后只有一次往返，逻辑上是这四步：

```text
① 协商      客户端：我会这些算法（TLS1.3、AES...），你看行不行
            服务端：行，就用这一套
② 出示证书  服务端发来证书链：这是我的域名、公钥、CA 签名
            客户端逐级验证：签名可信吗？域名对吗？过期了吗？
③ 密钥交换  客户端用证书里的公钥协商出对称密钥（中间人偷看也无法算出同一把）
④ 对称通道  双方宣布：以后的数据全部用刚才那把对称密钥加密
```

之后所有 HTTP 报文（还是上一课那个格式）都装进加密的箱子里运输。**HTTPS = HTTP + 握手（建立加密通道）+ 加密传输**，它不是新协议，而是给 HTTP 穿了一层 TLS。

## 代码示例

主线任务：亲手看一次 TLS 握手的完整输出，读懂证书信息，再亲手复现三类证书故障并学会排查。全程约 20 分钟。

### 第 0 步：准备与对照

工具只需要 curl（Git Bash 自带的 curl 用 OpenSSL 后端，能看到最详细的 TLS 输出；Windows 系统自带 curl 用 schannel 后端，字段略不同但信息一致）。先做一个明文对照：

```bash
curl -sI http://github.com        # 明文 http
```

预期输出：`HTTP/1.1 301 Moved Permanently` + `location: https://github.com/`。输出说明了什么：主流网站已把 HTTP 一律重定向到 HTTPS——明文入口只剩跳板作用，这是全行业的默认姿势。

### 第 1 步：看一次真实的 TLS 握手

```bash
curl -sv https://github.com -o /dev/null
```

预期输出（节选，`*` 开头的是连接过程信息）：

```text
* TLSv1.3 (OUT), TLS handshake, Client hello (1):
* TLSv1.3 (IN), TLS handshake, Server hello (2):
* SSL connection using TLSv1.3 / AEAD-CHACHA20-POLY1305-SHA256
* Server certificate:
*  subject: CN=github.com
*  issuer: C=GB, ST=Greater Manchester, O=Sectigo Limited, CN=Sectigo ECC Domain Validation Secure Server CA 2
*  Certificate chain: ... 
*  expire date: <未来某一天>
* Connected to github.com ... port 443
```

逐行解读这段「握手实录」：

1. `Client hello` = 握手第①步：客户端报上自己会说的算法清单；
2. `Server hello` = 服务端拍板选定的算法；
3. `SSL connection using TLSv1.3` = ②③④全部完成，对称通道已经建立，注意协商出的就是对称算法（CHACHA20/AES）；
4. `Server certificate` 块是第②步的核心证据：`subject` 是证书属于谁，`issuer` 是哪个 CA 担保的，`expire date` 是保质期——**三样就是验证证书的三件事：域名、CA、有效期**。

### 第 2 步：用浏览器 DevTools 看同一件事

在浏览器打开 https://github.com → F12 → **Security**（安全）面板：

预期看到：绿色提示 `This page is secure (valid HTTPS).`，以及 `Connection is secure: TLS 1.3, XChaCha20-Poly1305`。

输出说明了什么：浏览器已替你完成证书链验证——从 github.com 的证书逐级验到内置的根 CA。点开 `View certificate` 能看到完整证书：颁发者、有效期、Subject Alternative Names。**这里就是「验证你不是假银行」的最终裁决庭**：任何一项不过关，浏览器会在地址栏给出大红色警告并拦截访问。

### 第 3 步：亲手复现三类证书故障（badssl 体验站）

badssl.com 是官方提供的「故障体验馆」，每个子域名模拟一种证书错误。

**故障一：证书过期**

```bash
curl -v https://expired.badssl.com/ -o /dev/null
```

预期输出（节选）：`curl: (60) SSL certificate problem: certificate has expired`，连接被掐断。判读：证书有保质期，到期没续期，浏览器一律拒收——**这是线上最常见、也最容易被运维遗忘的故障**。

**故障二：域名不匹配**

```bash
curl -v https://wrong.host.badssl.com/ -o /dev/null
```

预期输出：`curl: (60) SSL: no alternative certificate subject name matches target host name`。判读：证书是好的，但它是发给别的域名的——「拿着 A 的证件去 B 的柜台办事」，同样拒收。

**故障三：自签名证书**

```bash
curl -v https://self-signed.badssl.com/ -o /dev/null
```

预期输出：`curl: (60) SSL certificate problem: self signed certificate`。判读：这张证书没有可信 CA 背书——等于「自己给自己写担保书」。内网测试环境常用自签名，方便但要自己导入信任。

三个故障用同一个参数「强行通过」看看：

```bash
curl -sI -k https://expired.badssl.com/
```

预期输出：`HTTP/1.1 200 OK`。判读：`-k` 的含义是「我知道证书有问题，别拦我」。它证明了重要的一点：**通道照样是加密的，但不再验证对方身份**——防窃听还在，防冒充失效。所以 `-k` 只用于临时调试，绝不能作为日常习惯，否则等于把「假银行」放行。

### 第 4 步：把排查收敛成一张表

| 现象（curl 或浏览器报错） | 病因 | 修法 |
| ---- | ---- | ---- |
| `certificate has expired` | 证书过期未续 | 服务器续期证书（Let's Encrypt 自动续期） |
| `no alternative certificate subject name matches` | 证书与域名不匹配 | 换成覆盖当前域名的证书 / 检查访问的域名是否写错 |
| `self signed certificate` | 无 CA 背书 | 生产的换正规 CA；内网的把根证书导入系统信任 |
| 所有网站全报证书错误 | 本机时间不对 | 证书有效期校验依赖系统时间，校准时间 |
| 页面能开但提示「部分内容不安全」 | 混用 http 资源（混合内容） | 把页面里的 `http://` 资源全部改成 `https://` |

## 常见坑

1. **坑 1：证书过期只盯着服务器改代码**。现象：`curl: (60) certificate has expired`，重启服务无效。原因：证书是签发给域名的凭据，过期只能续期。排查：`curl -v` 看 `expire date`，到证书管理平台续签并重新部署。
2. **坑 2：域名不匹配误判成「证书坏了」**。现象：报 subject name 不匹配，就去续期。原因：证书没坏，是「人证不符」。排查：对比报错里证书的域名与实际访问的域名——常见于把 `example.org` 误写成 `example.com`，或证书不含 `www` 子域。
3. **坑 3：把 `-k` 长期写进脚本**。现象：脚本一直能跑，某天被换了假证书也无从发现。原因：`-k` 关闭了身份验证，只留加密。对策：临时调试可用，日常必须去掉；内网自签名要导入证书而不是跳过校验。
4. **坑 4：系统时间不准导致「全网证书错误」**。现象：所有网站突然都报证书错误。原因：证书校验比对「当前时间」是否在有效期内，本机时间偏差太大就被判为过期或未生效。排查：先看系统时间，再怀疑证书。
5. **坑 5：以为挂了 HTTPS 就绝对安全**。现象：见带锁标志就放心输入账号密码。原因：HTTPS 保证的是「传输不窃听、不篡改、对方持有该域名的可信证书」，**不保证对方不是钓鱼站**——钓鱼站完全可以也申请一张真证书。对策：认域名本身，锁标志只防中间人。
6. **坑 6：以为 HTTPS 是一种新协议、HTTP 知识要重学**。现象：学 HTTPS 时把上一课的报文结构推翻。原因：HTTPS = HTTP over TLS，报文四段结构一字未变。对策：上一课的状态码、头部、Cookie 知识在 HTTPS 下全部适用。

## 小练习

1. 对三个你常用的网站各跑 `curl -sv`，记录每家的 `TLSv1.x`、`issuer`、`expire date`，观察不同网站分别用了哪家 CA。
2. 打开 F12 → Security 面板访问这三个站，与 curl 输出互相印证；点 `View certificate` 找到证书的 Subject Alternative Names，看看一张证书覆盖了几个域名。
3. 向一位不懂网络的朋友讲清楚：为什么 HTTPS 要「非对称 + 对称」两套加密混用？为什么钥匙不能直接寄？（用「挂锁寄钥匙」类比）
4. **综合排查任务**：对 `https://expired.badssl.com/`、`https://wrong.host.badssl.com/`、`https://self-signed.badssl.com/` 逐一复现报错，写一份 6 行以内的排查手册：三种报错各自的病因、用哪条命令确认、修复动作分别是什么。
