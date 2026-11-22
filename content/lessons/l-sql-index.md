---
id: l-sql-index
slug: sql-index
title: 索引：查询加速器
difficulty: 2
estMinutes: 80
tags: [数据库, 索引, 性能, EXPLAIN]
summary: 没有索引是逐行翻全表，有索引是沿 B+ 树直达——用一万行数据亲手做建索引前后对比，推演最左前缀、覆盖索引，逐个验证索引失效四场景，学会用 EXPLAIN 读懂执行计划。
updated: 2026-11-22
resources:
  - id: r-idx-my-explain
    title: MySQL · EXPLAIN 输出格式
    url: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
    type: doc
    difficulty: 3
    note: type/key/rows/Extra 每个字段的官方释义，调优必查。
  - id: r-idx-pg-explain
    title: PostgreSQL · EXPLAIN 使用指南
    url: https://www.postgresql.org/docs/current/using-explain.html
    type: doc
    difficulty: 3
    note: PG 侧读执行计划的官方教程，Seq Scan 与 Index Scan 的对照。
  - id: r-idx-luke
    title: Use The Index, Luke
    url: https://use-the-index-luke.com/
    type: book
    difficulty: 3
    note: 免费在线的索引调优专著，最左前缀与覆盖索引讲得最深。
---

> 一句话定义：索引是数据库按某列「排好序的目录」——把逐行翻全表变成沿树直达；代价是每写一行要多维护一棵树，所以建索引是设计决策，不是无脑开关。

## 概念讲解

### 无索引的代价：一个数量级直觉

`WHERE author_id = 7` 在没有索引的表上只有一个办法：从第一行读到最后一行，逐行问「你是不是 7」。1 万行就是 1 万次比较；放大到 100 万行、每行 10 微秒的处理成本，一次查询约 10 秒——而电商接口的预算通常是几十毫秒。有索引时走的是 B+ 树：从根到叶只跳 3~4 层，每层在节点内部做几十次有序比较，百万行的查找是**毫秒级**。这不是「快一点」，是 O(n) 到 O(log n) 的质变——所以慢查询优化十有八九从「有没有索引」查起。

### 索引 = 排好序的目录：B+ 树直觉图

```text
                ┌───────────────┐
        根节点 → │  50 ｜ 100    │            只放路标，不放数据
                └───┬─────┬─────┘
            ┌───────┘     └────────┐
        ┌───┴────┐           ┌─────┴──┐
        │ 50     │           │ 100    │   内节点：更细的路标
        └─┬──┬───┘           └─┬──────┘
      ┌───┘  └───┐             └───┐
   [1..49][50..74][75..99][100..∞]      叶子：数据指针，横向链表相连
```

三个特点决定了一切行为：**矮胖**——每个节点放很多路标，百万行也只要 3~4 层，每层约等于一次页读取；**叶子有序且成链**——范围查询（`BETWEEN`、`> x`、`LIKE 'ab%'`）命中起点后顺链扫就行；**每次查找等长**——从根到叶路径相同，性能稳定可预测。

### 主键索引、二级索引与回表

主键自带索引：MySQL InnoDB 更是「聚簇索引」——数据行本身按主键组织成这棵树；PostgreSQL 是堆表 + 主键上的一棵独立 B+ 树，效果相同。二级索引（你在其他列上建的索引）的叶子节点存的是「索引列值 + 主键」：按 author_id 找到目标后，若查询还要别的列，必须拿主键**再回主键树取整行**——这一步叫**回表**。推论：`SELECT *` 走二级索引必然回表；只 SELECT 索引里已有的列就不用回表（覆盖索引，见后）。PG 的索引叶子存行指针，细节不同，「要再取一次行」的本质相同。

### 联合索引与最左前缀

`CREATE INDEX idx ON articles (author_id, views)` 的排序规则是：先按 author_id 排，author_id 相同的再按 views 排——像电话簿先按姓、再按名。于是：

| 查询 | 走索引？ | 推演 |
| ---- | ---- | ---- |
| `WHERE author_id = 7` | 走 | 用第一列定位 |
| `WHERE author_id = 7 AND views > 3000` | 走 | 第一列定位，第二列在区内有序，可范围扫 |
| `WHERE views > 3000` | 不走 | 缺最左列：views 在树里是「段内有序」，全局无序 |

