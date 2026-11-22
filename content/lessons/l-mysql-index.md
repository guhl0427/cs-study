---
id: l-mysql-index
slug: mysql-index
title: InnoDB 与 B+ 树：索引的真实结构
difficulty: 3
estMinutes: 85
tags: [MySQL, InnoDB, 索引]
summary: 拆开「目录」看页：B+ 树三层结构与树高算术、聚簇与二级索引叶子里各存什么、回表与覆盖索引的 EXPLAIN 实证、自增主键与 UUID 的写放大、最左前缀在树上的解释——跟着做完实验，看懂结构如何决定执行计划。
updated: 2026-11-22
resources:
  - id: r-innodb-doc
    title: MySQL 官方 · InnoDB 索引结构
    url: https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html
    type: doc
    difficulty: 3
    note: 聚簇与二级索引的权威说明。
  - id: r-btree-vis
    title: B+ Tree 可视化（USF）
    url: https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html
    type: tool
    difficulty: 1
    note: 动画插入/删除，亲手看树怎么分裂。
  - id: r-javaguide-index
    title: JavaGuide · MySQL 索引详解
    url: https://javaguide.cn/database/mysql/mysql-index.html
    type: doc
    difficulty: 2
    note: 中文图解 B+ 树、回表与最左前缀，面试题整理很全。
---

> 一句话定义：InnoDB 的索引是 **B+ 树**——聚簇索引按主键把整张表组织成一棵树，二级索引是「列值 → 主键」的映射树；树高通常 3-4 层，意味着千万行里定位任意一行只需 3-4 次页读取，而回表与否完全取决于「叶子里存了什么」。

## 概念讲解

### 从「目录」到「页」：读写的基本单位是 16KB

入门课说索引是书的目录，这一课把书拆开：InnoDB 读写的基本单位不是「行」，是**页（Page，默认 16KB）**——目录的每一「片」是一个页，数据本体也按页存放。查找就像翻字典：先翻薄的部首目录（根/内部节点），再翻厚的正文（叶子节点）。本课所有「为什么快/慢」的争论，最后都要落到同一个问题：**这次查询读了几个页**。

### B+ 树的三层结构

```text
                     [ 100 | 300 ]                          ← 根节点页（常驻内存）
                   /          |           \
         [ 10 | 50 | 90 ]  [ 100 | 200 ]  [ 300 | 500 ]     ← 内部节点页（只存键+指针）
          /   |   \           /   |   \          /   |   \
 叶子页:[1..10]→[11..50]→[51..90]→[91..100]→[101..200]→ … ← 存数据，双向链表相连
```

三个结构性质，每个都对应一类面试题与一类 EXPLAIN 现象：

1. **根与内部节点只存「键 + 指针」不存数据**——一页塞得下上千个目录项，扇出极大，树才长得矮；
2. **叶子层是双向链表**——范围查询定位到起点后沿链表顺序扫，不必层层回到树上找；`ORDER BY` 主键天然免费；
3. **树矮**——每层是一次页读取，树高就是一次精确查找的随机 I/O 次数。

### 树高的算术：千万行为什么只要 3-4 层

估算一下（主键 BIGINT 8 字节 + 页指针约 6 字节 ≈ 每条目录项 14 字节，16KB 页容纳约 1100 条；叶子页按每行 1KB 算约 16 行/页）：

```text
第 1 层 根:    1 页
第 2 层 内部:  ~1170 页（每页再扇出 ~1170）
第 3 层 叶子:  1170 × 1170 ≈ 137 万页 × 16 行/页 ≈ 2×10⁷ 行
```

**约 2000 万行的表树高 3 层**：根 → 内部 → 叶子，3 次页读取命中任意一行；行更宽（如 4KB/行）时 3 层约 500 万行、4 层可撑上百亿。这就是「索引把全表扫描 O(n) 变成 O(log n)」的物理含义——**优化索引，本质是在减少页读取次数**：树高 3 的表一次点查最多 3 个页，页都热在 buffer pool 里时就是微秒级。

### 聚簇索引 vs 二级索引：叶子里存什么

InnoDB 的表本身就是按主键组织的**聚簇索引**——「索引即数据，数据即索引」，一张表、多棵树：

