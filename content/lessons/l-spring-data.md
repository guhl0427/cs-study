---
id: l-spring-data
slug: spring-data
title: Spring Data JPA：注解即 ORM
difficulty: 2
estMinutes: 45
tags: [Spring Data, JPA, 数据库]
summary: 实体类 + 接口名起出查询方法——Spring Data JPA 把「SQL 入门」的表知识翻译成注解与派生查询，仓库接口零实现。
updated: 2026-11-22
resources:
  - id: r-spring-data-jpa
    title: Spring Data JPA 官方参考
    url: https://docs.spring.io/spring-data/jpa/reference/
    type: doc
    difficulty: 2
    note: 派生查询关键词清单（findBy...）的权威出处。
  - id: r-h2-doc
    title: H2 Database
    url: https://www.h2database.com/html/main.html
    type: tool
    difficulty: 1
    note: 内存数据库，本课演示零配置跑通。
---

> 一句话定义：Spring Data JPA =「SQL 入门」的表结构 ×「ORM 翻译官」× **方法名即查询**——定义好实体类，写个接口名 `findByAuthor` 就能直接用。

## 概念讲解

三层积木从下往上：

1. **JPA**（Java Persistence API）：ORM 的标准规范——「类=表、对象=行」这套约定（呼应 SQLAlchemy 课的心智模型）；
2. **Hibernate**：JPA 最常用的实现，真正把对象操作翻译成 SQL 的引擎；
3. **Spring Data JPA**：在两者之上再包一层「仓库接口」——**继承 `JpaRepository` 就白送全套 CRUD**，还能按方法名自动生成查询：

```java
List<Article> findByAuthor(String author);
// → SELECT * FROM article WHERE author = ?
// 方法名就是查询语句——参数、条件全自动解析
```

实体类用注解描述表映射：

| 注解 | 作用 | 呼应 SQL 入门 |
| ---- | ---- | ---- |
| `@Entity` | 这个类映射一张表 | CREATE TABLE |
| `@Id` + `@GeneratedValue` | 主键自增 | PRIMARY KEY AUTO_INCREMENT |
| `@Column(nullable=false)` | 列约束 | NOT NULL |
| `@ManyToOne` | 多对一关联 | FOREIGN KEY |

配置一条连接串就能跑（开发用 H2 内存库，换 MySQL 只改 URL 和驱动）：

```properties
spring.datasource.url=jdbc:h2:mem:demo
spring.jpa.hibernate.ddl-auto=create     # 启动按实体建表（开发期用）
```

## 代码示例

实体 + 仓库 + 服务三段，把上节课的 Map 伪数据换成真数据库：

```java
// Article.java —— 实体（表结构）
@Entity
public class Article {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 50)
    private String title;
    private String author;
    // 省略 getter/setter
}
```

```java
// ArticleRepository.java —— 零实现仓库接口
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findByAuthorOrderByTitleAsc(String author);   // 方法名即 SQL
}
```

```java
// ArticleService.java —— 服务层调用
@Service
public class ArticleService {
    private final ArticleRepository repo;
    ArticleService(ArticleRepository repo) { this.repo = repo; }   // 依赖注入

    public Article create(String title, String author) {
        Article a = new Article();
        a.setTitle(title);
        a.setAuthor(author);
        return repo.save(a);               // INSERT
    }
    public List<Article> byAuthor(String author) {
        return repo.findByAuthorOrderByTitleAsc(author);           // SELECT
    }
}
```

Controller 里注入 Service 调用即可——三层（Controller → Service → Repository）各司其职，对照 FastAPI 实战课的 todo-api 结构一模一样。

## 常见坑

1. **坑 1：`ddl-auto=update` 用进生产**。让 Hibernate 自动改表结构是开发期便利、生产期事故——生产环境用 Flyway/Liquibase 迁移（呼应 SQLAlchemy 课的 Alembic）。
2. **坑 2：N+1 查询**。循环里逐条取关联数据（1 次列表 + N 次关联）——列表接口用 `@EntityGraph` 或 JOIN FETCH 预加载，和 SQLAlchemy 的 selectinload 同题同解。
3. **坑 3：方法名拼错静默失败**。`findByAuther` 启动时报「property not found」而不是运行时——报错在启动期是优点，学会读它。
4. **坑 4：绕过 Repository 拼原生 SQL 字符串**。需要原生查询时用 `@Query` 带参数绑定（`:author` 占位），呼应「SQL 注入」课：永远参数化。

## 小练习

1. 加 `deleteById` 与 `existsById` 的服务方法，写 Controller 的 DELETE 接口（404 语义）。
2. 用派生查询写「查某作者 2026 年发布的文章」（字段 `publishedAt`）——提示：`findByAuthorAndPublishedAtBetween`。
3. 思考题：对照「SQL 入门」的联合索引——`findByAuthorOrderByTitleAsc` 高频的话，该给哪些列建索引？在实体上怎么声明？
