---
id: l-py-errors
slug: py-errors
title: 异常与调试：程序出错时的正确姿势
difficulty: 2
estMinutes: 80
tags: [Python, 入门, 异常, 调试]
summary: Traceback 读法、try/except/else/finally 完整结构、主动 raise、调试三板斧——给记账工具装上三类故障的完整防护。
updated: 2026-11-22
resources:
  - id: r-py-err-doc
    title: Python 官方教程 · 错误和异常
    url: https://docs.python.org/zh-cn/3/tutorial/errors.html
    type: doc
    difficulty: 2
    note: 官方权威讲解，本课讲完可直接通读，内建异常类型清单也在里面。
  - id: r-py-debug-doc
    title: Python 官方文档 · pdb 调试器
    url: https://docs.python.org/zh-cn/3/library/pdb.html
    type: doc
    difficulty: 2
    note: breakpoint() 背后的调试器手册，本课教三板斧中最常用的几条命令。
---

> 一句话定义：异常是程序在**喊「这里出事了」**——读懂它的报告（Traceback）、捕获该处理的（try/except）、不该你处理的大声往上抛（raise），崩溃从灾难变成信息。

## 概念讲解

### 换个心态：崩溃是特性，不是事故

新手看到程序崩溃的第一反应是沮丧；工程师的第一反应是**看报告**。这个心态转变是本课的前提：Python 程序崩溃时会打印详细报告并停下，这不是缺陷而是**fail fast（快速失败）**的设计——错误在发生点立刻暴露，比「带着错误的数据继续跑、二十分钟后在别处爆出谜之结果」好一万倍。真正可怕的不是崩溃，是**静默错误**：程序不响不炸，数据悄悄坏了，等你发现时损失已成。所以本课的目标不是「让程序不报错」，而是「让程序在出错时体面：该崩的崩得明白，该兜的兜得稳当」。

### Traceback 完整读法：从最后一行往上

程序崩溃时打印的红色文字叫 **Traceback**（回溯），固定结构三段：`Traceback (most recent call last):` 起头、中间是**调用链**（从最初调用到出错点的每一帧，标明文件和行号）、最后一行是**异常类型 + 消息**。看一个真实的：

```text
Traceback (most recent call last):
  File "ledger.py", line 18, in <module>
    records = load()
  File "ledger.py", line 10, in load
    return json.loads(text)
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

读法**从最后一行往上**：最后一行 `JSONDecodeError` 直接告诉你异常类型和细节（消息里的 `line 1 column 1` 是 JSON 文本自己的行号）——九成问题答案已写在这一行；往上找**自己写的文件名**（`ledger.py` line 10 的 `json.loads(text)`），那就是出事现场；更上层（line 18 的 `load()` 调用）是调用链上游，帮你还原「怎么走到这一步的」。常见异常类型先认全：`SyntaxError`（语法错，冒号漏了）、`NameError`（名字不存在，拼写错）、`TypeError`（类型不对）、`ValueError`（类型对但值不合法）、`KeyError` / `IndexError`（越界）、`FileNotFoundError`（文件没找到）——见名知义，报错先看类型。

### try/except/else/finally：完整的防护结构

捕获异常用 try，但完整结构有四块，各自分工明确：

| 块 | 职责 | 何时执行 |
| ---- | ---- | ---- |
| `try` | 放「可能出错的代码」 | 总是执行 |
| `except 类型 as e` | 放「出错后的处理」 | 对应异常发生时 |
| `else` | 放「没出错才做的事」 | try 完全成功后（不触发 except） |
| `finally` | 放「无论如何都要做的事」 | **必然执行**，崩溃也要执行 |

```python
try:
    num = int(user_input)      # 可能炸：用户可能输的不是数字
except ValueError as e:
    print(f"输入不合法: {e}")   # 炸了：兜住 ValueError
else:
    print(f"解析成功: {num}")   # 没炸：继续正常流程
finally:
    print("本次处理结束")       # 炸没炸都要执行（收尾日志、清理资源）
