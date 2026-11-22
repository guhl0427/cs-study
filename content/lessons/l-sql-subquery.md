---
id: l-sql-subquery
slug: sql-subquery
title: 子查询与窗口函数初步
difficulty: 2
estMinutes: 75
tags: [数据库, SQL, 子查询, 窗口函数]
summary: 子查询让一条查询当值、当列表、当临时表用，EXISTS 短路与 NOT IN 的 NULL 陷阱是必修细节；窗口函数不折叠行就能算聚合——同一个「每类前 2 名」，子查询版与窗口函数版并排对照。
updated: 2026-11-22
resources:
  - id: r-sql-pg-window
    title: PostgreSQL · 窗口函数教程
    url: https://www.postgresql.org/docs/current/tutorial-window.html
    type: doc
    difficulty: 2
    note: OVER/PARTITION BY 语义的官方讲解，配可运行示例。
  - id: r-sql-my-window
    title: MySQL 8.0 · 窗口函数
    url: https://dev.mysql.com/doc/refman/8.0/en/window-functions.html
    type: doc
    difficulty: 2
    note: MySQL 侧语法与限制；注意 5.7 及更早版本没有窗口函数。
  - id: r-sql-sqlzoo
    title: SQLZoo · 在线练习
    url: https://sqlzoo.net/
    type: tool
    difficulty: 1
    note: 有专门的子查询与 JOIN 习题区，适合课后加练。
---

> 一句话定义：子查询是「把一条查询当作值、列表或临时表来用」；窗口函数是「不折叠行、就在每行旁边算出聚合或名次」——两者合起来，复杂查询就能一层一层搭出来。

## 概念讲解

### 子查询：查询当值用

上一章的查询里只能出现列名和常量；子查询把「另一条 SELECT 的结果」变成可用的东西。按结果的形状分三种，各自能放的位置不同：

| 形态 | 结果长相 | 能当什么 | 能放哪 |
| ---- | ---- | ---- | ---- |
| 标量 | 恰好 1 行 1 列 | 一个普通值 | WHERE 比较号旁、SELECT 列表里 |
| 列 | 多行 1 列 | 一组候选值 | IN / NOT IN / EXISTS / ANY / ALL |
| 表 | 多行多列 | 一张临时表 | FROM（派生表，必须起别名）|

判断放哪的钥匙还是执行顺序：WHERE 是第②步，SELECT 是第⑤步——子查询在哪个阶段被需要，就写在哪个子句里。这条规则还预告了一个重要限制：**窗口函数不能写进 WHERE**，因为窗口计算发生在⑤，WHERE 执行时它还不存在。

### 两种执行时机：先算一次 vs 逐行重算

- **非相关子查询**：内层不引用外层的列，从头到尾只算一次（如「高于全站平均」里的平均）。
- **相关子查询**：内层引用了外层的列（如 `b.category = a.category`），外层每一行都要触发一次内层计算。外层 1 万行就是 1 万次内层执行——有没有索引、内表多大，性能天差地别。写的时候先自问：内层用到了外层的列吗？

### IN vs EXISTS：语义与性能直觉

「x 在集合里」（IN）与「存在一行使条件成立」（EXISTS）在非 NULL 数据上语义等价，但行为有差异：EXISTS 找到第一行就短路返回 TRUE，不关心后面还有多少行，也不返回数据。性能直觉是「小结果集驱动大表」：外表大、内表过滤后很小时，EXISTS 常占优；现代优化器很多会把 IN 与 EXISTS 互相改写，所以**别背结论，EXPLAIN 说了算**——这条直觉的价值在于让你知道该往哪个方向改写试验。

NOT IN 有一个必知的语义陷阱：子查询结果里只要有一个 NULL，`x NOT IN (1, 2, NULL)` 对任何 x 都无法证明为 TRUE（NULL 比较得 UNKNOWN），整个条件全变 UNKNOWN，查询返回 0 行。NOT EXISTS 没有这个问题。陷阱的完整演示见查询 5。

