---
id: l-mysql-txn
slug: mysql-txn
title: 事务隔离与 MVCC：并发读写怎么不出错
difficulty: 3
estMinutes: 45
tags: [MySQL, 事务, MVCC]
summary: 「SQL 入门」说了事务要隔离，这一课拆开隔离：三个并发异常、四个隔离级别、以及 InnoDB 用「版本快照」换并发性能的 MVCC 机制。
updated: 2026-11-22
resources:
  - id: r-mysql-txn-doc
    title: MySQL 官方 · InnoDB 事务隔离级别
    url: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
    type: doc
    difficulty: 3
    note: 四个级别与各级异常的权威表格。
  - id: r-mvcc-explain
    title: 图解 MySQL 介绍 · MVCC
    url: https://javaguide.cn/database/mysql/mysql-transaction-isolation-level.html
    type: doc
    difficulty: 2
    note: 中文图解 MVCC 读视图的好资料。
---

> 一句话定义：隔离级别回答「并发事务互相能看见多少」——异常从脏读、不可重复读到幻读；InnoDB 用 **MVCC（多版本快照）**让读不阻塞写，默认 REPEATABLE READ。

## 概念讲解

两个事务并发读写同一行，会出三种「事故」（由轻到重）：

```text
脏读      读到了别人「还没提交、可能回滚」的数据          —— 最严重，必须防
不可重复读  同一事务内读两次，值变了（别人提交了 UPDATE）   —— 计算一致性受影响
幻读      同一事务内读两次，行数变了（别人提交了 INSERT）
```

四个隔离级别就是「防到哪一步」的定价表：

| 级别 | 脏读 | 不可重复读 | 幻读 | 代价 |
| ---- | ---- | ---- | ---- | ---- |
| READ UNCOMMITTED | ✗ 会 | ✗ 会 | ✗ 会 | 几乎不用 |
| READ COMMITTED | ✓ 防 | ✗ 会 | ✗ 会 | PG 默认 |
| REPEATABLE READ | ✓ 防 | ✓ 防 | ✓*（InnoDB 基本防） | **MySQL 默认** |
| SERIALIZABLE | ✓ | ✓ | ✓ | 串行化，最慢 |

**MVCC 是 InnoDB 能「默认级别还很稳」的机制**：每行数据背后挂着一个**版本链**（undo log 里的历史版本），每个事务开始时拍一张「读视图」：

```text
事务 T 开始 → 生成 Read View（记录「此刻哪些事务还活跃」）
T 读某行   → 沿版本链找「对我可见」的版本（已提交且在我视角之前）
           → 别人同时 UPDATE 这行？T 读到的仍是自己的快照 → 读不阻塞写
```

这就是「不可重复读」被防住的原理：T 第二次读同一行，用的还是开头那张快照——值当然没变。代价是**每个事务都在读历史**，长事务会让 undo log 膨胀（版本链不能清理）。

锁与 MVCC 的分工一句话：普通 SELECT 走快照（无锁）；`SELECT ... FOR UPDATE` 这类**当前读**才加锁——「先读后改」必须用后者，否则丢更新。

## 代码示例

亲手制造一次「不可重复读」并观察 REPEATABLE READ 的防护（两个 mysql 客户端窗口）：

```sql
-- 窗口 A
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;    -- 100

-- 窗口 B（此时提交一笔扣款）
UPDATE accounts SET balance = 50 WHERE id = 1; COMMIT;

-- 窗口 A 再读
SELECT balance FROM accounts WHERE id = 1;    -- 仍是 100！快照保护
COMMIT;                                       -- 结束事务，快照失效

SELECT balance FROM accounts WHERE id = 1;    -- 50（新事务读到新值）
```

「先读后改」的正确姿势——当前读加锁：

```sql
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;   -- 当前读：读最新+行锁
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

## 常见坑

1. **坑 1：把长事务开在那里不动**。快照要保留，undo log 越积越大，整库性能被拖垮——`SHOW ENGINE INNODB STATUS` 看 History list length；事务永远「短平快」（呼应入门课）。
2. **坑 2：「先 SELECT 再 UPDATE」防不住并发**。两次都是快照读，另一个事务的扣款你根本看不见——改数前用 `FOR UPDATE`（或 UPDATE 语句本身带条件原子完成）。
3. **坑 3：以为 REPEATABLE READ 万无一失**。幻读的边角场景（跨语句的当前读+快照读混用）仍需注意；金融级强一致需求要么 SERIALIZABLE，要么应用层加分布式锁。
4. **坑 4：把「隔离级别」当万能**。它只管单库行级并发；多行多表的业务一致性要靠事务边界设计+约束（呼应转账例子：总额守恒靠「两条 UPDATE 包一个事务」）。

## 小练习

1. 按示例复现「不可重复读被防住」的完整过程，把每一步的读值记录成表格。
2. 不用 FOR UPDATE，把「先读余额再扣款」改写成一条原子 UPDATE（`balance >= 100` 作为 WHERE 条件），说明它为什么天然防丢失更新。
3. 思考题：MVCC 让「读不阻塞写」，那写与写之间靠什么排他？这和操作系统课的「互斥锁」是什么关系？
