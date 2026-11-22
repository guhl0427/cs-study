---
id: l-db-schema-design
slug: db-schema-design
title: 表结构设计：从业务到表
difficulty: 2
estMinutes: 85
tags: [数据库, 设计, 范式, 约束]
summary: 五步设计流程从一句话需求走到能跑的库：找实体、定关系、选类型、加约束、验查询；一对一/一对多/多对多各配落表图，范式逐级用「违反→修复」实例讲透，最后完整设计电商「用户-商品-订单」迷你库。
updated: 2026-11-22
resources:
  - id: r-ddl-my-create
    title: MySQL · CREATE TABLE 语法
    url: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
    type: doc
    difficulty: 2
    note: 列类型、约束与外键选项的官方速查。
  - id: r-ddl-pg-types
    title: PostgreSQL · 数据类型
    url: https://www.postgresql.org/docs/current/datatype.html
    type: doc
    difficulty: 2
    note: 选型拿不准时来查；注意 PG 没有 TINYINT，用 SMALLINT。
  - id: r-ddl-pg-constraints
    title: PostgreSQL · 约束（DDL Constraints）
    url: https://www.postgresql.org/docs/current/ddl-constraints.html
    type: doc
    difficulty: 2
    note: PK/FK/UNIQUE/CHECK/NOT NULL 五种约束的官方讲解。
---

> 一句话定义：表结构设计 = 把业务拆成「一事一表」的实体，用键钉住表间关系，选对类型、把「不可能发生」写进约束，最后用真实查询回头验证——范式保证不犯错，反范式是有意识的取舍。

## 概念讲解

### 设计流程五步：从一句话需求到能跑的库

```text
① 找实体      需求里的名词 → 实体（用户、商品）；发生的动作/事件 → 关系（下单）
② 定关系      两个实体互相问「有几个？」→ 一对一 / 一对多 / 多对多
③ 选类型      每列给最贴切的类型（整数/DECIMAL/时间/VARCHAR）
④ 加约束      PK / FK / UNIQUE / CHECK / NOT NULL——把业务规则下沉到数据库
⑤ 验查询      拿 3~5 条核心业务查询试跑，走不通就回头改设计
        ↑______________________________________|  设计是回路，不是一条直线
```

新手最常见的错误是跳过第⑤步：表建完才发现在上面写不出核心查询——JOIN 路径断裂、聚合没有粒度。把「验证查询」当作设计的单元测试。

### 三种关系的落表方式

```text
一对一：users(id PK)  1 ─── 1  user_profiles(user_id PK, FK → users.id)
        动机：大字段分离 / 敏感字段隔离 / 可选字段不占主表
        落表：子表主键即外键（或唯一外键列），保证「最多一份」

一对多：users(id PK)  1 ─── N  orders(id PK, user_id FK → users.id)
        动机：一个用户多笔订单
        落表：外键放在「多」的一端——orders.user_id

多对多：orders(id PK)  N ─── M  products(id PK)
        落表：中间表 order_items(order_id FK, product_id FK, ...)
        关系自身的属性（数量、下单时价格）放在中间表上
```

判断口诀就是第②步那句互相问话：「一个用户有几笔订单？」多笔；「一笔订单属于几个用户？」一个——所以是一对多。两边都答「多个」就是多对多，必须引入中间表。中间表还常常自己升级成实体：当它带上自己的属性和生命周期（订单明细有数量、价格），它就是一张正经表。

### 范式逐级讲透：每级一个「违反 → 修复」

**1NF 原子性——一列只放一个值。** 违反：`phone` 存 `'138x, 139x'`，或 `tags` 存 `'css,js,vue'`。代价：按标签查询只能全表扫字符串匹配，也无法加 UNIQUE 约束。修复：多值拆成关联表（article_tags）或多行。

**2NF 消除部分依赖——非键列必须依赖完整的键。** 只在联合主键下出现：`order_items(order_id, product_id)` 里塞 `product_name`——它只依赖 product_id，与 order_id 无关。代价：商品改名要更新所有历史明细行，漏一行就自相矛盾。修复：product_name 归位到 products 表，需要时 JOIN 取。

**3NF 消除传递依赖——非键列不能依赖另一个非键列。** 违反：`orders` 里存 `user_city`——城市通过 user_id 依赖用户表（user_id → 城市）。代价：用户搬家要改 orders 表 N 行。修复：删掉该列，JOIN users 取。

三级共用一个判断句：**「这列是不是在重复描述别处已有的信息？」** 是，就违反了某级范式；把「谁拥有这条事实」想清楚，修复方案自然浮现。

### 反范式：有意识的冗余

范式不是教条，两种场景值得故意违反：**历史快照**——订单冗余商品名/下单时价格，语义是「下单那一刻的事实」，商品改名、改价都不该追溯历史订单；**读性能**——订单表的 total_amount 冗余一份汇总值，省掉每次都聚合明细。铁律：每一处冗余必须能回答「这份数据归谁更新、什么时候更新」——订单快照归下单动作更新，答不出来就别冗余。

