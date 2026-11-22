---
id: l-sql-select
slug: sql-select
title: SELECT 深入：从过滤到多表联查
difficulty: 1
estMinutes: 90
tags: [数据库, SQL]
summary: 一条 SQL 的书写顺序不等于执行顺序——七步流水线讲透 WHERE/GROUP BY/HAVING 各自能看见什么；建一个博客库，跟做 10 个渐进式业务查询，从单表过滤一路写到 JOIN+分组+HAVING 的综合榜。
updated: 2026-11-22
resources:
  - id: r-sql-sqlbolt
    title: SQLBolt · 交互式 SQL 教程
    url: https://sqlbolt.com/
    type: tool
    difficulty: 1
    note: 浏览器里逐课练 SELECT 与 JOIN，无需安装数据库，适合跟完本课后加练。
  - id: r-sql-pg-select
    title: PostgreSQL · SELECT 语法文档
    url: https://www.postgresql.org/docs/current/sql-select.html
    type: doc
    difficulty: 2
    note: 子句顺序与语义的权威说明；LIMIT/OFFSET、LIKE 语义以官方文档为准。
---

> 一句话定义：SELECT 是声明式查询——你只描述「要什么数据」，按什么路径取是优化器的事；而写对它的钥匙，是理解那条与书写顺序不同的「执行流水线」。

## 概念讲解

### 先建立直觉：你在点菜，不是在炒菜

命令式语言是你亲自炒菜，每步由你安排；SQL 是点菜：「上海用户、已发布、浏览量前 10 的文章标题给我」，后厨怎么备菜是优化器的自由。由此带来两个认知转变：同一个需求往往有多种写法，结果相同、性能可能不同；**书写顺序不是执行顺序**——你以为 SELECT 先跑，其实它接近最后。这条流水线是本章的地基，也是绝大多数「为什么报错」的答案来源。

### 七步执行流水线

书写顺序你很熟：`SELECT ... FROM ... WHERE ... GROUP BY ... HAVING ... ORDER BY ... LIMIT`。但数据库实际按下面的顺序执行：

```text
① FROM / JOIN   确定数据源：把参与表按 ON 条件拼成一张「中间大表」
② WHERE         逐行过滤：只保留条件为 TRUE 的行（聚合还没发生）
③ GROUP BY      把剩下的行按分组键堆成组，一组将来折叠成一行
④ HAVING        对「组」过滤：这时聚合函数（COUNT/SUM...）才可用
⑤ SELECT        计算输出列与表达式，别名在这一步才诞生
⑥ ORDER BY      排序：此刻可以用 ⑤ 里起的别名
⑦ LIMIT         截取前 N 行（配合 OFFSET 翻页）
```

| 步骤 | 此刻可见 | 典型限制 |
| ---- | ---- | ---- |
| FROM/JOIN | 所有参与表的原始列 | 别名还没起 |
| WHERE | 单行的原始列 | 用不了聚合，用不了 SELECT 别名 |
| GROUP BY | 分组键 | 输出粒度从「行」变成「组」 |
| HAVING | 组 + 聚合值 | 过滤对象是组，不是行 |
| SELECT | 别名在这里诞生 | 非聚合列必须来自分组键 |
| ORDER BY / LIMIT | 输出列 + 别名 | 排序可用别名；LIMIT 纯截断 |

写查询卡住就回这张表找原因。例：「发文 ≥2 篇的作者」过滤的是聚合值，WHERE 阶段还没有组，只能写 HAVING；「上海用户的文章」过滤的是单行，必须写 WHERE。**判断条件放哪，先问过滤对象是行还是组。**

### WHERE 条件全家福

| 写法 | 含义 | 备注 |
| ---- | ---- | ---- |
| `=` `<>` `>` `>=` `<` `<=` | 比较 | 日期字符串 `'2026-11-01'` 可直接比；`<>` 是标准的不等于 |
| `AND` / `OR` | 逻辑组合 | AND 优先级高于 OR，混用一定加括号 |
| `IN ('a','b')` | 等于其中任意一个 | 等价于多个 OR，可读性更好 |
| `BETWEEN a AND b` | 闭区间，两端都含 | 日期上界常用 `>= a AND < b` 避免歧义 |
| `LIKE 'ab%'` | 模式匹配 | `%` 任意多个字符，`_` 恰好一个字符 |
| `IS NULL` | 是否为 NULL | 唯一正确的判空方式 |

