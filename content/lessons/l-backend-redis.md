---
id: l-backend-redis
slug: redis-intro
title: Redis 入门：为什么需要缓存
difficulty: 2
estMinutes: 30
tags: [后端, Redis, 缓存]
summary: 数据库查一次要几十毫秒，内存读一次只要微秒——缓存的本质是用「一份数据的副本」换时间，Redis 是那把最常用的刀。
updated: 2026-11-22
resources:
  - id: r-redis-doc
    title: Redis 官方文档 · 数据类型
    url: https://redis.io/docs/latest/develop/data-types/
    type: doc
    difficulty: 2
    note: 五种基础类型的适用场景速查。
---

> 一句话定义：Redis 是一个把数据放内存里的键值数据库——读写是微秒级的，常用来给慢速的磁盘数据库「挡在前面」。

## 概念讲解

为什么需要缓存？看一笔账：一次 MySQL 主键查询约 1–10ms，一次 Redis 读约 0.1ms——相差两个数量级。课程热度榜、用户信息这类「读多改少」的数据，每次都查库就是浪费。

Redis 的基本用法一句话说完：**SET 键 值，GET 键**，外加「键会过期」这个关键特性：

```bash
SET hot:articles:2026 "[42, 137]" EX 60   # 60 秒后自动删除
GET hot:articles:2026                      # 读缓存
DEL hot:articles:2026                      # 数据变了，手动失效
```

最经典的读写模式叫 **Cache Aside**：

```
读：先查缓存 → 命中直接返回
              → 未命中查数据库 → 写回缓存（带过期时间）→ 返回
写：先更新数据库 → 删除对应缓存（而不是更新它）
```

为什么写操作是「删缓存」而不是「改缓存」？因为删除让下次读时重新加载最新数据——避免「数据库改了、缓存里还是旧值」的不一致。

五种基础类型各管一类事：String（对象缓存/计数器）、Hash（对象字段）、List（队列）、Set（去重/交并集）、ZSet（排行榜）。

## 代码示例

用 redis-cli 感受一下「微秒级」与常用结构：

```bash
# 计数器：文章阅读量（原子自增）
INCR article:42:views
# 排行榜：分数为热度的有序集合
ZADD hot:articles 9.8 42
ZREVRANGE hot:articles 0 2          # 热度前 3 的文章
# 验证速度
redis-benchmark -t get,set -q
```

## 常见坑

1. **坑 1：缓存永不失效**。数据改了缓存还是旧的——任何缓存都要有过期时间或明确的失效机制。
2. **坑 2：缓存了「查不到」也没标记**。恶意请求反复查一个不存在的 id，每次都穿透到数据库。对策：把「空结果」也缓存一小段时间。
3. **坑 3：把 Redis 当主数据库用**。Redis 默认是内存存储，持久化只是兜底；核心数据必须在磁盘数据库里有正本。

## 小练习

1. 为「文章详情页」写一段 Cache Aside 伪代码（读 + 写两条路径）。
2. 用 `INCR` 实现一个接口限流器：同一用户 1 分钟内最多请求 60 次（提示：EXPIRE）。
3. 思考题：为什么「先更新数据库、再删缓存」的顺序不能反？
