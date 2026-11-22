---
id: l-swe-cicd
slug: cicd
title: CI/CD 入门：GitHub Actions
difficulty: 2
estMinutes: 80
tags: [CI, DevOps]
summary: 每次 push 机器人自动拉代码、跑测试、构建发布——把「忘了跑测试」「上线手抖」这类人为失误交给机器，跟着给 Node 项目搭一条完整流水线并学会按日志诊断失败。
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

> 一句话定义：CI 是每次 push 机器人自动「拉代码、装依赖、跑测试」，CD 再往前一步自动交付/部署——把重复验证交给机器，把人从「记得跑测试」里解放出来。

## 概念讲解

**为什么手动流程必出事？** 上线一次的人肉步骤清单：拉最新代码 → 装依赖 → 跑测试 → 构建 → 停旧服务 → 换新包 → 起新服务 → 冒烟验证。八个步骤，只要有一个人在某一步忘了、顺序错了、赶时间跳了，事故就上线。这不是「人不细心」，是**流程把可靠性押在每个人当时的状态上**：周五晚上、连轴加班、刚吵完架——任何一次都可能漏。CI/CD 的核心思想就一句话：**把人肉步骤清单变成机器执行的脚本——机器不会忘、不会累、每一次都一模一样**。

**类比**：CI 是工厂流水线末端的自动质检机——不管这件产品是谁装的、几点装的，每件都过一遍检，不合格不往下走；CD 是「质检合格自动装箱发货」。人肉部署则是「老师傅目测」：大多时候没事，漏检的那件刚好卖给了最重要的客户。

**CI 与 CD 的分界**——CD 有两种理解，对应三级自动化程度：

| 阶段 | 全称 | 机器做什么 | 人做什么 |
| ---- | ---- | ---- | ---- |
| CI | 持续集成 | 每次 push 自动构建 + 跑测试，坏了立刻通知 | 看红绿，红了去修 |
| 持续交付 | Continuous Delivery | 全绿后自动打包出「随时可发布」的产物 | 点一下按钮发布 |
| 持续部署 | Continuous Deployment | 连按钮都省了，全绿自动上线 | 只看监控和告警 |

日常口语里的 CD 多数指持续交付：**自动化到「万事俱备」，最后一步发射按钮留给人**。团队对全自动上线的信心要慢慢攒，先交付、再部署，是正常的成长路径。

**GitHub Actions 的角色地图**：一条自动化流程叫 **workflow**，以 YAML 文件存进仓库的 `.github/workflows/*.yml`（放对目录才会被识别）。结果在仓库顶部的 **Actions 标签页**看：一次 push 一次运行，绿勾或红叉，点进去每个 step 都有完整日志。

**workflow YAML 三层结构全景**：

```text
name: CI                          ← 流程名（Actions 页显示）
on:   ……                          ← 第一层：什么事件触发
      push / pull_request / schedule / workflow_dispatch
jobs:                             ← 第二层：哪几组任务（默认并行）
  verify:   runs-on + steps
  deploy:   needs: verify        ← needs 声明依赖，排成先后
        steps:                   ← 第三层：一步步动作（严格顺序）
          uses: 现成动作   run: shell 命令   env: 环境变量
```

**第一层：`on` 触发器**——什么事件触发运行。常用触发器矩阵：

| 触发器 | 写法 | 典型用途 |
| ---- | ---- | ---- |
| push 到指定分支 | `push: { branches: [main] }` | main 的每次提交都验证 |
| 任何 PR | `pull_request:` | 评审门：每个 PR 都被自动检查 |
| 定时 | `schedule: [{ cron: "0 2 * * *" }]` | 每晚回归、依赖安全扫描 |
| 手动 | `workflow_dispatch` | 供人点按钮触发的部署 |

PR 触发器值得单独强调：它让评审时看到的「CI 绿勾」有据可查。配合**分支保护规则**可以要求所有 PR 必须过 CI 才准合并——质量门从口头约定变成技术强制。

**第二层：`jobs`**——每个 job 跑在一台**全新分配的虚拟机**上（`runs-on: ubuntu-latest`），跑完即焚；多个 job 默认**并行**，需要先后时用 `needs:` 声明依赖：

