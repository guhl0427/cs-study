---
id: l-net-dns
slug: dns
title: DNS：域名是怎么变成 IP 的
difficulty: 1
estMinutes: 25
tags: [网络, DNS]
summary: 计算机只认 IP，人类只记域名，DNS 是中间的翻译簿——查一遍的过程，就是一次「问路」。
updated: 2026-11-21
resources:
  - id: r-dns-mdn
    title: MDN · 什么是域名
    url: https://developer.mozilla.org/zh-CN/docs/Learn/Web/How_the_Web_works#域名系统dns
    type: doc
    difficulty: 1
    note: 官方科普视角的 DNS 讲解。
  - id: r-dns-tool
    title: dnschecker.org
    url: https://dnschecker.org/
    type: tool
    difficulty: 1
    note: 可视化查看域名在全球各地解析到的 IP，理解「解析不是瞬间完成的」。
---

> 一句话定义：DNS 是互联网的电话簿——把 `www.example.com` 翻译成机器真正需要的 `93.184.216.34`。

## 概念讲解

为什么需要翻译？因为 IP 是一串数字（且 IPv6 更是一串十六进制），人记不住；而域名是给「人」用的地址。浏览器发请求前，必须先完成一步：**域名 → IP**。

查这个过程会「问路」，问路的顺序体现了 DNS 的核心设计——**层层缓存**：

```
① 浏览器缓存        上一页访问过就直接用
② 操作系统缓存      系统级，所有浏览器共享
③ 本地 DNS 服务器   运营商或你配置的（如 114.114.114.114）
④ 根 → 顶级域 → 权威服务器
   「.com 归谁管？」「example.com 的 IP 到底是多少？」
```

设计缓存的原因：全世界每秒几十亿次查询，如果每次都问根服务器，互联网就瘫了。所以 DNS 结果带 TTL（存活时间）——缓存多久由域名主人配置，这也是「改了域名解析要等一会儿生效」的原因。

两类常见记录类型记一下：`A` 记录（域名 → IPv4 地址）、`CNAME`（域名 → 另一个域名，如把 `www` 指向 CDN）。

## 代码示例

```bash
# 问出域名对应的 IP（可能走缓存，也可能真的问路）
nslookup www.baidu.com

# 或用更现代的 DNS over HTTPS 查询，绕过本地缓存
curl -s "https://dns.alidns.com/resolve?name=www.baidu.com&type=A"
```

观察 `nslookup` 输出的两行：`Server` 是回答你的本地 DNS 服务器，`Address` 是翻译出的目标 IP。用 `curl` 直连 IP 访问（配合 Host 头）可以验证「IP 才是真正干活的」：

```bash
curl -s -H "Host: www.baidu.com" https://110.242.68.4/ -o /dev/null -w "%{http_code}\n"
```

## 常见坑

1. **坑 1：配了 hosts 却「没生效」**。hosts 文件属于②系统缓存层之前，但浏览器自身缓存可能还留着旧结果。排查：重启浏览器或刷新 DNS 缓存（Windows：`ipconfig /flushdns`）。
2. **坑 2：TTL 设太长导致故障切换慢**。迁移服务器时，老解析最长还能存活到 TTL 结束——紧急切流前要先把 TTL 调短。这是运维事故的经典来源。
3. **坑 3：ping 通 IP 却打不开网站就怀疑 DNS**。方向反了：ping IP 通说明网络层没问题，打不开网站正说明可能是 DNS 没解析对——用 `nslookup` 验证。

## 小练习

1. 对三个常用网站做 `nslookup`，记录它们解析到的 IP，观察同一个域名是否解析出多个 IP（多机房/负载均衡）。
2. 故意把 hosts 里某个域名指到错误 IP，观察访问报什么错，再恢复。
3. 思考题：为什么浏览器要抢在 OS 之前再加一层缓存？（提示：统计一下你一天访问同一个域名的次数。）
