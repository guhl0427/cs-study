---
id: l-py-functions
slug: py-functions
title: 函数深入：参数、作用域与复用
difficulty: 2
estMinutes: 75
tags: [Python, 入门, 函数]
summary: 参数全家桶、LEGB 作用域、可变默认值大坑、拆函数的判断标准——把成绩统计器重构成函数版，体会可测试性。
updated: 2026-11-22
resources:
  - id: r-py-func-doc
    title: Python 官方教程 · 函数定义
    url: https://docs.python.org/zh-cn/3/tutorial/controlflow.html#defining-functions
    type: doc
    difficulty: 2
    note: 官方对默认值参数、关键字参数、*args/**kwargs 的精确说明。
  - id: r-py-repl
    title: Python Tutor 在线可视化执行
    url: https://pythontutor.com/
    type: tool
    difficulty: 1
    note: 有「函数调用帧」视图，能看见每次调用开辟的独立局部变量空间。
---

> 一句话定义：函数是**装进盒子里的命名逻辑**——输入走参数、输出走 return，用它换来的复用、可测试和好命名，是从「能跑」到「工程」的第一步。

## 概念讲解

### 为什么要有函数：三个不能拒绝的理由

没有函数的脚本像**流水账日记**：从上写到下，逻辑重复就复制粘贴。函数带来的三个收益，每一个都直击痛点：

- **复用**：一段逻辑写一次、到处调用。判定等级写了 `grade(score)`，主程序、统计、报表三处都能用；需求改了只改一处，复制粘贴版要改三处、漏一处就是 bug。
- **测试**：函数可以单独调用验证。`grade(80)` 应该返回什么，直接一测便知；三百行的脚本想验证中间一步，只能跑完整流程。
- **命名**：`passed_rate(scores)` 这个名字本身就是文档。半年后回看 `sum(1 for ... if s >= 60) / len(s) * 100` 要重新想十秒，看到函数名一秒懂。

一个心智模型：调用函数就像**叫外卖**——参数是订单（你要什么），return 是交付（拿回的东西），函数体是后厨（你怎么不用管）。`print(x)` 只是后厨「在窗口喊了一声」，不等于「交付」，这个区别是新手第一大混淆，第 2 个坑专讲。

### 参数全家桶：位置、关键字、默认值

Python 的参数形态一个比一个灵活，按顺序掌握：

```python
def order(name, size="中杯", sugar="正常"):   # size/sugar 带默认值
    return f"{name} {size} {sugar}"

order("珍珠奶茶")                    # 位置参数：按顺序填
order("奶茶", "大杯")                # 位置参数覆盖默认值
order("奶茶", sugar="半糖")          # 关键字参数：指名道姓，跳过中间参数
order(size="大杯", name="奶茶")      # 关键字参数还能调换顺序
```

**规则**：位置参数必须在关键字参数之前；定义时带默认值的参数必须排在无默认值的后面（`def f(size="中杯", name)` 是语法错误）。调用时「前面按位置、后面指名道姓」是常见的混搭。

### 可变默认值：一个大坑详解

默认值参数有个反直觉行为，是 Python 面试和实际 bug 的双料常客：

```python
def add_item(item, basket=[]):      # 危险！
    basket.append(item)
    return basket

print(add_item("苹果"))   # ['苹果']
print(add_item("香蕉"))   # ['苹果', '香蕉']  ← 上一单的苹果还在！
```

原因：**默认值在函数定义时只创建一次**，之后所有调用共享同一个列表——`basket=[]` 不是「每次调用造个新篮子」，而是「造一次篮子永久用」。想象外卖店只有一个共享餐篮，所有订单往里堆。正确写法用 `None` 当哨兵，每次调用现造容器：

```python
def add_item(item, basket=None):
    if basket is None:
        basket = []          # 每次调用都拿到全新的列表
    basket.append(item)
    return basket
```

记住规则：**默认值只用不可变的东西**（数字、字符串、None），永远不写 `=[]` 或 `={}`。

### *args 与 **kwargs：不定数量的参数

有时连调用者要传几个参数都不确定——比如「统计任意多个数字的最大差值」：

```python
def spread(*args, **kwargs):
    print(args, kwargs)    # args 是 tuple，kwargs 是 dict

spread(1, 2, 3, name="py")  # (1, 2, 3) {'name': 'py'}
```

`*args` 把多余的位置参数收成一个 **tuple**，`**kwargs` 把多余的关键字参数收成一个 **dict**，名字可以换（`*values` 也行），星号才是语义。入门阶段写 `print` 式的「来多少收多少」函数、或者「转发参数给另一个函数」（`def wrapper(*args, **kwargs): return real(*args, **kwargs)`）时会用到，认得出即可。

### 返回值细节：return 与 None

三个关键事实：**其一**，`return` 立刻结束函数，其后代码不执行，所以它可以兼任「提前出口」——参数非法时直接返回，主逻辑不用层层缩进。**其二**，没写 return（或光写 `return` 不带值）的函数返回 `None`——`x = print("hi")` 之后 x 就是 None，因为 print 只负责显示不负责交付。**其三**，`return a, b` 一次返回多个值（打包成 tuple，接收方 `a, b = f()` 解包），不需要包装成 dict 或列表。

### 作用域与 LEGB：变量从哪里找

函数体里的变量和外界的隔离规则，叫**作用域**。Python 按固定顺序找变量名，四个层级首字母拼成 **LEGB**：

| 层级 | 全称 | 是什么 | 示例 |
| ---- | ---- | ---- | ---- |
| L | Local | 函数内部 | 函数里赋值的变量 |
| E | Enclosing | 外层函数（嵌套时） | 上一课没讲，遇到闭包再学 |
| G | Global | 模块全局 | 顶层赋值的变量 |
| B | Built-in | 内置 | `print`、`len`、`sum` |

查找从 L 一路向外，找到即停。推论一：函数内部赋值的变量是**局部的**，外面看不见；推论二：函数**读**外面的全局变量合法，但**写**不行——`count = count + 1` 在函数里会被当成「局部变量还没赋值就用」，报 `UnboundLocalError`。非要改全局得声明 `global count`，但这属于「自首式写法」：全局状态被多个函数悄悄修改，是 bug 的温床。工程纪律：**能用参数传进去、用 return 传出来的，绝不用 global**。数据进出全走参数和返回值的函数，行为完全可预测，这就是「纯函数」的雏形。

### 文档字符串与类型注解：给函数贴说明书

```python
def average(scores: list[int]) -> float:
    """返回平均分；空列表返回 0.0"""
    if not scores:
        return 0.0
    return sum(scores) / len(scores)
```

两件装备：**文档字符串**（docstring）紧跟 def 的下一行，三引号包住，一句话说清「做什么、返回什么」——`help(average)` 会显示它，编辑器悬停也显示它。**类型注解**写在参数和箭头之后（`x: int`、`-> str`），Python 运行时并不强制检查（传错类型不报错），但它是给人看和给工具看的：编辑器据此自动补全和提前报警，IDE 里按住 Ctrl 点函数名能直接跳到定义。写不写不影响运行，写了受益的首先是三个月后的你自己。

### 拆函数的判断标准：一个函数一件事

「该不该拆出一个函数」的实操标准：**函数名能用「一件事 + 一次」描述清楚**。三个明确的拆分信号——代码里出现 **"and"**（判定并打印 = 两件事，拆）；**同一段逻辑出现第二次**（复制粘贴就是拆分警报）；**一段代码前要写注释解释它在干嘛**（注释名就是函数名）。经验值：一个函数超过 30~40 行就该警惕；缩进超过三层（循环套判断套循环）通常是该拆的形状。拆完的主函数应该像目录——一眼看清整个程序分几步，每步一个函数名。

## 代码示例

主线任务：**把上一课的「成绩统计器」重构成函数版**。旧版是一个从头跑到尾的脚本，功能全对但逻辑搅在一锅；现在按「一个函数一件事」拆成三个函数 + 一个主函数，并体会拆完之后「可测试性」带来的质变。跟着做约 20 分钟。

### 第 0 步：直面旧版的问题

旧版（语法课第 4 步）的全部逻辑挤在顶层：判定、统计、输出混排。三个具体痛点：想复用判定逻辑到别的程序，只能整段复制；想验证「及格率算得对不对」，必须跑完整程序；报表格式想调整，得在数据处理的代码堆里翻出打印语句。诊断结论：**判定、统计、输出是三件事，拆三个函数**。

### 第 1 步：拆出 judge——判定一件事

```python
def judge(score: int) -> str:
    """百分制 → 等级：>=90 A，>=80 B，>=60 C，否则 F"""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 60:
        return "C"
    return "F"

assert judge(92) == "A"
assert judge(80) == "B"
assert judge(59) == "F"
print("judge 三组边界全部通过")
```

运行结果：

```text
judge 三组边界全部通过
```

质变在这里：验证不再需要跑完整程序——**四行 assert 就是这个函数的「测试」**，且以后每次改完都能秒级回归。注意最后一个分支省略 else 直接 `return "F"`：前面三个 if 已经拦住了所有更高档位，走到这里只剩一种可能。

### 第 2 步：拆出 statistics——统计一件事

```python
def statistics(students: list) -> dict:
    """传入 (姓名, 分数) 列表，返回统计 dict"""
    scores = [s for _, s in students]
    return {
        "avg": sum(scores) / len(scores),
        "max": max(scores),
        "min": min(scores),
        "rate": sum(1 for _, s in students if s >= 60) / len(students) * 100,
    }

result = statistics([("小明", 92), ("小红", 75), ("小刚", 58)])
assert result["max"] == 92 and result["min"] == 58
print(result)
```

运行结果：

```text
{'avg': 75.0, 'max': 92, 'min': 58, 'rate': 66.66666666666667}
```

函数返回一个 dict，键就是统计项名——调用者不用记顺序，`result["rate"]` 直取所需。**多值返回的两个方案**：`return avg, max`（tuple，接收方解包）适合两三个值；返回 dict 适合四五个起、调用者按名取用的场景，本例选后者。

### 第 3 步：拆出 render——输出一件事

```python
def render(students: list, result: dict) -> str:
    """把明细与统计拼成报表文本"""
    lines = ["=== 成绩统计报表 ==="]
    for name, score in students:
        lines.append(f"{name}: {score} 分 → {judge(score)}")
    lines.append("-" * 24)
    lines.append(f"平均分: {result['avg']:.1f}  最高分: {result['max']}")
    lines.append(f"及格率: {result['rate']:.0f}%")
    return "\n".join(lines)
```

关键设计：render **return 报表字符串而不是 print**——打印是调用方（main）的事。这带来两个收益：报表可以先拿到手里做断言（`assert "及格率" in report`），也可以转存文件或发网络，函数不被「打印」这个动作绑死。**「处理数据的函数返回数据，只有最外层才碰 print」**是贯穿本课程的结构纪律。

### 第 4 步：main 组装 + 完整程序

```python
def judge(score: int) -> str:
    """百分制 → 等级"""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 60:
        return "C"
    return "F"

def statistics(students: list) -> dict:
    """(姓名, 分数) 列表 → 统计 dict"""
    scores = [s for _, s in students]
    return {
        "avg": sum(scores) / len(scores),
        "max": max(scores),
        "rate": sum(1 for _, s in students if s >= 60) / len(students) * 100,
    }

def render(students: list, result: dict) -> str:
    """明细 + 统计 → 报表字符串"""
    lines = ["=== 成绩统计报表 ==="]
    for name, score in students:
        lines.append(f"{name}: {score} 分 → {judge(score)}")
    lines.append("-" * 24)
    lines.append(f"平均分: {result['avg']:.1f}  最高分: {result['max']}")
    lines.append(f"及格率: {result['rate']:.0f}%")
    return "\n".join(lines)

def main():
    students = [("小明", 92), ("小红", 75), ("小刚", 58), ("小丽", 80)]
    result = statistics(students)
    print(render(students, result))

main()
```

运行结果：

```text
=== 成绩统计报表 ===
小明: 92 分 → A
小红: 75 分 → C
小刚: 58 分 → F
小丽: 80 分 → B
------------------------
平均分: 76.2  最高分: 92
及格率: 75%
```

看 main 函数的四行：**读数据 → 算统计 → 渲染报表 → 打印**，每行一个函数名，整个程序的结构自解释——这就是拆函数后的样子。数据流向 `students → statistics() → result → render() → report → print` 单向流动，没有任何全局变量，任何一个函数都能拎出来单独测试：把 `judge` 复制进任何程序都能直接用，这就是「复用」落地。

## 常见坑

1. **坑 1：可变默认值共享状态**。现象：`def f(x, acc=[])` 连续调用，acc 里的旧数据阴魂不散。原因：默认值在 def 时创建一次、所有调用共享，不是每次调用新建。对策：默认值写 `None`，函数体里 `if x is None: x = []` 现场创建；默认值永远只用不可变类型。
2. **坑 2：print 当 return 用**。现象：函数里只 `print(result)` 不写 return，调用方 `x = f()` 拿到 None，后续运算报 `TypeError: unsupported operand type(s) for +: 'int' and 'NoneType'`。原因：print 只在屏幕显示，不向调用者交付数据。对策：函数一律 return，print 留给最外层；见 NoneType 报错先怀疑「忘了 return」。
3. **坑 3：函数内给全局变量赋值报 UnboundLocalError**。现象：函数里 `count = count + 1` 报 `UnboundLocalError: local variable 'count' referenced before assignment`。原因：函数内一旦出现赋值，这个名字就被判为局部变量，右边先读到它就撞上「未赋值」。对策：首选把 count 当参数传入、结果 return 出来；确要全局改才写 `global count`（克制使用）。
4. **坑 4：自己的名字覆盖内置函数**。现象：`list = [1, 2]` 之后 `list("abc")` 报 `TypeError: 'list' object is not callable`。原因：变量名 `list` 遮住了内置类，LEGB 里 G 层盖住了 B 层。对策：不用 `list/str/max/min/sum/print/type` 等做变量名；不慎覆盖后 `del list` 可恢复。
5. **坑 5：部分分支忘写 return**。现象：`if ...: return "A"` 分支漏了 else，不满足条件时函数走到底返回 None，调用方拿到 None 才发现。原因：把 return 当「成功时的出口」而忘了「所有路径都要有出口」。对策：函数写完自查「每条执行路径是否都有 return」；先在开头处理非法输入提前 return，主路径保证收尾 return。
6. **坑 6：默认参数排在位置参数前面**。现象：`def f(size="中杯", name):` 直接 `SyntaxError`。原因：Python 要求无默认值的参数在前，否则调用 `f("奶茶")` 时无法判断填给谁。对策：定义按「必填在前、有默认值在后」排列；调用时 `f("奶茶", sugar="半糖")` 用关键字参数跳位。

## 小练习

1. 写函数 `clamp(value, low, high)`：把 value 限制在区间内（超出返回边界值），用 `clamp(15, 0, 10) == 10` 等四组 assert 验证，体会「提前返回」。
2. 写函数 `min_max_avg(nums)` 用一次 return 同时返回最小、最大、平均值三个值，调用方解包接收；再改成返回 dict 版，对比两种多值返回的使用手感。
3. 找出下面代码的两个函数级问题并修复：`def add_tag(tag, tags=["无"]): tags.append(tag); return tags`——连续调用两次，观察第二次的返回值为什么不对，再用 None 哨兵修复。
4. **综合小项目**：把 BMI 计算器（语法课练习）重构成函数版——`bmi(h, w)` 算指数、`classify(v)` 判体型、`render(records)` 出报表、`main()` 组装；给前两个函数各写 3 条 assert 测试。全部通过后保存为 `bmi_func.py` 运行验证。
