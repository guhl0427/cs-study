---
id: l-py-errors
slug: py-errors
title: 异常与调试：让程序体面地失败
difficulty: 2
estMinutes: 25
tags: [Python, 调试]
summary: 报错信息是线索不是羞辱——读懂 Traceback 的最后一行，用 try/except 处理「预期内的失败」。
updated: 2026-11-22
resources:
  - id: r-py-errors
    title: Python 官方教程 · 错误和异常
    url: https://docs.python.org/zh-cn/3/tutorial/errors.html
    type: doc
    difficulty: 2
    note: 本节的权威展开版。
---

> 一句话定义：异常是程序在说「这里出事了」——捕获它、处理它，或者带着上下文让它继续往上说。

## 概念讲解

程序出错时的红色文字叫 **Traceback**（调用栈回溯）。读法从**最后一行往上**：

```text
Traceback (most recent call last):
  File "grade.py", line 12, in <module>
    print(scores["小丽"])
KeyError: '小丽'
```

- 最后一行 = 异常类型 + 说明：`KeyError: '小丽'` —— 字典里没有这个键；
- 中间 = 出错的调用链：第 12 行，哪条语句。

处理「预期内会失败」的操作（读文件、查字典、访问网络）用 try/except：

```python
try:
    score = scores["小丽"]
except KeyError:
    score = 0            # 出错时的兜底
finally:
    print("无论如何都执行")   # 收尾：关文件、释放资源
```

主动抛异常用 `raise`——**函数检测到非法输入就该喊出来**，而不是悄悄返回错误值让 bug 藏得更深：

```python
def set_score(name, score):
    if not 0 <= score <= 100:
        raise ValueError(f"分数必须在 0–100 之间，收到 {score}")
```

调试三板斧：`print()` 打印中间值 → `breakpoint()` 原地进入交互式调试器（pdb）→ 复现最小用例。新手最容易忽略的是**读报错**：九成的问题，Traceback 最后一行已经写明答案。

## 代码示例

一个「读文件并统计行数」的程序，示范完整的异常处理层次：

```python
def count_lines(path):
    try:
        with open(path, encoding="utf-8") as f:
            return sum(1 for _ in f)
    except FileNotFoundError:
        print(f"文件不存在：{path}")
        return 0
    except UnicodeDecodeError:
        print(f"文件不是 UTF-8 编码：{path}")
        return -1

print(count_lines("存在的文件.txt"))   # 行数
print(count_lines("不存在.txt"))       # 文件不存在：不存在.txt → 0
```

`with open(...)` 是文件操作的标准写法——**上下文管理器**保证文件用完自动关闭（即使中途抛异常），不要手写 close。

## 常见坑

1. **坑 1：裸 `except:` 吞掉一切**。`except:` 连拼写错误、Ctrl+C 都会吞掉，bug 从此隐身。必须写具体类型：`except (KeyError, ValueError):`，兜底再用 `except Exception as e:` 并把 e 打出来。
2. **坑 2：异常当流程控制滥用**。能用 `if key in d:` 判断的事，不要靠 `try/except KeyError` 包住每一行——异常是给「意外」的，不是给「正常分支」的。
3. **坑 3：except 里什么都不做**。`except: pass` 让失败静默消失，程序带着错误状态继续跑。至少要 `print` 或记录日志。

## 小练习

1. 给上一节的 word count 加异常处理：输入为空串时返回空 dict 并打印提示。
2. 故意触发一个 ZeroDivisionError，练习完整读懂 Traceback（文件/行号/类型）。
3. 用 `breakpoint()` 调试一个循环，在交互器里打印两轮变量值后退出。