这就是**最左前缀原则**：查询条件必须从索引的最左列开始、连续地往右吃。一句推论：遇到范围条件（`>`, `BETWEEN`）后，其右侧的列就停止贡献定位能力（区内不再连续有序）——所以设计联合索引时把「等值列放前、范围列放后」。

### 覆盖索引：让查询不回表

如果查询要的所有列都在索引里，整行都不用取了——MySQL 在 EXPLAIN 的 Extra 显示 `Using index`，PG 显示 `Index Only Scan`。给高频查询「量身」建一个多列索引（把要查的列、要 SELECT 的列都包进去），是读密集接口的常见优化；代价是索引更宽、写放大更大。

### 索引失效四场景清单

| 场景 | 反例 | 为什么失效 | 改法 |
| ---- | ---- | ---- | ---- |
| 函数包列 | `WHERE DATE(created_at) = '2026-11-01'` | 树里排的是原始值，函数值无序 | 改范围：`>= '2026-11-01' AND < '2026-11-02'` |
| 隐式转换 | `WHERE phone = 13800001111`（phone 是 VARCHAR） | 每行做类型转换，等于函数包列 | 字面量带引号 `= '13800001111'` |
| 前导通配 | `LIKE '%abc'` | 前缀未知，无法在有序树里定位 | 前缀查询 `LIKE 'abc%'`，或全文/倒排方案 |
| 列参与运算 | `WHERE views + 1 = 101` | 同函数包列 | 移出常量：`views = 100` |

注：PostgreSQL 遇到 `varchar = integer` 这类类型不匹配会在解析阶段直接报错（没有这个操作符）；MySQL 静默转换、索引失效、照常返回——后者更危险，错得悄无声息。

### EXPLAIN：看什么、怎么判读

在任何候选查询前加 `EXPLAIN`（不执行，只给计划）：`EXPLAIN SELECT ...`。四个字段先看：

| 字段 | 健康值 | 危险值 | 含义 |
| ---- | ---- | ---- | ---- |
| type (MySQL) | ref / range | ALL | ALL = 全表扫描 |
| key | 你的索引名 | NULL | 实际用上的索引 |
| rows (MySQL) | 小 | ≈ 全表行数 | 预计检查的行数 |
| Extra | Using index（覆盖） | Using where 且 type=ALL | 附加动作 |

PG 的输出是文本：`Seq Scan`（全表扫）对 `Index Scan` / `Index Only Scan`，看 `cost` 与 `rows` 的变化；注意 PG 的 rows 是「预计产出行数」，MySQL 的 rows 是「预计检查行数」，别跨库混读。想知道真实耗时用 `EXPLAIN ANALYZE`（MySQL 8.0.18+ / PG 均支持）——它会真跑一遍并报告实际行数与时间。

### 建索引的取舍：写放大

每多一个索引，每次 INSERT/UPDATE/DELETE 都要多维护一棵树（主键列被 UPDATE 时代价最大），还要占磁盘。取舍规则：只给**高频出现在 WHERE / JOIN / ORDER BY** 的列建；低区分度列（如只有三个值的 status）单独建收益小，适合当联合索引的前导列配合等值条件；上线后定期审查——从未被 EXPLAIN 选中的索引，删掉，它们是纯粹的写税。

## 代码示例

主线：建一张 1 万行的 articles，亲手完成「无索引 → 建索引 → EXPLAIN 对比 → 最左前缀推演 → 覆盖索引 → 失效四场景」全流程。MySQL 8 / PostgreSQL 通用（造数语句两库不同，各选一行执行）。

### 第 0 步：建表 + 批量造数

```sql
CREATE TABLE articles (
  id        INT PRIMARY KEY,
  author_id INT NOT NULL,
  category  VARCHAR(20) NOT NULL,
  views     INT NOT NULL,
  title     VARCHAR(60) NOT NULL
);
-- PostgreSQL 造数（1 万行）：
INSERT INTO articles (id, author_id, category, views, title)
SELECT g, 1 + g % 50,
       CASE g % 3 WHEN 0 THEN 'db' WHEN 1 THEN 'net' ELSE 'python' END,
       (g * 37) % 5000,
       'article-' || g
FROM generate_series(1, 10000) AS g(n);
-- MySQL 造数（8.0+；5.7 没有 CTE，改用循环或存储过程，此处不展开）：
SET SESSION cte_max_recursion_depth = 10000;
INSERT INTO articles (id, author_id, category, views, title)
WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 10000)
SELECT n, 1 + n % 50,
       CASE n % 3 WHEN 0 THEN 'db' WHEN 1 THEN 'net' ELSE 'python' END,
       (n * 37) % 5000,
       CONCAT('article-', n)
FROM seq;
```

