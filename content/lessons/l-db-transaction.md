---
id: l-db-transaction
slug: db-transaction
title: 事务与 ACID：要么全成要么全不做
difficulty: 2
estMinutes: 85
tags: [数据库, 事务, 并发, 隔离级别]
summary: 从转账的「中间态为什么致命」出发，逐项拆解 ACID 四项承诺；用两个终端窗口亲手复现锁等待与并发异常，对照四种隔离级别，最后落到应用层的 Python 事务写法与事务边界设计。
updated: 2026-11-22
resources:
  - id: r-txn-my-iso
    title: MySQL · InnoDB 事务隔离级别
    url: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
    type: doc
    difficulty: 3
    note: 四种隔离级别与各类异常的官方对照，进阶必读。
  - id: r-txn-pg-iso
    title: PostgreSQL · 事务隔离
    url: https://www.postgresql.org/docs/current/transaction-iso.html
    type: doc
    difficulty: 3
    note: PG 侧的隔离级别说明——注意 PG 默认级别与 MySQL 不同。
  - id: r-txn-pg-tutorial
    title: PostgreSQL · 教程：事务
    url: https://www.postgresql.org/docs/current/tutorial-transactions.html
    type: doc
    difficulty: 1
    note: BEGIN/COMMIT/ROLLBACK 的最短官方入门，适合先读。
---

> 一句话定义：事务把多条语句包成一个「要么全成功、要么全部撤销」的单元；ACID 是它对崩溃与并发的四项承诺，隔离级别则是「正确性换并发性能」的价格表。

## 概念讲解

### 转账问题：中间态为什么致命

转账 = A 扣 100 + B 入 100，两条 UPDATE。两类敌人都会打断它：**崩溃**——扣款成功、入账之前进程被杀，100 元凭空蒸发；**并发**——另一笔请求恰好在「扣了没入」的瞬间读余额，拿到 900 这个中间态，据此做出「A 还能再花 900」的错误决策。事务就是同时对付这两个敌人的机制：对崩溃承诺原子性与持久性，对并发承诺隔离性。

### BEGIN / COMMIT / ROLLBACK：待定区的三个闸口

```text
BEGIN;        ── 打开「待定区」：之后每条语句的改动先落在这里
   UPDATE ... │ 事务内部：自己能看到（读自己的写）
   UPDATE ... │ 其他会话：什么都看不到（隔离）
COMMIT;       ── 待定区整体生效：对所有人可见、断电不丢
ROLLBACK;     ── 待定区整体作废：数据库回到 BEGIN 之前的样子
```

必须澄清一个默认行为：MySQL 与 PostgreSQL 默认都是**自动提交（autocommit）**——每条语句执行完立即提交。所以不写 BEGIN 的两条 UPDATE 是**两个独立事务**，中途崩溃照样断账。显式 `BEGIN` 之后，自动提交被挂起，直到 COMMIT 或 ROLLBACK。

### ACID 四项承诺：每项配一个「没有它会怎样」

| 项 | 承诺 | 没有它的场景 |
| ---- | ---- | ---- |
| Atomicity 原子性 | 全做或全不做，无中间态暴露 | 扣款成功后崩溃 → 账目凭空少 100（转账场景） |
| Consistency 一致性 | 事务前后业务规则成立（总额守恒、约束不被绕过） | 扣款加错入账对象，总额变了没人发现 |
| Isolation 隔离性 | 并发事务互相看不到对方的中间态 | 并发请求读到「扣了没入」的余额 |
| Durability 持久性 | COMMIT 返回后断电也不丢 | 下单成功提示给了用户，重启后订单消失 |

一致性是目的，其余三项是手段：原子性防「做一半」，隔离性防「互相看见」，持久性防「交了白卷」——三者共同兜住，账才是平的。

### 并发三异常：三张时间线看懂

```text
脏读（读到别人未提交、后来又撤销的数据）
事务 A                              事务 B
BEGIN;
UPDATE accounts SET balance = 0
  WHERE id = 1;        （未提交）
                                    BEGIN;
                                    SELECT balance WHERE id = 1;
                                    → 读到 0 —— 若 A 回滚，这个 0 从未存在过
ROLLBACK;
```

```text
不可重复读（同一事务内，同一行两次读值不同）
事务 A                              事务 B（另一个会话）
BEGIN;
SELECT balance WHERE id=1 → 1000
                                    UPDATE ... SET balance = 800; COMMIT;
SELECT balance WHERE id=1 → 800
→ 同一个事务里，1000 变 800：对账逻辑被打断
```

幻读结构相同，把「同一行的值变了」换成「同条件查询的行数变了」（别人 INSERT 了新行）：第一次查「今天订单」10 条，第二次 11 条——凭空多出的那一「幻」。三者递进：脏读最脏，不可重复读影响读一致性，幻读影响统计与存在性判断。

### 隔离级别：异常与价格的对照表