### WITH（CTE）：给查询起名字，把长查询变成流水线

```sql
WITH recent AS (SELECT ... WHERE ...),   -- 第 1 步
     ranked AS (SELECT ... FROM recent)  -- 第 2 步，可引用 recent
SELECT ... FROM ranked;                  -- 第 3 步
```

WITH 定义一个「临时命名结果集」（CTE，公共表表达式）：可逗号分隔定义多个，后面的能引用前面的，同一个 CTE 还能在主查询里被引用多次（比把同一段子查询复制三遍强得多）。价值不在功能新增——CTE 能做的 FROM 子查询都能做——而在**分层可读**：一条 200 行的巨型 SQL 变成带名字的三步流水线，review 和调试都容易。

### 窗口函数：GROUP BY 折叠行 vs OVER 保留行

需求「每篇文章旁边显示它所在分类的平均浏览量」。GROUP BY 会把 12 行折叠成 3 行——文章明细没了，只能再 JOIN 回原表，两步；窗口函数在每行旁边直接算，行不动，一步：

```text
GROUP BY（折叠）                    OVER（开窗）
┌──────────────────────┐          ┌────────────────────────────┐
│ 12 行 → 3 行          │          │ 12 行 → 还是 12 行          │
│ db      | 800        │          │ SQL 入门    | 1200 | 800   │
│ net     | 875        │          │ 索引原理    |  900 | 800   │
│ python  | 500        │          │ 事务与 ACID |  700 | 800   │
│ （明细丢失）          │          │ （每行都带着自己的分组均值） │
└──────────────────────┘          └────────────────────────────┘
```

OVER 语法两件套：`PARTITION BY 列` 把行分区（窗口的边界，相当于「局部 GROUP BY」）；`ORDER BY 列` 在分区内部排序——有了窗口内顺序，才能排名、才能算累计。两者都可省略：只有 PARTITION BY 时窗口是「本分区内所有行」；全省略时窗口是「全表所有行」。

常用三函数：

| 函数 | 行为 | 典型用途 |
| ---- | ---- | ---- |
| `ROW_NUMBER()` | 行号 1,2,3,4 永不重复 | 取「每组前 N 名」的标准工具 |
| `RANK()` / `DENSE_RANK()` | 并列同名次：RANK 跳号（1,2,2,4），DENSE_RANK 不跳（1,2,2,3） | 榜单并列语义，按业务选 |
| `SUM(col) OVER (… ORDER BY …)` | 按窗口顺序累计（running total） | 累计销量、滚动求和 |

注意平局细节：ROW_NUMBER 对并列行也会强行编号，先后顺序由 ORDER BY 决定——**不补一个唯一列（如 id）破并列，两次运行编号可能不同**。

### 「每组前 N」：本章主线问题的两个解法

「每个分类里浏览量最高的前 2 名」是排名类需求的原型，GROUP BY 无能为力（折叠后拿不回明细），标准解法有两族：

- **窗口函数版（推荐）**：算出 `rn = ROW_NUMBER() OVER (PARTITION BY category ORDER BY views DESC)`，再套一层子查询过滤 `rn <= 2`。为什么套一层？因为 rn 在第⑤步才诞生，WHERE 不能直接用——这正是本章开头那条执行顺序规则的现场应用。
- **相关子查询版**：留在结果里的行，满足「同分类里浏览量比它大的行数 < 2」。语义直白，但外层每行触发一次计数。

## 代码示例

主线：一张 articles（文章表），先练子查询三形态，再用「每类前 2 名」把子查询版与窗口函数版放在一起对照。全部 SQL 可直接粘贴运行；窗口函数需要 MySQL 8.0+ 或任意近期 PostgreSQL。

### 第 0 步：建表造数（整段粘贴）

