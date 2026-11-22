---
id: l-java-maven
slug: java-maven
title: Maven 与项目构建
difficulty: 2
estMinutes: 75
tags: [Java, Maven, 构建, 依赖管理]
summary: 把 Maven 学成「Java 版 pnpm + scripts 二合一」：pom.xml 三段式、约定优于配置的目录结构、依赖传递的力量与风险、生命周期三命令与 ~/.m2 本地仓库；主线从 archetype 生成项目到加 Jackson 依赖、打包出可执行 jar，每步输出逐行解读。
updated: 2026-11-22
resources:
  - id: r-maven-guide
    title: Maven 官方入门指南
    url: https://maven.apache.org/guides/getting-started/
    type: doc
    difficulty: 2
    note: POM、生命周期、目录约定的权威出处。
  - id: r-maven-central
    title: Maven Central（中央仓库）
    url: https://central.sonatype.com/
    type: tool
    difficulty: 1
    note: 查依赖坐标与最新版本的地方，写 dependency 前先来核对。
  - id: r-maven-settings
    title: Maven · Settings Reference
    url: https://maven.apache.org/settings.html
    type: doc
    difficulty: 2
    note: settings.xml 全量配置参考，配国内镜像时对着查。
---

> 一句话定义：Maven 用一个 `pom.xml` 管**依赖与构建**——你只声明「要哪些库、什么版本」，下载、编译、测试、打包全自动，目录结构按约定摆放，工具全都认识。

## 概念讲解

### 为什么需要构建工具

手动编译单文件 `javac Demo.java` 还行，项目一大就崩溃：几十个文件谁先编译？第三方 jar 去哪下载、怎么告诉编译器（-classpath 手拼到怀疑人生）？测试怎么批量跑？交付物怎么打包？前端世界你早已见过答案——pnpm 管 package.json 里的依赖声明，scripts 里写统一命令。**Maven = Java 世界的 pnpm + scripts 二合一**，还额外把目录结构也标准化了。

### 对照表：Maven ↔ 前端工程化

| 概念 | 前端世界 | Java/Maven 世界 |
| ---- | ---- | ---- |
| 依赖清单 | package.json | pom.xml |
| 依赖坐标 | 包名 + 版本号 | groupId:artifactId:version（GAV 三段） |
| 版本锁 | pnpm-lock.yaml | 无锁文件，靠固定 release 版本号（避开 SNAPSHOT） |
| 依赖仓库 | npm registry | Maven Central（国内常配阿里镜像） |
| 安装位置 | node_modules（每项目一份） | ~/.m2/repository（用户级全局缓存） |
| 统一命令 | pnpm install / dev / build | mvn compile / test / package |
| 构建产物 | dist/ | target/（进 .gitignore，永不提交） |

最大差异在**依赖安装位置**：node_modules 在每个项目里复制一份；Maven 把 jar 统一缓存在用户目录 `~/.m2/repository`，项目里只有 pom 声明——十几个项目用同一个 Jackson，磁盘上只有一份。副作用：没有 lock 文件，靠「用固定 release 版本」保证团队一致（Central 上的 release 版本内容不可变）。

### pom.xml 核心三段：坐标、依赖、插件

```xml
<project>
  <!-- ① 坐标：这个项目自己是谁 -->
  <groupId>com.example</groupId>        <!-- 组织/个人反向域名 -->
  <artifactId>my-app</artifactId>       <!-- 项目名 -->
  <version>1.0.0</version>              <!-- 版本：生产别用 SNAPSHOT -->
  <!-- ② 依赖：这个项目要什么 -->
  <dependencies>
    <dependency>
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.0</version>
    </dependency>
  </dependencies>
  <!-- ③ 插件：构建过程怎么定制（起步阶段基本不用改） -->
  <build><plugins>...</plugins></build>
</project>
```

**坐标（GAV）**是全球唯一地址：Maven Central 上亿级构件，靠这三段精确定位。你在 central.sonatype.com 搜到的每个库都印着这三行——**写依赖前先去查坐标和最新版本**，别凭记忆手打。依赖段是声明核心；插件段定制构建行为（编译版本、打可执行 jar），主线会用到一个。

### 约定优于配置：目录即协议

```text
my-app/
├── pom.xml                  唯一的配置入口
├── src/main/java/           生产代码（包路径=目录路径：com/example/demo → com.example.demo）
├── src/main/resources/      配置文件（application.properties 会打进 jar）
├── src/test/java/           测试代码（JUnit）
└── target/                  构建产物（.class、jar），可随时删、可重建
```

不配置「源码在哪、测试在哪、产物放哪」——大家都这么放，IDE、CI、其他工具全都认识，与 vite 默认找 index.html 和 src/ 是同一思想。代价是「不按约定放就找不到」：把 Java 文件放项目根目录，Maven 会当它不存在。

### 依赖传递：声明一个，带来一串