### 字段类型选择原则

| 数据 | 推荐 | 为什么 |
| ---- | ---- | ---- |
| 整数 / 主键 | INT；量大用 BIGINT | 够用就好，主键量级提前估算 |
| 金额 | DECIMAL(10,2) | FLOAT/DOUBLE 是二进制浮点，0.1+0.2 ≠ 0.3，对账必出事 |
| 时间 | TIMESTAMP / DATE | VARCHAR 存时间 = 失去比较、函数、索引的有序性 |
| 短文本 | VARCHAR(n) | n 是业务上限：手机号 20、用户名 50，不是随手 255 |
| 状态/枚举 | VARCHAR 限长 + CHECK | 取值固定，靠约束防脏数据 |

注：两库类型大体同名，MySQL 有 TINYINT（状态列常用），PG 对应用 SMALLINT。

### 约束四件套与 NOT NULL

| 约束 | 管什么 | 例子 |
| ---- | ---- | ---- |
| PRIMARY KEY | 一行的身份证：唯一 + 非空 | 单列 id 或联合 (order_id, product_id) |
| FOREIGN KEY | 引用完整性：引用的行必须存在 | orders.user_id → users.id |
| UNIQUE | 业务唯一性 | 手机号、订单号、用户名 |
| CHECK | 取值范围 | quantity > 0、balance >= 0、price >= 0 |
| NOT NULL | 该知道的必须知道 | 核心业务列尽量 NOT NULL + DEFAULT |

外键的删除行为可配（默认拒绝删除被引用行；ON DELETE CASCADE 级联删、SET NULL 置空）——默认拒绝最安全，级联是一把要慎用的刀。约束的价值在于：应用层判重有并发窗口（两个请求同时查「不存在」再同时插入），数据库 UNIQUE 是最后防线；CHECK 则让任何语言的 bug 都写不进脏数据。

## 代码示例

主线：把一句话需求完整设计成电商「用户-商品-订单」迷你库，每张表带设计理由批注，再用三条核心查询验证，最后做一次范式体检与快照实验。

### 第 0 步：需求与五步推演

需求：「用户可以下单买多个商品，每件数量不同；订单要记录当时的价格与状态。」

```text
① 实体：用户、商品、订单；「买」这个关系带着自己的属性（数量、当时价格）
        → 升格为实体：订单明细
② 关系：用户 1:N 订单；订单 1:N 明细；明细 N:1 商品（用户与商品之间经明细间接多对多）
③④⑤ 见下文 DDL 与验证查询
```

### 第 1 步：DDL 全家（含设计理由批注）

```sql
CREATE TABLE users (
  id         INT PRIMARY KEY,
  username   VARCHAR(50) NOT NULL UNIQUE,             -- 登录名天然唯一
  phone      VARCHAR(20) NOT NULL UNIQUE,             -- 业务唯一：一人一号
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id    INT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),    -- 金额必须 DECIMAL
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

CREATE TABLE orders (
  id           INT PRIMARY KEY,
  user_id      INT NOT NULL,                          -- 1:N 的外键放「多」端
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',-- pending/paid/shipped/done
  total_amount DECIMAL(10,2) NOT NULL,                -- 下单时算出的总额（读性能冗余）
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL CHECK (quantity > 0),       -- 数量至少 1
  unit_price DECIMAL(10,2) NOT NULL,                  -- 反范式：下单时价格快照
  PRIMARY KEY (order_id, product_id),                 -- 联合主键：同一订单同一商品
  FOREIGN KEY (order_id)   REFERENCES orders(id),     --   天然只能出现一行
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

三处设计决策值得盯住：明细单独成表，因为关系带属性（quantity/unit_price）；unit_price 是合法反范式——历史快照语义，商品改价不追溯订单；total_amount 是读性能冗余，由下单事务一次算好写入。

### 第 2 步：造数 + 三条验证查询

```sql
INSERT INTO users    VALUES (1,'alice','13800000001','2026-11-01 09:00:00'),
                            (2,'bob',  '13800000002','2026-11-01 09:05:00');
INSERT INTO products VALUES (1,'键盘',   299.00, 100),
                            (2,'鼠标',   129.50, 200),
                            (3,'显示器', 1299.00, 30);
INSERT INTO orders   VALUES (1001, 1, 'paid',    428.50, '2026-11-02 10:00:00'),
                            (1002, 2, 'pending', 299.00, '2026-11-02 20:30:00');
INSERT INTO order_items VALUES
  (1001, 1, 1, 299.00),   -- 键盘 x1
  (1001, 2, 1, 129.50),   -- 鼠标 x1 → 订单 1001 合计 428.50
  (1002, 1, 1, 299.00);   -- 订单 1002 只有键盘

-- 验证 V1｜四表 JOIN 走通 = 关系设计成立
SELECT u.username, o.id AS order_id, p.title, oi.quantity, oi.unit_price
FROM users u
JOIN orders o       ON o.user_id  = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id        = oi.product_id
WHERE u.id = 1;
-- 结果：2 行 → alice | 1001 | 键盘 | 1 | 299.00  与  alice | 1001 | 鼠标 | 1 | 129.50

