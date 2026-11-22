---
id: l-git-branch
slug: git-branch
title: 分支与合并：并行开发的时间线
difficulty: 1
estMinutes: 80
tags: [Git, 分支]
summary: 分支是 41 字节的指针文件，却让多人并行互不干扰——开关合并全流程、冲突长什么样、怎么解决，跟着制造一次真实的冲突并修好它。
updated: 2026-11-22
resources:
  - id: r-git-book-branch
    title: Pro Git · 分支简介
    url: https://git-scm.com/book/zh/v2/Git-%E5%88%86%E6%94%AF-%E5%88%86%E6%94%AF%E7%AE%80%E4%BB%8B
    type: book
    difficulty: 2
    note: 「分支是指针」的原理出处，第 3 章值得完整读。
  - id: r-learngitbranching
    title: Learn Git Branching（关卡式练习）
    url: https://learngitbranching.js.org/?locale=zh_CN
    type: tool
    difficulty: 1
    note: 游戏化练习分支操作，通关本课所有概念。
---

> 一句话定义：分支是**指向某个存档点的可移动指针**——创建它零成本（41 字节的文件），让「修 bug」「加功能」各开一条时间线互不干扰，做完再合并回主干。

## 概念讲解

**为什么需要分支？** 修线上 bug 的同时要开发新功能——如果没有分支，两条工作互相污染：改到一半的功能被迫一起发布，或者 bug 修复里混进半成品。分支让两条时间线物理隔离：

```text
main:      ──A──B──C──F──G        ← 随时可发布的稳定线
                      │
fix-bug:              └─D──E      ← 在隔离舱里修 bug
                      │
feature:              └─X──Y──Z   ← 另一个功能也在并行
```

**分支的本质是指针**——不是文件夹的完整拷贝。`git branch fix-bug` 只是在 `.git/refs/heads/` 里写了一个 41 字节的文件（内容 = 指向 C 的哈希）；`git switch` 移动的是另一个指针 HEAD。这个设计解释了两个现象：开分支是**瞬间**的；合并大量提交也很快（Git 只需移动指针+算差异）。

**合并的两种结果**：

1. **快进（fast-forward）**：主干在你分出去之后没有新提交——直接把 main 指针挪到分支末端，历史保持一条直线；
2. **真合并（merge commit）**：两边都有新提交——Git 找共同祖先，把两边的改动合成一个「合并提交」（有两个父节点，历史呈菱形）。

```text
快进：main A──B          真合并：main A──B───F───G
              \                 \  \      │
               C（分支）         C──D(分支) E
                                 ↑ F 是合并提交（父节点 B 和 D）
```

**冲突：Git 在问「这两版留哪版」。** 两边改了**同一文件的同一区域**时产生冲突——Git 不猜你的意图，把两个版本都摆在文件里：

```text
<<<<<<< HEAD
主干的写法
=======
分支的写法
>>>>>>> fix-bug
```

解决流程固定四步：打开文件 → 手动编辑保留正确内容（可以融合两版）→ 删掉三行标记 → `git add` 该文件表示「已解决」→ `git commit` 完成合并。冲突不可怕，它是协作的日常；可怕的是长期不合并没有冲突——那意味着改动早就互相踩了。

**Pull Request 是团队协作的合并前置门**：推分支到远程 → GitHub 上发起 PR → 同行评审 → 合并。它把「合并」从技术动作升级成质量关卡（正确性、可读性、测试，呼应软件工程课的 Code Review）。

## 代码示例

完整走一遍「开分支 → 修 bug → 合并」，再**故意制造一次冲突**修好它：

```bash
# 第 1 幕：正常合并（快进）
git switch -c fix-typo                 # 开新分支并切过去（-c = create）
echo "git is a time machine" > note.txt
git add note.txt && git commit -m "修复：说明文案错别字"
git switch main
git merge fix-typo                     # Fast-forward：指针直接前移
git log --oneline                      # 一条直线，包含修复提交
git branch -d fix-typo                 # 任务完成，删分支

# 第 2 幕：故意制造冲突
git switch -c feature-title
echo "标题：我的作品集 v2" > title.txt
git commit -am "分支：改标题为 v2"
git switch main
echo "标题：我的作品集 v3" > title.txt
git commit -am "主干：也改标题为 v3"
git merge feature-title                # ⚠️ CONFLICT (content): Merge conflict in title.txt
git status                             # both modified: title.txt

# 第 3 幕：解决冲突（打开 title.txt，看到两个版本的标记）
#   <<<<<<< HEAD
#   标题：我的作品集 v3
#   =======
#   标题：我的作品集 v2
#   >>>>>>> feature-title
#   → 手动改成「标题：我的作品集 v3（融合分支的副标题）」并删掉三行标记
git add title.txt                      # 标记冲突已解决
git commit                             # Git 自动填好合并提交说明
git log --oneline --graph              # --graph 看菱形历史
```

用 `git log --graph --oneline --all` 观察「分支汇入主干」的历史形状——菱形（真合并）与直线（快进）一眼可辨。

