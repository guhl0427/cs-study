---
id: l-sql-explain
slug: sql-explain
title: EXPLAIN 与慢查询优化
difficulty: 2
estMinutes: 80
tags: [MySQL, 性能优化]
summary: 先诊断再动手的铁律：五高频字段对照表、type 等级从好到坏、两条典型诊断路径、Using filesort 的成因与联合索引消除——两组「问题 SQL → EXPLAIN → 修复 → 实测」完整流程走完，慢查询不再靠猜。
updated: 2026-11-22
resources:
  - id: r-mysql-explain
    title: MySQL 官方 · EXPLAIN Output Format
    url: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
    type: doc
    difficulty: 3
    note: 每个字段、每个 type 等级的权威定义。
  - id: r-mysql-slowlog
    title: MySQL 官方 · 慢查询日志
    url: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
    type: doc
    difficulty: 2
    note: 线上抓慢 SQL 的第一入口。
  - id: r-pt-query-digest
    title: Percona Toolkit · pt-query-digest
    url: https://docs.percona.com/percona-toolkit/pt-query-digest.html
    type: tool
    difficulty: 3
    note: 生产级慢日志聚合分析工具，先知道有它。
---

> 一句话定义：EXPLAIN 是 SQL 的 X 光片——**type 看访问方式的档次、key 看实际选中的索引、rows 看预计扫描量、Extra 看回表/排序等隐藏动作**；优化的铁律是先拍片再动手，目标是把「扫描行数」压到最小，而不是「用上了索引」。

## 概念讲解

### 铁律：先诊断，再动手

「感觉慢」只是症状，病因可能是全表扫描、可能是回表太多、可能是排序溢出——三种病三种药，凭感觉加索引常常白加。正确流程永远是：**EXPLAIN 找病灶 → 改写 SQL 或调索引 → 再 EXPLAIN 对比验证**。上一课的 B+ 树原理在这里全部落地：type 差一档，页读取次数差一个量级。

### EXPLAIN 的输出：一行 = 一个表的访问计划

EXPLAIN 结果每行对应执行计划里访问一个表的方式；初学先盯五个高频字段，其余列等需要时再查官方文档：

| 字段 | 看什么 | 健康的样子 | 危险信号 |
| ---- | ---- | ---- | ---- |
| type | 访问方式档次 | const / eq_ref / ref / range | index（全索引扫）/ **ALL（全表扫）** |
| key | 实际选中的索引 | 是你预期的那棵 | NULL——优化器放弃了你的索引 |
| possible_keys | 候选索引 | — | 有候选但 key=NULL：条件写法让索引用不上 |
| rows | 预计扫描行数 | 与结果集同量级 | 几十万，而结果只有几十条 |
| Extra | 隐藏动作 | Using index（覆盖索引） | Using filesort / Using temporary |

### EXPLAIN 的两个升级版

MySQL 8.0 起有两个更好用的形态：`EXPLAIN FORMAT=TREE` 输出缩进的树形计划，谁套谁一目了然；`EXPLAIN ANALYZE`（8.0.18+）**真正执行一遍**并给出 actual time 与 actual rows——估算与实测的差距，就是统计信息是否失真的量尺。本课的实验一律先用传统 EXPLAIN 定位，再用 ANALYZE 验证。

### type 等级从好到坏：一张体检等级表

| 档 | 名字 | 出现场景 | 页读取量级 |
| - | ---- | ---- | ---- |
| 1 | system / const | 主键或唯一索引等值，最多 1 行 | O(1) |
| 2 | eq_ref | JOIN 时用对方主键/唯一键 | 每行 O(1) |
| 3 | ref | 普通索引等值 | 命中段大小 |
| 4 | range | 索引范围（>、BETWEEN、IN） | 命中段大小 |
| 5 | index | 整棵索引的叶子链表扫一遍 | 全索引 |
| 6 | ALL | 全表扫描（聚簇索引全走） | 全表 |

