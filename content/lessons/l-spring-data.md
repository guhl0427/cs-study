---
id: l-spring-data
slug: spring-data
title: Spring Data JPA：注解即 ORM
difficulty: 2
estMinutes: 90
tags: [Spring Data, JPA, ORM, 数据库]
summary: 三层积木逐层拆：JPA 规范、Hibernate 实现、Spring Data 仓库；实体注解对照 CREATE TABLE，方法名即查询的派生机制与启动期报错优点，H2 内存库零配置起步换 MySQL 只改配置；主线把内存 Map 完整迁移成真数据库并 curl 验证全端点。
updated: 2026-11-22
resources:
  - id: r-spring-data-jpa
    title: Spring Data JPA 官方参考
    url: https://docs.spring.io/spring-data/jpa/reference/
    type: doc
    difficulty: 2
    note: 派生查询关键词全表在这里，写 findBy 前先查。
  - id: r-h2
    title: H2 Database Engine
    url: https://www.h2database.com/html/main.html
    type: tool
    difficulty: 1
    note: 内存数据库，本课零配置跑通用它。
---

> 一句话定义：Spring Data JPA = 「SQL 入门」的表结构 × ORM 翻译官 × **方法名即查询**——实体类映射表，继承一个接口白送全套 CRUD，`findByAuthor` 这样的方法名能自动生成 SQL。

## 概念讲解

### 三层积木：规范、实现、仓库

Java 世界把「对象 ↔ 表」拆成三层，每层各管一段：

| 层 | 是什么 | 类比 |
| ---- | ---- | ---- |
| JPA（Jakarta Persistence） | **规范**：定义 @Entity、@Id 等注解与操作接口 | 「接口」——只定合同不给实现 |
| Hibernate | **实现**：真正把对象操作翻译成 SQL 的引擎 | 「实现类」——兑现合同 |
| Spring Data JPA | **仓库层**：包在最外，把 CRUD 白送给你 | 「脚手架」——自动写样板代码 |

这正是第 1 篇「接口与实现」的现实放大版：JPA 是 interface，Hibernate 是 implements 它的类，Spring Data 再抽掉重复劳动。你只接触最上层（仓库接口），底下引擎理论可替换——分层隔离变化。对照 Python：Hibernate ≈ SQLAlchemy 引擎，Spring Data ≈ 你在 todo-api 里手写的 crud.py，只是它自动生成了。

### 实体注解 ↔ SQL 对照

「SQL 入门」学的 CREATE TABLE，翻译成注解一列一个：@Entity↔CREATE TABLE（类=一张表）、@Id↔PRIMARY KEY、@GeneratedValue(IDENTITY)↔AUTO_INCREMENT、@Column(nullable=false, length=50)↔NOT NULL / VARCHAR(50)、@ManyToOne↔FOREIGN KEY。并排感受：

```sql
CREATE TABLE article (
  id     BIGINT PRIMARY KEY AUTO_INCREMENT,
  title  VARCHAR(50) NOT NULL,
  author VARCHAR(50)
);
```

```java
@Entity
public class Article {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)   // 主键自增
    private Long id;
    @Column(nullable = false, length = 50)                   // NOT NULL + VARCHAR(50)
    private String title;
    private String author;      // 可空列不标注解 = 默认约束
}
```
**SQL 知识全部复用**：主键、非空、长度、外键一个不少，只是换了表达语言。@ManyToOne 是最常用关联——「多条评论属于一篇文章」：

```java
@Entity
public class Comment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne @JoinColumn(name = "article_id")    // 外键列 article_id
    private Article article;
}
```

### 方法名即查询：派生查询

仓库接口继承 JpaRepository 后 CRUD 白送；自定义查询**只写方法名**，Spring Data 启动时解析并生成 SQL：

```java
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByAuthor(String author);
    // → SELECT * FROM article WHERE author = ?
    List<Article> findByAuthorOrderByCreatedAtDesc(String author);
    // → ... WHERE author = ? ORDER BY created_at DESC
}
```

解析规则：findBy 开头 + 属性名 + 关键词连接，高频关键词：

| 关键词 | 生成的 SQL 片段 | 示例 |
| ---- | ---- | ---- |
| And / Or | WHERE a = ? AND b = ? | findByAuthorAndTitle |
| Between | BETWEEN ? AND ? | findByCreatedAtBetween |
| Containing | LIKE '%?%' | findByTitleContaining |
| OrderByXxxAsc / Desc | ORDER BY xxx | findByAuthorOrderByTitleAsc |

两个优点值得点名：其一，**启动期报错**——方法名里拼错字段（findByAuther）启动直接抛 PropertyReferenceException，错误在部署前暴露，等于把「编译期查错」延伸到数据层；其二，生成的 SQL 全部**参数化**（? 占位），SQL 注入天然免疫（呼应安全课）。

### H2 内存库起步，换 MySQL 只改配置

开发期用 H2 内存数据库：零安装、启动即建库、重启即清空——练习阶段是特性不是缺陷。上生产换 MySQL，**代码一行不改，只改配置**：

