---
id: l-mysql-txn
slug: mysql-txn
title: 事务隔离与 MVCC
difficulty: 3
estMinutes: 85
tags: [MySQL, 事务, MVCC]
summary: 用时间线看并发三异常，用定价表理解四隔离级别；完整推演 MVCC 版本链与 Read View 的可见性判断，再在双窗口亲手复现「不可重复读被防住」、对照 FOR UPDATE 与原子 UPDATE 两种「先读后改」正解。
updated: 2026-11-22
resources:
  - id: r-mysql-txn-doc
    title: MySQL 官方 · InnoDB 事务隔离级别
    url: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
    type: doc
    difficulty: 3
    note: 四个级别与各级异常的权威表格。
  - id: r-mysql-mvcc-doc
    title: MySQL 官方 · InnoDB 多版本控制（MVCC）
    url: https://dev.mysql.com/doc/refman/8.0/en/innodb-multi-versioning.html
    type: doc
    difficulty: 3
    note: 版本链与 undo log 的第一手出处。
  - id: r-javaguide-mvcc
    title: JavaGuide · MySQL 事务隔离级别与 MVCC
    url: https://javaguide.cn/database/mysql/mysql-transaction-isolation-level.html
    type: doc
    difficulty: 2
    note: 中文图解 Read View 可见性规则的好资料。
---

> 一句话定义：隔离级别回答「并发事务互相能看见多少」；InnoDB 靠 **MVCC** 给每行维护版本链、事务第一次读时拍 Read View 快照——普通 SELECT 读历史版本、不阻塞写，而快照读与当前读的分工是「先读后改」不出错的全部秘密。

## 概念讲解

### 并发三异常：时间线摆出来一目了然

两个事务并发读写同一行/同一集合，会出三种事故（由轻到重）：

```text
脏读：读到别人「未提交、可能回滚」的数据
时间→    事务 A                     事务 B
T1     开启事务
T2     读 balance = 100
T3                                 UPDATE balance = 50（未提交）
T4     读 balance = 50 ← 脏读      （随后 ROLLBACK——"50" 从没存在过）

不可重复读：别人 UPDATE 已提交，同一事务两次读值不同
T1  A: 读 balance = 100              T2  B: UPDATE balance=50 并提交
T3  A: 再读 balance = 50 ← 值变了

幻读：别人 INSERT 已提交，同一事务两次读行数不同
T1  A: COUNT(*) = 10 条              T2  B: INSERT 1 条并提交
T3  A: 再 COUNT = 11 条 ← 行数变了
```

严重度与防治成本不同，四个隔离级别就是「防到哪一步」的定价表：

| 级别 | 脏读 | 不可重复读 | 幻读 | 成本 | 谁在用 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| READ UNCOMMITTED | 会 | 会 | 会 | 无 | 几乎没人 |
| READ COMMITTED | 防 | 会 | 会 | 低 | **PostgreSQL/Oracle 默认** |
| REPEATABLE READ | 防 | 防 | 基本*防 | 中 | **MySQL InnoDB 默认** |
| SERIALIZABLE | 防 | 防 | 防 | 高（读也加锁） | 强一致批处理 |

*InnoDB 的 RR 用 MVCC 快照 + 间隙锁把幻读压到「基本不出现」，但快照读与当前读混用的边角仍有缝隙（见坑 3）。

### MVCC 版本链：每行数据都是一条时间线

InnoDB 每行带两个隐藏列：`DB_TRX_ID`（最后修改它的事务 ID）、`DB_ROLL_PTR`（回滚指针，指向上一版）。UPDATE 不覆盖旧值，而是把旧版追加进 **undo log**，串成版本链：

```text
最新版本（数据页里）      undo log（历史版本，越往右越旧）
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ balance = 50 │ ←─  │ balance = 80 │ ←─  │ balance=100 │
│ trx_id = 30  │     │ trx_id = 20  │     │ trx_id = 10 │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Read View：一张「谁还没提交」的花名册

事务**第一次读**时拍快照、生成 Read View，核心四样：`m_ids`（拍快照瞬间还活跃未提交的事务名单）、`min_trx_id`（名单里最小）、`max_trx_id`（系统将分配的下一个事务号，下界）、`creator_trx_id`（我自己）。沿版本链从最新往旧找，每个版本的 trx_id 过一遍可见性规则：

```text
trx_id = 我自己                → 可见（我自己的改动）
trx_id < min_trx_id            → 可见（快照之前就已提交）
trx_id >= max_trx_id           → 不可见（快照之后才开启的事务）
min ≤ trx_id < max：
    在 m_ids（拍快照时还没提交） → 不可见，顺版本链找上一版
    不在 m_ids（当时已提交）     → 可见