判读口径不是「必须 ref 以上」，而是**「type 档次 × rows」一起算**：range 命中 10 行远好于 ref 命中 50 万行——优化器内部算的也是这笔账（代价 ≈ 页读取次数）。

### Extra 常见值速查

| Extra 值 | 含义 | 好坏 |
| ---- | ---- | ---- |
| Using index | 覆盖索引，叶子层直接给答案，不回表 | 好 |
| Using index condition | 索引条件下推（ICP）：先在索引层过滤再回表 | 中性偏好 |
| Using where | 取回行后服务层再过滤一遍 | 中性 |
| Using filesort | 结果集整体进 sort buffer/临时文件排序 | 坏，用联合索引消除 |
| Using temporary | 建临时表（常见于 GROUP BY/DISTINCT） | 坏，同样可用索引消除 |

记忆锚点：**Extra 在描述「定位到行之后还干了什么活」**——出现「排序」「临时表」字样就是优化候选，出现 Using index 就是拿到了覆盖红利。

### 两条典型诊断路径

**路径一：type=ALL（全表扫描）**，按顺序过检查单：

1. WHERE 列上有索引吗？没有 → 按查询模式建（等值列在前、排序列在后的联合索引优先）；
2. 有索引却没选？→ 审条件写法三连：函数包列（`DATE(created_at)`）、隐式类型转换（VARCHAR 列传数字）、跳过联合索引最左列——三种写法都让「你比较的值」对不上「树上排好的值」；
3. 优化器主动放弃？→ 低区分度列（status 只 3 个值）命中半张表，回表成本高过全表顺序扫，优化器算完账决定不用——**possible_keys 有值但 key=NULL 是这个病的指纹**。

**路径二：type=ref/range 但 rows 巨大**——索引用了但过滤不狠：命中段太大，回表次数随 rows 线性涨。处方：组合更多条件收紧范围、重设联合索引把过滤列都装进去、高频接口配覆盖索引砍掉回表。

### Using filesort：二号隐藏杀手

`ORDER BY` 的列与「索引给出的顺序」对不上时，MySQL 只能把命中结果整体搬进 sort buffer（装不下就落盘临时文件）排完再 LIMIT——Extra 里的 `Using filesort`。两个反直觉点：**排序量级由命中行数决定，LIMIT 10 不减少排序工作量**；filesort 不一定真用文件，但内存排序同样吃 CPU。消除思路只有一条：**让「过滤列 + 排序列」共用一棵联合索引**——等值列在前、排序列在后，B+ 树段内天然有序，LIMIT 直接沿叶子链表取（DESC 就是倒着走链表）。`Using temporary`（GROUP BY 建临时表）同理可借索引消除。

### 优化前想清楚的两件事

1. **数据量级**：1 万行全表扫毫秒级，别为它建索引；先问「这张表会长到多大、这条 SQL 每天跑多少次」，再决定加索引、改写还是上缓存。
2. **数据分布**：EXPLAIN 的 rows 是基于统计信息的**估算**，测试库的分布不代表生产——万行开发库怎么写都快，千万行生产就翻车。关键 SQL 上线前用接近生产的量级验证；大批量导入/删除后记得 `ANALYZE TABLE` 刷新统计信息。

### 线上的另一半：慢查询日志

光靠人肉盯不够，让数据库自己招供：`SET GLOBAL slow_query_log = ON; SET GLOBAL long_query_time = 1;` 超过 1 秒的 SQL 全部入账；`mysqldumpslow -s t slow.log` 或 **pt-query-digest** 聚合成 Top N——先抓「总耗时贡献最大」的几条，再逐条 EXPLAIN。PG 的对应物是 `pg_stat_statements` 扩展。

## 代码示例

主线任务：两组「问题 SQL → EXPLAIN → 修复 → 实测」完整流程 + 一条「possible_keys 有值但 key=NULL」的对照。约 35 分钟。

### 第 0 步：建表造数

