---
id: l-pg-advanced
slug: pg-advanced
title: PostgreSQL 对照：JSONB、数组与 CTE
difficulty: 3
estMinutes: 80
tags: [PostgreSQL, 对照学习]
summary: PG 与 MySQL 的 SQL 主干 95% 相通，差异集中在 JSONB/数组/递归 CTE 与行为默认值；JSONB+GIN 完整闭环（建表/插入/包含查询/提取）+ 递归 CTE 查三层评论树，最后给出列 vs JSONB 的白名单心法。
updated: 2026-11-22
resources:
  - id: r-pg-json
    title: PostgreSQL 官方文档 · JSON Types
    url: https://www.postgresql.org/docs/current/datatype-json.html
    type: doc
    difficulty: 3
    note: JSONB 与 JSON 的差异、操作符权威出处。
  - id: r-pg-cte
    title: PostgreSQL 官方文档 · WITH Queries（CTE）
    url: https://www.postgresql.org/docs/current/queries-with.html
    type: doc
    difficulty: 3
    note: CTE 与递归查询的官方章节。
  - id: r-pg-tutorial
    title: PostgreSQL Tutorial（postgresqltutorial.com）
    url: https://www.postgresqltutorial.com/
    type: doc
    difficulty: 1
    note: 结构清晰的英文教程站，JSONB/CTE 章节都不错。
---

> 一句话定义：PG 与 MySQL 的 SQL 主干 95% 相通，差异集中在「特色能力」（JSONB/数组/递归 CTE）与「行为默认值」（大小写、隔离级别）——JSONB 把 JSON 解析成二进制再配 GIN 索引，让半结构化数据既能灵活存、又能高效查。

## 概念讲解

### 95% 相通论：怎么对照着学

你会的 SQL 主干（SELECT/WHERE/JOIN/事务/索引思想）在 PG 原样能用，剩下 5% 分两类：**能力差异**——PG 多了 JSONB、数组、递归 CTE、全文检索；**默认值差异**——大小写折叠、默认隔离级别、MVCC 实现方式。对照学法：每学一个新特性问三个问题——MySQL 里怎么实现？PG 为什么更省事？代价是什么？

### JSONB：解析后的二进制 JSON

`json` 与 `jsonb` 都能存 JSON，差别在存储方式：

| | json | jsonb |
| ---- | ---- | ---- |
| 存什么 | 原样文本（保留空格、键序、重复键） | 解析后的二进制树 |
| 写入 | 快（不解析） | 略慢（要解析+编码） |
| 读取/查询 | 每次现解析 | 按结构直接取，快 |
| 索引 | 难 | **可建 GIN** |

类比：json 是「手抄的原稿」（怎么写怎么存），jsonb 是「整理归档的档案」（按结构编目）。**绝大多数场景选 jsonb**——写入多付一次解析，换来查询与索引能力。

### 列 vs JSONB 的取舍：白名单心法

| 数据特征 | 用列 | 用 JSONB |
| ---- | ---- | ---- |
| 结构固定、每个对象都有 | ✓（status、price） | |
| 要 WHERE 过滤/JOIN/聚合统计 | ✓ | 尽量别 |
| 要外键/唯一约束 | ✓ | 做不到 |
| 各对象结构不同、前端自定义展示 | | ✓（商品动态属性、个性化配置） |
| 第三方 API 回包原样落库 | | ✓ |

心法一句话：**「要约束、要统计、要关联」的字段用列；「多变、展示用、带内部分层」的用 JSONB**。全塞 JSONB 等于亲手拆掉数据库的约束与统计能力（呼应表结构设计课的范式）。

### GIN 索引：为「一行对多值」而生

B+ 树服务「一个值一行」的有序结构；JSONB/数组是「一行里有很多键/元素」，B+ 树没法直接吃。**GIN（广义倒排索引）**反过来组织：每个键/元素做条目，指向包含它的行——像书末的关键词索引，查「MVCC」直接翻到所有提到它的页。代价：写入要更新的条目更多、体积更大——**按查询频率建，不是见 JSONB 就建**。能吃 GIN 的操作符：`@>`（包含）、`?`（存在键/元素）、`&&`（数组交集）等。