```text
主键树（聚簇索引，仅一棵）               email 树（二级索引，每个索引一棵）
  叶子: id=1 → [1, a@x.com, 张三, 25]      叶子: a@x.com → 1
  叶子: id=2 → [2, b@y.com, 李四, 30]      叶子: b@y.com → 2
  叶子: id=3 → [3, c@z.com, 王五, 18]      叶子: c@z.com → 3
```

| 对比项 | 聚簇索引（主键树） | 二级索引（如 email 树） |
| ---- | ---- | ---- |
| 叶子存什么 | 整行数据 | 索引列值 + 主键值 |
| 一张表几棵 | 有且仅一棵 | 每个二级索引一棵 |
| 查到叶子就完了吗 | 是 | 只取索引列/主键时是；要别的列就得**回表** |
| 主键的影响 | 表的物理顺序 = 主键顺序 | 主键越长，每棵二级索引都越胖 |

**回表**：`SELECT * FROM users WHERE email=?` 先在 email 树定位到主键 1，再回主键树取整行——二次查找，命中 N 行就回 N 次。**覆盖索引**：要的列恰好全在二级索引里（`SELECT id, email WHERE email=?`），叶子层直接给答案，跳过主键树——EXPLAIN 的 Extra 显示 `Using index`。

### 自增主键 vs 随机 UUID：写放大从哪来

插入 = 往主键树放一个条目。**自增主键**：新行永远落在最右端的页，页满开新页继续追加——顺序写，旧页几乎不再碰。**随机 UUID**：插入点均匀散布全树，频繁命中「快满的页」触发**页分裂**——旧页一拆为二、上层目录项跟着改、多个页写回磁盘，一次逻辑插入放大成多次物理写，表越大碎片越多、缓存命中率越低。结论：UUID 可做唯一列但别做主键；分布式主键选雪花这类**趋势递增** ID。

### 联合索引的最左前缀：在树上是什么样

`CREATE INDEX idx_sc ON articles(status, created_at)` 的树，排序规则是**先按 status 排、status 相同再按 created_at 排**——像字典先按首字母、同首字母再按第二个字母：

```text
(published,11-01) (published,11-03) (published,11-05) │ (draft,11-02) (draft,11-08)
└──── status='published' 段内 created_at 有序 ────┘    └──────── status='draft' 段 ────────┘
```

四种查询的命运由此注定：

1. `WHERE status=? AND created_at>?`——两列全用上：等值定位到 published 段，段内直接做范围扫；
2. `WHERE status=?`——只用第一列，定位到整段；
3. `WHERE created_at>?`（跳过第一列）——created_at 只「分段有序」并非全局有序，二分定位失效，只能全索引扫——**最左前缀原则的物理本质：跳过前导列，后面的有序性就不存在了**；
4. `WHERE status=? ORDER BY created_at`——等值之后链表天然有序，`Using filesort` 消失（下一课主角）。

### 三个高频面试题速答

1. **为什么用 B+ 树不用哈希表？** 哈希只有等值匹配快，范围/排序/最左前缀全部失效；B+ 树叶子链表天然支持范围与有序（InnoDB 有自适应哈希做等值加速，但主结构必须能有序）。
2. **为什么不用红黑树/AVL？** 二叉扇出只有 2，2000 万行树高约 25 层 = 25 次页读取；B+ 树扇出上千、3-4 层搞定——**矮是硬道理**。
3. **为什么主键推荐自增？** 见「写放大」一节：聚簇索引按主键组织全表，顺序追加 vs 随机分裂；且主键越短每棵二级索引越小——一好百好。

## 代码示例

主线任务：建表造数 → EXPLAIN/EXPLAIN ANALYZE 实证「回表 vs 覆盖索引」→ 联合索引三查询推演。全程约 30 分钟，MySQL 8.x 可复现。

### 第 0 步：建表并造 10 万行

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,      -- 聚簇索引：整张表按它组织
  email VARCHAR(100) NOT NULL,
  name VARCHAR(50) NOT NULL,
  age TINYINT NOT NULL,
  UNIQUE KEY uk_email (email)                -- 二级索引：叶子 = email + id
);