| 级别 | 脏读 | 不可重复读 | 幻读 | 谁默认 |
| ---- | ---- | ---- | ---- | ---- |
| READ UNCOMMITTED | 可能 | 可能 | 可能 | 无（太危险） |
| READ COMMITTED | 不会 | 可能 | 可能 | **PostgreSQL 默认** |
| REPEATABLE READ | 不会 | 不会 | 理论可能（InnoDB 很大程度防住） | **MySQL 默认** |
| SERIALIZABLE | 不会 | 不会 | 不会 | 无（并发代价大） |

级别越高越安全、并发性能越差——这是一张价格表而不是排行榜。第一件要记住的跨库差异：**MySQL 默认 REPEATABLE READ，PG 默认 READ COMMITTED**，同一份代码在两库的并发行为不同。另注：PG 的 READ UNCOMMITTED 实际按 READ COMMITTED 处理（它的快照机制做不了脏读）；PG 的 REPEATABLE READ 即「快照隔离」，幻读防住，代价是并发更新可能报序列化冲突需重试。

### 锁的直觉：共享与排他一句话

改数据要拿**排他锁**：我改这行，别人改就得等；普通 SELECT 走快照（MVCC 多版本），不阻塞读。实验 3 你会亲眼看到「B 的 UPDATE 卡住等 A 提交」。极端情况是死锁：A 攥着行 1 等行 2，B 攥着行 2 等行 1——数据库检测到后回滚其中一个，另一个继续；应用层要捕获这个错误并重试。所有锁都在 COMMIT/ROLLBACK 时释放，**事务多长，锁就攥多久**——这是下一节边界设计的全部依据。

### 事务边界设计：三条铁律

1. **短事务**：把计算、校验移到 BEGIN 之前；事务里只留必须原子的写操作。
2. **外部调用不进事务**：HTTP 调用 3 秒，锁就悬 3 秒，所有相关事务排队——先在外部完成慢操作，再开短事务写库。
3. **跨系统的事务管不住**：调用银行接口若失败，数据库事务回滚不了对方已扣的钱——靠幂等重试、补偿流程与对账兜底，这不是 ACID 的管辖范围。

## 代码示例

主线：建一张 accounts 表，先单窗口走通 BEGIN/COMMIT/ROLLBACK，再开双窗口复现「锁等待 + 无脏读」的完整时间线，最后落到 Python 的事务写法。MySQL 8 / PostgreSQL 通用，差异处注明。

### 第 0 步：建表造数

```sql
CREATE TABLE accounts (
  id      INT PRIMARY KEY,
  name    VARCHAR(50) NOT NULL,
  balance INT NOT NULL CHECK (balance >= 0)  -- CHECK：MySQL 8.0.16+ 强制，PG 强制
);
INSERT INTO accounts VALUES (1, 'Alice', 1000), (2, 'Bob', 500);
```

### 实验 1：完整转账——中间态自己可见，别人不可见

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
SELECT * FROM accounts;    -- 事务内自己能看到：900 | 600（读自己的写）
COMMIT;
SELECT * FROM accounts;    -- 900 | 600 已永久；此刻才对其他会话可见
```

### 实验 2：ROLLBACK——整体撤销，回到 BEGIN 之前

```sql
BEGIN;
UPDATE accounts SET balance = balance - 1000 WHERE id = 1;
-- 若没有 CHECK 约束，这行会让余额变 0；有约束则本句直接报错并中止
SELECT balance FROM accounts WHERE id = 1;   -- 自己看到 0（或报错点）
ROLLBACK;
SELECT balance FROM accounts WHERE id = 1;   -- 1000：像什么都没发生过
-- 注意：CHECK 能拦「负余额」这类规则，拦不住「多扣到别人头上」这类
-- 业务逻辑错——回滚是通用的后悔药，靠应用层判断后主动调用。
```

### 实验 3：双窗口并发实验——锁、阻塞与无脏读

开两个终端，各连一个数据库会话（下称窗口 A / 窗口 B），按时间线操作：

| 步骤 | 窗口 A | 窗口 B | 现象解读 |
| ---- | ---- | ---- | ---- |
| 1 | `BEGIN;` | | A 进入待定区 |
| 2 | `UPDATE accounts SET balance = balance - 100 WHERE id = 1;` | | A 拿到 id=1 行的排他锁（未提交） |
| 3 | | `BEGIN; SELECT balance FROM accounts WHERE id = 1;` | B 读到 **1000** —— A 未提交的 900 对 B 不可见：**无脏读** |
| 4 | | `UPDATE accounts SET balance = balance - 100 WHERE id = 1;` | B **卡住**：等 A 的行锁，直到超时或 A 结束 |
| 5 | `COMMIT;` | | A 提交，余额定格 900，锁释放 |
| 6 | | （步骤 4 解除阻塞，执行成功） | B 的 UPDATE 基于**最新已提交值** 900 再扣 100 |
| 7 | | `SELECT ...; COMMIT;` | B 查到 800，与自己写入的一致 |

判读三连：普通读走快照不阻塞（步骤 3 秒回）；写与写互斥（步骤 4 阻塞）；写读的是最新已提交版本（步骤 6 没有「丢失更新」）。两个 100 元扣款最终生效两次、余额正确到 800——事务把并发兜住了。

### 实验 4：换隔离级别对比（可选）

```sql
-- MySQL：在两窗口各自执行后重跑实验 3
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- PG：事务内设置（PG 不支持 SESSION 级别切换的部分场景，最稳是事务内声明）
BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- 另注：PG 把 READ UNCOMMITTED 当 READ COMMITTED 处理；MySQL 则真的允许脏读。
-- 跨库团队请显式声明级别，不要依赖各自的默认值。
```

### 实验 5：应用层的事务写法（Python）

```python
import psycopg2                      # pip install psycopg2-binary
conn = psycopg2.connect("dbname=shop user=postgres")

