---
id: l-sql-index
slug: sql-index
title: 索引：为什么查询突然变快
difficulty: 2
estMinutes: 35
tags: [数据库, 索引]
summary: 没有索引是逐页翻书，有索引是先查目录——B+ 树把百万行的查找从「全表扫描」变成「几次跳跃」。
updated: 2026-11-22
resources:
  - id: r-index-use
    title: MySQL · EXPLAIN 输出格式
    url: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
    type: doc
    difficulty: 3
    note: 看懂执行计划是索引调优的起点。
---

> 一句话定义：索引是数据库按某列「排好序的目录」——它把「逐行扫描全表」变成「按目录直达」。

## 概念讲解

没有索引时，`WHERE email = 'a@b.c'` 要从第一行读到最后一行（全表扫描，O(n)）；有了索引，数据库沿着 B+ 树做几次比较就直达目标（约 O(log n)）——百万行也就十几次跳跃。

主键自带索引；给查询条件列建索引是显式动作：

```sql
CREATE INDEX idx_articles_author ON articles (author_id);
CREATE INDEX idx_articles_status_time ON articles (status, created_at);
```

第二条是**联合索引**，顺序有讲究：按 `(status, created_at)` 查「某状态的某月文章」能走索引；只按 `created_at` 查则走不了（缺最左列）——这就是「最左前缀原则」。

**代价**：索引不是白拿的。每建一个索引，写入时都要多维护一棵树（插入变慢）；它也占磁盘空间。所以只给「真正高频作为查询条件」的列建索引。

## 代码示例

用 EXPLAIN 亲眼看到「扫了多少行」：

```sql
EXPLAIN SELECT * FROM articles WHERE author_id = 1;
```

观察输出里的 `key` 与 `rows` 两列：`key = idx_articles_author` 表示用上了索引；`rows ≈ 1` 表示预计只检查几行。把索引删掉再跑一次，`key` 变 NULL、`rows` 接近全表行数——这就是肉眼可见的差异。

验证最左前缀：

```sql
EXPLAIN SELECT * FROM articles WHERE created_at > '2026-11-01';      -- 走不了联合索引
EXPLAIN SELECT * FROM articles WHERE status = 'published'
  AND created_at > '2026-11-01';                                     -- 两个列都吃到索引
```

## 常见坑

1. **坑 1：对条件列套函数**。`WHERE DATE(created_at) = '2026-11-01'`——对列做了运算，索引失效。改写成范围条件：`created_at >= '2026-11-01' AND created_at < '2026-11-02'`。
2. **坑 2：给低区分度列单独建索引**。`status` 只有 3 个值，一半行都是 'published'，索引帮忙有限——它适合作为联合索引的前导列，而不是单列索引。
3. **坑 3：索引建越多越好**。每张表每个索引都在拖慢写入。定期审查：哪些索引从未被 EXPLAIN 选中，删掉。

## 小练习

1. 给练习库建联合索引，用 EXPLAIN 对比建索引前后的 rows 变化。
2. 找出一条会「索引失效」的写法并改写它（函数包裹列 / 隐式类型转换）。
3. 思考题：为什么「手机号 LIKE '%1234'」走不了 B+ 树索引，而「LIKE '138%'」可以？