```

把「正常流程」放进 else 是关键纪律：try 块越短越好，只包真正可能炸的那一两行——既能精确对准异常类型，又能避免把不相干的错误误捕进来。

### 精确捕获：裸 except 为什么是毒药

`except:` 后面不写类型叫**裸 except**，它捕获**一切异常**——包括 `NameError`（你自己拼错变量名）、`KeyboardInterrupt`（用户按 Ctrl+C 想退出）这类根本不该被吞的东西。后果是灾难性的：你的 bug 被 except 吞掉，程序带着错误状态继续跑，错误从「当场暴露」变成「藏进深处」。纪律按优先级排：**只捕你预期内的具体类型**（`except ValueError`）；多个预期类型写元组（`except (ValueError, KeyError) as e:`）；确实要兜底的分支用 `except Exception as e:` 并**把 e 打印出来**——`Exception` 是几乎所有业务异常的共同祖先，比裸 except 安全得多（不拦 Ctrl+C）。

### 主动 raise：什么时候该抛、消息怎么写

处理异常不只「接」，还可以「抛」。检测到**非法状态**时主动 raise，让错误在最恰当的地方带着完整信息爆发：

```python
def judge(score):
    if not isinstance(score, (int, float)):
        raise TypeError(f"分数必须是数字，收到 {type(score).__name__}: {score!r}")
    if not 0 <= score <= 100:
        raise ValueError(f"分数超出 0-100 范围: {score}")
    ...
```

判断标准：**函数收到自己无法正确处理的输入，就该抛**——静默截断（把 150 分改成 100 继续算）或返回错误值，都会让错误数据流入下游，bug 藏得更深。错误消息三要素：**哪个参数出了什么问题 + 实际收到什么**（上面两条消息都符合）。消息写给「将来排查的你」看：`raise ValueError("出错了")` 等于没说，`raise ValueError(f"金额不是合法数字: {amount!r}")` 一眼定位。还有一招 `raise ... from ...` 用于「处理 A 异常时又出了 B 异常」的场合，能把因果链保留下来，入门阶段见到能认出即可。

### 异常 vs 返回错误码：两条路线的取舍

C 语言风格用**返回错误码**：`if delete_user(-1) == ERROR_NOT_FOUND:`。它的致命弱点是**错误信息容易被忽略**——调用者忘了判断返回值，错误就静默流过；而且正常值和错误码挤在同一个返回通道，`-1` 到底是「失败」还是「倒数第一」全靠猜。异常路线的好处：**不处理就当场崩溃**，错误无法被静默忽略，且「正常逻辑」和「错误处理」物理分离（try 里全是正常逻辑）。Python 社区的共识：**可预期的、需要程序应对的状况用异常**（文件不存在、输入非法）；而「查询不到返回 None」这类**不算错误**的正常分支，用返回值表达（dict.get 就是这么做的）。别把异常当流程控制用——用 try/except 代替 if 判断是本末倒置。

### 调试三板斧：从 print 到 breakpoint

**第一斧：print 中间值**。九成的 bug 靠它解决——怀疑哪一步算错，就在那一步前后打印变量：`print(f"DEBUG records={records}")`。看输出的实际值和脑中预期的差异，往往立刻破案。

**第二斧：breakpoint() 交互调试**。在可疑行前写 `breakpoint()`，程序运行到这里会**暂停**并进入 pdb 调试器，此时所有变量都活着，可用命令现场检查：`p 变量名`（打印值）、`l`（看当前代码）、`n`（下一行）、`c`（继续跑到底）、`q`（退出）。相当于把「脑内想象」变成「现场验尸」，复杂逻辑时比 print 高效得多。

**第三斧：最小复现**。报错读不懂、现场太复杂时，把出问题的代码**抽出来单独跑**——十行复现脚本比三百行完整程序好查得多。复现的过程中常常自己就把 bug 找到了，因为抽离逼你澄清每一步的前提假设。

## 代码示例

主线任务：**给记账工具装上完整的错误防护**。上一课的 40 行工具在三个真实场景下会翻车：数据文件不存在 / 文件内容被改坏 / 用户输入非法金额。现在逐一让它体面应对。跟着做约 25 分钟。

### 第 0 步：先弄坏它——亲手制造三个故障

故障实验是理解异常的捷径。对上一课的 `ledger.py` 依次做三个动作：

```text
实验 1：把 ledger.json 改名删掉 → 启动即 FileNotFoundError？（上一课已兜住）
实验 2：把 ledger.json 内容改成 "这是被弄坏的账本"
实验 3：记账时金额输入 "abc"（不是数字）
```

实验 2 的崩溃现场（读 Traceback 练习）：最后一行 `json.decoder.JSONDecodeError: Expecting value: line 1 column 1`——文件内容根本不是 JSON；往上定位到自己写的 `json.loads(text)`。实验 3 的崩溃现场：最后一行 `ValueError: could not convert string to float: 'abc'`。三个故障、两种性质：实验 1、2 是**环境问题**（外部数据不可信），实验 3 是**输入问题**（用户不可信），防护策略不同。

### 第 1 步：load 的防护——文件不存在与格式损坏

```python
import json
from pathlib import Path