```sql
CREATE TABLE articles (
  id       INT PRIMARY KEY,
  category VARCHAR(20) NULL,   -- 允许 NULL 仅为演示 NOT IN 陷阱；生产应 NOT NULL
  title    VARCHAR(100) NOT NULL,
  views    INT NOT NULL
);
INSERT INTO articles VALUES
  (1, 'db',     'SQL 入门',     1200), (2, 'db',    '索引原理',   900),
  (3, 'db',     '事务与 ACID',   700), (4, 'db',    '备份与恢复', 400),
  (5, 'net',    'HTTP 详解',    1500), (6, 'net',   'TCP 握手',  1100),
  (7, 'net',    'DNS 解析',      600), (12,'net',   'HTTPS 证书', 300),
  (8, 'python', '装饰器',        800), (9, 'python','生成器',     500),
  (10,'python', '协程入门',      500), (11,'python','正则表达式', 200);
```

### 第 1 步：标量子查询（一个值）

```sql
-- 查询 1a｜WHERE 标量：浏览量高于全站平均
SELECT id, title, views FROM articles
WHERE views > (SELECT AVG(views) FROM articles);   -- 平均 725，只算一次
-- 结果：5 行      内层非相关（没引用外层列）→ 一个常量，优化器算一次。
-- | id | title    | views |
-- | 1  | SQL 入门 | 1200  |
-- | 2  | 索引原理 |  900  |
-- | 5  | HTTP 详解| 1500  |
-- | 6  | TCP 握手 | 1100  |
-- | 8  | 装饰器   |  800  |

-- 查询 1b｜SELECT 列表标量（相关）：每篇旁边放本类平均
SELECT title, views,
       ROUND(AVG(views) OVER (PARTITION BY category), 0) AS cat_avg
FROM articles WHERE category = 'db';
-- 先预习窗口版；纯子查询写法见查询 3a（逐行相关）。
-- 结果：4 行（db 类平均 800）
-- | title       | views | cat_avg |
-- | SQL 入门    | 1200  | 800     |
-- | 索引原理    |  900  | 800     |
-- | 事务与 ACID |  700  | 800     |
-- | 备份与恢复  |  400  | 800     |
```

### 第 2 步：IN 与 EXISTS（一组候选值）

```sql
-- 查询 2a｜IN：有高浏览文章（views>=1000）的分类
SELECT DISTINCT category FROM articles
WHERE category IN (SELECT category FROM articles WHERE views >= 1000);
-- 结果：2 行      内层先算出 {db, net}，外层逐行判断「在不在集合里」。
-- | category |
-- | db       |
-- | net      |

-- 查询 2b｜EXISTS 同一问题：存在同分类且 views>=1000 的行
SELECT DISTINCT a.category FROM articles a
WHERE EXISTS (SELECT 1 FROM articles b
              WHERE b.category = a.category AND b.views >= 1000);
-- 结果：2 行（db、net）  SELECT 1 表示不取数据只测存在；b.category 引用了
--                       外层的 a.category → 这是相关子查询，外层每行触发一次，
--                       找到即短路。IN 与 EXISTS 结果一致，性能用 EXPLAIN 验。

-- 查询 5｜NOT IN 的 NULL 陷阱（先插一行孤儿数据）
INSERT INTO articles VALUES (13, NULL, '孤儿测试', 10);
SELECT category FROM articles
WHERE category NOT IN (SELECT category FROM articles WHERE views >= 1000);
-- 结果：0 行！    内层结果 {db, net, NULL} 含 NULL → 对任何外层值，
--                NOT IN 都无法证明 TRUE → 全军覆没。这就是三值逻辑。

SELECT DISTINCT a.category FROM articles a
WHERE NOT EXISTS (SELECT 1 FROM articles b
                  WHERE b.category = a.category AND b.views >= 1000);
-- 结果：5 行      NOT EXISTS 不受 NULL 影响：python 4 行 + 孤儿 1 行。
--                结论：判「不在集合里」一律用 NOT EXISTS。
DELETE FROM articles WHERE id = 13;   -- 清理陷阱数据
```

### 第 3 步：相关子查询（逐行引用外查询）