数据分布：50 个作者各约 200 行（author_id=7 恰好 200 行）；views 0~4999；三个类目。

### 实验 1：无索引 vs 有索引，EXPLAIN 亲眼对比

```sql
-- 无索引时（MySQL）：
EXPLAIN SELECT * FROM articles WHERE author_id = 7;
-- | type | possible_keys | key  | rows  | Extra       |
-- | ALL  | NULL          | NULL | 10000 | Using where |  ← 全表扫 1 万行
-- 无索引时（PG）：
-- Seq Scan on articles  (cost=0.00..185.00 rows=200 width=28)
--   Filter: (author_id = 7)      ← 逐页读完整个表，才筛出这 200 行

CREATE INDEX idx_author_views ON articles (author_id, views);
-- 建索引后（MySQL）：
-- | type | possible_keys    | key              | rows | Extra       |
-- | ref  | idx_author_views | idx_author_views | 200  | Using where |  ← 沿树直达
-- 建索引后（PG）：
-- Index Scan using idx_author_views on articles  (cost=0.29..8.31 rows=200 ...)
--   Index Cond: (author_id = 7)
-- 判读：MySQL 的 rows 10000→200（预计检查行数跌两个数量级）；PG 从
-- Seq Scan 变 Index Scan、cost 从 185 跌到 8。type=ref 表示「索引等值定位」。
```

### 实验 2：最左前缀三连推演

```sql
EXPLAIN SELECT * FROM articles WHERE author_id = 7;
-- → type=ref, key=idx_author_views, rows≈200        只用第一列，OK
EXPLAIN SELECT * FROM articles
WHERE author_id = 7 AND views > 3000;
-- → type=range, key=idx_author_views, rows≈80       两列都吃到：第一列定位、
--                                                   第二列区内范围扫
EXPLAIN SELECT * FROM articles WHERE views = 3000;
-- → MySQL type=ALL, key=NULL, rows≈10000            缺最左列 author_id，
--                                                   索引帮不上 → 全表扫
-- 对照概念里的推演表：三条查询的「能不能走」与预测完全一致。
```

### 实验 3：覆盖索引——把回表省掉

```sql
EXPLAIN SELECT views FROM articles WHERE author_id = 7;   -- 只要 views
-- → MySQL：type=ref, key=idx_author_views, Extra=Using index
--   （views 就在索引叶子里，免回表）
-- → PG：Index Only Scan using idx_author_views on articles
EXPLAIN SELECT * FROM articles WHERE author_id = 7;       -- 要整行
-- → MySQL：Extra 没有 Using index → 沿索引找到主键后回表取整行
-- 「索引里有我要的一切」是覆盖索引的唯一判据，与索引大小无关。
```

### 实验 4：失效四场景逐一验证

```sql
CREATE INDEX idx_category ON articles (category);
CREATE INDEX idx_title    ON articles (title);
CREATE INDEX idx_views    ON articles (views);

-- 场景 1｜函数包列
EXPLAIN SELECT * FROM articles WHERE category = 'db';        -- ref，走索引
EXPLAIN SELECT * FROM articles WHERE UPPER(category) = 'DB'; -- ALL，失效！
-- 改法：这里本无函数必要；日期场景用「范围改写」（见概念表格）。

-- 场景 2｜前导通配
EXPLAIN SELECT * FROM articles WHERE title LIKE 'article-5%'; -- range，走
EXPLAIN SELECT * FROM articles WHERE title LIKE '%5';         -- ALL，失效
-- 注：PG 默认排序规则下 LIKE 走 B+ 树需要 text_pattern_ops 操作符类，
-- 否则同样 Seq Scan——这是 PG 与 MySQL 的实现差异，判读时留意。

-- 场景 3｜类型不匹配（title 是 VARCHAR）
EXPLAIN SELECT * FROM articles WHERE title = 'article-7';  -- ref，正常
-- MySQL：EXPLAIN SELECT * FROM articles WHERE title = 7;
--        → type=ALL：字符串列配数字字面量，每行隐式转换，索引报废
-- PG：    同一句直接报错 operator does not exist: character varying = integer
--        → PG 在解析期就拒绝；MySQL 悄悄变慢——更要靠 EXPLAIN 体检

-- 场景 4｜列参与运算
EXPLAIN SELECT * FROM articles WHERE views = 100;     -- ref，走索引
EXPLAIN SELECT * FROM articles WHERE views + 1 = 101; -- ALL，失效
-- 改法：把运算移到常量一侧 views = 100；等价改写是免费的性能。
```

