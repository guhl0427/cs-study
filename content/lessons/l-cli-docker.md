---
id: l-cli-docker
slug: cli-docker
title: Docker：一次构建，处处一致
difficulty: 2
estMinutes: 80
tags: [Docker, 部署]
summary: 「我本地是好的」的终结者——镜像与容器的关系、Dockerfile 怎么写、Compose 一键起全套环境，跟着把一个真实站点装进容器。
updated: 2026-11-22
resources:
  - id: r-docker-doc
    title: Docker 官方入门
    url: https://docs.docker.com/get-started/
    type: doc
    difficulty: 2
    note: 官方 Get Started，本节平行阅读。
  - id: r-docker-compose
    title: Docker Compose 官方文档
    url: https://docs.docker.com/compose/
    type: doc
    difficulty: 2
    note: 多服务编排的权威参考。
---

> 一句话定义：镜像 = 应用 + 依赖 + 环境的只读打包件；容器 = 镜像跑起来的实例——**一次构建，处处一致**，「我本地是好的」从此成为历史。

## 概念讲解

**没有容器的世界**：新同事装环境装一天；本地能跑、服务器上版本不对就崩；三个项目抢同一个数据库端口。Docker 把「环境」本身变成代码——环境随仓库走，谁拉谁就能跑。

三个核心概念，一张图理清：

```text
Dockerfile（配方：一步步描述怎么搭建）
   │ docker build          ← 按配方制造
   ▼
镜像 Image（只读模板，分层叠成，可复用可缓存）
   │ docker run            ← 按模板启动
   ▼
容器 Container（镜像的运行实例，轻量到秒级启停，删了就没了）
   │ docker push / pull
   ▼
仓库 Registry（Docker Hub 存公共镜像，自建仓库存私有镜像）
```

**与虚拟机的差异一句话说清**：VM 模拟整套操作系统（GB 级、分钟级启动）；容器只隔离进程和文件系统，**共享宿主机内核**（MB 级、秒级启动）——所以叫「轻量级虚拟化」。

**Dockerfile 的核心指令**只有五个，读文件就是读「做菜的步骤」：

| 指令 | 干什么 | 类比 |
| ---- | ---- | ---- |
| `FROM` | 基于哪个现成镜像 | 选现成的半成品 |
| `COPY` / `ADD` | 把文件拷进镜像 | 放入食材 |
| `RUN` | 构建时执行命令（装依赖） | 烹饪步骤 |
| `EXPOSE` | 声明容器监听的端口 | 贴「出口在这里」标签 |
| `CMD` | 容器启动时跑什么 | 上桌的动作 |

**分层与缓存是效率关键**：Dockerfile 每条指令是一层，构建时**从第一条变化的层开始重建**、其后全部走缓存——所以「不常变的放前面，常变的放后面」（先 COPY 依赖清单装依赖，再 COPY 源码）：改一行代码不用重装依赖，几秒完成构建。

**Docker Compose**：一个 YAML 声明整套服务（应用 + MySQL + Redis），`docker compose up` 一键全起——本地起「全家桶环境」的标准姿势，告别「装个 MySQL 配半小时」。

## 代码示例

主线：把一个真实静态站点（本站的前身）装进容器，再体验三步走和 Compose：

**第 1 步：跑官方镜像，感受三件套**：

```bash
docker pull nginx                        # 拉镜像（分层下载，已存在的层秒过）
docker run -d -p 8080:80 --name web nginx # -d 后台跑；8080:80 = 宿主机 8080 → 容器 80
curl -I http://localhost:8080            # HTTP/1.1 200 OK——nginx 已在容器里服务
docker ps                                # 看运行中的容器（ID/镜像/端口/名字）
docker logs web                          # 看容器的输出
docker exec -it web sh                   # 钻进容器内部（exit 退出）
docker stop web && docker rm web         # 停止并删除（镜像仍在本地）
```

`-p 8080:80` 的端口映射值得停一秒：容器是隔离的小世界，外部访问要「宿主机端口 → 容器端口」的转发规则——这就是三个项目抢 3306 端口的解法（各自映射不同宿主机端口）。

**第 2 步：为自己的项目写 Dockerfile**：

```dockerfile
# Dockerfile：把本项目构建产物打包成镜像
FROM nginx:alpine            # 基于 nginx 的精简镜像（alpine ≈ 5MB）
COPY dist/ /usr/share/nginx/html/   # 把构建产物拷进 nginx 的服务目录
EXPOSE 80                    # 声明服务端口（文档作用）
CMD ["nginx", "-g", "daemon off;"]  # 前台启动 nginx（容器以它为主进程）
```

