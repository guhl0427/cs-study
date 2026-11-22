---
id: l-backend-redis
slug: redis
title: Redis 缓存：用内存换时间
difficulty: 2
estMinutes: 85
tags: [Redis, 缓存, 后端]
summary: 一次 MySQL 查询 1–10ms、一次 Redis 读 0.1ms——五大数据类型、Cache Aside 读写模式、穿透/击穿/雪崩三兄弟，跟着把缓存用到真实项目里。
updated: 2026-11-22
resources:
  - id: r-redis-doc
    title: Redis 官方文档（数据类型）
    url: https://redis.io/docs/latest/develop/data-types/
    type: doc
    difficulty: 2
    note: 五大数据类型的权威说明。
  - id: r-redis-try
    title: Redis Online（在线体验）
    url: https://try.redis.io/
    type: tool
    difficulty: 1
    note: 浏览器里直接敲 redis 命令，本课全部示例可在此练。
---

> 一句话定义：Redis 是**存在内存里的键值数据库**——用两个数量级的速度差，把「读多改少」的数据挡在 MySQL 前面；它是缓存，也是计数器、排行榜和分布式锁。

## 概念讲解

**为什么缓存有效？** 算一笔账：一次 MySQL 主键查询约 1–10ms，一次 Redis 读约 0.1ms——相差两个数量级。课程热度榜、用户信息这类「读多改少」的数据，每次都查库就是在浪费。缓存的本质是**用空间（内存副本）换时间（查询延迟）**，代价是要处理「副本与正本不一致」的问题——后文 Cache Aside 就是这个问题的标准答案。

**五大数据类型各管一类事**——记类型就是记场景：

| 类型 | 能干什么 | 典型场景 |
| ---- | ---- | ---- |
| String | 字符串/数字，可原子自增 | 对象缓存、计数器、分布式锁 |
| Hash | 字段级存取的对象 | 用户资料（改一个字段不用整存整取） |
| List | 双端插入弹出的列表 | 最新消息、简单队列 |
| Set | 无序去重集合 | 标签、共同好友（交并差） |
| ZSet | 带分数的有序集合 | **排行榜**（天生的） |

**TTL（过期时间）是缓存的第二生命**：`SET key value EX 60` 让键 60 秒后自动消失——没有过期机制的缓存是 bug 温床（数据改了缓存还是旧的）。任何缓存键都应有 TTL 或明确的失效动作。

**Cache Aside 是读写模式的标准答案**：

```text
读：先查缓存 ──命中──► 直接返回（0.1ms）
             └未命中──► 查数据库 → 写回缓存（带 TTL）→ 返回
写：先更新数据库 → 删除对应缓存（不是更新它！）
```

为什么写操作是「删缓存」而不是「改缓存」？删除让下次读时**重新加载最新数据**，避免了「数据库改了、并发场景下缓存里还是旧值」的竞态——这是最简单可靠的失效策略。

**三大经典故障**是面试与实战的高频考区，先混个脸熟（后文代码示例给出解法）：

```text
穿透：反复查一个「根本不存在」的 id → 每次都穿透到数据库
击穿：一个热点 key 过期瞬间，海量请求同时砸向数据库
雪崩：大批 key 同时过期 → 数据库瞬间被洪水冲垮
```

## 代码示例

主线：redis-cli 把五类型与故障对策全跑一遍（无本地环境用 try.redis.io）：

**第 1 步：基础操作与 TTL**：

```bash
SET hot:articles:2026 "[42,137,88]" EX 60     # 写入并设置 60 秒过期
GET hot:articles:2026                          # "[42,137,88]"
TTL hot:articles:2026                          # 54（剩余秒数）
DEL hot:articles:2026                          # 手动失效（数据更新后）
```

**第 2 步：计数器与排行榜（原子操作）**：

```bash
INCR article:42:views                          # 1 —— 原子自增，并发安全
INCR article:42:views                          # 2
ZADD hot:rank 9.8 42                           # 排行榜：分数为热度
ZADD hot:rank 8.1 137
ZREVRANGE hot:rank 0 2 WITHSCORES              # 热度前 3（分数从高到低）
```

**第 3 步：Cache Aside 的应用层骨架**（Python 伪代码+真实逻辑）：

```python
import redis, json, pymysql

r = redis.Redis()
CACHE_TTL = 60

def get_article(aid: int):
    key = f"article:{aid}"
    cached = r.get(key)
    if cached:                                   # ① 命中：直接返回
        return json.loads(cached)

    data = query_db(aid)                         # ② 未命中：查库
    if data is None:
        r.set(key, json.dumps({"empty": True}), ex=30)   # ③ 空结果也缓存 30s → 防穿透
        return None
    r.set(key, json.dumps(data), ex=CACHE_TTL)   # ④ 写回缓存
    return data

def update_article(aid: int, fields: dict):
    update_db(aid, fields)                       # 先更新数据库
    r.delete(f"article:{aid}")                   # 再删缓存（不是更新缓存！）
```

**第 4 步：击穿与雪崩的对策**：

```python
# 击穿：热点 key 过期瞬间的并发回源 → 互斥锁，只放一个请求去查库
def get_hot(key, loader):
    val = r.get(key)
    if val:
        return json.loads(val)
    if r.set(f"lock:{key}", 1, ex=5, nx=True):   # nx=True：抢到锁才继续
        data = loader()
        r.set(key, json.dumps(data), ex=60)
        r.delete(f"lock:{key}")
        return data
    time.sleep(0.05)                             # 没抢到锁：稍等重试（此时别人在回源）
    return get_hot(key, loader)

# 雪崩：TTL 加随机抖动，避免大批 key 同一秒过期
r.set(key, payload, ex=60 + random.randint(0, 30))
```

## 常见坑

1. **坑 1：缓存永不失效**。数据改了缓存还是旧的——任何缓存都要有过期时间或明确的失效机制（DEL），二选一，不能都没有。
2. **坑 2：缓存了「查不到」也没标记**。恶意请求反复查一个不存在的 id，每次都穿透到数据库——把空结果也缓存一小段时间（见主线第 3 步③），或用布隆过滤器。
3. **坑 3：把 Redis 当主数据库用**。Redis 默认内存存储，持久化（RDB/AOF）只是兜底——核心数据必须在磁盘数据库有正本，Redis 里永远是「可以随时重建的副本」。
4. **坑 4：写操作「更新缓存」而非「删缓存」**。并发下「更新库+更新缓存」两步之间会被插入，缓存留下旧值——删缓存把一致性交给下次读取自然解决。
5. **坑 5：缓存键没有命名规范**。`key1`、`temp`、`user42` 混在一起没法批量管理和排查——用冒号分层：`对象:id:字段`（如 `article:42:views`），这是 Redis 社区的通用惯例。
6. **坑 6：大 key 不设防**。往一个 String/List 里塞百万元素——读写它阻塞整个 Redis（单线程模型），大 key 拆分或改用 Hash 分桶。

## 小练习

1. 在 try.redis.io 完成第 1、2 步全部命令，观察 TTL 递减与 ZREVRANGE 的输出结构。
2. 写出「文章详情页」完整的 Cache Aside 读路径伪代码，标注三个分支（命中/未命中/不存在）各自的行为与 TTL。
3. 综合任务：用 INCR + EXPIRE 实现接口限流器——同一用户 1 分钟内最多 60 次请求（提示：第一次请求时设置过期，超 60 次拒绝）。
4. 思考题：为什么「先更新数据库、再删缓存」的顺序不能反？（提示：想想「删了缓存→读请求回源拿到旧库数据→写回缓存」的时序。）
