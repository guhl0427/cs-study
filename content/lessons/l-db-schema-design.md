---
id: l-db-schema-design
slug: db-schema-design
title: 从需求到表结构：范式与权衡
difficulty: 2
estMinutes: 35
tags: [数据库, 设计]
summary: 一张需求清单变成一组表：先按「一事一表」拆，再用主键外键连线，最后为了性能做有意识的冗余。
updated: 2026-11-22
resources:
  - id: r-ddl-basics
    title: MySQL · CREATE TABLE 语法
    url: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
    type: doc
    difficulty: 2
    note: 列类型与约束的官方速查。
---

> 一句话定义：表结构设计 = 把业务对象拆成「一事一表」，用键把表连起来，再在读取性能和更新一致性之间做有意识的权衡。

## 概念讲解

拿到需求「学生选课」怎么拆？原则是**每个「事实」一张表**：

- 学生（学生 id、姓名、年级）——关于「人」的事实
- 课程（课程 id、名称、学分）——关于「课」的事实
- 选课记录（学生 id、课程 id、学期、成绩）——「学生与课之间发生的事」

把「学生姓名」重复写进选课记录，就是**冗余**：改名要改 N 行，漏一行数据就自相矛盾。把事实拆干净的原则叫**范式化**（前三级够用：每列原子 / 依赖整键 / 无传递依赖——不必背定义，会识别「这列其实重复描述了另一列」即可）。

但工程里经常**反范式**：例如订单表冗余一份商品快照名——商品改名的瞬间，历史订单还该显示下单时的名字。这不是偷懒，是「历史快照」的业务语义。范式管正确与省心，反范式管读取性能与业务快照——**有意识的选择**才叫设计。

字段类型三个原则：能小不大（状态用 TINYINT 不用 VARCHAR(255)）、能精确不浮点（金额用 DECIMAL）、必空必填想清楚（NOT NULL 让数据负责到底）。

## 代码示例

把上面三张表写出来，主键与外键把关系钉死：

```sql
CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  grade TINYINT NOT NULL
);

CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(100) NOT NULL,
  credit TINYINT NOT NULL DEFAULT 2
);

CREATE TABLE enrollments (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  term CHAR(6) NOT NULL,               -- 如 2026F
  score TINYINT NULL,                  -- 未出成绩
  PRIMARY KEY (student_id, course_id, term),   -- 一名学生一门课一学期只有一条记录
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

联合主键 `(student_id, course_id, term)` 同时担当了业务唯一性约束——重复选课在数据库层面直接不可能发生。

## 常见坑

1. **坑 1：把列表塞进一个字段**。`tags VARCHAR(200)` 存「css,js,vue」——没法按标签查询、没法做约束。一对多关系应该拆表。
2. **坑 2：金额用 FLOAT/DOUBLE**。浮点误差会让对账不平——金额用 DECIMAL(10,2)。
3. **坑 3：不敢建外键也说不清理由**。互联网业务常用「应用层保证 + 不建外键」换写入性能，但这是权衡不是默认——入门阶段先建外键，遇到性能瓶颈再评估。

## 小练习

1. 为「文章 + 标签（一篇文章多个标签）」设计表结构，并解释为什么不把标签塞进文章表的一列。
2. 指出 `orders` 表里冗余 `product_name` 的场景何时合理、何时是坑。
3. 思考题：`grade TINYINT` 和 `grade VARCHAR(10)`，各自什么时候是对的选择？