```yaml
jobs:
  lint:                    # job 1：静态检查
    runs-on: ubuntu-latest
    steps: [...]           # 省略
  test:                    # job 2
    needs: lint            # 等 lint 绿了才开始
    runs-on: ubuntu-latest
    steps: [...]
```

并行省时间，`needs` 保顺序：互不依赖就并行跑；部署 job 永远 `needs: test`——没验证过的代码不许碰生产环境。

**第三层：`steps`**——job 内按顺序执行的动作，两种写法：`uses:` 复用现成动作（Marketplace 里找，如 actions/checkout），`run:` 执行自己的 shell 命令。steps **严格顺序执行，前一步失败则后面全部跳过、整个 job 标红**——这就是「先装依赖再测试」必须排对的原因。

**secrets：密钥绝不进代码**。token、密码一律放仓库 **Settings → Secrets and variables → Actions**，workflow 里用 `${{ secrets.名字 }}` 引用，GitHub 注入时日志自动打码成 `***`。明文写进 YAML 等于把家门钥匙贴在门上，而且 git 历史不可变——事后删除那次提交，历史里仍能翻到，公开仓库的爬虫分钟级扫描这类泄漏。万一泄了：**先作废 key，再清理代码**，顺序别反。

**badge 与分支保护**——让流程长在门上，而不是贴在墙上：

- **badge（徽章）**：README 顶部贴一行 CI 状态图（Actions 页面右侧 Create status badge 拿链接），访客第一眼看到「主干是绿的」——开源项目的信用凭证；
- **分支保护规则**（Settings → Branches → Add rule）：给 main 加锁，例如「需要 1 个 approve」「必须指定检查（CI）通过」「禁止 force push」。从此直接 push main 在技术上不可能，而不是靠自觉。

**失败排查法：看第一个红 step**。整次运行红叉时，别猜、别急着重跑、别从头看——**从左往右找第一个红叉的 step**，它的日志就是故障现场。steps 失败即断，后面的步骤全是被它连累跳过的，凶手只能是第一个红的那步：

```text
✓ checkout   ✓ setup-node   ✓ npm ci   ✗ npm test   ⫻ build（跳过）
                                          ↑
                          第一个红叉从这里开始查，报错几乎总写着答案
```

## 代码示例

主线：给一个 Node.js 项目搭一条**完整可用的流水线**：拉代码 → 装 Node（带缓存）→ lint → test → build。文件存为 `.github/workflows/ci.yml`，push 即生效：

```yaml
name: CI

on:                          # ── 第一层：触发器 ──
  push:
    branches: [main]         # main 的每次 push 都跑
  pull_request:              # 任何 PR 都跑（评审门）

jobs:                        # ── 第二层：任务 ──
  verify:
    runs-on: ubuntu-latest   # GitHub 免费提供的全新 Linux 虚拟机
    steps:                   # ── 第三层：步骤（严格顺序）──
      - uses: actions/checkout@v4        # 1. 拉取仓库代码（空机器第一步）
      - uses: actions/setup-node@v4      # 2. 安装 Node 20，缓存 npm 依赖
        with:
          node-version: 20
          cache: npm                     # lockfile 没变就复用缓存
      - run: npm ci                      # 3. 严格按 lockfile 装依赖
      - run: npm run lint                # 4. 静态检查：先拦低级错误
      - run: npm test                    # 5. 跑测试：失败则整次标红
      - run: npm run build               # 6. 构建：证明能打出产物
```

逐行解剖要点：

- `checkout` 永远是第一步——虚拟机是全新的空机器，不拉代码后面全是「找不到文件」；
- `setup-node` 的 `cache: npm` 把缓存挂在 lockfile 上：lockfile 没变就复用，首次约 30 秒的安装缩到几秒；
- `npm ci` 与 `npm install` 的区别：ci 严格按 package-lock.json 精确安装、装前先删 node_modules，保证 CI 与本地完全一致；
- 六步是**漏斗结构**：便宜的检查（lint，秒级）在前，贵的（build，分钟级）在后——前面红了后面不跑，不浪费算力。

**加部署 job（CD 的第一步）**：main 验证通过后自动发布，密钥从 secrets 注入：

```yaml
  deploy:
    needs: verify                        # 没验证过的代码不许碰生产
    if: github.ref == 'refs/heads/main'  # 只有 main 的运行才部署，PR 不部署
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npm run deploy
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}   # Settings → Secrets 注入
```