### -> 与 ->>：一个取 JSON，一个取文本

| 操作符 | 返回类型 | 例（attrs = {"color":"red"}） |
| ---- | ---- | ---- |
| `->` | jsonb（JSON 片段） | `attrs->'color'` → `"red"`（带引号） |
| `->>` | text（文本） | `attrs->>'color'` → `red` |
| `#>` / `#>>` | 按路径取深层 | `attrs#>>'{meta,origin}'` |

比较时最容易翻车：`attrs->'color' = 'red'` 拿 jsonb 和 text 比，类型不匹配不成立——**过滤条件用 ->>，嵌套取值才用 ->**。

### 数组类型：什么时候可以不建关联表

PG 允许一列存同类型数组（`tags TEXT[]`），配 GIN 后支持 `&&`（交集）、`@>`（包含）过滤。边界判断：

- 数据量小、只做过滤展示（「查带 css 标签的文章」）→ 数组够用，省一张关联表、省一次 JOIN；
- 要计数（每个标签多少文章）、要外键约束（标签名规范化）、多对多要带属性（打标时间/权重）→ **关联表是正解**——数组放弃了行级约束与统计能力。

### CTE 与递归 CTE：把复杂查询写成步骤

普通 CTE（WITH）把子查询命名复用，复杂查询从「一层套一层」变成「先算 X，再用 X 算 Y」——可读性是第一收益（MySQL 8.0 也支持）。**递归 CTE** 多一个自引用分支，专治「层次不确定」的数据（组织架构、评论树、分类树）：

```sql
WITH RECURSIVE t AS (
    SELECT ... 基础层（树根）
  UNION ALL
    SELECT ... 递归层（基于 t 找孩子）
)
SELECT * FROM t;
```

执行模型：基础层先算出「第 1 批」，放进工作集；递归层拿工作集找下一批，直到空。**UNION ALL 不去重、UNION 去重**——树查询通常用 UNION ALL（去重既浪费还可能掩盖环）；数据可能成环（A 回复 B、B 回复 A）时，要在递归层加终止条件（depth 上限或路径判重）。

### 行为差异速查表（迁移前先过一遍）

| 维度 | MySQL 8 | PostgreSQL |
| ---- | ---- | ---- |
| 未加引号的标识符 | 不区分大小写 | 折成全小写（`createdAt` → `createdat`） |
| 默认隔离级别 | REPEATABLE READ | READ COMMITTED |
| JSON 能力 | JSON 类型 + 函数 | JSONB 二进制 + GIN，操作符体系完整 |
| 自增主键 | AUTO_INCREMENT | SERIAL / IDENTITY |
| MVCC 实现 | undo log 版本链 | 旧版本留在表里，靠 VACUUM 回收 |
| 生态默认 | LAMP/互联网传统栈 | 新创企业/数据分析偏好 |

## 代码示例

主线任务：JSONB+GIN 完整闭环（建表 → 插入 → 包含查询 → 提取）+ 数组边界实验 + 递归 CTE 查三层评论树。在 psql 或任意 PG 客户端执行。

### 第 0 步：建表与插入

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,                 -- PG 的自增（对照 MySQL 的 AUTO_INCREMENT）
  title VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,          -- 核心、要统计的字段：用列
  attrs JSONB NOT NULL DEFAULT '{}'      -- 动态属性：用 JSONB
);

INSERT INTO products (title, price, attrs) VALUES
  ('纯棉T恤', 59.00, '{"color": "red",  "sizes": ["S","M","L"], "brand": "白牌"}'),
  ('棒球帽',  39.00, '{"color": "blue", "sizes": ["M"],         "brand": "星火"}'),
  ('运动袜',  19.00, '{"color": "red",  "sizes": ["S","M"],     "brand": "白牌", "pack": 5}');