-- 验证 V2｜对账：订单总额列 = 明细实时合计（冗余没说谎）
SELECT o.id, o.total_amount, SUM(oi.quantity * oi.unit_price) AS calc
FROM orders o JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.total_amount;
-- 结果：2 行 → 1001 | 428.50 | 428.50   与   1002 | 299.00 | 299.00

-- 验证 V3｜聚合查询有粒度：卖得最好的商品
SELECT p.title, SUM(oi.quantity) AS sold
FROM order_items oi JOIN products p ON p.id = oi.product_id
GROUP BY p.id, p.title
ORDER BY sold DESC;
-- 结果：3 行 → 键盘 2 | 鼠标 1 | 显示器（没卖出，不出现在明细里）
```

### 第 3 步：范式体检（拿刚建的库走三级）

```text
1NF：所有列单值 —— 通过（手机号只放一个；多标签场景要拆关联表，本例无此列）
2NF：order_items 的非键列 quantity/unit_price 依赖完整联合主键 —— 通过；
     若把 product_name 放进来就违反（只依赖 product_id）——它已归位 products
3NF：orders 没有 user_city/user_phone 这类经 user_id 可推导的列 —— 通过；
     total_amount 不是传递依赖（无法从其他列推导出「下单时总额」），
     它是业务快照——归入第 4 节的有意识反范式，不是范式疏漏
```

### 第 4 步：快照实验——反范式语义的现场证明

```sql
UPDATE products SET price = 399.00 WHERE id = 1;      -- 商品涨价 299 → 399
SELECT oi.unit_price, p.price
FROM order_items oi JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = 1001 AND oi.product_id = 1;
-- 结果：1 行 → unit_price 299.00 | price 399.00
-- 解读：历史订单仍显示下单时的 299（快照），商品表已是 399——
-- 两个数字「都正确」，因为它们回答的是不同时间的问题。这就是冗余要写清的语义。
```

## 常见坑

1. **坑 1：把列表塞进一个字段**。现象：`tags VARCHAR(200)` 存 `'css,js,vue'`，之后要按标签统计傻眼。原因：违反 1NF，无法索引查询、无法约束唯一。排查：列值里出现分隔符即中招；对策：拆关联表（article_tags）。
2. **坑 2：金额用 FLOAT/DOUBLE**。现象：订单合计出现 428.49999999999994，对账永远差一分钱。原因：二进制浮点无法精确表示十进制小数。排查：`SELECT 0.1 + 0.2;` 看结果；对策：金额一律 DECIMAL(10,2)。
3. **坑 3：VARCHAR(255) 万能列**。现象：手机号、状态、备注全是 VARCHAR(255)，有人把时间也存成了字符串。原因：没按数据本质选型，失去 CHECK/比较/函数能力。排查：查 information_schema.columns 看类型分布；对策：按第 5 节原则逐列定类型。
4. **坑 4：漏 UNIQUE，应用层判重被并发击穿**。现象：偶发重复注册同一手机号。原因：两个请求同时查「不存在」再同时插入，应用层判断有并发窗口。排查：`GROUP BY phone HAVING COUNT(*) > 1` 找出存量重复；对策：加 UNIQUE 约束 + 插入捕获冲突。
5. **坑 5：无意识冗余**。现象：商品名随手复制进订单表，改价后没人说得清订单该显示新名还是旧名。原因：冗余没定义更新语义。排查：每处冗余列问「归谁更新、何时更新」；对策：要么补快照语义（下单时写入、永不追改），要么删掉改 JOIN。
6. **坑 6：外键恐惧症**。现象：听说互联网公司不建外键，于是全库裸奔，出现引用不存在的 user_id 的孤儿订单。原因：把别人的性能权衡当默认。排查：找孤儿行 `SELECT * FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE u.id IS NULL;`；对策：入门阶段默认建外键（本课写法），真遇到写入瓶颈再评估「应用层保证」的替代方案。

## 小练习

1. 一对一落表：为「用户档案（可能没有，有则最多一份）」设计 user_profiles 表——用 UNIQUE 的外键保证唯一性，写出完整 DDL 并解释为什么普通外键不够。
2. 范式诊断：选课表 `enrollments(student_id, course_id, course_name, score)`，主键 (student_id, course_id)。指出 course_name 违反哪级范式、它实际依赖谁，写出修复后的表结构。
3. 类型题：订单号、订单金额、创建时间、订单状态四列各选一个类型并各用一句话说明理由（提示：订单号是否需要参与算术？状态取值是否固定？）。
4. **综合设计**：「购物车」需求——用户可把多个商品加入购物车并记住数量，未下单也长期保存。完成五步流程：给出实体与关系判断、完整 DDL（约束含 CHECK 与防重复加入的设计）、理由批注，以及验证查询「某用户购物车总金额」；并回答：购物车项与 order_items 结构相似，为什么不能直接复用同一张表？