README 顶部贴 badge（换成你的仓库地址）：

```markdown
![CI](https://github.com/你的用户名/你的仓库/actions/workflows/ci.yml/badge.svg)
```

**预期运行结果**：push 后打开 Actions 标签页，绿勾展开长这样——

```text
✓ CI · verify
  ✓ Set up job          3s
  ✓ actions/checkout    1s
  ✓ actions/setup-node  4s   (Cache restored from key: npm-xxx)
  ✓ Run npm ci          9s
  ✓ Run npm run lint    5s
  ✓ Run npm test        21s   47 passed
  ✓ Run npm run build   12s

✓ CI · deploy (main only)
  ✓ npm run deploy      Deployed to production
```

之后再改坏一个测试并 push：同一页面出现红叉，第一个红 step 是 `npm test`，日志末尾就是测试课里见过的失败断言输出——从 push 到定位根因不超过一分钟，且不需要任何人在场。

**失败案例诊断室**——三个高频失败，各配一段真实感的日志与诊断：

**案例 A：依赖装不上**。`npm ci` 这个 step 红，日志末尾：

```text
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json
  and package-lock.json are in sync
```

诊断：lockfile 和 package.json 不同步——本地加了依赖却忘了提交 lockfile。修复：本地重跑 `npm install` 刷新 lockfile，连同代码一起提交。若日志是 `E404`，则是依赖版本在 registry 里不存在（版本拼写错误或私源配置问题）。

**案例 B：测试超时**。`npm test` 红，日志卡在某测试后长时间无输出，最后：

```text
Timeout - Async callback was not invoked within the 5000ms timeout
```

诊断：先确认是不是测试偷偷连了真实网络/数据库（CI 环境没有或被限流）；是替身没配好就回到测试课的原则——单元测试不碰外部依赖；确实需要真实依赖的，挪到单独的集成 job 并配置超时。

**案例 C：缓存投毒（一句带过）**。依赖缓存里进了坏包，之后每次运行都复用坏缓存、怎么重跑都红。诊断信号：日志显示 Cache restored 却装出错乱依赖。处置：Actions 页面 Caches 栏删掉该缓存或升级缓存 key——缓存会加速，也会加速地坏。

## 常见坑

1. **坑 1：CI 里用 `npm install`**。它会随手升级小版本，本地和 CI 装出的依赖可能不一致，「我本地明明是好的」惨案标准成因。对策：CI 一律 `npm ci`。
2. **坑 2：忘了 checkout**。后续步步报 `no such file or directory, open package.json`。排查：看第一个红 step 前面是不是缺 `actions/checkout`——空机器上没有你的代码。
3. **坑 3：密钥明文写进 YAML 或代码**。事后删除提交也没用，git 历史里仍能翻到。对策：改用 secrets，并**立刻作废**已泄露的 key（先作废再清理，顺序别反）。
4. **坑 4：红了只会重跑**。同一份代码重跑结果不会变（偶发网络抖动另说），重跑是在给「不想看日志」交税。对策：找第一个红 step，读日志最后 30 行，报错几乎总写着答案。
5. **坑 5：触发器写错导致「CI 没跑」**。以为 `on: push` 全分支生效，实际只配了 main——PR 上永远灰着没人检查。排查：「没跑」先打开 workflow 文件核对 on 段，再怀疑代码。
6. **坑 6：测试超时拖垮流水线**。某个测试偷偷连真实外部接口，CI 里网络一抖就挂。对策：单元测试不碰网络（测试课的替身原则）；确需真实调用的下沉到集成 job 并设好超时。

## 小练习

1. 给你任意一个带测试的仓库加上本节 workflow，push 后到 Actions 页看它跑完六步，记录两次运行的耗时，体会缓存第二次省了多久。
2. 故意写一个会失败的断言 push 上去，练习「找第一个红叉 step」：截图它的日志，用一句话写下根因。
3. 综合任务：把部署 job 加进 workflow（`needs` + secrets 注入），部署动作用任意可观测的命令（如向一个 gist 追加一行）；再给 main 配一条分支保护规则（必须 CI 通过 + 1 个 approve），试着直接 push main 观察被拒。
4. 思考题：为什么 CI 每次都从零 checkout、重新装依赖，而不是复用上次的磁盘？（提示：可重复性——干净机器上也能跑，才是真正的可部署证明。）