**三值逻辑**是 SQL 与其他语言最大的不同：比较结果除了 TRUE/FALSE 还有 UNKNOWN。NULL 与任何值比较——包括 `NULL = NULL`——结果都是 UNKNOWN，而 WHERE 只放行 TRUE。所以「找没有作者的帖子」必须写 `author_id IS NULL`；写 `= NULL` 永远查不到、也永远不报错，是最隐蔽的一类 bug。

### ORDER BY 与 LIMIT：排序与翻页

多列排序是「先按第一列，相同再按第二列」的字典序，像排名先按总分、同分再按姓名：`ORDER BY views DESC, id ASC`。NULL 的排序位置两库不同：MySQL 认为 NULL 最小（ASC 排最前），PostgreSQL 认为 NULL 最大（DESC 排最前）——跨库核对结果时留意。

翻页公式：每页 n 条、第 p 页，跳过前 `(p-1)*n` 行：`LIMIT n OFFSET (p-1)*n`（MySQL 另有简写 `LIMIT 跳过数, 条数`）。页码越深扫描的行越多（OFFSET 5000 也要先数过 5000 行），深分页的性能问题在索引一章会再遇到。

### 聚合五函数与 GROUP BY 的分组键规则

| 函数 | 数什么 | 关键细节 |
| ---- | ---- | ---- |
| `COUNT(*)` | 行数 | NULL 行也数 |
| `COUNT(col)` | col 非 NULL 的行数 | LEFT JOIN 统计的关键（见查询 9） |
| `SUM`/`AVG`/`MIN`/`MAX` | 求和/平均/最小/最大 | 都忽略 NULL；文本日期也能比大小，AVG 建议套 ROUND |

**分组键规则**：SELECT 里出现的每个非聚合列，都必须出现在 GROUP BY 中。原因很直观：分组后一组折叠成一行，组内其他列有好多值，「输出哪个？」数据库无法回答。PostgreSQL 严格执行；MySQL 8 默认（ONLY_FULL_GROUP_BY）也执行，但 5.7 之前的旧版本不报错、随机挑组内一个值返回——正是数据对不上的温床。例外：按某表主键分组时同表其他列可不写（函数依赖，两库都支持），但初学阶段建议老实写全。

### JOIN：两张表怎么对齐

JOIN 的本质：按 ON 条件把两张表的行「横向对齐」拼成一张中间表。拿本章数据先建立直观：

```text
users（左表）                posts（右表）
id  name                     id   author_id
1   阿柴                     101  1        ← 与 users.id=1 对上
5   小红（没写过文章）        108  NULL     ← 匿名投稿，谁都对不上
INNER JOIN：两边都对上的行才保留 → 小红消失（右表没有她的行），108 也消失
LEFT  JOIN：左表全员保留，右表对不上补 NULL → 小红还在，post 列全 NULL
RIGHT JOIN：右表全员保留，与 LEFT 对称——实践中少用，换表位置写 LEFT 更好读
```

| 类型 | 保留谁 | 典型业务问题 |
| ---- | ---- | ---- |
| INNER JOIN | 两边都对上 | 「列出有作者的文章及其作者」 |
| LEFT JOIN | 左表全员 | 「每个用户的文章数，没文章的也要出现（为 0）」 |

**「数错行」诊断三连**（JOIN 后结果数量不对，按序查）：结果比预期**多得多** → 忘写 ON（笛卡尔积）或条件太松；数「用户数」却数成了「文章数」→ 一对多 JOIN 改变了粒度，1 个用户 N 篇文章 JOIN 后就是 N 行，`COUNT(*)` 数的是行，要数实体用 `COUNT(DISTINCT u.id)`；结果比预期**少** → ON 太紧，或 NULL 行被 INNER 剪掉（换 LEFT JOIN 对比行数即可定位）。

