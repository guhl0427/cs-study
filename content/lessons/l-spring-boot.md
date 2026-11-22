---
id: l-spring-boot
slug: spring-boot
title: Spring Boot 起步：依赖注入与 Web 接口
difficulty: 2
estMinutes: 90
tags: [Spring Boot, 依赖注入, REST, Java]
summary: 从「new 的耦合之痛」完整论证依赖注入：容器统一装配、Bean 概念、换实现与塞假实现两大收益；解剖 @SpringBootApplication 三合一，注解路由逐条对照 FastAPI；主线从 Initializr 生成到文章 API（GET/POST/DELETE + 404 异常），curl 验证 200/201/404。
updated: 2026-11-22
resources:
  - id: r-spring-guide
    title: Spring 官方指南 · Building an Application with Spring Boot
    url: https://spring.io/guides/gs/spring-boot
    type: doc
    difficulty: 2
    note: 官方第一篇指南，与本节主线骨架一致。
  - id: r-spring-initializr
    title: Spring Initializr
    url: https://start.spring.io/
    type: tool
    difficulty: 1
    note: 网页勾选依赖生成项目骨架，起步必备。
---

> 一句话定义：Spring Boot 是 Java 后端的事实标准框架——**依赖注入**替你组装对象、**注解路由**声明接口、内嵌服务器一条命令启动；你只管写业务，装配、序列化、服务器全部自动化。

## 概念讲解

FastAPI 里你见过 Depends，但多半没深究它为什么存在。Spring 把这件事做到极致——先论证它解决什么问题，再看 Boot 的三大魔法，最后对照 FastAPI 写接口。

### 从一个反例开始：自己 new 的世界

```java
class ArticleService {
    // 每个类自己 new 依赖：装配关系写死在源码里
    private ArticleRepository repo = new MemoryArticleRepository();
}
```

三宗罪，每一条都在项目变大后爆发：**改实现要动源码**——今天存内存、明天上数据库，就得改 ArticleService 里的 new，改动像多米诺传染所有 new 过它的类；**装配关系散落各处**——十几个类互相 new，谁创建谁、什么顺序没人说得清；**没法单测**——repo 写死连着真数据，测试下不去手（呼应软件工程测试课）。

### 依赖注入：把「要什么」和「从哪来」拆开

Spring 的答案叫**控制反转（IoC）/依赖注入（DI）**——你只声明「我需要什么」，不声明「它从哪来」：

```java
@Service                              // 入库单：把 ArticleService 交给容器管理
class ArticleService {
    private final ArticleRepository repo;
    ArticleService(ArticleRepository repo) {   // 需求单：构造参数只声明「我需要」
        this.repo = repo;
    }
}
```

类比**中央厨房**：以前每个班级自己买菜做饭（自己 new），现在由中央厨房备料配送（容器装配）——班级只提需求，送来的是哪家的货，班级不关心也不必关心。容器启动时：扫描所有「入库单」（@Component/@Service/@Repository 标注的类）→ 按需求单逐一创建 → 互相装配好。这些**由容器创建和管理的对象就叫 Bean**。

### 注入的两大收益

收益一，**换实现只改注册处**：repo 抽象成接口，两个实现都入库，ArticleService 一行不改——它只依赖接口：

```java
interface ArticleRepository { Article save(Article a); }
@Repository class MemoryArticleRepository implements ArticleRepository { /* 内存版 */ }
@Repository class JpaArticleRepository implements ArticleRepository { /* 数据库版 */ }
```

收益二，**单测塞假实现**：因为走构造注入，测试不需要 Spring 也能 new——`new ArticleService(new FakeRepo())` 直接测业务，不连真数据、毫秒级跑完（测试课说的「隔离依赖」）。两条收益合起来是一句话：**业务类保持普通 Java 类**，Spring 只在外围装配，这是「框架纠缠」的反面。FastAPI 的 Depends 是同一思想。

### @SpringBootApplication：三合一解剖

```java
@SpringBootApplication                  // 三个注解的组合 shorthand
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);   // 启动容器
    }
}
```
| 组成 | 干什么 |
| ---- | ---- |
| @SpringBootConfiguration | 本类是配置类（pom.xml 的代码版） |
| @EnableAutoConfiguration | 开启自动配置（见下节） |
| @ComponentScan | 扫描**本类所在包及子包**的组件入库 |

**扫描范围是第一大坑**：只扫启动类同包及子包。Controller 放到 com.example.web 而启动类在 com.example.demo——扫不到、Bean 不存在、接口 404 且毫无报错。约定：所有代码放启动类包树下。

### 注解路由：与 FastAPI 一一对应

REST 概念全复用（呼应后端 REST 课），只是表达从装饰器换成注解：