DATA = Path("ledger.json")

def load():
    """读回全部记录；三类意外各自兜底"""
    if not DATA.exists():
        print("[提示] 账本文件不存在，按新账本启动")
        return []
    try:
        text = DATA.read_text(encoding="utf-8")
        return json.loads(text) if text.strip() else []
    except json.JSONDecodeError:
        print("[警告] 账本文件已损坏（不是合法 JSON）")
        backup = DATA.with_suffix(".json.broken")
        DATA.rename(backup)            # 坏文件改名留档，不覆盖，方便事后找回
        print(f"[提示] 原文件已备份为 {backup.name}，按新账本启动")
        return []
```

设计说明：`if not DATA.exists()` 是**正常分支**（新用户没有文件很正常），用 if 不用 try——「文件不存在」不算意外，是首次运行的常态；`JSONDecodeError` 才是**真意外**（文件不该坏），用 try 兜。兜底动作是「留档 + 换新账本」，绝不静默假装没事。这正是异常与返回值取舍的实操示范。

### 第 2 步：add 的防护——非法输入就地重试

```python
def ask_amount():
    """反复询问直到拿到合法金额"""
    while True:
        raw = input("金额: ").strip()
        try:
            value = float(raw)
        except ValueError:
            print(f"『{raw}』不是合法数字，请重输（例：22.5）")
            continue                   # 炸了就再来一轮
        if value < 0:
            print("金额不能为负，请重输")
            continue                   # 值域检查：类型对但值不合法
        return value                   # 合法才交出去
```

模式名叫**校验循环（validate loop）**：try 捕类型错误、if 查值域错误、都不合法就 continue 重问、合法 return。注意错误消息里把用户实际输的 `{raw}` 带上了——用户看到自己输错的内容，比一句干巴巴的「输入不合法」体验好得多。对比反模式：`float(raw)` 炸了之后「静默当 0 元记账」——你本月账本里会多出一笔 0 元 mystery，而源头早被吞掉了。

### 第 3 步：main 的兜底与 finally 的位置

```python
def main():
    records = load()
    print(f"欢迎记账，当前 {len(records)} 笔")
    try:
        run(records)                   # 主体逻辑整体兜底
    except KeyboardInterrupt:
        print("\n检测到 Ctrl+C，账本未保存，下次启动会回到上次保存点")
    except Exception as e:
        print(f"[意外错误] {type(e).__name__}: {e}")
        print("程序已退出，账本保留在最后保存状态")

def run(records):
    while True:
        cmd = input("命令 (a=记账 / r=报表 / q=退出): ").strip().lower()
        if cmd == "q":
            save(records)
            print("已保存，再见")
            break
        elif cmd == "a":
            date = input("日期 (回车=今天): ") or "2026-11-22"
            item = input("项目: ")
            add(records, item, ask_amount(), date)
        elif cmd == "r":
            print(report(records))
        else:
            print("看不懂的命令，请输入 a / r / q")
```

最后一层防线：`except Exception as e` 捕获**没预料到的**意外，打印类型和消息后体面退出——注意它不打印堆栈、只报概要，是给最终用户的「黑盒报告」；你调试时想要完整堆栈，直接去掉这个兜底让程序崩就行。`KeyboardInterrupt` 单独接住，让 Ctrl+C 不算「事故」。`finally` 在本工具里暂时没有用武之地（数据落盘用「退出前 save」的显式策略）——**不要为了用而用**，它的标准岗位是「打开了的资源必须关闭」。

### 第 4 步：完整验收——三连故障测试

防护版组装完毕（load/ask_amount/save/add/report/run/main 七件套，完整约 55 行，结构同上一课 40 行版加防护）。按第 0 步的三个实验回归测试：

```text
实验 1（文件不存在）：
[提示] 账本文件不存在，按新账本启动
欢迎记账，当前 0 笔