**自连接一句话**：同一张表借两个别名出场两次，表达表内层级——员工表 `(id, name, manager_id)` 查「员工及其经理」：`employees e LEFT JOIN employees m ON m.id = e.manager_id`。

## 代码示例

主线：建一个「博客库」（users + posts），跟做 10 个渐进式业务查询。每条 SQL 可直接粘贴运行（MySQL 8 / PostgreSQL 通用），先自己猜结果再对照。结果以 `--` 注释网格显示，与数据库命令行输出同构。

### 第 0 步：建表造数（整段粘贴）

```sql
CREATE TABLE users (
  id   INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL
);
CREATE TABLE posts (
  id         INT PRIMARY KEY,
  author_id  INT NULL,             -- NULL = 匿名投稿（作者已注销）
  title      VARCHAR(100) NOT NULL,
  status     VARCHAR(20) NOT NULL, -- published / draft
  views      INT NOT NULL DEFAULT 0,
  created_at DATE NOT NULL
);
INSERT INTO users VALUES
  (1,'阿柴','上海'), (2,'小明','北京'), (3,'老王','上海'),
  (4,'阿柴','深圳'), (5,'小红','上海');
INSERT INTO posts VALUES
  (101, 1,'SQL 入门第一课',   'published',1200,'2026-11-01'),
  (102, 1,'索引是怎样炼成的', 'published', 800,'2026-11-03'),
  (103, 2,'我的 Python 笔记', 'published', 500,'2026-11-05'),
  (104, 2,'草稿：HTTP 概览',  'draft',       0,'2026-11-06'),
  (105, 3,'数据库设计心得',   'published',2000,'2026-11-08'),
  (106, 3,'随手记',           'draft',       0,'2026-11-09'),
  (107, 4,'NULL 值的三值逻辑','published', 300,'2026-11-10'),
  (108, NULL,'匿名投稿',      'published', 100,'2026-11-11'),
  (109, 2,'图解 HTTP 缓存',   'published', 700,'2026-11-12');
```

数据里故意埋了四个考点：两个同名的阿柴（id 1 和 4）、没写过文章的小红、匿名投稿 108、两篇 draft。

### 第 1 步：单表过滤（查询 1-4）

```sql
-- 查询 1｜比较条件 + AND：已发布且浏览量 >= 800
SELECT id, views FROM posts
WHERE status = 'published' AND views >= 800;
-- 结果：3 行        逐句为什么：FROM 先圈定 9 行，WHERE 逐行淘汰（107 的
-- | id  | views |       300 与三篇 draft 不合格），SELECT 最后挑列。执行顺
-- | 101 | 1200  |       序是 ①FROM→②WHERE→⑤SELECT——SELECT 写在最前，
-- | 102 |  800  |       却接近最后执行。
-- | 105 | 2000  |

-- 查询 2｜IN + LIKE：草稿，或标题含 SQL
SELECT id, status FROM posts
WHERE status IN ('draft') OR title LIKE '%SQL%';
-- 结果：3 行        IN 等价于两个 OR；%SQL% 的 % 表示「前面任意多个字符」。
-- | id  | status    |
-- | 101 | published |
-- | 104 | draft     |
-- | 106 | draft     |

-- 查询 3｜IS NULL：找匿名投稿
SELECT id, title FROM posts WHERE author_id IS NULL;
-- 错误写法 WHERE author_id = NULL：比较得 UNKNOWN，永远 0 行且不报错。
-- 结果：1 行   | id  | title    | → | 108 | 匿名投稿 |（单行表）


-- 查询 4｜排序 + 翻页：浏览量降序的第 2 页（每页 3 条）
SELECT id, views FROM posts
ORDER BY views DESC, id ASC
LIMIT 3 OFFSET 3;                -- 第 p 页：OFFSET = (p-1)*n = 3
-- 结果：3 行        全序：105,101,102,109,103,107,108,104,106；跳过前 3 取
-- | id  | views |       3 行。id ASC 是并列时的稳定次序（104 与 106 都是 0）
-- | 109 |  700  |       ——排序键不破并列，翻页可能重复或丢行。
-- | 103 |  500  |
-- | 107 |  300  |
```

