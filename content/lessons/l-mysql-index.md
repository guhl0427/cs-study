---
id: l-mysql-index
slug: mysql-index
title: InnoDB 与 B+ 树：索引的真实结构
difficulty: 3
estMinutes: 45
tags: [MySQL, InnoDB, 索引]
summary: 「SQL 入门」说索引是目录，这一课拆开目录看页：B+ 树怎么组织、聚簇和二级索引差在哪、回表为什么慢——面试高频考区。
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
---

> 一句话定义：InnoDB 的索引是**B+ 树**——数据按主键一棵树（聚簇索引）、二级索引再各一棵，树高通常 3 层意味着「3 次页访问定位任意一行」。

## 概念讲解

「SQL 入门」把索引类比为书的目录，真实结构是 B+ 树（类比字典：先按首字母定位章，再按拼音定位页，最后按笔画定位词）：

```text
                [ 100 | 300 ]                ← 根节点（常驻内存）
             /       |        \
    [10|50|90]  [100|200]  [300|500]         ← 内部节点（只存键+指针）
     / | \ ...        ...        ...
   叶子层：100→row | 200→row | 300→row …（双向链表相连）
```

三个关键性质，每个都对应一类面试题：

1. **叶子层是有序的双向链表**：`ORDER BY id` 天然有序；范围查询（`BETWEEN 200 AND 300`）定位到起点后沿链表扫，不用回树上找；
2. **B+ 树矮胖（千万行也就 3-4 层）**：每层是一次页读取（16KB），树高决定随机 I/O 次数——这就是「索引把全表扫描 O(n) 变成 O(log n)」的物理含义；
3. **聚簇索引 vs 二级索引**：主键那棵树的**叶子存整行数据**（表本身就是聚簇索引组织的一棵树）；二级索引（如 email 那棵）叶子只存「email + 主键值」——用 email 查完还要**拿主键回主键树再查一次整行，这叫回表**。

两个工程推论立刻成立：

- **主键用自增整数**：新行总是追加到树最右侧（顺序写）；用随机 UUID 当主键，插入位置随机、页频繁分裂、写放大严重；
- **覆盖索引避免回表**：查询的列全在二级索引里（`SELECT id FROM users WHERE email=?`），不用回主键树——`EXPLAIN` 的 Extra 显示 `Using index`。

## 代码示例

用 EXPLAIN 观察回表与覆盖索引的差异：

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(100) NOT NULL,
  name VARCHAR(50),
  UNIQUE KEY uk_email (email)          -- 二级索引：email + 主键 id
);

EXPLAIN SELECT * FROM users WHERE email = 'a@b.c';
-- type: const/eq_ref，但 SELECT * 需要回表取 name 列

EXPLAIN SELECT id FROM users WHERE email = 'a@b.c';
-- Extra: Using index —— 覆盖索引，叶子层直接给答案，不回表
```

联合索引的最左前缀在树上看得更清楚（呼应入门课）：

```sql
CREATE INDEX idx_status_time ON articles (status, created_at);
-- 树先按 status 排、status 相同再按 created_at 排
-- WHERE status='published' AND created_at > '2026-11-01'  → 两列都能利用有序性
-- WHERE created_at > '2026-11-01'                        → 只有第二列条件，树的排序帮不上
```

## 常见坑

1. **坑 1：随机 UUID/手机号当主键**。插入点随机 → 页分裂、碎片化、写性能随数据量衰减。自增或分布式有序 ID（如雪花算法）才是 B+ 树的朋友。
2. **坑 2：在低区分度列上单独建索引**。`status` 只有 3 个值，走索引扫半个表还不如全表扫描——优化器会放弃它；它是联合索引的前导列材料，不是单列索引材料。
3. **坑 3：索引列上套函数/隐式转换**。`WHERE DATE(created_at)=...`、`WHERE phone = 13800000000`（列是 VARCHAR、传了数字）——树的有序性对「加工过的值」失效，全表扫描。
4. **坑 4：索引越多越好**。每个索引都是一棵要同步维护的 B+ 树，写一次=改 N 棵树——按「高频查询条件」建，定期清理 EXPLAIN 从不选中的索引。

## 小练习

1. 在 B+ 树可视化里连续插入 20 个递增键和 20 个随机键，观察页分裂次数的差异。
2. 构造一条回表查询和一条覆盖索引查询，用 EXPLAIN 的 Extra 列对比。
3. 思考题：为什么「查 email 唯一值」MySQL 会说 type=const？结合「树矮+唯一」想想几层查找。