```sql
-- 查询 3a｜本类名次：数「同类里比我大的行数」+1
SELECT title, views,
       (SELECT COUNT(*) FROM articles b
        WHERE b.category = a.category AND b.views > a.views) + 1 AS rank_in_cat
FROM articles a WHERE a.category = 'db';
-- 结果：4 行      外层每行触发一次 COUNT——1200 上面没人 → 1；900 上面
-- | title       | views | rank_in_cat | 有 1 篇 → 2；700 → 3；400 → 4。
-- | SQL 入门    | 1200  | 1           | 外层 1 万行就是 1 万次内层执行，
-- | 索引原理    |  900  | 2           | 关联列无索引时是灾难（索引一章展开）。
-- | 事务与 ACID |  700  | 3           |
-- | 备份与恢复  |  400  | 4           |
```

### 第 4 步：CTE 分层 + 窗口函数三件套

```sql
-- 查询 4a｜WITH：每类浏览量最高的文章（分层两步走）
WITH top AS (SELECT category, MAX(views) AS top_views
             FROM articles GROUP BY category)
SELECT a.category, a.title, a.views
FROM articles a JOIN top t ON t.category = a.category AND a.views = t.top_views;
-- 结果：3 行      第一步算出各类峰值，第二步 JOIN 回明细拿标题。
-- | category | title     | views |  CTE 的价值：每一步有名字、
-- | db       | SQL 入门  | 1200  |  可独立调试，主查询只剩
-- | net      | HTTP 详解 | 1500  |  一条清爽的 JOIN。
-- | python   | 装饰器    |  800  |

-- 查询 4b｜三函数对照：ROW_NUMBER / RANK / DENSE_RANK（python 类有 500 平局）
SELECT title, views,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY views DESC, id) AS rn,
       RANK()       OVER (PARTITION BY category ORDER BY views DESC, id) AS rk,
       DENSE_RANK() OVER (PARTITION BY category ORDER BY views DESC, id) AS drk
FROM articles WHERE category = 'python';
-- 结果：4 行      平局时：RANK 同名次但跳号（2,2,4），DENSE_RANK 不跳
-- | title       | views | rn | rk | drk |  （2,2,3）；ROW_NUMBER 强行
-- | 装饰器      |  800  | 1  | 1  | 1   |  分先后（靠 id 破并列）。
-- | 生成器      |  500  | 2  | 2  | 2   |  取前 N 用 rn；做榜单
-- | 协程入门    |  500  | 3  | 2  | 2   |  按业务选 rk 或 drk。
-- | 正则表达式  |  200  | 4  | 4  | 3   |

-- 查询 4c｜SUM() OVER：类内累计浏览量（按 views 降序累计）
SELECT title, views,
       SUM(views) OVER (PARTITION BY category ORDER BY views DESC, id) AS running
FROM articles WHERE category = 'db';
-- 结果：4 行 → running 依次 1200 | 2100 | 2800 | 3200
-- 窗口内 ORDER BY 让 SUM 变「走到哪儿加到哪儿」；去掉 ORDER BY 则是分区总和。
```

### 第 5 步：主线对照——「每类前 2 名」两种写法

```sql
-- 查询 6a｜窗口函数版：先编号，套一层再过滤 rn
SELECT category, title, views
FROM (SELECT category, title, views,
             ROW_NUMBER() OVER (PARTITION BY category ORDER BY views DESC, id) AS rn
      FROM articles) AS ranked        -- 派生表必须起别名（两库都强制）
WHERE rn <= 2
ORDER BY category, views DESC;
-- 结果：6 行      一次扫描算完所有名次；改「前 3 名」只动一个数字。
-- | category | title    | views |
-- | db       | SQL 入门 | 1200  |
-- | db       | 索引原理 |  900  |
-- | net      | HTTP 详解| 1500  |
-- | net      | TCP 握手 | 1100  |
-- | python   | 装饰器   |  800  |
-- | python   | 生成器   |  500  |

-- 查询 6b｜相关子查询版：同类里比我大的行数 < 2
SELECT a.category, a.title, a.views
FROM articles a
WHERE (SELECT COUNT(*) FROM articles b
       WHERE b.category = a.category AND b.views > a.views) < 2
ORDER BY a.category, a.views DESC;
-- 结果：6 行（与 6a 完全一致）  语义直白、不用记窗口语法；但外层每行
-- 触发一次 COUNT，数据量上来后通常比窗口版慢。两条路都要会：
-- 读懂别人的子查询版，自己动手优先窗口版。
```