### 第 2 步：聚合与分组（查询 5-7）

```sql
-- 查询 5｜聚合五函数总览（无 GROUP BY：全表折叠成一行）
SELECT COUNT(*) AS row_total,          -- 9：数行，NULL 行也算
       COUNT(author_id) AS has_author, -- 8：一个 NULL 不计入
       SUM(views) AS views_sum,        -- 5600
       ROUND(AVG(views), 2) AS v_avg,  -- 622.22 = 5600/9
       MAX(views) AS v_max, MIN(views) AS v_min  -- 2000 / 0
FROM posts;
-- 结果：1 行 → 9 | 8 | 5600 | 622.22 | 2000 | 0
-- 两个 COUNT 的差（9-8=1）恰好暴露了 NULL 的存在——这本身就是体检。

-- 查询 6｜GROUP BY：各状态的文章数
SELECT status, COUNT(*) AS cnt FROM posts GROUP BY status;
-- 结果：2 行        输出粒度变成「每个分组键一行」。若换成 GROUP BY
-- | status    | cnt | author_id，NULL（匿名投稿）也自成一组——分组键
-- | published | 7   | 对 NULL 网开一面。
-- | draft     | 2   |

-- 查询 7｜HAVING 过滤组：已发布 >= 2 篇的作者
SELECT author_id, COUNT(*) AS cnt
FROM posts
WHERE status = 'published'   -- ② 先按行过滤：draft 进不了分组
GROUP BY author_id           -- ③ 分组
HAVING COUNT(*) >= 2;        -- ④ 再按组过滤：整组丢弃
-- 结果：2 行        1 号发 2 篇、2 号发 2 篇（103+109）入选；3、4 号各
-- | author_id | cnt | 1 篇、NULL 1 篇被淘汰。写成 WHERE COUNT(*) >= 2
-- | 1         | 2   | 直接报错——WHERE 跑在 GROUP BY 之前，聚合还不存在。
-- | 2         | 2   |
```

### 第 3 步：JOIN 与综合榜（查询 8-10）

```sql
-- 查询 8｜INNER JOIN：文章配上作者名
SELECT u.name, p.title
FROM users u                        -- u/p 是表别名，JOIN 长查询必备
INNER JOIN posts p ON p.author_id = u.id
WHERE p.status = 'published';
-- 结果：6 行        published 明明有 7 篇，这里只剩 6：匿名投稿 108 的
-- | name | title            |  author_id 是 NULL，与任何 users 行都对不上，被
-- | 阿柴 | SQL 入门第一课    |  INNER JOIN 剪掉；小红没文章，也自然不在。
-- | 阿柴 | 索引是怎样炼成的  |
-- | 小明 | 我的 Python 笔记 |
-- | 老王 | 数据库设计心得    |
-- | 阿柴 | NULL 值的三值逻辑|
-- | 小明 | 图解 HTTP 缓存   |

-- 查询 9｜LEFT JOIN + 两种 COUNT：每个用户的文章总数，没文章也要 0
SELECT u.name,
       COUNT(p.id) AS cnt_by_post,  -- 数右表主键：NULL 不计 → 小红 0
       COUNT(*)    AS cnt_by_row    -- 数行数：NULL 补的行也算 → 小红 1
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
GROUP BY u.id, u.name;
-- 结果：5 行        本章最核心的一张表：LEFT JOIN 为小红补了一行
-- | name | cnt_by_post | cnt_by_row | 「右表全 NULL」，COUNT(*) 把它数成 1（没文章
-- | 阿柴 | 2           | 2          | 的人看起来有一篇——典型数错行），COUNT(p.id)
-- | 小明 | 3           | 3          | 只数非 NULL 的 p.id，得到正确的 0。
-- | 老王 | 2           | 2          | 统计左表实体时，数右表列。
-- | 阿柴 | 1           | 1          |
-- | 小红 | 0           | 1          |

-- 查询 10｜综合榜：发布 >= 2 篇的作者，按总浏览量降序
SELECT u.name,
       COUNT(p.id) AS published_cnt,
       COALESCE(SUM(p.views), 0) AS total_views  -- SUM 全 NULL 时为 NULL，兜底 0
FROM users u
LEFT JOIN posts p
       ON p.author_id = u.id
      AND p.status = 'published'  -- 右表条件放 ON，不能放 WHERE
GROUP BY u.id, u.name
HAVING COUNT(p.id) >= 2
ORDER BY total_views DESC;
-- 结果：2 行        一条查询串起全流程：右表条件若写进 WHERE，NULL 行
-- | name | published_cnt | total_views | 过不了比较，「没文章的作者」整行消失，LEFT
-- | 阿柴 | 2             | 2000        | JOIN 白写。WHERE 过滤的是 JOIN 之后的行，
-- | 小明 | 2             | 1200        | ON 过滤的是「怎么对齐」。
```