你声明 spring-boot-starter-web 一个依赖，Maven 自动把 Spring MVC、内嵌 Tomcat、Jackson 等几十个 jar 一起解析下载——与 pnpm 的依赖树同概念。力量：一个 starter 顶一串（Spring Boot 课变现）；风险：**版本冲突**——A 依赖 Jackson 2.15、B 依赖 2.17 时 Maven 按「最近优先」选一个，选错运行时才炸 NoSuchMethodError，排查用 `mvn dependency:tree`。

| 命令 | 干什么 | 对应前端直觉 |
| ---- | ---- | ---- |
| mvn compile | 编译 main 到 target/classes | tsc 编译 |
| mvn test | 编译并运行 src/test 的 JUnit 测试 | pnpm test |
| mvn package | 打包到 target/（jar/war） | pnpm build |
| mvn clean | 清空 target/ | rm -rf dist |

关键机制：**生命周期是链式的**——`mvn package` 会自动先跑 validate → compile → test 再打包，后面阶段自带前面全部，所以日常几乎只敲 `mvn package`（想跳过测试加 `-DskipTests`，交付前别跳）。`mvn clean` 属于另一条 clean 生命周期，所以要手动连用 `mvn clean package`。

### archetype 与国内镜像

`mvn archetype:generate` 是官方脚手架（对应 create-vite）：选模板（archetype）、填 groupId/artifactId，生成符合约定的项目骨架。速度问题：默认从国外 Central 拉依赖，国内常超时——解法是在 `~/.m2/settings.xml` 配**阿里云镜像**（mirrorOf central），速度差一个数量级。settings.xml 是 Maven 的全局配置（不属于任何项目），管镜像、代理、私有仓库凭据。

## 代码示例

主线任务：从 archetype 生成项目 → 配置 JDK 版本 → 加 Jackson 依赖 → 写 JSON 转换 main → `mvn package` 打出**可执行 jar** 并运行，每步输出逐行解读，全程约 25 分钟。

### 第 0 步：确认环境

```bash
mvn -v
```

预期输出（节选）：`Apache Maven 3.9.x` + `Java version: 17.0.x, vendor: ...`。判读：`Java version` 行是 **Maven 实际使用的 JDK**（≥ 17 为宜）——它与 `java -version` 显示不一致，是「PATH 里串了多个 JDK」的经典病。

### 第 1 步：archetype 生成项目

```bash
mvn archetype:generate \
  -DgroupId=com.example \
  -DartifactId=my-app \
  -DarchetypeArtifactId=maven-archetype-quickstart \
  -DarchetypeVersion=1.4 \
  -DinteractiveMode=false
cd my-app
```

首次运行会下载 archetype 插件，结尾出现 `[INFO] BUILD SUCCESS`——所有 Maven 命令成败都看这一行，失败时往上翻 `[ERROR]`。生成的 App.java 有一个打印 Hello World 的 main，`AppTest.java` 是 JUnit 骨架测试，目录正是概念篇那张约定树。

### 第 2 步：改造 pom.xml

在 `<properties>` 里声明 JDK 版本，`<dependencies>` 里追加 Jackson，`<build>` 里配置 shade 插件：

```xml
<properties>
  <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  <maven.compiler.release>17</maven.compiler.release>   <!-- 声明目标 JDK 版本 -->
</properties>

<dependencies>
  <dependency>                                           <!-- JSON 解析，第 3 步要用 -->
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.0</version>
  </dependency>
</dependencies>

<build>
  <plugins>
    <!-- shade：把依赖合并进最终 jar 并写入 Main-Class（打可执行 jar） -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-shade-plugin</artifactId>
      <version>3.5.1</version>
      <executions>
        <execution>
          <phase>package</phase>
          <goals><goal>shade</goal></goals>
          <configuration>
            <transformers>
              <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                <mainClass>com.example.App</mainClass>
              </transformer>
            </transformers>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>
```

三处解读：`maven.compiler.release=17` 让编译目标与 JDK 匹配（治「老教程 1.8」病）；junit 依赖是 quickstart 自带的（`scope=test` 只参与测试不参与交付）；shade 在 package 阶段把依赖 jar 解开合并进最终产物并写入 Main-Class——不加它，`java -jar` 会报 no main manifest attribute（见坑 4）。

### 第 3 步：写 JSON 转换 main
覆盖 `src/main/java/com/example/App.java`（Jackson 的 ObjectMapper，等价 Python 的 json.dumps/loads）：

```java
package com.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.HashMap;
import java.util.Map;

public class App {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();      // Jackson 核心：对象 ↔ JSON
        Map<String, Object> student = new HashMap<>();
        student.put("name", "小明");
        student.put("score", 92);

        String json = mapper.writeValueAsString(student);          // 对象 → JSON（json.dumps）
        System.out.println("序列化: " + json);

        Map<String, Object> parsed = mapper.readValue(json, Map.class);   // JSON → 对象（json.loads）
        System.out.println("反序列化: name=" + parsed.get("name")
                + "，分数+8=" + (Integer) parsed.get("score") + 8);
    }
}
```