| 配置项 | H2 | MySQL |
| ---- | ---- | ---- |
| 依赖 | com.h2database:h2 (runtime) | mysql:mysql-connector-j (runtime) |
| spring.datasource.url | jdbc:h2:mem:demo | jdbc:mysql://localhost:3306/demo |
| username / password | sa / 空 | root / 你的密码 |

### ddl-auto 五档与生产红线

`spring.jpa.hibernate.ddl-auto` 控制「要不要按实体自动建/改表」：create（每次启动删旧表重建）、create-drop（关闭即删，适合单测）、update（按实体差异补列，开发期便利）、validate（只校验不一致不改）、none（什么都不做）。**生产红线：绝不允许 update/create 上生产**——自动改结构不可控、不可回滚、无评审记录。生产用 Flyway/Liquibase 做版本化迁移（每次结构变更是一个带编号的 SQL 脚本，可回滚、可审计），对照 SQLAlchemy 课的 Alembic——同一问题同一答案，本课只预告。

### 事务边界：@Transactional 划清原子操作

呼应数据库事务课：Repository 的单方法（save/deleteById）由 Spring Data 自动包事务；一旦一个业务动作要写多张表（下单 = 扣库存 + 生成订单），就在 **Service 层方法**上标 @Transactional，把多条写操作绑成一个「全成功或全回滚」的原子单元——这就是事务边界。

### N+1 查询与 @EntityGraph

列表页经典慢性病：查 1 次文章列表，又对每篇文章各查 1 次评论——**1 + N 条 SQL**，N 大了接口就慢。ORM 都有预加载机制（呼应 SQLAlchemy 的 selectinload）：

```java
@EntityGraph(attributePaths = "comments")   // 关联一次 JOIN 查齐
List<Article> findByAuthor(String author);
```

### 三层架构：与 FastAPI todo-api 同构

Controller（协议进出）→ Service（业务）→ Repository（数据），与 todo-api 的 router → service → crud 完全同构——语言框架在变，「协议薄、业务厚、数据隔离」的分层思想不变。

## 代码示例

主线任务：把上节课的内存 Map 版文章 API **完整迁移到真数据库**——加依赖、写实体与仓库、改造 Service、curl 验证全端点（201/200/404/204），直接在上节课项目上继续，全程约 30 分钟。

### 第 0 步：加依赖与配置

pom.xml 的 dependencies 追加：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-jpa</artifactId>   <!-- JPA + Hibernate + Spring Data -->
</dependency>
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <scope>runtime</scope>                                  <!-- 只在运行期需要 -->
</dependency>
```

src/main/resources/application.properties：

```properties
spring.datasource.url=jdbc:h2:mem:demo
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=create       # 开发期：启动按实体建表
spring.jpa.show-sql=true                   # 控制台打印 Hibernate 生成的 SQL
```

### 第 1 步：实体类

新建 `Article.java`（替代上节课的 record）：

```java
package com.example.demo;

import jakarta.persistence.*;

@Entity
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)   // 主键自增
    private Long id;
    @Column(nullable = false, length = 50)
    private String title;
    private String author;                     // 可空列不标注解 = 默认约束
    protected Article() {}                     // JPA 反射建对象要求无参构造
    public Article(String title, String author) { this.title = title; this.author = author; }
    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getAuthor() { return author; }
}
```
判读：id 由数据库自增分配，代码里只读不写；无参构造是 JPA 反射建实体的要求（protected 防止业务误用），record 因为没有无参构造、字段不可变，适合做 DTO 而不是 @Entity。

### 第 2 步：仓库接口

新建 `ArticleRepository.java`：

```java
package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByAuthorOrderByTitleAsc(String author);
    // 派生查询：WHERE author = ? ORDER BY title ASC —— 零实现，启动期自动生成
}
```
判读：你没写实现类——Spring Data 启动时为接口生成动态代理实现，findAll/save/deleteById 来自 JpaRepository 继承链。

### 第 3 步：迁移 Service

重写 `ArticleService.java`（Map 换成 Repository，Controller 一行不用改）：

```java
package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ArticleService {
    private final ArticleRepository repo;      // 注入的是 Spring Data 生成的代理 Bean
    ArticleService(ArticleRepository repo) { this.repo = repo; }
    public Article create(String title, String author) {
        return repo.save(new Article(title, author));       // INSERT，自增 id 回填实体
    }
    public Article get(long id) {
        return repo.findById(id).orElseThrow(() -> new ArticleNotFoundException(id));   // Optional → 404
    }
    public List<Article> byAuthor(String author) {
        return repo.findByAuthorOrderByTitleAsc(author);
    }
    public void delete(long id) {
        if (!repo.existsById(id)) throw new ArticleNotFoundException(id);
        repo.deleteById(id);
    }
}
```
判读：save 新对象执行 INSERT 并把自增 id 回填实体；findById 返回 Optional（Java 版「可能没有」），orElseThrow 把空值转成上节课的 ArticleNotFoundException——404 语义原样保留。

### 第 4 步：Controller 加作者查询

上节课的 Controller 保持不动，只把返回类型 `ArticleService.Article` 统一改成实体 `Article`，并追加一个方法（需 import java.util.List 与 @RequestParam）：

```java
@GetMapping("/articles/by-author")
public List<Article> byAuthor(@RequestParam String author) {
    return service.byAuthor(author);            // 对照 FastAPI 查询参数 author: str
}
```

### 第 5 步：启动，读懂数据库日志

```bash
./mvnw spring-boot:run
```

预期输出要点：

```text
HikariPool-1 - Starting...                        ← 连接池启动
Hibernate: drop table if exists article cascade   ← ddl-auto=create 的建表动作
Hibernate: create table article (id bigint generated by default as identity, ...)
Started DemoApplication in 3.x seconds
```
判读：建表 SQL 是 Hibernate 按实体注解生成的——回看第 1 步注解逐列对上。

### 第 6 步：curl 全端点验证

```bash
curl -i -X POST http://localhost:8080/articles \
     -H "Content-Type: application/json" -d '{"title":"JPA 入门","author":"小明"}'   # ① → 201
