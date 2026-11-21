---
id: l-db-transaction
slug: db-transaction
title: 事务与 ACID：一组操作的原子性
difficulty: 2
estMinutes: 30
tags: [数据库, 事务]
summary: 转账 = 扣款 + 入账，要么都发生要么都不发生——事务把这组操作包成一个不可分割的单元。
updated: 2026-11-22
resources:
  - id: r-txn-mysql
    title: MySQL · InnoDB 事务与隔离级别
    url: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
    type: doc
    difficulty: 3
    note: 四种隔离级别的官方说明，进阶必读。
---

> 一句话定义：事务把多条语句包成一个「要么全成功、要么全回滚」的单元，ACID 是这个单元的四项承诺。

## 概念讲解

转账是最经典的问题：A 扣款 100 元、B 入账 100 元——如果扣款成功后程序崩溃，钱凭空消失。事务解决它：

```sql
BEGIN;                      -- 开启事务
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;                     -- 两条都成功才生效
-- 任何一条失败 → ROLLBACK，数据库回到 BEGIN 之前的状态
```

**ACID 四项承诺**（理解优先于背诵）：

| 缩写 | 含义 | 一句话 |
| ---- | ---- | ---- |
| Atomicity 原子性 | 全做或全不做 | 没有中间状态暴露 |
| Consistency 一致性 | 总额守恒等业务规则 | 事务前后账是平的 |
| Isolation 隔离性 | 并发事务互不干扰 | 你看不到我写到一半的数据 |
| Durability 持久性 | COMMIT 后断电也不丢 | 写入磁盘并留有恢复手段 |

**并发问题**是隔离性的核心：两个事务同时读余额、同时扣款，可能互相覆盖（丢失更新）。数据库用**隔离级别**在「正确性」与「并发性能」之间定价——从「读到别的事务没提交的数据」（脏读）到「完全串行」，级别越高越安全越慢。入门阶段记住：默认级别（MySQL 是 REPEATABLE READ）适用于大多数场景，出问题先查是不是自己的事务边界划错了。

## 代码示例

在应用程序里管理事务边界——**事务要尽量短**：

```sql
BEGIN;
-- ✅ 好：只包含必须原子完成的两条写语句
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;
```

```text
❌ 坏：把网络调用包进事务
BEGIN;
UPDATE ...;
调第三方接口（要 3 秒）   ← 事务被拖着不提交，锁都攥在手里
COMMIT;
```

事务越长，持有的锁越多，其他事务等待越久——「先在外部完成慢操作，再开一个短事务写库」是通用原则。

## 常见坑

1. **坑 1：自动提交的误解**。MySQL 默认每条语句自动提交——两条 UPDATE 不包 BEGIN 就是两个独立事务，中途崩溃照样断账。
2. **坑 2：事务里包慢操作**。外部 HTTP 调用、大量计算放进事务，锁等待拖垮并发。
3. **坑 3：以为 COMMIT 了一定写完**。持久性由存储引擎保证（InnoDB 日志），但应用层还要处理「COMMIT 后网络断了，客户端不知道结果」——靠幂等重试解决，而不是再执行一遍。

## 小练习

1. 写一个「注册送积分」事务：插 users 一行 + 插 points 一行，并说明少了事务会出什么问题。
2. 用两个数据库客户端窗口并发给同一账户扣款，观察丢失更新（配合手动事务）。
3. 思考题：为什么「外部转账到银行」这类跨系统操作，数据库事务管不住？该怎么补偿？
