---
id: l-cli-shell
slug: cli-shell
title: Shell 常用命令：文件、权限与管道
difficulty: 1
estMinutes: 35
tags: [Shell, 工具]
summary: 命令行不是复古装饰——服务器、CI、容器里只有它；掌握十几条命令和管道思想，效率翻倍。
updated: 2026-11-22
resources:
  - id: r-shell-tlcl
    title: 《The Linux Command Line》中文版
    url: https://linux.linuxidc.com/Linux/2013-01/77684.htm
    type: book
    difficulty: 2
    note: 免费全书，前三章即覆盖入门所需。
  - id: r-shell-tutorial
    title: Linux 命令大全
    url: https://www.linuxcool.com/
    type: doc
    difficulty: 1
    note: 命令字典，忘了来查。
---

> 一句话定义：Shell 是和操作系统对话的文本界面——每条命令做一件小事，用管道把小事串成大事。

## 概念讲解

为什么必须会命令行？因为你部署代码的地方（服务器、CI 流水线、容器）**没有图形界面**。好消息是日常高频命令只有十几条：

| 命令 | 干什么 | 常用示例 |
| ---- | ---- | ---- |
| `ls` | 列目录 | `ls -lah`（含隐藏文件、人类可读大小） |
| `cd` | 切目录 | `cd ../projects` · `cd ~` |
| `pwd` | 我在哪 | — |
| `cat / less` | 看文件 | `less +F app.log`（滚动看日志） |
| `grep` | 按内容搜 | `grep -rn "TODO" src/` |
| `mkdir / rm / cp / mv` | 文件操作 | `rm -rf 目录`（**三思**） |
| `chmod` | 权限 | `chmod +x deploy.sh` |
| `ssh` | 远程登录 | `ssh user@server` |

两个思想比命令本身更重要。其一：**一切皆文本**——命令的输出可以继续作为下一条命令的输入：

```bash
grep -rn "ERROR" app.log | wc -l          # 数一数日志里有几条错误
cat access.log | grep "404" | sort | uniq -c | sort -rn | head -3
# = 谁访问的路径 404 最多（统计 → 去重计数 → 倒序 → 取前 3）
```

其二：**权限三件套** = 属主/属组/其他人 × 读/写/执行。`ls -l` 输出的 `rwxr-xr--` 就是在读这三组开关。

## 代码示例

一个真实场景：在项目里统计每种文件类型占了多少行代码：

```bash
find src -name "*.vue" | wc -l              # 多少个 .vue 文件
find src -name "*.ts" -exec wc -l {} +      # 所有 .ts 的总行数
# 找出最大的 5 个文件
du -ah src | sort -rn | head -5
# 危险操作前先「演习」：把 rm 换成 echo 看会删什么
find . -name "*.tmp" -exec echo rm {} \;
```

Windows 用户在 Git Bash（本仓库开发环境自带）里即可练习以上全部命令。

## 常见坑

1. **坑 1：`rm -rf` 作用于变量为空的路径**。`rm -rf "$DIR/"` 在 DIR 为空时等于删根。对策：变量判空 + 先 `echo` 演习 + 不确定的命令先 `man` 一下。
2. **坑 2：只在图形界面里学**。Shell 的肌肉记忆只能靠敲——开个终端按本节练习连敲二十遍。
3. **坑 3：忽视退出码**。命令成功返回 0、失败非 0，CI 脚本全靠它判断——写脚本时养成 `set -e`（出错即停）的习惯。

## 小练习

1. 在本仓库目录统计 `content/` 下有多少个 `.md` 文件、合计多少行。
2. 用管道一行找出 design 目录里含「蓝图」的文件名。
3. 思考题：`grep ERROR app.log | wc -l` 和先 `wc -l` 再 `grep` 哪种更省内存？为什么？