| Spring Boot | FastAPI | 含义 |
| ---- | ---- | ---- |
| @RestController + @RequestMapping | FastAPI() 实例 + router | 「这个类是接口集」 |
| @GetMapping("/articles/{id}") | @app.get("/articles/{id}") | GET 路由 |
| @PostMapping / @DeleteMapping | @app.post / @app.delete | 写路由 |
| @PathVariable Long id | 路径参数 id: int | 取路径占位符，自动转类型 |
| @RequestBody ArticleIn in | Pydantic 模型入参 | 请求体 JSON 绑定成对象 |
| @RequestParam String author | 查询参数 author: str | /articles?author=x |
| 方法返回值 | return dict | 自动序列化为 JSON（Jackson 干活） |

心智迁移零成本：**URL + 方法 + 参数绑定，声明式表达**。类型转换也一致——@PathVariable Long id 收到 "abc" 时 Spring 回 400，正如 FastAPI 的 422。

### starter 与自动配置：依赖传递的魔法变现

回忆 Maven 课的依赖传递：`spring-boot-starter-web` 一个依赖把 spring-mvc、内嵌 Tomcat、Jackson 全套带进来——**声明一个，带来一串**，项目还没写一行代码就有完整 HTTP 服务器。自动配置再补一刀：@EnableAutoConfiguration 检查类路径，**有什么就配什么**（条件装配）——发现 Tomcat 类就以内嵌模式启动它，发现 Jackson 就注册为默认 JSON 转换器。所以「起步阶段零配置」：starter 负责「有什么」，自动配置负责「就位」。

### Controller/Service 分层雏形

```text
curl ──→ Controller（接请求、回响应，薄）→ Service（业务，厚）→ Repository（下一篇登场）
              └────── 每层只依赖下一层，依赖注入接线 ──────┘
```

Controller 不写业务、Service 不碰 HTTP，每层只依赖下一层——FastAPI todo-api 里 router → service → crud 的同款结构，Java 靠注解 + 注入自然长出来。

## 代码示例

主线任务：从 Initializr 生成项目 → 实现文章 API（GET/POST/DELETE，含 404 异常）→ curl 验证 200/201/404 三种状态码，全程约 30 分钟。

### 第 0 步：Initializr 生成骨架

浏览器打开 https://start.spring.io：Maven、Java、Jar、Java 17，依赖勾 **Spring Web**，Group 填 com.example、Artifact 填 demo，GENERATE 下载 zip 解压。命令行等价：

```bash
curl https://start.spring.io/starter.zip \
  -d dependencies=web -d type=maven-build -d language=java \
  -d groupId=com.example -d artifactId=demo -o demo.zip
unzip demo.zip && cd demo
```

生成的结构（判读：mvnw 让本机不用装 Maven，pom.xml 已含 starter-web）：
demo/
├── pom.xml                      ← 已含 spring-boot-starter-web
├── mvnw / mvnw.cmd              ← Maven 包装器：项目自带指定版 Maven，本机零安装
└── src/main/java/com/example/demo/
    └── DemoApplication.java     ← 启动类