DELIMITER //
CREATE PROCEDURE seed_users(IN n INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= n DO
    INSERT INTO users (email, name, age)
    VALUES (CONCAT('user', i, '@test.com'), CONCAT('用户', i), 18 + (i % 40));
    SET i = i + 1;
  END WHILE;
END //
DELIMITER ;

CALL seed_users(100000);    -- 单条提交约几十秒；外包 START TRANSACTION/COMMIT 可快数倍
```

预期：`SELECT COUNT(*) FROM users;` → `100000`。

### 第 1 步：摸一摸二级索引的体积

```sql
SELECT INDEX_LENGTH/16384 AS approx_pages FROM information_schema.TABLES
WHERE table_name = 'users';      -- uk_email 的总大小折成 16KB 页数
-- 预期输出（数字因版本/字符集略有出入）：approx_pages ≈ 179
```

判读：email 索引每条约 30 字节，10 万行 ≈ 179 个页——「根 + 叶子」两层就装下，连内部层都不需要；**树高由行数 × 行宽共同决定**，长到千万级才会伸出第 3 层。

### 第 2 步：回表 vs 覆盖索引——同一 WHERE，只换 SELECT

```sql
CREATE INDEX idx_age ON users (age);         -- 普通二级索引（有重复值）

-- 查询 A：多要一个 name（不在索引里）→ 每个命中行都要回主键树
EXPLAIN SELECT id, age, name FROM users WHERE age = 25;
-- 预期（关键列）：type: ref | key: idx_age | rows: 2500 | Extra: NULL

EXPLAIN ANALYZE SELECT id, age, name FROM users WHERE age = 25;
-- 预期：Index lookup on users using idx_age (age=25)
--       (actual time=0.05..4.10 rows=2500 loops=1)

-- 查询 B：只要 id 和 age（都在叶子层）→ 覆盖索引
EXPLAIN SELECT id, age FROM users WHERE age = 25;
-- 预期（关键列）：type: ref | key: idx_age | rows: 2500 | Extra: Using index

EXPLAIN ANALYZE SELECT id, age FROM users WHERE age = 25;
-- 预期：Covering index lookup on users using idx_age (age=25)
--       (actual time=0.04..1.25 rows=2500 loops=1)
```

判读：WHERE 完全相同，只把 name 从 SELECT 里去掉——Extra 从 NULL 变 `Using index`，ANALYZE 从 Index lookup 变 **Covering index lookup**，实测耗时约降七成。2500 个命中行里，查询 A 回了 2500 次主键树（热身后每次只是内存访问）；单条查询体感差异不大，**放到高频接口上就是可观测的差距——覆盖索引是高频点查的标准优化**。

### 第 3 步：联合索引三查询推演

```sql
CREATE TABLE articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  status VARCHAR(16) NOT NULL,               -- draft / published
  created_at DATETIME NOT NULL,
  title VARCHAR(100) NOT NULL,
  KEY idx_status_created (status, created_at)
);

