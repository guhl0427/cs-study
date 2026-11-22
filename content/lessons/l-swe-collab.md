---
id: l-swe-collab
slug: collab
title: 分支策略与 Code Review
difficulty: 2
estMinutes: 35
tags: [Git, 协作]
summary: feature 分支 + PR 是团队协作的标准流程——小而专的 PR 加对事不对人的评审，让改动既可控又共享。
updated: 2026-11-22
resources:
  - id: r-github-flow
    title: GitHub Flow 官方指南
    url: https://docs.github.com/en/get-started/using-github/github-flow
    type: doc
    difficulty: 1
    note: 本节工作流的官方原版，十分钟读完。
  - id: r-google-review
    title: Google 工程实践 · Code Review 指南
    url: https://google.github.io/eng-practices/review/
    type: doc
    difficulty: 3
    note: 评审该看什么、评论怎么写，Google 内部标准的公开版。
---

> 一句话定义：feature 分支工作流把每次改动隔离在自己的分支上，经 PR 评审后合入 main——改动有门，知识有共享。

## 概念讲解

单人写代码可以闷头 push main；多人一起这么干，main 会变成事故现场。标准解法是 feature 分支工作流：

```
main ──●───────●────────●──→ 时间线
        ＼             ／
         ●─●─●  fix/login-redirect
         改代码 → push → 开 PR → 评审 → 合并
```

PR（Pull Request）不只是「请求合并」，它同时是**质量门**（别人看过、CI 过了才准进 main）和**知识广播站**（改动为什么这么写，全团队都看得见）。

好 PR 三标准：**小**（几百行内，评审人半小时能看完）、**单一目的**（一个 PR 只解决一件事，发现别的问题另开 PR）、**描述清楚**（做了什么、为什么、怎么验证）。

Code Review 主要看三样：**正确性**（逻辑对不对、边界考虑了没）、**可读性**（三个月后别人能否看懂）、**测试覆盖**（新逻辑有没有测试钉住）。风格问题交给格式化工具，人不做「人肉 diff」。

评论礼仪：**对事不对人、多用提问式**。把「你这里写错了」换成「这里按下标取单价，字段顺序一变就静默出错，要不要改成解构？」——指出同一个问题，后者不树敌。

分支策略光谱的另一端一句话对比：**主干开发**（trunk-based，人人高频合入 main，未完成功能靠开关藏起来）胜在快，**Git Flow**（develop/release 多条长期分支）胜在版本发布可控——小团队从 GitHub Flow 起步最省心。

## 代码示例

```bash
git switch main && git pull              # 1. 从最新的 main 出发
git switch -c fix/login-redirect         # 2. 开 feature 分支，名字说清目的
# 3. 改代码，小步提交若干次
git push -u origin fix/login-redirect    # 4. 推到远程，网页上点「创建 PR」
```

PR 描述模板——正文写清三件事，结尾用 closes 关联 issue：

```markdown
## 做了什么
登录成功后跳回来源页，而不是固定回首页。

## 为什么
closes #42（用户反馈：从文章页登录后被扔回首页）

## 怎么验证
新增 test_login_redirect，覆盖 3 种来源页场景。
```

PR 合并进 main 时，GitHub 会自动关闭 issue #42——需求、代码、讨论就这样串成一条可追溯的链。

## 常见坑

1. **坑 1：分支养两周，攒 47 个文件再开「巨型 PR」**。评审人看不动，只能秒批，评审形同虚设。对策：一个分支活一天以内，小步勤开 PR。
2. **坑 2：PR 描述只写「更新代码」**。评审人只能靠猜改动意图。对策：套模板，写清做什么、为什么、怎么验证。
3. **坑 3：评审变抬杠**。盯着分号、引号这类工具能管的事发表长篇意见。对策：先看正确性、可读性、测试覆盖，风格问题让工具闭嘴。

## 小练习

1. 在 GitHub 上找一个开源项目已合并的小 PR，对照「三标准」给它打分。
2. 给你最近的一次改动写一份含 `closes #n` 的 PR 描述。
3. 思考题：为什么「小 PR」不只是礼貌，还能降低 bug 混进 main 的概率？（提示：评审质量随体积如何变化？）