```

完整推演：事务 A（trx_id=25）拍快照时活跃名单 {20, 30}。读 balance 行：最新版 trx_id=30，在名单里 → 不可见；上一版 trx_id=20，也在名单里 → 不可见；再上一版 trx_id=10，10 < min(20) → 可见，读到 **100**。随后 B（trx_id=30）提交 50——A 第二次读仍走同一张 Read View，结果还是 100。**「不可重复读被防住」与「读不阻塞写」是同一个机制的两次出现**：B 写它的，A 读自己的快照，互不影响。

RC 与 RR 的全部差别就一句话：**RC 每次 SELECT 都重拍 Read View（别人一提交就能看见）；RR 只在第一次读时拍、整个事务复用（一直看「过去」）**。PG 的 MVCC 思路相同、实现相反：旧版本直接留在表里（每行带 xmin/xmax），靠 VACUUM 回收——所以 PG 也有自己的「膨胀」故事。

### 快照读 vs 当前读：一条 SQL 属于哪个世界

| 类型 | 语句 | 读什么 | 加锁吗 |
| ---- | ---- | ---- | ---- |
| 快照读 | 普通 `SELECT ... WHERE` | Read View 里可见的版本 | 不加 |
| 当前读 | `SELECT ... FOR UPDATE / FOR SHARE`、`UPDATE`、`DELETE` | 版本链**最新已提交**版本 | 加行锁（RR 下含间隙锁） |

推论：同一事务里两种读可能读到不同的值——快照读看见历史，当前读看见现在。「先读后改」的丢失更新、RR 下边角幻读，都源于把两个世界混用。

### 长事务的代价：undo 膨胀

版本链要保留到「再没有任何 Read View 需要它」才能清理。一个挂 30 分钟的事务，会把这期间所有已提交事务的 undo 钉住不能清——History list length 疯长，全库回溯版本链的成本上升、磁盘上涨。事务纪律四个字：**短平快**。

### 「先读后改」的正确姿势

1. **原子 UPDATE（首选）**：把判断塞进 WHERE——`UPDATE ... SET balance=balance-100 WHERE id=? AND balance>=100`，一条语句 = 当前读 + 行锁 + 条件判断，天然防丢失更新（受影响行数 = 0 即余额不足）；
2. **FOR UPDATE 当前读**：先锁行再读最新值，适合读完要在应用层做复杂决策的场景；
3. **乐观锁版本号**：`UPDATE ... SET v=v+1 WHERE id=? AND v=?`，冲突率低时免锁，冲突就重试。

## 代码示例

主线任务：双窗口复现「不可重复读被防住」→ 换 RC 看异常被放出来 → FOR UPDATE 对照 → 原子 UPDATE 改写。需要两个 mysql 客户端窗口（A/B），每步都给出预期输出。

### 第 0 步：建表与基线

```sql
CREATE TABLE accounts (
  id INT PRIMARY KEY,
  balance INT NOT NULL,
  version INT NOT NULL DEFAULT 0
);
INSERT INTO accounts VALUES (1, 100, 0);

SELECT @@transaction_isolation;      -- 确认默认级别
-- 预期：REPEATABLE-READ（PG 默认是 read committed，先记住这个差异）
```

### 第 1 步：RR 下复现「不可重复读被防住」

两个窗口按时间线交错执行，预期输出写在注释里：

```sql
-- T1  窗口 A
START TRANSACTION;
-- T2  窗口 A：第一次读（此刻拍下 Read View）
SELECT balance FROM accounts WHERE id = 1;       -- 预期：100

-- T3  窗口 B
START TRANSACTION;
-- T4  窗口 B：扣款并提交
UPDATE accounts SET balance = 50 WHERE id = 1;
COMMIT;
```

```sql
-- T5  窗口 A：第二次读
SELECT balance FROM accounts WHERE id = 1;       -- 预期：100 ← B 已提交，A 仍读自己的快照
-- T6  窗口 A：结束事务，快照作废
COMMIT;
-- T7  窗口 A：新事务、新快照
SELECT balance FROM accounts WHERE id = 1;       -- 预期：50
```

判读：T2 与 T5 结果一致——**同一事务内不可重复读被 RR 防住**。对照概念讲解的推演，T5 正是「沿版本链找到 trx_id=10 那一版」的落地。T7 说明防住 ≠ 永远看不见：COMMIT 才是打开新世界的开关。

### 第 2 步：换 READ COMMITTED，把异常放出来

```sql
-- 两个窗口都先执行（必须在新事务开始之前）
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

重复第 1 步的 T1-T5。预期输出：T2 读到 `100`，T5 读到 **`50`**——同一条 SELECT 两次结果不同，不可重复读发生。判读：RC 每次读都重拍 Read View，别人一提交就能看见。**同一套 MVCC，只改「快照何时拍」，异常表就完全不同**——隔离级别不是玄学，是快照策略。

### 第 3 步：FOR UPDATE 当前读对照

```sql
-- 窗口 A
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- 预期：50  ← 当前读：读版本链最新已提交值；同时 id=1 行被 A 加上行锁
```

