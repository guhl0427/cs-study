---
id: l-spring-boot
slug: spring-boot
title: Spring Boot 起步：依赖注入与 Web 接口
difficulty: 2
estMinutes: 45
tags: [Spring Boot, Java, 后端]
summary: Spring Boot 把「配置地狱」变成开箱即用——依赖注入管对象组装，注解声明路由，一个 main 方法起一个完整 Web 服务。
updated: 2026-11-22
resources:
  - id: r-spring-guide
    title: Spring 官方指南 · Building an Application with Spring Boot
    url: https://spring.io/guides/gs/spring-boot
    type: doc
    difficulty: 2
    note: 官方第一篇指南，与本节骨架一致。
  - id: r-spring-initializr
    title: Spring Initializr
    url: https://start.spring.io/
    type: tool
    difficulty: 1
    note: 网页里勾选依赖生成项目骨架，起步必备。
---

> 一句话定义：Spring Boot 是 Java 后端的事实标准框架——**依赖注入**替你组装对象、**注解路由**声明接口、内嵌服务器一条命令启动，把精力留给业务。

## 概念讲解

**依赖注入（DI）**是 Spring 的核心思想，先用一个反例理解它解决什么：

```java
// 没有框架：每个类自己 new 依赖，牵一发动全身
class ArticleService {
    private ArticleRepository repo = new ArticleRepository();  // 写死了
}
```

想换数据库实现就得改 ArticleService 源码；十几个类互相 new，装配关系散落各处。Spring 的做法反过来——**你只声明「我需要什么」，不声明「它从哪来」**：

```java
@Service
class ArticleService {
    private final ArticleRepository repo;      // 只声明需要
    ArticleService(ArticleRepository repo) {   // Spring 自动把实现「注入」进来
        this.repo = repo;
    }
}
```

对象由 Spring 容器统一创建和管理（这些被管理的对象叫 **Bean**），装配关系在启动时一次性接好。好处：换实现只改一处注册、单测时轻松塞入假实现（呼应软件工程测试一课）。

**Web 接口**部分和 FastAPI/GoGin 是同一套思想（REST 概念全复用），只是表达换成注解：

| 注解 | 对应 FastAPI 概念 |
| ---- | ---- |
| `@RestController` | 「这个类是接口集」 |
| `@GetMapping("/articles/{id}")` | `@app.get("/articles/{id}")` |
| `@PathVariable Long id` | 路径参数（类型自动转换） |
| `@RequestBody ArticleIn in` | 请求体绑定 |

**约定优先 + 自动配置**是 Boot 的第三块积木：`spring-boot-starter-web` 一个依赖把 HTTP 服务器、JSON 序列化全套带齐——这就是 Maven 依赖传递的威力。

## 代码示例

从 Initializr 生成到第一个接口（勾选 Spring Web）：

```java
// DemoApplication.java —— 应用入口
@SpringBootApplication          // 三合一：自动配置 + 组件扫描 + 启动器
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

```java
// ArticleController.java —— REST 接口
package com.example.demo;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
public class ArticleController {
    private final Map<Long, Map<String, Object>> db = new ConcurrentHashMap<>();

    @GetMapping("/articles/{id}")
    public Map<String, Object> get(@PathVariable Long id) {
        Map<String, Object> article = db.get(id);
        if (article == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "文章不存在");
        return article;
    }

    @PostMapping("/articles")
    @ResponseStatus(HttpStatus.CREATED)                          // 201
    public Map<String, Object> create(@RequestBody Map<String, Object> in) {
        long id = db.size() + 1L;
        in.put("id", id);
        db.put(id, in);
        return in;
    }
}
```

```bash
./mvnw spring-boot:run                     # 内嵌 Tomcat 启动，默认 8080
curl http://localhost:8080/articles/1      # 404 {"status":404,...}
curl -X POST http://localhost:8080/articles \
  -H "Content-Type: application/json" -d '{"title":"Hello Spring"}'   # {"title":"Hello Spring","id":1}
```

## 常见坑

1. **坑 1：包路径不对，Bean 扫不到**。`@SpringBootApplication` 只扫描**同包及子包**——Controller 放到别的包路径下，404 还毫无报错。保持所有组件在启动类包树下。
2. **坑 2：端口占用**。8080 被占启动即炸——`server.port=8081` 改配置，或先找占用进程。
3. **坑 3：把业务都塞 Controller**。Controller 只做「接请求、调服务、回响应」；逻辑进 `@Service`，数据进 Repository——对照 FastAPI 实战课的分层。
4. **坑 4：循环依赖报错**。A 注入 B、B 又注入 A，启动直接失败——通常说明职责划分有问题，抽第三个类；而不是抄「@Lazy 绕过」。

## 小练习

1. 给 Controller 加 `DELETE /articles/{id}`（404 时抛 NOT_FOUND），用 curl 验证三种状态码。
2. 把 Map 伪数据换成 `@Service` 的 ArticleService，Controller 只调服务——体会注入后「Controller 不再知道数据从哪来」。
3. 思考题：对照 FastAPI 的 Depends——依赖注入在两个框架里各自如何帮「单测塞假实现」？