```
### 第 1 步：异常类——404 的领域表达

新建 `ArticleNotFoundException.java`：

```java
package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 被 @ResponseStatus 标注：抛出时 Spring 自动回 404 + 默认错误 JSON */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ArticleNotFoundException extends RuntimeException {
    public ArticleNotFoundException(long id) { super("文章 " + id + " 不存在"); }
}
```
判读：不用手写 if-else 拼错误响应——**异常即语义**，Spring 的异常处理器把带 @ResponseStatus 的异常翻译成对应状态码与 JSON 体（呼应 HTTP 课的 4xx 家族）。

### 第 2 步：数据与 Service

新建 `Article.java`（record：一行顶 Python dataclass）：

```java
package com.example.demo;
public record Article(long id, String title, String author) {}
```
新建 `ArticleService.java`（本篇数据暂存内存 Map，下一篇换真数据库）：

```java
package com.example.demo;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ArticleService {
    private final ConcurrentHashMap<Long, Article> db = new ConcurrentHashMap<>();
    private final AtomicLong seq = new AtomicLong();          // 自增主键
    public Article create(String title, String author) {
        long id = seq.incrementAndGet();
        Article a = new Article(id, title, author);
        db.put(id, a);
        return a;
    }
    public Article get(long id) {
        Article a = db.get(id);
        if (a == null) throw new ArticleNotFoundException(id);   // 业务异常上抛
        return a;
    }
    public void delete(long id) {
        if (db.remove(id) == null) throw new ArticleNotFoundException(id);
    }
}
```
判读：Service 抛业务异常，**不知道**上层是 HTTP 还是别的协议——这就是分层带来的协议无关。

### 第 3 步：Controller

新建 `ArticleController.java`：

```java
package com.example.demo;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class ArticleController {
    private final ArticleService service;
    ArticleController(ArticleService service) { this.service = service; }   // 构造注入
    @GetMapping("/articles/{id}")
    public Article get(@PathVariable Long id) {     // 路径参数自动转 Long
        return service.get(id);                     // 查不到时异常向上冒泡 → 404
    }
    @PostMapping("/articles")
    @ResponseStatus(HttpStatus.CREATED)             // 返回 201 而非默认 200
    public Article create(@RequestBody Map<String, String> in) {
        return service.create(in.get("title"), in.getOrDefault("author", "佚名"));
    }
    @DeleteMapping("/articles/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)          // 204：删除成功无正文
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
```
判读：Controller 只有「接请求 → 调服务 → 回响应」三件事，没有任何业务判断；返回对象由 Jackson 自动序列化成 JSON（正是 Maven 课里那个 Jackson）。

### 第 4 步：启动

```bash
./mvnw spring-boot:run          # Windows 用 mvnw.cmd spring-boot:run
```

预期输出要点：

```text
Tomcat started on port 8080 (http)          ← 内嵌 Tomcat 已就位，无需装服务器
Started DemoApplication in 2.1 seconds
```
### 第 5 步：curl 验证三种状态码

```bash
curl -i http://localhost:8080/articles/1                    # ① 先查不存在的 → 404
curl -i -X POST http://localhost:8080/articles \
     -H "Content-Type: application/json" \
     -d '{"title":"Hello Spring","author":"小明"}'          # ② 创建 → 201
curl -i http://localhost:8080/articles/1                    # ③ 再查已存在的 → 200
curl -i -X DELETE http://localhost:8080/articles/1          # ④ 删除 → 204，⑤ 再查 → 404
curl -i http://localhost:8080/articles/1                    # ⑤ 验证删干净
```

预期要点：

```text
① HTTP/1.1 404  {"status":404,"error":"Not Found","path":"/articles/1"}
② HTTP/1.1 201  {"id":1,"title":"Hello Spring","author":"小明"}
③ HTTP/1.1 200  {"id":1,"title":"Hello Spring","author":"小明"}
④ HTTP/1.1 204（删除成功，无正文）
⑤ HTTP/1.1 404（ArticleNotFoundException 又被翻译出来）
```

复盘：404 由异常类经 @ResponseStatus 自动翻译，201/204 由 @ResponseStatus 显式声明——**状态码如实表达资源语义**，与 HTTP 课的幂等表对齐（GET/DELETE 幂等可放心重试，POST 不幂等才要防重复提交）。

## 常见坑

1. **坑 1：包路径不对，Bean 扫不到**。现象：Controller 写完启动正常，访问却 404，日志毫无报错。原因：@ComponentScan 只扫启动类同包及子包，类放在包树外等于不存在。排查：确认所有 @RestController/@Service 在启动类包树下；拿不准就数启动日志里的 Bean 数量。
2. **坑 2：端口占用**。现象：启动即失败，报 `Port 8080 was already in use`。原因：8080 被旧进程或其他服务占着。排查：application.properties 写 `server.port=8081` 换端口，或先杀占用进程。
3. **坑 3：业务全塞 Controller**。现象：Controller 里出现 Map 数据、计算逻辑、if 判断堆成山。原因：图省事不分层。排查：Controller 只留「绑定参数、调 Service、回响应」；数据与规则下沉 @Service——下一篇换 Repository 时 Controller 一行不改才算合格。
4. **坑 4：字段注入 @Autowired**。现象：`@Autowired private ArticleService service;` 写在字段上。原因：老教程遗风。排查：改构造注入——字段能声明 final、依赖一目了然、测试可以直接 new，Spring 官方也推荐构造注入。
5. **坑 5：循环依赖**。现象：启动报 `The dependencies of some of the beans ... form a cycle`。原因：A 注入 B、B 又注入 A，容器转不起来。排查：抽第三个类放公共逻辑，或重新划分职责；别抄网上的 @Lazy 绕过术——那是把设计问题麻醉掉。
6. **坑 6：POST 的 JSON 解析失败**。现象：curl 正常、同事的客户端 400，日志出现 HttpMessageNotReadableException。原因：请求头漏 `Content-Type: application/json` 或 JSON 语法错（多余逗号、单引号）。排查：与 curl 能成功的请求逐头对比；Windows 终端注意 JSON 双引号转义。

## 小练习

1. 加列表接口 `GET /articles`（返回全部文章数组），curl 验证 200——想清楚 Service 加什么方法、Controller 怎么声明。
2. 把 POST 入参从 Map 换成 `record ArticleIn(String title, String author)`，体会 @RequestBody 绑定强类型的好处（字段名写错会怎样？）。
3. 写一个不启动 Spring 的纯单测：`new ArticleService()` 验证 create 后 get 能查到、delete 不存在的 id 抛 ArticleNotFoundException——体会构造注入的测试红利。
4. **综合任务**：加作者查询 `GET /articles/by-author?author=小明`（用 @RequestParam，对照 FastAPI 查询参数），Service 加过滤逻辑；curl 验证「存在作者返回数组、不存在返回空数组」两种情况，并画出 curl → Controller → Service 的调用图。
