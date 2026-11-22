---
id: l-sql-explain
slug: sql-explain
title: EXPLAIN 与慢查询优化：从「感觉慢」到「知道哪慢」
difficulty: 2
estMinutes: 40
tags: [MySQL, 性能优化]
summary: EXPLAIN 是给 SQL 拍的 X 光——type 看访问方式、key 看索引、rows 看扫描量、Extra 看隐藏动作，优化前先诊断。
updated: 2026-11-22
resources:
  - id: r-mysql-explain
    title: MySQL 官方 · EXPLAIN Output Format
    url: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
    type: doc
    difficulty: 3
    note: 每个字段与每个 type 等级的权威定义。
  - id: r-pt-query-digest
    title: Percona Toolkit · pt-query-digest
    url: https://docs.percona.com/percona-toolkit/pt-query-digest.html
    type: tool
    difficulty: 3
    note: 生产级慢日志分析工具，先知道有这么个东西。
---

> 一句话定义：EXPLAIN 把优化器的执行计划摆上台面——**type 决定扫描量级、key 决定走不走索引、rows 是预计扫描行数、Extra 暴露隐藏动作**，优化就是让前三列变好看。

## 概念讲解

优化 SQL 的铁律：**先诊断，再动手**。凭感觉加索引往往白加——EXPLAIN 五个高频字段：

| 字段 | 看什么 | 好的样子 |
| ---- | ---- | ---- |
| type | 访问方式（从好到坏） | const/eq_ref > ref > range > index > **ALL（全表扫描，重点排查）** |
| key | 实际选中的索引 | 有值（NULL = 没走索引） |
| rows | 预计扫描行数 | 越小越好（和表总量比） |
| Extra | 隐藏动作 | `Using index` 好；`Using filesort`/`Using temporary` 要警惕 |
| possible_keys | 候选索引 | 有值但 key 为 NULL → 优化器放弃了你的索引 |

两条典型诊断路径：

1. **type=ALL**：全表扫描。逐项检查——WHERE 条件列上有索引吗？条件是不是套了函数（`DATE(created_at)`）？是不是隐式类型转换（VARCHAR 列传了数字）？联合索引是不是没含最左列？
2. **type=ref 但 rows 很大**：索引选了但区分度差（如 status 只有 3 个值，命中半张表）——组合条件让过滤更狠，或改联合索引设计。

`Using filesort` 是隐藏的二号杀手：`ORDER BY` 的排序列与索引顺序不一致，MySQL 只能把结果集搬到内存/磁盘排序——让「查询条件+排序列」共用一条联合索引可消除它。

## 代码示例

一组「问题 SQL → EXPLAIN → 修复」的完整流程：

```sql
-- 问题：type=ALL，全表扫描
EXPLAIN SELECT * FROM articles
WHERE DATE(created_at) = '2026-11-01';
-- 原因：函数套列，索引失效

-- 修复：改写成范围条件（索引可用的等价形式）
EXPLAIN SELECT * FROM articles
WHERE created_at >= '2026-11-01' AND created_at < '2026-11-02';
-- type: range，key: idx_created_at，rows 明显变小
```

```sql
-- 问题：filesort
EXPLAIN SELECT title FROM articles
WHERE status = 'published' ORDER BY created_at DESC LIMIT 10;

-- 修复：查询+排序共用联合索引（呼应 B+ 树叶子层的有序性）
CREATE INDEX idx_status_time ON articles (status, created_at);
-- Extra 里的 Using filesort 消失，LIMIT 10 直接沿索引取前 10 条
```

线上排查的另一半在**慢查询日志**：`long_query_time` 之上的 SQL 全被记录，`mysqldumpslow` 或 pt-query-digest 聚合成 Top N——先抓出最慢的十条，再逐条 EXPLAIN。

## 常见坑

1. **坑 1：在测试环境优化，在线上翻车**。EXPLAIN 的 rows 是基于统计信息的估计——数据分布不同，计划就不同。用接近生产的数据量验证，关键 SQL 上线前在预发跑一遍。
2. **坑 2：看到走了索引就放心**。type=ref 但 rows=百万，可能比 index 全扫更糟——**优化目标是「扫描的行数」，不是「用没用索引」**。
3. **坑 3：SELECT * 阻断覆盖索引**。想要的列不在索引里，每个命中行都要回表——按需列化 SELECT（呼应入门课的坑 3），给高频查询配覆盖索引。
4. **坑 4：只优化 SQL 不看数据量级**。一万行全表扫描也就几十毫秒；先把「这查询要撑到多少行」想清楚，再决定是加索引、加缓存还是改表结构。

## 小练习

1. 在练习库跑本课两组 EXPLAIN，把「修复前/修复后」的 type/key/rows/Extra 抄成对照表。
2. 故意写一条触发 Using filesort 的查询，然后用联合索引消除它。
3. 思考题：对照「组成原理」的缓存思想——联合索引 (status, created_at) 里 ORDER BY created_at 为什么免费有序？树的哪个性质在起作用？
