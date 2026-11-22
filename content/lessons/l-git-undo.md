---
id: l-git-undo
slug: git-undo
title: 撤销与救急：改错了怎么办
difficulty: 2
estMinutes: 75
tags: [Git, 救急]
summary: Git 是时间机器，但每个「回到过去」的命令作用点都不同——撤销工作区/暂存区/提交/推送四级事故，各有专属工具，一张决策表记牢。
updated: 2026-11-22
resources:
  - id: r-git-undo
    title: Pro Git · 撤消操作
    url: https://git-scm.com/book/zh/v2/Git-%E5%9F%BA%E7%A1%80-%E6%92%A4%E6%B6%88%E6%93%8D%E4%BD%9C
    type: book
    difficulty: 2
    note: 各类撤销的权威出处。
  - id: r-git-flight-rules
    title: Git Flight Rules（飞行手册）
    url: https://github.com/k88hudson/git-flight-rules/blob/master/README_zh-CN.md
    type: doc
    difficulty: 2
    note: 「我搞砸了 X 怎么办」的速查手册，收藏备用。
---

> 一句话定义：撤销的关键是先回答**「改动站在哪个站台」**——工作区没 add、暂存区没 commit、本地已 commit、已经 push 到远程，四级事故各有专属工具，用错等级的命令反而把事情搞砸。

## 概念讲解

先建立**安全等级意识**：越靠左的改动越「私空气」，撤销越自由；已经 push 的历史是公共财产，改写它是团队红线：

```text
安全区 ──────────────────────────────────────── 危险区
工作区   →  暂存区   →  本地 commit   →  已 push 到远程
随便改      随便改      尽量别改历史      只许前进（revert 补救）
```

**四级事故的决策表**（先定位，再选工具）：

| 事故场景 | 改动在哪 | 工具 | 效果 |
| ---- | ---- | ---- | ---- |
| 文件改乱了，想恢复到上次存档 | 工作区 | `git restore 文件` | 丢弃未提交改动（**不可恢复**） |
| add 错了文件，想撤出暂存区 | 暂存区 | `git restore --staged 文件` | 取消暂存，改动保留在工作区 |
| commit 提交说明写错/漏文件 | 本地 commit | `git commit --amend` | 修补**最近一次**提交 |
| 想撤销某次已 push 的提交 | 远程历史 | `git revert <哈希>` | 生成一个「反向提交」，历史只进不退 |
| 回到几步前的整体状态重做 | 本地历史 | `git reset --hard HEAD~n` | **抹掉**最近 n 个提交（慎用） |
| 删错了分支/reset 过头了 | 任何位置 | `git reflog` + `git reset --hard <哈希>` | 从「操作日记」里捞回来 |

**amend 与 revert 的取舍**是核心判断题：

- `--amend`（修补最近一次提交）：提交完发现说明打错、漏 add 了一个文件——本地还没 push 时用它，代价是**改写哈希**；
- `git revert`（反做历史提交）：想撤销的提交**已经 push**——不改写历史，而是生成一个内容相反的新提交（「用加法做减法」），别人拉取时一切正常；
- `git reset --hard`：把分支指针强行搬回过去并抹掉之后的提交——只适合**个人未推送**的本地历史；对已推送的历史使用就是 `push -f` 红线的入口。

**reflog：最后的保险丝。** Git 记录了 HEAD 的每一次移动（包括被 reset「抹掉」的提交）——被你 reset 丢掉的提交 90 天内都能从 reflog 里捞回来：

```text
git reflog                  # 操作日记：每行 = HEAD 曾在哪
a1b2c3 HEAD@{0}: reset: moving to HEAD~2
d4e5f6 HEAD@{1}: commit: 险些丢掉的提交   ← 就在这里
git reset --hard d4e5f6     # 回到那个时间点
```

**stash：临时抽屉。** 改到一半要切分支救火，又不想提交半成品——`git stash` 把改动收进抽屉，救火完 `git stash pop` 取回继续。

## 代码示例

把决策表跑一遍——制造五类事故并逐一救回：

```bash
# 事故 1：文件改乱，丢弃工作区改动
echo "乱七八糟的修改" > app.txt
git restore app.txt                  # 回到上次 commit 的样子（不可恢复，先确认）

# 事故 2：add 错了文件
git add secret.txt                   # 手滑
git restore --staged secret.txt      # 撤出暂存区（文件还在，只是不入包裹）
git status                           # 回到 Untracked/未暂存状态

# 事故 3：提交说明写错，amend 修补
git commit -m "fix bug"              # 说明太含糊
git commit --amend -m "修复：登录页空指针"   # 修补最近一次提交

# 事故 4：撤销已 push 的提交（revert，历史只进不退）
git log --oneline                    # 复制要撤销的哈希，如 a1b2c3
git revert a1b2c3                    # 生成反向提交；有冲突时解法同合并
git push                             # 团队成员拉取后一切正常

# 事故 5：reset 过头，reflog 捞回
git reset --hard HEAD~2              # 手滑抹掉最近两个提交
git reflog                           # 找到抹掉前的哈希 d4e5f6
git reset --hard d4e5f6              # 时间线恢复，提交全部找回

# 抽屉：切分支救火
git stash                            # 半成品进抽屉（工作区变干净）
git switch hotfix && ... && git switch back
git stash pop                        # 取回半成品继续
```