try:
    with conn:                       # 进入事务：块内语句同生共死
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE accounts SET balance = balance - %s WHERE id = %s",
                (100, 1),
            )
            cur.execute(
                "UPDATE accounts SET balance = balance + %s WHERE id = %s",
                (100, 2),
            )
    # with 块正常结束 → 自动 COMMIT；块内抛异常 → 自动 ROLLBACK
except Exception:
    ...   # 记日志、告警；不要在这里「原样再来一遍」——重试必须配幂等设计
finally:
    conn.close()
```

MySQL 等价写法：`mysql.connector.connect(...)` 默认 `autocommit=False`，用 `conn.commit()` / `conn.rollback()` 显式收尾，逻辑相同。两个要点：**事务边界写在应用层**（with 块的两条边界就是 BEGIN 与 COMMIT）；**重试必须幂等**，因为「COMMIT 已执行但结果没传回来」时，盲目重跑第二条转账就是双倍扣款。

## 常见坑

1. **坑 1：不写 BEGIN，多条语句各算各的事务**。现象：转账两条 UPDATE 之间程序崩溃，钱扣了没入账。原因：autocommit 下每条语句立即提交。排查：`SHOW VARIABLES LIKE 'autocommit';`（MySQL）/ `SHOW transaction_isolation;` 看默认行为；对策：涉及多表一致性的写操作显式包 BEGIN/COMMIT。
2. **坑 2：外部调用或慢查询包进事务**。现象：一行 UPDATE 后调 3 秒的 HTTP 接口再 COMMIT，期间全库相关的写请求排队甚至超时雪崩。原因：锁持有时间等于事务时长。排查：`SELECT * FROM information_schema.innodb_trx;`（MySQL）/ `SELECT * FROM pg_stat_activity;`（PG）看长事务；对策：先外部后短事务。
3. **坑 3：以为 ROLLBACK 能撤销一切**。现象：事务里跑了 `ALTER TABLE` / `DROP TABLE`，ROLLBACK 后结构照样变了。原因：DDL 在 MySQL 与 PG 都会隐式提交，之前的改动一并落定。排查：审查事务内语句类型；对策：DDL 永远单独执行、走变更流程。
4. **坑 4：COMMIT 后网络断了，结果未知却盲目重试**。现象：COMMIT 超时，应用「保险起见」再执行一遍转账——双倍扣款。原因：COMMIT 可能已生效，只是结果没传回来。排查：先查数据现状再决定动作；对策：业务加幂等键（如 UNIQUE 约束的转账单号），重试靠幂等兜底。
5. **坑 5：连接池借出的连接没提交就归还**。现象：某接口偶发把全库写操作卡死，重启才恢复。原因：框架自动归还连接但没有 COMMIT，事务悬着，锁一直攥着。排查：长事务监控（坑 2 的两条查询）抓元凶 SQL；对策：框架层设置事务超时与「归还前强制回滚/提交」。
6. **坑 6：跨库部署忽略默认隔离级别**。现象：同一份代码从 MySQL 迁到 PG，并发行为对不上（或反之）。原因：MySQL 默认 REPEATABLE READ，PG 默认 READ COMMITTED，异常面不同。排查：两库各跑 `SELECT @@transaction_isolation;` / `SHOW transaction_isolation;`；对策：连接串或会话开头显式 SET，并把依赖写进文档。

## 小练习

1. 写「注册送积分」事务：往 users 插一行 + 往 points 插一行。列出不包事务时崩溃的两种坏结局（用户没积分 / 孤儿积分），并用 BEGIN/COMMIT 包好。
2. 双窗口复现实验 3 的七步时间线，记录 B 在步骤 3、4、6 各看到什么；然后把两窗口都设为 READ COMMITTED（MySQL 用 SET SESSION）重跑，对比步骤 3 的读数是否变化。
3. 边界设计题：下单流程 = 校验库存 → 扣库存 → 调支付接口 → 写订单。画出哪些步骤进事务、哪些在事务外，并说明「调支付」放进事务里的两种事故（锁悬与双扣）各怎么发生。
4. **综合设计**：给「余额 + 流水」设计完整转账——accounts 两条 UPDATE + 新建 transfers 流水表插一条记录（含转账单号）。要求：写出完整 SQL 事务；解释流水表的单号列加 UNIQUE 约束如何实现幂等（重试时同一单号第二次插入会怎样）；说明「先查后插」与「直接插入靠约束拒绝」哪种在并发下安全。