```sql
CREATE TABLE articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  status VARCHAR(16) NOT NULL,               -- draft / published
  created_at DATETIME NOT NULL,
  views INT NOT NULL DEFAULT 0
);

DELIMITER //
CREATE PROCEDURE seed_articles(IN n INT)
BEGIN
  DECLARE i INT DEFAULT 1;
  WHILE i <= n DO
    INSERT INTO articles (title, status, created_at, views)
    VALUES (CONCAT('文章', i),
            IF(i % 3 = 0, 'published', 'draft'),          -- 约 1/3 published
            '2026-01-01 00:00:00' + INTERVAL (i % 365) DAY
                                  + INTERVAL (i % 86400) SECOND,
            FLOOR(RAND() * 10000));
    SET i = i + 1;
  END WHILE;
END //
DELIMITER ;
CALL seed_articles(100000);
CREATE INDEX idx_created ON articles (created_at);        -- 只建这一个索引
```

预期：`SELECT COUNT(*) FROM articles;` → `100000`。

### 第 1 组：函数包列 → 范围改写

问题 SQL：查 2026-11-01 当天的文章。

```sql
EXPLAIN SELECT id, title, created_at FROM articles
WHERE DATE(created_at) = '2026-11-01';
-- 预期（关键列）：type: ALL | possible_keys: NULL | key: NULL
--                rows: 99518 | Extra: Using where
```

诊断：idx_created 就在旁边，key 却是 NULL——树上排的是原始 DATETIME，`DATE()` 加工后的值无法在有序结构里定位，优化器只剩全表扫。**rows≈10 万，结果只有约 270 行，扫描/产出比 370:1。**

修复：把「一天」改写成左闭右开区间，让比较值回到树的有序世界：

```sql
EXPLAIN SELECT id, title, created_at FROM articles
WHERE created_at >= '2026-11-01' AND created_at < '2026-11-02';
-- 预期（关键列）：type: range | possible_keys: idx_created
--                key: idx_created | rows: 278 | Extra: Using where
```

实测对比（8.0.18+ 支持 EXPLAIN ANALYZE）：

```sql
EXPLAIN ANALYZE SELECT id, title, created_at FROM articles
WHERE DATE(created_at) = '2026-11-01';
-- 预期：Table scan on articles  (actual time=18.5..41.2 rows=273 loops=1)

EXPLAIN ANALYZE SELECT id, title, created_at FROM articles
WHERE created_at >= '2026-11-01' AND created_at < '2026-11-02';
-- 预期：Index range scan on idx_created  (actual time=0.12..0.45 rows=273 loops=1)
```

判读：语义完全相同，实测差近百倍。修复的本质不是「加了什么」，而是**让参与比较的值与树上排序的值重新对齐**。

### 第 2 组：消除 filesort

问题 SQL：已发布文章按时间倒序取前 10（注意此时 status 上没有任何索引）。

```sql
EXPLAIN SELECT id, title, status, created_at FROM articles
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;
-- 预期（关键列）：type: ALL | key: NULL | rows: 99518
--                Extra: Using where; Using filesort
```

诊断：双病灶——status 无索引（type=ALL 扫 10 万行）；就算建了 status 单列索引，命中 3.3 万行后 ORDER BY created_at 仍与索引序无关，照样整体排序。**LIMIT 10 只减少返回行数，不减少排序工作量。**

修复：过滤列与排序列共用联合索引（等值在前、排序在后）：

```sql
CREATE INDEX idx_status_created ON articles (status, created_at);

EXPLAIN SELECT id, title, status, created_at FROM articles
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 10;
-- 预期（关键列）：type: ref | key: idx_status_created
--                Extra: NULL   ← Using filesort 消失

EXPLAIN ANALYZE SELECT id, title, status, created_at FROM articles
WHERE status = 'published' ORDER BY created_at DESC LIMIT 10;
-- 预期：Limit: 10 row(s)  (actual time=0.05..0.12 rows=10 loops=1)
--       └─ Index lookup on articles using idx_status_created
--          (actual time=0.04..0.10 rows=10 loops=1)   ← 只读了 10 行就停
```

