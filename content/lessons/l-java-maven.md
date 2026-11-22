---
id: l-java-maven
slug: java-maven
title: Maven 与项目构建
difficulty: 2
estMinutes: 35
tags: [Java, Maven, 构建]
summary: Maven 是 Java 世界的「pnpm + 脚本」二合一：pom.xml 声明依赖，约定优于配置——目录结构和命令全省得背。
updated: 2026-11-22
resources:
  - id: r-maven-doc
    title: Maven 官方入门指南
    url: https://maven.apache.org/guides/getting-started/
    type: doc
    difficulty: 2
    note: POM 与生命周期的权威说明。
  - id: r-mvn-repo
    title: Maven Central（中央仓库）
    url: https://central.sonatype.com/
    type: tool
    difficulty: 1
    note: 查依赖坐标与最新版本的地方。
---

> 一句话定义：Maven 用一个 `pom.xml` 管理**依赖与构建**——你声明「要哪些库、什么版本」，下载、编译、测试、打包全自动，且目录结构全省得记。

## 概念讲解

对照已学的包管理（呼应前端工程化一课）：

| 概念 | 前端世界 | Java/Maven 世界 |
| ---- | ---- | ---- |
| 依赖清单 | package.json | pom.xml |
| 版本锁 | pnpm-lock.yaml | 无锁文件，靠固定版本号（SNAPSHOT 要避开） |
| 仓库 | npm registry | Maven Central / 阿里镜像 |
| 统一命令入口 | pnpm run dev | mvn compile / test / package |

pom.xml 的核心三段：**坐标**（groupId+artifactId+version，全球唯一定位一个包）、**依赖**（`<dependencies>` 列出要用的库）、**构建插件**（起步阶段基本不用改）。

Maven 的灵魂是**约定优于配置**：项目结构固定——

```text
my-app/
├── pom.xml
├── src/main/java/     你的生产代码（包路径=目录路径）
├── src/main/resources 配置文件（application.properties）
└── src/test/java/     测试代码（呼应软件工程的 pytest/JUnit）
```

不用配置「源码在哪、测试在哪、编译产物放哪」——大家都这么放，工具就都认识。三条命令覆盖日常：`mvn compile`（编译）、`mvn test`（跑测试）、`mvn package`（打出 jar 包，在 target/ 下）。

**依赖传递**是 Maven 的隐藏力量：你只声明 Spring Boot 一个依赖，它带进来的几十个子依赖自动到位——和 pnpm 的依赖树同一个概念。

## 代码示例

从 archetype 生成到跑通构建（需要本机装 JDK 17+ 和 Maven）：

```bash
mvn archetype:generate -DgroupId=com.example -DartifactId=my-app \
  -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false

cd my-app
mvn compile        # 首次会下载大量依赖（jar 进 ~/.m2 本地仓库）
mvn test           # 跑 src/test 里的 JUnit 测试
mvn package        # target/my-app-1.0-SNAPSHOT.jar
```

往 pom.xml 加一个真实依赖（JSON 解析）：

```xml
<dependencies>
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.0</version>
  </dependency>
</dependencies>
```

```bash
mvn compile        # Jackson 及其传递依赖自动下载就位
```

在代码里 `import com.fasterxml.jackson.databind.ObjectMapper;` 即可直接用——「声明即拥有」。

## 常见坑

1. **坑 1：JDK 与 Maven 版本不匹配**。老教程常见 `java.version=1.8`，配 JDK 17 编译直接报错——pom 里显式声明 `maven.compiler.release`（如 17），并确认 `mvn -v` 显示的 JDK 正确。
2. **坑 2：国内拉依赖超慢**。默认从国外中央仓库下载——在 `~/.m2/settings.xml` 配阿里云镜像（mirrorOf central），速度差一个数量级。
3. **坑 3：SNAPSHOT 版本依赖**。`1.0-SNAPSHOT` 表示「漂移中的开发版」，每次构建可能拿到不同代码——生产依赖永远用固定 release 版本。
4. **坑 4：改了 pom 不刷新**。IDE 里加了依赖没 reload Maven 项目，import 红线一片——IDEA 里点 Maven 面板的刷新（或 `mvn compile` 强制同步）。

## 小练习

1. 用 archetype 生成项目，把 jackson 依赖加进 pom，写一个 `Map` 转 JSON 字符串再转回来的小 main。
2. 把 `mvn compile` 的输出里「Downloading from central」部分找出来，理解「依赖从哪来」。
3. 思考题：Maven 没有像 pnpm-lock.yaml 的锁文件，团队怎么保证依赖一致？这个设计差异带来了什么问题？