```bash
docker build -t cs-study-site .       # 按当前目录的 Dockerfile 构建并打标签
docker run -d -p 8080:80 cs-study-site
curl -I http://localhost:8080         # 你的站点跑在容器里了
```

**第 3 步：Compose 起整套本地环境**：

```yaml
# docker-compose.yml
services:
  web:
    build: .
    ports:
      - "8080:80"
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

```bash
docker compose up -d      # 一键：构建 web + 启动 redis，两个容器同一网络互通
docker compose down       # 一键全停（加 -v 连数据卷一起删）
```

## 进阶一课：容器之间的网络与数据卷

**容器互通**：Compose 启动的所有服务默认在同一个虚拟网络里，**用服务名当主机名**互相访问——这是「应用连数据库」不用记 IP 的原因：

```yaml
services:
  web:
    build: .
    environment:                       # 把数据库地址告诉应用
      - DATABASE_URL=mysql://root:pwd@db:3306/app   # 主机名就是服务名 db
  db:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=pwd
    volumes:                           # 数据持久化到卷
      - dbdata:/var/lib/mysql
volumes:
  dbdata:                              # 声明具名卷
```

应用代码里连接 `db:3306` 而不是 `localhost:3306`——「localhost 在容器里指容器自己」，新手最常踩的连接失败就来自这里。

**数据卷的生命周期**：`docker compose down` 删容器但卷还在（数据安全）；`down -v` 连卷一起删（数据清零）。判断口诀：**容器随便扔，卷才是家**。

**常用命令速查卡**：

```text
镜像   docker pull 名字 / images / rmi 名字 / history 名字（看分层）
容器   run -d -p 宿:容 --name / ps -a（含停止的）/ stop / start / rm
调试   logs --tail 50 -f（追日志）/ exec -it 容器 sh / inspect 容器（看配置）
清理   system prune（清停止容器+悬空镜像，谨慎）
Compose  up -d / down / logs -f / ps / restart 服务名
```

**镜像瘦身直觉**：选择 alpine 基础镜像（比完整版小 90%）、同层 RUN 合并（`RUN apt update && apt install ... && rm -rf /var/lib/apt/lists/*`）、.dockerignore 挡住无关文件——镜像小 = 拉取快 = 部署快，云环境的带宽都是钱。进阶玩法还有**多阶段构建**（构建层用完整 JDK、运行层只拷产物到精简 JRE），后端部署课会用到。

## 常见坑

1. **坑 1：容器删了数据就没了**。容器的文件系统随容器销毁——数据库这类有状态服务必须挂载**卷**（`-v dbdata:/var/lib/mysql`），数据存在容器外的卷里才安全。
2. **坑 2：容器里找不到程序就手装一个**。容器是一次性的——正确做法是把「装依赖」写进 Dockerfile 重新构建，而不是进容器手改（改完下次构建就没了）。
3. **坑 3：一个容器塞整个系统**。一个容器一个职责（Web 是 Web、DB 是 DB），用 Compose 编排组合——「巨石容器」失去了隔离与复用的全部好处。
4. **坑 4：COPY 全部文件**。把 `node_modules`、`.git`、`.env` 都拷进镜像——巨大且可能泄密。配 `.dockerignore`（语法同 .gitignore），只拷必要的。
5. **坑 5：端口映射反了**。`-p 8080:80` 是「宿主机:容器」——访问宿主机的 8080，容器里服务必须真监听 80；「curl 不通」先确认映射方向和服务端口是否一致。
6. **坑 6：Windows 下忘了启动 Docker Desktop**。命令全部报 `Cannot connect to the Docker daemon`——先启动 Docker Desktop 再敲命令。
7. **坑 7：容器里用 localhost 连别的容器**。localhost 指容器自己——容器之间用 Compose 的服务名当主机名（如 `db:3306`），或手动 `--network` 组网。

## 小练习

1. 跑通 nginx 三步走，改一个首页文件后重新构建，观察构建日志里的层缓存（没有变化的层直接 CACHED）。
2. 把 Dockerfile 的 `COPY dist/` 挪到第一条指令，改动一处重建，对比构建耗时——亲眼看缓存失效的代价。
3. 综合任务：为本站前端 dist/ 写 Dockerfile + .dockerignore，构建镜像并运行；再用 Compose 加一个 Redis 服务，两容器同时起。
4. 动手验证网络：起一个 web + 一个 redis（Compose），`docker exec -it <web容器> sh` 钻进去 ping redis——理解「服务名即主机名」。
5. 思考题：为什么把「COPY 依赖清单 + 装依赖」放在 Dockerfile 前部、「COPY 源码」放在最后？（提示：改代码的频率 vs 改依赖的频率。）