## 常见坑

1. **坑 1：标量位置收到多行**。现象：`WHERE views > (SELECT views FROM ...)` 报 more than one row returned by a subquery（PG/MySQL 类似）。原因：比较号两侧只能是一个值，子查询却返回多行。排查：给内层加聚合（MAX/AVG）或 LIMIT 1，或改用 IN 语义。
2. **坑 2：NOT IN 遇到 NULL 全军覆没**。现象：NOT IN 查询返回 0 行，但直觉上肯定有数据。原因：内层结果含一个 NULL，整个 NOT IN 全变 UNKNOWN（见查询 5 的亲手演示）。排查：`SELECT ... WHERE col IS NULL` 查内层有无 NULL；对策：一律改 NOT EXISTS。
3. **坑 3：FROM 子查询忘起别名**。现象：PG 报 subquery in FROM must have an alias；MySQL 报 Every derived table must have its own alias。原因：派生表是一张「表」，表没有名字后面没法引用。排查：给每个 `(...) AS xxx` 补别名，CTE 则天然有名字。
4. **坑 4：窗口函数写进 WHERE**。现象：`WHERE ROW_NUMBER() OVER (...) <= 2` 报错（PG: window functions are not allowed in WHERE）。原因：窗口在第⑤步 SELECT 阶段计算，WHERE 是第②步，执行时窗口还不存在。排查：把带窗口的查询包成子查询/CTE，外层再过滤（见查询 6a 的标准套路）。
5. **坑 5：相关子查询当成普通子查询，慢得莫名其妙**。现象：数据量一大，一条看似简单的查询耗时飙升。原因：内层引用外层列 → 外层每行触发一次内层执行。排查：EXPLAIN 看执行计划里内层是否被反复执行（DEPENDENT SUBQUERY）；对策：改写为 JOIN 或窗口函数，并给关联列建索引。
6. **坑 6：ROW_NUMBER 平局编号不稳定**。现象：同一查询两次运行，并列行的编号互换，翻页出现重复或丢行。原因：ORDER BY 没有唯一列，并列行的先后由存储顺序决定。排查：窗口 ORDER BY 永远补一个唯一列（id）破并列——查询 4b 里 `views DESC, id` 就是这个目的。另外记住版本红线：窗口函数与 CTE 需要 MySQL 8.0+（5.7 没有），PostgreSQL 均支持。

## 小练习

1. 把查询 1a 的「高于全站平均」改写成「高于本类平均」：相关标量子查询版与 `AVG() OVER` 窗口版各写一次，运行核对两版结果是否一致（应为 id 1、2、5、6、8 五行）。
2. 把查询 6a 改成「每类第 2 名」（rn = 2）：先预测三行分别是哪三篇，再运行验证；再把 RANK 换成 DENSE_RANK 看结果会不会变（提示：db 类无平局，python 类有）。
3. 找 bug：`SELECT title FROM articles WHERE views > (SELECT AVG(views) FROM articles WHERE category = 'db');` 想找「每类比各自平均高的文章」——为什么结果其实是「比 db 类平均高的所有文章」？指出内层没有引用外层列这一关键，并改成正确版本。
4. **综合查询设计**：给博客后台写「类目热榜」——用 CTE 先算每类平均浏览量，再用窗口函数给每类排名、取每类前 2，输出类目、标题、浏览量、类内名次（四列）。要求：说明为什么 rn 不能直接写进外层 WHERE；并回答「若想并列名次同现（500 的两篇都进前 2），ROW_NUMBER、RANK、DENSE_RANK 该选哪个」。