判读：filesort 消失的物理原因——published 段在叶子链表里本就按 created_at 排好序，DESC 就是**倒着走链表**，读满 10 行立即停。修复前扫 10 万行 + 排 3.3 万行，修复后读 10 行。注意 EXPLAIN 的 rows 是估算（可能显示 3 万多），**ANALYZE 的 actual rows 才是实况**——这正好引出下一课的「估算 vs 实测」。

### 第 3 组：possible_keys 有值但 key=NULL

```sql
EXPLAIN SELECT id, title FROM articles WHERE status = 'published';
-- 预期（关键列）：type: ALL | possible_keys: idx_status_created
--                key: NULL | rows: 99518 | Extra: Using where
```

诊断：候选里明明有 idx_status_created，优化器却弃用——status='published' 命中约 3.3 万行（33%），走索引 = 3.3 万次回表随机读，还不如全表顺序扫。**这不是 bug，是优化器算过代价后的理性选择**；它暴露的是索引设计问题：低区分度列不值得单独建索引，要优化这条查询就该把 title 一起装进联合索引（status, title）做成覆盖。

判读：把三组实验连起来看——字段怎么读是「问诊」，怎么修是「处方」，而**每次修复都必须再拍一次片验证**：type 档次、rows 量级、Extra 动作，三者一起看才算诊断完成。

## 常见坑

1. **坑 1：在测试环境优化，到生产翻车**。现象：开发库飞快，上线就超时。原因：rows 是估算，数据量级与分布不同，计划就不同。对策：关键 SQL 用接近生产量级的数据验证，上线后盯慢查询日志兜底。
2. **坑 2：看到用了索引就放心**。现象：type=ref 还是慢。原因：rows 巨大或低区分度命中半表，扫描量没降反升（回表放大）。排查：rows 与实际结果集的比例；对策：收紧条件或重设联合索引。
3. **坑 3：SELECT * 阻断覆盖索引**。现象：明明建了索引，Extra 里始终没有 Using index。原因：多要一列就回表。对策：按需列化 SELECT，高频接口的列全部落进索引。
4. **坑 4：函数包列与隐式转换的隐形失效**。现象：possible_keys 有值但 key=NULL。原因：DATE()、CONCAT()、VARCHAR 列传数字，比较值脱离了树的有序世界。对策：改写成范围条件、保持类型一致。
5. **坑 5：把 EXPLAIN 估算当实测**。现象：rows 显示很小但查询很慢。原因：统计信息过期（大批量增删后未 ANALYZE）导致严重失真。对策：`ANALYZE TABLE` 刷新；8.0.18+ 直接 EXPLAIN ANALYZE 看实况。
6. **坑 6：只治 SQL 不看量级与频率**。现象：为低频报表 SQL 建一堆索引，写接口变慢。原因：每个索引都是一棵要维护的树。对策：先问「多大表、多高频」，1 万行的表全表扫就是毫秒级，别过度设计。

## 小练习

1. 完整跑两组实验，把「修复前/后」的 type/possible_keys/key/rows/Extra 抄成对照表，并用 EXPLAIN ANALYZE 记录实测耗时比。
2. GROUP BY 实验：比较 `SELECT status, COUNT(*) FROM articles GROUP BY status`（观察 Using index for group-by）与加上 `MAX(title)` 后的版本（Using temporary），解释索引在其中的作用。
3. 隐式转换实验：给 articles 加一列 code VARCHAR(20) 存几条编号，比较 `WHERE code = 2026` 与 `WHERE code = '2026'` 的 EXPLAIN 差异并解释原因。
4. **综合优化任务**：logs(id, user_id, level, created_at, message) 500 万行，慢查询 `SELECT * FROM logs WHERE user_id=? AND level='error' ORDER BY created_at DESC LIMIT 50`。写出完整诊断步骤（先看哪几列）、索引设计与列序理由、SELECT 裁剪方案，并在实验库验证修复前后 rows/Extra 的变化。
