---
id: l-backend-redis
slug: redis
title: Redis 缓存：用内存换时间
difficulty: 2
estMinutes: 85
tags: [Redis, 缓存, 后端]
summary: 一次 MySQL 查询 1–10ms、一次 Redis 读 0.1ms——五大数据类型、单线程模型、Cache Aside 读写模式、一致性完整时序推演、穿透/击穿/雪崩三兄弟，跟着把缓存用到真实项目里。
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
  - id: r-redis-pipeline
    title: Redis 官方文档 · Pipelining
    url: https://redis.io/docs/latest/develop/use/pipelining/
    type: doc
    difficulty: 2
    note: Pipeline 批量操作的原理与使用边界。
---

> 一句话定义：Redis 是**存在内存里的键值数据库**——用两个数量级的速度差，把「读多改少」的数据挡在 MySQL 前面；它是缓存，也是计数器、排行榜和分布式锁。

## 概念讲解

**为什么缓存有效？** 算一笔账：一次 MySQL 主键查询约 1–10ms，一次 Redis 读约 0.1ms——相差两个数量级。课程热度榜、用户信息这类「读多改少」的数据，每次都查库就是在浪费。缓存的本质是**用空间（内存副本）换时间（查询延迟）**，代价是要处理「副本与正本不一致」的问题——后文 Cache Aside 就是这个问题的标准答案。

**单线程模型：Redis 的胆量与软肋同源**。Redis 的命令处理是**单线程**的——所有命令排成一队逐条执行。这不是性能短板而是设计选择：数据全在内存（单次操作 0.1ms 级），瓶颈在网络 IO 而非 CPU，于是用 IO 多路复用（一个线程同时盯住海量连接）+ 单线程执行，既榨干网络吞吐，又换来一个天大的好处——**每条命令天然原子**，INCR 自增、SETNX 抢锁都不需要加锁。代价同样鲜明：**任何慢命令都会阻塞后面所有人**：

```text
          排队执行（单线程队列）
请求1 ──┐
请求2 ──┼─► [ 快命令 0.1ms | 慢命令 2000ms | 快命令 0.1ms | ... ]
请求3 ──┤                        ▲
请求4 ──┘                        └─ 它慢，后面全体陪等
```

| 高危命令 | 为什么慢 | 生产对策 |
| ---- | ---- | ---- |
| `KEYS *` | 扫全库 O(N) | 禁用，改用 SCAN 渐进扫描 |
| 大集合 `LRANGE 0 -1` | 一次读出百万元素 | 限量分页读 |
| 大 key 频繁读写 | 单值/元素过多 | 拆分或 Hash 分桶（见坑 6） |

**内存淘汰策略（LRU/LFU 一句）**：内存有限，`maxmemory` 到上限后 Redis 按策略腾地方——`noeviction`（默认，拒绝写入）、`allkeys-lru`（踢最久没被访问的键）、`allkeys-lfu`（踢访问频率最低的键）、`volatile-ttl`（挑快过期的删）。纯缓存场景常用 allkeys-lru：缓存本来就该「谁冷踢谁」，踢掉的数据从数据库重新加载即可。

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

**一次完整的一致性时序推演**——把「为什么是这个顺序」演给你看。先看**反例**（先删缓存再更新库）：

```text
时刻  写线程 A                     读线程 B
 t1   删除缓存                     ──
 t2   ──                           查缓存：未命中
 t3   ──                           查数据库：读到旧值 v1
 t4   ──                           把 v1 写回缓存   ← 旧值入缓存！
 t5   更新数据库：v1 → v2          ──
结果：库是 v2、缓存是 v1 —— 不一致状态停留到 TTL 到期
```

再看**正例**（先更新库再删缓存）的竞态窗口：

```text
时刻  写线程 A                     读线程 B
 t1   ──                           查缓存：未命中
 t2   ──                           查数据库：读到旧值 v1
 t3   更新数据库：v1 → v2          ──
 t4   删除缓存                     ──
 t5   ──                           把 v1 写回缓存   ← 理论上旧值仍可回写
结果：窗口仍在，但触发条件苛刻——B 必须在「查完库」和「写回缓存」之间
     卡到比 A 的「更新库+删缓存」全程还慢（数据库写通常比读慢，概率极低）
```

结论：两种顺序都有理论窗口，但「先更新库、再删缓存」把出错的概率压到工程上可忽略，配合 TTL 兜底，就是事实标准。**绝对一致不存在，缓存方案全部在做概率折衷**——这句话能回答 90% 的一致性面试追问答。

**三大经典故障**是面试与实战的高频考区，先混个脸熟（后文代码示例给出解法）：

