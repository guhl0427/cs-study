---
id: l-cli-docker
slug: docker-intro
title: Docker 初步：为什么大家都在用容器
difficulty: 2
estMinutes: 30
tags: [Docker, 部署]
summary: 「在我电脑上是好的」的终结者——容器把应用和它的全部依赖打包成一个标准件，任何机器跑起来都一样。
updated: 2026-11-22
resources:
  - id: r-docker-get
    title: Docker 官方入门教程
    url: https://docs.docker.com/get-started/
    type: doc
    difficulty: 2
    note: Part 1–2 覆盖本节内容，动手跑一遍。
  - id: r-docker-compose
    title: Docker Compose 文档
    url: https://docs.docker.com/compose/
    type: doc
    difficulty: 2
    note: 一键起「应用 + 数据库 + 缓存」整套环境。
---

> 一句话定义：镜像 = 应用 + 依赖 + 环境的只读打包件；容器 = 镜像跑起来的实例——一次构建，处处一致。

## 概念讲解

没有容器的世界：新同事装环境装一天；本地能跑、服务器上版本不对就崩。Docker 把「环境」本身变成代码：

- **镜像（Image）**：由 Dockerfile 描述的只读模板，分层层叠构建，可复用可缓存；
- **容器（Container）**：镜像的运行实例，轻量到秒级启停；
- **仓库（Registry）**：Docker Hub 存公共镜像，自建仓库存私有镜像。

与「虚拟机」的差异一句话说清：VM 模拟整套操作系统（GB 级、分钟级启动），容器只隔离进程和文件系统（共享宿主机内核，MB 级、秒级启动）。

入门阶段只需要记住三个动作：`pull` 拉镜像 → `run` 起容器 → `ps/logs/exec` 检查。真正的工程价值在 **Docker Compose**：一个 YAML 声明整套服务（应用 + MySQL + Redis），一条命令全起。

## 代码示例

用官方 Nginx 镜像感受三步走，再为一个静态站点写 Dockerfile：

```bash
docker pull nginx
docker run -d -p 8080:80 --name web nginx    # 宿主机 8080 → 容器 80
curl -I http://localhost:8080                 # 看到nginx 就绪
docker ps                                     # 运行中的容器
docker logs web                               # 容器日志
docker exec -it web sh                        # 钻进容器内部
docker stop web && docker rm web              # 停止并删除（镜像仍在）
```

```dockerfile
# Dockerfile：把本项目静态产物打包成镜像
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

```bash
docker build -t cs-study-site .
docker run -d -p 8080:80 cs-study-site        # 本站跑在容器里了
```

## 常见坑

1. **坑 1：容器删了数据就没了**。容器的文件系统随容器销毁——数据库这类有状态服务必须挂载**卷**（`-v dbdata:/var/lib/mysql`）。
2. **坑 2：容器里找不到程序就装一个**。容器是一次性的——正确做法是把「装依赖」写进 Dockerfile 重新构建，而不是进容器手改。
3. **坑 3：一个容器塞整个系统**。一个容器一个职责（Web 是 Web、DB 是 DB），用 Compose 编排组合，别造「巨石容器」。

## 小练习

1. 跑通 Nginx 三步走，并修改首页文件后重建镜像观察变化。
2. 写一个 Compose 文件：同时启动本站镜像和一个 Redis，`docker compose up` 一键起。
3. 思考题：为什么把 `COPY dist/` 放在 Dockerfile 末尾、`FROM` 放最前？（提示：构建层缓存。）
