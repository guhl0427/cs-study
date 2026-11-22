---
id: l-git-basic
slug: git-basic
title: Git 基本流程：add、commit、push 的完整地图
difficulty: 1
estMinutes: 75
tags: [Git, 工具]
summary: commit 是代码的存档点——四站台地图、每条命令的输出怎么读、一次 commit 该装什么，跟着建一个真实仓库走完全流程。
updated: 2026-11-22
resources:
  - id: r-git-book
    title: Pro Git（中文版）
    url: https://git-scm.com/book/zh/v2
    type: book
    difficulty: 2
    note: Git 的圣经，第 1-2 章覆盖本节全部内容。
  - id: r-git-visual
    title: Visualizing Git
    url: https://git-school.github.io/
    type: tool
    difficulty: 1
    note: 可视化玩分支与提交历史，直观理解存档点链。
---

> 一句话定义：Git 给你的代码拍快照——改动先装进「暂存区」挑选，再「提交」成本地存档点，最后「推送」同步到远程；理顺这四站台，Git 就不神秘了。

## 概念讲解

**你的改动要经过四个站台**：

```text
工作区（你正在编辑的文件）
  │ git add          「挑选」哪些改动进入本次存档
  ▼
暂存区（staging，下次要存档的改动清单）
  │ git commit       打一个本地存档点（快照 + 说明）
  ▼
本地仓库（.git 目录里的历史存档点链）
  │ git push         把本地新存档点同步到远程
  ▼
远程仓库（GitHub/Gitee 上的共享副本）
```

**为什么要有暂存区？** 这是 Git 最容易被误解、也最灵活的设计：你可以改 5 个文件，只提交其中 2 个——`add` 是在**挑选**这次存档的内容，让每个 commit 语义完整（「修好了 X」而不是「一堆乱改」）。类比：寄快递前先装箱——装箱单（暂存区）决定哪些东西进这个包裹。

**commit 的本质是快照链**：每个存档点记录「当时全部文件的状态」+ 指向上一个存档点的指针。这条链就是你的时间机器：

```text
(根)──a1b2c3──d4e5f6──9g8h7i   ← HEAD 指向最新的存档点
        │         │        │
      「初始版」 「加登录」 「修样式」      git checkout 可回到任何一点
```

**配置先行**：装好 Git 第一件事是告诉它你是谁（每个 commit 的署名）：

```bash
git config --global user.name "你的名字"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main     # 新仓库默认用 main 分支
```

**最小日常工作流**只有四条命令，日常 90% 的时间都在它们之间循环：

```bash
git status          # 我改了什么？在哪个站台？（常开！不确定就先看它）
git add 文件名       # 挑选改动（git add . 挑全部）
git commit -m "说明"  # 存档点 + 说明
git push            # 同步到远程
```

`git status` 的输出怎么读——它是你的仪表盘：

```text
On branch main                        ← 当前在哪个分支
Changes not staged for commit:       ← 工作区有改动，还没 add（红色）
        modified:   app.js
Changes to be committed:             ← 已 add，等待 commit（绿色）
        new file:   login.py
Untracked files:                     ← Git 还不认识的新文件
        notes.txt
```

## 代码示例

从零建一个真实仓库走完全流程——跟着敲，每步观察输出变化：

```bash
mkdir demo && cd demo && git init       # 初始化：出现 .git 目录（历史存放在这里）
git status                              # On branch main, nothing to commit

echo "v1" > app.txt                     # 造一个文件
git status                              # Untracked files: app.txt（红色，Git 不认识）
git add app.txt                         # 挑进暂存区
git status                              # Changes to be committed（绿色）

git commit -m "首次提交：v1"             # 打存档点
git log --oneline                       # a1b2c3 (HEAD -> main) 首次提交：v1

echo "v2" > app.txt                     # 改动它
git diff                                # 看工作区改动：-v1 +v2
git add app.txt && git commit -m "更新到 v2"
git log --oneline                       # 两个存档点链成历史

git show HEAD                           # 看最新存档点的完整内容
git diff HEAD~1                         # 最近一次存档改了什么
```

**接上远程**（GitHub 建一个空仓库后）：

```bash
git remote add origin https://github.com/you/demo.git   # 登记远程地址（origin 是别名）
git push -u origin main                                  # 首推并建立跟踪（-u 以后可裸 push）
echo "v3" > app.txt && git add . && git commit -m "v3" && git push
```

**同事拉取你的成果**：

```bash
git clone https://github.com/you/demo.git   # 克隆整个仓库+历史
cd demo && git log --oneline                # 历史都在
```

## 远程协作的日常循环：clone → pull → commit → push

个人项目只需要 push；协作项目的节奏是一个循环，理解每个动词的「方向」就懂了全局：

```text
git clone   「下载整个仓库」（只在开始时用一次）
git fetch   「只下载远程的新历史，不动我的工作区」（先看看发生了什么）
git pull    fetch + 合并：把远程新提交整合进本地（可能带来冲突）
git push    「上传我的新提交」（被拒 = 远程有你没有的历史 → 先 pull）
```