```sql
-- 窗口 B（A 未提交时执行）
SELECT balance FROM accounts WHERE id = 1;              -- 快照读：不阻塞，立即返回
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- 预期：卡住，约 50 秒后报错（默认 innodb_lock_wait_timeout=50）：
-- ERROR 1205 (HY000): Lock wait timeout exceeded
```

窗口 A 执行 `COMMIT;` 后，B 的 FOR UPDATE 立即返回。判读：**快照读不阻塞任何人，当前读才互斥**。「先读后改」用 FOR UPDATE 的意义 = 强制读最新值 + 占住行直到提交，别人插不进来。

### 第 4 步：原子 UPDATE 改写「读-判断-扣款」

```sql
-- 反例（RR 下防不住并发）：快照读旧余额 → 写回时覆盖别人已提交的扣款 = 丢失更新
-- 正解一：条件原子 UPDATE，影响行数即业务结果
UPDATE accounts SET balance = balance - 100
WHERE id = 1 AND balance >= 100;
-- 预期：Query OK, 1 row affected  → 扣款成功
-- 预期：Query OK, 0 rows affected → 余额不足，无需回滚任何「读到的中间值」

-- 正解二：乐观锁版本号（冲突率低时免行锁等待）
UPDATE accounts
SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = 0;
```

判读：单条 UPDATE 是当前读 + 行锁 + 条件判断三合一，「读」与「写」之间不存在时间窗——并发扣款谁后到谁看到 0 rows affected。**把「先读后改」压成一条语句，是最便宜的事务安全。**

### 第 5 步：亲手观察 undo 膨胀（选做）

```sql
-- 窗口 A：开一个「只读长事务」——不提交、不回滚，就停在这里
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;    -- 拍下 Read View，然后什么都不做

-- 窗口 B：把下面两条当一组，反复执行 20~30 次
UPDATE accounts SET balance = balance - 1 WHERE id = 1;
COMMIT;

-- 第三个窗口：观察未清理的历史版本数
SHOW ENGINE INNODB STATUS\G
-- 预期：TRANSACTIONS 段末尾 History list length 涨到 ≈ 你执行的 UPDATE 次数，
--       且只要窗口 A 不提交就只涨不降；A 一 COMMIT，很快回落到基线
```

判读：History list length 长期上千 = 有长事务在钉住 undo，全库回溯成本与磁盘同步上涨。生产排查：`SELECT trx_id, trx_started FROM information_schema.INNODB_TRX ORDER BY trx_started;` 找最老的事务。

## 常见坑

1. **坑 1：把长事务开在那里不动**。现象：磁盘涨、全库变慢、连接堆积。原因：Read View 钉住 undo，版本链不能清理（第 5 步亲手见过）。排查：INNODB_TRX 找超过 60 秒的事务；对策：事务内不做慢查询/远程调用，尽快提交。
2. **坑 2：「先 SELECT 再 UPDATE」防不住并发**。现象：并发扣款出现负余额、下单超卖。原因：两次都是快照读，看不见别人已提交的修改，写回覆盖（丢失更新）。对策：原子 UPDATE 或 FOR UPDATE。
3. **坑 3：以为 RR 万无一失**。现象：同事务先快照读后当前读，行数/值对不上。原因：两种读属于两个世界（快照 vs 最新+锁），混用就有缝隙。对策：事务内统一读方式；强一致场景 SERIALIZABLE 或应用层约束。
4. **坑 4：FOR UPDATE 之后忘了 COMMIT**。现象：下游接口连环 Lock wait timeout。原因：行锁到事务结束才释放，连接断开也未必立刻回滚。排查：INNODB_TRX + SHOW PROCESSLIST 找持锁事务；对策：框架统一「用完即 commit/close」。
5. **坑 5：拿 MySQL 默认级别套 PG**。现象：同样的复现实验在 PG 上结果不同。原因：PG 默认 READ COMMITTED，异常表不同（第 2 步正是这个差异）。对策：跨库迁移先对齐隔离级别，再谈行为预期。

## 小练习

1. 完整跑第 1、2 步，把每个时间点的读值记成表格，表后用 Read View 规则写出「T5 为什么是那个值」。
2. 把「下单减库存」写成三版：反例（先 SELECT 再 UPDATE）、正解一（原子 UPDATE WHERE stock>0）、正解二（FOR UPDATE），双窗口并发验证：反例超卖、正解安全。
3. Read View 推演：事务 A（trx_id=25）快照时活跃名单 {20,30}，版本链为 40→30→10。RR 下 A 读到哪版？RC 下第二次读呢？逐步写出判断过程。
4. **综合设计任务**：秒杀扣库存（并发 1000，商品表 stock 字段）：对比「FOR UPDATE」「原子 UPDATE WHERE stock>0」「乐观锁+重试」的锁冲突量、吞吐与代码复杂度，选一个方案并给出 SQL 与理由。
