---
id: l-cli-shell
slug: cli-shell
title: Shell 与命令行：一切皆文本的哲学
difficulty: 1
estMinutes: 80
tags: [Shell, 命令行]
summary: 你部署代码的地方没有图形界面——高频命令、管道组合、权限三件套，跟着把日常操作全部搬进终端，并写出第一个安全的小脚本。
updated: 2026-11-22
resources:
  - id: r-shell-cmd
    title: linux-command（命令大全，中文）
    url: https://wangchujiang.com/linux-command/
    type: doc
    difficulty: 1
    note: 命令字典，忘了来查。
  - id: r-shell-tutorial
    title: Shell 编程入门（阮一峰）
    url: https://www.ruanyifeng.com/blog/2018/09/bash-scripting-intro.html
    type: doc
    difficulty: 2
    note: 脚本编写的简明中文教程。
---

> 一句话定义：Shell 是和操作系统对话的文本界面——每条命令做一件小事，用**管道**把小事串成大事；「一切皆文本」是它的第一哲学。

## 概念讲解

**为什么必须会命令行？** 你部署代码的地方（服务器、CI 流水线、容器）**没有图形界面**；图形界面能做的命令行都能做，反之不然。好消息：日常高频命令只有十几个，一周就能形成肌肉记忆。

**高频命令地图**，按「在哪个目录/看什么/动什么」组织：

| 场景 | 命令 | 常用形式 |
| ---- | ---- | ---- |
| 我在哪 / 这里有什么 | `pwd` / `ls` | `ls -lah`（含隐藏文件、人类可读大小） |
| 去别的目录 | `cd` | `cd ../projects` · `cd ~`（回主目录） |
| 看文件 | `cat` / `less` | `less +F app.log`（滚动盯日志） |
| 按内容搜 | `grep` | `grep -rn "TODO" src/`（递归带行号） |
| 文件操作 | `mkdir` / `cp` / `mv` / `rm` | `rm -rf 目录`（**三思**） |
| 权限 | `chmod` | `chmod +x deploy.sh` |
| 远程 | `ssh` | `ssh user@server` |
| 进程 | `ps` / `kill` | `ps aux \| grep node` |

**一切皆文本**——命令的输出就是文本流，可以接给下一条命令当输入。`|` 管道是 Shell 的灵魂：

```bash
grep -rn "ERROR" app.log | wc -l            # 数一数有几条错误
cat access.log | grep "404" | sort | uniq -c | sort -rn | head -3
# → 谁访问的路径 404 最多：筛出 404 → 排序 → 去重计数 → 按次数倒序 → 取前 3
```

读管道的方法是从左往右念——每一段都是一个「动词短语」，这也是为什么命令行写复杂统计反而比写代码快。

**权限三件套**：`ls -l` 输出的 `-rwxr-xr--` 是三组开关——属主/属组/其他人 × 读/写/执行：

```text
-  rwx   r-x   r--
│  │     │     └ 其他人：只读
│  │     └ 属组：读+执行
│  └ 属主：读+写+执行
└ 文件类型（- 文件 / d 目录）
```

`chmod +x 脚本.sh` 给所有组加执行权——「Permission denied」十有八九就是缺了执行位。

**写第一个脚本**：把重复敲的命令序列固化成文件：

```bash
#!/usr/bin/env bash        # shebang：用 bash 解释执行
set -e                     # 安全带：任何一条失败立即停止

echo "=== 备份 content 目录 ==="
cp -r content "backup-$(date +%Y%m%d)"     # $(命令) 嵌套取结果
grep -rc "## " content/lessons/*.md | wc -l
echo "=== 完成 ==="
```

保存为 `backup.sh`，`chmod +x backup.sh`，以后 `./backup.sh` 一键跑。`set -e` 是脚本安全带——呼应退出码的纪律（成功 0、失败非 0，CI 全靠它判断）。

## 代码示例

主线：在真实项目里用命令行完成三项日常统计（Windows 用户在 Git Bash 里即可练习全部命令）：

```bash
# 任务 1：项目里有多少篇文档、合计多少行
find content/lessons -name "*.md" | wc -l          # 文件数
find content/lessons -name "*.md" -exec wc -l {} + | tail -1   # 总行数

# 任务 2：找出最长的 5 篇文档
wc -l content/lessons/*.md | sort -rn | head -6    # 首行是合计，跳过取 5 行

# 任务 3：危险操作演习——把 rm 换成 echo 先看会删什么
find . -name "*.tmp" -exec echo rm {} \;           # 演习：列出「将要删除」的文件
find . -name "*.tmp" -exec rm {} \;                # 确认无误后再真删
```

