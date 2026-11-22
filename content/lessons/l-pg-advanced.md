---
id: l-pg-advanced
slug: pg-advanced
title: PostgreSQL 对照：JSONB、数组与 CTE
difficulty: 3
estMinutes: 40
tags: [PostgreSQL, 对照学习]
summary: 同一套 SQL 学完，这一课看 PG 的差异化武器：JSONB 存半结构化数据、数组免建关联表、CTE 让复杂查询可读——以及「什么时候该用它而不是 MySQL」。
updated: 2026-11-22
resources:
  - id: r-pg-doc
    title: PostgreSQL 官方文档 · JSON Types
    url: https://www.postgresql.org/docs/current/datatype-json.html
    type: doc
    difficulty: 3
    note: JSONB 与 JSON 的差异、操作符权威出处。
  - id: r-pg-tutorial
    title: PostgreSQL Tutorial（pgtutorial.com）
    url: https://www.postgresqltutorial.com/
    type: doc
    difficulty: 1
    note: 结构清晰的英文教程站，CTE/窗口函数章节都不错。
---

> 一句话定义：PG 与 MySQL 的 SQL 主干 95% 相通——差异在**特色能力**（JSONB/数组/CTE/全文检索）与**行为默认值**（大小写、并发模型），对照学效率最高。

## 概念讲解

**JSONB**：PG 把 JSON 存成解析后的二进制（不是文本串），可以直接建索引和查询——「用户的个性化配置」「商品的动态属性」这类**列结构无法预知**的数据不用再设计 N 张子表：

```sql
SELECT * FROM products
WHERE attrs @> '{"color": "red"}';        -- @> 包含操作符，可走 GIN 索引
```

定位心法：**核心、要约束、要 JOIN 的字段用列；多变、展示用、带内部分层的用 JSONB**——一把梭全塞 JSONB 等于放弃数据库约束（呼应表结构设计课的范式）。

**数组类型**：一列存多个同类型值，配 GIN 索引——「文章的标签」在数据量小、关系简单时可以不用建关联表：

```sql
SELECT * FROM articles WHERE tags && ARRAY['css', 'js'];   -- && 交集非空
```

但注意边界：标签要计数、要外键约束、多对多带属性时，关联表仍是正解（入门课的「列表塞字段」坑说的就是这个边界）。

**CTE（WITH 查询）**：把子查询命名、分层，复杂查询从「一层套一层」变成「按步骤读」：

```sql
WITH monthly AS (
  SELECT date_trunc('month', created_at) AS m, COUNT(*) AS cnt
  FROM articles WHERE status = 'published'
  GROUP BY 1
)
SELECT m, cnt FROM monthly WHERE cnt > 10 ORDER BY m;
```

对照 MySQL 8.0 之前的子查询写法（要重复一遍同样的 FROM/WHERE），可读性差一个量级——MySQL 8.0 也已支持 CTE。

**行为差异速查**（对照表驱动迁移）：

| 维度 | MySQL | PostgreSQL |
| ---- | ---- | ---- |
| 未加引号的标识符 | 不区分大小写 | 折成全小写 |
| 默认隔离级别 | REPEATABLE READ | READ COMMITTED |
| JSON | 存文本（8.0 有函数索引） | JSONB 二进制+GIN |
| 生态默认 | LAMP/互联网传统栈 | 新创企业/数据方向偏好 |

## 代码示例

JSONB + GIN 索引的完整闭环（psql 或任意客户端）：

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_attrs ON products USING GIN (attrs);

INSERT INTO products (title, attrs) VALUES
  ('T恤', '{"color": "red", "sizes": ["S","M"]}'),
  ('帽子', '{"color": "blue", "sizes": ["M"]}');
```

```sql
-- 包含查询（走 GIN 索引）
SELECT title FROM products WHERE attrs @> '{"color": "red"}';       -- T恤
-- 提取字段：->> 拿文本
SELECT title, attrs->>'color' AS color FROM products;
-- 按数组元素过滤
SELECT title FROM products WHERE attrs->'sizes' ? 'M';               -- 两行
```

CTE + 递归的组合拳——查「无限级分类树」（MySQL 要写存储过程才能干的活）：

```sql
WITH RECURSIVE category_tree AS (
  SELECT id, name, parent_id, 1 AS depth
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.name, c.parent_id, t.depth + 1
  FROM categories c JOIN category_tree t ON c.parent_id = t.id
)
SELECT * FROM category_tree ORDER BY depth;
```

## 常见坑

1. **坑 1：把 JSONB 当主力存储**。列约束、外键、统计聚合全都变得费劲——JSONB 是「灵活的补充」不是「范式化的替代」。
2. **坑 2：忘记 GIN 索引**。JSONB/数组查询不建 GIN 索引就是全表扫描——这类索引写入成本也更高，按查询频率建。
3. **坑 3：`->` 与 `->>` 混用**。`->` 返回 JSON 片段（`"red"` 带引号），`->>` 返回文本（red）——比较条件写错等于永远 false。
4. **坑 4：把 PG 的「大小写折叠」当 bug**。建表用驼峰 `createdAt` 不加引号，PG 存成 `createdat`——要么全小写命名（推荐），要么永远加双引号。

## 小练习

1. 建一张带 JSONB 属性的表，分别用 `->>` 和 `->` 查询同一字段，观察输出差异。
2. 用 `WITH RECURSIVE` 建一个三层评论树（评论可回复评论），一条查询取出整棵树。
3. 思考题：同一个「文章标签」需求，数组类型和关联表各在什么数据量/查询模式下是对的？（对照表结构设计课的范式与反范式。）
