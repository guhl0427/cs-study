---
id: l-swe-cicd
slug: cicd
title: CI/CD 入门：GitHub Actions
difficulty: 2
estMinutes: 40
tags: [CI, DevOps]
summary: 每次 push 自动跑测试和构建——把「忘了跑测试」「上线手抖」这类人为失误交给机器人。
updated: 2026-11-22
resources:
  - id: r-actions-doc
    title: GitHub Actions 官方文档
    url: https://docs.github.com/zh/actions
    type: doc
    difficulty: 2
    note: 概念速览与语法权威来源，本节 workflow 逐字符合法可直接用。
  - id: r-actions-marketplace
    title: GitHub Actions Marketplace
    url: https://github.com/marketplace?type=actions
    type: tool
    difficulty: 1
    note: actions/checkout、setup-node 这些现成动作都在这里找。
---

> 一句话定义：CI 是每次 push 机器人自动「拉代码、装依赖、跑测试」，CD 再往前一步自动发布——把重复验证交给机器。

## 概念讲解

没有 CI 的团队靠自觉：有人忘了跑测试，主干就红了。CI（持续集成）把验证变成事件——**push 触发，机器执行，结果广播**；CD（持续部署）再加一环：测试全绿，自动发布上线。

GitHub Actions 里，一条自动化流程叫 **workflow**，存进仓库的 `.github/workflows/*.yml`。三层数据结构：

| 层 | 含义 | 本节示例对应 |
| ---- | ---- | ---- |
| on | 什么事件触发 | push 到 main、收到任何 PR |
| jobs | 在什么机器上跑哪几组任务 | job: test（ubuntu 虚拟机） |
| steps | 一步一个动作 | checkout → 装 Node → 装依赖 → 测试 |

steps 里 `uses:` 用的是别人写好的现成动作（Marketplace 里找），`run:` 是自己敲 shell 命令。运行结果在仓库顶部的 **Actions 标签页**看：一次运行一个绿勾/红叉，点进去每个 step 都有完整日志。

密钥（token、密码）一律放仓库的 **Settings → Secrets and variables → Actions**，workflow 里用 `${{ secrets.名字 }}` 引用——GitHub 注入时日志自动打码。明文写进 YAML 等于把家门钥匙贴在门上。

## 代码示例

一个 Node.js 项目可以直接用的 workflow（存为 `.github/workflows/ci.yml`）：

```yaml
name: CI

on:                    # 触发器：push 到 main，或收到任何 PR
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest     # GitHub 免费提供的 Linux 虚拟机
    steps:
      - uses: actions/checkout@v4    # 1. 拉取仓库代码
      - uses: actions/setup-node@v4  # 2. 安装 Node 20
        with:
          node-version: 20
          cache: npm                 # 缓存依赖，二次运行更快
      - run: npm ci                  # 3. 严格按 lockfile 装依赖
      - run: npm test                # 4. 跑测试，失败则整次运行标红
```

需要部署时，密钥这样接（绝不明文）：

```yaml
      - run: npm run deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}   # 从 Settings → Secrets 注入
```

排查失败的姿势：进 Actions → 点开红叉的那次运行 → **从左往右找第一个红叉的 step**，它的日志就是故障现场：

```text
✓ checkout   ✓ setup-node   ✓ npm ci   ✗ npm test
                                       第一个红叉从这里开始查，别猜前面的步骤
```

## 常见坑

1. **坑 1：CI 里用 `npm install`**。它会随手升级小版本，本地和 CI 装出的依赖可能不一致，「我本地明明是好的」。对策：CI 一律 `npm ci`，严格按 lockfile 装。
2. **坑 2：密钥明文写进 YAML 或代码**。事后删除提交也没用，历史里仍能翻到，爬虫专扫这类泄漏。对策：改用 secrets，并立刻作废已泄露的 key。
3. **坑 3：红了只会重跑**。同一份代码重跑还是红（偶发失败另说）。对策：先看第一个红叉 step 的日志，报错信息几乎总写着答案。

## 小练习

1. 给你任意一个带测试的仓库加上本节 workflow，push 后到 Actions 页看它跑起来。
2. 故意写一个会失败的断言 push 上去，练习「找第一个红叉 step」并截图定位原因。
3. 思考题：为什么 CI 每次都从零 checkout、重新装依赖，而不是复用上次的磁盘？（提示：可重复性）