```

### 第 1 步：建 GIN 前后，看执行计划说话

```sql
EXPLAIN ANALYZE SELECT title FROM products WHERE attrs @> '{"color": "red"}';
-- 预期：Seq Scan on products  (actual rows=2)          ← 全表顺序扫

CREATE INDEX idx_attrs ON products USING GIN (attrs);

EXPLAIN ANALYZE SELECT title FROM products WHERE attrs @> '{"color": "red"}';
-- 预期：Bitmap Heap Scan on products  (actual rows=2)
--       └─ Bitmap Index Scan on idx_attrs  (actual rows=2)   ← 走了 GIN
```

判读：同一个查询，执行计划从 Seq Scan 变 Bitmap Index Scan——**「JSONB 能不能高效查」完全取决于有没有为它的查询模式建 GIN**；数据量小的时候无所谓，属性查询是核心接口时就是事故。

### 第 2 步：包含查询与字段提取

```sql
-- @> 包含：attrs 里「含有」color=red 的行
SELECT title, attrs->>'brand' AS brand
FROM products WHERE attrs @> '{"color": "red"}';
-- 预期：纯棉T恤 | 白牌；运动袜 | 白牌

-- -> 取 JSON 片段（带引号），->> 取文本
SELECT attrs->'color'  AS color_json FROM products LIMIT 1;   -- "red"
SELECT attrs->>'color' AS color_text FROM products LIMIT 1;   -- red

-- 过滤条件必须用 ->>（文本比较）
SELECT title FROM products WHERE attrs->>'brand' = '白牌';    -- 两行

-- ? 存在键；数组里存在元素也用它
SELECT title FROM products WHERE attrs ? 'pack';              -- 运动袜
SELECT title FROM products WHERE attrs->'sizes' ? 'L';        -- 纯棉T恤
```

判读：`->` 与 `->>` 的输出差一对引号——这就是「jsonb 片段 vs 文本」的区别；把它带进 WHERE 就变成了「能不能查出来」的问题（见坑 3）。

### 第 3 步：数组类型与关联表的边界

```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_tags ON articles USING GIN (tags);

INSERT INTO articles (title, tags) VALUES
  ('B+ 树图解', ARRAY['mysql', 'index', 'db']),
  ('MVCC 推演', ARRAY['mysql', 'txn', 'db']),
  ('CSS 网格',  ARRAY['css', 'frontend']);

SELECT title FROM articles WHERE tags && ARRAY['mysql', 'css'];   -- 交集非空：三行
SELECT title FROM articles WHERE tags @> ARRAY['mysql', 'txn'];   -- 包含全部：MVCC 推演
```

判读：没建关联表也完成了「标签过滤」——但产品一旦要求「统计每个标签的文章数」「标签改名要联动」就得 `unnest(tags)` 展开统计、甚至回退到关联表。**数组是「只读过滤」的甜点，不是关系建模的替代。**

### 第 4 步：递归 CTE——一条查询取整棵评论树

```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  article_id INT NOT NULL,
  parent_id INT,                      -- NULL = 顶级评论
  author VARCHAR(50) NOT NULL,
  body TEXT NOT NULL
);

INSERT INTO comments (article_id, parent_id, author, body) VALUES
  (1, NULL, '小明', '好文，收藏了'),
  (1, 1,    '小红', '同问，B+ 树那图太形象了'),      -- 回复 1
  (1, 2,    '小刚', '补充：叶子层还有双向链表'),      -- 回复 2（第三层）
  (1, NULL, '小丽', '作者能出 PG 对照版吗');

WITH RECURSIVE tree AS (
  -- 基础层：顶级评论
  SELECT id, parent_id, author, body, 1 AS depth, id::TEXT AS path
  FROM comments
  WHERE parent_id IS NULL AND article_id = 1
  UNION ALL
  -- 递归层：基于上一轮结果找孩子，depth/path 随身累加
  SELECT c.id, c.parent_id, c.author, c.body, t.depth + 1,
         t.path || '.' || c.id::TEXT
  FROM comments c
  JOIN tree t ON c.parent_id = t.id
)
SELECT repeat('    ', depth - 1) || author AS indent, depth, path, body
FROM tree
ORDER BY path;
```

预期输出：

```text
    indent      | depth | path  | body
