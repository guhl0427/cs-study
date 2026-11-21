---
id: l-git-basic
slug: git-basic
title: Git 基本流程：add、commit、push
difficulty: 1
estMinutes: 30
tags: [Git, 工具]
summary: commit 是代码的存档点——工作区、暂存区、本地仓库、远程仓库这四站理顺了，Git 就不神秘了。
updated: 2026-11-22
resources:
  - id: r-git-book
    title: Pro Git（中文版）
    url: https://git-scm.com/book/zh/v2
    type: book
    difficulty: 2
    note: Git 的圣经，前 2 章覆盖本节全部内容。
  - id: r-git-visual
    title: Visualizing Git
    url: https://git-school.github.io/
    type: tool
    difficulty: 1
    note: 可视化玩分支，直观理解提交历史。
---

> 一句话定义：Git 给你的代码拍快照——改动先装进「暂存区」挑选，再「提交」成本地存档点，最后「推送」同步到远程。

## 概念讲解

你的改动要经过**四个站台**：

```
工作区（你正在编辑的文件）
  → git add → 暂存区（下次要存档的改动清单）
  → git commit → 本地仓库（历史存档点链）
  → git push → 远程仓库（GitHub 上的共享副本）
```

「暂存区」是 Git 最容易被误解的部分，也是它最灵活的部分：你可以改 5 个文件，只提交其中 2 个——`add` 是在**挑选**这次存档的内容，让每个 commit 语义完整（「修好了 X」而不是「一堆乱七八糟的改动」）。

最小日常工作流只有四条命令：

```bash
git status          # 我改了什么？在哪个站台？
git add 文件名       # 挑选改动（git add . 挑全部）
git commit -m "修复：空列表崩溃"   # 存档点 + 说明
git push            # 同步到远程
```

`git status` 是常开的——任何时刻不确定状态，先看它。

## 代码示例

从零走一遍完整流程，观察每个命令的输出变化：

```bash
mkdir demo && cd demo && git init          # 初始化仓库（.git 目录出现）
echo "v1" > app.txt
git status                                  # app.txt 未跟踪（红色）
git add app.txt
git status                                  # 已进入暂存区（绿色）
git commit -m "首次提交：v1"
echo "v2" > app.txt
git add app.txt
git commit -m "更新到 v2"
git log --oneline                           # 两个存档点，链成历史
```

存档点的意义：任何时候 `git diff HEAD~1` 能看「上次存档以来改了什么」，`git checkout` 能回到任何历史版本——**大胆改代码的前提，是每个完成的小阶段都 commit**。

## 常见坑

1. **坑 1： commit message 写「update」**。三个月后没人知道改了什么。写「做了什么」：`修复：登录页空指针` / `新增：导出功能`。
2. **坑 2：一次 commit 塞十件事**。存档点粒度太粗，「回滚到只含 X 修复的版本」就做不到了。
3. **坑 3：怕冲突就不 push，攒一周**。本地攒得越久，和远程分叉越大，合并越痛——小步提交、勤推送。

## 小练习

1. 完整走一遍示例流程，并在第 3 个 commit 后用 `git diff HEAD~1` 查看差异。
2. 故意只 add 两个改动文件中的一个，commit 后用 `git status` 观察剩下那个的状态。
3. 思考题：为什么说「暂存区让 commit 语义完整」？举一个只有工作区没有暂存区时做不到的场景。