**origin 是什么？** 它只是「默认远程地址的别名」——`git remote -v` 能看到它指向哪；一个仓库可以有多个远程（如公司的 Gitee 和个人的 GitHub），推送时指明 `git push origin main` 即是「推到名为 origin 的远程的 main 分支」。

**pull 被拒或出冲突时的标准流程**：

```bash
git pull
# CONFLICT 提示 → git status 看冲突文件 → 手动解决 → add → commit
# 或者：想先看看远程改了什么再决定 → git fetch + git log main..origin/main --oneline
```

「push 被拒」不是错误而是**保护**：它防止你无意识地覆盖同事的提交。接纳它，把「先 pull 再 push」变成肌肉记忆。

存档点的意义：任何时候 `git checkout a1b2c3 -- app.txt` 能把单个文件恢复到历史版本——**大胆改代码的前提，是每个完成的小阶段都 commit**。

## .gitignore：告诉 Git 哪些东西不配进历史

「环境随仓库走」的另一面是**垃圾和秘密必须挡在门外**——构建产物（dist/、node_modules/）、本机配置（.env、密钥）、编辑器缓存（.idea/、.DS_Store）都不该进仓库：

```bash
# .gitignore（语法：每行一个模式，# 注释）
node_modules/          # 目录（递归匹配）
dist/                  # 构建产物
.env                   # 密钥与私密配置
*.log                  # 通配符：所有日志
!logs/.gitkeep         # 感叹号 = 例外（保留占位文件）
```

两个必知行为：**已经提交的文件不受 .gitignore 管**（要移出历史用 `git rm --cached 文件` 再提交）；**.env 泄漏后换密钥比删历史更重要**——秘密一旦进过 commit，就假设它已经泄漏。

## 三种状态 × 三个区：读懂 status 的原理

Git 里每个文件处于三种状态之一，对应它在三个区的位置：

```text
工作区    暂存区    仓库
修改了  → 未暂存   (Unmodified/Modified/Staged)
已 add  → 已暂存   (Staged)
没动    → 干净     (Unmodified)
没加入  → 未跟踪   (Untracked)
```

`git status` 的缩写模式更紧凑：`git status -s` 输出 `M app.js`（已修改未暂存）、`M  login.py`（已暂存）、`?? notes.txt`（未跟踪）——第一列是暂存区状态、第二列是工作区状态。看懂这张表，`status`/`diff`/`diff --staged` 的输出全部自洽：

```bash
git diff                # 工作区 vs 暂存区（「我改了还没挑的」）
git diff --staged       # 暂存区 vs 上次提交（「挑了待提交的」）
```

## 常见坑

1. **坑 1：commit message 写「update」**。三个月后没人知道那个改了什么。写「做了什么」：`修复：登录页空指针` / `新增：导出功能`。团队惯例可用前缀（feat/fix/docs，呼应 Conventional Commits）。
2. **坑 2：一次 commit 塞十件事**。存档点粒度太粗，「回滚到只含 X 修复的版本」就做不到了。按语义拆：`git add app.js` 精确挑选，宁可多打几个小 commit。
3. **坑 3：怕冲突就不 push，攒一周**。本地攒得越久，和远程分叉越大，合并越痛——小步提交、勤推送。
4. **坑 4：把敏感信息 commit 进去**。`.env`、密钥、`node_modules/` 一旦进历史就很难删干净——第一件事写好 `.gitignore`（GitHub 有各语言模板），用 `git status` 提交前过一眼。
5. **坑 5：`git add .` 的盲推**。它把所有改动包括垃圾文件都装进包裹——养成「先 status 后 add」的习惯，精确挑选。
6. **坑 6：以为 .gitignore 能救已提交的文件**。ignore 只对「未跟踪」文件生效；秘密文件先 `git rm --cached .env` 移出跟踪再补 ignore，然后**换掉泄露的密钥**。
7. **坑 7：commit 说明只写「改了哪个文件」**。文件名 diff 里已经有了，说明该写「为什么改」与「改动的意图」——这是给三个月后的自己和同事看的。

## 小练习

1. 完整走一遍主线：建仓库→3 次有意义的提交→接远程推送，每步截图或记录 status 输出的变化。
2. 故意只 add 两个改动文件中的一个，commit 后用 git status 观察剩下那个的状态；再用 git diff 看它和暂存区的差异。
3. 综合任务：在 GitHub 建仓库，把你的「成绩判定器」（JS 课项目）推上去，要求至少 3 个语义完整的 commit（初始/功能/修复各一），并写好 .gitignore 排除无关文件。
4. 练习 diff 双视角：先改两个文件，add 其中一个——分别执行 `git diff` 与 `git diff --staged`，解释两个输出各对应「三个区」的哪条边界。
5. 思考题：为什么说「暂存区让 commit 语义完整」？举一个只有工作区没有暂存区时做不到的场景。
