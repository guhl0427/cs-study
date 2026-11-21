---
id: l-sql-select
slug: sql-select-join
title: SELECT 与 JOIN：一次把查询写清楚
difficulty: 1
estMinutes: 40
tags: [数据库, SQL]
summary: SQL 是声明式的——你描述「要什么」，不描述「怎么取」；JOIN 的本质是「按条件对齐两张表」。
updated: 2026-11-22
resources:
  - id: r-sql-visual
    title: A Visual Explanation of SQL Joins
    url: https://codingislove.com/visual-sql-joins/
    type: doc
    difficulty: 1
    note: 韦恩图直观理解各类 JOIN 的差异。
  - id: r-sql-play
    title: SQLBolt · 交互式练习
    url: https://sqlbolt.com/
    type: tool
    difficulty: 1
    note: 浏览器里逐课练，无需安装数据库。
---

> 一句话定义：SELECT 是声明式查询——`SELECT 字段 FROM 表 WHERE 条件`，你只描述「要什么数据」，怎么取是数据库优化器的事。

## 概念讲解

一条查询的**书写顺序**与**执行顺序**不同，理解后者才能解释各种现象：

```sql
SELECT author_id, COUNT(*) AS cnt      -- ⑤ 挑列
FROM articles                           -- ① 从哪张表
WHERE status = 'published'              -- ② 逐行过滤
GROUP BY author_id                      -- ③ 分组聚合
HAVING cnt >= 5                         -- ④ 过滤聚合结果
ORDER BY cnt DESC                       -- ⑥ 排序
LIMIT 10;                               -- ⑦ 截断
```

`WHERE` 在分组前逐行过滤，`HAVING` 在分组后过滤聚合值——「找出发文 ≥5 篇的作者」必须用 HAVING，写 WHERE 会直接报错。

**JOIN = 按条件对齐两张表**。最常用的是 `INNER JOIN`（两边都有才保留）与 `LEFT JOIN`（以左表为准，右边没有就补 NULL）：

```sql
-- 用户 + 各自的文章数（没有文章的用户也要出现 → LEFT JOIN）
SELECT u.name, COUNT(a.id) AS article_cnt
FROM users u
LEFT JOIN articles a ON a.author_id = u.id
GROUP BY u.id, u.name;
```

注意两处习惯：表起短别名（`users u`）；`COUNT(a.id)` 而不是 `COUNT(*)`——LEFT JOIN 时后者连「没有文章」的用户也会数成 1（数到的是 NULL 行）。

## 代码示例

从建表到三层查询一条龙（在 MySQL 或 PostgreSQL 里均可运行）：

```sql
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE articles (
  id INT PRIMARY KEY,
  author_id INT,
  status VARCHAR(20),
  created_at DATE
);

INSERT INTO users VALUES (1, 'guhl'), (2, '小明');
INSERT INTO articles VALUES
  (42, 1, 'published', '2026-11-01'),
  (43, 1, 'published', '2026-11-10'),
  (44, 2, 'draft',     '2026-11-20');

-- 谁在 11 月发布了文章？发布了几篇？
SELECT u.name, COUNT(*) AS cnt
FROM articles a
JOIN users u ON u.id = a.author_id
WHERE a.status = 'published' AND a.created_at >= '2026-11-01'
GROUP BY u.id, u.name;
```

## 常见坑

1. **坑 1：JOIN 忘写 ON 条件**。产生笛卡尔积——两表行数相乘的巨量结果。症状：查询「结果数异常多」。排查：确认每个 JOIN 都有 ON。
2. **坑 2：用 WHERE 过滤 LEFT JOIN 的右表**。`WHERE a.status = 'published'` 会把「没有文章的用户」整行过滤掉（NULL ≠ 'published'），LEFT JOIN 白写了——右表条件要放进 ON 里。
3. **坑 3：`SELECT *` 成习惯**。列增减就破坏下游代码，也吃掉优化机会。明确列出需要的列。

## 小练习

1. 在 SQLBolt 完成前 6 课。
2. 查询「11 月发布 ≥2 篇文章的作者名与篇数」（聚合 + HAVING）。
3. 构造一个 LEFT JOIN + WHERE 丢数据的例子，再改写为正确版本。