### 第 4 步：编译，看依赖怎么进来

```bash
mvn compile
```

预期输出要点（首次会拉一串下载）：

```text
[INFO] Downloading from central: https://repo.maven.apache.org/.../jackson-databind/2.17.0/...
[INFO] Downloaded ...jackson-core-2.17.0.jar        ← 传递依赖跟着一起到
[INFO] BUILD SUCCESS
```

判读：声明 jackson-databind 一个依赖，core/annotations 等**传递依赖**自动到位（依赖传递第一次显形）；jar 落在 `~/.m2/repository/com/fasterxml/...`——去目录看一眼，本地仓库就具象化了。第二次编译不再下载：缓存命中，与 pnpm store 同理。

### 第 5 步：跑测试

```bash
mvn test
```

预期输出要点：

```text
[INFO] --- surefire:3.x:test (default-test)
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0
```

判读：surefire 插件执行 src/test 全部测试，`Tests run: 1, Failures: 0` 是最小测试报告——项目大了几百个用例也看这一行汇总。

### 第 6 步：打包并运行 jar

```bash
mvn package
```

预期输出要点：

```text
[INFO] --- jar:3.x:jar (default-jar)
[INFO] Building jar: ...\my-app\target\my-app-1.0-SNAPSHOT.jar
[INFO] --- shade:3.5.1:shade (default)              ← shade 在 package 阶段介入
[INFO] BUILD SUCCESS
```

运行（注意链式生命周期：package 已自动跑过 compile 和 test）：

```bash
java -jar target/my-app-1.0-SNAPSHOT.jar
```

预期输出：

```text
序列化: {"name":"小明","score":92}
反序列化: name=小明，分数+8=100
```

判读：jar 是 zip 格式的字节码+资源集合，`java -jar` 按 MANIFEST.MF 里的 Main-Class 找入口（shade 写进去的）。target/ 里同时有 original-*.jar（不含依赖的原件）与 shaded jar（交付件）——部署只拿后者，「一个 jar 扔到任何装了 JVM 的服务器就能跑」，这就是 Java 应用的工业化交付形态。

## 常见坑

1. **坑 1：JDK 与编译版本不匹配**。现象：编译报 invalid target release: 17，或新语法报错。原因：pom 没写 maven.compiler.release，或 mvn -v 显示的 JDK 不是你装的。排查：pom 显式声明 release；核对 `mvn -v` 的 Java version 行与 PATH。
2. **坑 2：国内拉依赖超时/超慢**。现象：Downloading from central 卡在几十 KB/s。原因：默认直连国外仓库。排查：`~/.m2/settings.xml` 配阿里云镜像（mirrorOf central）；配完 `mvn -U` 强制刷新重试。
3. **坑 3：SNAPSHOT 依赖**。现象：昨天还能构建，今天拉下来行为变了。原因：1.0-SNAPSHOT 是「漂移中的开发版」，每次构建可能拿到不同快照。排查：生产依赖一律固定 release 版本号；自己发版也不交付 SNAPSHOT。
4. **坑 4：no main manifest attribute**。现象：`java -jar xxx.jar` 起不来。原因：普通 jar 插件默认不写 Main-Class，也不含依赖 jar。排查：配 shade（或 maven-jar-plugin 的 manifest mainClass）再 package；确认运行的是 shaded jar 而不是 original-*.jar。
5. **坑 5：改了 pom IDE 不刷新**。现象：IDEA 里 import 一片红「找不到符号」，命令行 mvn compile 却成功。原因：IDE 的依赖索引停在旧 pom。排查：点 Maven 面板 Reload All Maven Projects，或命令行 mvn compile 强制同步。
6. **坑 6：版本冲突运行时才炸**。现象：NoSuchMethodError/NoClassDefFoundError，编译却通过。原因：依赖传递把同一库两个版本带进来，Maven「最近优先」选错了。排查：`mvn dependency:tree | grep 冲突库名` 找引入路径，用 `<exclusions>` 排除或 `<dependencyManagement>` 统一版本。

## 小练习

1. 给项目加 commons-lang3 依赖，用 `StringUtils.reverse("SpringBoot")` 验证「声明即拥有」；再把版本号改成不存在的（如 9.9.9），读懂报错信息。
2. 跑 `mvn dependency:tree`，找出 jackson-databind 的直接子依赖（core/annotations），画出两层树状图。
3. 分别执行 `mvn package` 与 `mvn clean package`，对比 target/ 目录差异；再执行 `mvn package -DskipTests`，想清楚什么场景能跳、什么场景绝对不能跳。
4. **综合任务**：把上一篇的 StudentManager（Student/GraduateStudent/主程序）搬进本项目（`src/main/java/com/example/stu/` 下建类，包名与目录对应），用 Jackson 实现「学生列表导出为 JSON 字符串」，mvn package 后 java -jar 跑通——得到一个可交付的学生管理 jar。