```text
穿透：反复查一个「根本不存在」的 id → 每次都穿透到数据库
击穿：一个热点 key 过期瞬间，海量请求同时砸向数据库
雪崩：大批 key 同时过期 → 数据库瞬间被洪水冲垮
```

**Pipeline：把 N 次往返压成 1 次**。一条 Redis 命令 = 一次网络往返，批量写 1 万个键就是 1 万次往返（每次往返 0.5–1ms，光等网络就十几秒）；Pipeline 把一批命令打包发送、一次收齐所有响应，往返次数从 N 降到 1。注意：打包≠事务——命令仍逐条执行，只是省掉了来回等网络的开销。

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

**第 5 步：Pipeline 批量写入（对比实验）**：

```python
import time

# 朴素版：1 万次 set = 1 万次网络往返
t0 = time.perf_counter()
for i in range(10000):
    r.set(f"user:{i}:last_seen", "2026-11-22")
t1 = time.perf_counter()

# Pipeline 版：打包发送，1 次往返
pipe = r.pipeline(transaction=False)             # transaction=False：纯打包
for i in range(10000):
    pipe.set(f"user:{i}:last_seen", "2026-11-22")
pipe.execute()
t2 = time.perf_counter()

print(f"朴素版 {t1-t0:.2f}s，Pipeline 版 {t2-t1:.2f}s")
```

预期输出（数值随环境浮动，倍数关系稳定）：`朴素版 9.87s，Pipeline 版 0.34s`——相差约 30 倍。

输出说明了什么：朴素版的时间几乎全花在「等网络来回」上，命令本身只占 0.1ms；Pipeline 把等待合并成一次，耗时断崖式下降。什么时候用它：初始化灌数据、批量预热缓存、报表类批量读取。什么时候别用：单键读写（本来就快）、10 万条一包（占满服务器缓冲区，分批 1 千条一包更稳）。

## 常见坑

1. **坑 1：缓存永不失效**。现象：数据库里字段改了，页面还显示旧数据。原因：缓存没有 TTL 也没有失效动作。排查与对策：任何缓存都要有过期时间或明确的失效机制（DEL），二选一，不能都没有。
2. **坑 2：缓存了「查不到」也没标记**。现象：恶意请求反复查一个不存在的 id，数据库被打满。原因：空结果不缓存，每次都穿透到数据库。排查与对策：把空结果也缓存一小段时间（见主线第 3 步③），或用布隆过滤器。
3. **坑 3：把 Redis 当主数据库用**。现象：Redis 重启后「用户数据丢了」。原因：Redis 默认内存存储，持久化（RDB/AOF）只是兜底。排查与对策：核心数据必须在磁盘数据库有正本，Redis 里永远是「可以随时重建的副本」。
4. **坑 4：写操作「更新缓存」而非「删缓存」**。现象：并发写时页面出现「改完又变回去」的诡异现象。原因：「更新库+更新缓存」两步之间会被其他请求插入，缓存留下旧值。排查与对策：删缓存把一致性交给下次读取自然解决（见时序推演）。
5. **坑 5：缓存键没有命名规范**。现象：排查问题时面对几百个 `key1`、`temp`、`user42` 无从下手。原因：键名随意，没有分层结构。排查与对策：用冒号分层 `对象:id:字段`（如 `article:42:views`），这是 Redis 社区的通用惯例。
6. **坑 6：大 key 不设防**。现象：某接口偶发把整个服务拖慢，其他接口无辜陪等。原因：往一个 String/List 塞百万元素，读写它阻塞整个 Redis（单线程模型，见概念讲解的队列图）。排查与对策：`redis-cli --bigkeys` 找出大 key，拆分或改用 Hash 分桶；顺带一句，生产环境同样要禁用 `KEYS *` 全库扫描——单线程被 O(N) 命令占住，效果等于自造了一次「人祸版阻塞」。

## 小练习

1. 在 try.redis.io 完成第 1、2 步全部命令，观察 TTL 递减与 ZREVRANGE 的输出结构。
2. 写出「文章详情页」完整的 Cache Aside 读路径伪代码，标注三个分支（命中/未命中/不存在）各自的行为与 TTL。
3. 综合任务：用 INCR + EXPIRE 实现接口限流器——同一用户 1 分钟内最多 60 次请求（提示：第一次请求时设置过期，超 60 次拒绝）；再把第 5 步的 Pipeline 用在「给 100 个用户批量初始化计数器」上。
4. 思考题：为什么「先更新数据库、再删缓存」的顺序不能反？（提示：用概念讲解的两张时序表，对比两种顺序的竞态窗口大小。）