### 实验 5：顺手清理——审查你的索引

```sql
-- 本课为演示建的 4 个索引，生产库要用「是否被 EXPLAIN 选中」定期审查，
-- 没被选中的就删（EXPLAIN 只支持 SELECT，审查靠逐条查询的执行计划）：
DROP INDEX idx_title ON articles;           -- MySQL 语法：DROP INDEX 名 ON 表
DROP INDEX idx_title;                       -- PG 语法：DROP INDEX 名;
```

## 常见坑

1. **坑 1：给 WHERE 列套函数，索引静默失效**。现象：`WHERE DATE(created_at) = '2026-11-01'` 查询结果正确但越来越慢。原因：函数包列让树里的原始排序失去意义，type 退回 ALL。排查：EXPLAIN 看 key 是否为 NULL；对策：一律改成范围条件 `>= 起点 AND < 终点`。
2. **坑 2：隐式类型转换（MySQL 静默、PG 报错）**。现象：MySQL 上 `WHERE phone = 13800001111`（数字字面量）全表扫且不报错；PG 上同一句直接报 operator does not exist。原因：字符串列与数字比较触发行级转换。排查：EXPLAIN type=ALL；对策：字面量类型与列类型保持一致。
3. **坑 3：跳过最左列建联合索引**。现象：建了 (author_id, views) 却按 views 查询，依然慢。原因：第二列只在「第一列确定的区段内」有序。排查：EXPLAIN key=NULL 即索引没被选中；对策：按「等值列在前、范围列在后」重排索引列，或为单独查询补专用索引。
4. **坑 4：把「有索引」当成「一定走索引」**。现象：索引明明建了，EXPLAIN 却显示 ALL。原因：除失效四场景外，优化器估算走索引成本更高时（如命中行数占比过高、或表太小）会主动放弃索引。排查：EXPLAIN 的 rows 与全表行数的比例；对策：这不是 bug，别强行 FORCE INDEX，先想查询是否真的需要精准命中。
5. **坑 5：索引越多越好**。现象：为了「保险」给每个列都建索引，写入吞吐下降、磁盘暴涨、EXPLAIN 偶尔选错索引。原因：每个索引都是一棵要同步维护的树 + 优化器更大的选择空间。排查：审查从未被选中的索引（PG 可查 pg_stat_user_indexes 的 idx_scan 计数，MySQL 可查 sys.schema_unused_indexes）；对策：删掉纯写税。
6. **坑 6：拿 MySQL 的 rows 去读 PG 的 EXPLAIN**。现象：PG 显示 rows=200 以为只扫 200 行，实际 Seq Scan 读了全表。原因：PG 的 rows 是预计产出行数，不是检查行数；检查范围要看 Seq Scan/Index Scan 节点与 cost。排查：看节点类型优先于看数字；要真实数字用 EXPLAIN ANALYZE。

## 小练习

1. 在自己建的 articles 上重跑实验 1，把建索引前后的 type/key/rows 抄成两行对照表；再跑 `EXPLAIN ANALYZE` 记录真实耗时差异。
2. 写三条查询验证最左前缀（只用第一列、两列都用、只用第二列），各跑 EXPLAIN，把 type/key 填进概念节的推演表，核对与预测是否一致。
3. 诊断题：线上「按手机号查用户」接口变慢，表里 phone 是 VARCHAR(20) 且建有索引，代码是 `WHERE phone = 13800001111`。写出诊断过程（先看什么、再看什么）、根因，以及两种修法（改 SQL 与改字面量）。
4. **综合索引设计**：博客库有三种高频查询——A：`WHERE status = 'published' AND created_at >= x`；B：`ORDER BY created_at DESC LIMIT 20`（首页时间线）；C：`WHERE author_id = ? AND status = 'published'`。为每条设计联合索引并说明列顺序理由；指出哪个查询能做成覆盖索引（需要哪些列进索引）；最后评估：三个索引对这张以写为主的表的代价是否值得，给出取舍结论。