## 分支命名与远程分支：团队协作的地基

**分支命名是有语义的**——看名字就该知道这条分支在干嘛：

```text
main                 主干：随时可发布
fix/login-crash      修复：哪个问题
feat/export-csv      功能：做什么
docs/readme          文档
```

**远程分支**是「远程仓库上的分支在你本地的镜像」，带 `origin/` 前缀：

```bash
git push -u origin fix-typo      # 把本地分支推上远程（-u 建立跟踪关系）
git branch -r                    # 看所有远程分支：origin/main、origin/fix-typo
git fetch                        # 拉取远程的最新状态（只更新镜像，不动你的工作区）
git switch fix-typo              # 本地没有？Git 会自动跟踪同名远程分支
```

`fetch` 与 `pull` 的区别值得钉死：**fetch 只下载不合并**（先看看同事干了什么），pull = fetch + merge（直接整合）。不确定远程情况时先 fetch 再决定，是安全习惯。

**stash：分支间的临时抽屉**——改到一半要切分支救火，又不想到处留半成品 commit：

```bash
git stash                 # 当前改动收进抽屉，工作区瞬间变干净
git switch hotfix && ...  # 去干别的
git switch fix-typo
git stash pop             # 取回半成品继续（stash list 可看抽屉里的存货）
```

## Pull Request：团队合并的标准流程

个人仓库直接 merge 就行；**团队协作的合并都要过 PR 这道门**——它同时是「评审关卡」和「讨论存档」：

```text
① 本地开分支干活：  git switch -c feat/export-csv → 小步提交
② 推上远程：        git push -u origin feat/export-csv
③ GitHub 上发起 PR：选目标分支 main → 写清楚「做了什么、为什么、怎么测」
④ 同行评审：        评论/要求修改 → 你继续 push（PR 自动纳入新提交）
⑤ 合并：            评审通过 → Squash merge（压成一个干净提交进主干）
⑥ 清理：            删除 feature 分支（本地 + 远程）
```

「PR 里继续 push 会自动更新」值得注意——评审意见的修改不需要新开 PR，推到同一分支即可。合并方式三选一（merge commit / squash / rebase）由团队约定：本站的规范是 **squash 保线性**（一个 PR 在主干上只留一个提交）。

## 进阶一课：merge 与 rebase——两种整理历史的方式

分支写完要「落到主干」，除了 merge 还有一条 rebase 的路——先看直觉：

```text
merge（合并）：把两条时间线「缝合」，产生一个合并提交，历史保留真实分叉
main  A──B───F───G          F = 合并提交（两个父节点）
       \  \  │
        C──D┘

rebase（变基）：把分支的提交「摘下来重种」到主干末尾，历史变成一条直线
main  A──B──C'──D'          C'/D' 是复制体（哈希变了）
```

**取舍**：merge 诚实（保留「这条功能分支存在过」的事实）但历史蜿蜒；rebase 线性好看但**改写了提交哈希**——所以铁律与撤销课一致：**只 rebase 自己没推送的本地分支**。初学阶段用 merge 就够，团队规范（如「PR 必须 squash 合并」）往往替你做了这个决定——本站就是 PR squash 保线性历史。

冲突在 rebase 中同样会出现，解决流程相同（改文件→add→`git rebase --continue`）；中途想放弃用 `git rebase --abort` 原地满血。

## 常见坑

1. **坑 1：在错误的分支上开始改代码**。改完才发现没切分支。补救：`git switch -c 新分支`——未提交的改动会跟着你到新分支。预防：动手前 `git branch --show-current` 看一眼。
2. **坑 2：长期分支不合并**。experiment 挂了两周，主干大改后再合并冲突爆炸——分支生命周期以天计，小步快合并。
3. **坑 3：用 `git push -f` 强推主干**。它会覆盖别人的提交，是团队协作红线。主干只许前进；强推只允许在自己的 feature 分支上做（rebase 后）。
4. **坑 4：解冲突时把标记留在文件里**。`<<<<<<<` 没删干净就 commit——代码里出现符号是最高级尴尬。解完冲突全局搜一遍 `<<<<<<<` 再提交。
5. **坑 5：切分支前不处理未提交改动**。改动会跟着你到新分支（有时是惊喜有时是惊吓）——要么先 commit、要么 `git stash`（暂存抽屉，存起来回头再取）。
6. **坑 6：fetch 和 pull 混着用心里没数**。pull 直接改你的工作区和历史（可能带来意外合并）——团队协作中「先 fetch 看一眼、再决定怎么整合」是更稳的节奏。

## 小练习

1. 完整复现主线三幕，用 `git log --graph --oneline --all` 分别记录快进与真合并的历史形状。
2. 在 Learn Git Branching 完成第 1-2 关，用可视化确认「分支=指针」。
3. 综合任务：模拟双人协作——自己开两个分支各自改 README 的不同段落（无冲突）与同一段落（有冲突），分别走完合并流程并记录差异。
4. 思考题：为什么说「分支是指针」而不是「文件夹拷贝」？这个设计让哪些操作变得飞快？