----------------+-------+-------+----------------------
 小明           |     1 | 1     | 好文，收藏了
     小红       |     2 | 1.2   | 同问，B+ 树那图太形象了
         小刚   |     3 | 1.2.3 | 补充：叶子层还有双向链表
 小丽           |     1 | 4     | 作者能出 PG 对照版吗
```

判读：三层评论一条 SQL 取完，`depth` 与 `path` 是递归层「随身携带」的累计值——递归 CTE 的核心技巧：**每往下一层，就把这一层带来的信息（深度、路径）累加进列**。对照 MySQL 8.0：同样的 WITH RECURSIVE 语法可用；而 PG 的数组/JSONB 生态让这类查询的前后处理更顺手。

### 第 5 步：什么不该塞 JSONB（反例）

```sql
-- 反例：品牌开始参与统计与 JOIN，却还躺在 attrs 里
SELECT attrs->>'brand' AS brand, COUNT(*) FROM products GROUP BY 1;  -- 慢、无约束
-- 正解：升级为列 + 外键
-- ALTER TABLE products ADD COLUMN brand_id INT REFERENCES brands(id);
```

判读：某个 JSONB 键开始高频出现在 WHERE/JOIN/GROUP BY 里，就是把它「升级为列」的信号——JSONB 负责多变的展示层，列负责稳定的关系层。

## 常见坑

1. **坑 1：把 JSONB 当主力存储**。现象：业务一复杂，WHERE/JOIN/统计全变费劲，还失去约束。原因：JSONB 拆掉了关系层的约束与统计能力。排查：JSONB 键是否高频出现在过滤/聚合里。对策：升级为列，JSONB 只留展示属性。
2. **坑 2：忘了 GIN 索引**。现象：`@>`/`?` 查询随数据量线性变慢。原因：没有 GIN 就是全表扫描。排查：EXPLAIN 看是否 Seq Scan。对策：按查询模式建（只查存在性可用更小的 jsonb_path_ops）。
3. **坑 3：-> 与 ->> 混用**。现象：`WHERE attrs->'color' = 'red'` 报错或恒为假。原因：-> 返回 jsonb 片段，与 text 比较类型不匹配。对策：过滤用 ->>，嵌套取值才用 ->。
4. **坑 4：驼峰标识符被折叠**。现象：建表写 `createdAt`，之后查询报 column "createdat" 不存在；或加了双引号后处处都要带引号。原因：PG 把未加引号的标识符折成全小写。对策：命名一律小写下划线。
5. **坑 5：递归 CTE 数据成环跑不完**。现象：A 回复 B、B 回复 A 时查询报行数/内存超限。原因：UNION ALL 无限递归。对策：递归层带 depth 上限或 path 判重终止；用 UNION 去重时警惕它掩盖真正的环。
6. **坑 6：拿 MySQL 的默认行为套 PG**。现象：复现 MVCC 实验结果不同、大小写查询报错。原因：默认隔离级别与标识符折叠规则都不同。对策：迁移前过一遍行为差异速查表。

## 小练习

1. 在 products 表分别用 -> 与 ->> 查 color 记录输出差异；再故意写一条 `attrs->'color' = 'red'` 观察报错/恒假，解释原因。
2. 删掉 idx_attrs 重建，用 EXPLAIN ANALYZE 对比建 GIN 前后 `@>` 查询的计划与耗时。
3. 给第 4 步的评论树再挂两层回复，验证 depth/path 输出正确；然后人为构造 A→B→A 环，给递归层加上 depth 上限终止条件。
4. **综合设计任务**：电商商品表要支持「类目、价格区间、品牌（可统计）、颜色/尺码（多变）」——设计哪些字段用列、哪些用 JSONB+GIN，写出理由，并给「按品牌统计红色商品数」写出 SQL，说明它为什么依赖你的列/JSONB 划分。