DELIMITER //
CREATE PROCEDURE seed_articles(IN n INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= n DO
    INSERT INTO articles (status, created_at, title)
    VALUES (IF(i % 2 = 0, 'published', 'draft'),
            '2026-01-01 00:00:00' + INTERVAL (i % 365) DAY + INTERVAL (i % 24) HOUR,
            CONCAT('文章', i));
    SET i = i + 1;
  END WHILE;
END //
DELIMITER ;
CALL seed_articles(50000);                   -- 约一半 published
```

查询 1（两列都用上）：

```sql
EXPLAIN SELECT id FROM articles
WHERE status = 'published' AND created_at >= '2026-06-01';
-- 预期（关键列）：type: range | key: idx_status_created | rows ≈ 14500
--                Extra: Using where; Using index
```

判读：status 等值定位到「published 段」，段内 created_at 有序、直接做范围扫描——**两列的有序性同时被吃掉**；id 藏在叶子层里，Using index 说明还白赚了覆盖。

查询 2（跳过前导列）：

```sql
EXPLAIN SELECT id FROM articles WHERE created_at >= '2026-06-01';
-- 预期（关键列）：type: index | key: idx_status_created | rows: 50000
--                Extra: Using where; Using index
```

判读：key 有值、甚至覆盖，**但这不是胜利**——type=index 是「全索引扫描」：created_at 在树里分段有序、无法定位，只能把整棵索引的叶子链表扫一遍。这正是概念讲解第 3 种查询的落地：跳过前导列，排好的序就帮不上忙（统计信息不同时也可能直接显示 type=ALL，结论一样）。

查询 3（等值 + 排序，filesort 消失）：

```sql
EXPLAIN SELECT id, created_at FROM articles
WHERE status = 'published' ORDER BY created_at DESC LIMIT 10;
-- 预期（关键列）：type: ref | key: idx_status_created
--                Extra: Using where; Using index   ← 没有 Using filesort

EXPLAIN ANALYZE SELECT id, created_at FROM articles
WHERE status = 'published' ORDER BY created_at DESC LIMIT 10;
-- 预期：Limit: 10 row(s)  (actual time=0.03..0.08 rows=10 loops=1)
--       └─ Index lookup on articles using idx_status_created
--          (actual time=0.03..0.07 rows=10 loops=1)  ← 只读了 10 行就停
```

判读：published 段在叶子链表里本就按 created_at 排好，DESC 就是**倒着走链表**，取满 10 条立即收工。对比查询 2 与查询 3：条件量级相近，一个读 5 万行、一个读 10 行——「过滤列 + 排序列」共用一棵联合索引，是 LIMIT 类查询最划算的结构设计。

## 常见坑

1. **坑 1：随机 UUID/手机号当主键**。现象：表越大 INSERT 越慢、磁盘碎片多、缓存命中率低。原因：随机插入触发页分裂，一次逻辑写放大成多次物理写。排查：观察随数据量增长的写延迟；对策：自增或趋势递增 ID（雪花），UUID 只做唯一列。
2. **坑 2：把「type 好」当成「不回表」**。现象：type=const/ref 的查询仍然偏慢。原因：type 只描述定位方式，SELECT 的列不在索引里照样逐行回表。排查：Extra 有没有 Using index；对策：按 SELECT 列裁剪，给高频查询配覆盖索引。
3. **坑 3：跳过联合索引最左列**。现象：索引明明建了却不生效。原因：树按「第一列 → 第二列」分层排序，跳过前导列后，后面的列只是分段有序。排查：EXPLAIN 里 key=NULL 或 type=index（全索引扫）；对策：条件带上前导列，或按查询模式重排列序。
4. **坑 4：索引列上套函数/隐式转换**。现象：`WHERE DATE(created_at)=…`、VARCHAR 列传数字，type=ALL。原因：树上排的是原始值，加工/转换后的值用不上有序性。对策：改写为范围条件、保持比较值与列类型一致（下一课的实验主线）。
5. **坑 5：索引越多越好**。现象：写接口随索引数量越来越慢。原因：每个索引都是一棵要同步维护的 B+ 树，写一次 = 改 N 棵树；低区分度列单列索引还常被优化器放弃。对策：只为高频查询模式建，定期清理 EXPLAIN 从不选中的索引。

## 小练习

1. 在 USF B+ 树可视化里分别插入 20 个递增键与 20 个随机键，记录两种模式的节点分裂次数，用「页分裂」解释差异。
2. 在 users 表再造一组「回表 vs 覆盖」对照（比如 `age BETWEEN 20 AND 22`），把两次 EXPLAIN 的 type/rows/Extra 抄成表格，并用 EXPLAIN ANALYZE 的 actual time 验证。
3. 最左前缀推演：联合索引 (city, age, name)，判断三条查询各能用上几列并说明理由——`WHERE city='北京' AND age=25`、`WHERE age=25 AND name LIKE '张%'`、`WHERE city='北京' AND name LIKE '张%'`。
4. **综合优化任务**：orders(id, user_id, status, created_at, amount) 100 万行，慢查询 `SELECT * FROM orders WHERE user_id=? AND status='paid' ORDER BY created_at DESC LIMIT 20`。设计联合索引并说明列序理由，用 EXPLAIN 验证无 Using filesort 且实际回表不超过 20 行，最后解释为什么索引列序不能随便换。