## reset 的三种模式：回退时改动去哪了

`git reset` 的 `--soft / --mixed / --hard` 决定「被回退的改动放在哪」——一张表钉死：

| 模式 | 分支指针 | 暂存区 | 工作区 | 适用场景 |
| ---- | ---- | ---- | ---- | ---- |
| `--soft` | 回退 | **保留**被退提交的改动 | 保留 | 「重新组织提交」：退回后重新 add/commit |
| `--mixed`（默认） | 回退 | **清空** | 保留（未暂存态） | 「退回重挑」：改动还在，重新挑选 |
| `--hard` | 回退 | 清空 | **清空** | 「彻底丢弃」：确认改动是垃圾时才用 |

```bash
git reset --soft HEAD~1     # 提交太早？退回但改动留在暂存区，补上漏的文件再提交
git reset --mixed HEAD~1    # 想重新分两个语义提交？改动全退回工作区
git reset --hard HEAD~1     # 这次提交就是错的？全部抹掉（确认无可保留再用）
```

**为什么 reflog 能捞回「抹掉」的提交？** `reset --hard` 只是移动了分支指针，提交对象本体还躺在 `.git/objects` 里——Git 的垃圾回收要等 90 天后才真正清理无主对象。reflog 记录了 HEAD 的每一次移动，所以「指针搬回去」就等于回到过去。这也是「Git 里几乎没有真正丢过的提交」这句话的原理。

## amend 的两种用法与边界

**用法一：补说明**。commit 说明打错字、太含糊——`git commit --amend -m "新说明"` 直接替换最近一次提交的说明。

**用法二：补文件**。commit 完发现漏 add 一个文件：

```bash
git add 漏掉的文件
git commit --amend --no-edit    # 不改说明，把文件并进最近一次提交
```

**边界**：amend 改写的是「最近一次提交」的哈希——若这次提交还没 push，随便改；已 push 过则你的分支历史与远程分叉，push 时要用 `--force-with-lease`（且仅限自己的 feature 分支）。另外 amend 的前提是「这次提交还没人基于它工作」——如果同事已经 pull 了它，改写就会制造冲突，此时老老实实再写一个修复 commit。

## 常见坑

1. **坑 1：对已 push 的历史用 reset + 强推**。同事基于旧历史开发的提交全部错位——已推送的提交只能 revert（加法式撤销）。判断口诀：**自己的分支可重写，公共分支只许 revert**。
2. **坑 2：restore 前没确认改动可丢**。`git restore` 丢弃的未提交改动**无法恢复**（它没进过 Git 历史）——养成先 `git diff` 过目再丢弃的习惯；不确定就先 `git stash`。
3. **坑 3：amend 后忘了 force push 自己的分支**。amend 改写哈希，若上次已 push，普通 push 会被拒——自己的 feature 分支用 `git push --force-with-lease`（比 -f 安全：远程有别人的新提交时会拒绝）。
4. **坑 4：reflog 是本地日记**。它只存在于你的机器上——clone 下来的新仓库没有完整 reflog，救回历史要趁早（默认保留约 90 天）。
5. **坑 5：reset --hard 当万能后悔药**。它会同时抹掉工作区和暂存区——想「只回退提交、保留改动」用 `git reset --soft HEAD~1`（改动退回暂存区，重新整理再提交）。
6. **坑 6：把 revert 当成「删除那次提交」**。revert 是「新增一个内容相反的提交」，历史里两条都在——想查「当初为什么引入」时旧提交还在，这是特性不是缺陷。

## 小练习

1. 按主线制造五类事故并逐一救回，每步记录 status/log 输出的变化，整理成你自己的「事故-工具」对照表。
2. 分别用 `git reset --soft / --mixed / --hard HEAD~1` 回退一次提交，观察三种模式下「工作区、暂存区」各自的残留在哪。
3. 综合任务：故意写一个含 bug 的提交 push 到自己的 GitHub 仓库，然后用 revert 撤销它，并确认远程历史没有出现强推痕迹。
4. 思考题：为什么 Git 选用「revert 加法式撤销」而不是像很多工具那样「直接删除历史」？从多人协作的角度想。
