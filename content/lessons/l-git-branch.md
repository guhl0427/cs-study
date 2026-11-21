---
id: l-git-branch
slug: git-branch
title: 分支与合并：并行开发的核心
difficulty: 2
estMinutes: 35
tags: [Git, 分支]
summary: 分支是「指向某个存档点的可移动标签」——开分支做实验、合并回主干，两条时间线互不干扰。
updated: 2026-11-22
resources:
  - id: r-branch-flow
    title: Git 分支 - 何谓分支（Pro Git）
    url: https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%88%86%E6%94%AF%E7%AE%80%E4%BB%8B
    type: doc
    difficulty: 2
    note: 理解「分支只是指针」这一章，分支恐惧症根治。
---

> 一句话定义：分支只是一个指向某次 commit 的指针——开分支是造一个新指针，合并是把两条时间线的故事汇合。

## 概念讲解

为什么需要分支？修线上 bug 的同时要开发新功能——两条时间线必须隔离。Git 的分支极其轻量（一个 41 字节的指针文件），所以正确姿势是**小步多开**：

```bash
git switch -c fix-login-bug     # 开新分支并切过去（-c = create）
# …修复、add、commit 若干次……
git switch main                 # 回到主干
git merge fix-login-bug         # 把分支上的提交汇入主干
git branch -d fix-login-bug     # 任务完成，删分支
```

**合并的两种结果**：

1. **快进**：主干没有新提交，直接把指针挪过去——历史是一条直线；
2. **真合并**：两边都有新提交，Git 算出共同祖先，产生一个「合并提交」。

如果两边改了**同一行**，合并冲突出现：

```text
<<<<<<< HEAD
主干的写法
=======
分支的写法
>>>>>>> fix-login-bug
```

冲突不可怕——它只是 Git 在问「这两版留哪版」。手动编辑保留正确内容、删掉标记行、`add` 后继续合并。团队协作的推荐流程是走 **Pull Request**：推分支到远程 → 在 GitHub 上发起 PR → 同行评审 → 合并，评审即质量关卡。

## 代码示例

体验一次带冲突的合并（在安全的仓库里做，冲突是学习材料）：

```bash
git switch -c experiment
echo "分支版标题" > title.txt
git commit -am "分支改标题"
git switch main
echo "主干版标题" > title.txt
git commit -am "主干也改标题"
git merge experiment            # CONFLICT 冲突出现
git status                      # both modified: title.txt
# 手动编辑 title.txt，删掉 <<<<<<< / ======= / >>>>>>> 标记
git add title.txt
git commit -m "合并 experiment：采用新版标题"
```

## 常见坑

1. **坑 1：在错误的分支上开始改代码**。改完才发现没切分支。对策：动手前 `git branch --show-current` 看一眼；已经改了也能用 `git switch -c 新分支` 把改动带过去。
2. **坑 2：长期分支不合并**。experiment 挂了两周，主干大改后再合并冲突爆炸——分支生命周期以天计，短平快。
3. **坑 3：用 `git push -f` 强推主干**。它会覆盖别人的提交，是团队协作红线。主干只许前进。

## 小练习

1. 完整复现示例的冲突与解决过程，用 `git log --graph --oneline` 查看汇合后的历史形状。
2. 用 Visualizing Git 玩出 branch、merge、rebase 三种历史形状。
3. 思考题：为什么说「分支是指针」而不是「分支是文件夹的完整拷贝」？这个设计让哪些操作变得飞快？