## 常见坑

1. **坑 1：WHERE 里用 SELECT 别名或聚合**。现象：`WHERE v_avg > 100` / `WHERE COUNT(*) > 2` 报 Unknown column 或 Invalid use of group function。原因：别名第⑤步才诞生，聚合第④步才有，WHERE 是第②步。排查：按七步流水线把聚合条件挪到 HAVING，别名还原成原始表达式。
2. **坑 2：判空用 `= NULL`**。现象：查「没有作者的帖子」返回 0 行但不报错。原因：NULL 与任何值比较都是 UNKNOWN。排查：`SELECT author_id = NULL FROM posts;` 看到一列 NULL 即证实比较失效；正确写法 `IS NULL`。
3. **坑 3：一对多 JOIN 后 COUNT(\*) 数实体**。现象：JOIN posts 统计「用户数」越数越大，人数变文章数。原因：JOIN 改变粒度，一行不再是「一个用户」。排查：`COUNT(DISTINCT u.id)` 与 `COUNT(*)` 对比，差值即重复行。
4. **坑 4：LEFT JOIN 的右表条件写在 WHERE**。现象：「每个用户已发布文章数（没文章显示 0）」查不出 0，没文章的用户消失。原因：右表列在补 NULL 行上是 NULL，比较为 UNKNOWN 被 WHERE 剔除，LEFT 退化成 INNER。排查：两种写法各跑一遍对比行数；对策：右表条件写进 ON。
5. **坑 5：GROUP BY 漏写非聚合列**。现象：PG 报 column must appear in the GROUP BY clause；MySQL 8 报类似错误。原因：分组后该列组内有多个值，无法确定输出哪个。排查：SELECT 里的列逐个核对——要么是分组键，要么套聚合。注意 MySQL 5.7 之前不报错、随机取值，升级后行为突变。
6. **坑 6：LIKE 前导通配与大小写**。现象：`LIKE '%SQL%'` 结果对但慢；PG 里 `'sql%'` 查不到，MySQL 却能。原因：前导 `%` 用不了索引（索引章展开）；MySQL 常用排序规则默认不区分大小写，PG 的 LIKE 区分。对策：PG 用 `ILIKE` 或统一 `LOWER()`——但 `LOWER(col)` 同样会让索引失效。

## 小练习

1. 写查询：统计每个城市的用户数，只保留人数 ≥2 的城市并按人数降序（GROUP BY + HAVING + ORDER BY 一次到位），先预测上海排第几再运行验证。
2. 写查询：按浏览量降序翻页，每页 4 条取第 2 页（写出 OFFSET 公式代入的数字），核对第一行是不是 id=103。
3. 找 bug：`SELECT u.name FROM users u LEFT JOIN posts p ON p.author_id = u.id WHERE p.status = 'draft';` 本想查「发过草稿的用户」，没草稿的用户却全消失了。指出错在执行流水线的哪一步，并改写为正确版本。
4. **综合查询设计**：给博客首页设计「热门作者榜」——按已发布文章的总浏览量降序输出前 3 位作者的名字、文章数、总浏览量。要求写清：为什么用 INNER 或 LEFT JOIN、右表条件放哪、浏览量并列时怎么破并列；再用一句话说明误用 `COUNT(*)` 时榜单会错在哪。