curl -i -X POST http://localhost:8080/articles \
     -H "Content-Type: application/json" -d '{"title":"索引实战","author":"小红"}'   # ② → 201
curl -i "http://localhost:8080/articles/by-author?author=小明"                      # ③ → 200
curl -i http://localhost:8080/articles/1        # ④ → 200
curl -i http://localhost:8080/articles/99       # ⑤ → 404
curl -i -X DELETE http://localhost:8080/articles/1  # ⑥ → 204
```

预期要点（控制台同时打印 show-sql 的语句）：

```text
① HTTP/1.1 201  {"id":1,"title":"JPA 入门","author":"小明"}   ← id 由数据库自增分配
   Hibernate: insert into article (id,title,author) values (null,?,?)
③ HTTP/1.1 200  [{"id":1,"title":"JPA 入门","author":"小明"}]
④ 200 / ⑤ 404（ArticleNotFoundException）/ ⑥ 204
```

重启应用后再查任意文章 → 404：内存库 `jdbc:h2:mem` 重启即清空，是特性不是 bug。复盘：六个请求、四种状态码、零行手写 SQL——SQL 由「实体注解 + 方法名」两个声明生成，show-sql 打印的语句与 SQL 入门课手写的同构。

## 常见坑

1. **坑 1：ddl-auto=update 进生产**。现象：上线后表结构「自己变了」，回滚无从谈起。原因：Hibernate 按实体差异自动 DDL，不可控、无审计。排查：生产配 none 或 validate + Flyway 版本化迁移；开发期才用 create/update。
2. **坑 2：N+1 查询拖慢列表接口**。现象：日志里 1 次列表查询后跟 N 条形状相同的关联查询，接口随数据量线性变慢。原因：懒加载关联在循环里逐条触发。排查：show-sql 数查询条数；加 @EntityGraph(attributePaths=...) 或 JOIN FETCH 一次查齐（selectinload 同题同解）。
3. **坑 3：派生查询方法名拼错**。现象：启动即炸 PropertyReferenceException: No property 'auther'。原因：Spring Data 启动期解析方法名，属性不存在直接失败——这不是坏事。排查：对照实体字段名改方法名；把启动报错当免费体检，别绕过去。
4. **坑 4：绕过 ORM 拼字符串 SQL**。现象：`"SELECT ... WHERE author = '" + input + "'"` 一查就注入。原因：字符串拼接把用户输入当代码。排查：@Query 用命名参数 `WHERE author = :author` 绑定（参数化永远免疫注入）；能用派生查询就不写原生 SQL。
5. **坑 5：@Transactional 自调用失效**。现象：Service 的 methodA() 内部调 this.methodB()，B 上的 @Transactional 不生效，多表写没有回滚。原因：事务靠代理对象拦截，this 调用绕过了代理。排查：把带事务的方法拆到另一个 Bean，或把事务上移到入口方法。
6. **坑 6：实体缺无参构造或用 record 做实体**。现象：启动或查询报「无法实例化实体」。原因：JPA 反射创建对象要求无参构造；record 没有且字段不可变。排查：实体用普通类 + protected 无参构造；record 留给 DTO（请求/响应体）。

## 小练习

1. 加 `Comment` 实体（@ManyToOne 关联 Article）与 `CommentRepository.findByArticleId`，再给 Article 的列表查询加 @EntityGraph 预加载——用 show-sql 对比加与不加的查询条数。
2. 派生查询实战：给 Article 加 `publishedAt` 字段，写出「查某作者 2026-01-01 至 2026-12-31 发布的文章」的仓库方法名（提示 findByAuthorAndPublishedAtBetween），并用 show-sql 验证生成的 SQL。
3. 给 author 列建索引：实体加 `@Table(indexes = @Index(columnList = "author"))`，重启后对照 MySQL 索引课解释什么查询场景值得建。
4. **综合任务**：把 H2 换成 MySQL——本地或 Docker 起一个 MySQL，pom 换 mysql-connector-j，application.properties 换连接串，代码一行不改重启验证全端点；把「改了什么、什么没动」写成 5 行总结，体会 ORM 的隔离价值。