**环境变量**：Shell 的「全局配置」——`echo $PATH` 看命令搜索路径（为什么敲 python 能找到程序）；`export MY_VAR=hello` 定义会话变量；脚本里 `$1` `$2` 接收调用参数：

```bash
# greet.sh
echo "你好，$1！今天共处理 $(ls | wc -l) 个文件"
# ./greet.sh 小明 → 你好，小明！今天共处理 3 个文件
```

## 进阶一课：三件高频武器的参数速成

**grep——文本搜索的瑞士军刀**，四个参数覆盖 90% 场景：

```bash
grep -i "error" app.log        # -i 忽略大小写
grep -rn "TODO" src/           # -r 递归目录，-n 带行号
grep -c "ERROR" app.log        # -c 只数行数（等价 grep ... | wc -l）
grep -v "DEBUG" app.log        # -v 反选：排除 DEBUG 行
grep -E "404|500" access.log   # -E 扩展正则：404 或 500
```

**ssh——远程服务器的门**：`ssh user@server` 登录后，你敲的每条命令都在服务器上跑（部署的「那台没有图形界面的机器」）；`scp 文件 user@server:/路径` 则是「远程拷贝」。密码登录之外更常用**密钥登录**：`ssh-keygen` 生成一对钥匙、公钥放到服务器 `~/.ssh/authorized_keys`，以后免密且更安全（呼应安全课的密码存储）。

**man 与 --help——不会就问手册**：`man ls` 看完整手册（q 退出），`ls --help` 看速成版。「这个参数是什么意思」的答案永远在第一现场，别靠猜。

## 进阶二课：find 与通配符——文件大海捞针

**通配符**（shell 展开）处理「当前目录的批量文件」：

```bash
ls *.md              # 所有 .md 文件
cp app*.js backup/   # app 开头的全部 js
mv report-?.csv old/ # ? 匹配单个字符：report-1.csv 适配
```

**find**（自己递归找）处理「目录树深处搜索」，两个高频用法：

```bash
find content -name "*.md"              # 按名字找（含子目录）
find . -name "*.tmp" -size +1M         # 加条件：大于 1MB 的
find src -name "*.ts" -newer main.ts   # 比 main.ts 更新改动的（增量构建的思路）
find . -type d -name node_modules      # -type d 只找目录
```

find 与管道的组合是「项目体检」的标准姿势：`find . -name "*.log" -exec du -h {} + | sort -rh | head -5`——找出最大的 5 个日志文件。**通配符与 find 的分工**：当前目录一层用通配符，跨目录树用 find。

**命令速查卡**（贴在显示器旁边的那种）：

```text
看状态    ls -lah / pwd / du -sh 目录（多大）
看内容    cat / less / head -5 / tail -20 / tail -f app.log（实时追日志）
找文件    find 目录 -name 模式    找文本    grep -rn 关键词 目录
动文件    cp / mv / rm -ri（-i 每次确认）   量大小   wc -l / du -ah
```

## 常见坑

1. **坑 1：`rm -rf` 作用于变量为空的路径**。`rm -rf "$DIR/"` 在 DIR 为空时等于删根——变量判空 + echo 演习 + 不确定的命令先 man 一下，是三条保命习惯。
2. **坑 2：只在图形界面里学**。Shell 的肌肉记忆只能靠敲——开个终端把本课命令连敲二十遍，一周就稳了。
3. **坑 3：忽视退出码**。命令成功返回 0、失败非 0；脚本不加 `set -e` 时，前面失败后面照跑，半途而废的破坏更大。
4. **坑 4：Windows 与 Linux 的行尾差异**。Windows 记事本写的脚本带 CRLF，Linux 上执行报 `\r: command not found`——用 VS Code 把行尾改成 LF（右下角切换）。
5. **坑 5：管道里 sort 的字段问题**。`sort -rn` 按整行数值排，多列场景要 `-k2` 指定列——输出不对先检查排序键。

## 小练习

1. 在本仓库目录完成任务 1-3 的三项统计，把每条命令的输出记下来。
2. 写 `clean.sh`：删除当前目录所有 `.tmp` 文件，要求先演习（echo 版）再真删，且带 `set -e`。
3. 综合任务：用一行管道找出 content/ 下含「蓝图」字样的文件名，再统计出现总次数；把两步写进一个脚本。
4. 思考题：`grep ERROR app.log | wc -l` 和先 `wc -l` 再 `grep` 哪种更省内存？为什么管道让「大数据处理」不需要把文件整个读进内存？