实验 2（文件损坏）：
[警告] 账本文件已损坏（不是合法 JSON）
[提示] 原文件已备份为 ledger.json.broken，按新账本启动
欢迎记账，当前 0 笔

实验 3（金额输 abc）：
金额: abc
『abc』不是合法数字，请重输（例：22.5）
金额: 22.5
命令 (a=记账 / r=报表 / q=退出): q
已保存，再见
```

三个故障全部体面落地：不崩溃、不静默、每一步都告诉你发生了什么、数据永远不丢。回看这节课的功夫花在哪：**真正可能炸的地方包 try**（`json.loads`、`float`）、**该抛的地方 raise**（值域非法）、**最外层兜 Exception**、**正常分支走 if**——层次分明，每一层只管自己那类错误。

## 常见坑

1. **坑 1：裸 `except:` 吞掉一切**。现象：程序「没崩溃」但行为诡异、Ctrl+C 都退不出去。原因：裸 except 连 NameError（拼写 bug）和 KeyboardInterrupt 都捕，错误被静默藏起。对策：永远写具体类型；兜底用 `except Exception as e:` 并打印 e；调试期干脆裸奔不兜底，让 bug 当场崩出来。
2. **坑 2：except 里只写 pass**。现象：`except FileNotFoundError: pass` 之后程序继续跑，读回来的空值在千里之外炸出谜之错误。原因：pass 让异常「发生过但假装没发生」，错误被推迟到离源头很远的地方。对策：至少打印日志（`print(f"[警告] ...: {e}")`）或给默认值；确实需要空操作时写注释说明为什么可以安全忽略。
3. **坑 3：try 范围包太大**。现象：整个函数体裹进 try，崩了之后只知「这个函数炸过」，不知道炸在哪行、哪个操作。原因：try 块里的任何异常都会被同一个 except 接走，粒度全失。对策：try 只包真正可能炸的一两行（如 `int(raw)`），正常逻辑挪到 else 或 try 外。
4. **坑 4：把程序 bug 当输入错误处理**。现象：`try: ... except NameError:` 之类代码「修好」了拼写错误不崩。原因：NameError/TypeError 是程序员写错代码，捕获它们等于把 bug 封进地下。对策：except 只写「外部因素」类型（ValueError/FileNotFoundError/JSONDecodeError）；运行期逻辑错误必须修代码，不许捕。
5. **坑 5：finally 里 return 吞异常**。现象：try 里 raise 的异常离奇消失，调用方拿到的是 finally 的返回值。原因：finally 里执行 return 会**覆盖并丢弃**未处理的异常。对策：finally 只放清理代码（关文件、删临时目录），永不写 return/break。
6. **坑 6：报错消息没有上下文**。现象：日志里只有 `ValueError` 三个字或一句「出错了」，排查时无从下手。原因：raise 时没带现场信息。对策：消息写三要素——哪个参数、什么问题、实际收到什么（`f"金额不是合法数字: {raw!r}"`）；`!r` 显示原始形态，空字符串和空白肉眼可辨。

## 小练习

1. 手写复现三种异常并读 Traceback：`int("abc")`（ValueError）、`[1,2][5]`（IndexError）、`{"a":1}["b"]`（KeyError）——每个都先说出「类型、消息、出事行号」再运行对照。
2. 写函数 `safe_int(text, default=0)`：字符串转 int，失败返回 default 而不崩溃——用 try/except 实现，并用 5 组输入（含负数和空串）验证。
3. 给练习 2 加一层：当 text 不是字符串时主动 `raise TypeError`，消息里带上实际类型——体会「接住该接的、抛出该抛的」。
4. **综合小项目**：给记账工具加「启动参数防护」——把 load/ask_amount 的防护代码抄进你的 ledger.py，然后做三个实验回归（删文件/写坏文件/输非法金额）；再给 report 加一条 assert 自检（总额非负），故意制造一次 assert 崩溃并读懂它的 Traceback。保存为 `ledger_safe.py`。
